"""Contract tests for the CLAUDE register. Run: python tests/test_claude_usage.py

The register reads an endpoint nobody has published, with a login the hall
does not own. Everything below guards those two facts: both shapes the reply
has been seen in are read, a missing field is a dash rather than an error,
the login is only ever read and its token never reaches the page, and a
board polling every minute is not Anthropic's request rate.
"""

import asyncio
import json
import sys
import tempfile
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import claude_usage  # noqa: E402

TOKEN = "sk-ant-oat01-never-on-the-wall"


def _reset():
    claude_usage._usage = None
    claude_usage._usage_at = 0.0
    claude_usage._usage_wall = 0
    claude_usage._state = "signed_out"
    claude_usage._asked_at = -1e9
    claude_usage._ttl = 0.0
    claude_usage._asked_for = None


def _login(token=TOKEN, expires_ms=None, sub="max", tier="default_claude_max_20x"):
    """A throwaway credentials file, off the repo and off the real login."""
    d = Path(tempfile.mkdtemp(prefix="atrium-claude-"))
    path = d / ".credentials.json"
    oauth = {"accessToken": token, "refreshToken": "rt-untouched",
             "expiresAt": expires_ms if expires_ms is not None else int(time.time() * 1000) + 3_600_000,
             "subscriptionType": sub, "rateLimitTier": tier}
    path.write_text(json.dumps({"claudeAiOauth": oauth}), encoding="utf-8")
    return path


def _iso(s):
    return datetime.fromtimestamp(time.time() + s, timezone.utc).isoformat()


LIMITS = {
    "five_hour": None, "seven_day": None,
    "limits": [
        {"kind": "session", "percent": 37.0, "resets_at": _iso(7800)},
        {"kind": "weekly_all", "percent": 62.4, "resets_at": _iso(3 * 86400)},
        {"kind": "weekly_scoped", "percent": 18.0, "resets_at": _iso(86400),
         "scope": {"model": {"display_name": "Opus"}}},
    ],
    "extra_usage": {"is_enabled": True, "monthly_limit": 5000,
                    "used_credits": 1240.0, "utilization": None},
}

FLAT = {
    "five_hour": {"utilization": 6.0, "resets_at": "2026-10-15T04:59:59.943648+00:00"},
    "seven_day": {"utilization": 35.0, "resets_at": "2026-10-19T03:59:59Z"},
    "seven_day_opus": {"utilization": 0.0, "resets_at": None},
    "seven_day_sonnet": None,
    "extra_usage": {"is_enabled": False, "monthly_limit": None,
                    "used_credits": None, "utilization": None},
}


def test_reads_the_limits_list():
    out = claude_usage.shape(LIMITS)
    assert out["session"]["pct"] == 37.0
    assert out["week"]["pct"] == 62.4
    assert isinstance(out["session"]["resets_at"], int)
    assert out["scoped"] == [dict(pct=18.0, resets_at=out["scoped"][0]["resets_at"], name="Opus")]


def test_reads_the_older_flat_keys():
    """The shape changed once already; a reply in the old one still reads."""
    out = claude_usage.shape(FLAT)
    five = datetime(2026, 10, 15, 4, 59, 59, 943648, tzinfo=timezone.utc)
    seven = datetime(2026, 10, 19, 3, 59, 59, tzinfo=timezone.utc)
    assert out["session"] == {"pct": 6.0, "resets_at": int(five.timestamp() * 1000)}
    assert out["week"]["pct"] == 35.0
    # A trailing Z is read as UTC, not refused.
    assert out["week"]["resets_at"] == int(seven.timestamp() * 1000)
    assert [s["name"] for s in out["scoped"]] == ["Opus"]


def test_credit_is_in_whole_units_and_reads_its_own_share():
    """The wire carries cents. A null utilization is worked out, not a 0%."""
    c = claude_usage.shape(LIMITS)["credit"]
    assert c == {"enabled": True, "used": 12.4, "limit": 50.0, "pct": 24.8, "currency": "USD"}
    off = claude_usage.shape(FLAT)["credit"]
    assert off["enabled"] is False and off["used"] is None and off["pct"] is None


def test_a_reply_missing_everything_is_dashes_not_an_error():
    for doc in ({}, None, [], {"limits": "nonsense", "five_hour": {"utilization": "x"}},
                {"limits": [None, {"kind": "session"}]}):
        out = claude_usage.shape(doc)
        assert out == {"session": None, "week": None, "scoped": [], "credit": None}, doc


def test_the_plan_is_engraved_from_the_login():
    assert claude_usage.plan_label("max", "default_claude_max_20x") == "MAX 20×"
    assert claude_usage.plan_label("max", "default_claude_max_5x") == "MAX 5×"
    assert claude_usage.plan_label("pro", "default_claude_ai") == "PRO"
    assert claude_usage.plan_label(None, "default_claude_max_20x") is None


def test_a_missing_or_broken_login_is_no_login():
    d = Path(tempfile.mkdtemp(prefix="atrium-claude-"))
    assert claude_usage.read_login(d / ".credentials.json") is None
    (d / ".credentials.json").write_text("{half a file", encoding="utf-8")
    assert claude_usage.read_login(d / ".credentials.json") is None
    (d / ".credentials.json").write_text('{"claudeAiOauth": {}}', encoding="utf-8")
    assert claude_usage.read_login(d / ".credentials.json") is None


class _Fetch:
    """Stands in for fetch_usage: one call per ask, recorded."""

    def __init__(self, state="live", doc=LIMITS):
        self.calls, self.tokens, self.state, self.doc = 0, [], state, doc

    async def __call__(self, token):
        self.calls += 1
        self.tokens.append(token)
        if self.state != "live":
            return self.state, None
        return "live", claude_usage.shape(self.doc)


def _run(path, fetch):
    real = claude_usage.fetch_usage
    claude_usage.fetch_usage = fetch
    try:
        return asyncio.run(claude_usage.snapshot(path))
    finally:
        claude_usage.fetch_usage = real


def test_the_token_never_reaches_the_page():
    _reset()
    fetch = _Fetch()
    out = _run(_login(), fetch)
    assert fetch.tokens == [TOKEN]
    assert out["state"] == "live" and out["plan"] == "MAX 20×"
    assert TOKEN not in json.dumps(out)
    assert "rt-untouched" not in json.dumps(out)


def test_the_boards_poll_is_not_anthropics_request_rate():
    """Two tabs, a minute's beat and every resize all ask the hub; the hub
    asks Anthropic once per TTL."""
    _reset()
    fetch = _Fetch()
    path = _login()
    for _ in range(4):
        _run(path, fetch)
    assert fetch.calls == 1, fetch.calls


def test_a_renewed_login_is_asked_with_at_once():
    """Claude Code renewing its token is the board's way back from LAPSED;
    it must not wait out a TTL that belongs to the old token."""
    _reset()
    fetch = _Fetch()
    _run(_login(token="old"), fetch)
    _run(_login(token="new"), fetch)
    assert fetch.tokens == ["old", "new"]


def test_an_expired_login_is_not_used_and_keeps_the_last_reading():
    """The hall never renews the login (that is Claude Code's, and a second
    renewer can sign it out), so an expired token is a state, not a call."""
    _reset()
    fetch = _Fetch()
    _run(_login(), fetch)
    out = _run(_login(token="stale", expires_ms=int(time.time() * 1000) - 1000), fetch)
    assert fetch.calls == 1
    assert out["state"] == "lapsed"
    assert out["usage"]["session"]["pct"] == 37.0
    assert out["read_at"] and out["age_s"] is not None


def test_a_refused_token_keeps_the_last_reading():
    _reset()
    path = _login()
    _run(path, _Fetch())
    out = _run(_login(token="refused"), _Fetch(state="lapsed"))
    assert out["state"] == "lapsed"
    assert out["usage"]["week"]["pct"] == 62.4


def test_signing_out_takes_the_reading_down():
    _reset()
    _run(_login(), _Fetch())
    gone = Path(tempfile.mkdtemp(prefix="atrium-claude-")) / ".credentials.json"
    out = _run(gone, _Fetch())
    assert out == dict(out, state="signed_out", plan=None, usage=None, read_at=None)


class _Resp:
    def __init__(self, status, payload=None):
        self.status_code, self._payload = status, payload

    def json(self):
        if self._payload is None:
            raise ValueError("not json")
        return self._payload


def _client(resp=None, boom=None):
    seen = {}

    class Client:
        def __init__(self, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, headers=None):
            seen.update(url=url, headers=headers)
            if boom:
                raise boom
            return resp

    class Httpx:
        AsyncClient = Client

    return Httpx, seen


def test_the_reply_is_read_by_its_status():
    real = claude_usage.httpx
    try:
        for resp, boom, want in ((_Resp(200, LIMITS), None, "live"),
                                 (_Resp(401), None, "lapsed"),
                                 (_Resp(403), None, "lapsed"),
                                 (_Resp(429), None, "unreachable"),
                                 (_Resp(200), None, "unreachable"),
                                 (None, OSError("offline"), "unreachable")):
            claude_usage.httpx, seen = _client(resp, boom)
            state, reading = asyncio.run(claude_usage.fetch_usage(TOKEN))
            assert state == want, (resp and resp.status_code, state)
            assert (reading is not None) == (want == "live")
            assert seen["url"] == claude_usage.ENDPOINT
            assert seen["headers"]["Authorization"] == "Bearer " + TOKEN
            assert seen["headers"]["anthropic-beta"] == claude_usage.BETA
    finally:
        claude_usage.httpx = real


def _app_js():
    return (Path(__file__).resolve().parent.parent
            / "static" / "js" / "app.js").read_text(encoding="utf-8")


def test_every_register_string_is_in_both_languages():
    js = _app_js()
    keys = ["clSession", "clWeek", "clCredit", "clSessionLong", "clWeekLong",
            "clCreditLong", "clUsed", "clResets", "clReset", "clResetSaid",
            "clOff", "clCreditOff", "clOfLimit", "clSpent", "clAsOf",
            "clLapsed", "clSignedOut", "clNoReply", "clHintLapsed",
            "clHintSignedOut", "clHintNoReply", "ariaClaude"]
    for key in keys:
        assert js.count(key + ":") == 2, key


def test_the_register_only_polls_while_it_is_on_screen():
    """A folded case, a narrow window or a register set aside on a short
    wall must not keep the hub calling Anthropic on the owner's login."""
    js = _app_js()
    assert "function claudeVisible()" in js
    assert "if (!claudeVisible()) return Promise.resolve();" in js
    html = (Path(__file__).resolve().parent.parent
            / "static" / "index.html").read_text(encoding="utf-8")
    for node in ("cl-reg", "cl-plan"):
        assert 'id="%s"' % node in html, node
        assert "'#%s'" % node in js, node


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
