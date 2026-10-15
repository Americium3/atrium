"""The allowance — what the CLAUDE register in the west case reads.

Three figures off one Claude subscription: the current session window (the
rolling five hours), the plan's weekly window, and the organization's extra
usage credit for the month. They come from the endpoint Claude Code's own
/usage screen asks, signed with the login Claude Code already keeps on this
machine, so the hall needs no key of its own and no form to type one into.

It is fenced the way the almanac is, and for the same reason: this is a call
past the machine. One GET per TTL, lazily (a case nobody can see asks for
nothing), a short timeout, and it never raises.

The login is READ, never renewed. Claude Code owns it: a refresh rotates the
refresh token, and a second process doing that behind Claude Code's back can
sign it out. So an expired access token is a state the board shows (the last
reading, dimmed, with its time) until Claude Code next renews the file, and
the token never leaves this module: not into the payload, not into the log.

Not a published API. The shape has changed once already (the flat
`seven_day_*` keys gave way to a `limits` list), so both are read, and any
field missing is a dash on the board rather than an error.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

ENDPOINT = "https://api.anthropic.com/api/oauth/usage"
BETA = "oauth-2025-04-20"

TTL_S = 120.0        # the session window moves in minutes, not seconds
FAIL_TTL_S = 60.0    # a refusal or a dead network is asked again a minute on
TIMEOUT_S = 8.0


def credentials_path() -> Path:
    """Where Claude Code keeps its login on Windows and Linux. (On macOS it is
    in the Keychain, and the board reads NOT SIGNED IN.)"""
    base = os.environ.get("CLAUDE_CONFIG_DIR")
    return (Path(base) if base else Path.home() / ".claude") / ".credentials.json"


def plan_label(sub: Any, tier: Any) -> str | None:
    """"max" on "default_claude_max_20x" engraves as MAX 20×."""
    if not isinstance(sub, str) or not sub.strip():
        return None
    label = sub.strip().upper()
    m = re.search(r"(\d+)x$", tier) if isinstance(tier, str) else None
    return f"{label} {m.group(1)}×" if m else label


def read_login(path: Path) -> dict[str, Any] | None:
    """The access token and what the plan is, or None when there is no usable
    login. A half-written file (Claude Code mid-renewal) reads as none for one
    poll, which is the honest answer for that moment."""
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    oauth = doc.get("claudeAiOauth") if isinstance(doc, dict) else None
    if not isinstance(oauth, dict):
        return None
    token = oauth.get("accessToken")
    if not isinstance(token, str) or not token:
        return None
    expires = oauth.get("expiresAt")
    return {
        "token": token,
        "expires_ms": expires if isinstance(expires, (int, float)) else None,
        "plan": plan_label(oauth.get("subscriptionType"), oauth.get("rateLimitTier")),
    }


def _ms(stamp: Any) -> int | None:
    if not isinstance(stamp, str) or not stamp:
        return None
    try:
        return int(datetime.fromisoformat(stamp.replace("Z", "+00:00")).timestamp() * 1000)
    except ValueError:
        return None


def _num(v: Any) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def _window(pct: Any, resets: Any) -> dict[str, Any] | None:
    p = _num(pct)
    if p is None:
        return None
    return {"pct": round(p, 1), "resets_at": _ms(resets)}


def shape(doc: Any) -> dict[str, Any]:
    """Pure: the endpoint's reply as the board's three meters.

    session and week are {pct, resets_at(ms)} or None. scoped is the weekly
    windows a single model family has of its own (Opus, Sonnet), said in the
    weekly meter's line. credit is {enabled, used, limit, pct, currency} in
    whole currency units (the wire carries cents) or None.
    """
    doc = doc if isinstance(doc, dict) else {}
    session = week = None
    scoped: list[dict[str, Any]] = []

    limits = doc.get("limits")
    if isinstance(limits, list) and limits:
        for item in limits:
            if not isinstance(item, dict):
                continue
            pct = item.get("percent", item.get("utilization"))
            w = _window(pct, item.get("resets_at"))
            if w is None:
                continue
            kind = item.get("kind")
            if kind == "session" and session is None:
                session = w
            elif kind == "weekly_all" and week is None:
                week = w
            elif kind == "weekly_scoped":
                scope = item.get("scope") or {}
                model = scope.get("model") if isinstance(scope, dict) else None
                name = model.get("display_name") if isinstance(model, dict) else None
                if isinstance(name, str) and name:
                    scoped.append(dict(w, name=name))
    if session is None:
        five = doc.get("five_hour") or {}
        session = _window(five.get("utilization"), five.get("resets_at"))
    if week is None:
        seven = doc.get("seven_day") or {}
        week = _window(seven.get("utilization"), seven.get("resets_at"))
    if not scoped:
        for key, name in (("seven_day_opus", "Opus"), ("seven_day_sonnet", "Sonnet")):
            win = doc.get(key) or {}
            w = _window(win.get("utilization"), win.get("resets_at"))
            if w is not None:
                scoped.append(dict(w, name=name))

    credit = None
    extra = doc.get("extra_usage")
    if isinstance(extra, dict):
        used = _num(extra.get("used_credits"))
        limit = _num(extra.get("monthly_limit"))
        pct = _num(extra.get("utilization"))
        if pct is None and used is not None and limit:
            pct = 100.0 * used / limit
        credit = {
            "enabled": bool(extra.get("is_enabled")),
            "used": None if used is None else round(used / 100, 2),
            "limit": None if limit is None else round(limit / 100, 2),
            "pct": None if pct is None else round(pct, 1),
            "currency": extra.get("currency") if isinstance(extra.get("currency"), str) else "USD",
        }
    return {"session": session, "week": week, "scoped": scoped, "credit": credit}


async def fetch_usage(token: str) -> tuple[str, dict[str, Any] | None]:
    """(state, reading). Never raises. A refused token is "lapsed", anything
    else that is not a reading is "unreachable"."""
    headers = {
        "Authorization": f"Bearer {token}",
        "anthropic-beta": BETA,
        "Accept": "application/json",
        "User-Agent": "atrium-hub",
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            r = await client.get(ENDPOINT, headers=headers)
    except Exception:
        return "unreachable", None
    if r.status_code in (401, 403):
        return "lapsed", None
    if r.status_code != 200:
        return "unreachable", None
    try:
        return "live", shape(r.json())
    except ValueError:
        return "unreachable", None


_usage: dict[str, Any] | None = None   # the last good reading, kept through a lapse
_usage_at = 0.0                        # monotonic, when it was read
_usage_wall = 0                        # epoch ms, when it was read
_state = "signed_out"
_asked_at = -1e9
_ttl = 0.0
_asked_for: str | None = None          # a digest of the token last asked with
_lock = asyncio.Lock()


def _digest(token: str) -> str:
    return hashlib.blake2b(token.encode("utf-8"), digest_size=8).hexdigest()


async def snapshot(path: Path | None = None) -> dict[str, Any]:
    """The whole register payload. Always a state; a reading that may be
    None, or may be the last good one held through a lapse (read_at says
    when). A new token (Claude Code renewed or re-signed) is asked with at
    once, whatever the TTL: that is the board coming back from LAPSED.
    """
    global _usage, _usage_at, _usage_wall, _state, _asked_at, _ttl, _asked_for
    login = read_login(path or credentials_path())
    async with _lock:
        if login is None:
            # Signed out is not a lapse: whoever's reading was held is not
            # the board's to keep showing.
            _state, _asked_for, _usage = "signed_out", None, None
        else:
            key = _digest(login["token"])
            now_ms = time.time() * 1000
            expired = login["expires_ms"] is not None and login["expires_ms"] <= now_ms
            due = (time.monotonic() - _asked_at) > _ttl or key != _asked_for
            if expired:
                _state = "lapsed"
            elif due:
                state, reading = await fetch_usage(login["token"])
                _asked_at = time.monotonic()
                _asked_for = key
                _state = state
                _ttl = TTL_S if state == "live" else FAIL_TTL_S
                if reading is not None:
                    _usage, _usage_at = reading, time.monotonic()
                    _usage_wall = int(time.time() * 1000)
        state, usage = _state, _usage
        read_at = _usage_wall if usage is not None else None
        age = round(time.monotonic() - _usage_at, 1) if usage is not None else None
    return {
        "state": state,
        "plan": login["plan"] if login else None,
        "usage": usage,
        "read_at": read_at,
        "age_s": age,
        "generated": int(time.time() * 1000),
    }
