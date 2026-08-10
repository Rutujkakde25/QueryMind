import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.agent.querymind import QueryMindAgent
from app.database.schema_inspector import get_schema, get_relationships

load_dotenv()



app = FastAPI(
    title="QueryMind API",
    description="Conversational SQL Agent API",
    version="1.0.0",
)


class QueryRequest(BaseModel):
    question: str
    database_url: str



@app.get("/")
def root():
    return {"message": "QueryMind API is running"}


@app.post("/query")
def query(request: QueryRequest):

    agent = QueryMindAgent(database_url=request.database_url)

    try:
        raw_schema = get_schema(request.database_url)
        raw_relationships = get_relationships(request.database_url)

        result = agent.run(
            question=request.question,
            schema=raw_schema,
            relationships=raw_relationships,
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

        return {
            "success": True,
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