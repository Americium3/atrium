"""Contract tests for the east board's almanac. Run: python tests/test_almanac.py

The board is built so its two halves fail independently: the sun and the moon
are arithmetic the browser runs on a pair of coordinates, and the weather is a
call to somebody else's service. Everything below guards that seam — the place
has to survive a broken override file, the forecast has to survive an outage,
and neither may turn the board's poll cadence into the service's request rate.
"""

import asyncio
import json
import sys
import tempfile
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import almanac  # noqa: E402


def _reset():
    almanac._weather = None
    almanac._weather_at = 0.0
    almanac._weather_ttl = 0.0
    almanac._weather_for = None


def _tmpdir(name):
    """A throwaway state dir. Off the repo on purpose — a test that writes
    into the tree leaves an override file behind that moves the real hall."""
    return Path(tempfile.mkdtemp(prefix="atrium-alm-" + name + "-"))


def test_place_falls_back_when_there_is_no_override():
    where = almanac.place(_tmpdir("empty"))
    assert where["name"] == "Pittsburgh"
    assert round(where["lat"], 4) == 40.4406


def test_a_broken_override_is_not_an_error_state():
    """A half-written or nonsense file must leave the hall standing where it
    was. A lobby board has nowhere to report a parse error to."""
    for body in ('{"lat": 12', '[]', '{"lat": 999, "lon": 0}', '{"lat": "x", "lon": "y"}'):
        d = _tmpdir("broken")
        (d / "almanac.json").write_text(body, encoding="utf-8")
        assert almanac.place(d)["name"] == "Pittsburgh", body


def test_an_override_moves_the_hall():
    d = _tmpdir("moved")
    (d / "almanac.json").write_text(json.dumps({
        "name": "Hangzhou", "name_zh": "杭州", "lat": 30.2936, "lon": 120.1614,
        "timezone": "Asia/Shanghai",
    }), encoding="utf-8")
    where = almanac.place(d)
    assert where["name"] == "Hangzhou" and where["timezone"] == "Asia/Shanghai"
    assert (where["lat"], where["lon"]) == (30.2936, 120.1614)


class _Resp:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _Client:
    """Stands in for httpx.AsyncClient — one GET, recorded."""

    calls = 0
    payload = {}
    boom = None

    def __init__(self, **kw):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url, params=None):
        _Client.calls += 1
        if _Client.boom:
            raise _Client.boom
        return _Resp(_Client.payload)


class _Httpx:
    AsyncClient = _Client


def _stub(monkeypatched_payload, boom=None):
    _Client.calls = 0
    _Client.payload = monkeypatched_payload
    _Client.boom = boom
    almanac.httpx = _Httpx


FORECAST = {
    "daily": {
        "weather_code": [95, 0], "temperature_2m_max": [29.9, 1],
        "temperature_2m_min": [14.1, 0], "precipitation_probability_max": [40, 0],
        "wind_speed_10m_max": [18.4, 0],
        "sunrise": ["2026-08-28T06:45"], "sunset": ["2026-08-28T20:01"],
    },
    "current": {"temperature_2m": 25.2, "weather_code": 3},
    "utc_offset_seconds": -14400,
}


def test_reads_one_day_out_of_the_daily_arrays():
    """Open-Meteo hands every daily field back as a list. Reading the list
    instead of its first entry prints a forecast for the wrong day."""
    real = almanac.httpx
    try:
        _stub(FORECAST)
        w = asyncio.run(almanac.fetch_weather(40.4406, -79.9959))
    finally:
        almanac.httpx = real
    assert w["label"] == "Thunderstorm" and w["label_zh"] == "雷阵雨"
    assert (w["high_c"], w["low_c"]) == (29.9, 14.1)
    # 29.9C is 85.8F — printed in the tooltip for a reader who lives in a
    # country that speaks Fahrenheit and stands in a hall that does not.
    assert w["high_f"] == 85.8
    assert w["precip_prob"] == 40 and w["wind_kmh"] == 18.4


def test_an_unknown_code_still_prints_a_plate():
    real = almanac.httpx
    try:
        _stub({"daily": {"weather_code": [4242], "temperature_2m_max": [20],
                         "temperature_2m_min": [10]}, "current": {}})
        w = asyncio.run(almanac.fetch_weather(0, 0))
    finally:
        almanac.httpx = real
    assert w["label"] == "Unknown" and w["label_zh"] == "—"


def test_a_dead_service_costs_the_temperature_and_nothing_else():
    """The sky half needs nothing but coordinates, so a weather outage must
    leave a place behind for the browser to draw an arc from."""
    real = almanac.httpx
    try:
        _stub({}, boom=RuntimeError("connection refused"))
        _reset()
        out = asyncio.run(almanac.snapshot(_tmpdir("outage")))
    finally:
        almanac.httpx = real
        _reset()
    assert out["weather"] is None
    assert out["place"]["lat"] == 40.4406
    assert out["age_s"] is None


def test_the_boards_poll_is_not_the_services_request_rate():
    """Two tabs on the hall poll independently and the board re-reads every
    ten minutes. Without the TTL that is the forecast service's traffic."""
    real = almanac.httpx
    try:
        _stub(FORECAST)
        _reset()
        d = _tmpdir("ttl")
        asyncio.run(almanac.snapshot(d))
        asyncio.run(almanac.snapshot(d))
        asyncio.run(almanac.snapshot(d))
        assert _Client.calls == 1, _Client.calls
        # ...but moving the hall invalidates it at once: the cached reading
        # belongs to the old coordinates and would be silently wrong.
        (d / "almanac.json").write_text(json.dumps({
            "name": "Hangzhou", "lat": 30.2936, "lon": 120.1614}), encoding="utf-8")
        out = asyncio.run(almanac.snapshot(d))
        assert _Client.calls == 2
        assert out["place"]["name"] == "Hangzhou"
    finally:
        almanac.httpx = real
        _reset()


def _app_js():
    return (Path(__file__).resolve().parent.parent
            / "static" / "js" / "app.js").read_text(encoding="utf-8")


def test_every_almanac_string_is_in_both_languages():
    """The board is engraved in two languages off one dictionary; a key with
    only an English entry falls back silently and reads as a mixed plate."""
    js = _app_js()
    keys = ["almSub", "almHigh", "almLow", "almPrecip", "almWind",
            "almRise", "almSet", "almPolarDay", "almPolarNight",
            "almAge", "almDaylight", "almLonger", "almShorter",
            "almDays", "almWindUnit", "almFahrenheit", "almTitle", "ariaAlmanac"]
    keys += ["almPhase%d" % i for i in range(8)]
    for key in keys:
        assert js.count(key + ":") == 2, key


def test_the_board_only_polls_while_it_is_on_screen():
    """Below 2200px the aisle is display:none, and a hidden panel must not
    keep the hub calling out to a weather service on the reader's behalf."""
    js = _app_js()
    assert "function almanacVisible()" in js
    assert "if (!almanacVisible()) return Promise.resolve();" in js
    html = (Path(__file__).resolve().parent.parent
            / "static" / "index.html").read_text(encoding="utf-8")
    # Every mount point the renderer writes into has to exist in the case.
    for node in ("al-sub", "al-read", "al-sky", "al-tape", "al-station"):
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
