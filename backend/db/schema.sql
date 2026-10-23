-- GameForge AI — PostgreSQL schema (mirrors app/models.py; applied on first container boot).
CREATE TABLE IF NOT EXISTS games (
    id              VARCHAR(16)  PRIMARY KEY,                -- 10-char base62 share id
    template        VARCHAR(16)  NOT NULL,
    title           VARCHAR(120) NOT NULL,
    request         JSONB        NOT NULL,                   -- builder input: theme / players / rules
    config          JSONB        NOT NULL,                   -- validated template config
    schema_version  INTEGER      NOT NULL DEFAULT 1,
    status          VARCHAR(16)  NOT NULL DEFAULT 'draft',
    model           VARCHAR(64),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ,
    CONSTRAINT ck_games_template CHECK (template IN ('quiz','memory','word','runner','board')),
    CONSTRAINT ck_games_status   CHECK (status IN ('draft','published'))
);

CREATE INDEX IF NOT EXISTS ix_games_status_created ON games (status, created_at);
