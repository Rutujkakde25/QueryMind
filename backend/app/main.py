import asyncio
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.agent.querymind import QueryMindAgent
from app.agent.registry import registry
from app.sql.generator import generate_sql_or_clarification
from pydantic import BaseModel
from app.database.schema_inspector import get_schema, get_relationships

load_dotenv()


app = FastAPI(
    title="QueryMind API",
    description="Conversational SQL Agent API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectRequest(BaseModel):
    database_url: str

class ConversationTurn(BaseModel):
    role: str  # "assistant" or "user"
    content: str



@app.get("/")
def root():
    return {"message": "QueryMind API is running"}


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



class QueryRequest(BaseModel):
    question: str
    database_url: str
    conversation_history: list[ConversationTurn] = []


class ContactRequest(BaseModel):
    name: str
    email: str
    message: str


class LocalConnectRequest(BaseModel):
    pairing_code: str
    db_type: str  # "postgresql" | "mysql"
    host: str
    port: str
    username: str
    password: str
    database: str


class LocalQueryRequest(BaseModel):
    pairing_code: str
    question: str
    conversation_history: list[ConversationTurn] = []



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


# --- Local database flow (via a paired agent, no direct DB reachability needed) ---

@app.post("/agent/pair")
def create_pairing_code():
    code = registry.create_pairing_code()
    return {"pairing_code": code}


@app.get("/agent/status/{pairing_code}")
def agent_status(pairing_code: str):
    return {"connected": registry.is_connected(pairing_code)}


@app.websocket("/agent/connect")
async def agent_connect(websocket: WebSocket, token: str):
    if not registry.is_code_valid(token):
        await websocket.close(code=4001)
        return

    await websocket.accept()
    connection = registry.register(token, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            connection.resolve(message["request_id"], message["result"])
    except WebSocketDisconnect:
        registry.unregister(token)


def _db_params_from_request(request: LocalConnectRequest) -> dict:
    return {
        "db_type": request.db_type,
        "host": request.host,
        "port": request.port,
        "username": request.username,
        "password": request.password,
        "database": request.database,
    }


@app.post("/connect/local")
async def connect_local(request: LocalConnectRequest):
    connection = registry.get(request.pairing_code)
    if connection is None:
        raise HTTPException(
            status_code=400,
            detail={
                "stage": "agent",
                "error": "No agent is connected for this pairing code. Make sure the AskDB Agent is running.",
            },
        )

    db_params = _db_params_from_request(request)

    try:
        result = await connection.send_request({"type": "get_schema", "db_params": db_params})
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail={"stage": "agent", "error": "Agent did not respond in time"})

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail={"stage": "database", "error": result.get("error", "Failed to connect to the database")},
        )

    connection.db_params = db_params  # cache so /query/local doesn't need creds resent every turn

    schema = result["schema"]
    relationships = result["relationships"]
    return {
        "success": True,
        "tables": list(schema.keys()),
        "table_count": len(schema),
        "relationship_count": sum(len(rels) for rels in relationships.values()),
        "schema": schema,
    }


@app.post("/query/local")
async def query_local(request: LocalQueryRequest):
    connection = registry.get(request.pairing_code)
    if connection is None:
        raise HTTPException(status_code=400, detail={"stage": "agent", "error": "No agent connected for this pairing code"})
    if connection.db_params is None:
        raise HTTPException(status_code=400, detail={"stage": "agent", "error": "Call /connect/local first"})

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        schema_result = await connection.send_request({"type": "get_schema", "db_params": connection.db_params})
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail={"stage": "agent", "error": "Agent did not respond in time"})

    schema = schema_result["schema"]
    relationships = schema_result["relationships"]

    decision = generate_sql_or_clarification(
        schema=schema,
        relationships=relationships,
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

    try:
        exec_result = await connection.send_request(
            {"type": "execute_query", "sql": sql, "db_params": connection.db_params}
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail={"stage": "agent", "error": "Agent did not respond in time"})

    if not exec_result.get("success"):
        raise HTTPException(
            status_code=400,
            detail={"stage": "execution", "error": exec_result.get("error"), "sql": sql},
        )

    return {
        "success": True,
        "type": "result",
        "question": request.question,
        "sql": sql,
        "results": exec_result["results"],
        "row_count": exec_result["row_count"],
    }