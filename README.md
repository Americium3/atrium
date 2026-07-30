# Atrium

A master entry hall for local web UIs — one ornate Art-Deco page that opens
onto every panel you run, aggregates their news into a single message center,
and splits the world into a work wing and a play wing.

Atrium serves `http://127.0.0.1:8769` and currently fronts:

| Gate | Wing | Destination |
|---|---|---|
| Anime Autopilot | Salon (play) | `127.0.0.1:8767` — anime RSS automation panel |
| Ground Station | Salon (play) | `127.0.0.1:8768` — Paradox workshop mod tracker |
| Outreach Desk | Bureau (work) | `127.0.0.1:8802` — LinkedIn outreach console |

## What's on the page

- **Gates** — each destination is an arched deco portal carrying its sigil,
  a one-line description, the literal address it opens, an OPEN/DARK status
  lamp (live health checks) and one live stat. Clicking an OPEN gate opens
  the target in a named tab (one tab per service, reused). Clicking a DARK
  gate shows the launcher hint instead of a dead tab.
- **The Ledger** — the message center. A gilded dispatch column collecting
  today's news from all services: which anime got a new episode, premieres
  auto-subscribed, shows auto-completed, which workshop mod updated or got
  installed, outreach daily-queue readiness and invites sent. Dispatches
  newer than your last visit carry a champagne rim. Filter chips
  (ALL / SALON / BUREAU) are session-only and never touched by the mode
  lever — both wings' news always arrives.
- **The ticker** — a status band (lines open, per-gate stats) that also
  scrolls dispatches you haven't seen yet; static when nothing is new.
- **Mode lever** — SALON ◆ BUREAU. Throwing it re-lights the hall (gold ↔
  platinum) and re-composes the stage; the inactive wing recedes behind a
  veil but stays clickable. It never filters the Ledger.
- **Entrance** — a ~2.4 s sequence that assembles the chrome: a gold circle
  draws itself, sunburst rays fan out, engraved door leaves swing open on
  their hinges in perspective, the wordmark settles, the camera dollies in,
  and the circle docks as the masthead rosette. Plays at most once per 6 h;
  click to skip; replay from Preferences; collapses to a fade under reduced
  motion.
- **Depth** — the hall is dimensional, not flat: a one-point-perspective
  floor converges behind the stage, gates are slabs with thickness, contact
  shadows and polished-floor reflections, receded wings tilt inward like a
  triptych's side panels, and the whole stage tilts subtly with the pointer
  (fine pointers only; fully off under reduced motion — the static depth
  stays). One near-vertical key light governs every shadow.

## Preferences

All modes live in a dedicated settings overlay (the keyhole rosette, top
right) — nothing is exposed in the main chrome:

- **Appearance**: Onyx (black & gold) / Ivory (platinum & gold) / Follow
  system (reacts live to OS theme changes)
- **Language**: English / 中文 (headlines localize retroactively — they are
  composed client-side from structured data)
- **Motion**: Full / Reduced (defaults from `prefers-reduced-motion`)
- **Replay entrance**

## Architecture

```
server.py            FastAPI on 127.0.0.1:8769
  /api/services      the service registry (drives gate rendering)
  /api/status        per-service reachability, from adapter caches
  /api/feed          merged dispatches {id, origin, wing, kind, params, ts, url}
  /api/stats         per-gate live stats
static/              vanilla HTML/CSS/JS frontend, all ornament inline SVG
state/               runtime state (seq cursors), gitignored
```

Everything is read-only against the aggregated services — the hub only ever
issues idempotent GETs and never mutates their state. All feed timestamps
are epoch milliseconds; dispatch ids are deterministic, so re-polls and hub
restarts never duplicate or re-animate entries. Sources degrade
independently: a dead service turns its gate DARK and, where possible, the
adapter falls back to reading the service's state files directly.

Adapter notes:

- **Autopilot**: polls `/api/notifications` (60 s) and `/api/overview`
  (5 min); episode headlines come straight from qBittorrent's
  `added_on` timestamps (torrents under `X:\Bangumi`). Never POSTs — the
  panel's unread banners belong to the user.
- **Ground Station**: `X-PMH: 1` header on every call; cheap `/api/ping`
  seq probe, then `/api/feed?after_seq=` with a cursor persisted in
  `state/cursors.json`. Changelog snippets come from the local prefetched
  files, never the live scrape endpoint. Offline fallback reads
  `data/events.json`.
- **Outreach Desk**: privacy hard rule — only aggregate counts ever leave
  the hub process (allowlisted param keys); names, drafts and per-person
  URLs never appear in the feed. Enforced server-side and covered by a test.

## Run

```
run_hub.bat            # foreground-ish (logs to hub.log)
run_hub_hidden.vbs     # hidden, for the Startup folder
```

Python 3.11 with `fastapi`, `uvicorn`, `httpx` (all present on the global
interpreter). To autostart at login, drop a shortcut to
`run_hub_hidden.vbs` into `shell:startup`.

Tests: `python tests/test_feed.py`

## Adding a future web UI

Add one entry to `SERVICES` in `server.py` (id, name, wing, url, addr,
sigil, desc_key, launch_hint, order) — the gate renders immediately with the
fallback sigil and a status lamp. Optionally add a sigil `<g id="sig-<id>">`
in `index.html`, `desc.<key>` strings in both i18n dictionaries, and an
adapter tick if the service should feed the Ledger.

## Debug URL parameters

Not persisted, for testing only: `?theme=onyx|ivory` · `?lang=en|zh` ·
`?wing=salon|bureau` · `?motion=full|reduced` · `?entrance=0|1` · `?prefs=1`.

## Fonts

Bundled locally (no CDN, no external fetches): EB Garamond and Noto Serif SC
variable fonts, both SIL OFL 1.1 — see `static/fonts/LICENSE.txt`.
