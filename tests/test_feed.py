"""Contract tests for the Atrium feed adapters. Run: python tests/test_feed.py"""

import asyncio
import json
import re
import sys
import traceback
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import server  # noqa: E402


def test_outreach_privacy():
    """A real person's name in the progress payload must never reach the
    serialized feed — the allowlist strips everything but counts."""
    progress = {"running": True, "total": 20, "done": 13,
                "current": "Jane Realperson", "finishedAt": None,
                "error": None}
    out = server.outreach_progress_to_dispatches(progress, "2026-07-30", 0)
    blob = json.dumps(out)
    assert "Jane" not in blob and "current" not in blob, blob
    assert out["outreach:progress"]["params"] == {"done": 13, "total": 20}


def test_outreach_queue_ready_and_error():
    progress = {"running": False, "total": 20, "done": 20,
                "current": "", "finishedAt": 1785397487.7, "error": "boom"}
    out = server.outreach_progress_to_dispatches(progress, "2026-07-30", 0)
    ready = out["outreach:queue-ready:2026-07-30"]
    assert ready["params"] == {"n": 20}
    assert ready["ts"] == int(1785397487.7 * 1000)
    assert out["outreach:error:2026-07-30"]["params"] == {}
    assert "outreach:progress" not in out  # not running -> no progress item


def test_anime_kind_classification():
    """completed -> completed; ABSENT kind -> premiere; unknown kind ->
    dropped (never defaulted into the premiere branch)."""
    now = server.now_ms()
    stamp = datetime.now().isoformat(timespec="seconds")
    items = [
        {"bgm_id": 1, "title": "A", "detected_at": stamp, "read": False,
         "kind": "completed", "eps_total": 12},
        {"bgm_id": 2, "title": "B", "detected_at": stamp, "read": False,
         "promoted": True},
        {"bgm_id": 3, "title": "C", "detected_at": stamp, "read": False,
         "kind": "someday-new-kind"},
        {"bgm_id": 4, "title": "D", "detected_at": stamp, "read": True},
    ]
    out = server.anime_notifications_to_dispatches(items, now)
    kinds = {d["params"]["title"]: d["kind"] for d in out.values()}
    assert kinds == {"A": "anime.completed", "B": "anime.premiere"}
    assert out[f"anime:notif:2:{stamp}"]["params"]["promoted"] is True


def test_naive_iso_is_machine_local():
    """The naive detected_at must parse as machine-local time (UTC+8 here);
    routing it through UTC would shift everything by 8 hours."""
    stamp = "2026-07-04T12:33:11"
    ms = server.naive_iso_to_ms(stamp)
    assert ms == int(datetime(2026, 7, 4, 12, 33, 11).timestamp() * 1000)
    assert server.naive_iso_to_ms("garbage") is None


def test_gs_ids_and_ts_units():
    events = [{"seq": 41, "modId": "123", "appId": 394360, "type": "updated",
               "ts": 1785300000, "detectedAt": 1785300100, "title": "Mod X"}]
    out = server.gs_events_to_dispatches(events, {"394360": "HOI4"})
    d = out["gs:41"]
    assert d["ts"] == 1785300100 * 1000          # detectedAt, epoch ms
    assert d["params"] == {"title": "Mod X", "game": "HOI4", "appId": 394360}
    assert d["url"].endswith("#/updates?mod=123")


def test_qb_filter_and_window():
    now = server.now_ms()
    torrents = [
        {"hash": "aa", "name": "[ANi] Show - 07 [1080p]",
         "save_path": r"X:\Bangumi\2026.07\Show", "added_on": now // 1000 - 60},
        {"hash": "bb", "name": "other",
         "save_path": r"X:\Downloads\other", "added_on": now // 1000 - 60},
        {"hash": "cc", "name": "[ANi] Old - 01",
         "save_path": r"X:\Bangumi\2026.04\Old",
         "added_on": now // 1000 - 3 * 24 * 3600},
        # Sibling directory sharing the bare prefix must NOT match.
        {"hash": "dd", "name": "[ANi] Mirror - 07",
         "save_path": r"X:\BangumiJF\2026.07\Show", "added_on": now // 1000 - 60},
    ]
    out = server.qb_torrents_to_dispatches(torrents, now)
    assert set(out) == {"qb:aa"}
    assert out["qb:aa"]["params"] == {"show": "Show", "ep": "07"}


def test_invites_local_day():
    # Fixture pinned to noon so a run near local midnight can't flake the
    # calendar-day comparison.
    noon = datetime.now().replace(hour=12, minute=0, second=0, microsecond=0)
    noon_ms = int(noon.timestamp() * 1000)
    panel = {"settings": {"dailyTarget": 15},
             "state": {"a": {"st": "invited", "invitedAt": noon_ms},
                       "b": {"st": "invited",
                             "invitedAt": noon_ms - 3 * 24 * 3600 * 1000},
                       "c": {"st": "todo"}}}
    out = server.outreach_invites_dispatch(panel, noon)
    (d,) = out.values()
    assert d["params"] == {"n": 1, "target": 15}
    assert d["ts"] == noon_ms


class _FakeResp:
    def __init__(self, payload):
        self._p = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._p


class _FakeGsFeed:
    """Mimics GS /api/feed semantics: NEWEST `limit` matching events per
    page; hasMore means OLDER matches remain."""

    def __init__(self, top_seq, limit=200):
        self.pool = list(range(1, top_seq + 1))
        self.limit = limit
        self.calls = 0

    async def get(self, url, **kw):
        self.calls += 1
        after = int((re.search(r"after_seq=(\d+)", url) or [0, 0])[1])
        m = re.search(r"before_seq=(\d+)", url)
        before = int(m[1]) if m else None
        match = [s for s in self.pool
                 if s > after and (before is None or s < before)]
        newest_first = sorted(match, reverse=True)
        page = newest_first[: self.limit]
        events = [{"seq": s, "modId": str(s), "appId": 1, "type": "updated",
                   "ts": 1785300000, "detectedAt": 1785300000,
                   "title": f"Mod {s}"} for s in page]
        return _FakeResp({"events": events,
                          "hasMore": len(newest_first) > self.limit,
                          "seq": self.pool[-1]})


def test_gs_catchup_pages_backwards_newest_first():
    """>limit backlog must be fully recovered despite newest-first pages."""
    fake = _FakeGsFeed(top_seq=450)
    events = asyncio.run(server._gs_catchup(fake, 50))
    got = {e["seq"] for e in events}
    assert got == set(range(51, 451)), (min(got), max(got), len(got))
    assert fake.calls == 2  # 400 events at limit=200 → exactly two pages


def test_gs_catchup_no_backlog():
    fake = _FakeGsFeed(top_seq=30)
    events = asyncio.run(server._gs_catchup(fake, 30))
    assert events == []


def test_grace_ts_deterministic():
    overview = {"grace_hours": 0.5, "shows": [
        {"bgm_id": 9, "title": "G", "status": "grace",
         "grace": {"expires": 1785400000}}]}
    out = server.anime_grace_to_dispatches(overview)
    d = out["anime:grace:9"]
    assert d["ts"] == int((1785400000 - 1800) * 1000)


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  ok  {name}")
            except Exception as exc:   # any exception is a FAIL, not an abort
                failures += 1
                print(f"FAIL  {name}: {exc!r}")
                traceback.print_exc()
    sys.exit(1 if failures else 0)
