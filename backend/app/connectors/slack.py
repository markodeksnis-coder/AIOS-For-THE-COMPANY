from collections.abc import Iterator

from app.connectors.base import Connector, ConnectorInfo
from app.schemas import DocumentIn


class SlackConnector(Connector):
    """Pulls messages from Slack channels into the knowledge store.

    Not implemented yet: needs a Slack app with a bot token and channel
    scoping decided before it can sync real workspace data.
    """

    info = ConnectorInfo(name="slack", status="planned", phase="Phase 1")

    def sync(self) -> Iterator[DocumentIn]:
        raise NotImplementedError("Slack connector is planned for Phase 1, not yet implemented")
