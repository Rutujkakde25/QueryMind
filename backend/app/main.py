import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.agent.querymind import QueryMindAgent
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