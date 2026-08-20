from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from connector.connector import get_schema, execute_query

app = FastAPI(
    title="QueryMind Local Connector"
)


class DatabaseRequest(BaseModel):
    database_url: str


class ExecuteRequest(BaseModel):
    database_url: str
    sql: str


@app.get("/")
def root():
    return {
        "message": "QueryMind Local Connector is running"
    }


@app.post("/schema")
def read_schema(request: DatabaseRequest):
    try:
        schema = get_schema(request.database_url)

        return {
            "success": True,
            "schema": schema
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@app.post("/execute")
def run_sql(request: ExecuteRequest):
    try:
        result = execute_query(
            request.database_url,
            request.sql
        )

        return {
            "success": True,
            "result": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )