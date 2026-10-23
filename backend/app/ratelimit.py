import time
from collections import defaultdict, deque


class SlidingWindowLimiter:
    """In-process per-key limiter. Fine for a single API instance; use Redis or the edge proxy when scaling out."""

    def __init__(self, limit: int, window_seconds: float = 60.0):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        if len(self._hits) > 10_000:  # bound memory under abuse
            self._hits = defaultdict(deque, {k: v for k, v in self._hits.items() if v})
        return True
