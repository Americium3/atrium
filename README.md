# Atrium

A master entry hall for local web UIs: one ornate Art-Deco page that opens
onto every panel you run, aggregates their news into a single message center,
and splits the world into a work wing and a play wing.

Atrium serves `http://127.0.0.1:8769` and currently fronts:

| Gate | Wing | Destination |
|---|---|---|
| Anime Autopilot | Salon (play) | `127.0.0.1:8767` · anime RSS automation panel |
| Ground Station | Salon (play) | `127.0.0.1:8768` · Paradox workshop mod tracker |
| Arsenal | Salon (play) | `127.0.0.1:8770` · game utility tool bench |
| Outreach Desk | Bureau (work) | `127.0.0.1:8802` · LinkedIn outreach console |
| The Press Room | Bureau (work) | `127.0.0.1:8765` · overnight news digest |
| Bourse | Bureau (work) | `127.0.0.1:8771` · personal market briefing desk |

## What's on the page

- **The room.** The hall is the foyer of a 1930s picture palace. The wall is
  damask hung bay by bay under a relief frieze and a dentil cornice, with
  antique-mirror pilasters, torchieres in the outer bays and lit onyx pier
  lights between the arches. The floor is waxed terrazzo in one perspective
  plane, with a foyer medallion under the clock, a roundel over each aisle, a
  red wool runner leading in from the near edge and velvet rope on brass
  posts along the flanks. Every arch and the clock come back up off the wax,
  and every lamp in the room throws its own streak on it. At night (Onyx)
  the house lamps are lit; by day (Ivory) nothing is lit and the doors stand
  open to the street. Surfaces are drawn as the things they are (gilt leaf,
  book-matched stone, veneer, velvet, lacquer, enamel, lit glass) from
  textures baked on the CPU, and siblings of one kind vary by a hash of
  their name, so no two gates, bays or cards are the same. `DESIGN.md` has
  the full material law.
- **The concourse.** From 2800px up the hall opens into three bays: an aisle
  either side of the stage under one continuous wall and standing on one
  continuous floor. Below 2800px the aisles fold away, because two of them
  cost the stage about 680px and the arches would have to shrink by a
  quarter to make room.
- **Statistics** (left aisle). A wall case in macassar ebony with a gilt
  frame round a black glass door, reading the machine all of this runs on:
  four brass-bezelled needle dials for processor, memory, graphics and
  traffic, each on a 240° scale with a red lacquer arc over the last fifth,
  plus hours run, store remaining and a cast maker's plate. A brass picture
  lamp over it is lit at night. Readings come from `/api/works` on a 4s
  cadence, and only while the case is actually on screen. (The route and the
  CSS keep the older name: the case's title is what it shows you, `the works`
  is what the data is, and `/api/stats` already serves the services' status.)
- **The Almanac** (right aisle), the same kind of case in figured walnut:
  where the sun is standing over the machine this hall runs on. An enamel
  horizon plate: the sun, a gilt bead in a cut slot, travels one ellipse
  through the whole 24 hours at a constant 15° an hour, with the horizon
  cutting across it as a chord, so the lit arc is daylight's true share of
  the day: fat in June, a shallow cap in December, cut in half only at an
  equinox. `scripts/dial.py` measures that back out of the drawing. Above
  it, the reading: temperature, condition, high/low, precipitation and wind;
  below it, the moon as a shaded ball under its own crystal with a real
  elliptical terminator, its age, the length of the day and how much it has
  gained or lost since yesterday.

  The two halves fail independently on purpose. Sun and moon are arithmetic
  the page runs on one pair of coordinates, so the plate keeps its sky when
  the forecast service is unreachable; the weather comes from
  `/api/almanac`, which the hub fetches from Open-Meteo behind a 15-minute
  TTL and only when the case is on screen. An outage prints NO READING and
  costs nothing else. The hall stands in Pittsburgh unless
  `state/almanac.json` says otherwise (`{"name": "Hangzhou", "name_zh":
  "杭州", "lat": 30.2936, "lon": 120.1614, "timezone": "Asia/Shanghai"}`),
  and a broken override is ignored rather than reported.
- **The concourse clock**: the hall's centrepiece, showing your machine's
  local time. A grande-complication regulator in a faceted octagonal case of
  statuary bronze with leaf on its bevels, set in a niche of stepped frames
  round a back of gold smalti, on a sill of book-matched stone. Opal dial,
  twelve Roman numerals, blued hands, and four complications on the cardinal
  axes: the true moon at 12 (the real phase and age, computed to the
  minute), date at 3, small seconds at 6, and a pair of meshed wheels at 9
  turning off the seconds arbor. The drive loop reads the wall clock every
  frame and never accumulates, so it cannot drift and a DST step or a laptop
  suspend corrects itself on the next frame; reduced motion swaps the sweep
  for a boundary-aligned deadbeat tick. It is always in view at full size.
- **Gates.** Each destination is a small gilt proscenium: stepped archivolts
  round a lit fanlight, the service's own mark (the identical artwork its
  favicon and taskbar tile show) in a machined bezel at the fanlight's hub,
  the name on a black glass sign, a velvet house with the description thrown
  on the closed curtain, and a lacquer apron carrying one live stat, the
  literal address it opens and an OPEN/DARK lamp (live health checks). By
  day the curtain is tied back and the description is a title card on the
  screen. A service's own warning (qBittorrent down, the sync daemon
  stalled) is engraved on the apron above the lamp. Clicking an OPEN gate
  opens the target in a named tab (one tab per service, reused); clicking a
  DARK gate pins its launcher hint on the curtain instead of opening a dead
  tab. Hover lifts the curtain off the stage; keyboard focus traces the arch
  in a ring of marquee bulbs.
- **The row.** The lit wing stands in pairs either side of the clock, two
  arches left and two right. A wing with an odd number of services gets a
  RESERVED gate at its right-hand end, a plaster arch with its iron safety
  curtain down, which the next service to register in that wing takes over.
  The other wing waits behind the lever in the same bays, and a throw swaps
  them in place one bay at a time. Nothing on the stage covers anything else
  at any size; if the row would not fit, the arches and the clock come down
  together until it does.
- **The Ledger.** The message center, kept off the main page behind a domed
  brass hatch in the masthead. Opening it slides a black lacquer drawer over
  the right edge, with a brass pneumatic main down its spine and each
  dispatch a programme card in a small gilt holder. It collects the last
  week's news from all services: which anime got a new episode, premieres
  auto-subscribed, shows auto-completed, one-shots imported by hand, which
  watched workshop mod updated or got pulled, outreach daily-queue readiness
  and invites sent, the morning edition going to press, and the bourse
  desk's brief (with its market day and order count) plus any watchtower
  alarms. A card you have not read carries a lit jewel in its holder, and
  the hatch wears one jewel lamp while any card is unread; the count is in
  the button's tooltip rather than on the jewel. **Reading is done by resting
  on it**: leave the cursor on a card for a moment and its jewel drains and
  that dispatch is marked read. Following a dispatch to its service, or
  tabbing onto it, does the same. Opening and closing the drawer marks
  nothing, so the count means what is still outstanding rather than whether
  you looked in today. When you would rather not rest on twenty of them, the
  brass dater under the head clears the whole window in one press: both
  wings, even while a chip is filtering the column, because the hatch's
  jewel counts both. Filter chips (ALL / SALON / BUREAU) are session-only
  and never touched by the mode lever. Both wings' news always arrives.
  Escape, the scrim, the close knob and the hatch all close it.
- **The marquee**: a status band (lines open, then each gate's live figure
  after its hall's name, `AUTOPILOT · 4 AIRING TODAY`) that also
  scrolls dispatches you haven't read yet, on milk glass between two rows of
  bulbs. When something is new at night the bulbs chase; when nothing is
  new the band stands still and every bulb burns evenly.
- **The signal desk**: a statuary bronze console standing on the runner dead
  centre, with a railway points lever in a notched quadrant, two cast brass
  throw plates (the live wing's pilot jewel lit) and a glazed inspection
  window over a meshed gear pair (trapezoid teeth on ISO proportions, exact
  center distance and interleave phase). Throwing it re-leafs the hall (gold
  for the Salon, nickel silver for the Bureau), swaps the wings, spins the
  gears and vents a burst of steam mid-throw. The throw has weight: fast
  start, slight overshoot, damped clank settle. It never filters the Ledger.
- **Entrance.** At night the hall stands behind a full-screen velvet house
  curtain with a gilt sunburst crest. The footlights come up, a follow spot
  finds the crest, the curtain flies out, the house lights rise, the marquee
  chases once and the fanlights light from the clock outward; the spot then
  flies to the masthead's monogram and goes out on it. By day the curtain is
  already up and the street's light floods in and settles. It plays on
  **every** load and takes about 2.7 s. Any click, tap, wheel or keypress
  cuts it short (browser shortcuts such as F5 still work), `?entrance=0`
  suppresses it, and reduced motion collapses it to a fade.
- **Depth.** A one-point-perspective floor converges behind the stage, the
  wings tilt inward like an altarpiece, every gate casts its shadow on the
  wall, and the whole stage tilts subtly with the pointer (fine pointers
  only; off under reduced motion, though the static depth stays). One key
  light governs every shadow and every lit edge.

## Preferences

All modes live in one settings panel (the nickel keyhole escutcheon, top
right), a black lacquer panel of switchgear: a rotary for the appearance, a
knife switch for the language, a push-button bank for the engraving size, a
bat toggle for motion and a spring-return key to replay the entrance.
Nothing is exposed in the main chrome:

- **Appearance**: Onyx (black & gold) / Ivory (platinum & gold) / Follow
  system (reacts live to OS theme changes)
- **Language**: English / 中文 (headlines localize retroactively, because they are
  composed client-side from structured data)
- **Engraving size**: Fine / Standard / Signboard. Your own correction on
  top of the automatic one. The hall already grows its lettering with the
  screen (+12% at 1900px, +24% at 2400px, +40% at 3000px and up), because
  what a 34" display changes is physical size, not pixel count. This is the
  dial for when that still isn't right for where you sit.
- **Motion**: Full / Reduced / Follow system (the default, and it reacts
  live when the OS setting changes)
- **Replay entrance**: plays the entrance once on the next load (the quiet
  fade if motion is reduced)

Changes carry to any other open hall tab, and so do read marks.

## Keys

Tab walks everything. On top of that:

| Key | Does |
|---|---|
| ← → | Walk the lit wing's gates, left to right |
| 1 to 3 | Go to a gate (one digit per lit gate) |
| Enter | Open it |
| W | Throw the lever (focus lands on the gate in the same bay of the other wing) |
| L | Open or close the Ledger |
| ↑ ↓ | Walk the dispatches while the Ledger is open |
| P | Open Preferences |
| ? | Show or hide the key plate |
| Esc | Close the top layer |

Nothing fires with a modifier held, over Preferences or while the entrance
is playing.

## Architecture

```
server.py            FastAPI on 127.0.0.1:8769
  /api/services      the service registry (drives gate rendering)
  /api/status        per-service reachability, from adapter caches
  /api/feed          merged dispatches {id, origin, wing, kind, params, ts, url}
  /api/stats         per-gate live stats
  /api/works         host readings for the instrument case: processor,
                     memory, graphics, traffic, store, hours run. Sampled
                     lazily behind a TTL, so an unopened panel spawns
                     nothing; every reading is optional and nulls through.
  /api/almanac       where the hall stands, and the weather over it
almanac.py           the one call that leaves this machine (Open-Meteo,
                     no key, 15 min TTL, never raises). Sun and moon are
                     NOT in here. The page computes those itself.
static/              vanilla HTML/CSS/JS frontend, no build step
  css/atrium.css     the hall; palace-gates / -room / -cabinetry / -desk.css
                     dress each surface in the v6 material law
  js/app.js          state, polling, layout, keys; palace.js (gates),
                     room.js (masthead, wall, floor), cabinetry.js (cases),
                     desk.js (signal desk) and clock.js draw the rest
  assets/tex/        baked textures (see below)
state/               runtime state (seq cursors, almanac override), gitignored
```

Everything is read-only against the aggregated services. The hub only ever
issues idempotent GETs and never mutates their state. The forecast is the
one call that leaves this machine at all, and it carries a pair of
coordinates and nothing else. All feed timestamps
are epoch milliseconds; dispatch ids are deterministic, so re-polls and hub
restarts never duplicate or re-animate entries. Sources degrade
independently: a service that refuses the connection turns its gate DARK
and, where possible, the adapter falls back to reading the service's state
files directly. A service that takes the connection and then answers late
is running, so its gate stays OPEN with the note "Running, but slow to
answer" and still opens it. Ground Station does this for minutes at a time,
and a DARK lamp there used to send the reader off to launch a second copy.

Adapter notes:

- **Autopilot**: polls `/api/notifications` (60 s) and `/api/overview`
  (5 min); episode headlines follow `/api/events` (Autopilot's append-only
  automation ledger) with an `ap_seq` cursor persisted in
  `state/cursors.json`. A ledger entry is written when the episode is
  hardlinked into the library, so a headline means "landed" rather than
  "queued", every episode is announced exactly once, and nothing is missed
  while the hub itself is down. Offline fallback reads `events.json`
  directly. Never POSTs. The panel's unread banners belong to the user.
  The overview poll also carries the watch daemon's pulse, and a stalled
  daemon or an unreachable qBittorrent takes a Ledger line of its own rather
  than only a tooltip on the gate's lamp. Those two lines are timestamped
  *now* rather than at onset, so the warning rises to the top of the Ledger
  the longer it holds instead of sinking out of sight; the id carries the
  stalled-since stamp, so one outage is one strikeable line and the next
  outage still speaks up.
- **Ground Station**: `X-PMH: 1` header on every call; cheap `/api/ping`
  seq probe, then `/api/feed?after_seq=` with a cursor persisted in
  `state/cursors.json`. Changelog snippets come from the local prefetched
  files, never the live scrape endpoint. Offline fallback reads
  `data/events.json`. Mod updates only arrive for mods marked *watched*
  there. An unwatched mod's update raises no event at all, by design.
  Of the four kinds Ground Station raises, the hall relays three:
  `updated`, `removed` and `banned`. `downloaded`, Steam having finished
  writing an update to disk, is muted, because it retells what `updated`
  already said and is the one kind raised for watched and unwatched mods
  alike. It stays visible on Ground Station's own updates page.
- **Outreach Desk**: privacy hard rule. Only aggregate counts ever leave
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
disagree. The cursor sits at the head, the catch-up finds nothing, and the
Ledger comes up empty over events still sitting in the sources' own ledgers.
So the first tick of each process re-reads the recent window regardless of the
cursor. Dispatch ids are derived from the source's seq, so this is idempotent,
and the timestamps are the events' own, so nothing resurfaces as unread.

The two state-derived adapters (press room and outreach queue readiness) get
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
scripts/dial.py        # measures the almanac's dial against the sun it draws
scripts/dumpdom.py     # dump the live DOM; summarises the desk's node counts
```

`shot.py` and `probe.py` are the visual-check pair: a screenshot shows where a
box ended up, and the probe shows how wide it was *allowed* to be, which is
the number a `clamp()` never reports. Both drive headless Chrome and neither
needs the hub restarted.

For anything anchored to the bottom of the screen, meaning the whole signal desk,
use **`look.py`** instead of pairing the two. Headless Chrome reports
`innerHeight` about 99px shorter than the surface it composites the shot
onto, so a crop taken from probe coordinates lands under the machine and
reads as "the part isn't rendering". `look.py` takes both from one render
and re-applies that offset; `?probe=3` paints the boxes into the shot and
outlines the hardware if you want to see it with your own eyes. Check any
new machine tone with `contrast.py` before trusting it against the floor.
The old housing colour measured 1.05:1 there.

`dial.py` exists because the almanac's plate is the one thing in the hall a
screenshot cannot check. Its first version drew a day arc of exactly half the
ring under a tape reading DAYLIGHT 13:13, and an hour ring on the wrong pitch,
both of which render as a perfectly handsome dial. The script reads the SVG
back out of the page and measures the arc, the pitch and the tick normals
against the times engraved on the plate's own crossings.

Python 3.11 with `fastapi`, `uvicorn`, `httpx` (all present on the global
interpreter). `psutil` is optional and only feeds the instrument case.
Without it the processor, memory, traffic and store dials simply read
nothing. Graphics comes from `nvidia-smi` if there is one on `PATH`; a
machine with no NVIDIA card is a normal machine and that dial rests at zero.

Keepalive: `scripts/concierge.vbs` runs `concierge.ps1` at logon **and every
five minutes after**. The logon run brings the fleet back after a reboot; the
five-minute run brings back a service that dies mid-session. On 2026-09-04
six of these services died together mid-session and nothing noticed until a
human did, the next morning. A logon task cannot help with that, because
nobody logs on.

Each gate is asked for a real endpoint, not a TCP handshake: a wedged uvicorn
keeps its listening socket open long after it stops answering. Headers are
part of the probe. Ground Station rejects anything without `X-PMH` and would
otherwise look permanently sick. The two failure modes are then treated very
differently, because they carry different risk:

- **Port silent.** Just launch it. Nothing is running, so there is nothing to
  break, and the launch happens on the first cycle that sees it.
- **Port open but not serving.** Something is holding the port without doing
  its job. Killing is destructive and a false positive would take down a
  healthy service on a loop, so this path needs the failure to repeat across
  cycles, and only ever kills a PID read off the listening socket whose
  process name is a known server (`python3.11` among them, and the Store
  launcher's name is why killing by the name `python` misses these).

Both paths are rate limited: no service is touched more than once every ten
minutes, or more than three times an hour. A service that crashes on startup
is a job for a human, and relaunching it forever is worse than leaving it
down. A healthy fleet writes nothing to `state/concierge.log`. Every line in
that file is a change of state, so it stays readable by eye.

Anime Autopilot is in the list now, twice, because it is two processes. The
panel on `:8767` is the half a human looks at; the watch daemon behind `:8766`
is the half that does the work, mirroring new episodes into the Jellyfin
library and writing the ledger this hub reads. The daemon holds a socket only
by accident, through the Jellyfin webhook listener it starts alongside its sync loop,
and that accident is the only way to ask whether it is alive. It died on
2026-09-04 and did not come back at the next logon. The panel kept answering
perfectly, so nothing looked wrong from here; for two days the Ledger gained an
`anime.landed` line only when a human pressed Sync by hand.

Startup shortcuts still start both halves at logon, and the Press Room still
has its own `YoRHaNews-Server` logon task; all of them are listed here as a
safety net rather than as their owner, and the port guard is what keeps the two
mechanisms from fighting. Services are spawned via WMI so they are parented
outside the task's job object and survive its execution time limit:

```powershell
$a = New-ScheduledTaskAction -Execute 'wscript.exe' `
       -Argument '"X:\Github\atrium\scripts\concierge.vbs"'
$logon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$logon.Delay = 'PT15S'
# A repetition on the logon trigger alone only starts at the NEXT logon, so a
# second, time-based trigger carries the five-minute cycle on this session too.
$every = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
           -RepetitionInterval (New-TimeSpan -Minutes 5)
$every.Repetition.Duration = ''          # empty means indefinitely
$s = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
       -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -StartWhenAvailable
Register-ScheduledTask -TaskName 'AtriumConcierge' `
  -Action $a -Trigger @($logon, $every) -Settings $s
```

`run_hub.bat` is ASCII with CRLF line endings, and must stay that way.
`cmd.exe` parses a `.bat` by byte: bare LF endings make it drop the first
characters of every line (`setlocal` runs as `ocal`, `python server.py` as
`server.py`), and the hall then fails to start with an empty log, because the
redirect that was supposed to capture the error never parsed either.

Tests: `python tests/test_feed.py`

## Adding a future web UI

Add one entry to `SERVICES` in `server.py` (id, name, short, wing, url,
addr, sigil, desc_key, launch_hint, order). `short` is the name the marquee
sets before the gate's live figure. The gate renders immediately with the
fallback sigil and a status lamp. Then:

- Add `desc.<key>` strings to both `STR` tables in `static/js/app.js`.
  Without them the gate shows the generic description.
- Give it its mark: add the service to `APPS`, `HUE` and `SIL` in
  `icons/gen.py`, draw its subject in `glyph()`, run the script so
  `#mark-<id>` lands in the generated block, and add the id to
  `KNOWN_SIGILS` in `app.js`. The gate and its Ledger
  medallions use `#mark-<id>` only for ids listed there, and fall back to
  `#sig-fallback` otherwise.
- Write an adapter tick in `server.py` if the service should feed the Ledger
  or the gate's stat line.

## The marks

`icons/gen.py` draws every local service's badge (silhouette, guilloche fan,
quarter-chevrons, engraved subject, crown gem) and writes each one out as
`icon.svg`, `favicon.ico`, three PNGs, a maskable tile and a manifest into that
service's own repository, then inlines all of them into the generated block in
`static/index.html`. The hall therefore shows the identical artwork each app's
own favicon shows. Bourse is the exception: `gen.py` does not draw its mark,
so `#mark-bourse` is kept by hand just after the block's END sentinel, where
a run cannot reach it.

A service that also carries its mark inline in its own page, so its masthead
does not pay for a second request, lists that page in `SYMBOL_TARGETS`, and the
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
`APPS` is a mark deleted from the concourse. Add new services to that dict,
never to the block by hand. A mark drawn anywhere else goes outside the
sentinels, as Bourse's does.

## Debug URL parameters

Not persisted, for testing only: `?theme=onyx|ivory|system` (anything else
is Follow system) · `?lang=en|zh` ·
`?wing=salon|bureau` · `?motion=full|reduced|system` · `?ui=s|m|l` (engraving
size) · `?entrance=0|1` · `?prefs=1` · `?ledger=1` (opens the drawer, which
a headless screenshot otherwise cannot reach, since it takes a click) ·
`?steam=1` (freezes a steam burst at four life stages for screenshot QA) ·
`?probe=1|2|3` (layout boxes in the page title; 2 adds the desk's hardware
and the Almanac's registers, 3 also paints the numbers and outlines the
hardware in the shot).

## Fonts and textures

Fonts are bundled locally (no CDN, no external fetches): **EB Garamond**
(OFL 1.1) and **LXGW Heart Serif**, 霞鹜铭心宋, a Kokoro Mincho derivative
under the IPA Font License, shipped byte-for-byte because a subset would be
a derived work under that licence. It replaced Noto Serif SC, which was a
modern Songti reading as a web page beside Garamond, and 25 MB to Heart
Serif's 11. See `static/fonts/LICENSE.txt`.

The textures in `static/assets/tex/` (leaf, stone, veneer, velvet, damask,
carpet, glass, smalti, card, bronze patina) are baked on the CPU with numpy
by `scripts/materials.py`, `materials_gates.py`, `materials_room.py`,
`cabinetry_tex.py` and `desk_materials.py`; rerun a script to rebake its
set. Two older ones (engine-turned steel, riveted iron plate) were generated
locally with FLUX.2 [dev] via ComfyUI and flattened to low-contrast mid-gray
so they overlay-blend into either theme.
