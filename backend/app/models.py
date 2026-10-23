import secrets
import string
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, CheckConstraint, DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

_ALPHABET = string.ascii_letters + string.digits
ID_LENGTH = 10  # 62^10 ≈ 8e17 — unguessable enough for share links


def new_game_id() -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(ID_LENGTH))


# JSONB on Postgres, plain JSON elsewhere (SQLite in tests).
JsonType = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    pass


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (
        CheckConstraint("template IN ('quiz','memory','word','runner','board')", name="ck_games_template"),
        CheckConstraint("status IN ('draft','published')", name="ck_games_status"),
        Index("ix_games_status_created", "status", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(16), primary_key=True, default=new_game_id)
    template: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(120))
    # The builder inputs (theme / players / rules) — kept for regeneration and auditing.
    request: Mapped[dict[str, Any]] = mapped_column(JsonType)
    # The validated template config the game engine consumes.
    config: Mapped[dict[str, Any]] = mapped_column(JsonType)
    schema_version: Mapped[int] = mapped_column(default=1)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    model: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
