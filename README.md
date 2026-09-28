# QueryMind
"Talk to your database"

## for Testing 
database_url = postgresql://neondb_owner:npg_3u2jcpDVzvxa@ep-solitary-dawn-axsut39w-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
# 🧠 QueryMind — Talk to Your Database

Ask questions about your data in plain English and get answers back as a table. QueryMind reads your database schema, uses an LLM to write a safe, read-only SQL query, checks it against your real tables and columns, runs it, and shows you the SQL and the results. If your question is ambiguous, it **asks you a clarifying question** instead of guessing.

It works with **cloud databases** (paste a connection URL) and with **local or private databases** that are not reachable from the internet, using a small desktop agent that needs no open inbound ports.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB)
![FastAPI](https://img.shields.io/badge/FastAPI-009688)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-supported-336791)
![MySQL](https://img.shields.io/badge/MySQL-local_agent-4479A1)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

---

## ✨ Features

- **Natural language → SQL**: ask a question, and Llama 3.1 8B Instruct (via Hugging Face) writes a single `SELECT` query using your actual schema and foreign-key relationships.
- **Smart clarification**: for vague questions (a missing date range, or a column that could mean two things), the assistant asks a short question with 2–4 clickable options, then continues with your answer.
- **Self-correcting queries**: if the generated SQL fails validation, the model gets one retry with the exact error. If it still fails, the user is asked to clarify rather than shown a raw error.
- **Read-only by design**: only `SELECT` statements are allowed, and dangerous keywords are blocked (see [Safety](#-safety--validation)).
- **Schema validation**: every table and column in the generated SQL is checked against your database before it runs.
- **Two connection modes**
  - **Cloud**: paste a Postgres connection URL.
  - **Local**: connect a database on your own machine or private network through the **AskDB Agent** desktop app, using a one-time pairing code.
- **Transparent results**: see the generated SQL, the row count, and a paginated results table.
- **Workbench UI**: collapsible schema sidebar, table access picker, dark/light theme, and an animated landing page.

---

## 🏗️ Architecture

### Cloud mode
```mermaid
flowchart LR
    U[React UI] -->|question + database URL| API[FastAPI backend]
    API -->|inspect schema + FKs| DB[(Your cloud database)]
    API -->|schema + question| LLM[Llama 3.1 8B<br/>Hugging Face]
    LLM -->|SQL or clarification| API
    API -->|validate: SELECT-only, schema check| API
    API -->|execute SQL| DB
    API -->|SQL + rows / clarification| U
```

### Local mode (no inbound ports needed)
```mermaid
sequenceDiagram
    participant W as Web App
    participant B as FastAPI Backend
    participant A as AskDB Agent (your machine)
    participant DB as Local Database

    W->>B: POST /agent/pair
    B-->>W: pairing code (valid 10 min)
    Note over A: User enters DB details + pairing code
    A->>B: Outbound WebSocket /agent/connect?token=code
    W->>B: POST /connect/local (db params)
    B->>A: inspect schema (via WebSocket)
    A->>DB: read schema
    A-->>B: schema
    W->>B: POST /query/local (question)
    B->>B: LLM generates + validates SQL
    B->>A: run this SQL (via WebSocket)
    A->>A: re-validate SELECT-only
    A->>DB: execute
    A-->>B: rows
    B-->>W: SQL + results
```

The backend bridges the synchronous HTTP request and the asynchronous WebSocket reply with a request registry that uses `asyncio` futures (30 s timeout per request). Your **database password stays on your machine**. Only the generated SQL and the query results travel through the tunnel.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Uvicorn, SQLAlchemy, Pydantic |
| LLM | `meta-llama/Llama-3.1-8B-Instruct` via LangChain + Hugging Face Inference |
| Databases | PostgreSQL (`psycopg2`), plus MySQL through the local agent (`pymysql`) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| Local agent | Python, Tkinter GUI, `websockets`, packaged with PyInstaller |
| DevOps | Docker, Docker Compose |

---

## 🗂️ Project Structure

```
QueryMind/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                  # API routes + WebSocket endpoint
│       ├── agent/
│       │   ├── querymind.py         # Orchestrates: generate → execute
│       │   └── registry.py          # Pairing codes + async request/response bridge
│       ├── llm/provider.py          # Hugging Face / Llama client
│       ├── sql/
│       │   ├── generator.py         # Prompting, retry, clarification logic
│       │   ├── validator.py         # SELECT-only + forbidden keyword check
│       │   ├── schema_validator.py  # Tables/columns must exist
│       │   └── executor.py          # Runs the query
│       └── database/
│           ├── connection.py
│           └── schema_inspector.py  # Tables, columns, foreign keys
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── pages/                   # Landing, About, Contact, CloudConnect, LocalConnect, App
│       ├── components/workbench/    # ChatInput, SchemaRail, TablePicker, DataTable,
│       │                            # ClarificationCard
│       └── lib/                     # API client, session, theme
└── askdb_agent/                     # Desktop connector for local databases
    ├── main.py                      # Tkinter GUI
    ├── tunnel.py                    # WebSocket client with auto-reconnect
    ├── db.py                        # Schema inspection, validation, execution
    └── build.sh                     # PyInstaller build
```

---

## 🚀 Getting Started

### Prerequisites
- A **[Hugging Face access token](https://huggingface.co/settings/tokens)**. Open the [Llama 3.1 8B Instruct](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct) page and accept its license first, because the model is gated.
- A PostgreSQL database (cloud, or local through the agent).
- Docker **or** Python 3.11+ and Node.js 22+.

### Option A — Docker (recommended)
```bash
git clone https://github.com/Rutujkakde25/QueryMind.git
cd QueryMind

echo "HF_TOKEN=hf_your_token_here" > backend/.env

docker compose up --build
```
- Web app: http://localhost:5173
- API: http://localhost:8000 (interactive docs at `/docs`)

### Option B — Run manually

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
echo "HF_TOKEN=hf_your_token_here" > .env
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

### Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `HF_TOKEN` | `backend/.env` | Hugging Face token used for LLM calls |

---

## 🔌 Connecting a Database

### Cloud database
Open **Connect → Cloud** and paste a connection URL:
```
postgresql://user:password@host:5432/dbname?sslmode=require
```

### Local / private database
1. Open **Connect → Local** and generate a **pairing code**.
2. Start the agent:
   ```bash
   cd askdb_agent
   pip install -r requirements.txt
   python main.py
   ```
3. In the agent window, enter host, port, username, password, database, and paste the pairing code.
4. Once the agent shows **Connected**, continue in the web app and start asking questions.

By default the agent connects to `ws://localhost:8000/agent/connect`. For a deployed backend, set `BACKEND_WS_URL` in `askdb_agent/tunnel.py` to your `wss://` endpoint.

**Building the agent as a standalone app** (run on each target OS, since PyInstaller does not cross-compile):
```bash
cd askdb_agent
chmod +x build.sh && ./build.sh      # output in dist/AskDB-Agent
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/connect` | Test a cloud database URL and return tables, columns and relationships |
| POST | `/query` | Ask a question on a cloud database → SQL results or a clarification |
| POST | `/agent/pair` | Generate a pairing code for a local agent |
| GET | `/agent/status/{pairing_code}` | Is the agent for this code connected? |
| WS | `/agent/connect?token=<code>` | Outbound WebSocket used by the desktop agent |
| POST | `/connect/local` | Inspect a local database through the agent |
| POST | `/query/local` | Ask a question on a local database through the agent |

**Query response types**
```jsonc
// Answer
{ "success": true, "type": "result", "question": "...", "sql": "SELECT ...", "results": [ ... ], "row_count": 12 }

// The assistant needs more detail
{ "success": true, "type": "clarification", "question": "...", "message": "Which date range?", "options": ["Last 7 days", "Last 30 days", "This year"] }
```

---

## 🛡️ Safety & Validation

Every generated query passes through layers before it touches your data:

1. **Prompt rules**: the model must return a single `SELECT` using only tables and columns from your schema.
2. **SQL safety check**: the statement must start with `SELECT`, and `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT` and `REVOKE` are rejected.
3. **Schema check**: every table, alias and `table.column` reference must exist in the inspected schema.
4. **Retry, then clarify**: one automatic retry with the failure reason, then a question to the user.
5. **Agent re-validation** (local mode): the desktop agent checks the SQL again before executing it.

Pairing codes are random 8-character tokens that expire after 10 minutes if unused.

> **Recommended:** connect with a **read-only database user**. Validation reduces risk, but a read-only role is the strongest guarantee that QueryMind can never change your data.

---

## 🗺️ Roadmap

- [ ] Enforce the table access selection on the server (currently chosen in the UI)
- [ ] Row limits and query timeouts on every query
- [ ] Authentication and rate limiting; restrict CORS to the deployed frontend
- [ ] Configurable API URL through a Vite environment variable
- [ ] Parser-based SQL validation (e.g. `sqlglot`) in place of regex checks
- [ ] MySQL support in cloud mode (already supported through the local agent)
- [ ] Prebuilt agent binaries for Windows, macOS and Linux via GitHub Actions releases
- [ ] Charts and query history

---

## 👥 Contributors

Built by students of Walchand College of Engineering, Sangli.

- [@Rutujkakde25](https://github.com/Rutujkakde25)
- [@PrasadK2402](https://github.com/PrasadK2402)
