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

Desktop-first: optimized 1440–1920px, supported down to 1280px. Below 1280px
the Ledger moves beneath the stage; below ~900px everything stacks
single-column (masthead → ticker → lever → active gates → receded gates →
Ledger). Mobile is out of scope for v1 but must not break.

Masthead: monogram rosette · "ATRIUM · GRAND CONCOURSE" · localized date
line · settings trigger at right edge. The settings trigger is a rosette of
visibly distinct construction (keyhole center), with a persistent caption
"PREFERENCES" beneath, hover glint, focus ring, aria-label.

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

### Composition (PREFERENCES → THE CLOCK)

- **STATION** (`data-clock="band"`) — the dial hangs above the gates and the
  Ledger keeps its standing right-hand column. The clock sits on the stage
  axis. The clock row is sized explicitly: the Ledger spans rows 3–4 and is
  far taller than either, and an auto row would absorb that surplus and
  stretch the clock to the Ledger's full height, driving the gates
  off-screen.
- **CONCOURSE** (`data-clock="hall"`) — the dial owns the viewport axis, the
  gates stand in a row beneath it, and the Ledger withdraws into a right-hand
  drawer called by the dispatch-tube trigger in the masthead. The trigger
  carries a count of dispatches since the drawer was last opened. The drawer
  is a real dialog: scrim, Escape, focus return.

Never write `margin: <custom-property> auto` on the clock box — the shorthand
resolves the property's second value into `margin-right` and `auto` into
`margin-left`, which end-aligns the dial. Vertical margin is set on its own
longhands and centring is `justify-self`.

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

- **Seen/unseen watermark**: localStorage last-visit timestamp. Dispatches
  newer than the watermark get a champagne rim + small ◆ marker. The Ledger
  itself always shows the full window.
- Filter chips ALL / SALON / BUREAU: session-only, reset to ALL on every
  load; **no code path ties the lever to the chips** (R11). Chips are a
  radiogroup with arrow keys.
- Empty state: small ornament + "No dispatches". Loading: hairline-pulse
  plaques (no gray skeleton blocks).
- Client keys DOM nodes by dispatch id — re-polls never re-animate existing
  plaques; same-id dispatches update in place.

## Ticker (status band, not an echo)

The band under the masthead carries **status segments** (LINES OPEN n/3 ·
per-gate live stats) plus only dispatches **newer than the watermark**. When
nothing is new: a static line, no scroll. Pauses on hover AND focus; reduced
motion = static line with at most a slow crossfade rotation. The ticker draws
from the same unfiltered feed as the Ledger and ignores both the lever and
the chips (R11).

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
→ Ledger plaques → machine-rail lever (footer-last). Lever `role=switch`;
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

## Steampunk pass (v3.1) — the machine rail and the deco-machine fusion

Design stance (from the BioShock/Rapture research): kitsch is prevented by
COHERENCE, not restraint alone. Machinery is sublimated by finishes — the
mechanism lives inside architectural casework and is revealed at exactly one
deliberate aperture per region. Mechanism density is a gradient that peaks
at the bottom rail and dies before the architecture above.

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
  machine housings (rail edge, seam plates, builder's plate corners) —
  never on paper/plaque surfaces, never on gate frames.
- **Knurl band**: short radial ticks at even pitch — the machined cousin of
  the Greek key; bridges deco and machine. Allowed on the masthead rosette's
  outer ring, gauge bezel, grip surfaces. One ring per element.
- **Machined gear**: trapezoid teeth on ISO proportions (addendum 1.0 m,
  dedendum 1.25 m), spoked rim, evenodd cutouts. A gear MUST mesh with a
  partner and rotate only when driven (max 2 gears page-wide, both in the
  rail). No idle motion anywhere: the hall at rest is silent architecture.
- **Steam puff**: event-only — 4–6 soft sprites per burst from the one vent
  on lever throw (plus one wisp as the entrance doors part). Never ambient.
- **Pneumatic main**: the Ledger spine re-read as a brass dispatch tube —
  edge hairlines + collar rings at day-break junctions; medallions gain one
  concentric ring (carrier end-caps). Pipes must plumb something.

### The machine rail (`#machine-rail`)

The only region with full mechanism density; even here the drive train must
be traceable: lever → hidden rack → gear pair → vent.

- **Placement**: `position:fixed; bottom:0` full-bleed footer, a body-level
  sibling AFTER `#hall` (never inside — parallax vars are scoped to #stage;
  a transformed ancestor would trap the fixed box). `z-index:50` — above
  hall content, **below** prefs scrim (60), grain sheet (95), entrance
  (100). `body { padding-bottom }` clears the Ledger tail. The old
  `#lever-row` grid row is deleted from both grid templates.
- **Anatomy** (signal-box pattern): bronze housing band (~88 px) with a
  gold top hairline + rivet row and two riveted seam plates; left — enamel
  gauge, LINES 0..n, knurled bezel, needle on `--gauge`; center — notched
  quadrant plate (ratchet teeth, deep end notches, SALON/BUREAU engraved at
  the arc ends) and the lever: bronze arm, polished `--metal` grip zone,
  riveted number plate, ±16° throw; behind it a hairline-framed aperture
  well showing the meshed gear pair; right — engraved builder's plate
  (ATRIUM WORKS · No. 8769 · MMXXVI) and the steam vent pipe with collar.
- **Drive**: one scalar `--drive` (0 = salon, 1 = bureau) written by a JS
  rAF driver; lever (±16°), gear A (90°) and pinion B (−180°, ratio
  −N_A/N_B) all derive via calc — sync is structural. Meshing law: shared
  module, center distance = r_pA + r_pB, interleave phase
  `((1+N_A/N_B)·φ + 180 − 180/N_B) mod (360/N_B)` baked as a static
  transform (never in the CSS-animated one).
- **Feel**: weighty piecewise ease (fast start → ~4.5% overshoot → damped
  clank settle, ~520 ms); steam burst latched at 55% of the throw;
  interrupt-safe (re-toggle reads current `--drive`). Reduced motion: snap
  `--drive`, no steam, no overshoot — gears stay correct for free.
- **Layers**: `.rail-art` (static housing, `contain: layout paint`,
  painted static gear shadows) / `.rail-fx` (the three movers + nozzle,
  overflow visible so puffs escape) / `#lever` (the invisible hit surface —
  same id, `role=switch`, Space/Enter, aria-checked, i18n attributes; all
  existing JS bindings survive relocation verbatim). The gear well clips
  via `overflow:hidden` on an inner div — never `clip-path` on the shell.
- **Boot**: `html[data-boot="suppressed"] #machine-rail` mirrors the hall
  fade; under a playing entrance the rail rises at ~2.1 s in the old
  lever-row slot. Tab order is now masthead → ticker → gates → chips →
  plaques → lever (footer-last, re-documented).

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
