import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db import init_db
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "test.db"))
    init_db()
    return TestClient(app)
