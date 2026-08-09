# AIOS backend — Phase 1: knowledge brain

A FastAPI service that ingests documents into a searchable store and answers
questions over them with cited sources.

## Run locally

```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

## Endpoints

- `GET /health` — liveness check
- `GET /connectors` — status of each data source connector (implemented vs. planned)
- `POST /ingest` — add a document `{source, title, url, author, created_at, content}`
- `POST /chat` — ask a question `{question}`, get back `{answer, citations}`

## Current state

Retrieval is full-text search (SQLite FTS5) over ingested documents — no
vector embeddings yet. The `/ingest` endpoint accepts documents manually;
the Slack and Gmail connectors in `app/connectors/` are stubs that raise
`NotImplementedError` until their OAuth/token setup is wired up.

## Tests

```
pytest
```
