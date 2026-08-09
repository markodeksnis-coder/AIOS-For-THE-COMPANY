from pydantic import BaseModel, Field


class DocumentIn(BaseModel):
    source: str = Field(..., description="Where this came from, e.g. 'slack', 'gmail', 'manual'")
    external_id: str | None = None
    title: str | None = None
    url: str | None = None
    author: str | None = None
    created_at: str | None = None
    content: str


class DocumentOut(BaseModel):
    id: int
    source: str
    title: str | None
    url: str | None


class ChatRequest(BaseModel):
    question: str


class Citation(BaseModel):
    id: int
    source: str
    title: str | None
    url: str | None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]


class ConnectorStatus(BaseModel):
    name: str
    status: str
    phase: str
