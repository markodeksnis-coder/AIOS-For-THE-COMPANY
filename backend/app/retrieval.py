import re
import sqlite3

from app.config import settings

_TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


def _fts_query(question: str) -> str:
    """Turn free text into a safe FTS5 MATCH query (OR of quoted tokens)."""
    tokens = _TOKEN_RE.findall(question)
    if not tokens:
        return '""'
    return " OR ".join(f'"{t}"' for t in tokens)


def search(conn: sqlite3.Connection, question: str, top_k: int | None = None) -> list[sqlite3.Row]:
    top_k = top_k or settings.retrieval_top_k
    query = _fts_query(question)
    rows = conn.execute(
        """
        SELECT d.id, d.source, d.title, d.url, d.author, d.content, bm25(documents_fts) AS rank
        FROM documents_fts
        JOIN documents d ON d.id = documents_fts.rowid
        WHERE documents_fts MATCH ?
        ORDER BY rank
        LIMIT ?
        """,
        (query, top_k),
    ).fetchall()
    return rows
