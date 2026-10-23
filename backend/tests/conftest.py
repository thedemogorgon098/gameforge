import os
import tempfile

import pytest

_db = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ.update(
    DATABASE_URL=f"sqlite+aiosqlite:///{_db}",
    AI_PROVIDER="mock",
    ANTHROPIC_API_KEY="test-key",
    PUBLIC_APP_URL="https://gameforge.test",
)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
