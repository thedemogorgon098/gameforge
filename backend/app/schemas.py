"""Strict, versioned game-config schemas — the only thing the AI is allowed to produce.

Each template engine on the frontend consumes exactly one of these shapes. Constraints the
Claude structured-output grammar can't express (min/max, patterns) are stripped from the schema
sent to the API by `anthropic.transform_schema` and enforced here by Pydantic instead.
"""

from datetime import datetime
from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, field_validator, model_validator

TemplateId = Literal["quiz", "memory", "word", "runner", "board"]

HexColor = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$", description="6-digit hex, e.g. #22d3ee")]
Emoji = Annotated[str, Field(min_length=1, max_length=16, description="A single emoji")]
ShortText = Annotated[str, Field(min_length=1, max_length=120)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Palette(Strict):
    primary: HexColor
    secondary: HexColor
    accent: HexColor


class BaseConfig(Strict):
    title: str = Field(min_length=1, max_length=80, description="Catchy game title")
    theme: str = Field(min_length=1, max_length=80)
    players: int = Field(ge=1, le=8)
    intro: str = Field(max_length=280, description="One or two sentences of flavor text")
    palette: Palette = Field(description="Neon colors that read well on a near-black background")


# ── Quiz ─────────────────────────────────────────────────────────────────────


class QuizQuestion(Strict):
    prompt: str = Field(min_length=1, max_length=300)
    choices: list[ShortText] = Field(min_length=2, max_length=6)
    answer_index: int = Field(ge=0, description="0-based index into choices")
    explanation: str = Field(max_length=280)

    @model_validator(mode="after")
    def _check(self) -> "QuizQuestion":
        if self.answer_index >= len(self.choices):
            raise ValueError("answer_index out of range")
        if len({c.casefold() for c in self.choices}) != len(self.choices):
            raise ValueError("choices must be unique")
        return self


class QuizConfig(BaseConfig):
    template: Literal["quiz"]
    questions: list[QuizQuestion] = Field(min_length=1, max_length=50)
    timer_seconds: int = Field(ge=5, le=3600)
    timer_scope: Literal["per_question", "total"]
    points_per_correct: int = Field(ge=1, le=1000)
    shuffle_choices: bool


# ── Memory Match ─────────────────────────────────────────────────────────────


class MemoryCard(Strict):
    symbol: Emoji
    label: str = Field(min_length=1, max_length=24)


class MemoryConfig(BaseConfig):
    template: Literal["memory"]
    cards: list[MemoryCard] = Field(min_length=2, max_length=18, description="Unique pairs; each appears twice")
    columns: int = Field(ge=2, le=6)
    time_limit_seconds: int = Field(ge=0, le=1800, description="0 = no limit")
    reveal_ms: int = Field(ge=300, le=3000, description="How long a mismatched pair stays face up")

    @field_validator("cards")
    @classmethod
    def _unique(cls, cards: list[MemoryCard]) -> list[MemoryCard]:
        if len({c.label.casefold() for c in cards}) != len(cards):
            raise ValueError("card labels must be unique")
        return cards


# ── Word Puzzle ──────────────────────────────────────────────────────────────


class WordEntry(Strict):
    word: str = Field(pattern=r"^[A-Za-z]{3,12}$", description="Single word, letters only, 3-12 chars")
    hint: str = Field(min_length=1, max_length=160)

    @field_validator("word")
    @classmethod
    def _upper(cls, w: str) -> str:
        return w.upper()


class WordConfig(BaseConfig):
    template: Literal["word"]
    words: list[WordEntry] = Field(min_length=1, max_length=40)
    time_per_word_seconds: int = Field(ge=0, le=600, description="0 = no limit")
    max_mistakes: int = Field(ge=0, le=10, description="Wrong submissions allowed per word; 0 = unlimited")
    reveal_first_letter: bool


# ── Endless Runner ───────────────────────────────────────────────────────────


class RunnerConfig(BaseConfig):
    template: Literal["runner"]
    hero: Emoji
    obstacles: list[Emoji] = Field(min_length=1, max_length=6)
    collectibles: list[Emoji] = Field(min_length=1, max_length=4)
    base_speed: int = Field(ge=150, le=700, description="Pixels per second")
    speed_increase_per_10s: int = Field(ge=0, le=150)
    gravity: int = Field(ge=800, le=3200)
    jump_velocity: int = Field(ge=400, le=1300)
    spawn_interval_ms: int = Field(ge=500, le=3000)
    lives: int = Field(ge=1, le=5)
    target_score: int = Field(ge=0, le=1_000_000, description="0 = endless")


# ── Turn-Based Board (connect-N family: tic-tac-toe, gomoku, connect four…) ──


class BoardPiece(Strict):
    name: str = Field(min_length=1, max_length=24)
    symbol: Emoji


class BoardConfig(BaseConfig):
    template: Literal["board"]
    rows: int = Field(ge=3, le=10)
    columns: int = Field(ge=3, le=10)
    win_length: int = Field(ge=3, le=6)
    gravity: bool = Field(description="True = pieces drop to the lowest free cell (connect-four style)")
    pieces: list[BoardPiece] = Field(min_length=2, max_length=4, description="One per side, in turn order")

    @model_validator(mode="after")
    def _check(self) -> "BoardConfig":
        if self.win_length > max(self.rows, self.columns):
            raise ValueError("win_length cannot exceed the board's longest side")
        if len(self.pieces) < max(self.players, 2):
            raise ValueError("need one piece per player (at least 2; player 2 is the CPU in solo play)")
        if len({p.name.casefold() for p in self.pieces}) != len(self.pieces):
            raise ValueError("piece names must be unique")
        return self


GameConfig = Annotated[
    Union[QuizConfig, MemoryConfig, WordConfig, RunnerConfig, BoardConfig],
    Field(discriminator="template"),
]
game_config_adapter: TypeAdapter[GameConfig] = TypeAdapter(GameConfig)

CONFIG_MODELS: dict[str, type[BaseConfig]] = {
    "quiz": QuizConfig,
    "memory": MemoryConfig,
    "word": WordConfig,
    "runner": RunnerConfig,
    "board": BoardConfig,
}

PLAYER_LIMITS: dict[str, tuple[int, int]] = {
    "quiz": (1, 8),
    "memory": (1, 4),
    "word": (1, 4),
    "runner": (1, 4),
    "board": (1, 4),
}


# ── API payloads ─────────────────────────────────────────────────────────────


class GenerateRequest(Strict):
    template: TemplateId
    theme: str = Field(min_length=1, max_length=80)
    players: int = Field(ge=1, le=8)
    rules: str = Field(default="", max_length=600)

    @model_validator(mode="after")
    def _players(self) -> "GenerateRequest":
        lo, hi = PLAYER_LIMITS[self.template]
        if not lo <= self.players <= hi:
            raise ValueError(f"{self.template} supports {lo}-{hi} players")
        return self


class PublishRequest(Strict):
    id: str = Field(min_length=1, max_length=16)
    # Optional edited config; re-validated against the game's template before saving.
    config: dict[str, Any] | None = None


class GameOut(BaseModel):
    id: str
    template: TemplateId
    status: Literal["draft", "published"]
    config: dict[str, Any]
    request: dict[str, Any]
    created_at: datetime
    published_at: datetime | None
    url: str | None


class PublishOut(BaseModel):
    id: str
    status: Literal["published"]
    url: str
