"""Contract tests for the Atrium feed adapters. Run: python tests/test_feed.py"""

import asyncio
import json
import re
import sys
import traceback
from contextlib import contextmanager
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


def test_gs_downloaded_is_muted_but_the_bad_news_still_lands():
    """"downloaded" retells "updated" and ignores the cared flag, so the hall
    stays quiet about it. The two warnings must survive that muting."""
    def ev(seq, etype):
        return {"seq": seq, "modId": "9", "appId": 394360, "type": etype,
                "ts": 1785300000, "detectedAt": 1785300100, "title": "Mod"}
    out = server.gs_events_to_dispatches(
        [ev(1, "updated"), ev(2, "downloaded"), ev(3, "removed"),
         ev(4, "banned")], {"394360": "HOI4"})
    assert sorted(d["kind"] for d in out.values()) == [
        "mods.banned", "mods.removed", "mods.updated"]
    assert "gs:2" not in out


def test_gs_unknown_kind_is_dropped_not_muted():
    """A muted kind is a decision; an unknown kind is news. Keep them apart so
    a future Ground Station event type cannot vanish silently."""
    assert "downloaded" not in server.GS_EVENT_KINDS
    assert not server.GS_MUTED_KINDS & set(server.GS_EVENT_KINDS)
    out = server.gs_events_to_dispatches(
        [{"seq": 5, "modId": "9", "appId": 394360, "type": "someday-new-kind",
          "ts": 1785300000, "detectedAt": 1785300100}], {})
    assert out == {}


def test_every_relayed_kind_has_a_headline_in_both_languages():
    """server.py and app.js drift apart easily — a dispatch kind with no i18n
    key renders as a blank detail line, which reads as a bug, not a mute."""
    app_js = (Path(__file__).resolve().parent.parent
              / "static" / "js" / "app.js").read_text(encoding="utf-8")
    for kind in sorted(set(server.GS_EVENT_KINDS.values())):
        assert f"case '{kind}':" in app_js, kind
        assert app_js.count(f"'k.{kind}':") == 2, kind   # en + zh
    for muted in sorted(server.GS_MUTED_KINDS):
        assert f"k.mods.{muted}" not in app_js, muted


def test_ap_events_ids_and_ts_units():
    """Autopilot stamps epoch SECONDS; every dispatch carries milliseconds."""
    events = [
        {"seq": 7, "kind": "episode.landed", "ts": 1785300000,
         "params": {"show": "Show", "cour": "2026.07", "ep": 4,
                    "file": "x.mkv", "season": "Season 01"}},
        {"seq": 8, "kind": "show.subscribed", "ts": 1785300100,
         "params": {"title": "New", "bgm_id": 1, "group": "ANi"}},
    ]
    out = server.anime_events_to_dispatches(events)
    landed = out["ap:7"]
    assert landed["ts"] == 1785300000 * 1000
    assert landed["kind"] == "anime.landed"
    assert landed["params"] == {"show": "Show", "cour": "2026.07", "ep": "4"}
    assert out["ap:8"]["params"] == {"title": "New", "group": "ANi"}


def test_ap_events_missing_optionals_and_unknown_kind():
    """A batch release has no episode number and must still be announced;
    an unknown kind is dropped, never defaulted into a known branch."""
    events = [
        {"seq": 1, "kind": "episode.landed", "ts": 1785300000,
         "params": {"show": "Movie", "cour": "2026.07", "ep": None}},
        {"seq": 2, "kind": "show.subscribed", "ts": 1785300000,
         "params": {"title": "N", "group": None}},
        {"seq": 3, "kind": "someday.new.kind", "ts": 1785300000, "params": {}},
    ]
    out = server.anime_events_to_dispatches(events)
    assert set(out) == {"ap:1", "ap:2"}
    assert "ep" not in out["ap:1"]["params"]
    assert "group" not in out["ap:2"]["params"]


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


class _FakeApFeed:
    """Mimics Autopilot /api/events: OLDEST `limit` matching events per page;
    hasMore means NEWER matches remain (the mirror image of the GS feed)."""

    def __init__(self, top_seq, limit=200):
        self.pool = list(range(1, top_seq + 1))
        self.limit = limit
        self.calls = 0

    async def get(self, url, **kw):
        self.calls += 1
        after = int((re.search(r"after_seq=(\d+)", url) or [0, 0])[1])
        limit = int((re.search(r"limit=(\d+)", url) or [0, self.limit])[1])
        match = [s for s in self.pool if s > after]
        page = match[:limit]
        now_s = server.now_ms() // 1000
        events = [{"seq": s, "kind": "episode.landed", "ts": now_s - 60,
                   "params": {"show": f"Show {s}", "cour": "2026.07", "ep": s}}
                  for s in page]
        return _FakeResp({"events": events, "hasMore": len(match) > limit,
                          "seq": self.pool[-1] if self.pool else 0})


def test_ap_catchup_pages_forward_oldest_first():
    """>limit backlog must be fully recovered walking the cursor forward."""
    fake = _FakeApFeed(top_seq=450)
    events, caught_up = asyncio.run(server._ap_catchup(fake, 50))
    got = {e["seq"] for e in events}
    assert got == set(range(51, 451)), (min(got), max(got), len(got))
    assert fake.calls == 2  # 400 events at limit=200 → exactly two pages
    assert caught_up is True


def test_ap_catchup_no_backlog():
    fake = _FakeApFeed(top_seq=30)
    assert asyncio.run(server._ap_catchup(fake, 30)) == ([], True)


def test_ap_catchup_reports_a_short_walk():
    """Page cap hit → caught_up False, so the caller must not jump the cursor
    to the server's head and skip the tail it never read."""
    fake = _FakeApFeed(top_seq=10_000)
    events, caught_up = asyncio.run(server._ap_catchup(fake, 0))
    assert caught_up is False
    assert len(events) == server.AP_MAX_PAGES * 200


def test_ap_advance_parks_on_what_was_ingested_after_a_short_walk():
    saved = dict(server._cursors)
    try:
        server._cursors.clear()
        events = [{"seq": n} for n in range(1, 51)]
        real_save, server.save_cursors = server.save_cursors, lambda: None
        try:
            server._ap_advance(events, head=9000, caught_up=False)
            assert server._cursors["ap_seq"] == 50, server._cursors
            server._ap_advance(events, head=9000, caught_up=True)
            assert server._cursors["ap_seq"] == 9000
        finally:
            server.save_cursors = real_save
    finally:
        server._cursors.clear()
        server._cursors.update(saved)


def test_ap_backfill_drops_events_outside_the_window():
    """Cold start must not dump a month of history into the ledger."""
    fake = _FakeApFeed(top_seq=3)
    old_s = server.now_ms() // 1000 - 30 * 24 * 3600

    async def get(url, **kw):
        resp = await _FakeApFeed.get(fake, url, **kw)
        resp._p["events"][0]["ts"] = old_s        # age out exactly one
        return resp

    fake.get = get
    events, caught_up = asyncio.run(server._ap_backfill_recent(fake))
    assert [e["seq"] for e in events] == [2, 3]
    assert caught_up is True


@contextmanager
def _offline_ledger(payload, cursor):
    """Run _ap_offline_fallback against a fixture: no disk read, no disk write,
    and the module's live source/cursor state restored afterwards."""
    src = server.SOURCES["autopilot"]
    saved_groups = src.groups
    saved_cursors = dict(server._cursors)
    real_read, real_save = server.read_json_safe, server.save_cursors
    path = server.AP_DATA_DIR / "events.json"
    src.groups = {}
    server._cursors.clear()
    if cursor is not None:
        server._cursors["ap_seq"] = cursor
    server.read_json_safe = lambda p: payload if p == path else real_read(p)
    server.save_cursors = lambda: None
    try:
        yield src
    finally:
        server.read_json_safe, server.save_cursors = real_read, real_save
        src.groups = saved_groups
        server._cursors.clear()
        server._cursors.update(saved_cursors)


def _ledger(seq, seqs):
    now_s = server.now_ms() // 1000
    return {"version": 1, "seq": seq, "events": [
        {"seq": n, "kind": "episode.landed", "ts": now_s - 60,
         "params": {"show": f"S{n}", "cour": "2026.07", "ep": n}} for n in seqs]}


def test_ap_offline_fallback_only_takes_events_past_the_cursor():
    with _offline_ledger(_ledger(3, [1, 2, 3]), cursor=1) as src:
        server._ap_offline_fallback()
        assert set(src.groups["events"]) == {"ap:2", "ap:3"}
        assert server._cursors["ap_seq"] == 3


def test_ap_offline_fallback_resyncs_after_a_reset():
    """events.json deleted and rebuilt → file seq < cursor. Keeping the old
    cursor would stall the feed forever, because ap:<seq> ids restart too."""
    with _offline_ledger(_ledger(2, [1, 2]), cursor=99) as src:
        src.groups["events"] = {"ap:99": {"id": "ap:99", "ts": 0}}
        server._ap_offline_fallback()
        assert set(src.groups["events"]) == {"ap:1", "ap:2"}, src.groups["events"]
        assert server._cursors["ap_seq"] == 2


def test_ap_offline_fallback_cold_start_honours_the_window():
    payload = _ledger(2, [1, 2])
    payload["events"][0]["ts"] = server.now_ms() // 1000 - 30 * 24 * 3600
    with _offline_ledger(payload, cursor=None) as src:
        server._ap_offline_fallback()
        assert set(src.groups["events"]) == {"ap:2"}
        assert server._cursors["ap_seq"] == 2


def test_ap_offline_fallback_survives_a_missing_file():
    with _offline_ledger(None, cursor=5) as src:
        server._ap_offline_fallback()
        assert src.groups == {}
        assert server._cursors["ap_seq"] == 5


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
