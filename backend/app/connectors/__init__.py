from app.connectors.base import Connector, ConnectorInfo
from app.connectors.gmail import GmailConnector
from app.connectors.slack import SlackConnector

REGISTRY: list[ConnectorInfo] = [
    SlackConnector.info,
    GmailConnector.info,
    ConnectorInfo(name="google_drive", status="planned", phase="Phase 1"),
    ConnectorInfo(name="google_calendar", status="planned", phase="Phase 1"),
    ConnectorInfo(name="jira_confluence", status="planned", phase="Phase 2"),
    ConnectorInfo(name="trello", status="planned", phase="Phase 2"),
]

__all__ = ["Connector", "ConnectorInfo", "SlackConnector", "GmailConnector", "REGISTRY"]
