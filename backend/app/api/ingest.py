from fastapi import APIRouter

from app.db import session
from app.schemas import DocumentIn, DocumentOut

router = APIRouter()


@router.post("/ingest", response_model=DocumentOut)
def ingest_document(doc: DocumentIn) -> DocumentOut:
    with session() as conn:
        cur = conn.execute(
            """
            INSERT INTO documents (source, external_id, title, url, author, created_at, content)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (doc.source, doc.external_id, doc.title, doc.url, doc.author, doc.created_at, doc.content),
        )
        doc_id = cur.lastrowid
    return DocumentOut(id=doc_id, source=doc.source, title=doc.title, url=doc.url)
