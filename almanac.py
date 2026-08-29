"""The almanac — what the east board reads.

Two halves that fail independently, on purpose.

The sun and the moon are arithmetic on one pair of coordinates, and the
BROWSER runs it: the marker has to keep moving through the day, and a board
that computes its own sky still has one when the weather service is down.
Nothing in this file knows where the sun is.

The weather does need an outside source, so it is fetched here. This is the
only place the hub reaches past the machine it runs on — every other source
is a localhost service or a file on this disk — so it is fenced accordingly:
one GET per TTL, lazily (a hall nobody has opened calls nothing), a short
timeout, and it never raises. An outage costs the board its temperature and
nothing else.
"""

from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import Any

import httpx

# Open-Meteo: no key, no registration, CC-BY. One GET per TTL.
ENDPOINT = "https://api.open-meteo.com/v1/forecast"

# Where the hall considers itself to stand. Moved by dropping a
# `state/almanac.json` carrying the same keys — the board is furniture, not a
# service, so there is no write route and no control in the hall to mis-click.
PLACE: dict[str, Any] = {
    "name": "Pittsburgh",
    "name_zh": "匹兹堡",
    "lat": 40.4406,
    "lon": -79.9959,
    # The board prints the sky over the place it NAMES, in that place's own
    # clock. Without this it would use the reader's, and a hall standing in
    # Pittsburgh read from Hangzhou would announce sunrise at 17:18.
    "timezone": "America/New_York",
}

TTL_S = 900.0        # a forecast that moves faster than 15 min is a rumour
FAIL_TTL_S = 120.0   # a service that is down stays down past one board poll
TIMEOUT_S = 6.0

# WMO 4677 present-weather codes, which is what the API speaks.
WMO: dict[int, tuple[str, str]] = {
    0:  ("Clear", "晴"),
    1:  ("Mainly clear", "少云"),
    2:  ("Partly cloudy", "多云"),
    3:  ("Overcast", "阴"),
    45: ("Fog", "雾"),
    48: ("Rime fog", "雾凇"),
    51: ("Light drizzle", "毛毛雨"),
    53: ("Drizzle", "毛毛雨"),
    55: ("Dense drizzle", "密毛毛雨"),
    56: ("Freezing drizzle", "冻毛毛雨"),
    57: ("Freezing drizzle", "冻毛毛雨"),
    61: ("Light rain", "小雨"),
    63: ("Rain", "中雨"),
    65: ("Heavy rain", "大雨"),
    66: ("Freezing rain", "冻雨"),
    67: ("Freezing rain", "冻雨"),
    71: ("Light snow", "小雪"),
    73: ("Snow", "中雪"),
    75: ("Heavy snow", "大雪"),
    77: ("Snow grains", "米雪"),
    80: ("Rain showers", "阵雨"),
    81: ("Rain showers", "阵雨"),
    82: ("Violent showers", "强阵雨"),
    85: ("Snow showers", "阵雪"),
    86: ("Heavy snow showers", "强阵雪"),
    95: ("Thunderstorm", "雷阵雨"),
    96: ("Thunderstorm, hail", "雷阵雨伴冰雹"),
    99: ("Thunderstorm, hail", "雷阵雨伴冰雹"),
}

_PLACE_KEYS = ("name", "name_zh", "lat", "lon", "timezone")


def _c_to_f(c: float | None) -> float | None:
    return None if c is None else round(c * 9 / 5 + 32, 1)


def _first(seq: Any) -> Any:
    """Open-Meteo returns each daily field as a list, one entry per day."""
    if isinstance(seq, list) and seq:
        return seq[0]
    return None


def _sane(lat: Any, lon: Any) -> bool:
    try:
        return -90.0 <= float(lat) <= 90.0 and -180.0 <= float(lon) <= 180.0
    except (TypeError, ValueError):
        return False


def place(state_dir: Path) -> dict[str, Any]:
    """Where the board stands — the override if there is a usable one.

    A malformed or half-written file is not an error state worth surfacing in
    a lobby: the hall falls back to the coordinates compiled in above and says
    nothing.
    """
    out = dict(PLACE)
    try:
        over = json.loads((state_dir / "almanac.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return out
    if not isinstance(over, dict) or not _sane(over.get("lat"), over.get("lon")):
        return out
    for key in _PLACE_KEYS:
        if over.get(key) not in (None, ""):
            out[key] = over[key]
    out["lat"] = float(out["lat"])
    out["lon"] = float(out["lon"])
    return out


async def fetch_weather(lat: float, lon: float) -> dict[str, Any] | None:
    """One day's forecast, or None if the service is unreachable.

    Never raises. Every figure is optional on the way out as well: Open-Meteo
    drops fields it has no model data for, and a station with no reading must
    print an em dash rather than a confident nought degrees.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": ("weather_code,temperature_2m_max,temperature_2m_min,"
                  "precipitation_probability_max,wind_speed_10m_max,"
                  "sunrise,sunset"),
        "current": "temperature_2m,weather_code",
        "timezone": "auto",
        "forecast_days": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            r = await client.get(ENDPOINT, params=params)
            r.raise_for_status()
            doc = r.json()
    except Exception:
        return None

    daily = doc.get("daily") or {}
    current = doc.get("current") or {}
    code = _first(daily.get("weather_code"))
    if code is None:
        return None
    label, label_zh = WMO.get(int(code), ("Unknown", "—"))

    high = _first(daily.get("temperature_2m_max"))
    low = _first(daily.get("temperature_2m_min"))
    now = current.get("temperature_2m")
    return {
        "code": int(code),
        "label": label,
        "label_zh": label_zh,
        "now_c": now, "now_f": _c_to_f(now),
        "high_c": high, "high_f": _c_to_f(high),
        "low_c": low, "low_f": _c_to_f(low),
        "precip_prob": _first(daily.get("precipitation_probability_max")),
        "wind_kmh": _first(daily.get("wind_speed_10m_max")),
        # The service's own sun times. The board computes its own from the
        # coordinates so it still has a sky when this block is missing; these
        # are kept as the check on that arithmetic.
        "sunrise": _first(daily.get("sunrise")),
        "sunset": _first(daily.get("sunset")),
        "utc_offset_s": doc.get("utc_offset_seconds"),
    }


_weather: dict[str, Any] | None = None
_weather_at = 0.0
_weather_ttl = 0.0
_weather_for: tuple | None = None
_lock = asyncio.Lock()


async def snapshot(state_dir: Path) -> dict[str, Any]:
    """The whole board payload: always a place, and a weather that may be None.

    The lock is the point of the cache as much as the TTL is: two tabs open on
    the hall poll independently, and without it a cold cache sends two GETs to
    the same service for the same minute.
    """
    global _weather, _weather_at, _weather_ttl, _weather_for
    where = place(state_dir)
    key = (where["lat"], where["lon"])
    async with _lock:
        stale = (time.monotonic() - _weather_at) > _weather_ttl
        if stale or _weather_for != key:
            _weather = await fetch_weather(where["lat"], where["lon"])
            _weather_at = time.monotonic()
            _weather_ttl = TTL_S if _weather else FAIL_TTL_S
            _weather_for = key
        weather = _weather
        read_at = _weather_at
    return {
        "place": where,
        "weather": weather,
        # Age of the reading, not the moment of the request: a board that
        # engraves a timestamp has to engrave the one it actually read at.
        "age_s": round(time.monotonic() - read_at, 1) if weather else None,
        "generated": int(time.time() * 1000),
    }
