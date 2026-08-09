from abc import ABC, abstractmethod
from collections.abc import Iterator

from pydantic import BaseModel

from app.schemas import DocumentIn


class ConnectorInfo(BaseModel):
    name: str
    status: str  # "planned" | "implemented"
    phase: str


class Connector(ABC):
    info: ConnectorInfo

    @abstractmethod
    def sync(self) -> Iterator[DocumentIn]:
        """Yield documents pulled from the source. Raises until implemented."""
        raise NotImplementedError
