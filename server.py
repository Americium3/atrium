"""Atrium — master entry hub for local web UIs.

Serves the Atrium frontend on http://127.0.0.1:8769 and aggregates status +
news dispatches from the registered services. Read-only by design: the hub
only ever issues idempotent GETs against the services and never mutates
their state (notably: never POST /api/notifications/read on Autopilot —
it would consume the user's panel banners — and never POST anything on
Ground Station or Outreach).

Time contract: every dispatch `ts` is epoch **milliseconds**.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from contextlib import asynccontextmanager, suppress
from datetime import datetime
from pathlib import Path

import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

ROOT = Path(__file__).resolve().parent
STATE_DIR = ROOT / "state"
STATIC_DIR = ROOT / "static"

HOST = "127.0.0.1"
PORT = 8769

FAST_TICK_S = 60
SLOW_EVERY = 5          # slow tick every N fast ticks (5 min)
HTTP_TIMEOUT_S = 2.0
FEED_WINDOW_MS = 7 * 24 * 3600 * 1000
EPISODE_WINDOW_MS = 48 * 3600 * 1000
FEED_CAP = 60
DAEMON_STALE_S = 15 * 60

AUTOPILOT_URL = "http://127.0.0.1:8767"
GS_URL = "http://127.0.0.1:8768"
GS_HEADERS = {"X-PMH": "1"}          # required by every Ground Station route
OUTREACH_URL = "http://127.0.0.1:8802"
PRESSROOM_URL = "http://127.0.0.1:8765"

GS_DATA_DIR = Path(r"X:\Github\pdx-mod-hub\data")
AP_DATA_DIR = Path(r"X:\Github\anime-rss-auto")
OUTREACH_DIR = Path(r"X:\Github\linkedin-networking")

# Privacy hard rule: outreach dispatches/stats may only ever carry aggregate
# count keys. Names, draft text and per-person URLs never leave this process.
OUTREACH_PARAM_ALLOW = {"n", "target", "done", "total", "ready", "invited"}

log = logging.getLogger("atrium")

# --------------------------------------------------------------------------
# Service registry — a new web UI is one entry here (adapter + custom sigil
# are optional: without an adapter the gate is lamp-only, no dispatches).
# --------------------------------------------------------------------------

SERVICES = [
    {
        "id": "autopilot",
        "name": "ANIME AUTOPILOT",
        "wing": "salon",
        "url": AUTOPILOT_URL + "/",
        "addr": "127.0.0.1:8767",
        "sigil": "autopilot",
        "desc_key": "autopilot",
        "launch_hint": r"X:\Github\anime-rss-auto\run_webui_hidden.vbs",
        "order": 1,
    },
    {
        "id": "groundstation",
        "name": "GROUND STATION",
        "wing": "salon",
        "url": GS_URL + "/#/updates",
        "addr": "127.0.0.1:8768",
        "sigil": "groundstation",
        "desc_key": "groundstation",
        "launch_hint": r"X:\Github\pdx-mod-hub\scripts\run_hub_hidden.vbs",
        "order": 2,
    },
    {
        "id": "outreach",
        "name": "OUTREACH DESK",
        "wing": "bureau",
        "url": OUTREACH_URL + "/index.html",
        "addr": "127.0.0.1:8802",
        "sigil": "outreach",
        "desc_key": "outreach",
        "launch_hint": r"X:\Github\linkedin-networking\run_server_hidden.vbs",
        "order": 3,
    },
    {
        "id": "pressroom",
        "name": "THE PRESS ROOM",
        "wing": "bureau",
        "url": PRESSROOM_URL + "/",
        "addr": "127.0.0.1:8765",
        "sigil": "pressroom",
        "desc_key": "pressroom",
        "launch_hint": r"X:\Github\yorha-news\scripts\run_server.py",
        "order": 4,
    },
]

# --------------------------------------------------------------------------
# Utilities
# --------------------------------------------------------------------------

def now_ms() -> int:
    return int(time.time() * 1000)


def naive_iso_to_ms(s: str) -> int | None:
    """Autopilot's detected_at is naive local ISO ('2026-07-04T12:33:11').

    fromisoformat().timestamp() interprets naive datetimes as machine-local,
    which is exactly right here. Never route this through utcnow().
    """
    try:
        return int(datetime.fromisoformat(s).timestamp() * 1000)
    except (ValueError, TypeError):
        return None


def local_dt_to_ms(s: str, fmt: str = "%Y-%m-%d %H:%M:%S") -> int | None:
    try:
        return int(datetime.strptime(s, fmt).timestamp() * 1000)
    except (ValueError, TypeError):
        return None


def local_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def strip_html(html: str, limit: int = 140) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text[: limit - 1] + "…" if len(text) > limit else text


_last_good_files: dict[str, object] = {}


def read_json_safe(path: Path):
    """Cross-process file read: services rewrite these files non-atomically,
    and Windows can also raise sharing violations mid-write. On any failure
    reuse the last good payload for that path. Reserved for the small fixed
    set of state files — unbounded key families must use read_json_optional
    or the last-good cache grows forever."""
    key = str(path)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        _last_good_files[key] = payload
        return payload
    except (OSError, json.JSONDecodeError, ValueError):
        return _last_good_files.get(key)


def read_json_optional(path: Path):
    """Best-effort read with no retention — for optional per-item files
    (e.g. changelogs) where a miss is fine and caching would leak."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def atomic_write_json(path: Path, payload) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def clean_outreach_params(params: dict) -> dict:
    return {k: v for k, v in params.items() if k in OUTREACH_PARAM_ALLOW}


# --------------------------------------------------------------------------
# Pure adapter transforms (unit-testable — no I/O)
# --------------------------------------------------------------------------

def anime_notifications_to_dispatches(items: list, now: int) -> dict:
    """Premiere items carry NO 'kind' key; completed carry kind='completed'.
    Any other kind value is unknown — drop and log, never default it into
    the premiere branch."""
    out: dict[str, dict] = {}
    for n in items or []:
        if n.get("read"):
            continue
        ts = naive_iso_to_ms(n.get("detected_at", ""))
        if ts is None or now - ts > FEED_WINDOW_MS:
            continue
        did = f"anime:notif:{n.get('bgm_id')}:{n.get('detected_at')}"
        kind = n.get("kind")
        if kind == "completed":
            out[did] = _dispatch(did, "autopilot", "salon", "anime.completed",
                                 {"title": n.get("title", "?"),
                                  "eps": n.get("eps_total")}, ts)
        elif kind is None:
            out[did] = _dispatch(did, "autopilot", "salon", "anime.premiere",
                                 {"title": n.get("title", "?"),
                                  "promoted": bool(n.get("promoted"))}, ts)
        else:
            log.info("autopilot: unknown notification kind %r dropped", kind)
    return out


def anime_unresolved_to_dispatches(items: list) -> dict:
    out: dict[str, dict] = {}
    for u in items or []:
        ts = naive_iso_to_ms(u.get("detected_at", ""))
        if ts is None:
            continue
        did = f"anime:unresolved:{u.get('bgm_id')}"
        out[did] = _dispatch(did, "autopilot", "salon", "anime.unresolved",
                             {"title": u.get("title", "?")}, ts)
    return out


def anime_grace_to_dispatches(overview: dict) -> dict:
    """grace.expires = first_seen + grace_hours*3600, so first_seen is
    recoverable — a deterministic ts that survives hub restarts."""
    out: dict[str, dict] = {}
    grace_h = float(overview.get("grace_hours") or 0)
    for s in overview.get("shows") or []:
        if s.get("status") != "grace" or not s.get("grace"):
            continue
        expires = float(s["grace"].get("expires") or 0)
        ts = int((expires - grace_h * 3600) * 1000)
        did = f"anime:grace:{s.get('bgm_id')}"
        out[did] = _dispatch(did, "autopilot", "salon", "anime.grace",
                             {"title": s.get("title", "?"),
                              "expires_ms": int(expires * 1000)}, ts)
    return out


AP_EVENT_KINDS = {
    "episode.landed": "anime.landed",
    "show.subscribed": "anime.subscribed",
}


def anime_events_to_dispatches(events: list) -> dict:
    """Autopilot's append-only automation ledger (events.json).

    This replaced a qBittorrent snoop that inferred episodes from torrent
    names: the ledger is written when the file is hardlinked into the library,
    so it means "landed" rather than "queued", it survives the torrent being
    deleted by the dedupe pass, and it is durable across an Atrium restart.

    Autopilot stamps events in epoch SECONDS; dispatches are milliseconds.
    """
    out: dict[str, dict] = {}
    for ev in events or []:
        raw = ev.get("kind")
        kind = AP_EVENT_KINDS.get(raw)
        if kind is None:
            log.info("autopilot: unknown event kind %r dropped", raw)
            continue
        p = ev.get("params") or {}
        if kind == "anime.landed":
            params = {"show": p.get("show", "?"), "cour": p.get("cour", "")}
            # Batch/BD releases carry no episode number; the headline drops the
            # number rather than the message.
            if p.get("ep") is not None:
                params["ep"] = str(p["ep"])
        else:
            params = {"title": p.get("title", "?")}
            if p.get("group"):
                params["group"] = p["group"]
        did = f"ap:{ev.get('seq')}"
        out[did] = _dispatch(did, "autopilot", "salon", kind, params,
                             int(ev.get("ts") or 0) * 1000)
    return out


GS_EVENT_KINDS = {
    "updated": "mods.updated",
    "downloaded": "mods.downloaded",
    "removed": "mods.removed",
    "banned": "mods.banned",
}


def gs_events_to_dispatches(events: list, games: dict,
                            changelog_for=None) -> dict:
    out: dict[str, dict] = {}
    for ev in events or []:
        kind = GS_EVENT_KINDS.get(ev.get("type"))
        if kind is None:
            continue
        ts = int(ev.get("detectedAt") or ev.get("ts") or 0) * 1000
        params = {
            "title": ev.get("title") or f"#{ev.get('modId')}",
            "game": games.get(str(ev.get("appId")), ""),
            "appId": ev.get("appId"),   # kept so the game name can be backfilled
        }
        if kind == "mods.updated" and changelog_for:
            snippet = changelog_for(ev.get("modId"), ev.get("ts"))
            if snippet:
                params["note"] = snippet
        did = f"gs:{ev.get('seq')}"
        out[did] = _dispatch(
            did, "groundstation", "salon", kind, params, ts,
            url=f"{GS_URL}/#/updates?mod={ev.get('modId')}")
    return out


def outreach_progress_to_dispatches(progress: dict, today: str,
                                    fallback_ts: int) -> dict:
    """Aggregate counts only — enforced through clean_outreach_params."""
    out: dict[str, dict] = {}
    if not progress:
        return out
    total = int(progress.get("total") or 0)
    done = int(progress.get("done") or 0)
    if progress.get("running"):
        out["outreach:progress"] = _dispatch(
            "outreach:progress", "outreach", "bureau", "outreach.progress",
            clean_outreach_params({"done": done, "total": total}), now_ms())
    if total > 0 and done >= total:
        fin = progress.get("finishedAt")
        ts = int(float(fin) * 1000) if fin else fallback_ts
        did = f"outreach:queue-ready:{today}"
        out[did] = _dispatch(did, "outreach", "bureau", "outreach.queue_ready",
                             clean_outreach_params({"n": total}), ts)
    if progress.get("error"):
        did = f"outreach:error:{today}"
        out[did] = _dispatch(did, "outreach", "bureau", "outreach.error",
                             {}, now_ms())
    return out


def outreach_invites_dispatch(panel_state: dict, today_local: datetime) -> dict:
    out: dict[str, dict] = {}
    if not panel_state:
        return out
    target = int((panel_state.get("settings") or {}).get("dailyTarget") or 20)
    latest = 0
    n = 0
    for rec in (panel_state.get("state") or {}).values():
        at = rec.get("invitedAt")  # epoch MILLISECONDS (JS Date.now())
        if not at:
            continue
        if datetime.fromtimestamp(at / 1000).date() == today_local.date():
            n += 1
            latest = max(latest, int(at))
    if n > 0:
        did = f"outreach:invites:{today_local.strftime('%Y-%m-%d')}"
        out[did] = _dispatch(did, "outreach", "bureau", "outreach.invites",
                             clean_outreach_params({"n": n, "target": target}),
                             latest)
    return out


def _dispatch(did: str, origin: str, wing: str, kind: str,
              params: dict, ts: int, url: str | None = None) -> dict:
    if url is None:
        url = next(s["url"] for s in SERVICES if s["id"] == origin)
    return {"id": did, "origin": origin, "wing": wing, "kind": kind,
            "params": params, "ts": ts, "url": url}


# --------------------------------------------------------------------------
# Live source state
# --------------------------------------------------------------------------

class Source:
    def __init__(self, sid: str):
        self.id = sid
        self.state = "checking"      # checking | open | dark
        self.latency_ms: int | None = None
        # Two note channels so the 60s tick can't wipe the 5min tick's
        # warnings (they run concurrently in the same gather).
        self.note: str | None = None       # owned by the fast tick
        self.note_slow: str | None = None  # owned by the slow tick
        self.groups: dict[str, dict[str, dict]] = {}
        self.stat: dict = {}

    def dispatches(self) -> list[dict]:
        merged: dict[str, dict] = {}
        for group in self.groups.values():
            merged.update(group)
        return list(merged.values())

    def status(self) -> dict:
        return {"state": self.state, "latency_ms": self.latency_ms,
                "note": self.note_slow or self.note}


SOURCES: dict[str, Source] = {s["id"]: Source(s["id"]) for s in SERVICES}

_cursors: dict = {}
_gs_games: dict[str, str] = {}


def load_cursors() -> None:
    global _cursors
    STATE_DIR.mkdir(exist_ok=True)
    _cursors = read_json_safe(STATE_DIR / "cursors.json") or {}


def save_cursors() -> None:
    atomic_write_json(STATE_DIR / "cursors.json", _cursors)


def gs_changelog_snippet(mod_id, event_ts):
    """Read the local prefetched changelog only — never hit the live
    /api/mods/:id/changelog endpoint (it can trigger a steamcommunity
    scrape)."""
    payload = read_json_optional(GS_DATA_DIR / "changelogs" / f"{mod_id}.json")
    if not payload:
        return None
    for entry in payload.get("entries") or []:
        if entry.get("ts") == event_ts:
            return strip_html(entry.get("html", "")) or None
    return None


# --------------------------------------------------------------------------
# Tick functions (network I/O)
# --------------------------------------------------------------------------

async def _timed_get(client: httpx.AsyncClient, url: str, **kw):
    t0 = time.perf_counter()
    resp = await client.get(url, **kw)
    resp.raise_for_status()
    return resp, int((time.perf_counter() - t0) * 1000)


AP_MAX_PAGES = 10


async def _ap_catchup(client: httpx.AsyncClient, cursor: int) -> tuple[list, bool]:
    """Collect every event with seq > cursor. Returns (events, caught_up).

    Autopilot returns the OLDEST matching events first and `hasMore` means
    NEWER matches remain, so the cursor walks FORWARD — the mirror image of
    the GS feed below, which pages backwards from the newest.

    caught_up is False when the page cap cut the walk short; the caller must
    then park the cursor on what was actually ingested rather than on the
    server's head, or the unread tail is skipped forever.
    """
    events: list = []
    for _ in range(AP_MAX_PAGES):
        resp, _ms = await _timed_get(
            client, f"{AUTOPILOT_URL}/api/events?after_seq={cursor}&limit=200")
        page = resp.json()
        got = page.get("events") or []
        events.extend(got)
        if not got or not page.get("hasMore"):
            return events, True
        cursor = max(int(e.get("seq") or 0) for e in got)
    return events, False


async def _ap_backfill_recent(client: httpx.AsyncClient) -> tuple[list, bool]:
    """The whole ledger, filtered to the recent window (cold start / reset)."""
    events, caught_up = await _ap_catchup(client, 0)
    now = now_ms()
    return [e for e in events
            if now - int(e.get("ts") or 0) * 1000 <= EPISODE_WINDOW_MS], caught_up


def _ap_ingest(events: list) -> None:
    group = SOURCES["autopilot"].groups.setdefault("events", {})
    group.update(anime_events_to_dispatches(events))
    _trim_group(group)


def _ap_advance(events: list, head: int, caught_up: bool) -> None:
    """Park the cursor. On a short walk it may only go as far as was ingested —
    jumping to the server's head would skip the unread tail permanently."""
    if caught_up:
        _cursors["ap_seq"] = head
    else:
        reached = max((int(e.get("seq") or 0) for e in events), default=0)
        _cursors["ap_seq"] = max(_cursors.get("ap_seq") or 0, reached)
        log.warning("autopilot catch-up hit the page cap at seq %s (head %s)",
                    _cursors["ap_seq"], head)
    save_cursors()


async def _ap_events(client: httpx.AsyncClient) -> None:
    """Follow Autopilot's ledger by seq cursor, exactly as GS's feed is followed."""
    src = SOURCES["autopilot"]
    resp, _ = await _timed_get(client, f"{AUTOPILOT_URL}/api/events?limit=1")
    seq = int(resp.json().get("seq") or 0)
    cursor = _cursors.get("ap_seq")
    if cursor is None:
        # Cold start: backfill only the recent window, then set the cursor.
        fetched, caught_up = await _ap_backfill_recent(client)
    elif seq < cursor:
        # events.json was deleted/reset — resync or we stall forever.
        # ap:<seq> ids restart too, so drop pre-reset dispatches.
        log.warning("autopilot seq regressed (%s < %s) — resyncing", seq, cursor)
        src.groups["events"] = {}
        _cursors.pop("ap_seq", None)   # the window filter below is the new floor
        fetched, caught_up = await _ap_backfill_recent(client)
    elif seq > cursor:
        fetched, caught_up = await _ap_catchup(client, cursor)
    else:
        return
    # Ingest before advancing: a throw above leaves the cursor untouched, so the
    # next tick re-requests the same events rather than losing them.
    _ap_ingest(fetched)
    _ap_advance(fetched, seq, caught_up)


def _ap_offline_fallback() -> None:
    """Panel down → read events.json with the same seq cursor.

    Worth doing rather than going quiet: the watch daemon that writes the
    ledger is a separate process from the web UI, so episodes keep landing
    while the panel is down — provided events.json itself is readable. If the
    file is missing, read_json_safe serves its last-good copy, so a ledger
    reset is only noticed once the panel is back and _ap_events sees the head
    seq regress.
    """
    src = SOURCES["autopilot"]
    payload = read_json_safe(AP_DATA_DIR / "events.json")
    if not payload:
        return
    file_seq = int(payload.get("seq") or 0)
    cursor = _cursors.get("ap_seq")
    cold = cursor is None
    if cursor is not None and file_seq < cursor:   # reset while we were away
        src.groups["events"] = {}
        cursor, cold = 0, True
    cursor = cursor or 0
    fresh = [e for e in payload.get("events") or []
             if int(e.get("seq") or 0) > cursor]
    if cold:  # cold start backfills the recent window only
        now = now_ms()
        fresh = [e for e in fresh
                 if now - int(e.get("ts") or 0) * 1000 <= EPISODE_WINDOW_MS]
    if fresh:
        _ap_ingest(fresh)
    if fresh or (cold and file_seq):
        _cursors["ap_seq"] = max(file_seq, cursor)
        save_cursors()


async def tick_autopilot(client: httpx.AsyncClient) -> None:
    src = SOURCES["autopilot"]
    now = now_ms()
    try:
        resp, ms = await _timed_get(client, f"{AUTOPILOT_URL}/api/notifications")
        src.state, src.latency_ms, src.note = "open", ms, None
        src.groups["notif"] = anime_notifications_to_dispatches(
            resp.json().get("notifications") or [], now)
        try:
            resp2, _ = await _timed_get(client, f"{AUTOPILOT_URL}/api/unresolved")
            src.groups["unresolved"] = anime_unresolved_to_dispatches(
                resp2.json().get("unresolved") or [])
        except Exception:
            pass  # keep the previous unresolved group
        await _ap_events(client)
    except Exception as exc:
        src.state = "dark"
        src.latency_ms = None
        src.note = None
        log.debug("autopilot dark: %s", exc)
        _ap_offline_fallback()


async def tick_autopilot_slow(client: httpx.AsyncClient) -> None:
    src = SOURCES["autopilot"]
    try:
        resp, _ = await _timed_get(client, f"{AUTOPILOT_URL}/api/overview",
                                   timeout=15.0)  # cold call can be slow
        overview = resp.json()
        src.groups["grace"] = anime_grace_to_dispatches(overview)
        shows = overview.get("shows") or []
        today = datetime.now().date()
        airing = sum(
            1 for s in shows
            if s.get("airing_at")
            and datetime.fromtimestamp(s["airing_at"]).date() == today)
        src.stat = {"watching": len(shows), "airing": airing}
        sync_ms = local_dt_to_ms(overview.get("last_sync") or "")
        if sync_ms and now_ms() - sync_ms > DAEMON_STALE_S * 1000:
            src.note_slow = "daemon_stale"
        elif overview.get("qb_ok") is False:
            src.note_slow = "qb_down"
        else:
            src.note_slow = None   # healthy again — clear our own channel
    except Exception as exc:
        log.debug("autopilot overview failed: %s", exc)


GS_MAX_PAGES = 10


async def _gs_backfill_recent(client: httpx.AsyncClient) -> list:
    """Newest page only, filtered to the recent window (cold start / reset)."""
    resp, _ = await _timed_get(client, f"{GS_URL}/api/feed?limit=200",
                               headers=GS_HEADERS)
    return [e for e in resp.json().get("events") or []
            if now_ms() - int(e.get("detectedAt") or 0) * 1000
            <= EPISODE_WINDOW_MS]


async def _gs_catchup(client: httpx.AsyncClient, cursor: int) -> list:
    """Collect every event with seq > cursor.

    The GS feed returns the NEWEST `limit` matching events per page and
    `hasMore` means OLDER matches remain — so keep after_seq fixed and page
    BACKWARDS with before_seq (the same scheme GS's own client uses).
    """
    events: list = []
    before = None
    for _ in range(GS_MAX_PAGES):
        url = f"{GS_URL}/api/feed?after_seq={cursor}&limit=200"
        if before is not None:
            url += f"&before_seq={before}"
        resp, _ms = await _timed_get(client, url, headers=GS_HEADERS)
        page = resp.json()
        got = page.get("events") or []
        events.extend(got)
        if not got or not page.get("hasMore"):
            break
        before = min(int(e.get("seq") or 0) for e in got)
    return events


async def tick_groundstation(client: httpx.AsyncClient) -> None:
    src = SOURCES["groundstation"]
    try:
        resp, ms = await _timed_get(client, f"{GS_URL}/api/ping",
                                    headers=GS_HEADERS)
        src.state, src.latency_ms, src.note = "open", ms, None
        seq = int(resp.json().get("seq") or 0)
        cursor = _cursors.get("gs_seq")
        if cursor is None:
            # Cold start: backfill only the recent window, then set cursor.
            await _gs_ingest(client, await _gs_backfill_recent(client))
            _cursors["gs_seq"] = seq
            save_cursors()
        elif seq < cursor:
            # GS data was reset/reinstalled — resync or we stall forever.
            # gs:<seq> ids restart too, so drop pre-reset dispatches.
            log.warning("groundstation seq regressed (%s < %s) — resyncing",
                        seq, cursor)
            src.groups["feed"] = {}
            await _gs_ingest(client, await _gs_backfill_recent(client))
            _cursors["gs_seq"] = seq
            save_cursors()
        elif seq > cursor:
            await _gs_ingest(client, await _gs_catchup(client, cursor))
            _cursors["gs_seq"] = seq
            save_cursors()
    except Exception as exc:
        src.state = "dark"
        src.latency_ms = None
        src.note = None
        log.debug("groundstation dark: %s", exc)
        _gs_offline_fallback()


async def _gs_ingest(client: httpx.AsyncClient, events: list) -> None:
    src = SOURCES["groundstation"]
    unknown = {str(e.get("appId")) for e in events} - set(_gs_games)
    if unknown or not _gs_games:
        await _gs_refresh_state(client)
    group = src.groups.setdefault("feed", {})
    group.update(gs_events_to_dispatches(events, _gs_games,
                                         gs_changelog_snippet))
    _trim_group(group)


async def _gs_refresh_state(client: httpx.AsyncClient) -> None:
    src = SOURCES["groundstation"]
    try:
        resp, _ = await _timed_get(client, f"{GS_URL}/api/state",
                                   headers=GS_HEADERS, timeout=10.0)
        state = resp.json()
        for g in state.get("games") or []:
            _gs_games[str(g.get("appId"))] = g.get("short") or g.get("name") or ""
        src.stat = {
            "mods": sum(int(g.get("modCount") or 0)
                        for g in state.get("games") or []),
            "pending": sum(int(g.get("updatesPending") or 0)
                           for g in state.get("games") or []),
        }
        # Backfill game names on dispatches created while the map was empty
        # (e.g. events ingested through the offline file fallback).
        for d in (src.groups.get("feed") or {}).values():
            if not d["params"].get("game"):
                name = _gs_games.get(str(d["params"].get("appId")))
                if name:
                    d["params"]["game"] = name
    except Exception as exc:
        log.debug("groundstation state failed: %s", exc)


def _gs_offline_fallback() -> None:
    """Server down → read data/events.json with the same seq cursor."""
    src = SOURCES["groundstation"]
    payload = read_json_safe(GS_DATA_DIR / "events.json")
    if not payload:
        return
    cold = _cursors.get("gs_seq") is None
    cursor = _cursors.get("gs_seq") or 0
    fresh = [e for e in payload.get("events") or []
             if int(e.get("seq") or 0) > cursor]
    if cold:  # cold start backfills the recent window only
        fresh = [e for e in fresh
                 if now_ms() - int(e.get("detectedAt") or 0) * 1000
                 <= EPISODE_WINDOW_MS]
    if fresh:
        group = src.groups.setdefault("feed", {})
        group.update(gs_events_to_dispatches(fresh, _gs_games,
                                             gs_changelog_snippet))
        _trim_group(group)
    file_seq = int(payload.get("seq") or 0)
    if fresh or (cold and file_seq):
        _cursors["gs_seq"] = max(file_seq, cursor)
        save_cursors()


def _trim_group(group: dict, cap: int = 100) -> None:
    if len(group) > cap:
        for did in sorted(group, key=lambda d: group[d]["ts"])[: len(group) - cap]:
            del group[did]


async def tick_outreach(client: httpx.AsyncClient) -> None:
    src = SOURCES["outreach"]
    today = datetime.now()
    try:
        _, ms = await _timed_get(client, f"{OUTREACH_URL}/api/ping")
        src.state, src.latency_ms, src.note = "open", ms, None
        resp, _ = await _timed_get(client, f"{OUTREACH_URL}/api/progress")
        progress = resp.json()
    except Exception as exc:
        src.state = "dark"
        src.latency_ms = None
        log.debug("outreach dark: %s", exc)
        progress = _outreach_offline_progress()
        src.note = "fallback" if progress else None

    drafts_path = OUTREACH_DIR / "data" / "ai_drafts.json"
    try:
        fallback_ts = int(drafts_path.stat().st_mtime * 1000)
    except OSError:
        fallback_ts = now_ms()
    if progress:
        old = src.groups.get("progress") or {}
        new = outreach_progress_to_dispatches(
            progress, today.strftime("%Y-%m-%d"), fallback_ts)
        # A persisting error keeps its first-seen ts — otherwise it would
        # pin itself to the feed top and never age past the watermark.
        for did, d in new.items():
            if did in old and d["kind"] == "outreach.error":
                d["ts"] = old[did]["ts"]
        src.groups["progress"] = new

    panel_state = read_json_safe(OUTREACH_DIR / "data" / "panel_state.json")
    src.groups["invites"] = outreach_invites_dispatch(panel_state or {}, today)

    invited = 0
    target = 20
    if panel_state:
        target = int((panel_state.get("settings") or {}).get("dailyTarget") or 20)
        for rec in (panel_state.get("state") or {}).values():
            at = rec.get("invitedAt")
            if at and datetime.fromtimestamp(at / 1000).date() == today.date():
                invited += 1
    stat = {"invited": invited, "target": target}
    if progress:
        stat["ready"] = int(progress.get("done") or 0)
        stat["total"] = int(progress.get("total") or 0)
    src.stat = clean_outreach_params(stat)


def _outreach_offline_progress() -> dict | None:
    drafts = read_json_safe(OUTREACH_DIR / "data" / "ai_drafts.json")
    if drafts is None:
        return None
    n = len(drafts)
    return {"running": False, "total": n, "done": n, "finishedAt": None,
            "error": None}


# --------------------------------------------------------------------------
# Background refresher
# --------------------------------------------------------------------------

async def tick_pressroom(client: httpx.AsyncClient) -> None:
    """The press room publishes once a night, so there is nothing to stream
    into the Ledger — only a lamp and a count of what is on today's front page.

    Staleness is reported by the room itself rather than inferred from the
    lamp: the server answers fine at 09:00 whether or not the 05:00 batch
    actually ran, so a lit gate says nothing about whether the paper is today's.
    """
    src = SOURCES["pressroom"]
    try:
        resp, ms = await _timed_get(client, f"{PRESSROOM_URL}/api/status")
        src.state, src.latency_ms, src.note = "open", ms, None
        data = resp.json()
        counts = data.get("counts") or {}
        src.stat = {
            "stories": int(counts.get("stories") or 0),
            "sections": int(counts.get("sections") or 0),
            "date": data.get("date"),
        }
        src.note_slow = "digest_stale" if data.get("stale") else None
    except Exception as exc:
        src.state = "dark"
        src.latency_ms = None
        src.note = None
        log.debug("pressroom dark: %s", exc)


async def refresher() -> None:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_S) as client:
        tick_no = 0
        while True:
            fast = [tick_autopilot(client), tick_groundstation(client),
                    tick_outreach(client), tick_pressroom(client)]
            if tick_no % SLOW_EVERY == 0:
                fast.append(tick_autopilot_slow(client))
                fast.append(_gs_refresh_state(client))
            results = await asyncio.gather(*fast, return_exceptions=True)
            for r in results:
                if isinstance(r, Exception):
                    log.warning("tick error: %s", r)
            tick_no += 1
            await asyncio.sleep(FAST_TICK_S)


# --------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")
    load_cursors()
    task = asyncio.create_task(refresher())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task   # let the httpx client close cleanly


app = FastAPI(docs_url=None, redoc_url=None, lifespan=lifespan)
# Cheap DNS-rebinding defense for an unauthenticated localhost service.
app.add_middleware(TrustedHostMiddleware,
                   allowed_hosts=["127.0.0.1", "localhost"])


@app.middleware("http")
async def cache_headers(request: Request, call_next):
    try:
        resp = await call_next(request)
    except Exception:
        # Starlette StaticFiles 500s on malformed Windows-flavored paths
        # (drive letters etc.) — surface those as plain 404s.
        if request.url.path.startswith("/static/"):
            return PlainTextResponse("Not Found", status_code=404)
        raise
    if request.url.path.startswith("/static/fonts/"):
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/services")
async def api_services():
    return JSONResponse({"services": sorted(SERVICES, key=lambda s: s["order"])})


@app.get("/api/status")
async def api_status():
    return JSONResponse({
        "services": {sid: src.status() for sid, src in SOURCES.items()},
        "generated": now_ms(),
    })


@app.get("/api/feed")
async def api_feed():
    now = now_ms()
    merged: list[dict] = []
    for src in SOURCES.values():
        merged.extend(d for d in src.dispatches()
                      if now - d["ts"] <= FEED_WINDOW_MS)
    merged.sort(key=lambda d: d["ts"], reverse=True)
    return JSONResponse({"dispatches": merged[:FEED_CAP], "generated": now})


@app.get("/api/stats")
async def api_stats():
    return JSONResponse({"stats": {sid: src.stat for sid, src in SOURCES.items()}})


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
