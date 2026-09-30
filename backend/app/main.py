import asyncio
import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agent.querymind import QueryMindAgent
from app.agent.registry import AgentConnection, registry
from app.database.schema_inspector import get_schema, get_relationships
from app.sql.generator import generate_sql_or_clarification

load_dotenv()


app = FastAPI(
    title="QueryMind API",
    description="Conversational SQL Agent API",
    version="1.0.0",
)

# Comma-separated list, e.g. FRONTEND_ORIGIN=https://askdb.example.com
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- request models ----------------------------------------------------------

class ConnectRequest(BaseModel):
    database_url: str


class ConversationTurn(BaseModel):
    role: str  # "assistant" or "user"
    content: str


class QueryRequest(BaseModel):
    question: str
    database_url: str
    conversation_history: list[ConversationTurn] = []


class ContactRequest(BaseModel):
    name: str
    email: str
    message: str


class LocalConnectRequest(BaseModel):
    # Holds the session token issued at pairing (name kept for frontend
    # compatibility). Database credentials live in the agent, not here.
    pairing_code: str


class LocalQueryRequest(BaseModel):
    pairing_code: str  # session token
    question: str
    conversation_history: list[ConversationTurn] = []
    refresh_schema: bool = False


# --- basic routes ------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "QueryMind API is running"}


# --- cloud database flow -----------------------------------------------------

@app.post("/connect")
def connect(request: ConnectRequest):
    try:
        schema = get_schema(request.database_url)
        relationships = get_relationships(request.database_url)

        return {
            "success": True,
            "tables": list(schema.keys()),
            "table_count": len(schema),
            "relationship_count": sum(
                len(rels) for rels in relationships.values()
            ),
            "schema": schema,
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail={
                "stage": "database",
                "error": "Failed to connect to the database. Check the URL and try again.",
            },
        )


@app.post("/query")
def query(request: QueryRequest):

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if not request.database_url.strip():
        raise HTTPException(status_code=400, detail="database_url cannot be empty")

    agent = QueryMindAgent(database_url=request.database_url)

    try:
        raw_schema = get_schema(request.database_url)
        raw_relationships = get_relationships(request.database_url)

        result = agent.run(
            question=request.question,
            schema=raw_schema,
            relationships=raw_relationships,
            conversation_history=[turn.dict() for turn in request.conversation_history],
        )

        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "stage": result["stage"],
                    "error": result["error"],
                    "sql": result.get("sql"),
                },
            )

        if result["stage"] == "clarification":
            return {
                "success": True,
                "type": "clarification",
                "question": request.question,
                "message": result["message"],
                "options": result["options"],
            }

        return {
            "success": True,
            "type": "result",
            "question": request.question,
            "sql": result["sql"],
            "results": result["results"],
            "row_count": result["row_count"],
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail={"stage": "database", "error": "Failed to connect to or query the database"},
        )


# --- local database flow (via a paired agent) --------------------------------

# Tiny in-memory limiter for the unauthenticated pairing endpoint.
_pair_hits: dict[str, list[float]] = {}


def _rate_limit(request: Request, limit: int = 10, window: int = 60):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = [t for t in _pair_hits.get(ip, []) if now - t < window]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Try again in a minute.")
    hits.append(now)
    _pair_hits[ip] = hits


def _agent_or_400(session: str) -> AgentConnection:
    connection = registry.get(session)
    if connection is None:
        raise HTTPException(
            status_code=400,
            detail={
                "stage": "agent",
                "error": "No agent is connected. Make sure the AskDB Agent is running.",
            },
        )
    return connection


async def _ask_agent(connection: AgentConnection, payload: dict) -> dict:
    try:
        return await connection.send_request(payload)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"stage": "agent", "error": "Agent did not respond in time"},
        )
    except (RuntimeError, WebSocketDisconnect):
        raise HTTPException(
            status_code=400,
            detail={"stage": "agent", "error": "Agent disconnected. Reopen the AskDB Agent."},
        )


@app.post("/agent/pair")
def create_pairing_code(request: Request):
    _rate_limit(request)
    return {"pairing_code": registry.create_pairing_code()}


@app.get("/agent/status/{code}")
def agent_status(code: str):
    # Returns the session token exactly once, after the agent has paired.
    session = registry.claim_session(code)
    return {"connected": session is not None, "session": session}


@app.websocket("/agent/connect")
async def agent_connect(websocket: WebSocket, token: str):
    session = registry.authenticate(token)
    if session is None:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    # Tell the agent its session token so it can reconnect without a new code.
    await websocket.send_json({"type": "paired", "session": session})

    connection = registry.register(session, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            request_id = message.get("request_id")
            if request_id:
                connection.resolve(request_id, message.get("result", {}))
    except WebSocketDisconnect:
        pass
    finally:
        registry.unregister(session, connection)


@app.post("/connect/local")
async def connect_local(request: LocalConnectRequest):
    connection = _agent_or_400(request.pairing_code)

    # No credentials here — the agent already holds them locally.
    result = await _ask_agent(connection, {"type": "get_schema"})

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail={
                "stage": "database",
                "error": result.get("error", "Failed to read the database schema"),
            },
        )

    connection.schema = result["schema"]
    connection.relationships = result["relationships"]

    return {
        "success": True,
        "tables": list(connection.schema.keys()),
        "table_count": len(connection.schema),
        "relationship_count": sum(
            len(rels) for rels in connection.relationships.values()
        ),
        "schema": connection.schema,
    }


@app.post("/query/local")
async def query_local(request: LocalQueryRequest):
    connection = _agent_or_400(request.pairing_code)

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if connection.schema is None or request.refresh_schema:
        schema_result = await _ask_agent(connection, {"type": "get_schema"})
        if not schema_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail={
                    "stage": "database",
                    "error": schema_result.get("error", "Failed to read the database schema"),
                },
            )
        connection.schema = schema_result["schema"]
        connection.relationships = schema_result["relationships"]

    # The LLM call is blocking — keep it off the event loop.
    decision = await asyncio.to_thread(
        generate_sql_or_clarification,
        schema=connection.schema,
        relationships=connection.relationships,
        question=request.question,
        conversation_history=[turn.dict() for turn in request.conversation_history],
    )

    if decision["type"] == "clarification":
        return {
            "success": True,
            "type": "clarification",
            "question": request.question,
            "message": decision["message"],
            "options": decision["options"],
        }

    sql = decision["sql"]

    exec_result = await _ask_agent(connection, {"type": "execute_query", "sql": sql})

    if not exec_result.get("success"):
        raise HTTPException(
            status_code=400,
            detail={
                "stage": "execution",
                "error": exec_result.get("error"),
                "sql": sql,
            },
        )

    return {
        "success": True,
        "type": "result",
        "question": request.question,
        "sql": sql,
        "results": exec_result["results"],
        "row_count": exec_result["row_count"],
    }