from collections.abc import Iterator

from app.connectors.base import Connector, ConnectorInfo
from app.schemas import DocumentIn


class GmailConnector(Connector):
    """Pulls emails into the knowledge store.

    Not implemented yet: needs Google OAuth credentials and a mailbox scope
    decided before it can sync real inbox data.
    """

    info = ConnectorInfo(name="gmail", status="planned", phase="Phase 1")

    def sync(self) -> Iterator[DocumentIn]:
        raise NotImplementedError("Gmail connector is planned for Phase 1, not yet implemented")
