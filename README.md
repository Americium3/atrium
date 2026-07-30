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

- **The concourse clock** — the hall's centrepiece, showing your machine's
  local time. A grande-complication regulator in a stepped octagonal deco
  case: knurled bronze bezel, guilloche field, twelve Roman numerals, and
  four complications on the cardinal axes — moon phase at 12, date at 3,
  small seconds at 6, and a pair of meshed wheels at 9 turning off the
  seconds arbor. Pierced Breguet hands. The drive loop reads the wall clock
  every frame and never accumulates, so it cannot drift and a DST step or a
  laptop suspend corrects itself on the next frame; reduced motion swaps the
  sweep for a boundary-aligned deadbeat tick. It is set
  into a niche in the back wall between the arches, on their baseline and
  under their head line, with one hairline wall rule running behind all three.
- **Gates** — each destination is an arched deco portal carrying that
  service's own mark — the identical artwork its favicon and taskbar tile
  show — plus a one-line description, the literal address it opens, an
  OPEN/DARK status lamp (live health checks) and one live stat. Clicking an OPEN gate opens
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
- **The machine rail** — a fixed bronze footer housing the works of the
  hall. At its center stands a floor-mounted signal-box lever in a notched
  quadrant (SALON ◆ BUREAU): throwing it re-lights the hall (gold ↔
  platinum), re-composes the stage, spins the meshed gear pair in the
  aperture below (trapezoid teeth on ISO proportions, exact center distance
  and interleave phase), and vents a burst of steam mid-throw. The throw
  has weight — fast start, slight overshoot, damped clank settle. The rail
  also carries an enamel LINES gauge (needle = services reachable), a
  riveted housing with an engraved builder's plate, and a FLUX.2-generated
  engine-turned texture blended into the plate. It never filters the
  Ledger.
- **Entrance** — a ~2.4 s sequence that assembles the chrome: a gold circle
  draws itself, sunburst rays fan out, the circle grows a vault handwheel
  whose quarter-turn retracts eight radial bolts in sync, riveted door
  leaves swing open on their hinges in perspective as a steam wisp rises
  from the seam, the wordmark settles, the camera dollies in, and the
  wheel docks with the circle as the masthead rosette. Plays at most once
  per 6 h; click to skip; replay from Preferences; collapses to a fade
  under reduced motion.
- **Depth** — the hall is dimensional, not flat: a one-point-perspective
  floor converges behind the stage, gates are slabs with thickness, contact
  shadows and polished-floor reflections, receded wings tilt inward like a
  triptych's side panels, and the whole stage tilts subtly with the pointer
  (fine pointers only; fully off under reduced motion — the static depth
  stays). One near-vertical key light governs every shadow.
- **Deco-machine fusion** — the steampunk layer follows the BioShock
  casework principle: mechanism density peaks at the bottom rail and dies
  before the architecture above. An oiled-bronze token family joins gold
  and platinum in both themes; rivets appear only at machine plate seams;
  the masthead rosette gains one machined knurl ring; the Ledger spine
  reads as a pneumatic dispatch tube with pipe collars at the day breaks;
  medallions become carrier end-caps. Nothing idles: gears turn only when
  the lever drives them, steam exists only as discrete event bursts.

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
  (5 min); episode headlines follow `/api/events` — Autopilot's append-only
  automation ledger — with an `ap_seq` cursor persisted in
  `state/cursors.json`. A ledger entry is written when the episode is
  hardlinked into the library, so a headline means "landed" rather than
  "queued", every episode is announced exactly once, and nothing is missed
  while the hub itself is down. Offline fallback reads `events.json`
  directly. Never POSTs — the panel's unread banners belong to the user.
- **Ground Station**: `X-PMH: 1` header on every call; cheap `/api/ping`
  seq probe, then `/api/feed?after_seq=` with a cursor persisted in
  `state/cursors.json`. Changelog snippets come from the local prefetched
  files, never the live scrape endpoint. Offline fallback reads
  `data/events.json`. Mod updates only arrive for mods marked *watched*
  there — an unwatched mod's update raises no event at all, by design.
- **Outreach Desk**: privacy hard rule — only aggregate counts ever leave
  the hub process (allowlisted param keys); names, drafts and per-person
  URLs never appear in the feed. Enforced server-side and covered by a test.

## Run

```
run_hub.bat            # foreground-ish (logs to hub.log)
run_hub_hidden.vbs     # hidden starter
scripts/concierge.ps1  # port-guarded fleet autostart (see below)
```

Python 3.11 with `fastapi`, `uvicorn`, `httpx` (all present on the global
interpreter).

Autostart: `scripts/concierge.vbs` runs `concierge.ps1`, which probes each
service port and launches only what is down (Atrium, Ground Station,
Outreach Desk — Anime Autopilot keeps its own Startup shortcuts). Register
it as a logon scheduled task; services are spawned via WMI so they are
parented outside the task's job object and survive its execution time
limit:

```powershell
$a = New-ScheduledTaskAction -Execute 'wscript.exe' `
       -Argument '"X:\Github\atrium\scripts\concierge.vbs"'
$t = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME; $t.Delay = 'PT15S'
Register-ScheduledTask -TaskName 'AtriumConcierge' -Action $a -Trigger $t
```

Tests: `python tests/test_feed.py`

## Adding a future web UI

Add one entry to `SERVICES` in `server.py` (id, name, wing, url, addr,
sigil, desc_key, launch_hint, order) — the gate renders immediately with the
fallback sigil and a status lamp. Optionally add a sigil `<g id="sig-<id>">`
in `index.html`, `desc.<key>` strings in both i18n dictionaries, and an
adapter tick if the service should feed the Ledger.

## Debug URL parameters

Not persisted, for testing only: `?theme=onyx|ivory` · `?lang=en|zh` ·
`?wing=salon|bureau` · `?motion=full|reduced` · `?entrance=0|1` ·
`?prefs=1` · `?steam=1` (freezes a steam burst at four life stages for
screenshot QA).

## Fonts and textures

Fonts are bundled locally (no CDN, no external fetches): EB Garamond and
Noto Serif SC variable fonts, both SIL OFL 1.1 — see
`static/fonts/LICENSE.txt`.

The two material textures in `static/assets/tex/` (engine-turned steel,
riveted iron plate) were generated locally with FLUX.2 [dev] via ComfyUI,
then flattened to low-contrast mid-gray so they overlay-blend into either
theme's housing tone.
