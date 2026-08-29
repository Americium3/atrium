# Atrium

A master entry hall for local web UIs — one ornate Art-Deco page that opens
onto every panel you run, aggregates their news into a single message center,
and splits the world into a work wing and a play wing.

Atrium serves `http://127.0.0.1:8769` and currently fronts:

| Gate | Wing | Destination |
|---|---|---|
| Anime Autopilot | Salon (play) | `127.0.0.1:8767` — anime RSS automation panel |
| Ground Station | Salon (play) | `127.0.0.1:8768` — Paradox workshop mod tracker |
| Arsenal | Salon (play) | `127.0.0.1:8770` — game utility tool bench |
| Outreach Desk | Bureau (work) | `127.0.0.1:8802` — LinkedIn outreach console |
| The Press Room | Bureau (work) | `127.0.0.1:8765` — overnight news digest |
| Bourse | Bureau (work) | `127.0.0.1:8771` — personal market briefing desk |

## What's on the page

- **The concourse** — above 2200px the hall opens into three bays: an aisle
  either side of the stage, under one continuous wall and standing on one
  continuous floor. The wall carries a dentil cornice, fluted pilasters, a
  panelled dado and a sconce per bay, and the bays are cut against however
  much wall the arches leave over. The floor is a single perspective plane
  of terrazzo, hinged on its near edge so the hall recedes toward the wall,
  and it runs to the bottom edge of the screen. Everything on it is cut from
  stone rather than drawn in line: a banded medallion under the clock with a
  bronze star at its centre, a square-in-circle roundel over each aisle, a
  border course laid in the floor's own units (so it converges the way a real
  one does), 700 chips of aggregate scattered on a fixed hash, and a woven
  runner leading in from the near edge with the signal desk standing on it.
  The stone is waxed, so the arches, the clock and both aisle cases come back
  up off it — and because the reflections carry the wing metal, the whole
  floor changes temperature when the lever is thrown. Over all of it: the
  skylight's pool, the room's shadow across the near ground and a balustrade
  along the flanks. Below 2200px the grid collapses to the centre column the
  hall shipped with — two aisles cost the stage ~680px, and a narrower
  screen would be spending them on furniture instead of architecture.
- **Statistics** (left aisle) — an instrument case reading the machine all of
  this runs on: four needle dials for processor, memory, graphics and
  traffic, each on a 240° scale with a red sector over the last fifth, plus
  a tape of hours run and store remaining and the maker's plate at its foot.
  It replaced a service directory that said the gates' own name, address and
  lamp back at them a second time. Readings come from `/api/works` on a 4s
  cadence, and only while the board is actually on screen — nothing is
  sampled for a panel nobody can see. (The route and the CSS keep the older
  name: the board's title is what it shows you, `the works` is what the data
  is, and `/api/stats` already serves the services' status.)
- **The Almanac** (right aisle) — where the sun is standing over the machine
  this hall runs on. A horizon dial: the sun travels one ellipse through the
  whole 24 hours, solid above the horizon rule and dotted below it, with the
  crossings engraved as sunrise and sunset and the elapsed daylight inked in
  gold as far as the day has got. Above it, the reading — temperature,
  condition, high/low, precipitation and wind; below it, the moon drawn with
  a real elliptical terminator (so gibbous phases are the right shape), its
  age, the length of the day and how much it has gained or lost since
  yesterday. It replaced a Bulletin case that showed four dispatch stubs
  under a ticker already scrolling them and beside a Ledger already listing
  them — the hall's third telling of one feed.

  The two halves fail independently on purpose. Sun and moon are arithmetic
  the page runs on one pair of coordinates, so the plate keeps its sky when
  the forecast service is unreachable; the weather comes from
  `/api/almanac`, which the hub fetches from Open-Meteo behind a 15-minute
  TTL and only when the board is genuinely on screen. An outage prints NO
  READING and costs nothing else. The hall stands in Pittsburgh unless
  `state/almanac.json` says otherwise — `{"name": "Hangzhou", "name_zh":
  "杭州", "lat": 30.2936, "lon": 120.1614, "timezone": "Asia/Shanghai"}` —
  and a broken override is ignored rather than reported.
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
- **The Ledger** — the message center, kept off the main page behind a hatch
  button in the masthead. Opening it slides a drawer over the right edge; its
  spine draws downward and the dispatches cascade after it, staggered and
  capped so a long feed still lands quickly. It collects today's news from all
  services: which anime got a new episode, premieres auto-subscribed, shows
  auto-completed, one-shots imported by hand, which watched workshop mod
  updated or got pulled, outreach
  daily-queue readiness and invites sent, the morning edition going to
  press, and the bourse desk's brief (with its order count) plus any
  watchtower alarms. Dispatches you have not read carry a champagne rim, and the hatch
  button wears a single disc on its housing ring while any of them are
  unread — the count behind it is in the button's tooltip rather than on the
  disc. **Reading is done by resting on it**: leave the cursor on a card for
  a moment and the rim drains, the ◆ closes and that one dispatch is marked
  read. Following a dispatch to its service, or tabbing onto it, does the
  same. Opening and closing the drawer marks nothing, so the count means what
  is still outstanding rather than whether you looked in today.
  Filter chips (ALL / SALON / BUREAU) are session-only
  and never touched by the mode lever — both wings' news always arrives.
  Escape, the scrim and the button all close it.
- **The ticker** — a status band (lines open, per-gate stats) that also
  scrolls dispatches you haven't seen yet; static when nothing is new.
- **The signal desk** — a floor-mounted signal-box lever in a notched
  quadrant, standing on the runner dead centre, its two throws named on brass
  plates screwed to the quadrant with the live wing lit. (The names used to
  float on the terrazzo either side of it: engraved ink on pale stone,
  foreshortened by the floor's own perspective, and the least legible
  lettering in the hall — labelling its only control.) Throwing
  it re-lights the hall (gold ↔ platinum), re-composes the stage, spins the
  meshed gear pair in the aperture below (trapezoid teeth on ISO
  proportions, exact center distance and interleave phase), and vents a
  burst of steam mid-throw. The throw has weight — fast start, slight
  overshoot, damped clank settle. The lever and both gears are drawn as
  machined parts rather than silhouettes — knurled grip, ferrule, web
  relief, rivets, gaiter, pawl and detent on the lever; rim bands, root
  fillets, tip wear flats, spoke fillets, lightening holes, keyway, bolt
  circle and witness marks on the gears, with the pinion cast differently
  from the spur so the pair reads as two parts. It used to sit in a
  full-bleed bronze rail across the foot of the page; once the hall had a
  floor, the bar read as a strip of UI taped under the picture, so the
  housing went and the machine stayed. It never filters the Ledger.

  All of that now lives **inside a bronze console** that stands on the
  stone — stepped plinth, fluted pilasters, knurl frieze, cornice cap, and
  one arched aperture with the gear train behind it. Before, the lever
  pivoted on nothing, the quadrant hung in mid-air and the aperture was cut
  into no surface: three loose parts sharing a patch of floor, in a housing
  tone that measured 1.05:1 against the terrazzo, so every solid face was
  invisible and only the hairlines survived. The lever is bolted to the
  plinth now, the quadrant is screwed to the console's face, and the case
  comes back up off the waxed floor like everything else standing in this
  hall.
- **Entrance** — a ~2.4 s sequence that assembles the chrome. The lock face
  is built from a real vault door: case and relocker, a handwheel of rim,
  fillets, hub and grip knobs, a dial ring whose graduations tick in, bolt
  guides and a carrier ring, four drive cams, jamb planes and threshold, and
  a maker's plate. A gold circle draws itself, sunburst rays fan out, the
  handwheel's quarter-turn drives the cams and retracts eight bolts in sync,
  the engraved door leaves swing open on their hinges in perspective as a
  steam wisp rises from the seam, the wordmark settles, the camera dollies
  in, the wheel docks with the circle as the masthead rosette, and the gear
  train ticks one tooth so the hall is already in motion. It plays on **every**
  load — it used to be gated to once per six hours, which made the hall's
  best moment something you saw once a morning and never again. Any click or
  keypress cuts it short, `?entrance=0` suppresses it, and reduced motion
  collapses it to a fade.
- **Depth** — the hall is dimensional, not flat: a one-point-perspective
  floor converges behind the stage, gates are slabs with thickness, contact
  shadows and polished-floor reflections, receded wings tilt inward like a
  triptych's side panels, and the whole stage tilts subtly with the pointer
  (fine pointers only; fully off under reduced motion — the static depth
  stays). One near-vertical key light governs every shadow.
- **Deco-machine fusion** — the steampunk layer follows the BioShock
  casework principle: mechanism density peaks at the machine standing on
  the floor and dies before the architecture above. An oiled-bronze token family joins gold
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
- **Engraving size**: Fine / Standard / Signboard — your own correction on
  top of the automatic one. The hall already grows its lettering with the
  screen (+12% at 1900px, +24% at 2400px, +40% at 3000px and up), because
  what a 34" display changes is physical size, not pixel count. This is the
  dial for when that still isn't right for where you sit.
- **Motion**: Full / Reduced (defaults from `prefers-reduced-motion`)
- **Replay entrance**

## Architecture

```
server.py            FastAPI on 127.0.0.1:8769
  /api/services      the service registry (drives gate rendering)
  /api/status        per-service reachability, from adapter caches
  /api/feed          merged dispatches {id, origin, wing, kind, params, ts, url}
  /api/stats         per-gate live stats
  /api/works         host readings for the instrument case — processor,
                     memory, graphics, traffic, store, hours run. Sampled
                     lazily behind a TTL, so an unopened panel spawns
                     nothing; every reading is optional and nulls through.
  /api/almanac       where the hall stands, and the weather over it
almanac.py           the one call that leaves this machine (Open-Meteo,
                     no key, 15 min TTL, never raises). Sun and moon are
                     NOT in here — the page computes those itself.
static/              vanilla HTML/CSS/JS frontend, all ornament inline SVG
state/               runtime state (seq cursors, almanac override), gitignored
```

Everything is read-only against the aggregated services — the hub only ever
issues idempotent GETs and never mutates their state. The forecast is the
one call that leaves this machine at all, and it carries a pair of
coordinates and nothing else. All feed timestamps
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
  Of the four kinds Ground Station raises, the hall relays three:
  `updated`, `removed` and `banned`. `downloaded` — Steam having finished
  writing an update to disk — is muted, because it retells what `updated`
  already said and is the one kind raised for watched and unwatched mods
  alike. It stays visible on Ground Station's own updates page.
- **Outreach Desk**: privacy hard rule — only aggregate counts ever leave
  the hub process (allowlisted param keys); names, drafts and per-person
  URLs never appear in the feed. Enforced server-side and covered by a test.
  Daily-queue readiness keys on the drafter's completion stamp, not on its
  live counters: the queue rotates as invitations go out, so `done` falls
  back to zero once the morning's candidates have been contacted, and a hall
  that was not running at 04:00 could otherwise never learn the queue was
  prepared. `finishedAt` is authoritative; the drafts file's mtime stands in
  when the desk itself has been restarted since.
- **The Press Room**: one line per edition, derived from `/api/status` and
  keyed `press:digest:<date>`. The batch runs at 05:00 and the hall is not
  always up at 05:00, so nothing here depends on witnessing it: an edition
  keeps its file and its own `generated_at`, which means the line can be
  recomputed at any hour and still lands on the morning it was published
  rather than the moment the hall noticed.

### Surviving a restart

Dispatches live in memory; seq cursors live on disk. After a restart the two
disagree — the cursor sits at the head, the catch-up finds nothing, and the
Ledger comes up empty over events still sitting in the sources' own ledgers.
So the first tick of each process re-reads the recent window regardless of the
cursor. Dispatch ids are derived from the source's seq, so this is idempotent,
and the timestamps are the events' own, so nothing resurfaces as unread.

The two state-derived adapters — press room and outreach queue readiness — get
this for free, because they recompute from what is on disk on every tick.

## Run

```
run_hub.bat            # foreground-ish (logs to hub.log)
run_hub_hidden.vbs     # hidden starter
scripts/concierge.ps1  # port-guarded fleet autostart (see below)
scripts/shot.py        # headless screenshot, e.g. shot.py wide 3440,1330 theme=ivory 2
scripts/probe.py       # live layout boxes at each breakpoint, via ?probe=1
scripts/look.py        # shot + measured box in ONE run, e.g. look.py desk .assembly
scripts/crop.py        # crop a region out of a shot for close reading
scripts/contrast.py    # relative-luminance ratio between two tokens
scripts/dumpdom.py     # dump the live DOM; summarises the desk's node counts
```

`shot.py` and `probe.py` are the visual-check pair: a screenshot shows where a
box ended up, and the probe shows how wide it was *allowed* to be — which is
the number a `clamp()` never reports. Both drive headless Chrome and neither
needs the hub restarted.

For anything anchored to the bottom of the screen — the whole signal desk —
use **`look.py`** instead of pairing the two. Headless Chrome reports
`innerHeight` about 99px shorter than the surface it composites the shot
onto, so a crop taken from probe coordinates lands under the machine and
reads as "the part isn't rendering". `look.py` takes both from one render
and re-applies that offset; `?probe=3` paints the boxes into the shot and
outlines the hardware if you want to see it with your own eyes. Check any
new machine tone with `contrast.py` before trusting it against the floor —
the old housing colour measured 1.05:1 there.

Python 3.11 with `fastapi`, `uvicorn`, `httpx` (all present on the global
interpreter). `psutil` is optional and only feeds the instrument case —
without it the processor, memory, traffic and store dials simply read
nothing. Graphics comes from `nvidia-smi` if there is one on `PATH`; a
machine with no NVIDIA card is a normal machine and that dial rests at zero.

Autostart: `scripts/concierge.vbs` runs `concierge.ps1`, which probes each
service port and launches only what is down (Atrium, Ground Station,
Outreach Desk, the Press Room — Anime Autopilot keeps its own Startup
shortcuts). A silent port gets a second look three seconds later before
anything is launched, because several of these are started at logon by their
own mechanism at the same moment and a cold-boot uvicorn can take longer to
bind than this task's trigger delay; without that pause the concierge starts
a duplicate that dies on "address already in use". The Press Room is listed
as a safety net rather than as its owner — YoRHa News registers its own
`YoRHaNews-Server` logon task, and the port guard is what keeps the two from
fighting. Register the concierge as a logon scheduled task; services are
spawned via WMI so they are parented outside the task's job object and
survive its execution time limit:

```powershell
$a = New-ScheduledTaskAction -Execute 'wscript.exe' `
       -Argument '"X:\Github\atrium\scripts\concierge.vbs"'
$t = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME; $t.Delay = 'PT15S'
Register-ScheduledTask -TaskName 'AtriumConcierge' -Action $a -Trigger $t
```

Tests: `python tests/test_feed.py`

## Adding a future web UI

Add one entry to `SERVICES` in `server.py` (id, name, wing, url, addr,
sigil, desc_key, launch_hint, order) — the gate renders
immediately with the fallback sigil and a status lamp. Optionally add a sigil `<g id="sig-<id>">`
in `index.html`, `desc.<key>` strings in both i18n dictionaries, and an
adapter tick if the service should feed the Ledger.

## The marks

`icons/gen.py` draws every local service's badge — silhouette, guilloche fan,
quarter-chevrons, engraved subject, crown gem — and writes each one out as
`icon.svg`, `favicon.ico`, three PNGs, a maskable tile and a manifest into that
service's own repository, then inlines all of them into the generated block in
`static/index.html`. The hall therefore shows the identical artwork each app's
own favicon shows.

A service that also carries its mark inline in its own page — so its masthead
does not pay for a second request — lists that page in `SYMBOL_TARGETS`, and the
script rewrites the `<symbol id="applogo">` there between its own sentinels. A
generated asset with two homes needs the generator to own both; the first time
this one was redrawn, only `static/brand/` was rewritten and the badge the page
actually wore stayed the old colour.

It lives here because the marks are shared by five projects that do not share a
repository. `TARGETS` at the foot of the file is the checkout layout it writes
to; rasterising shells out to headless Chrome.

```
python icons/gen.py              # every brand directory, then the hall's defs
python icons/gen.py autopilot    # one directory, then the hall's defs
```

The generated block is rewritten wholesale on every run, so a mark left out of
`APPS` is a mark deleted from the concourse — add new services to that dict,
never to the block by hand.

## Debug URL parameters

Not persisted, for testing only: `?theme=onyx|ivory` · `?lang=en|zh` ·
`?wing=salon|bureau` · `?motion=full|reduced` · `?ui=s|m|l` (engraving
size) · `?entrance=0|1` · `?prefs=1` · `?steam=1` (freezes a steam burst at
four life stages for screenshot QA).

## Fonts and textures

Fonts are bundled locally (no CDN, no external fetches): **EB Garamond**
(OFL 1.1) and **LXGW Heart Serif** — 霞鹜铭心宋, a Kokoro Mincho derivative
under the IPA Font License, shipped byte-for-byte because a subset would be
a derived work under that licence. It replaced Noto Serif SC, which was a
modern Songti reading as a web page beside Garamond, and 25 MB to Heart
Serif's 11. See `static/fonts/LICENSE.txt`.

The two material textures in `static/assets/tex/` (engine-turned steel,
riveted iron plate) were generated locally with FLUX.2 [dev] via ComfyUI,
then flattened to low-contrast mid-gray so they overlay-blend into either
theme's housing tone.
