import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from .ai import GenerationError, make_generator
from .config import get_settings
from .db import engine, get_session
from .models import Base, Game
from .ratelimit import SlidingWindowLimiter
from .schemas import CONFIG_MODELS, GameOut, GenerateRequest, PublishOut, PublishRequest

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Idempotent; production schema lives in db/schema.sql (applied by the Postgres container on first boot).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.state.generator = make_generator(settings)
    app.state.limiter = SlidingWindowLimiter(settings.generate_rate_per_minute)
    yield
    await engine.dispose()


app = FastAPI(title="GameForge AI", version="1.0.0", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def share_url(game_id: str) -> str:
    return f"{settings.public_app_url.rstrip('/')}/play/{game_id}"


def to_out(game: Game) -> GameOut:
    return GameOut(
        id=game.id,
        template=game.template,  # type: ignore[arg-type]
        status=game.status,  # type: ignore[arg-type]
        config=game.config,
        request=game.request,
        created_at=game.created_at,
        published_at=game.published_at,
        url=share_url(game.id) if game.status == "published" else None,
    )


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for") if settings.trust_forwarded_for else None
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate", response_model=GameOut, status_code=201)
async def generate(body: GenerateRequest, request: Request, session: SessionDep) -> GameOut:
    if not request.app.state.limiter.allow(client_ip(request)):
        raise HTTPException(429, "Too many generations — wait a minute and try again.")
    try:
        config = await request.app.state.generator.generate(body)
    except GenerationError as e:
        raise HTTPException(e.status_code, str(e)) from e

    game = Game(
        template=body.template,
        title=config.title,
        request=body.model_dump(),
        config=config.model_dump(mode="json"),
        model=request.app.state.generator.model_name,
    )
    session.add(game)
    await session.commit()
    await session.refresh(game)
    return to_out(game)


@app.post("/publish", response_model=PublishOut)
async def publish(body: PublishRequest, session: SessionDep) -> PublishOut:
    game = await session.get(Game, body.id)
    if game is None:
        raise HTTPException(404, "Game not found")
    if body.config is not None:
        if game.status == "published":
            raise HTTPException(409, "Published games are immutable — generate a new one to change it.")
        try:
            # Pin template/players so an edit can't swap the engine or break the player contract.
            edited = {**body.config, "template": game.template, "players": game.config["players"]}
            config = CONFIG_MODELS[game.template].model_validate(edited)
        except ValidationError as e:
            raise HTTPException(422, e.errors(include_url=False, include_context=False)) from e
        game.config = config.model_dump(mode="json")
        game.title = config.title
    if game.status != "published":
        game.status = "published"
        game.published_at = datetime.now(UTC)
    await session.commit()
    return PublishOut(id=game.id, status="published", url=share_url(game.id))


@app.get("/game/{game_id}", response_model=GameOut)
async def get_game(game_id: str, session: SessionDep, response: Response) -> GameOut:
    game = await session.get(Game, game_id) if len(game_id) <= 16 else None
    if game is None:
        raise HTTPException(404, "Game not found")
    # Published configs never change, so CDNs and the Next.js data cache can hold them indefinitely.
    response.headers["Cache-Control"] = (
        "public, max-age=31536000, immutable" if game.status == "published" else "no-store"
    )
    return to_out(game)
