# GameForge AI

Turn a prompt into a playable, shareable browser game. The AI (Claude) generates **only a JSON config** that
is validated against a strict schema; five hand-written template engines turn that config into a game.

```
User → Template → Theme / Rules / Players → Claude (structured JSON) → Pydantic validation
     → PostgreSQL (draft) → Preview → Publish → /play/<id>
```

## 1. Folder structure

```
gameforge/
├── docker-compose.yml          Postgres + API + web
├── backend/                    FastAPI
│   ├── app/
│   │   ├── main.py             routes: POST /generate, POST /publish, GET /game/{id}
│   │   ├── schemas.py          per-template config schemas (the AI's output contract) + API payloads
│   │   ├── prompts.py          system prompt + per-template guides
│   │   ├── ai.py               Claude structured-output call, validate → retry, mock generator
│   │   ├── models.py           SQLAlchemy `Game` model, share-id generator
│   │   ├── db.py / config.py   async engine, env settings
│   │   └── ratelimit.py        per-IP limit on /generate
│   ├── db/schema.sql           Postgres DDL (applied on first container boot)
│   └── tests/                  API + generator tests (SQLite + mock AI)
└── frontend/                   Next.js 15 App Router
    └── src/
        ├── app/                Landing (/), Builder (/builder), Preview (/preview/[id]), Play (/play/[id])
        │   └── actions.ts      Server Actions: generateGame, publishGame
        ├── components/         shadcn-style ui/, animated background, motion helpers, header
        ├── games/              template engines (one lazy chunk each) + shared HUD/timer
        └── lib/                API client (server-only), types, template metadata
```

## 2. Database schema

One table — configs are JSONB documents keyed by an unguessable 10-char base62 id (`backend/db/schema.sql`):

| column | type | notes |
|---|---|---|
| `id` | varchar(16) PK | share id used in `/play/<id>` |
| `template` | varchar(16) | `quiz \| memory \| word \| runner \| board` (CHECK) |
| `title` | varchar(120) | |
| `request` | jsonb | builder input (theme, players, rules) |
| `config` | jsonb | validated engine config |
| `schema_version` | int | for future config migrations |
| `status` | varchar(16) | `draft \| published` (CHECK) |
| `model` | varchar(64) | which generator produced it |
| `created_at`, `published_at` | timestamptz | index on `(status, created_at)` |

## 3. API

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/generate` | `{template, theme, players, rules}` | `201` draft `Game` (rate-limited per IP) |
| POST | `/publish` | `{id, config?}` | `{id, status, url}`; optional edited config is re-validated; published games are immutable (`409` on edit) |
| GET | `/game/{id}` | — | `Game`; published → `Cache-Control: immutable`, draft → `no-store` |
| GET | `/health` | — | liveness |

Errors: `422` invalid input / player count outside the template's range / AI declined the theme;
`429` rate limit; `502` AI produced invalid config after retries; `503` AI unavailable.

## 4. UI components

Dark-only neon theme: tokens in `globals.css`, a `glass` utility, gradient text, and neon rings. The animated
gradient and particle canvas are in `components/background.tsx`; particles pause when the tab is hidden and
respect reduced-motion. The shadcn-style primitives (`Button`, `Card`, `Input`, `Textarea`, `Label`,
`Badge`) are built on `cva` + `tailwind-merge` (`components.json` is present, so `npx shadcn add` works).
Framer Motion runs through `LazyMotion` + `m`, which loads only the DOM animation features.

## 5. Template architecture

- **Contract:** `backend/app/schemas.py` defines one strict Pydantic model per template (`extra="forbid"`,
  numeric ranges, cross-field rules such as `answer_index < len(choices)` and `win_length ≤ board side`).
  `frontend/src/lib/types.ts` mirrors it.
- **Generation:** `anthropic.transform_schema(Model)` becomes `output_config.format`, so Claude can only emit
  JSON of that shape. Constraints the grammar can't express are re-checked by Pydantic. On failure the
  validation errors are fed back for one retry. `template`, `players` and `theme` are always pinned to what
  the creator chose.
- **Engines:** `games/game-player.tsx` maps `template → next/dynamic(import(engine))`. A page downloads only
  its own engine, and Phaser (~350 KB gz) loads only when a Runner starts. Engines share the
  `EngineProps {config, players, onFinish}` interface, a timer hook, a scoreboard, and the end screen.
  - Quiz: hot-seat turns, per-question or total timer, optional choice shuffling.
  - Memory Match: 3D flip; a match keeps the turn; optional time limit.
  - Word Puzzle: scrambled tiles, hint, physical-keyboard support, mistakes cap, time bonus.
  - Endless Runner: Phaser arcade physics with variable jump height, speed ramp, lives, collectibles, and
    turn-based multiplayer.
  - Board: connect-N on any grid, with or without gravity. Up to 4 players, or 1 against a heuristic CPU
    (`board-logic.ts` is pure and unit-tested).

## 6–7. Running locally

Backend (Python 3.10+):

```bash
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt   # or .venv/bin/pip
cp .env.example .env        # set ANTHROPIC_API_KEY, or AI_PROVIDER=mock to work offline
uvicorn app.main:app --reload
pytest                      # 16 tests, SQLite + mock AI
```

Frontend (Node 20+):

```bash
cd frontend && npm install
cp .env.example .env.local  # API_URL=http://localhost:8000
npm run dev                 # npm run build && npm start for production; npm test for engine logic
```

AI settings (`backend/.env`): `AI_MODEL` (default `claude-opus-5-5`), `AI_EFFORT` (default `low`, which favors
generation latency; raise to `medium` for harder trivia), `AI_PROVIDER=mock` for offline canned configs. If a
safety classifier declines a request, server-side refusal fallback (`fallbacks: "default"`) retries it on
Anthropic's recommended model.

## 8. Deployment

```bash
cp .env.example .env           # set ANTHROPIC_API_KEY, POSTGRES_PASSWORD, PUBLIC_APP_URL
docker compose up -d --build   # http://localhost:3000
```

- Only `web` is exposed. The API is private and is reached by Server Actions and server components over
  `API_URL`, so there is no CORS in the hot path. The real client IP is forwarded for rate limiting.
- Play pages are statically generated on first visit and cached indefinitely. Publishing calls
  `revalidateTag` / `revalidatePath`, so a shared link serves cached HTML plus one engine chunk, well under 2 s.
- Managed hosting: deploy `frontend/` to Vercel (set `API_URL`), `backend/` to Fly.io / Render / Cloud Run from
  its Dockerfile, and use a managed Postgres (Neon, RDS, Supabase) with `DATABASE_URL=postgresql+asyncpg://…`.
- The rate limiter is per-process. With several API replicas, move it to Redis or the edge.
