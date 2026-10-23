import asyncio

import pytest
from pydantic import ValidationError

from app.ai import _MOCK, ClaudeGenerator, GenerationError
from app.config import Settings
from app.schemas import BoardConfig, GenerateRequest, QuizConfig, WordConfig

REQ = GenerateRequest(template="quiz", theme="Space", players=3, rules="")


def make_generator(responses):
    gen = ClaudeGenerator(Settings(ai_provider="claude", ai_max_attempts=2))
    calls = []

    async def fake_request(req, feedback):
        calls.append(feedback)
        result = responses.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    gen._request = fake_request
    return gen, calls


def valid_quiz():
    return {**_MOCK["quiz"], "template": "quiz", "theme": "x", "players": 1}


def test_retries_with_validation_feedback_then_succeeds():
    bad = {**valid_quiz(), "timer_seconds": 1}
    gen, calls = make_generator([bad, valid_quiz()])
    config = asyncio.run(gen.generate(REQ))
    # Creator-chosen fields are pinned regardless of what the model returned.
    assert (config.players, config.theme) == (3, "Space")
    assert calls[0] is None and "timer_seconds" in calls[1]


def test_gives_up_after_max_attempts():
    gen, _ = make_generator([ValueError("not json"), {"nope": 1}])
    with pytest.raises(GenerationError) as exc:
        asyncio.run(gen.generate(REQ))
    assert exc.value.status_code == 502


def test_generation_errors_are_not_retried():
    gen, calls = make_generator([GenerationError("declined", 422), valid_quiz()])
    with pytest.raises(GenerationError):
        asyncio.run(gen.generate(REQ))
    assert len(calls) == 1


def test_schema_cross_field_rules():
    q = valid_quiz()
    with pytest.raises(ValidationError):
        QuizConfig.model_validate({**q, "questions": [{**q["questions"][0], "answer_index": 4}]})
    with pytest.raises(ValidationError):
        QuizConfig.model_validate({**q, "questions": [{**q["questions"][0], "choices": ["A", "a"], "answer_index": 0}]})

    b = {**_MOCK["board"], "template": "board", "theme": "x", "players": 2}
    with pytest.raises(ValidationError):
        BoardConfig.model_validate({**b, "rows": 3, "columns": 3, "win_length": 4})
    with pytest.raises(ValidationError):
        BoardConfig.model_validate({**b, "players": 3, "pieces": b["pieces"][:2]})

    w = {**_MOCK["word"], "template": "word", "theme": "x", "players": 1}
    with pytest.raises(ValidationError):
        WordConfig.model_validate({**w, "words": [{"word": "R2D2", "hint": "droid"}]})
    assert WordConfig.model_validate({**w, "words": [{"word": "orbit", "hint": "path"}]}).words[0].word == "ORBIT"


def test_extra_keys_rejected():
    with pytest.raises(ValidationError):
        QuizConfig.model_validate({**valid_quiz(), "script": "<script>"})
