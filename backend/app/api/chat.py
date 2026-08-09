from fastapi import APIRouter, HTTPException

from app.db import session
from app.llm import answer_question
from app.retrieval import search
from app.schemas import ChatRequest, ChatResponse, Citation

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    with session() as conn:
        chunks = search(conn, request.question)

    if not chunks:
        return ChatResponse(
            answer="I don't have any ingested documents that match this question yet.",
            citations=[],
        )

    try:
        answer = answer_question(request.question, chunks)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    citations = [
        Citation(id=row["id"], source=row["source"], title=row["title"], url=row["url"])
        for row in chunks
    ]
    return ChatResponse(answer=answer, citations=citations)
