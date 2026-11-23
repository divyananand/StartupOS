"""Usage limits that keep a public deployment safe and affordable.

- AI requests are counted per user per day in the database, with lower limits
  for demo accounts and an overall daily cap as a hard ceiling on spend.
- Login, sign-up and demo creation are rate limited per client to slow down
  password guessing and account spam.
"""

import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from db import db

AI_DAILY_LIMIT = int(os.getenv("AI_DAILY_LIMIT", "30"))  # per regular user
DEMO_AI_DAILY_LIMIT = int(os.getenv("DEMO_AI_DAILY_LIMIT", "5"))  # per demo user
DEMO_AI_GLOBAL_DAILY_LIMIT = int(os.getenv("DEMO_AI_GLOBAL_DAILY_LIMIT", "60"))  # all demo users together
AI_GLOBAL_DAILY_LIMIT = int(os.getenv("AI_GLOBAL_DAILY_LIMIT", "300"))  # everyone together


def charge_ai_request(user: dict) -> None:
    """Count one AI request for this user, or raise 429 if a limit is reached."""
    is_demo = bool(user.get("is_demo"))
    with db() as cur:
        cur.execute(
            "SELECT COALESCE(SUM(count), 0) AS total, "
            "COALESCE(SUM(count) FILTER (WHERE is_demo), 0) AS demo_total "
            "FROM ai_usage WHERE day = CURRENT_DATE"
        )
        totals = cur.fetchone()
        if totals["total"] >= AI_GLOBAL_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="StartupOS has reached its AI limit for today. Please try again tomorrow.",
            )
        if is_demo and totals["demo_total"] >= DEMO_AI_GLOBAL_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="The demo has reached its AI limit for today. Create a free account to keep going.",
            )

        cur.execute(
            "INSERT INTO ai_usage (user_id, is_demo, day, count) VALUES (%s, %s, CURRENT_DATE, 1) "
            "ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usage.count + 1 RETURNING count",
            (user["id"], is_demo),
        )
        used = cur.fetchone()["count"]
        limit = DEMO_AI_DAILY_LIMIT if is_demo else AI_DAILY_LIMIT
        if used > limit:
            # Raising inside db() rolls the increment back.
            raise HTTPException(
                status_code=429,
                detail=(
                    f"You've used all {limit} AI requests in the demo today. Create a free account to keep going."
                    if is_demo
                    else f"You've used all {limit} AI requests for today. Your limit resets tomorrow."
                ),
            )


def refund_ai_request(user: dict) -> None:
    """Give back a request that failed on the AI side, so errors don't use up the quota."""
    with db() as cur:
        cur.execute(
            "UPDATE ai_usage SET count = GREATEST(count - 1, 0) WHERE user_id = %s AND day = CURRENT_DATE",
            (user["id"],),
        )


def ai_usage_today(user: dict) -> dict:
    with db() as cur:
        cur.execute("SELECT count FROM ai_usage WHERE user_id = %s AND day = CURRENT_DATE", (user["id"],))
        row = cur.fetchone()
    limit = DEMO_AI_DAILY_LIMIT if user.get("is_demo") else AI_DAILY_LIMIT
    return {"used": row["count"] if row else 0, "limit": limit}


class RateLimiter:
    """Allow at most `limit` hits per key within a sliding `window` of seconds.

    Kept in memory, which is enough for a single server instance.
    """

    def __init__(self, limit: int, window: float):
        self.limit = limit
        self.window = window
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True


def client_ip(request: Request) -> str:
    # Behind Railway's proxy the real client is the last address the proxy
    # appended. Earlier entries can be spoofed by the client, so ignore them.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


auth_limiter = RateLimiter(int(os.getenv("AUTH_RATE_LIMIT", "10")), 300)  # 10 tries / 5 min
demo_limiter = RateLimiter(int(os.getenv("DEMO_RATE_LIMIT", "5")), 3600)  # 5 demos / hour


def enforce(limiter: RateLimiter, *keys: str) -> None:
    for key in keys:
        if not limiter.hit(key):
            raise HTTPException(status_code=429, detail="Too many attempts. Please wait a few minutes and try again.")
