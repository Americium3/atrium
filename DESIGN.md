# Atrium: Design Contract (v2)

Master entry portal for all local web UIs. Reviewed by a 4-judge panel
(requirements / art direction / UX / technical); every blocker and major
finding is folded in below. This document is the implementation contract.

## Concept

**Atrium** is a grand Art-Deco entrance hall. Every destination web UI is a
**Gate**: a tall arched portal opening off the hall. Two wings:

- **Salon** (play): Anime Autopilot, Ground Station, Arsenal
- **Bureau** (work): Outreach Desk, The Press Room, Bourse

A brass **mode lever** re-lights the hall toward one wing. A gilded dispatch
column, **the Ledger**, collects today's news from *all* services
regardless of wing. First run: theme = follow system (resolved pre-paint),
wing = SALON, Ledger filter = ALL.

Since v6 the hall is dressed as the foyer of a 1930s picture palace. Every
surface follows the material law in "The picture palace (v6)" below.

## Color tokens (contrast-verified matrix)

| Token | Onyx (dark) | Ivory (light) |
|---|---|---|
| base | `#0c0a07` | `#f4efe4` |
| surface | `#141109` | `#ece5d4` |
| chrome neutral | `#3a3427` | greige `#d8d2c4` |
| ink (body/detail/time text) | `#e8dcc0` | `#2a2416` |
| ink faint | `#8a7f63` | `#6b6252` |
| gold accent | `#d4af37` (9.4:1 on base, AAA) | `#7a5f1e` for text (≥4.6:1); `#9a7b2d` only for display type ≥24px and decorative rules |
| champagne highlight | `#f1e3b6` | `#b8963e` |
| platinum accent | `#c9cfd8` | deep palladium `#5b6470` |
| platinum highlight | `#eef1f5` | `#8b93a0` |

Rules: all body-size text ≥4.5:1 against its base. In Ivory, small text is
ink, never gold. The wing metal is carried by **exactly three surfaces**:
lever needle, masthead underline, active-gate frames + stage glow, so the
re-light reads even in the weakest cell (Bureau × Ivory).

## Ornament density budget (anti-kitsch law)

Each ornament family is fenced to the surfaces named here. What it is made
of follows "The picture palace (v6)".

- Sunburst rays: **entrance only**, never in resting chrome. They are the
  house curtain's gilt sunburst at night and the sun's shafts by day.
- Rosette: gone from resting chrome. The masthead monogram is an enamelled
  badge in a knurled turned-brass bezel, and the Preferences trigger is a
  nickel escutcheon with its keyhole cut through. The `#rosette` defs stay in
  the markup; nothing at rest draws them.
- Stepped frame: the gates, and the clock niche's mitred proscenium.
- Cartouche (a stepped lozenge with a black enamel field holding the service
  mark): the gates' fanlight hub and the Ledger's cards. On a gate it sits in
  a machined bezel.
- Turned-metal medallion (a spun disc drawn in sectors, so it takes the light
  as a bow tie): the three masthead controls only.
- Double hairline rule: the printed border of the Ledger's programme cards.
  The day breaks are a brass collar on the main and one engraved groove.
- **Clock-only classes (v3.2)**: the octagonal case with its stepped
  shoulders, the four diagonal spandrels, the knurled bezel, the fret band
  and the guilloche field belong to the concourse clock and appear nowhere
  else. The clock is also the one place a fourth wing-metal surface is
  allowed (quarter numerals, spandrel lozenges, subdial rings, the seconds
  baton). It is the hall's single jewel. Since v6 the case is statuary bronze
  with leaf on its bevels only.
- **Service marks (v3.2)**: gate cartouches and Ledger cards carry each
  service's own coloured mark rather than a monochrome sigil. This is the
  one sanctioned break in the hall's monochrome discipline: the mark shown
  in the hall is byte-identical to the one the service's own favicon,
  taskbar tile and masthead show. Services with no mark fall back to the
  line-drawn keystone sigil, which still tints with `color`.
- **Concourse vocabulary (v4, dressed in v6)**. *Wall*: a dentil cornice
  broken by console blocks over a relief frieze, damask hung bay by bay,
  antique-mirror pilasters between reeded fillets, torchieres in the outer
  bays, onyx pier lights between the portals. *Case*: the aisle boards are
  wall cases of the foyer (see v6). *Floor inlay*: a foyer medallion and two
  paired roundels of poured terrazzo, floor only; the compass and roulette
  language is banned there. The floor is still the one surface where
  ornament is **cut rather than stroked**.
- **Palace families (v6)**, each fenced: velvet (gate houses, the entrance
  curtain, the stanchion rope), bulbs (the marquee and the focus ring),
  title cards (the day screen), smalti (the clock niche), stanchions (the
  near flanks of the floor), typewriter keys (the key plate).
- Hairline tokens: 1px and 1.5px; a double rule = 2×1px with 3px gap.
  Hairlines are for engraving, card borders and rules. Mouldings take real
  widths from the object they belong to.
- **Ban list**: no outer glows on gold. Only emitters bloom: lit glass,
  bulbs, coves, alabaster, onyx, jewel lamps and the opal dial. The v2 bans
  on multi-stop metallic gradients and bevel/emboss are lifted by the v6
  material law. The one moving specular effect is a single sheen across a
  gate's gilding on hover and focus.

## The picture palace (v6): the material law

A bake-off on 2026-09-23 built three directions on the real code (a
Chrysler lobby, a liner after midnight, a picture palace) and put them to
three judges. The picture palace won, with grafts from the other two. The
hall is the foyer of a 1930s cinema. Each gate is a small gilt proscenium:
archivolts telescoping out of a lit fanlight, a black glass sign on the
transom, a velvet house over a cinema screen, a lacquer apron carrying the
live line. The ticker is the marquee, the clock hangs in a bronze niche, and
the floor is waxed terrazzo with a foyer medallion, a wool runner and velvet
rope. Onyx is the house before the show, with its lamps lit. Ivory is the
foyer with the doors open to the street: nothing is lit, the tabs are tied
back and each screen shows its title card. The room is the same object in
both themes; only the hour changes.

### The law

1. **Metal** is six tones across a moulding, in this order: the glaze lying
   in the reveal, shade, body, the crest turned to the light, relief body,
   the lip. Per theme: `--au-*` gold leaf; `--ag-*` nickel silver, the
   Bureau's leaf (Onyx `#17140f #463d2f #938670 #f4e8c8 #b9a987 #dccaa2`,
   Ivory `#6b6456 #9c9382 #cac1ad #fdfbf4 #ddd4bf #f6f2e8`); `--cu-*` warm
   bronze; `--pl-*` bare plaster, for the reserved gate; `--sb-*` statuary
   bronze, for the niche, the clock case and the signal desk; `--br-*` a
   fixed brass for fittings that never follow the wing (bezels, lamps,
   screws, the dater, the switchgear).
2. **Relief** is drawn three times along the one key light: a shadow copy
   down and right, the body, a lit edge up and left. Bevels are drawn facets,
   each lit by its angle to the key.
3. **Texture** is baked on the CPU into `static/assets/tex` by
   `scripts/materials.py` and its siblings (`materials_gates.py`,
   `materials_room.py`, `cabinetry_tex.py`, `desk_materials.py`): leaf,
   stone, veneer, velvet, damask, carpet, glass, smalti, card, shagreen,
   bronze patina. Each is low in contrast and a few KB. Rust, verdigris and
   grime stay banned.
4. **One light model per theme.** At night only emitters glow; gold never
   does, it takes its light from them. Every lamp is its own layer faded by
   opacity (`.lit`, `--lamp-on`), lit only in Onyx and, on a gate, only while
   the gate stands in the lit wing and its line is open. By day nothing is lit
   and the skylight, up and a little left, is the key light.
5. **The wing's leaf leads every fixture** through `--lead-*`: gold in the
   Salon, nickel silver in the Bureau, plaster on a reserved gate. The lever
   re-leafs the hall. The three wing-metal surfaces of v2 still read
   `--metal`; the wordmark's nickel face and the crown join the throw as a
   crossfade, not as a fourth surface.
6. **Nothing crosses lettering.** No line, seam, joint or light ever crosses
   a line of lettering, including a curtain's meeting line. A plate that
   carries words is one piece.
7. **Gate text has a floor**: every gate string (name, description, status,
   address, lamp word, service note, launch notice) is 10px or more at every
   size from 1280x800 up, and none clips. The status tightens its tracking
   (never under 0.05em) and then takes a second line; the house gives up the
   height.
8. **Siblings are a family, never twins.** A gate's archivolt count, metal
   chord, relief programme, fanlight glass and glazing, velvet and its fold
   pitch, valance swags, crest and day card come from an FNV-1a hash of its
   service id, walked in registry order so a new service never repaints the
   ones already standing (`palace.js`). Dials, pier lights, damask bays,
   dado slabs, console blocks, Ledger cards and desk panels vary the same
   way. Fixtures do not vary: sign, transom, cartouche, imposts, apron, lamp
   and plinth are the same on every gate.
9. **Specular**: one hover sheen crosses a gate's gilding only. Glass,
   crystal, mirror, lacquer and black glass signs each carry one static
   reflection band.
10. **Reflections**: each portal is flipped in the wax with its own paint,
    and the niche has its own. Every lamp throws a rippled streak on the
    floor (torchieres, pier lights, lit fanlights in their own glass colour,
    the marquee's returns); the streaks are lamp layers, never clones. By day
    the floor gives back only the gilt and the screen, at 1.5 × `--mirror-a`.
    The desk stands on wool and returns nothing.
11. **Performance**: only transform and opacity animate. Blurs are static on
    inner elements, with the moving transform on a parent. The clock is two
    sheets, a still dial painted once and a thin moving sheet. The floor's
    SVGs carry no paint servers (patterns or gradients): the clock's hand
    writes re-lay them every frame, so the inlays' figure and sheen are HTML
    layers over each inlay.

### Surface by surface

- **The gates**: see Gates (R9) for their states.
- **The clock niche**: statuary bronze glazed dark, with leaf near a tenth of
  it (measured 4.8% by night, 7.9% by day, dial excluded): the case's eight
  bevels, the fillet round the smalti, the crest, the sill nosing's lip and
  the bosses' crowns. The smalti are glazed and darken toward the foot. The
  sill is book-matched stone, Portoro by night and Calacatta by day, with a
  gilt fillet on the plinth line.
- **The masthead** is the canopy fascia, book-matched Portoro by night and
  Calacatta by day, laid slab by slab from the clock's axis. ATRIUM is cast
  gilt standing off the stone, with a nickel face that crossfades over it on
  the Bureau throw. GRAND CONCOURSE, the date and the captions are cut and
  gilded. A crown stands over the clock's axis, built as the Chrysler's is:
  three arched tiers telescoping up and back, pierced with triangular
  windows, lit at night. Framed relief panels fill the fascia either side of
  it, sized to the gap and not hung under 110px × `--ui`. The crown is cast
  up to a fifth smaller on a tight masthead and stowed only when even that
  would touch the title or the date. The Ledger hatch is a domed brass cap
  whose unread signal is a jewel lamp; Preferences is a nickel escutcheon
  that turns 22.5 degrees on hover and focus.
- **The marquee**: milk glass between two rows of bulbs on a gilt channel,
  each end a gilt return with three bulbs. The chase steps in whole bulb
  pitches, three times a second, and runs only while the band carries an
  unread dispatch, at night, in full motion, in a visible tab; otherwise
  every bulb burns evenly. By day the bulbs are clear glass in brass
  sockets.
- **The wall**: a rolled crown, the dentil course (lit tops, shaded returns,
  cast shadows), a bed mould, the relief frieze and a fillet over the lamp
  trough, broken over every pier and pilaster by a cast console block. Onyx
  pier lights stand in every gap between two portals, and between each case
  and its nearest portal at 2800 and wider, placed from the solved row and
  never beside the clock; at night the onyx is a lamp, by day dead stone.
  The damask is hung bay by bay, each bay its own dye lot. The dado is
  book-matched stone under a gilt chair rail, over a black skirting with two
  channelled nickel strips, whose top meets the portals' plinth nosing.
- **The floor**: polished terrazzo; the medallion and roundels poured into
  it; a red wool runner; brass stanchions with velvet rope along the near
  flanks, each rope's sag its own.
- **The cases** (Statistics, Almanac, 2800px and up): wall cases in
  book-matched veneer with crossbanding and stringing (macassar ebony for
  Statistics, figured walnut for the Almanac), a gilt bolection frame round
  a black glass door, a cast crest on the top rail and a brass picture lamp
  lit at night. The dials are turned brass bezels over enamel faces with a
  red lacquer arc from 85; the Almanac's sky plate is enamel in a satin
  bezel, and its moon a shaded ball under its own crystal.
- **The Ledger** and **Preferences**: see their sections.
- **The signal desk**: statuary bronze casework on the runner (see
  "The signal desk").
- **The key plate**: black verre eglomise in a gilt moulding, with each key
  set as a typewriter key (a ring in the wing's leaf, an ivory top, the
  legend cut and filled). Black glass in both themes, like every sign in the
  hall.

## Geometry system

Gates 1:1.9 (design 300×570), stepped shoulders = 3 steps of 6px, keystone
sigil zone 96×96. All sigils drawn on that 96 grid: 1.5px stroke, zero corner
radius, at most one accent-filled shape each, matched optical ink. One shared
SVG `<defs>` block for frames, so every gate provably uses identical ornament
paths. A **generic fallback sigil** (plain deco keystone) exists for future
services without custom art.

## Typography

- Display caps: EB Garamond (wght ~540), tracking 0.18–0.28em, never below
  0.15em anywhere (including animation end states);
  `font-variant-ligatures: none` on tracked caps.
- Addresses / stat numerals: true caps + `font-variant-numeric: tabular-nums`,
  11–12px, tracking 0.08em. (Not "small caps"; digits have none.)
- CJK: `:lang(zh)` scope, **LXGW Heart Serif** (霞鹜铭心宋, a Kokoro Mincho
  derivative); tracking 0.25–0.35em on display lines only, body tracking 0,
  `text-transform: none`. Slightly larger CJK body size to reconcile x-height
  with Garamond. It replaced Noto Serif SC: a modern Songti reads as a web
  page beside Garamond's old-style, where a warm Mincho reads as the same
  hand cutting both alphabets. The face has ONE weight, and the `@font-face`
  declares 200–900 anyway: a face that claims the range is never
  synthetically bolded, and CJK strokes at 10px do not survive faux bold.
- **Signage stays English** in both languages: ATRIUM, SALON, BUREAU, lamp
  words OPEN/DARK, engraved architectural terms (zh translation provided as
  `title`/aria). Sentences (descriptions, headlines, day breaks, settings
  labels) localize fully with tracking 0.
- `@font-face`: `font-weight: 400 800` (EBGaramond-wght.ttf) and `200 900`
  (LXGWHeartSerif.ttf), `font-display: swap`, both preloaded; no italic
  styles anywhere. Long-lived Cache-Control on `/static/fonts`.
- The CJK face ships **byte-for-byte**. It is under the IPA Font License,
  where a subset is a "Derived Program" that must be renamed and shipped
  with its source, so the 11 MB file is not an optimization target, and
  woff2 recompression is off the table for this face.

## Entrance animation (timeline)

Total ~2.7 s. It plays on every load. A click, a tap, a keypress or a turn
of the wheel cuts it short and lands the assembled hall. Only the keys the
hall would act on are swallowed, so F5, Ctrl+R and other browser shortcuts
still work. A tap's click is swallowed along with it, so the tap that skips
cannot also open the gate under the finger. From done-fade on the hall is
what shows, so a click there lands the entrance and then does what it says.
`?entrance=0` skips it. Under reduced motion a load gets the 300 ms fade
instead. PREFERENCES > REPLAY ENTRANCE sets a one-shot `sessionStorage` flag and
reloads; the pre-paint script reads and clears it, so nothing sticks to the
address bar, and under reduced motion a replay is the same quiet fade. The
entrance overlay is `aria-hidden`; the app is usable underneath once
assembled.

**Night** (v6). The hall stands dark behind a full-screen house curtain:
claret velvet, a gilt sunburst crest with a medallion, the name ATRIUM in
gilt letters, a bullion fringe on the hem and a footlight trough across the
foot of the screen. The hall behind it is already built; nothing in it rises
or assembles.

- 60 ms: the footlights come up along the hem.
- 250 ms: a follow spot opens on the crest, and each ray catches it in
  turn. The gilt ring round the medallion draws itself from 0 ms.
- 950 ms: the curtain flies out over 920 ms, slow off the deck and easing
  into the grid, its hem gathering into swags (one per ~300px of screen).
- 1450 ms: the house lights come up over 850 ms, the marquee's bulbs chase
  once along both rows, and the fanlights light from the clock outward, the
  pair in each bay together, 170 ms a bay.
- 1750 ms, **signature moment**: the spot, left on the clock when the
  curtain went, flies to the masthead's monogram and goes out on it.
- 2140 ms, done-fade: the footlights go out and the overlay stops catching
  the pointer.
- 2700 ms: finish.

**Day.** The curtain is already up. The street's light floods in from behind
the reader and settles like an exposure (1.05 s from 280 ms), with the sun's
shafts in it; a gilt ring draws itself in the glare and docks on the
monogram at 900 ms. Done-fade at 1400 ms, finish at 1700 ms.

## Layout & viewport

Desktop-first: optimized 1440–1920px, supported down to 1280px, and opening
into a full three-bay concourse at 2800px and up (see "The concourse (v4)").
Below 1280px the Ledger moves beneath the stage; below ~900px everything
stacks single-column (masthead → ticker → lever → active gates → receded
gates → Ledger). Mobile is out of scope for v1 but must not break.

**The hall stands on one screen.** No vertical scrollbar at any supported
size. A grand entrance you have to scroll is not an entrance. The vertical
budget is spent in this order: masthead, ticker, arch module, floor. The
module is capped by `min(13.6vw, 26.5vh)` and by `296px x (0.62 + 0.38 x
--ui)`, so a short viewport shortens the arches instead of pushing the plinth
off the bottom, and the floor takes what is left. `--floor-min` is only the
*reservation* it insists on when the hall is taller than the screen. The
concourse's grid row is exactly `--stage-h`: a board is never allowed to
dictate the hall's height.

**The wall claims its headroom back above 1080px.** The arch is aspect-locked,
so on a tall screen every pixel the wall does not take goes to the floor, and
the floor was reading as the largest object in the room. `--stage-h` is
`--gh2 + clamp(80px, 100vh - 1080px, 100px)`: the term is inert below 1080px,
so no short screen inherits a taller hall than it can stand, and above it the
surplus goes to the wall and to the two cases hanging on it. On a 3440x1330
display that moves the floor from 31.6% of the viewport to 27.1%, the arches
up 6% and the boards up 9%.

**Optical scale (`--ui`).** What a 34" desk display changes is physical
size, not pixel count. The 12.5px engraving that reads at arm's length on a
laptop is illegible from across a room. One multiplier drives every piece of
hall lettering and the arch module: `--ui-auto` steps with the viewport
(1 → 1.12 at 1900px → 1.24 at 2400px → 1.40 at 3000px), `--ui-user` is the
reader's own correction from PREFERENCES (0.90 / 1 / 1.15), and `--ui` is
their product, registered with `@property` as a `<number>` so scripts read
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
lettering 1:1. At the old slope a 3440 screen stood it 275px tall, which was
taller than the stone under it once the wall took its headroom back, and the
lever tip came up level with the skirting.

## The concourse clock (v3.2)

A grande-complication regulator in a stepped octagonal deco case, showing the
machine's local time. `static/js/clock.js` generates the geometry so the
1000-unit construction lives beside its drive loop; `atrium.css` owns every
colour. All strokes carry `vector-effect: non-scaling-stroke`, so the 1 /
1.5px hairline law holds whether the dial draws at 160px or 620px.

- **Case**: octagon with three-step shoulders (the gate language), a deco
  spandrel on each diagonal, rivets at the eight vertices.
- **Dial** (own 1000 space, scaled 0.855): knurled bronze bezel, fret band,
  guilloche field (concentric rules crossed by a 90-spoke fan, both under 10%
  ink), 60-mark chapter ring, **twelve** Roman numerals with the quarters in
  wing metal.
- **Complications** on the cardinal axes: 12 moon phase (synodic, reference
  new moon 2000-01-06 18:14 UTC), 3 date on a 31-step ring read through an
  aperture, 6 small seconds, 9 the works, two wheels geared 14:9 turning
  against each other off the seconds arbor.
- **Hands**: pierced Breguet with stepped counterweights; the hour hand
  carries a second, smaller piercing so the two never read alike.
- **Drive**: the loop reads `new Date()` every frame and never accumulates,
  so drift is structurally impossible and a DST step, a suspend/resume or a
  throttled background tab all self-correct on the next frame.
  `visibilitychange` stops the loop while hidden. Reduced motion swaps the
  sweep for a boundary-aligned 1 Hz deadbeat tick,
  `setTimeout(tick, 1000 - Date.now() % 1000)`, which is the mechanism a
  real regulator actually has.

### Composition

The clock is set into a niche in the back wall at the centre of the stage:
same baseline, same head height as the arches, one hairline wall rule running
behind them at the gates' plinth line. It is always fully visible at full
size. (It used to be winched up behind the cornice whenever a wing had an odd
number of gates, which with three in each wing was always; that stowage is
gone, see "Composition (v5)".) Every niche dimension derives from
`--gate-fit`, so the dial tracks the arches at any viewport.

Never write `margin: <custom-property> auto` on the clock box. The shorthand
resolves the property's second value into `margin-right` and `auto` into
`margin-left`, which end-aligns the dial. Vertical margin goes on its own
longhands; centring is `justify-self`.

## Composition (v5): the clock holds the axis, the wings stand in pairs

The owner's brief: the clock and every gate of a wing visible at once, the
clock never stowed, and nothing on the stage covering any part of anything
else.

- **The clock stands at the centre**, full size, always.
- **Each wing stands in pairs**, two arches left of the clock and two right.
  `slots()` pads a wing with an odd number of services with one RESERVED
  gate at its right-hand end: a `div.gate.vacant`, not a link and not a tab
  stop, `aria-hidden`, lamp reading SHUT, description "Held for the next
  hall." It must read as architecture waiting for a tenant, never as a
  service that is down (DARK means that). When a new service registers in
  that wing it takes the slot. Placeholders exist only in the stage's view of
  the registry; status, stats, the Ledger and the ticker read the real
  `services`.
- **Only the lit wing stands in the hall.** The other wing waits in the same
  bays, `opacity: 0`, `visibility: hidden` and `inert`. Throwing the lever
  lets one wing's arches sink and fade while the other's rise in place. The
  flanking arches this replaced (receded wing at 0.62 either side) could not
  keep their width without either shrinking every arch by a fifth or letting
  one arch cover another; the owner chose the full-size row. The fade sits on
  `.gate`, the parent of the `preserve-3d` pose, never on the pose itself.
- **No overlap, at any size.** `layoutStage()` solves the row as one line,
  `[arches] [clock] [arches]`, at pitch 1.16 gate widths and a 0.10 gate-width
  clearance to the niche. If that line is wider than the stage, it writes
  `--fit` (0..1) on `#stage`, and the arches, the niche and the plinth rule
  all size from `--gate-fit = --gate-w × --fit`. Widths are measured at fit 1
  so the solve never chases its own output. Checked at twelve sizes from
  1280x800 to 3440x1440 in both wings with a Playwright overlap audit.
- **A throw goes bay by bay**, out from the clock on both sides, 60 ms a
  step. By night the lit arch's lamps go out first, in 120 ms. Then it
  sinks 14px and fades in 200 ms, the bay stands empty for 20 ms, and the
  other wing's arch rises into it. Two faces never
  share a bay, and an incoming arch takes no pointer until its fade is under
  way. Where both wings end in a RESERVED arch, that bay stays put. Lever
  re-light queues until any in-flight theme crossfade finishes.
- **Slots never animate.** A re-solve (first layout, a resize, the engraving
  size) writes every slot with the gates' transitions cut, so the row lands
  in the frame it is solved and no arch ever passes over another or over the
  clock. A resize is re-solved in the resize event itself.
- The gates keep the DOM order they were built in. The waiting wing is
  inert, so Tab walks only the lit one.

## The concourse (v4): the hall gets its aisles, its wall and its floor

**The problem this solves.** The hall was drawn as an object, not a room. At
1440px the object filled the frame and read as architecture; on a 3440px
display the 1720px cap left 860px of bare ground either side and the whole
composition read as a diorama in the middle of a beige desert. A room is
made by a *continuous* wall and a *continuous* floor, so both now run the
full width of the screen and the triptych stands on them.

**Grid.** `#concourse` is `aisle-l · stage · aisle-r`, opening at 2800px (v5; it was 2200);
below that it collapses to the single centre column the hall shipped with
and both boards are hidden (they are ultrawide furniture, not a fallback).
`--aisle-w` spends the *surplus*, `clamp(300px, (100vw − 2150px) / 2.4,
520px)`, rather than a flat fraction, so decoration can never squeeze the
stage. The hall cap rises 1720px → `min(3360px, 100%)`.

The breakpoint was 2200px until v5. The row the stage has to hold since then
(four full-size arches either side of the full-size clock, about 6.3 arch
widths, nothing touching) does not fit between two 300px aisles below about
2800px without shrinking the arches by a quarter, so the aisles now open at
2800 and cap at 520 (560 made the arches shrink at 3440). The flank-sizing
guard that used to live here (flanks sized to the clear column with an air
gap) went with the flanks; `--fit` is its successor, see "Composition (v5)".

**Full bleed from inside a centred grid.** Both scenery layers use
`left: calc(50% - 50vw); width: 100vw`. 50% is half the concourse, 50vw half
the viewport, and the concourse is centred, so the difference is exactly its
left offset, with no wrapper element, and it survives the max-width cap.

**Back wall.** Plaster field (one two-stop wash, top-lit), a dentil cornice,
and a dado of chair rail + recessed panels + skirting whose top edge lands
on `--gh2 × 0.079`, the gates' own plinth rule, so wall and arches share
one horizontal. Aisle bays carry fluted pilasters (stepped capital, shaft
proud of the field with a shadow behind it, plinth block), one sconce per
bay throwing a pool on the plaster, and a Roman bay number engraved on the
chair rail.

**Bays are measured, not assumed.** `layoutStage()` publishes
`triptychHalf`, how far the composition actually reaches from the axis,
flanks at 0.62 scale included, and the walls are cut against *that*, not
against the stage column, which is far wider than the triptych standing in
it. Each wall then skips the stretch its board is hung over: bays spaced
evenly across the whole span put every sconce and every bay number behind
the board, articulation built and then covered up. Laying them in the
daylight either side also lands a pilaster hard against each edge of the
board, so the board reads as set into the wall rather than stuck onto it.

**Boards.** `STATISTICS` (left) is an instrument case reading the machine the
hub runs on: four needle dials (processor, memory, graphics, traffic) on
one 240° scale with a red sector over the last fifth, a tape of hours run
and store remaining, and the maker's plate off the retired rail at its foot.
It replaced a `DIRECTORY` that listed every service's mark, name, address
and lamp, i.e. said the gates' own three facts back at them a second time
and larger; a board in a hall has to say something the architecture cannot.

The signage reads STATISTICS; the DOM id, the CSS prefix and the route stay
`works`/`wk-`/`/api/works`. That is not drift. The board's *name* is what
it shows the reader, and `the works` is what the data IS (the works of the
machine, read out of the host). `/api/stats` was already taken by the
services' own status route and a JS `stats` binding already holds it, so
renaming the internals would have collided with a live name to make two
different things share one word. The maker's plate still reads ATRIUM
WORKS because that is a manufacturer's mark, not the board's title.
Dials are sized by the ROW the grid gives them, never by their own width.
A flexed replaced box with an aspect ratio resolves off its intrinsic width
and shrinks to a thumbnail the moment the case is short, taking its own
caption out under the cell's clip. Captions run at 1.15 leading for the same
reason: the default 1.5 under two stacked lines costs the dial above them a
third of its face.

**The works poll.** `/api/works` on a 4s cadence of its own, because instruments
read live or they are decoration, but only while the board is genuinely on
screen. Below 2800px it is `display:none`, and a hidden panel must never
keep the host sampling: `worksVisible()` gates every tick, and the hub's own
TTL means an unopened panel spawns no `nvidia-smi` at all. One request is out
at a time (a tick is skipped while one is), and a reading whose `generated`
is older than the one on the dials is dropped: overlapping replies used to
land out of order and swing a needle back. A board that has heard nothing
for 10 s drops every needle to NO READING instead of holding the last figure
as if it were live.

**Floor (v4.2), cut rather than drawn.** One plane hinged on its NEAR edge,
`transform-origin: bottom center` with `rotateX(58deg)`, so the hall recedes
*toward* the wall the way a floor does. Hinged at the top it receded downward,
which is a ceiling seen from underneath. Its box runs from the stage baseline
to the screen's own bottom edge, and `#floorplane` is *backed* in `--terrazzo`
so whatever the plane's length and the perspective divide leave uncovered is
still stone.

v4.1 laid a 16-point compass rose over it in hairline geometry: uniform
strokes, perfect radial symmetry, ATRIUM set dead centre. That is a *logo
lying on the ground*, and it read as one: stiff, and pasted on rather than
built in. A real deco lobby floor is not drawn at all; it is quarried tones
butted against each other with brass divider strips in the joints. So the
whole inlay is now cut from stone (`--stone-a/-b/-c`, per theme), the pattern
is carried by VALUE because value is the only thing that survives being laid
flat and foreshortened to a third of its height, and the brass never outlines
a shape. It only fills a joint. The wordmark went with the line work: the
masthead already says it, and a floor is not a letterhead.

What is on the plane, near to far: a **runner** (a rectangle in floor space,
which the projection turns into the trapezoid a runner actually is), running
off the near edge with its fringe at the far end; the **medallion**, two
banded courses of alternating wedges on 32 and 16 divisions with a bronze
eight-point star, a tessera ring and a bronze boss. The *concentric* break is
what stops a radial fan reading as a paper doily; a **square-in-circle
roundel** over each aisle, a different construction so the floor reads as a
set of inlays rather than one motif stamped three times; **aggregate**, 700
chips on a fixed hash, three tones, one in eleven in brass, biased toward the
viewer; a border course and key band in plane units; and **reflections**.

**Reflections.** The stone is waxed, so every arch, the clock and both aisle
cases come back up off it. The smears are drawn in *plane* space and left to
the one `rotateX`, which is what makes each converge exactly as its own arch
does. Painted on the glass they would stay parallel and read as stripes. A
point at depth `u` divides by `f = 1/(1 + u/L)`, so a column that is vertical
*on screen* is a wedge on the plane: hence the trapezoid, 0.98 of the offset
at the wall and 0.49 at the near edge. They carry `--metal`, so the whole
floor changes temperature the moment the lever is thrown. They are cast from
the row as `layoutStage()` solved it, not from the arches' live boxes, which
on a quiet boot or after a resize were still at the centre or mid-move and
stacked every reflection under the clock. The waiting wing casts nothing. A
throw leaves the smears in place and their stops carry the new `--metal`
across with the arches.

Over all of it: a skylight pool, the room's own shadow across the near ground,
and a contact shadow where the stone meets the skirting, so a wall and a floor
share a hard junction, not a horizon, so there is no atmospheric fade there. A
foreground balustrade runs along the flanks only: carried edge to edge it read
as a fence pinned across the view, flattening the very depth it exists to
create.

**Throw plates.** `SALON` and `BUREAU` used to float on the terrazzo either
side of the lever: engraved ink on pale stone, foreshortened by the floor's
own projection, at the one place in the hall with no plate behind them, the
least legible lettering in the building, and it labelled its only control.
They are brass plates on the quadrant now, countersunk screws and all, with
the live wing lit. A signal lever's throws are named on metal because a plate
is a *thing* and not a caption, and it answers the question the bare machine
left open: what does pulling this do.

**The perspective distance is a function of the floor's height.** `d = 2H ·
tan θ` puts the horizon at twice the box height, and `377% = 2H / cos θ` is
the plane length whose far edge then projects exactly onto the box's own
top. H is the box's used height, which CSS cannot read back into a `calc`,
so `sizeFloor()` writes it as `--fh` on every layout pass, safe from
feedback because the plane is absolutely positioned. Fix `d` instead and the
far edge lands short of the skirting on a tall screen and long on a short
one. The plane is 204% of the screen wide for the same reason: at the
skirting the divide compresses it by exactly 2, and a plane only as wide as
the screen pulls away from the corners.

**Six traps, recorded so they are not re-sprung.** (1) A 3D-transformed
child still contributes to the scrollable overflow area: the plane's near
edge projects far past its own box and hung a scrollbar on a hall that
otherwise fit the screen exactly. `#floorplane` clips it. (2) Sizing a
floor inlay off the plane's *width* makes a circle whose diameter runs off
the near edge, so only its far arc ever reaches the screen; inlays are sized
off the plane's height and anchored to the near edge. (3) `#hall` needs
`min-height: 100vh` with the concourse as its `1fr` row. Content-height
alone left ~270px of page ground under the terrazzo, a band brighter than
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
nothing and the reflections painted fully transparent, with all six polygons
present and correct in the DOM. Gradient stops take a class and the colour
comes from the stylesheet.

## The Almanac (v4.4): the east board

`BULLETIN` (right) was a glazed notice case: four dispatch stubs, drawn from
the unfiltered feed, under a ticker already scrolling those dispatches and
beside a Ledger already listing them. That is the DIRECTORY mistake a second
time: a board saying back what the architecture around it already says, and
this one said it three times. `ALMANAC` replaces it with the one fact
nothing else in the building carries: where the sun is standing over the
machine, right now.

**Two halves that fail independently.** Sun and moon are ARITHMETIC: NOAA's
sunrise equation and a synodic phase, run in the page on the coordinates the
hub hands over. That is what keeps the bead moving through the day on a
board whose forecast is a quarter of an hour old, and what leaves an
instrument in the case when the weather service is unreachable. The forecast
is the only call in this hub that leaves the machine: `/api/almanac` behind
a 15-minute TTL and an `asyncio.Lock` (two tabs on a cold cache are two GETs
otherwise), a 6s timeout, and it never raises. An outage prints an em dash
and NO READING in the reading register, drains the vitals to 45% and leaves
the sky untouched, the same law as a dial with no reading resting at zero.

**The plate is a horizon dial, not a dome.** The sun runs one ellipse
through the whole 24 hours (the circle of its own path, seen edge-on) with
the horizon cutting across it: solid above, dotted below, the two crossings
engraved RISE and SET with their times at the plate's outer edges (an ellipse
drawn to the full width leaves the only lettering on the instrument nowhere
to stand but on the curve). Elapsed daylight is inked in gold as far as the
day has got. After sunset that is all of it, because the plate reports
daylight SPENT, not merely where the sun is.

**Two corrections (v4.6), because the first draft was decorative rather than
true.** A dial is a claim about the sky, and this one was making two false
ones, both invisible in a screenshot, both obvious the moment the drawing is
measured against the times engraved on it.

*The horizon is a chord, not a diameter.* Cutting the ellipse through its
centre draws a day of exactly half the ring (twelve hours) under a tape
reading DAYLIGHT 13:13 a centimetre below. On 2026-08-29 in Pittsburgh the
sun is above the horizon for 198° of the ring, so the chord sits at
`cy − ry·cos(180°·daylight/24)`, which today is 0.16 of the minor radius
BELOW the centre. That one term is the season made visible: a fat dome in
June, a shallow cap in December, two equal halves only at an equinox, the
single day the old drawing was right.

*The hour ring is 15° an hour.* Spreading the daylight hours evenly across a
half circle stretches them to fit: pinned at the crossings, wrong everywhere
between, by up to 8.8°, which is exactly where an eye checks a dial against
itself. The ring now runs all 24 hours at a constant 15°, longer marks at the
quarters, and the ones below the horizon keep the pitch while giving up the
ink.

Ticks stand on the ellipse's own **normal**, not on the radius from its
centre. Those agree only on a circle; on a squashed one the radius leans,
worst at the diagonals, and the marks read as if they had come loose from the
curve.

`scripts/dial.py` measures all three out of the SVG the browser actually drew
and exits non-zero on any of them. It is the check that would have caught
this, and the reason it exists is that every one of these faults renders as a
perfectly handsome dial.

Two things it deliberately does not draw. A **meridian**: local noon is the
midpoint of sunrise and sunset by construction, so the line would sit dead
centre on every plate ever printed: ornament impersonating an instrument.
A **clock**: there is a grande-complication regulator the size of a doorway
standing between the arches, and the bead's job is the one thing it cannot
say, which is *where in the day* this is.

**Whose sunrise.** The page computes its own from NOAA's short-form equation,
which is what leaves it with a sky when the forecast service is down, but
that form lands 2–3 minutes off Open-Meteo, and the service's own times ride
in the payload already. When they are there they win, for the dial's geometry
as well as its lettering: the times engraved at the crossings have to be the
times those crossings stand for, and DAYLIGHT in the tape has to be the same
pair subtracted. The day-length delta against yesterday stays on the computed
pair. A difference wants one consistent source, not the better one.

**The viewBox is measured, never fixed.** The aisle is 300px wide at 2800
and 560 at 3440 while the case keeps its height, so one fixed aspect either
letterboxes the plate into a third of its register or balloons out of it,
and a void inside a lit case reads as a board that failed to draw. `skyBox()`
reads the register and inscribes the ellipse in it, measuring BEFORE the old
plate is removed (emptying the register first collapses it to nothing and
the new plate is inscribed in a box of zero height).

**The moon is a real terminator.** An ellipse, not a chord and not a second
circle offset sideways. Both shortcuts get gibbous phases visibly wrong,
which is the first thing an almanac reader looks at. The phase is carried by
VALUE, so the two faces keep their order in both themes: onyx prints a lit
moon on a night sky, ivory prints the engraver's moon with the shadow inked
and the lit face left as paper. That paper is `--base`, not `--surface`: on
the case's own tone a full moon comes out as an empty ring, which reads as a
disc that failed to render. The bezel is what says an object is there.

**Signage stays English, sentences localize**, as everywhere else. The
station line at the foot (`PITTSBURGH · 40.44°N 80.00°W`) is an ADDRESS
engraved on the case and keeps the gates' contract; the localized place name
lives in the subtitle. One trap: an SVG `<text>` does not inherit the body's
zh stack, and `--serif` carries no CJK face, so the plate's own labels need
`html[lang="zh"] .al-arc text` or they come out in a different serif from
every other Chinese word in the hall.

**Where the hall stands.** `almanac.PLACE`, overridable by dropping
`state/almanac.json`. There is no place picker: this board is furniture, and
a hall does not get a control for moving itself. A malformed override is
ignored. A lobby board has nowhere to report a parse error to.

**The almanac poll.** `/api/almanac` every 10 minutes and the plate re-drawn
every 60 seconds, both gated on `almanacVisible()` for the same reason the
works board is: below 2800px the case is `display:none`, and a hidden panel
must not have the hub calling a weather service on the reader's behalf. A
resize that opens the case reads it at once, since the boot fetch declined
while the case was hidden and the 60 s tick used to leave a blank plate for
up to a minute; the tick stays as the fallback. A payload with no weather
is the hub reporting a miss, and the board asks again 121 s later, just past
the hub's own 120 s retry, rather than keeping NO READING up for the whole
ten-minute poll.

## Gates (R9)

Each gate is a gilt proscenium (v6). Face, top to bottom: the service mark
in a machined bezel on the fanlight's cartouche, the name on a black glass
sign, the house (velvet tabs, a valance, footlights, the description), and
the apron carrying one live stat (odometer roll on change), the address and
the lamp. A service's own warning is engraved in amber on the apron above
the lamp and takes the address line's place while it stands.

- **Rest, open**: the fanlight, coves and footlights are lit, and the
  description is a lantern slide on the closed tabs (a dark field ruled like
  the day card, carrying the gate's own corner ornament in light). By day the
  tabs are drawn back and tied, and the screen shows the title card: card
  stock in front of a matte silver screen, printed in the gate's own ink
  (oxblood, bottle green or navy) with a border band, its corner motif, a
  headpiece and a rule, set semibold in `#160f06`, never
  smaller than its words.
- **Lamp states**: `…` (checking, until the first /api/status, lights at
  35%), OPEN, DARK. The lamp always renders its text label. State never
  depends on luminance alone.
- **Hover** (a pointer that can rest) **and focus-visible**: at night the
  curtain lifts 8% off the stage and the footlit foot of the screen shows
  under the fringe; the tabs never part. A DARK house keeps its curtain
  down. The arch rises 3px on the pose inside the link (its hit area keeps
  its foot on the floor), and one sheen crosses the gilding. By day the
  card stays.
  A gate takes the pointer only inside its arch and on its lettering, never
  on the wall above its shoulders.
- **Focus** traces the outer arch five units out from the arris as a
  marquee: a 12-unit dark bed, a 5-unit lit core and, at night, a string of
  bulbs on the core. By day a cream bed and an oxblood core. Under forced
  colours a Highlight core on a Canvas bed.
- **OPEN gate click**: the tabs fly, the screen floods and the lips flash
  champagne inside 240 ms, then `window.open(url, 'atrium-<serviceId>')`, a
  named window so each service reuses one tab. A modifier or middle click is
  left to the browser.
- **DARK gate**: fanlight and coves off, tabs closed and the velvet in
  shadow, the engraving at 35% (full strength under forced colours or more
  contrast), the lamp a hollow diamond (extinguished, not alarmed, no red).
  Clicking pins a printed card on the curtain, a house notice headed DARK,
  with the service's launcher hint (from the registry) instead of opening a
  dead tab; a keyboard press pins it and says it every time. The path
  breaks only at its separators, so a copy is exact, and the card tightens
  a step at a time to stay inside the house. All-dark hall: one engraved
  line "The hall is dark. No services are reachable."
- **Reserved**: the same architecture in bare plaster, its bezel holding a
  blank cover plate, behind an iron safety curtain: red oxide primer steel
  in three lapped courses, domed rivets lit on the lamp side, a stencilled
  border and a cast brass builder's plate carrying the words. The lamp reads
  SHUT. It is never lit and never lifts.

## The Ledger (R10)

The drawer (v6) is a black lacquer cabinet drawer (ivory lacquer by day)
with one wide reflection band and a gilt bead down its leading edge. The
spine is the pneumatic main, a brass tube with couplings and lit collars at
the day breaks. Each dispatch is a programme card: cream laid card in a
small gilt holder that keeps the chamfered outline, with a printed double
rule inside, hanging from the main by its cartouche (the service mark in
black enamel; gold leaf for a Salon dispatch, nickel for a Bureau one). A
card leans up to 0.35 degrees off its dispatch's hash, its time is a violet
rubber stamp crooked by the same hash, and every card's right edge shares
one line. The head is a brass card frame holding THE LEDGER, with a close
knob beside it; the chips are a bank of three push-keys. Cards are links
opening the dispatch url.

- **Read is what the pointer rested on**: an unread card carries a jewel
  lamp in its holder's corner (champagne at night, gold glass by day); the Ledger itself always shows the full window. A
  dispatch is marked read when the pointer has rested on its card for
  **420 ms**, when it is focused by keyboard, or when it is followed through
  to its service, or when the reader presses the stamp. Nothing else marks
  anything: opening or closing the drawer clears no plaque, because a card
  three screens down was not read by the act of shutting a drawer over it.
  Two localStorage keys back this: `atrium.read`
  is the set of dispatch ids, pruned to the ids still inside the feed window
  so it cannot grow forever; `atrium.lastVisit` is now a frozen **floor** left
  by the old close-stamp, kept only so the change of model does not resurface
  a fortnight of dispatches the reader already dismissed.
- **The stamp (v4.5)**, a brass rubber dater in a cradle since v6: one
  control that clears the whole window, docked
  under the head on its own line rather than beside the chips, where a fourth
  control on that baseline would read as a fourth filter. This does not
  reverse the rule above; it completes it. The rule was never *nothing may
  mark wholesale*. It was that **nothing marks except the reader**, which is
  why the drawer's own open and close still clear nothing. A button pressed
  on purpose is the reader saying so out loud, and it is the only wholesale
  path that exists.
  * It clears **both wings** even while a chip is filtering the column,
    because the annunciator on the masthead counts both: a control labelled
    "mark all read" that leaves the disc lit has not done what it says. The
    tooltip states this rather than leaving it to be found, and while a chip
    is filtering, the stamp engraves BOTH WINGS beside its label, because a
    tooltip never shows for keyboard focus.
  * It runs the **dwell's own 420 ms drain**, staggered down the column from
    the top, so the confirmation is the same mechanic the reader already
    knows, shown at scale, rather than a new one. The stagger is capped in
    TOTAL (`min(40ms, 640ms / n)`): at a flat per-card delay a full window
    takes longer to clear than the drawer takes to open, and the reader ends
    up watching an animation instead of receiving a confirmation. Reduced
    motion strikes in one tick.
  * With nothing to strike it goes **inert, not gone**, since a control that
    vanishes when idle moves every other control out from under the pointer
    and returns in a place nobody is looking. Inert is `aria-disabled` plus a
    class, never the `disabled` attribute, which would drop focus to the body
    at the exact moment the last dispatch is struck and lose the keyboard
    reader the drawer.
  * The drain is invisible to a screen reader, so the strike announces itself
    once through a polite live region, re-armed whenever the count grows.
  * One write and one re-sync for the whole window: `markReadMany()` is the
    single path and `markRead()` is a one-element call into it. Striking a
    window a dispatch at a time serializes a localStorage write and a full
    re-sync per card.
- **The dwell shows its work**: resting adds `.reading`, which drains the
  jewel over exactly the 420 ms the timer runs, leaving the empty bezel. A mechanic with no button to press otherwise does
  something invisible and then jumps; leaving early drops the class and the
  rim refills, so an aborted read looks aborted. Reduced motion keeps the
  timing and drops the travel (the diamond fades where it stands).
- 420 ms is chosen against the traverse, not the glance: reaching the drawer's
  close button crosses every plaque in the column, and marking on bare
  `pointerenter` would empty the badge as a side effect of aiming at the
  hatch. Touch is excluded outright, because a tap fires `pointerenter`, which would
  mark dispatches read for being scrolled past under a thumb.
- The dwell starts on a pointer **movement** that lands on the card, never on
  `pointerenter` by itself. When content moves under a parked pointer (the
  drawer sliding in, a poll pushing the column down, a chip reflowing it),
  Chrome raises enter events with no movement at all, and each of those used
  to strike whichever plaque arrived under the cursor. A card that leaves the
  column mid-dwell, or is moved by the poll, has its dwell cancelled; so does
  every card when the drawer opens or shuts. A dwell that runs its full
  420 ms on a card still in the column marks it read, even when a poll that
  drops that dispatch is already on its way. The reader rested on a plaque the
  hall was showing, and the hall cannot know the hub has let it go until the
  answer lands.
- **Unread signal (masthead)**: a jewel lamp set at 45° in the Ledger
  hatch's housing, an annunciator on the dispatch cap rather than a badge
  pinned to the button's bounding box. It is an emitter, so at night it
  blooms (6 to 7px); by day it is coloured glass. It carries no numeral: the
  count is exposed through the button's tooltip and an `.sr-only` span, and
  on hover and keyboard focus the same count is engraved just outside the
  housing, clear of the focus ring, since a title tooltip never reaches
  focus. Motion is arrival-only: a single 260 ms seat when the count
  *grows*, never on a re-poll that returns the same dispatches, since the
  hall at rest is silent architecture.
- Filter chips ALL / SALON / BUREAU: session-only, reset to ALL on every
  load; **no code path ties the lever to the chips** (R11). Chips are a
  radiogroup with arrow keys.
- Empty state: small ornament + "No dispatches". Loading: hairline-pulse
  plaques (no gray skeleton blocks), kept until the first feed lands, the
  drawer opening included. A feed that could not be read says "The Ledger
  could not be read" under the same ornament; only a feed that answered
  empty may say "No dispatches". After one good read a failed poll keeps the
  plaques, since a dispatch that happened is still true when the hub goes
  quiet. The first feed landing in an open drawer falls in as the opening
  cascade.
- Client keys DOM nodes by dispatch id, so re-polls never re-animate existing
  plaques; same-id dispatches update in place. A dispatch this page has
  already shown does not play its arrival again after dropping out of one
  poll (a hub restarting).

## Ticker (status band, not an echo)

The band under the masthead carries **status segments** (LINES OPEN n/3 ·
per-gate live stats) plus only dispatches **still unread**. When nothing is
new: a static line, no scroll. Pauses on hover AND focus. The crawl runs at
50 px/s times `--ui`, measured on one copy of the loop (the old per-character
rate counted the `aria-hidden` twin as well and ran at half speed). Reduced
motion = static line with at most a slow crossfade rotation: an overflowing
band is set in pages that each fit, broken only between segments, and turns
one every 6 s with a 0.9 s crossfade, held on hover and focus. A single
segment wider than the band gets a page of its own and an ellipsis. Every
page stays in the accessibility tree, so a screen reader hears the band once
and whole. The ticker draws from the same unfiltered feed as the Ledger and
ignores both the lever and the chips (R11).

It is the one surface a read does **not** update on the spot, and no poll
rebuilds it under a reader either. A band that says something new waits for
its moment: the loop coming round (the one instant the track stands at its
own start), the pointer or focus leaving a still band, or the next page turn.
A poll that says the same thing changes nothing on screen. Losing the hub or
finding it again lands at once, with NO WORD FROM THE HUB in place of the
line count. A language switch, a motion change and a new band width re-set
it at once as well.

## Mode lever (R11)

Two-position lever plaque, SALON ◆ BUREAU: `role="switch"`, named for the
wing it lights ("Bureau wing"), with the Salon/Bureau explanation as its
description. Space or Enter toggles, a held key does not repeat, W throws it
from anywhere in the hall. Throwing it re-lights the three metal surfaces and
swaps the wings in place; it never touches the Ledger or ticker content.
Persisted in localStorage. On the desk the live wing is shown by the lit
pilot jewel in its throw plate.

## Settings: PREFERENCES (R4/R5)

Full-screen overlay, deco clip-path sweep reveal, focus-trapped, Esc closes,
close button top-right. The panel (v6) is Dunand black lacquer with a leaf
fillet and stepped gilt corner brackets, each preference in a shagreen well
(by day pale shagreen with ebonised fillets). The controls are switchgear
laid under the unchanged radios: appearance a three-way rotary with a pilot
jewel over each legend, language a double-throw knife switch on slate,
engraving size an interlocked push-button bank, motion a three-position bat
toggle, REPLAY ENTRANCE a spring-return key. Roles, roving tabindex, the
focus trap and Esc are unchanged; focus is a champagne collar round the
legend's jewel plus a rule under its name. The radios:

- Appearance: Onyx / Ivory / Follow system (follow-system attaches a
  `matchMedia` change listener and applies the 400 ms crossfade live)
- Language: English / 中文
- Engraving size: Fine / Standard / Signboard, the reader's `--ui-user`
  correction on top of the viewport's own step. Resolved pre-paint from
  `atrium.ui` like the theme: type that resizes after first paint reflows
  the whole hall in front of the reader. Changing it re-solves the stage,
  because `--ui` moves the arch module as well as the lettering.
- Motion: Full / Reduced / Follow system (the default). The choice is
  `data-motion-pref`; `data-motion` is what it resolves to, re-resolved live
  when the OS setting changes, and it is the only thing the stylesheet and
  the scripts read. There are no raw `prefers-reduced-motion` queries: they
  used to override a reader who chose Full.
- Replay entrance (a one-shot flag, see "Entrance animation")

All persisted in localStorage, and carried to other open hall tabs by a
`storage` listener that applies without writing back. No theme or language
controls anywhere else. The dialog is `aria-modal` and makes everything
behind it `inert` while open.

## i18n

All strings via en/zh dictionary. Feed headlines composed client-side from
`kind` + `params` so already-fetched dispatches localize on switch. Relative
times and date line localized. Ages are floored (59 min, never a rounded
"60 min"), and past 48 h they count calendar days. No dispatch line says
"today": a plaque under EARLIER is read after its day has ended. Hairline
rules are flexbox-driven from text width, never absolutely positioned (zh/en
width shift).

## Backend (FastAPI, 127.0.0.1:8769)

Python 3.11 global interpreter (fastapi/uvicorn/httpx verified). Launcher:
`run_hub.bat` (`PYTHONUTF8=1`, `cd /d`, append log) + `run_hub_hidden.vbs`.

Endpoints:

- `GET /`: static frontend
- `GET /api/services`: the registry, drives gate rendering: `[{id, name,
  wing, url, addr, sigil, desc_key, launch_hint, order}]`. Registry entry
  mandatory per service; adapter and custom sigil optional (no adapter =
  lamp-only gate, no dispatches).
- `GET /api/status`: served **from adapter caches** (no on-demand probing):
  `{services: {id: {state: 'open'|'dark', latency_ms, note}}, generated, warm}`
- `GET /api/feed`: `{dispatches: [{id, origin, wing, kind, params, ts,
  url}], generated, warm}`
- `GET /api/stats`: `{stats: {id: {kind, params}}, warm}` (piggybacked by client)
- `GET /api/works`: host instrumentation for the west board:
  `{cpu:{pct,cores}, mem:{pct,used_gb,total_gb}, gpu:{pct,used_gb,total_gb,
  util_pct,name}, net:{pct,down_mbs,up_mbs}, disk:{pct,free_gb,total_gb,
  label}, hub_uptime_s, host_uptime_s}`. Every member is nullable. No
  `psutil`, no NVIDIA card and no throughput baseline yet are all normal
  states. `psutil` supplies processor/memory/traffic/store, `nvidia-smi`
  the card; both sit behind TTLs (3.5s and 6s) and run in a worker thread,
  so an idle hub samples nothing and a subprocess never touches the loop.
  The traffic dial's full deflection is a saturated gigabit line.
- `GET /api/almanac` returns the east board: `{place:{name, name_zh, lat, lon,
  timezone}, weather:{code, label, label_zh, now_c/f, high_c/f, low_c/f,
  precip_prob, wind_kmh, sunrise, sunset, utc_offset_s}|null, age_s,
  generated}`. `weather` is nullable and the board is built for it; `place`
  never is, because the sun and the moon are drawn from it alone. Open-Meteo,
  no key, one GET per 15 min, or 120 s after a miss, since a service that is
  down stays down past one board poll, serialized on a lock.

**Time contract**: feed `ts` is **epoch milliseconds**. Normalization:
Ground Station `ts*1000`; Autopilot ledger `ts*1000` (epoch seconds on the
wire); outreach `invitedAt` as-is,
`finishedAt*1000`; anime naive ISO via
`datetime.fromisoformat(s).timestamp()*1000` (machine-local, never
`utcnow()`; machine is UTC+8, the classic bug shifts 8 h). Same rule for
`last_sync` staleness. Day breaks computed in the browser's local timezone.

**Deterministic dispatch ids** (feed idempotent across hub restarts):
`gs:<seq>` · `ap:<seq>` · `anime:notif:<bgm_id>:<detected_at>` ·
`anime:unresolved:<bgm_id>` ·
`outreach:queue-ready:<local-date>` · `outreach:progress` (single mutable
item, replaced in place) · `outreach:invites:<local-date>` (mutable).

### Adapters

**Anime Autopilot** (`127.0.0.1:8767`, GET-only, server-side, no CORS.
*Never POST*: `/api/notifications/read` would eat the user's panel banners):

- 60 s: `GET /api/notifications` (~50 ms). Known kinds enumerated:
  `kind == "completed"` → finished-show; **key absent** → premiere
  (`promoted` flag); any other kind value → drop and log, never default into
  the premiere branch. Window: `read == false` + `detected_at` within 7 d.
  `GET /api/unresolved` → warning dispatches.
- 5 min: `GET /api/overview` → grace alerts (`status=='grace'`,
  `grace.expires` epoch s), daemon health (`last_sync` stale >15 min,
  `qb_ok`), watching count stat.
- Daemon health is a **Ledger line**, not just the lamp's hover title:
  `autopilot.stalled` (`since`, `hours`) or `autopilot.qb_down`, with the
  stall winning when both are true, because a daemon that is not running is not
  running to reach qB either, and naming the symptom would point at the wrong
  box. Both are stamped `now` and re-stamped every slow tick, because these
  are conditions still true rather than events that happened: dated at onset
  they would sink down the Ledger exactly as far as the outage is long. The
  id carries the stalled-since ms, so one outage is one line the reader can
  strike, while a stall after a recovery is a new id that speaks up again.
  Only the panel on `:8767` answers this API, so from here a dead watch
  daemon and a healthy one look identical apart from `last_sync`, which is
  how 2026-09-04 went unnoticed for two days behind a green lamp.
- Episodes ("which anime landed"): `GET /api/events?after_seq=<cursor>&limit=200`,
  Autopilot's append-only ledger, with the cursor in `state/cursors.json`.
  Kinds `episode.landed` / `show.subscribed`; any other kind → drop and log.
  `ts` is epoch **seconds** here and must be multiplied on the way in.
  Autopilot returns events **ascending** by seq (`hasMore` means NEWER matches
  remain), so the catch-up walks the cursor FORWARD, the mirror image of the
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
  because it retells what `updated` already said and is the one kind Ground
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

Warm-up: until the first round of adapter ticks has come back, every source
is as its constructor left it (lamp checking, no dispatches, no stat).
`/api/status`, `/api/feed` and `/api/stats` hold a request for up to
`WARM_WAIT_S` (8 s) while that round is out, and every one of them carries
`warm`, false when it had to answer before the round finished. A page that
polled in that window used to take the empties as truth: the Ledger emptied,
then replayed every plaque as an arrival on the next poll.

## Client polling

`/api/feed` + `/api/status` (+stats) every 45 s, gated on
`document.visibilityState`, immediate refetch on tab refocus. The dateline
and the Ledger's TODAY / EARLIER break do not wait for a poll: a timer aimed
at the next local midnight turns them with the clock's date aperture.

- Every request gives up after 12 s, so a hub that hangs is a failed poll
  rather than one that never ends.
- The hall says when it has lost touch. A `/api/status` that is refused,
  errors, or returns a body that is not a status puts every lamp back to
  "…", and the live region and the band say NO WORD FROM THE HUB instead of
  a line count nobody can vouch for. A failed `/api/stats` takes the stat
  lines off the gates. Holding the last good reading made a dead hub look
  exactly like a healthy hall.
- After a miss (or a cold payload, or a boot that could not reach the
  registry) the hall asks again 15 s later instead of waiting out the beat.
- A payload marked `warm: false` comes from a hub still on its first round
  of adapter polls. Its empties mean "not asked yet", so it is not applied.
- Polls overlap (the beat, a refocus, a retry); their answers apply in
  order, and an older one never overwrites a newer one.

## Implementation notes (60 fps)

Stage gates live in fixed slots placed by `transform`, which never
animates a slot; a throw moves them only by `translate` and opacity. The
theme changes as one 400 ms view transition: the old hall, captured as a
picture, fades out over the new one, and the flip underneath lands with
every transition cut (`.theme-cut`). Per-element transitions could not do
it: the wall, floor and dado are gradients, which do not interpolate, and
the ~1,100 colour transitions a flip started restyled the page every frame.
Wing re-lighting uses a **scoped** transition list (`color,
background-color, border-color, fill, stroke, opacity`) on themed elements.
No universal `* { transition }`.
Custom properties don't interpolate; the consuming elements transition.
Wordmark letters are spans with transforms. `prefers-reduced-motion` and the
Motion setting collapse all of the above to fades/instant.

## Accessibility summary

- **Tab order (v5)**: masthead (Ledger hatch, Preferences) > ticker > the lit
  wing's gates, left to right > lever. The waiting wing and the shut Ledger
  are `inert`: the drawer used to sit in the tab order off screen, and since
  focus marks a dispatch read, one pass of Tab struck the whole Ledger.
- **Keys**: arrows walk the lit gates, digits jump to one, Enter opens it, W
  throws the lever (focus lands on the gate in the same bay of the other
  wing), L opens and closes the Ledger (arrows then walk its dispatches), P
  opens Preferences, ? shows the key plate, Esc closes the top layer. Nothing
  fires with a modifier held, over Preferences or during the entrance.
- **The Ledger drawer** lives at body level beside its scrim (inside `#hall`
  it painted under the scrim on every quiet boot). Opening it moves focus to
  its heading; while open, Tab cycles the drawer and its hatch. The poll
  moves a plaque only when it is out of place, so focus survives it. When
  the focused dispatch leaves the feed, focus goes to the next plaque down
  (else the one above, else the heading), and that move marks nothing read:
  the hall put the caret there, not the reader.
- **Names**: a gate is named by its engraved name and lamp word and described
  by its description, status line, service note and "opens in its own tab".
  Service warnings are engraved on the apron above the lamp, not hidden in
  a title. The
  ticker is a `marquee` whose loop copy is `aria-hidden`. Day breaks are
  headings. Plaques say "unread" while they are. The Almanac and Statistics
  speak their readings. English signage carries `lang="en"` in the Chinese
  hall.
- **Forced colours**: every selected or lit state gets a Highlight border or
  fill; the wall and floor keep their own colours. Readers who ask for more
  contrast or less transparency get an opaque scrim.
- Chips radiogroup; lamps always carry text; AA contrast per the token
  matrix.

## Depth pass (v3, client mandate: keep the motion, kill the flatness)

v6 keeps this section's 3D chain, pose tilt and parallax. Its slab, floor,
reflection, entrance and ban-list bullets are superseded by "The picture
palace (v6)" and the Entrance timeline.

Depth comes from GEOMETRY, LIGHT and OCCLUSION, never filter soup. One key
light, near-vertical (skylight): every shadow offset points down, slight x.

- **Scene**: `perspective` as a plain property on `.gate` (never
  `preserve-3d` on #gates, because it would replace the load-bearing active/receded
  z-index contract with depth sorting). Per-gate chain:
  `.gate {perspective:900px}` → `.g-pose` (`preserve-3d`, static wing tilt,
  transitioned with the stage choreography) → `.g-shell` (pointer parallax,
  NO transition, since a transition would smear the tilt) → flat children (the
  intra-gate z-index stack survives verbatim).
- **Triptych pose**: receded flanks tilt inward `rotateY(±10deg)` via
  `--side` set by layoutStage, an altar-wing composition.
- **Pointer parallax**: one rAF lerp loop (k≈0.1) writes each `.g-shell`'s
  transform directly (±5°/−3°). It used to write `--par-x/--par-y` on
  #stage for the shells to read through calc(), and because custom
  properties inherit, every frame recalculated style for the whole stage:
  1.1-1.3 s of style work over a three-second pointer sweep at 3440, now
  80 ms. Gated on `(hover:hover) and (pointer:fine)`,
  `data-motion!=reduced` (checked live, because the CSS kill-switch can't stop rAF
  writes), `visibilityState`, and starts only after the entrance finishes.
- **Slab thickness**: `.g-back`, an arch-shaped backing layer (border-radius
  arch, so box-shadow works) offset along the light vector, carrying the
  two-shadow grounding pair: tight contact + broad soft penumbra
  (`--shadow-drop`/`--shadow-soft` theme tokens; ivory shadows derive from
  ink, never pure black).
- **Floor**: one-point-perspective plane under the gates
  (`rotateX(~55deg)`, own perspective), deco seam grid converging behind the
  stage, dissolving into the base color at the far edge (atmospheric
  falloff; the fade also hides aliasing). The stage-glow line remains as the
  horizon sheen at the plinth.
- **Reflections**: each gate carries a `.g-mirror`, a scaleY(−1) clone of
  its frame below the plinth, gradient-masked to die within ~35% height,
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
  motion. Depth is not motion; only parallax and the entrance are.

## Steampunk pass (v3.1, revised v4.1): the signal desk and the
deco-machine fusion

Design stance (from the BioShock/Rapture research): kitsch is prevented by
COHERENCE, not restraint alone. Machinery is sublimated by finishes. The
mechanism lives inside architectural casework and is revealed at exactly one
deliberate aperture per region. Mechanism density is a gradient that peaks
at the machine standing on the floor and dies before the architecture
above.

### Material law: statuary bronze (v6)

The v3.1 oiled-bronze family (flat fills and hairlines, no bitmaps) is
retired on the desk. The console is statuary bronze under the palace's
material law: six stops, `--sb-oil` and `--sb-0` to `--sb-5` (oil in the
recess, shade, body, lit body, crest, hot rim), with `--sb-band` (the horizon
reflected in the faces) and `--sb-top-far` / `--sb-top-near` for the top
plane. Every coplanar face shares one gradient, so the horizon band runs
straight across pilasters, panels and field. `patina-statuary.webp` carries
the brushing, an uneven patina and a few casting pits as signed alpha, so it
relights any bronze with no blend mode. Leaf sits only on wear points, in
the wing's leaf: the cornice nosing, the body's arrises at hip height, the
plinth toe, the pilaster bases and the quadrant's inner lip. The console is
the dark object in the room in both themes. `--steam` and `--machine-edge`
keep their v3.1 meaning.

### New ornament classes (with their own density laws)

- **Rivet line**: retired from the desk in v6 (its screws have domed heads
  and hashed slots). Rivets survive on the reserved gate's iron and the
  cartouche bezels.
- **Knurl band**: short radial ticks at even pitch, the machined cousin of
  the Greek key; bridges deco and machine. Allowed on the masthead rosette's
  outer ring, dial bezels, grip surfaces. One ring per element.
- **Machined gear**: trapezoid teeth on ISO proportions (addendum 1.0 m,
  dedendum 1.25 m), spoked rim, evenodd cutouts. A gear MUST mesh with a
  partner and rotate only when driven (max 2 gears page-wide, both on the
  desk). No idle motion anywhere: the hall at rest is silent architecture.
- **Steam puff**: event-only, 4–6 soft sprites per burst from the one vent
  on lever throw. Never ambient, and no entrance wisp since v6.
- **Pneumatic main**: the Ledger spine re-read as a brass dispatch tube,
  shaded across its width, with lit collars at the day breaks; the cards'
  cartouches hang from it. Pipes must plumb something.

### The signal desk (`#signal-desk`)

The only region with full mechanism density; even here the drive train must
be traceable: lever → hidden rack → gear pair → vent.

**What changed in v4.1.** This was a full-bleed bronze rail across the foot
of the page. Once the hall had a floor, the bar read as a strip of UI taped
under the picture rather than as anything standing in the room, so the
housing band, the LINES dial (the ticker already counts the lines) and the
maker's plate are struck, and what remains is the machine itself, planted
centre stage on the terrazzo. The maker's plate is re-hung at the foot of
the works board it names. The desk deliberately stays OUTSIDE the aisle
grid: the boards fold away below 2800px, and the wing switch may never fold
away with them.

- **Placement**: `position:fixed; bottom: 10px·--ui` centred, a body-level
  sibling AFTER `#hall` (never inside, because parallax vars are scoped to #stage;
  a transformed ancestor would trap the fixed box). `z-index:50`, above
  hall content, **below** prefs scrim (60), grain sheet (95), entrance
  (100). The box is transparent and `pointer-events:none`; only the lever's
  hit surface takes the pointer. `body` reserves no bottom clearance any
  more. The hall owns every pixel down to the edge.
- **Anatomy** (signal-box pattern, drawn by `static/js/desk.js` since v6):
  a notched quadrant plate and a railway points lever (black enamel shaft,
  polished steel grip with the catch handle behind it, a rod to the catch
  block on the quadrant, a brass badge reading 1, WINGS; the wing metal is
  the ferrule where the grip meets the shaft), ±16° throw; behind it a
  glazed inspection window over the meshed gear pair, with a lamp at the
  head of the well lit at night; the steam vent pipe with its collar. The
  SALON and BUREAU throw plates are cast brass, engraved and filled black,
  each with a pilot jewel. The assembly scales with the lettering
  (`0.72 + 0.28·--ui`).
- **Drive**: one scalar `--drive` (0 = salon, 1 = bureau) written by a JS
  rAF driver onto `#signal-desk`. Only the desk reads it, and a custom
  property changed on `:root` restyles the whole page on every frame of the
  throw. Lever (±16°), gear A (90°) and pinion B (−180°, ratio
  −N_A/N_B) all derive via calc. Sync is structural. Meshing law: shared
  module, center distance = r_pA + r_pB, interleave phase
  `((1+N_A/N_B)·φ + 180 − 180/N_B) mod (360/N_B)` baked as a static
  transform (never in the CSS-animated one).
- **Feel**: weighty piecewise ease (fast start → ~4.5% overshoot → damped
  clank settle, ~520 ms), starting from the rest pose: the throw's time
  is clamped at 0, so an early first frame cannot kick the arm backwards
  past its stop. Steam burst latched at 55% of the throw;
  interrupt-safe (re-toggle reads current `--drive`). Reduced motion: snap
  `--drive`, no steam, no overshoot. Gears stay correct for free.
- **Layers**: `.desk-art` (static housing, `contain: layout paint`,
  painted static gear shadows) / `.desk-fx` (the three movers + nozzle,
  overflow visible so puffs escape) / `#lever` (the invisible hit surface,
  same id, `role=switch`, Space/Enter, aria-checked, i18n attributes; all
  existing JS bindings survive relocation verbatim). The gear well clips
  via `overflow:hidden` on an inner div, never `clip-path` on the shell.
- **Boot**: `html[data-boot="suppressed"] #signal-desk` mirrors the hall
  fade; under a played entrance the curtain opens on the desk standing. Tab order is now masthead → ticker → gates → chips →
  plaques → lever (footer-last, re-documented).

### The console casework (v4.3)

v6 recast this casework in statuary bronze (a foreshortened top plane, a
dentil course, a frieze of cast fans and ziggurats, fluted pilasters, sunk
panels with hashed motifs, an archivolt round the window, a Portoro plinth).
The desk stands on the wool runner and has a contact shadow in the pile, no
floor return. The history below explains the stance that still holds.

**What was wrong.** v4.1 put the machine on the floor but never gave it a
body. What stood there was three loose parts sharing a patch of terrazzo: a
lever pivoting at y=212 on nothing, a quadrant arc hanging in mid-air above
it, and an aperture cut into no surface at all. Two measurements say it
better than any amount of looking:

- the housing tone `--bronze-deep` against `--terrazzo` is **1.05:1**. Every
  solid face on the machine was invisible; only the `--bronze` hairlines
  (2.58:1) survived, so the eye received a handful of strokes and no volume.
  `scripts/contrast.py` is the check.
- the aperture was **176×56**, the one bare rectangle in a hall built out
  of arches, arcs and stepped shoulders, and an 88-wide gear crossing a
  56-tall slot shows as a shallow band with no centre. The drive train was
  drawn in full (63 nodes) and read as a stray arc.

**The fix is the stance already in this document**: mechanism is sublimated
by casework, and revealed at exactly one deliberate opening. So the parts
are housed in a bronze console that *stands* on the stone:

- **Body**: stepped plinth (two courses on the gates' own 6px shoulder),
  fluted pilasters (the aisle bays' articulation at furniture scale), a
  knurl frieze, a two-step cornice cap. Every profile is already in this
  building; that is what keeps it furniture in this room rather than a
  machine parked in it.
- **Tone**: three flat planes: `--bronze-cap` (lit tops and proud faces),
  `--bronze-face` (fronts), `--bronze-deep` (recesses). `--bronze-face` is
  new and exists because the old housing tone was specified when the desk
  was a rail with the page behind it. Face-over-floor is 2.19:1 (onyx) and
  2.29:1 (ivory); cap-over-face is 1.38:1 and 1.35:1, so both themes get the
  same turn between planes. Ivory inverts the stack: a bronze console on
  pale stone is the *dark* object in the room.
- **Aperture**: a semicircular arch, 112×60, with archivolt and keystone,
  the hall's own figure, and narrow enough that the gear inside reads as
  round (48px of it showing instead of 34, across a 112 opening instead of
  176).
- **The lever is bolted to it.** The pivot moved from the floor (y=212,
  *below* the console's own foot) onto the plinth top at y=186, and the arm
  is `scale(.7)` about that pivot so its throw stops sweeping wider than the
  machine it belongs to. The quadrant plate is on the same 0.7. It is what
  the arm's pawl runs on, and if one scales without the other they stop
  being one mechanism. At 0.7 the arc band lands at y 90-102, which is the
  frieze: the plate is screwed to the console's face instead of floating.
- **It stands, so it returns.** The waxed floor brings back every arch, the
  clock and both aisle cases; the machine was the one object in the hall
  with no reflection, which is precisely why it read as pasted onto the
  floor. It gets a contact shadow and a three-course return (flat tones, not
  a gradient. Over 14px the parallel-smear error is sub-pixel, so the
  plane-space rule the tall reflections need does not bind here).
- **The vent leaves at the top.** The stack used to run *down* the front
  from y=112 to 202, which, once there was a console behind it, read as a
  black post driven through the casework. It rises off the cornice at x=240,
  the one gap clear of both the arch (ends 236) and the BUREAU plate
  (starts 254).
- **The throw plates sit on the cap**, bottom-anchored at y=96. Anchored
  from the top they drifted off the cornice as soon as `--ui` changed the
  label's own height.

**Verifying it.** `scripts/contrast.py "#a" "#b"` checks a machine tone
against the floor it stands on.

### Entrance beat

The v3.1 vault unlock is replaced by the house curtain (see "Entrance
animation").

### Ban list (v3.1 additions)

No glued-on gears (every gear meshes and is driven); no costume tropes
(goggles, airships, clockwork octopi); no rust/verdigris/grunge bitmaps; no
idle machinery or looping steam; no Art-Nouveau scrollwork (machine
ornament is machined: knurl, flute, rivet, flange); no orphan pipework; no
sepia palette coup. Steampunk arrives as geometry plus one bronze family;
no steam-as-atmosphere; no mechanism in gate sigil/keystone zones, on
plaque bodies, or above the ticker (masthead knurl ring excepted); no
autoplaying audio; the lever is never a styled checkbox that snaps, but
the ritual must not delay the actual mode switch beyond ~450 ms or break
`role=switch` semantics.

## Non-goals (v1)

No auth (localhost only), no write actions against services, no process
management, mobile layout. (woff2 recompression of the CJK face was a
standing future item under Noto Serif SC; it is now ruled out by the IPA
licence. See Typography. The face is 11 MB rather than 25, which is most of
what the recompression was for.)
