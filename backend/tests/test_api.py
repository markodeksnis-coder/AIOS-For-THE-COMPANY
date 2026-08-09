def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_connectors_lists_planned_sources(client):
    resp = client.get("/connectors")
    assert resp.status_code == 200
    names = {c["name"] for c in resp.json()}
    assert {"slack", "gmail", "google_drive"}.issubset(names)


def test_ingest_then_search_returns_document(client):
    resp = client.post(
        "/ingest",
        json={
            "source": "manual",
            "title": "Q3 roadmap",
            "url": "https://example.com/roadmap",
            "content": "The Q3 roadmap prioritizes the Slack and Gmail connectors.",
        },
    )
    assert resp.status_code == 200
    doc_id = resp.json()["id"]

    from app.db import session
    from app.retrieval import search

    with session() as conn:
        rows = search(conn, "roadmap connectors")
    assert any(row["id"] == doc_id for row in rows)


def test_chat_without_matching_documents_returns_placeholder(client):
    resp = client.post("/chat", json={"question": "anything at all"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["citations"] == []
    assert "don't have" in body["answer"]


def test_chat_without_api_key_returns_503(client):
    client.post(
        "/ingest",
        json={"source": "manual", "title": "Note", "content": "budget planning notes"},
    )
    resp = client.post("/chat", json={"question": "budget"})
    assert resp.status_code == 503
