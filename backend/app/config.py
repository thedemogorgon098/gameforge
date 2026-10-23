from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://gameforge:gameforge@localhost:5432/gameforge"

    # "claude" calls the Anthropic API; "mock" returns canned configs (dev/tests, no API spend).
    ai_provider: Literal["claude", "mock"] = "claude"
    ai_model: str = "claude-opus-5-5"
    ai_effort: Literal["low", "medium", "high", "xhigh", "max"] = "low"
    ai_timeout_seconds: float = 90.0
    ai_max_attempts: int = 2

    # Public origin of the Next.js app, used to build shareable URLs.
    public_app_url: str = "http://localhost:3000"
    cors_origins: list[str] = ["http://localhost:3000"]

    # Per-client-IP budget for POST /generate (each call costs model tokens).
    generate_rate_per_minute: int = 6
    # Only enable when the API sits behind a proxy you control (e.g. the Next.js server) — the header is spoofable.
    trust_forwarded_for: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
