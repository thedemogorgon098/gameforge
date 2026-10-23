"""Turns a GenerateRequest into a validated game config. The model only ever emits JSON data."""

import json
import logging
from typing import Any, Protocol

import anthropic
from pydantic import ValidationError

from .config import Settings
from .prompts import SYSTEM_PROMPT, build_user_prompt
from .schemas import CONFIG_MODELS, BaseConfig, GenerateRequest

log = logging.getLogger("gameforge.ai")


class GenerationError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class ConfigGenerator(Protocol):
    model_name: str

    async def generate(self, req: GenerateRequest) -> BaseConfig: ...


def finalize(req: GenerateRequest, data: dict[str, Any]) -> BaseConfig:
    """Pin the fields the creator chose explicitly, then run full schema validation."""
    data = {**data, "template": req.template, "players": req.players, "theme": req.theme}
    return CONFIG_MODELS[req.template].model_validate(data)


def _format_errors(err: ValidationError) -> str:
    return "\n".join(f"- {'.'.join(map(str, e['loc'])) or '(root)'}: {e['msg']}" for e in err.errors()[:20])


class ClaudeGenerator:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model_name = settings.ai_model
        self.client = anthropic.AsyncAnthropic(timeout=settings.ai_timeout_seconds, max_retries=2)
        # Schemas are static per template; transform once (also keeps the API-side grammar cache warm).
        self.schemas = {t: anthropic.transform_schema(m) for t, m in CONFIG_MODELS.items()}

    async def _request(self, req: GenerateRequest, feedback: str | None) -> dict[str, Any]:
        try:
            response = await self.client.beta.messages.create(
                model=self.settings.ai_model,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": build_user_prompt(req, feedback)}],
                output_config={
                    "effort": self.settings.ai_effort,
                    "format": {"type": "json_schema", "schema": self.schemas[req.template]},
                },
                # If a safety classifier declines, let the API retry on its recommended fallback model.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.AuthenticationError as e:
            log.error("Anthropic auth failed: %s", e)
            raise GenerationError("AI provider is not configured", 500) from e
        except anthropic.BadRequestError as e:
            log.error("Anthropic rejected request: %s", e)
            raise GenerationError("AI request was rejected", 502) from e
        except anthropic.RateLimitError as e:
            raise GenerationError("AI is busy, try again in a moment", 503) from e
        except (anthropic.APIStatusError, anthropic.APIConnectionError) as e:
            log.warning("Anthropic API error: %s", e)
            raise GenerationError("AI service unavailable, try again", 503) from e

        if response.stop_reason == "refusal":
            raise GenerationError("That theme or rule set can't be turned into a game. Try something else.", 422)
        if response.stop_reason == "max_tokens":
            raise ValueError("response truncated (max_tokens)")

        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise ValueError("response had no text block")
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("response JSON is not an object")
        return data

    async def generate(self, req: GenerateRequest) -> BaseConfig:
        feedback: str | None = None
        for attempt in range(1, self.settings.ai_max_attempts + 1):
            try:
                return finalize(req, await self._request(req, feedback))
            except ValidationError as e:
                feedback = _format_errors(e)
            except ValueError as e:  # includes json.JSONDecodeError
                feedback = f"- {e}"
            log.warning("config attempt %d/%d invalid:\n%s", attempt, self.settings.ai_max_attempts, feedback)
        raise GenerationError("The AI produced an invalid game config. Please try again.", 502)


_MOCK: dict[str, dict[str, Any]] = {
    "quiz": {
        "title": "Neon Brain Blitz",
        "intro": "Quick-fire questions. Fastest brain wins.",
        "palette": {"primary": "#22d3ee", "secondary": "#a855f7", "accent": "#f472b6"},
        "questions": [
            {"prompt": "Which planet is known as the Red Planet?", "choices": ["Venus", "Mars", "Jupiter", "Mercury"], "answer_index": 1, "explanation": "Iron oxide dust gives Mars its red color."},
            {"prompt": "What is 7 × 8?", "choices": ["54", "56", "64", "48"], "answer_index": 1, "explanation": "7 × 8 = 56."},
            {"prompt": "Which gas do plants absorb?", "choices": ["Oxygen", "Nitrogen", "Carbon dioxide", "Helium"], "answer_index": 2, "explanation": "Plants use CO₂ for photosynthesis."},
        ],
        "timer_seconds": 20,
        "timer_scope": "per_question",
        "points_per_correct": 100,
        "shuffle_choices": True,
    },
    "memory": {
        "title": "Synth Pairs",
        "intro": "Flip, remember, match.",
        "palette": {"primary": "#22d3ee", "secondary": "#a855f7", "accent": "#facc15"},
        "cards": [{"symbol": s, "label": l} for s, l in [("🚀", "Rocket"), ("🪐", "Planet"), ("⭐", "Star"), ("🌙", "Moon"), ("☄️", "Comet"), ("🛸", "UFO"), ("👾", "Alien"), ("🔭", "Telescope")]],
        "columns": 4,
        "time_limit_seconds": 0,
        "reveal_ms": 900,
    },
    "word": {
        "title": "Glitch Words",
        "intro": "Unscramble the signal.",
        "palette": {"primary": "#34d399", "secondary": "#22d3ee", "accent": "#f472b6"},
        "words": [{"word": "GALAXY", "hint": "A huge system of stars"}, {"word": "ORBIT", "hint": "Path around a planet"}, {"word": "NEBULA", "hint": "Cloud where stars are born"}],
        "time_per_word_seconds": 45,
        "max_mistakes": 3,
        "reveal_first_letter": False,
    },
    "runner": {
        "title": "Hyper Dash",
        "intro": "Jump the hazards, grab the stars.",
        "palette": {"primary": "#f472b6", "secondary": "#22d3ee", "accent": "#facc15"},
        "hero": "🏃", "obstacles": ["🌵", "🪨"], "collectibles": ["⭐"],
        "base_speed": 320, "speed_increase_per_10s": 25, "gravity": 1900, "jump_velocity": 820,
        "spawn_interval_ms": 1400, "lives": 3, "target_score": 0,
    },
    "board": {
        "title": "Grid Clash",
        "intro": "Line up four before your rival does.",
        "palette": {"primary": "#22d3ee", "secondary": "#f472b6", "accent": "#a3e635"},
        "rows": 6, "columns": 7, "win_length": 4, "gravity": True,
        "pieces": [{"name": "Cyan", "symbol": "🔵"}, {"name": "Magenta", "symbol": "🟣"}, {"name": "Lime", "symbol": "🟢"}, {"name": "Amber", "symbol": "🟠"}],
    },
}


class MockGenerator:
    """Deterministic offline generator for local development and tests."""

    model_name = "mock"

    async def generate(self, req: GenerateRequest) -> BaseConfig:
        data = json.loads(json.dumps(_MOCK[req.template]))  # deep copy
        data["title"] = f"{req.theme} {data['title']}"[:80]
        return finalize(req, data)


def make_generator(settings: Settings) -> ConfigGenerator:
    return MockGenerator() if settings.ai_provider == "mock" else ClaudeGenerator(settings)
