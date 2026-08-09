from fastapi import APIRouter

from app.connectors import REGISTRY
from app.schemas import ConnectorStatus

router = APIRouter()


@router.get("/connectors", response_model=list[ConnectorStatus])
def list_connectors() -> list[ConnectorStatus]:
    return [ConnectorStatus(**c.model_dump()) for c in REGISTRY]
