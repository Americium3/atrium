# Atrium — Design Contract (v2)

Master entry portal for all local web UIs. Reviewed by a 4-judge panel
(requirements / art direction / UX / technical); every blocker and major
finding is folded in below. This document is the implementation contract.

## Concept

**Atrium** — a grand Art-Deco entrance hall. Every destination web UI is a
**Gate**: a tall arched portal opening off the hall. Two wings:

- **Salon** (play): Anime Autopilot, Ground Station
- **Bureau** (work): Outreach Desk

A brass **mode lever** re-lights the hall toward one wing. A gilded dispatch
column — **the Ledger** — collects today's news from *all* services
regardless of wing. First run: theme = follow system (resolved pre-paint),
wing = SALON, Ledger filter = ALL.

## Color tokens (contrast-verified matrix)

| Token | Onyx (dark) | Ivory (light) |
|---|---|---|
| base | `#0c0a07` | `#f4efe4` |
| surface | `#141109` | `#ece5d4` |
| chrome neutral | `#3a3427` | greige `#d8d2c4` |
| ink (body/detail/time text) | `#e8dcc0` | `#2a2416` |
| ink faint | `#8a7f63` | `#6b6252` |
| gold accent | `#d4af37` (9.4:1 on base — AAA) | `#7a5f1e` for text (≥4.6:1); `#9a7b2d` only for display type ≥24px and decorative rules |
| champagne highlight | `#f1e3b6` | `#b8963e` |
| platinum accent | `#c9cfd8` | deep palladium `#5b6470` |
| platinum highlight | `#eef1f5` | `#8b93a0` |

Rules: all body-size text ≥4.5:1 against its base. In Ivory, small text is
ink, never gold. The wing metal is carried by **exactly three surfaces**:
lever needle, masthead underline, active-gate frames + stage glow — so the
re-light reads even in the weakest cell (Bureau × Ivory).

## Ornament density budget (anti-kitsch law)

- Sunburst rays: **entrance only**, never in resting chrome.
- Rosette: masthead monogram + settings trigger only.
- Stepped frame: gates only. Medallions: Ledger only.
- Double hairline rule: ticker + Ledger day-breaks only.
- **Clock-only classes (v3.2)**: the octagonal case with its stepped
  shoulders, the four diagonal spandrels, the knurled bezel, the fret band
  and the guilloche field belong to the concourse clock and appear nowhere
  else. The clock is also the one place a fourth wing-metal surface is
  allowed (quarter numerals, spandrel lozenges, subdial rings, the seconds
  baton) — it is the hall's single jewel.
- **Service marks (v3.2)**: gate keystones and Ledger medallions carry each
  service's own coloured mark rather than a monochrome sigil. This is the
  one sanctioned break in the hall's monochrome discipline: the mark shown
  in the hall is byte-identical to the one the service's own favicon,
  taskbar tile and masthead show. Services with no mark fall back to the
  line-drawn keystone sigil, which still tints with `color`.
- **Concourse vocabulary (v4)**: three new families, each fenced to one
  surface. *Wall* — dentil cornice, fluted pilaster, dado panel run, sconce;
  aisle walls only, one sconce per bay, and the sconce's light pool falls on
  plaster (the ban on outer glows is a ban on glowing **gold**, not on
  architectural lighting). *Board* — a **chamfered** outline with an inset
  gilt line and four seating rivets; the gates keep stepped shoulders and
  the Ledger keeps medallions, so a board is never either. *Floor inlay* —
  banded medallion and square-in-circle roundel, floor only; a medallion is
  not a rosette, and the masthead/settings rosettes stay unique. The floor is
  the one surface where ornament is **cut rather than stroked**: filled stone
  with brass only in the joints, because a hairline laid flat and
  foreshortened to a third of its height reads as a decal.
- Hairline tokens: 1px and 1.5px; a double rule = 2×1px with 3px gap.
- **Ban list**: no multi-stop metallic gradients, no bevel/emboss, no outer
  glows on gold. The only specular effect is a single masked 30° sheen sweep
  (600 ms, once per hover) — that IS the "shimmer". Gate-open flash = frame
  strokes jump to champagne for 150 ms, nothing else.

## Geometry system

Gates 1:1.9 (design 300×570), stepped shoulders = 3 steps of 6px, keystone
sigil zone 96×96. All sigils drawn on that 96 grid: 1.5px stroke, zero corner
radius, at most one accent-filled shape each, matched optical ink. One shared
SVG `<defs>` block for frames — every gate provably uses identical ornament
paths. A **generic fallback sigil** (plain deco keystone) exists for future
services without custom art.

## Typography

- Display caps: EB Garamond (wght ~540), tracking 0.18–0.28em, never below
  0.15em anywhere (including animation end states);
  `font-variant-ligatures: none` on tracked caps.
- Addresses / stat numerals: true caps + `font-variant-numeric: tabular-nums`,
  11–12px, tracking 0.08em. (Not "small caps" — digits have none.)
- CJK: `:lang(zh)` scope, Noto Serif SC wght 600; tracking 0.25–0.35em on
  display lines only, body tracking 0, `text-transform: none`. Slightly larger
  CJK body size to reconcile x-height with Garamond.
- **Signage stays English** in both languages: ATRIUM, SALON, BUREAU, lamp
  words OPEN/DARK — engraved architectural terms (zh translation provided as
  `title`/aria). Sentences (descriptions, headlines, day breaks, settings
  labels) localize fully with tracking 0.
- `@font-face`: `font-weight: 400 800` (EBGaramond-wght.ttf) and `200 900`
  (NotoSerifSC-VF.ttf), `font-display: swap`, both preloaded; no italic
  styles anywhere. Long-lived Cache-Control on `/static/fonts`.

## Entrance animation (timeline)

Total ~2.4 s. Skippable (click/keypress → jump to assembled end state).
Suppression: pre-paint head script sets `data-entered` alongside
`data-theme`; plays at most once per 6 h (localStorage timestamp), suppressed
loads render the hall with a 300 ms fade. Settings → Replay clears the key
and reloads. Reduced motion: simple fade only. Entrance overlay is
`aria-hidden`; the app is usable underneath once assembled.

- 0–450 ms — hairline gold circle draws itself (stroke-dashoffset,
  `cubic-bezier(0.22,1,0.36,1)`).
- 300–900 ms — 24 sunburst rays, 18 ms stagger, scaleY from center.
- 850–950 ms — a 1px seam of gold light splits the center; hold the frame.
- 950–1600 ms — two engraved panels part outward with ~2% overshoot.
- 1500–2000 ms — ATRIUM wordmark settles: per-letter `<span>`s animated with
  `transform: translateX` + opacity (never animate `letter-spacing` — reflow),
  visual tracking 0.5em → 0.22em.
- 1800–2300 ms — **signature moment**: the drawn circle does not vanish — it
  flies and docks as the masthead monogram rosette (shared-element morph),
  while two rays flatten into the ticker's double rules. The entrance
  literally assembles the chrome.
- 1900–2400 ms — gates rise 40px at 80 ms stagger; Ledger fades in.

## Layout & viewport

Desktop-first: optimized 1440–1920px, supported down to 1280px, and opening
into a full three-bay concourse above 1800px (see "The concourse (v4)").
Below 1280px the Ledger moves beneath the stage; below ~900px everything
stacks single-column (masthead → ticker → lever → active gates → receded
gates → Ledger). Mobile is out of scope for v1 but must not break.

**The hall stands on one screen.** No vertical scrollbar at any supported
size — a grand entrance you have to scroll is not an entrance. The vertical
budget is spent in this order: masthead, ticker, arch module, floor. The
module is capped by `min(13.6vw, 26.5vh)` and by `296px x (0.62 + 0.38 x
--ui)`, so a short viewport shortens the arches instead of pushing the plinth
off the bottom, and the floor takes what is left — `--floor-min` is only the
*reservation* it insists on when the hall is taller than the screen. The
concourse's grid row is exactly `--stage-h`: a board is never allowed to
dictate the hall's height.

**The wall claims its headroom back above 1080px.** The arch is aspect-locked,
so on a tall screen every pixel the wall does not take goes to the floor — and
the floor was reading as the largest object in the room. `--stage-h` is
`--gh2 + clamp(80px, 100vh - 1080px, 100px)`: the term is inert below 1080px,
so no short screen inherits a taller hall than it can stand, and above it the
surplus goes to the wall and to the two cases hanging on it. On a 3440x1330
display that moves the floor from 31.6% of the viewport to 27.1%, the arches
up 6% and the boards up 9%.

**Optical scale (`--ui`).** What a 34" desk display changes is physical
size, not pixel count — the 12.5px engraving that reads at arm's length on a
laptop is illegible from across a room. One multiplier drives every piece of
hall lettering and the arch module: `--ui-auto` steps with the viewport
(1 → 1.12 at 1900px → 1.24 at 2400px → 1.40 at 3000px), `--ui-user` is the
reader's own correction from PREFERENCES (0.90 / 1 / 1.15), and `--ui` is
their product — registered with `@property` as a `<number>` so scripts read
the computed value instead of the raw `calc()` token. The arch module takes
only part of the rise (`0.62 + 0.38 × --ui`): the lettering was the
complaint, and a module scaled 1:1 with it costs the floor its depth.
SVG-internal font sizes (gear plates, lever plate, gauge, clock numerals)
are user units inside a viewBox and are deliberately **not** scaled.

Masthead: monogram rosette · "ATRIUM · GRAND CONCOURSE" · localized date
line · settings trigger at right edge. The settings trigger is a rosette of
visibly distinct construction (keyhole center), with a persistent caption
"PREFERENCES" beneath, hover glint, focus ring, aria-label.

**Short screens.** Under 860px of viewport height the hall gives up floor
and a little of the arch module before it gives up the one-screen rule:
`--gate-w`'s floor drops to 164px, `--floor-min` to `clamp(62px, 8vh,
210px)`, and the hall's top padding to 12px. A 1280x800 laptop has ~700px of
usable height for a composition whose stage alone wants 425 of it.

**And the machine comes down with the floor.** The signal desk stands *on* the
stone, so once the floor is a band rather than a field the console has to fit
inside that band: `.assembly` scales 0.78 under 860px and 0.62 under 760px.
Its main-scale coefficient is `0.80 + 0.14 x --ui` rather than tracking the
lettering 1:1 — at the old slope a 3440 screen stood it 275px tall, which was
taller than the stone under it once the wall took its headroom back, and the
lever tip came up level with the skirting.

**And the machine comes down with the floor.** The signal desk stands *on* the
stone, so once the floor is a band rather than a field the console has to fit
inside that band: `.assembly` scales 0.78 under 860px and 0.62 under 760px.
Its main-scale coefficient is `0.80 + 0.14 x --ui` rather than tracking the
lettering 1:1 — at the old slope a 3440 screen stood it 275px tall, which was
taller than the stone under it once the wall took its headroom back, and the
lever tip came up level with the skirting.

## The concourse clock (v3.2)

A grande-complication regulator in a stepped octagonal deco case, showing the
machine's local time. `static/js/clock.js` generates the geometry so the
1000-unit construction lives beside its drive loop; `atrium.css` owns every
colour. All strokes carry `vector-effect: non-scaling-stroke`, so the 1 /
1.5px hairline law holds whether the dial draws at 160px or 620px.

- **Case** — octagon with three-step shoulders (the gate language), a deco
  spandrel on each diagonal, rivets at the eight vertices.
- **Dial** (own 1000 space, scaled 0.855) — knurled bronze bezel, fret band,
  guilloche field (concentric rules crossed by a 90-spoke fan, both under 10%
  ink), 60-mark chapter ring, **twelve** Roman numerals with the quarters in
  wing metal.
- **Complications** on the cardinal axes: 12 moon phase (synodic, reference
  new moon 2000-01-06 18:14 UTC), 3 date on a 31-step ring read through an
  aperture, 6 small seconds, 9 the works — two wheels geared 14:9 turning
  against each other off the seconds arbor.
- **Hands** — pierced Breguet with stepped counterweights; the hour hand
  carries a second, smaller piercing so the two never read alike.
- **Drive** — the loop reads `new Date()` every frame and never accumulates,
  so drift is structurally impossible and a DST step, a suspend/resume or a
  throttled background tab all self-correct on the next frame.
  `visibilitychange` stops the loop while hidden. Reduced motion swaps the
  sweep for a boundary-aligned 1 Hz deadbeat tick —
  `setTimeout(tick, 1000 - Date.now() % 1000)` — which is the mechanism a
  real regulator actually has.

### Composition

The clock is set into a niche in the back wall, between the arches: same
baseline, same head height, one hairline wall rule running behind all three at
the gates' plinth line. `layoutStage()` splits the active gates either side of
the niche and turns each a few degrees toward it, so the wall reads as a
shallow apse rather than three flat panels. Every niche dimension derives from
`--gate-w`, so the dial tracks the arches at any viewport.

Never write `margin: <custom-property> auto` on the clock box — the shorthand
resolves the property's second value into `margin-right` and `auto` into
`margin-left`, which end-aligns the dial. Vertical margin goes on its own
longhands; centring is `justify-self`.

## Stage (triptych composition)

Stage slots are computed from the service registry (`/api/services`), so a
fourth service slots into the flanks symmetrically.

- Active gates stand centered on the axis at scale 1.0.
- Receded gates flank at scale ~0.62, veiled by `rgba(base, 0.55)` + 1px
  hairline, metal desaturated to theme neutral — but name + lamp stay legible
  above the veil.
- Bureau-active: one grand arch center, a Salon gate on each side (symmetric).
- Salon-active: two arches center, Bureau gate stage-right.
- Transition: 600 ms, **transform-only** (translate/scale via FLIP from
  registry-computed slots; no reflow), 60 ms stagger, receding gates start
  80 ms before rising ones, `cubic-bezier(0.4,0,0.2,1)`. Lever re-light
  queues until any in-flight theme crossfade finishes (serialized).
- Receded gates: remain in tab order (after active gates); clicking one opens
  its target directly — never throws the lever — and the click flash
  momentarily lifts the veil.

## The concourse (v4) — the hall gets its aisles, its wall and its floor

**The problem this solves.** The hall was drawn as an object, not a room. At
1440px the object filled the frame and read as architecture; on a 3440px
display the 1720px cap left 860px of bare ground either side and the whole
composition read as a diorama in the middle of a beige desert. A room is
made by a *continuous* wall and a *continuous* floor, so both now run the
full width of the screen and the triptych stands on them.

**Grid.** `#concourse` is `aisle-l · stage · aisle-r`, opening at 2200px;
below that it collapses to the single centre column the hall shipped with
and both boards are hidden (they are ultrawide furniture, not a fallback).
`--aisle-w` spends the *surplus* — `clamp(300px, (100vw − 1700px) / 3.05,
560px)` — rather than a flat fraction, so decoration can never squeeze the
stage. The hall cap rises 1720px → `min(3360px, 100%)`.

The breakpoint is 2200px and not 1800 because two 300px aisles plus their
gaps take ~680px off the stage: at 1920 that left the triptych a column
narrower than itself and the flanking arches ended up half-swallowed by the
arches in front of them, which reads as a bug rather than as depth. As a
second guard `layoutStage()` sizes each flank to the clear column actually
beside the outer arch (`room / gateW`, floored at 0.34) instead of a flat
0.62, so a flank can tuck behind an arch but never disappear under one. That
room is short by a fixed **air gap** of `0.14 × gateW` before the flank is
sized: given the bare remainder the flank grows until it *abuts* the arch in
front of it, and two arches sharing an edge read as one torn shape rather
than as two planes at different depths. The separation is what carries the
recession, so it is reserved, not hoped for.

**Full bleed from inside a centred grid.** Both scenery layers use
`left: calc(50% - 50vw); width: 100vw`. 50% is half the concourse, 50vw half
the viewport, and the concourse is centred, so the difference is exactly its
left offset — no wrapper element, and it survives the max-width cap.

**Back wall.** Plaster field (one two-stop wash, top-lit), a dentil cornice,
and a dado of chair rail + recessed panels + skirting whose top edge lands
on `--gh2 × 0.079` — the gates' own plinth rule, so wall and arches share
one horizontal. Aisle bays carry fluted pilasters (stepped capital, shaft
proud of the field with a shadow behind it, plinth block), one sconce per
bay throwing a pool on the plaster, and a Roman bay number engraved on the
chair rail.

**Bays are measured, not assumed.** `layoutStage()` publishes
`triptychHalf` — how far the composition actually reaches from the axis,
flanks at 0.62 scale included — and the walls are cut against *that*, not
against the stage column, which is far wider than the triptych standing in
it. Each wall then skips the stretch its board is hung over: bays spaced
evenly across the whole span put every sconce and every bay number behind
the board, articulation built and then covered up. Laying them in the
daylight either side also lands a pilaster hard against each edge of the
board, so the board reads as set into the wall rather than stuck onto it.

**Boards.** `STATISTICS` (left) is an instrument case reading the machine the
hub runs on: four needle dials — processor, memory, graphics, traffic — on
one 240° scale with a red sector over the last fifth, a tape of hours run
and store remaining, and the maker's plate off the retired rail at its foot.
It replaced a `DIRECTORY` that listed every service's mark, name, address
and lamp, i.e. said the gates' own three facts back at them a second time
and larger; a board in a hall has to say something the architecture cannot.

The signage reads STATISTICS; the DOM id, the CSS prefix and the route stay
`works`/`wk-`/`/api/works`. That is not drift — the board's *name* is what
it shows the reader, and `the works` is what the data IS (the works of the
machine, read out of the host). `/api/stats` was already taken by the
services' own status route and a JS `stats` binding already holds it, so
renaming the internals would have collided with a live name to make two
different things share one word. The maker's plate still reads ATRIUM
WORKS because that is a manufacturer's mark, not the board's title.
Dials are sized by the ROW the grid gives them, never by their own width —
a flexed replaced box with an aspect ratio resolves off its intrinsic width
and shrinks to a thumbnail the moment the case is short, taking its own
caption out under the cell's clip. Captions run at 1.15 leading for the same
reason: the default 1.5 under two stacked lines costs the dial above them a
third of its face.

## The Almanac (v4.4) — the east board

`BULLETIN` (right) was a glazed notice case: four dispatch stubs, drawn from
the unfiltered feed, under a ticker already scrolling those dispatches and
beside a Ledger already listing them. That is the DIRECTORY mistake a second
time — a board saying back what the architecture around it already says, and
this one said it three times. `ALMANAC` replaces it with the one fact
nothing else in the building carries: where the sun is standing over the
machine, right now.

**Two halves that fail independently.** Sun and moon are ARITHMETIC — NOAA's
sunrise equation and a synodic phase, run in the page on the coordinates the
hub hands over. That is what keeps the bead moving through the day on a
board whose forecast is a quarter of an hour old, and what leaves an
instrument in the case when the weather service is unreachable. The forecast
is the only call in this hub that leaves the machine: `/api/almanac` behind
a 15-minute TTL and an `asyncio.Lock` (two tabs on a cold cache are two GETs
otherwise), a 6s timeout, and it never raises. An outage prints an em dash
and NO READING in the reading register, drains the vitals to 45% and leaves
the sky untouched — the same law as a dial with no reading resting at zero.

**The plate is a horizon dial, not a dome.** The sun runs one ellipse
through the whole 24 hours: solid above the horizon rule, dotted below it,
the two crossings engraved RISE and SET with their times at the plate's
outer edges (an ellipse drawn to the full width leaves the only lettering on
the instrument nowhere to stand but on the curve). Elapsed daylight is inked
in gold as far as the day has got — after sunset that is all of it, because
the plate reports daylight SPENT, not merely where the sun is. Hour ticks
stand off the day arc as a chapter ring; the apex and nadir carry a fiducial
each.

Two things it deliberately does not draw. A **meridian**: local noon is the
midpoint of sunrise and sunset by construction, so the line would sit dead
centre on every plate ever printed — ornament impersonating an instrument.
A **clock**: there is a grande-complication regulator the size of a doorway
standing between the arches, and the bead's job is the one thing it cannot
say, which is *where in the day* this is.

**The viewBox is measured, never fixed.** The aisle is 300px wide at 2200
and 560 at 3440 while the case keeps its height, so one fixed aspect either
letterboxes the plate into a third of its register or balloons out of it —
and a void inside a lit case reads as a board that failed to draw. `skyBox()`
reads the register and inscribes the ellipse in it, measuring BEFORE the old
plate is removed (emptying the register first collapses it to nothing and
the new plate is inscribed in a box of zero height).

**The moon is a real terminator.** An ellipse, not a chord and not a second
circle offset sideways — both shortcuts get gibbous phases visibly wrong,
which is the first thing an almanac reader looks at. The phase is carried by
VALUE, so the two faces keep their order in both themes: onyx prints a lit
moon on a night sky, ivory prints the engraver's moon with the shadow inked
and the lit face left as paper. That paper is `--base`, not `--surface`: on
the case's own tone a full moon comes out as an empty ring, which reads as a
disc that failed to render. The bezel is what says an object is there.

**Signage stays English, sentences localize** — as everywhere else. The
station line at the foot (`PITTSBURGH · 40.44°N 80.00°W`) is an ADDRESS
engraved on the case and keeps the gates' contract; the localized place name
lives in the subtitle. One trap: an SVG `<text>` does not inherit the body's
zh stack, and `--serif` carries no CJK face, so the plate's own labels need
`html[lang="zh"] .al-arc text` or they come out in a different serif from
every other Chinese word in the hall.

**Where the hall stands.** `almanac.PLACE`, overridable by dropping
`state/almanac.json`. There is no place picker: this board is furniture, and
a hall does not get a control for moving itself. A malformed override is
ignored — a lobby board has nowhere to report a parse error to.

**The almanac poll.** `/api/almanac` every 10 minutes and the plate re-drawn
every 60 seconds, both gated on `almanacVisible()` for the same reason the
works board is: below 2200px the case is `display:none`, and a hidden panel
must not have the hub calling a weather service on the reader's behalf. The
60s tick is also the way back from a cold start — the case can be opened by
a resize long after the boot fetch declined to run, and ten minutes of a
blank plate is not a wait, it is a fault.

**The works poll.** `/api/works` on a 4s cadence of its own — instruments
read live or they are decoration — but only while the board is genuinely on
screen. Below 2200px it is `display:none`, and a hidden panel must never
keep the host sampling: `worksVisible()` gates every tick, and the hub's own
TTL means an unopened panel spawns no `nvidia-smi` at all.

**Floor (v4.2) — cut, not drawn.** One plane hinged on its NEAR edge —
`transform-origin: bottom center` with `rotateX(58deg)` — so the hall recedes
*toward* the wall the way a floor does. Hinged at the top it receded downward,
which is a ceiling seen from underneath. Its box runs from the stage baseline
to the screen's own bottom edge, and `#floorplane` is *backed* in `--terrazzo`
so whatever the plane's length and the perspective divide leave uncovered is
still stone.

v4.1 laid a 16-point compass rose over it in hairline geometry: uniform
strokes, perfect radial symmetry, ATRIUM set dead centre. That is a *logo
lying on the ground*, and it read as one — stiff, and pasted on rather than
built in. A real deco lobby floor is not drawn at all; it is quarried tones
butted against each other with brass divider strips in the joints. So the
whole inlay is now cut from stone (`--stone-a/-b/-c`, per theme), the pattern
is carried by VALUE because value is the only thing that survives being laid
flat and foreshortened to a third of its height, and the brass never outlines
a shape — it only fills a joint. The wordmark went with the line work: the
masthead already says it, and a floor is not a letterhead.

What is on the plane, near to far: a **runner** (a rectangle in floor space,
which the projection turns into the trapezoid a runner actually is), running
off the near edge with its fringe at the far end; the **medallion**, two
banded courses of alternating wedges on 32 and 16 divisions with a bronze
eight-point star, a tessera ring and a bronze boss — the *concentric* break is
what stops a radial fan reading as a paper doily; a **square-in-circle
roundel** over each aisle, a different construction so the floor reads as a
set of inlays rather than one motif stamped three times; **aggregate**, 700
chips on a fixed hash, three tones, one in eleven in brass, biased toward the
viewer; a border course and key band in plane units; and **reflections**.

**Reflections.** The stone is waxed, so every arch, the clock and both aisle
cases come back up off it. The smears are drawn in *plane* space and left to
the one `rotateX`, which is what makes each converge exactly as its own arch
does — painted on the glass they would stay parallel and read as stripes. A
point at depth `u` divides by `f = 1/(1 + u/L)`, so a column that is vertical
*on screen* is a wedge on the plane: hence the trapezoid, 0.98 of the offset
at the wall and 0.49 at the near edge. They carry `--metal`, so the whole
floor changes temperature the moment the lever is thrown.

Over all of it: a skylight pool, the room's own shadow across the near ground,
and a contact shadow where the stone meets the skirting — a wall and a floor
share a hard junction, not a horizon, so there is no atmospheric fade there. A
foreground balustrade runs along the flanks only: carried edge to edge it read
as a fence pinned across the view, flattening the very depth it exists to
create.

**Throw plates.** `SALON` and `BUREAU` used to float on the terrazzo either
side of the lever: engraved ink on pale stone, foreshortened by the floor's
own projection, at the one place in the hall with no plate behind them — the
least legible lettering in the building, and it labelled its only control.
They are brass plates on the quadrant now, countersunk screws and all, with
the live wing lit. A signal lever's throws are named on metal because a plate
is a *thing* and not a caption, and it answers the question the bare machine
left open: what does pulling this do.

**The perspective distance is a function of the floor's height.** `d = 2H ·
tan θ` puts the horizon at twice the box height, and `377% = 2H / cos θ` is
the plane length whose far edge then projects exactly onto the box's own
top. H is the box's used height, which CSS cannot read back into a `calc`,
so `sizeFloor()` writes it as `--fh` on every layout pass — safe from
feedback because the plane is absolutely positioned. Fix `d` instead and the
far edge lands short of the skirting on a tall screen and long on a short
one. The plane is 204% of the screen wide for the same reason: at the
skirting the divide compresses it by exactly 2, and a plane only as wide as
the screen pulls away from the corners.

**Six traps, recorded so they are not re-sprung.** (1) A 3D-transformed
child still contributes to the scrollable overflow area: the plane's near
edge projects far past its own box and hung a scrollbar on a hall that
otherwise fit the screen exactly — `#floorplane` clips it. (2) Sizing a
floor inlay off the plane's *width* makes a circle whose diameter runs off
the near edge, so only its far arc ever reaches the screen; inlays are sized
off the plane's height and anchored to the near edge. (3) `#hall` needs
`min-height: 100vh` with the concourse as its `1fr` row. Content-height
alone left ~270px of page ground under the terrazzo — a band brighter than
both the floor above it and the machinery below, which is exactly how it
read, and nothing *inside* the floor could reach it. (4) A shadow on this
floor cannot be mixed from `--edge`: in ivory that token is within four
levels of `--terrazzo`, so the near-field gradient was invisible and the
whole floor sat inside an 18-level range. Shadows come from `--shade`, which
each theme derives from ink.
(5) A square `viewBox` with
`preserveAspectRatio="none"` stretched over a plane three to six times wider
than it is long turns a round chip into an 8:1 sliver that reads as a scratch
in the slab seams; `CHIP_SQUASH` puts `rx` back in the same ballpark as `ry`
across every viewport the hall supports. (6) `var()` does not resolve in an
SVG *presentation attribute*, so `stop-color="var(--metal)"` parses to
nothing and the reflections painted fully transparent — with all six polygons
present and correct in the DOM. Gradient stops take a class and the colour
comes from the stylesheet.

## Gates (R9)

Arched portals per the geometry system. Face: keystone sigil (Autopilot =
winged disc; Ground Station = dish over ringed planet; Outreach = deco
compass), name caps, one engraved description line, destination address
(`127.0.0.1:8767` / `:8768 · updates` / `:8802`), status lamp, one live stat
(odometer roll on change).

- Lamp states: `…` (checking — until first /api/status), OPEN, DARK. The lamp
  always renders its text label — state never depends on luminance alone.
- DARK gate: engraving at 35% opacity, lamp = hollow diamond (extinguished,
  not alarmed — no red), hover still lifts; clicking shows an inline engraved
  notice with the service's launcher hint (from registry) instead of opening
  a dead tab. All-dark hall: one engraved line "The hall is dark — no
  services reachable."
- OPEN gate click: 150 ms champagne flash, then
  `window.open(url, 'atrium-<serviceId>')` — named window so each service
  reuses one tab.
- Hover: frame strokes light sequentially, one sheen sweep, 4px lift;
  focus-visible mirrors hover.

## The Ledger (R10)

Gilded spine left; plaques are **never plain rectangles** — each has a
stepped deco outline (clip-path) and hangs from the spine via its origin
medallion (the medallion physically overlaps the spine). Alternating offsets
capped at 8–12px; every plaque's right edge aligns to one shared hairline so
the column keeps a hard deco edge. TODAY / EARLIER day-break double rules run
full column width. Plaque anatomy: medallion (service sigil; gold rim Salon,
platinum rim Bureau) + localized headline + detail line + relative time.
Plaques are links opening the dispatch url.

- **Read is what the pointer rested on**: unread dispatches get a champagne
  rim + small ◆ marker; the Ledger itself always shows the full window. A
  dispatch is marked read when the pointer has rested on its card for
  **420 ms**, when it is focused by keyboard, or when it is followed through
  to its service. Nothing else marks anything: opening or closing the drawer
  clears no plaque, because a card three screens down was not read by the act
  of shutting a drawer over it. Two localStorage keys back this — `atrium.read`
  is the set of dispatch ids, pruned to the ids still inside the feed window
  so it cannot grow forever; `atrium.lastVisit` is now a frozen **floor** left
  by the old close-stamp, kept only so the change of model does not resurface
  a fortnight of dispatches the reader already dismissed.
- **The dwell shows its work**: resting adds `.reading`, which drains the
  champagne rim back to the ordinary hairline and closes the ◆ over exactly
  the 420 ms the timer runs. A mechanic with no button to press otherwise does
  something invisible and then jumps; leaving early drops the class and the
  rim refills, so an aborted read looks aborted. Reduced motion keeps the
  timing and drops the travel (the diamond fades where it stands).
- 420 ms is chosen against the traverse, not the glance: reaching the drawer's
  close button crosses every plaque in the column, and marking on bare
  `pointerenter` would empty the badge as a side effect of aiming at the
  hatch. Touch is excluded outright — a tap fires `pointerenter`, which would
  mark dispatches read for being scrolled past under a thumb.
- **Unread signal (masthead)**: one 9 px disc seated at 45° on the hatch
  housing ring — an annunciator on the dispatch cap, not a badge pinned to
  the button's bounding box. Carries no numeral: the count is exposed through
  the button's tooltip and an `.sr-only` span, so the mark stays a mark. Flat
  fill + a single `--machine-edge` seat hairline; the ban on outer glow means
  value contrast does the work of "lit", which is why the colour is
  per-theme — champagne on Onyx bronze (13.9:1), `--gold-text` on Ivory's
  greige housing (4.1:1, where champagne would be 1.9:1 and read as nothing).
  Motion is arrival-only: a single 260 ms seat when the count *grows*, never
  on a re-poll that returns the same dispatches, since the hall at rest is
  silent architecture.
- Filter chips ALL / SALON / BUREAU: session-only, reset to ALL on every
  load; **no code path ties the lever to the chips** (R11). Chips are a
  radiogroup with arrow keys.
- Empty state: small ornament + "No dispatches". Loading: hairline-pulse
  plaques (no gray skeleton blocks).
- Client keys DOM nodes by dispatch id — re-polls never re-animate existing
  plaques; same-id dispatches update in place.

## Ticker (status band, not an echo)

The band under the masthead carries **status segments** (LINES OPEN n/3 ·
per-gate live stats) plus only dispatches **still unread**. When nothing is
new: a static line, no scroll. Pauses on hover AND focus; reduced motion =
static line with at most a slow crossfade rotation. The ticker draws from the
same unfiltered feed as the Ledger and ignores both the lever and the chips
(R11). It is the one surface a read does **not** update on the spot: it is a
marquee, and rebuilding the track mid-scroll snaps it back to the start, so it
catches up on its own poll instead.

## Mode lever (R11)

Two-position lever plaque, SALON ◆ BUREAU: `role="switch"`, Space/Enter
toggles, aria-checked. Throwing it re-lights the three metal surfaces and
re-composes the stage; it never touches the Ledger or ticker content.
Persisted in localStorage.

## Settings — PREFERENCES (R4/R5)

Full-screen overlay, deco clip-path sweep reveal, focus-trapped, Esc closes,
close button top-right. Engraved plaque radios:

- Appearance: Onyx / Ivory / Follow system (follow-system attaches a
  `matchMedia` change listener and applies the 400 ms crossfade live)
- Language: English / 中文
- Engraving size: Fine / Standard / Signboard — the reader's `--ui-user`
  correction on top of the viewport's own step. Resolved pre-paint from
  `atrium.ui` like the theme: type that resizes after first paint reflows
  the whole hall in front of the reader. Changing it re-solves the stage,
  because `--ui` moves the arch module as well as the lettering.
- Motion: Full / Reduced (default from `prefers-reduced-motion`)
- Replay entrance

All persisted in localStorage. No theme/language controls anywhere else.

## i18n

All strings via en/zh dictionary. Feed headlines composed client-side from
`kind` + `params` so already-fetched dispatches localize on switch. Relative
times and date line localized. Hairline rules are flexbox-driven from text
width, never absolutely positioned (zh/en width shift).

## Backend (FastAPI, 127.0.0.1:8769)

Python 3.11 global interpreter (fastapi/uvicorn/httpx verified). Launcher:
`run_hub.bat` (`PYTHONUTF8=1`, `cd /d`, append log) + `run_hub_hidden.vbs`.

Endpoints:

- `GET /` — static frontend
- `GET /api/services` — the registry, drives gate rendering: `[{id, name,
  wing, url, addr, sigil, desc_key, launch_hint, order}]`. Registry entry
  mandatory per service; adapter and custom sigil optional (no adapter =
  lamp-only gate, no dispatches).
- `GET /api/status` — served **from adapter caches** (no on-demand probing):
  `{services: {id: {state: 'open'|'dark', latency_ms, note}}, generated}`
- `GET /api/feed` — `{dispatches: [{id, origin, wing, kind, params, ts,
  url}], generated}`
- `GET /api/stats` — `{stats: {id: {kind, params}}}` (piggybacked by client)
- `GET /api/works` — host instrumentation for the west board:
  `{cpu:{pct,cores}, mem:{pct,used_gb,total_gb}, gpu:{pct,used_gb,total_gb,
  util_pct,name}, net:{pct,down_mbs,up_mbs}, disk:{pct,free_gb,total_gb,
  label}, hub_uptime_s, host_uptime_s}`. Every member is nullable — no
  `psutil`, no NVIDIA card and no throughput baseline yet are all normal
  states. `psutil` supplies processor/memory/traffic/store, `nvidia-smi`
  the card; both sit behind TTLs (3.5s and 6s) and run in a worker thread,
  so an idle hub samples nothing and a subprocess never touches the loop.
  The traffic dial's full deflection is a saturated gigabit line.
- `GET /api/almanac` — the east board: `{place:{name, name_zh, lat, lon,
  timezone}, weather:{code, label, label_zh, now_c/f, high_c/f, low_c/f,
  precip_prob, wind_kmh, sunrise, sunset, utc_offset_s}|null, age_s,
  generated}`. `weather` is nullable and the board is built for it; `place`
  never is, because the sun and the moon are drawn from it alone. Open-Meteo,
  no key, one GET per 15 min — 120 s after a miss, since a service that is
  down stays down past one board poll — serialized on a lock.

**Time contract**: feed `ts` is **epoch milliseconds**. Normalization:
Ground Station `ts*1000`; Autopilot ledger `ts*1000` (epoch seconds on the
wire); outreach `invitedAt` as-is,
`finishedAt*1000`; anime naive ISO via
`datetime.fromisoformat(s).timestamp()*1000` (machine-local — never
`utcnow()`; machine is UTC+8, the classic bug shifts 8 h). Same rule for
`last_sync` staleness. Day breaks computed in the browser's local timezone.

**Deterministic dispatch ids** (feed idempotent across hub restarts):
`gs:<seq>` · `ap:<seq>` · `anime:notif:<bgm_id>:<detected_at>` ·
`anime:unresolved:<bgm_id>` ·
`outreach:queue-ready:<local-date>` · `outreach:progress` (single mutable
item, replaced in place) · `outreach:invites:<local-date>` (mutable).

### Adapters

**Anime Autopilot** (`127.0.0.1:8767`, GET-only, server-side — no CORS.
*Never POST*: `/api/notifications/read` would eat the user's panel banners):

- 60 s: `GET /api/notifications` (~50 ms). Known kinds enumerated:
  `kind == "completed"` → finished-show; **key absent** → premiere
  (`promoted` flag); any other kind value → drop and log, never default into
  the premiere branch. Window: `read == false` + `detected_at` within 7 d.
  `GET /api/unresolved` → warning dispatches.
- 5 min: `GET /api/overview` → grace alerts (`status=='grace'`,
  `grace.expires` epoch s), daemon health (`last_sync` stale >15 min,
  `qb_ok`), watching count stat.
- Episodes ("which anime landed"): `GET /api/events?after_seq=<cursor>&limit=200`,
  Autopilot's append-only ledger, with the cursor in `state/cursors.json`.
  Kinds `episode.landed` / `show.subscribed`; any other kind → drop and log.
  `ts` is epoch **seconds** here and must be multiplied on the way in.
  Autopilot returns events **ascending** by seq (`hasMore` means NEWER matches
  remain), so the catch-up walks the cursor FORWARD — the mirror image of the
  Ground Station feed below. Cold start backfills the recent window only; a
  seq regression means the ledger was reset, so drop the group and resync.
  Offline fallback reads `X:\Github\anime-rss-auto\events.json` directly.
  Superseded a qBittorrent snoop that inferred episodes from torrent names:
  the ledger means "hardlinked into the library" rather than "queued", it
  survives the dedupe pass deleting the torrent, and it is durable across a
  hub restart.
- Link `http://127.0.0.1:8767/`. Hint: `run_webui_hidden.vbs`.

**Ground Station** (`127.0.0.1:8768`, header `X-PMH: 1` on *every* call
including the ping probe):

- 60 s: `GET /api/ping`; if `.seq` == stored cursor → done. Else page
  `GET /api/feed?after_seq=<cursor>&limit=200` until short page. Relayed
  events `updated|removed|banned`; `downloaded` is muted (`GS_MUTED_KINDS`)
  — it retells what `updated` already said and is the one kind Ground
  Station raises regardless of the mod's *cared* flag. Map `appId`→game via
  `/api/state` `games[]` (cached per session). Changelog snippet: local file
  `X:/Github/pdx-mod-hub/data/changelogs/<modId>.json`, match
  `entries[].ts == event.ts`; never call `/api/mods/:id/changelog`.
- **Cursor persisted** in `state/cursors.json` (atomic temp+replace). Cold
  start: read current `.seq`, backfill only events within the 48 h window,
  set cursor.
- Offline fallback: `X:/Github/pdx-mod-hub/data/events.json`, same cursor.
- Link `http://127.0.0.1:8768/#/updates`. Stat: mods tracked / updates
  pending. Hint: `scripts\run_hub_hidden.vbs`.

**Outreach Desk** (`127.0.0.1:8802`, GET-only):

- 60 s: `GET /api/ping` then `GET /api/progress`. Queue ready:
  `done >= total && total > 0`. Dispatches: queue-ready(N), progress
  (mutable), drafter error. Invites-today: `data/panel_state.json`
  (`invitedAt` epoch **ms**, local-day compare).
- **Privacy enforced server-side**: the adapter emits params through an
  allowlist of count keys only (`done, total, n, target`); `current`,
  names, draft text, non-panel URLs never leave the hub process; dispatch
  `url` is always `http://127.0.0.1:8802/index.html`. Unit test feeds a fake
  progress payload and asserts the serialized feed contains no `current`.
- Offline fallback: read the JSON files directly (UTF-8).
- Link `http://127.0.0.1:8802/index.html`. Hint: `run_server_hidden.vbs`.

### Robustness

Per-source TTL caches; 2 s timeouts; per-source degradation (source down →
DARK, feed keeps others). File fallbacks catch `OSError` as well as
`JSONDecodeError` (Windows sharing violations) and reuse the last good
payload. Feed capped ~60 items, deduped by id, sorted ts desc.

## Client polling

`/api/feed` + `/api/status` (+stats) every 45 s, gated on
`document.visibilityState`, immediate refetch on tab refocus.

## Implementation notes (60 fps)

Stage gates live in fixed slots animated exclusively via
`transform: translate/scale` + opacity (FLIP). Theme/wing re-lighting via a
**scoped** transition list (`color, background-color, border-color, fill,
stroke, opacity`) on themed elements — no universal `* { transition }`.
Custom properties don't interpolate; the consuming elements transition.
Wordmark letters are spans with transforms. `prefers-reduced-motion` and the
Motion setting collapse all of the above to fades/instant.

## Accessibility summary

Tab order (v3.1): masthead → ticker → active gates → receded gates → chips
→ Ledger plaques → signal-desk lever (footer-last). Lever `role=switch`;
chips radiogroup; settings overlay focus-trapped + Esc; entrance overlay
aria-hidden; lamps always carry text; AA contrast per the token matrix.

## Depth pass (v3 — client mandate: keep the motion, kill the flatness)

Depth comes from GEOMETRY, LIGHT and OCCLUSION — never filter soup. One key
light, near-vertical (skylight): every shadow offset points down, slight x.

- **Scene**: `perspective` as a plain property on `.gate` (never
  `preserve-3d` on #gates — it would replace the load-bearing active/receded
  z-index contract with depth sorting). Per-gate chain:
  `.gate {perspective:900px}` → `.g-pose` (`preserve-3d`, static wing tilt,
  transitioned with the stage choreography) → `.g-shell` (pointer parallax,
  NO transition — a transition would smear the tilt) → flat children (the
  intra-gate z-index stack survives verbatim).
- **Triptych pose**: receded flanks tilt inward `rotateY(±10deg)` via
  `--side` set by layoutStage — altar-wing composition.
- **Pointer parallax**: one rAF lerp loop (k≈0.1) writes `--par-x/--par-y`
  (unitless −1..1) on #stage; shells consume via calc (±5°/−3°), receded
  shells at half strength. Gated on `(hover:hover) and (pointer:fine)`,
  `data-motion!=reduced` (checked live — the CSS kill-switch can't stop rAF
  writes), `visibilityState`, and starts only after the entrance finishes.
- **Slab thickness**: `.g-back` — an arch-shaped backing layer (border-radius
  arch, so box-shadow works) offset along the light vector, carrying the
  two-shadow grounding pair: tight contact + broad soft penumbra
  (`--shadow-drop`/`--shadow-soft` theme tokens; ivory shadows derive from
  ink, never pure black).
- **Floor**: one-point-perspective plane under the gates
  (`rotateX(~55deg)`, own perspective), deco seam grid converging behind the
  stage, dissolving into the base color at the far edge (atmospheric
  falloff; the fade also hides aliasing). The stage-glow line remains as the
  horizon sheen at the plinth.
- **Reflections**: each gate carries a `.g-mirror` — a scaleY(−1) clone of
  its frame below the plinth, gradient-masked to die within ~35% height —
  polished-floor grounding that rides the gate's own transform.
- **Entrance in 3D**: `#entrance {perspective:1100px}`; panels hinge at the
  outer edges (`transform-origin: left/right center`) and swing open
  `rotateY(±74deg)` + outward translate, 0.9 s; a subtle stage dolly
  (scale 0.965→1) lands with the gates.
- **Ledger/lever depth**: chamfered plaques get
  `filter: drop-shadow()` ×2 on `.pl-frame` (box-shadow dies under
  clip-path), excluded on ghosts; hover lifts 2 px. Lever plaque gets one
  small drop-shadow.
- **Atmosphere**: one fixed front sheet (vignette + 2.5% grain, z between
  hall and entrance) unifies the layers and kills banding.
- **Ban list (amended)**: occlusion shadows (dark, never gold-tinted), the
  floor grid and frame reflections are now sanctioned; still banned:
  multi-stop metallic gradients, bevel/emboss highlights, outer glows on
  gold. Static depth (pose tilt, shadows, floor) persists under reduced
  motion — depth is not motion; only parallax and the entrance are.

## Steampunk pass (v3.1, revised v4.1) — the signal desk and the
deco-machine fusion

Design stance (from the BioShock/Rapture research): kitsch is prevented by
COHERENCE, not restraint alone. Machinery is sublimated by finishes — the
mechanism lives inside architectural casework and is revealed at exactly one
deliberate aperture per region. Mechanism density is a gradient that peaks
at the machine standing on the floor and dies before the architecture
above.

### Material law — the oiled-bronze family

A third metal tier joins gold and platinum, defined per theme:
`--bronze-deep` (machine housings), `--bronze` (machined parts/strokes),
`--steam` (vapor — warm champagne-alpha in Onyx; **ink-derived** in Ivory,
white steam on paper is the failure mode), `--machine-edge` (wells, slots,
notches — dark against the housing in BOTH themes; `--edge` is a paper tone
in Ivory and vanishes). Flat fills + 1/1.5 px hairlines only; patina is a
tone, never a noise/grunge bitmap. The existing bans (multi-stop metallic
gradients, bevel/emboss, outer glows) extend to bronze. Wing metal stays on
exactly three surfaces; the lever's polished grip zone inherits the old
needle's slot.

**Texture amendment**: exactly two FLUX.2-generated bitmaps are sanctioned
as material garnish — the engine-turned band overlay and the riveted-iron
door overlay — and only after flattening to low-contrast mid-gray
(±8..±24) so they overlay-blend into the housing tone. They must never
carry color, read as photographic grime, or appear on paper/plaque
surfaces. Everything else remains stroke-built SVG.

### New ornament classes (with their own density laws)

- **Rivet line**: 1.5 px filled dots at even pitch, only at plate seams of
  machine housings (quadrant plate, flanges, maker's-plate corners) —
  never on paper/plaque surfaces, never on gate frames.
- **Knurl band**: short radial ticks at even pitch — the machined cousin of
  the Greek key; bridges deco and machine. Allowed on the masthead rosette's
  outer ring, dial bezels, grip surfaces. One ring per element.
- **Machined gear**: trapezoid teeth on ISO proportions (addendum 1.0 m,
  dedendum 1.25 m), spoked rim, evenodd cutouts. A gear MUST mesh with a
  partner and rotate only when driven (max 2 gears page-wide, both on the
  desk). No idle motion anywhere: the hall at rest is silent architecture.
- **Steam puff**: event-only — 4–6 soft sprites per burst from the one vent
  on lever throw (plus one wisp as the entrance doors part). Never ambient.
- **Pneumatic main**: the Ledger spine re-read as a brass dispatch tube —
  edge hairlines + collar rings at day-break junctions; medallions gain one
  concentric ring (carrier end-caps). Pipes must plumb something.

### The signal desk (`#signal-desk`)

The only region with full mechanism density; even here the drive train must
be traceable: lever → hidden rack → gear pair → vent.

**What changed in v4.1.** This was a full-bleed bronze rail across the foot
of the page. Once the hall had a floor, the bar read as a strip of UI taped
under the picture rather than as anything standing in the room — so the
housing band, the LINES dial (the ticker already counts the lines) and the
maker's plate are struck, and what remains is the machine itself, planted
centre stage on the terrazzo. The maker's plate is re-hung at the foot of
the works board it names. The desk deliberately stays OUTSIDE the aisle
grid: the boards fold away below 1800px, and the wing switch may never fold
away with them.

- **Placement**: `position:fixed; bottom: 10px·--ui` centred, a body-level
  sibling AFTER `#hall` (never inside — parallax vars are scoped to #stage;
  a transformed ancestor would trap the fixed box). `z-index:50` — above
  hall content, **below** prefs scrim (60), grain sheet (95), entrance
  (100). The box is transparent and `pointer-events:none`; only the lever's
  hit surface takes the pointer. `body` reserves no bottom clearance any
  more — the hall owns every pixel down to the edge.
- **Anatomy** (signal-box pattern): a notched quadrant plate (ratchet teeth,
  deep end notches, SALON/BUREAU engraved at the arc ends) and the lever —
  bronze arm, polished `--metal` grip zone, riveted number plate, ±16°
  throw; behind it a hairline-framed aperture well showing the meshed gear
  pair, and the steam vent pipe with its collar. The assembly scales with
  the lettering (`0.72 + 0.28·--ui`).
- **Drive**: one scalar `--drive` (0 = salon, 1 = bureau) written by a JS
  rAF driver onto `:root`, so anything in the hall can read it; lever (±16°), gear A (90°) and pinion B (−180°, ratio
  −N_A/N_B) all derive via calc — sync is structural. Meshing law: shared
  module, center distance = r_pA + r_pB, interleave phase
  `((1+N_A/N_B)·φ + 180 − 180/N_B) mod (360/N_B)` baked as a static
  transform (never in the CSS-animated one).
- **Feel**: weighty piecewise ease (fast start → ~4.5% overshoot → damped
  clank settle, ~520 ms); steam burst latched at 55% of the throw;
  interrupt-safe (re-toggle reads current `--drive`). Reduced motion: snap
  `--drive`, no steam, no overshoot — gears stay correct for free.
- **Layers**: `.desk-art` (static housing, `contain: layout paint`,
  painted static gear shadows) / `.desk-fx` (the three movers + nozzle,
  overflow visible so puffs escape) / `#lever` (the invisible hit surface —
  same id, `role=switch`, Space/Enter, aria-checked, i18n attributes; all
  existing JS bindings survive relocation verbatim). The gear well clips
  via `overflow:hidden` on an inner div — never `clip-path` on the shell.
- **Boot**: `html[data-boot="suppressed"] #signal-desk` mirrors the hall
  fade; under a playing entrance the desk rises at ~2.1 s. Tab order is now masthead → ticker → gates → chips →
  plaques → lever (footer-last, re-documented).

### The console casework (v4.3)

**What was wrong.** v4.1 put the machine on the floor but never gave it a
body. What stood there was three loose parts sharing a patch of terrazzo: a
lever pivoting at y=212 on nothing, a quadrant arc hanging in mid-air above
it, and an aperture cut into no surface at all. Two measurements say it
better than any amount of looking:

- the housing tone `--bronze-deep` against `--terrazzo` is **1.05:1**. Every
  solid face on the machine was invisible; only the `--bronze` hairlines
  (2.58:1) survived, so the eye received a handful of strokes and no volume.
  `scripts/contrast.py` is the check.
- the aperture was **176×56** — the one bare rectangle in a hall built out
  of arches, arcs and stepped shoulders — and an 88-wide gear crossing a
  56-tall slot shows as a shallow band with no centre. The drive train was
  drawn in full (63 nodes) and read as a stray arc.

**The fix is the stance already in this document**: mechanism is sublimated
by casework, and revealed at exactly one deliberate opening. So the parts
are housed in a bronze console that *stands* on the stone —

- **Body**: stepped plinth (two courses on the gates' own 6px shoulder),
  fluted pilasters (the aisle bays' articulation at furniture scale), a
  knurl frieze, a two-step cornice cap. Every profile is already in this
  building; that is what keeps it furniture in this room rather than a
  machine parked in it.
- **Tone**: three flat planes — `--bronze-cap` (lit tops and proud faces),
  `--bronze-face` (fronts), `--bronze-deep` (recesses). `--bronze-face` is
  new and exists because the old housing tone was specified when the desk
  was a rail with the page behind it. Face-over-floor is 2.19:1 (onyx) and
  2.29:1 (ivory); cap-over-face is 1.38:1 and 1.35:1, so both themes get the
  same turn between planes. Ivory inverts the stack: a bronze console on
  pale stone is the *dark* object in the room.
- **Aperture**: a semicircular arch, 112×60, with archivolt and keystone —
  the hall's own figure, and narrow enough that the gear inside reads as
  round (48px of it showing instead of 34, across a 112 opening instead of
  176).
- **The lever is bolted to it.** The pivot moved from the floor (y=212,
  *below* the console's own foot) onto the plinth top at y=186, and the arm
  is `scale(.7)` about that pivot so its throw stops sweeping wider than the
  machine it belongs to. The quadrant plate is on the same 0.7 — it is what
  the arm's pawl runs on, and if one scales without the other they stop
  being one mechanism. At 0.7 the arc band lands at y 90-102, which is the
  frieze: the plate is screwed to the console's face instead of floating.
- **It stands, so it returns.** The waxed floor brings back every arch, the
  clock and both aisle cases; the machine was the one object in the hall
  with no reflection, which is precisely why it read as pasted onto the
  floor. It gets a contact shadow and a three-course return (flat tones, not
  a gradient — over 14px the parallel-smear error is sub-pixel, so the
  plane-space rule the tall reflections need does not bind here).
- **The vent leaves at the top.** The stack used to run *down* the front
  from y=112 to 202, which — once there was a console behind it — read as a
  black post driven through the casework. It rises off the cornice at x=240,
  the one gap clear of both the arch (ends 236) and the BUREAU plate
  (starts 254).
- **The throw plates sit on the cap**, bottom-anchored at y=96. Anchored
  from the top they drifted off the cornice as soon as `--ui` changed the
  label's own height.

**Verifying it (and the trap that eats an afternoon).** Headless Chrome
reports `innerHeight` ~99px SHORTER than the surface it composites the
screenshot onto. Document-flow layout is unaffected — the masthead lands
where `getBoundingClientRect` says — but everything `position:fixed` to the
BOTTOM of the screen, which is this entire desk, is *painted* 99px lower
than it measures. Crops taken from raw probe numbers therefore land on the
floor tiles just under the machine, which reads exactly like "the gears
aren't rendering" and sends you debugging drawing code that was correct all
along (the parts were in the DOM the whole time: 42 + 21 + 37 nodes).

- `scripts/look.py <name> <selector>` is the fix: one Chrome run for both
  the PNG and the box read-out, with the offset re-applied to the
  bottom-anchored parts. Use it instead of pairing shot.py with probe.py.
- `?probe=3` paints the live boxes into the shot and outlines the hardware
  from inside the page — numbers and pixels in the same image cannot
  disagree. That is what settled it.
- `scripts/contrast.py "#a" "#b"` before trusting any machine tone against
  the floor it stands on.
### Entrance beat — the vault unlock

One new beat inside the existing timeline (total unchanged, ≤2.7 s): the
drawn gold circle grows a 4-spoke handwheel and 8 radial bolts (`.wheel`
class at ~700 ms) — wheel turns 60°, bolts retract inward in sync (a vault
throws all bolts at once; the synchrony is the luxury) — then the seam
splits, the doors swing, and one steam wisp rises from the seam foot
(spawned via the `at()` helper so skip clears it). The wheel docks with the
burst into the masthead rosette — its spokes echo the rosette cross-hairs.
Door panels gain rivet columns along their meeting edges inside the
engraved group. Reduced motion: entrance never plays (unchanged).

### Ban list (v3.1 additions)

No glued-on gears (every gear meshes and is driven); no costume tropes
(goggles, airships, clockwork octopi); no rust/verdigris/grunge bitmaps; no
idle machinery or looping steam; no Art-Nouveau scrollwork (machine
ornament is machined: knurl, flute, rivet, flange); no orphan pipework; no
sepia palette coup — steampunk arrives as geometry plus one bronze family;
no steam-as-atmosphere; no mechanism in gate sigil/keystone zones, on
plaque bodies, or above the ticker (masthead knurl ring excepted); no
autoplaying audio; the lever is never a styled checkbox that snaps — but
the ritual must not delay the actual mode switch beyond ~450 ms or break
`role=switch` semantics.

## Non-goals (v1)

No auth (localhost only), no write actions against services, no process
management, mobile layout, woff2 recompression (future: halves the 24 MB CJK
font).
