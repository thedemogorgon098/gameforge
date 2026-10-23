import pytest

from app.ratelimit import SlidingWindowLimiter

TEMPLATES = ["quiz", "memory", "word", "runner", "board"]


def generate(client, template="quiz", players=2, **extra):
    body = {"template": template, "theme": "Marvel", "players": players, "rules": "20 questions, 60 sec timer", **extra}
    return client.post("/generate", json=body)


@pytest.mark.parametrize("template", TEMPLATES)
def test_generate_each_template(client, template):
    res = generate(client, template)
    assert res.status_code == 201, res.text
    game = res.json()
    assert game["template"] == template
    assert game["status"] == "draft"
    assert game["url"] is None
    assert game["config"]["players"] == 2
    assert game["config"]["theme"] == "Marvel"
    assert len(game["id"]) == 10


def test_generate_rejects_player_count_outside_template_limits(client):
    assert generate(client, "memory", players=5).status_code == 422
    assert generate(client, "quiz", players=8).status_code == 201


def test_generate_rejects_unknown_fields_and_templates(client):
    assert generate(client, "chess").status_code == 422
    assert generate(client, "quiz", code="alert(1)").status_code == 422


def test_draft_publish_and_fetch(client):
    game = generate(client).json()

    draft = client.get(f"/game/{game['id']}")
    assert draft.status_code == 200
    assert draft.headers["cache-control"] == "no-store"

    pub = client.post("/publish", json={"id": game["id"]})
    assert pub.status_code == 200
    assert pub.json()["url"] == f"https://gameforge.test/play/{game['id']}"

    live = client.get(f"/game/{game['id']}")
    assert live.json()["status"] == "published"
    assert live.json()["published_at"] is not None
    assert "immutable" in live.headers["cache-control"]

    # Publishing again is idempotent; editing a published game is not allowed.
    assert client.post("/publish", json={"id": game["id"]}).status_code == 200
    assert client.post("/publish", json={"id": game["id"], "config": live.json()["config"]}).status_code == 409


def test_publish_with_edits_is_validated(client):
    game = generate(client).json()
    config = game["config"]

    bad = {**config, "questions": [{**config["questions"][0], "answer_index": 9}]}
    assert client.post("/publish", json={"id": game["id"], "config": bad}).status_code == 422

    # Template and players are pinned even if the edit tries to change them.
    good = {**config, "title": "Edited Title", "players": 7, "template": "memory"}
    assert client.post("/publish", json={"id": game["id"], "config": good}).status_code == 200
    saved = client.get(f"/game/{game['id']}").json()["config"]
    assert (saved["title"], saved["players"], saved["template"]) == ("Edited Title", 2, "quiz")


def test_missing_game(client):
    assert client.get("/game/doesnotexist").status_code == 404
    assert client.get("/game/" + "x" * 40).status_code == 404
    assert client.post("/publish", json={"id": "nope"}).status_code == 404


def test_generate_rate_limit(client):
    client.app.state.limiter = SlidingWindowLimiter(limit=1)
    assert generate(client).status_code == 201
    assert generate(client).status_code == 429
