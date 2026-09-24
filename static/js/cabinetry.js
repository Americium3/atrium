/* ==========================================================================
   The cabinetry: the Statistics and Almanac cases, the Ledger drawer and the
   Preferences panel, drawn as the furniture of a 1930s picture-palace foyer.

   This file only draws. Every reading, every read mark, every focus move and
   every preference stays in app.js, which calls in here for the art: the
   dials, the sky plate's enamel, the moon, the programme cards' fittings and
   the control hardware. Nothing here listens to anything.

   Siblings of one kind are one family and never identical. Each takes a
   stable FNV-1a hash of its own id (a dial's key, a dispatch's id, a case's
   name) and draws its small differences from that: screw slots, a serial,
   the turn of a bezel's brushing, a card's lean. A reload changes nothing.
   ========================================================================== */
(function () {
'use strict';

var NS = 'http://www.w3.org/2000/svg';

function fnv1a(s) {
  var h = 0x811c9dc5;
  s = String(s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* Draw k of hash h: an independent number in [0, 1). */
function draw(h, k) {
  var n = (h ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
function f2(v) { return (Math.round(v * 100) / 100).toString(); }
function sv(tag, attrs, cls) {
  var e = document.createElementNS(NS, tag);
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute('class', cls);
  return e;
}
function hx(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
/* A gradient whose stops are coloured by CSS classes: var() does not
   resolve inside a stop-color attribute. */
function grad(kind, id, attrs, stops) {
  var g = sv(kind, Object.assign({ id: id }, attrs || {}));
  stops.forEach(function (s) {
    var st = sv('stop', { offset: s[0] }, s[1]);
    if (s[2] !== undefined) st.setAttribute('stop-opacity', s[2]);
    g.appendChild(st);
  });
  return g;
}
function P(a) { return f2(a[0]) + ' ' + f2(a[1]); }
function polar(cx, cy, r, deg) {
  var a = deg * Math.PI / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}
/* An annular sector on the instrument's own clock (0 at twelve, clockwise). */
function sector(cx, cy, r0, r1, a0, a1) {
  var p0 = polar(cx, cy, r1, a0), p1 = polar(cx, cy, r1, a1);
  var p2 = polar(cx, cy, r0, a1), p3 = polar(cx, cy, r0, a0);
  var large = a1 - a0 > 180 ? 1 : 0;
  return 'M' + P(p0) + ' A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + P(p1) +
         ' L' + P(p2) + ' A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + P(p3) + ' Z';
}
function arc(cx, cy, r, a0, a1) {
  var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
  return 'M' + P(p0) + ' A' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + P(p1);
}

/* A slotted screw head, as small DOM: a domed brass disc whose slot is
   turned to the angle a real fitter left it at. */
function screw(seed, k, cls) {
  var s = hx('i', 'cs-screw' + (cls ? ' ' + cls : ''));
  s.setAttribute('aria-hidden', 'true');
  s.style.setProperty('--slot', f2(draw(seed, k) * 180) + 'deg');
  return s;
}

/* A moulded frame of four mitred facets. Each facet is its own element with
   the moulding's profile laid across its width, so the mitres are true and
   each side takes the one light at its own angle (the head brightest, the
   foot in shade). */
function frame(host, cls) {
  ['t', 'r', 'b', 'l'].forEach(function (side) {
    var f = hx('i', 'cf cf-' + side + (cls ? ' ' + cls : ''));
    f.setAttribute('aria-hidden', 'true');
    host.appendChild(f);
  });
}

/* ---------------------------------------------------------------- crests
   Cast gilt, drawn three times like the gates' crests: a cast shadow down
   and right, the body in the leaf's ramp, and a lit edge up and left. */
function crestPath(kind) {
  var d = '';
  var step = function (x0, y0, w, h) {
    d += 'M' + f2(x0) + ' ' + f2(y0) + ' h' + f2(w) + ' v' + f2(h) + ' h' + f2(-w) + ' Z ';
  };
  if (kind === 'works') {
    // The engine room's crest: a stepped setback carrying a half wheel of
    // rays, with speed lines running off both shoulders.
    step(38, 34, 44, 4); step(44, 30, 32, 4); step(50, 26, 20, 4);
    var cx = 60, cy = 26;
    for (var i = 0; i <= 8; i++) {
      var a = -90 + i * 22.5, long = i % 2 === 0;
      var r0 = 5, r1 = long ? 22 : 16, w = long ? 3.4 : 2.4;
      var p0 = polar(cx, cy, r0, a - w), p1 = polar(cx, cy, r1, a - w * 0.28);
      var p2 = polar(cx, cy, r1, a + w * 0.28), p3 = polar(cx, cy, r0, a + w);
      d += 'M' + P(p0) + ' L' + P(p1) + ' L' + P(p2) + ' L' + P(p3) + ' Z ';
    }
    d += 'M' + f2(cx - 6) + ' ' + cy + ' A6 6 0 0 1 ' + f2(cx + 6) + ' ' + cy + ' Z ';
    [[8, 30, 28], [14, 26, 22], [20, 22, 16]].forEach(function (s) {
      step(38 - s[2], s[1] + 1.2, s[2] - 2, 1.8);
      step(82 + 2, s[1] + 1.2, s[2] - 2, 1.8);
    });
  } else {
    // The almanac's crest: a sun in splendour between a crescent and a
    // star, on the same stepped setback, one course lower.
    step(40, 34, 40, 4); step(47, 30, 26, 4);
    var sx = 60, sy = 18;
    for (var j = 0; j < 16; j++) {
      var b = j * 22.5, lg = j % 2 === 0;
      var q0 = polar(sx, sy, 7.4, b - 7), q1 = polar(sx, sy, lg ? 15 : 11, b), q2 = polar(sx, sy, 7.4, b + 7);
      d += 'M' + P(q0) + ' L' + P(q1) + ' L' + P(q2) + ' Z ';
    }
    d += 'M' + f2(sx - 7.6) + ' ' + sy + ' A7.6 7.6 0 1 0 ' + f2(sx + 7.6) + ' ' + sy + ' A7.6 7.6 0 1 0 ' + f2(sx - 7.6) + ' ' + sy + ' Z ';
    // the crescent (waxing, lit side toward the sun)
    d += 'M30 11 A11 11 0 0 0 30 33 A14 14 0 0 1 30 11 Z ';
    // the star
    var st = [];
    for (var k2 = 0; k2 < 10; k2++) st.push(polar(92, 22, k2 % 2 ? 3.2 : 8, k2 * 36));
    d += 'M' + st.map(P).join(' L') + ' Z ';
    // the column the sun stands on
    step(57.5, 26, 5, 4);
  }
  return d;
}
function crest(kind) {
  var s = sv('svg', { viewBox: '0 0 120 40', 'aria-hidden': 'true' }, 'cs-crest');
  var defs = sv('defs');
  defs.appendChild(grad('linearGradient', 'cs-crest-' + kind, { x1: 0, y1: 0, x2: 0.35, y2: 1 },
    [[0, 'cs-l5'], [0.3, 'cs-l3'], [0.55, 'cs-l2'], [0.8, 'cs-l4'], [1, 'cs-l1']]));
  s.appendChild(defs);
  var d = crestPath(kind);
  s.appendChild(sv('path', { d: d, transform: 'translate(0.9 1.3)' }, 'cr-sh'));
  s.appendChild(sv('path', { d: d, transform: 'translate(-0.4 -0.5)' }, 'cr-lt'));
  s.appendChild(sv('path', { d: d, fill: 'url(#cs-crest-' + kind + ')' }, 'cr-body'));
  return s;
}

/* ---------------------------------------------------------------- the lamp
   A brass picture lamp: a trough shade on two swan-neck arms rising from
   backplates on the case's top rail. At night the slot under the shade is
   the emitter; the cone and the pool it throws are separate layers whose
   opacity belongs to the theme. By day it is a brass object and nothing
   more. */
function lamp(kind, seed) {
  var s = sv('svg', { viewBox: '0 0 200 40', 'aria-hidden': 'true' }, 'cs-lamp');
  var defs = sv('defs');
  var id = 'cs-lamp-' + kind;
  defs.appendChild(grad('linearGradient', id + '-tube', { x1: 0, y1: 0, x2: 0, y2: 1 },
    [[0, 'cs-b1'], [0.14, 'cs-b4'], [0.3, 'cs-b5'], [0.46, 'cs-b3'], [0.62, 'cs-b2'], [0.84, 'cs-b1'], [1, 'cs-b0']]));
  defs.appendChild(grad('linearGradient', id + '-stem', { x1: 0, y1: 0, x2: 1, y2: 0 },
    [[0, 'cs-b1'], [0.35, 'cs-b5'], [0.6, 'cs-b2'], [1, 'cs-b0']]));
  defs.appendChild(grad('radialGradient', id + '-cap', { cx: 0.36, cy: 0.32, r: 0.75 },
    [[0, 'cs-b5'], [0.4, 'cs-b3'], [0.7, 'cs-b2'], [1, 'cs-b0']]));
  defs.appendChild(grad('linearGradient', id + '-slot', { x1: 0, y1: 0, x2: 1, y2: 0 },
    [[0, 'cs-lit0'], [0.1, 'cs-lit1'], [0.5, 'cs-lit2'], [0.9, 'cs-lit1'], [1, 'cs-lit0']]));
  s.appendChild(defs);
  var x0 = 30, x1 = 170, y0 = 3, y1 = 19;
  // The shade's shadow on whatever is behind it, first.
  s.appendChild(sv('rect', { x: x0 + 1, y: y0 + 2, width: x1 - x0, height: y1 - y0, rx: 3.4 }, 'la-shade-sh'));
  // The stem: one tube from the back of the shade down to the case, with a
  // turned collar; its foot disappears behind the crest.
  s.appendChild(sv('rect', { x: 99.6, y: y1 - 2, width: 3.6, height: 24 }, 'la-stem-sh'));
  s.appendChild(sv('rect', { x: 98.2, y: y1 - 2, width: 3.6, height: 24, fill: 'url(#' + id + '-stem)' }, 'la-stem'));
  s.appendChild(sv('rect', { x: 96.4, y: y1 + 5.5, width: 7.2, height: 3, rx: 1.2, fill: 'url(#' + id + '-stem)' }, 'la-collar'));
  defs.appendChild(grad('radialGradient', id + '-spill', { cx: 0.5, cy: 0, r: 0.9 },
    [[0, 'la-sp0', 0.95], [0.3, 'la-sp1', 0.5], [1, 'la-sp1', 0]]));
  // The light escaping under the shade: the one emitter on the case.
  s.appendChild(sv('ellipse', { cx: 100, cy: y1 + 0.5, rx: 70, ry: 9, fill: 'url(#' + id + '-spill)' }, 'la-spill'));
  s.appendChild(sv('rect', { x: x0 + 3, y: y1 - 1, width: x1 - x0 - 6, height: 3.4, rx: 1.7,
    fill: 'url(#' + id + '-slot)' }, 'la-slot'));
  // the shade: a half cylinder lying on its side, its rolled lip toward us
  s.appendChild(sv('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 3.4,
    fill: 'url(#' + id + '-tube)' }, 'la-shade'));
  var flutes = sv('g', null, 'la-flutes');
  for (var fx = x0 + 8; fx < x1 - 5; fx += 6) {
    flutes.appendChild(sv('line', { x1: fx, y1: y0 + 2.2, x2: fx, y2: y1 - 3.4 }));
  }
  s.appendChild(flutes);
  s.appendChild(sv('rect', { x: x0 + 0.6, y: y1 - 3.4, width: x1 - x0 - 1.2, height: 2.6, rx: 1.3 }, 'la-lip'));
  s.appendChild(sv('rect', { x: x0 + 4, y: y0 + 3, width: x1 - x0 - 8, height: 1.4, rx: 0.7 }, 'la-glint'));
  // end caps: turned bosses with a stepped finial and a slotted screw
  [x0, x1].forEach(function (cx, k) {
    var cy = (y0 + y1) / 2;
    s.appendChild(sv('ellipse', { cx: cx, cy: cy, rx: 5, ry: 9.4, fill: 'url(#' + id + '-cap)' }, 'la-cap'));
    s.appendChild(sv('ellipse', { cx: cx + (k ? 3.4 : -3.4), cy: cy, rx: 2.4, ry: 5.2, fill: 'url(#' + id + '-cap)' }, 'la-cap'));
    s.appendChild(sv('circle', { cx: cx, cy: cy, r: 1.8 }, 'la-finial'));
    var a = draw(seed, 40 + k) * 180;
    var p0 = polar(cx, cy, 1.45, a), p1 = polar(cx, cy, 1.45, a + 180);
    s.appendChild(sv('path', { d: 'M' + P(p0) + ' L' + P(p1) }, 'la-slotline'));
  });
  return s;
}

/* The corner fans painted in gilt on the back of the door's black glass
   (verre eglomise), one for each corner, turned to face inward. */
function fanCorner(corner) {
  var s = sv('svg', { viewBox: '0 0 30 30', 'aria-hidden': 'true' }, 'cs-fan cs-fan-' + corner);
  var d = '';
  for (var i = 0; i < 7; i++) {
    var a = 90 + i * 15;
    var p0 = polar(0, 0, 5, a - 4), p1 = polar(0, 0, i % 2 ? 19 : 25, a - 1.2);
    var p2 = polar(0, 0, i % 2 ? 19 : 25, a + 1.2), p3 = polar(0, 0, 5, a + 4);
    d += 'M' + P(p0) + ' L' + P(p1) + ' L' + P(p2) + ' L' + P(p3) + ' Z ';
  }
  d += 'M0 3 A3 3 0 0 0 3 0 L0 0 Z ';
  var g = sv('g', { transform: 'translate(1.5 1.5)' });
  g.appendChild(sv('path', { d: d }, 'fan-leaf'));
  g.appendChild(sv('path', { d: 'M0 28 A28 28 0 0 0 28 0', fill: 'none' }, 'fan-rule'));
  s.appendChild(g);
  return s;
}

/* ---------------------------------------------------------------- the case
   A wall case of the foyer: a veneered carcass with its corners chamfered,
   boxwood stringing following the chamfer, a gilt bolection frame round a
   black glass door, a cast crest on the top rail and a picture lamp over it.
   The veneer's figure is placed by the case's own hash, so the pair never
   shows the same flitch. */
function dressCase(board) {
  if (!board || board.dataset.dressed) return;
  var kind = board.id === 'works' ? 'works' : 'almanac';
  var seed = fnv1a('case:' + kind);
  board.dataset.dressed = '1';
  board.style.setProperty('--fig-x', Math.round(draw(seed, 1) * 900) + 'px');
  board.style.setProperty('--fig-y', Math.round(draw(seed, 2) * 900) + 'px');
  board.style.setProperty('--sheen-x', (38 + draw(seed, 3) * 18).toFixed(1) + '%');

  var fr = board.querySelector('.bd-frame');
  fr.textContent = '';
  var carcass = hx('div', 'cs-carcass');
  var inner = hx('div', 'cs-inlay');
  carcass.appendChild(inner);
  fr.appendChild(carcass);
  fr.appendChild(hx('div', 'cs-string'));
  // the case's own apron moulding under the door, and its plinth bead
  fr.appendChild(hx('div', 'cs-bead'));

  var top = board.querySelector('.cs-top');
  if (top) {
    top.textContent = '';
    top.appendChild(lamp(kind, seed));
    top.appendChild(crest(kind));
    // The cone lives in the board's own stacking context, not the top's,
    // so its screen blend reaches the wood and the glass under it.
    var cone = hx('div', 'cs-cone');
    cone.setAttribute('aria-hidden', 'true');
    board.appendChild(cone);
  }
  var door = board.querySelector('.cs-door');
  if (door) {
    var glass = hx('div', 'cs-glass');
    glass.setAttribute('aria-hidden', 'true');
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { glass.appendChild(fanCorner(c)); });
    glass.appendChild(hx('i', 'cs-pin'));
    door.insertBefore(glass, door.firstChild);
    frame(door);
    var hl = hx('div', 'cs-reflect');
    hl.setAttribute('aria-hidden', 'true');
    door.appendChild(hl);
    door.appendChild(hx('div', 'cs-pool'));
  }
  var plate = board.querySelector('.cs-plate');
  if (plate && !plate.querySelector('.cs-screw')) {
    for (var i = 0; i < 4; i++) plate.appendChild(screw(seed, 10 + i, 'sc-' + i));
  }
}

/* ---------------------------------------------------------------- dials
   One instrument of four off the same bench: a turned brass bezel, an
   enamel face, a scale engraved over 240 degrees with a red lacquer arc on
   the last stretch, a lacquered needle with its counterweight and its own
   shadow, a domed boss, a zero adjuster, and a crystal over all of it. The
   four match; what differs is what the maker stamped on each one, and the
   way each was left: slot angles, serial, the brushing's turn. */
var LIGHT = -40;   // the key light, in dial degrees (upper left)

function dial(key) {
  var seed = fnv1a('dial:' + key);
  var id = 'wkd-' + key;
  var s = sv('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' }, 'wk-dial');
  s.style.setProperty('--turn', f2(-30 + draw(seed, 1) * 24) + 'deg');
  var defs = sv('defs');
  defs.appendChild(grad('radialGradient', id + '-bz', { gradientUnits: 'userSpaceOnUse', cx: 50, cy: 50, r: 50 },
    [[0, 'd-clear', 0], [0.885, 'd-clear', 0], [0.89, 'd-seat', 0.95], [0.905, 'd-seat', 0.5],
     [0.93, 'd-clear', 0], [0.955, 'd-crest', 0.55], [0.975, 'd-clear', 0], [0.995, 'd-seat', 0.8], [1, 'd-seat', 1]]));
  defs.appendChild(grad('radialGradient', id + '-face', { gradientUnits: 'userSpaceOnUse', cx: 44, cy: 40, r: 50 },
    [[0, 'd-face0'], [0.6, 'd-face1'], [1, 'd-face2']]));
  defs.appendChild(grad('radialGradient', id + '-lip', { gradientUnits: 'userSpaceOnUse', cx: 50, cy: 54, r: 44 },
    [[0, 'd-clear', 0], [0.86, 'd-clear', 0], [0.97, 'd-seat', 0.5], [1, 'd-seat', 0.85]]));
  defs.appendChild(grad('linearGradient', id + '-red', { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 20, x2: 0, y2: 60 },
    [[0, 'd-red1'], [0.45, 'd-red0'], [1, 'd-red2']]));
  defs.appendChild(grad('radialGradient', id + '-hub', { gradientUnits: 'userSpaceOnUse', cx: 48.6, cy: 48.4, r: 5 },
    [[0, 'cs-b5'], [0.4, 'cs-b3'], [0.8, 'cs-b1'], [1, 'cs-b0']]));
  defs.appendChild(grad('linearGradient', id + '-xtal', { x1: 0, y1: 0, x2: 1, y2: 1 },
    [[0, 'd-glint', 0.34], [0.5, 'd-glint', 0.06], [1, 'd-glint', 0]]));
  s.appendChild(defs);

  defs.appendChild(grad('radialGradient', id + '-cast', { gradientUnits: 'userSpaceOnUse', cx: 51.2, cy: 53, r: 53 },
    [[0, 'd-seat', 0.7], [0.88, 'd-seat', 0.55], [0.95, 'd-seat', 0.18], [1, 'd-seat', 0]]));
  // The instrument's shadow on the glass, soft, down and to the right.
  s.appendChild(sv('circle', { cx: 51.2, cy: 53, r: 53, fill: 'url(#' + id + '-cast)' }, 'd-cast'));
  // Bezel. A conic brushing cannot be an SVG gradient, so the turned brass
  // is an HTML disc inside a foreignObject: it scales with the viewBox and
  // stays round whatever box the grid hands the dial.
  var fo = sv('foreignObject', { x: 0, y: 0, width: 100, height: 100 }, 'd-brass-fo');
  var disc = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
  disc.className = 'd-brass';
  fo.appendChild(disc);
  s.appendChild(fo);
  // The moulding's profile over the brass: the arris, the crest, the step
  // down to the glass seat.
  s.appendChild(sv('circle', { cx: 50, cy: 50, r: 50, fill: 'url(#' + id + '-bz)' }, 'd-profile'));
  // Knurling on the outer lip, each tooth lit by its angle to the light.
  var knurl = sv('g', null, 'd-knurl');
  for (var i = 0; i < 96; i++) {
    var a = i * 3.75 + draw(seed, 2) * 3.75;
    var lit = 0.5 + 0.5 * Math.cos((a - LIGHT) * Math.PI / 180);
    var p0 = polar(50, 50, 48.1, a), p1 = polar(50, 50, 49.6, a);
    var tooth = sv('path', { d: 'M' + P(p0) + ' L' + P(p1) }, lit > 0.5 ? 'kn-lit' : 'kn-shade');
    tooth.setAttribute('stroke-opacity', f2(Math.abs(lit - 0.5) * 1.3 + 0.12));
    knurl.appendChild(tooth);
  }
  s.appendChild(knurl);
  // Three bezel screws, spaced round the rim from the dial's own start.
  var s0 = draw(seed, 3) * 120;
  for (var k = 0; k < 3; k++) {
    var sp = polar(50, 50, 46.6, s0 + k * 120);
    s.appendChild(sv('circle', { cx: f2(sp[0]), cy: f2(sp[1]), r: 1.45, fill: 'url(#' + id + '-hub)' }, 'd-screw'));
    var sa = draw(seed, 4 + k) * 180;
    var q0 = polar(sp[0], sp[1], 1.15, sa), q1 = polar(sp[0], sp[1], 1.15, sa + 180);
    s.appendChild(sv('path', { d: 'M' + P(q0) + ' L' + P(q1) }, 'd-slot'));
  }

  // The enamel face, and the bezel's shade falling onto it.
  s.appendChild(sv('circle', { cx: 50, cy: 50, r: 44.2, fill: 'url(#' + id + '-face)' }, 'd-face'));
  // Faint engine turning under the enamel, the maker's ground.
  var turn = sv('g', null, 'd-turning');
  for (var rr = 8; rr < 43; rr += 2.2) turn.appendChild(sv('circle', { cx: 50, cy: 50, r: f2(rr) }));
  s.appendChild(turn);

  // The scale: a thin engraved arc, minor ticks every 2, medium every 10,
  // major every 20, numerals inside, a red lacquer arc on 85 to 100.
  s.appendChild(sv('path', { d: sector(50, 50, 33.2, 37.4, -120 + 2.4 * 85, 120), fill: 'url(#' + id + '-red)' }, 'g-red'));
  s.appendChild(sv('path', { d: arc(50, 50, 37.6, -120 + 2.4 * 85 + 0.4, 119.6) }, 'd-red-lit'));
  s.appendChild(sv('path', { d: arc(50, 50, 37.8, -120, 120), fill: 'none' }, 'd-arc'));
  var ticks = sv('g', null, 'g-tick');
  for (var v = 0; v <= 100; v += 2) {
    var ang = -120 + 2.4 * v;
    var major = v % 20 === 0, med = v % 10 === 0;
    var t0 = polar(50, 50, major ? 31.6 : med ? 33.4 : 35.2, ang), t1 = polar(50, 50, 37.8, ang);
    ticks.appendChild(sv('path', { d: 'M' + P(t0) + ' L' + P(t1) }, major ? 'tk-maj' : med ? 'tk-med' : 'tk-min'));
  }
  s.appendChild(ticks);
  var nums = sv('g', null, 'd-num');
  for (var n = 0; n <= 100; n += 20) {
    var np = polar(50, 50, 25.4, -120 + 2.4 * n);
    var tx = sv('text', { x: f2(np[0]), y: f2(np[1] + 2.4), 'text-anchor': 'middle' });
    tx.textContent = String(n);
    nums.appendChild(tx);
  }
  s.appendChild(nums);
  // What the maker stamped: the unit, and this instrument's serial.
  var legend = sv('text', { x: 50, y: 66.5, 'text-anchor': 'middle' }, 'd-legend');
  legend.textContent = key === 'net' ? '% · 1 Gb/s' : '%';
  s.appendChild(legend);
  var serial = sv('text', { x: 50, y: 34.2, 'text-anchor': 'middle' }, 'd-serial');
  serial.textContent = 'No ' + (3100 + Math.floor(draw(seed, 7) * 6800));
  s.appendChild(serial);
  // The zero adjuster under the pivot.
  s.appendChild(sv('circle', { cx: 50, cy: 76, r: 2.3, fill: 'url(#' + id + '-hub)' }, 'd-zero'));
  var za = draw(seed, 8) * 180;
  var z0 = polar(50, 76, 1.9, za), z1 = polar(50, 76, 1.9, za + 180);
  s.appendChild(sv('path', { d: 'M' + P(z0) + ' L' + P(z1) }, 'd-slot'));
  s.appendChild(sv('circle', { cx: 50, cy: 50, r: 44.2, fill: 'url(#' + id + '-lip)' }, 'd-lip'));

  // The needle: a lacquered pointer with a counterweight tail, drawn twice.
  // The shadow's offset is on an outer group that never turns, so it always
  // falls down and to the right, whatever the reading; the inner group
  // turns with the needle (a CSS transform, so never on the offset group).
  var needle = 'M50 12.2 L51.25 47.6 L51.6 50 L50.9 57.2 L49.1 57.2 L48.4 50 L48.75 47.6 Z';
  var tail = { cx: 50, cy: 59.4, r: 3.5 };
  var shadow = sv('g', { transform: 'translate(1.3 2.1)' }, 'nd-shadow');
  var sh = sv('g', null, 'g-needle');
  sh.appendChild(sv('path', { d: needle }));
  sh.appendChild(sv('circle', tail));
  shadow.appendChild(sh);
  s.appendChild(shadow);
  var body = sv('g', null, 'g-needle nd-body');
  body.appendChild(sv('path', { d: needle }, 'nd-lacq'));
  body.appendChild(sv('path', { d: 'M50 12.2 L50.95 38 L49.05 38 Z' }, 'nd-tip'));
  body.appendChild(sv('circle', tail, 'nd-weight'));
  body.appendChild(sv('circle', { cx: 50, cy: 59.4, r: 1.3 }, 'nd-rivet'));
  body.appendChild(sv('path', { d: 'M49.55 20 L49.35 47' }, 'nd-hi'));
  s.appendChild(body);
  s.appendChild(sv('circle', { cx: 50, cy: 50, r: 4.4, fill: 'url(#' + id + '-hub)' }, 'd-hub'));
  s.appendChild(sv('circle', { cx: 48.7, cy: 48.6, r: 1.1 }, 'd-hubglint'));

  // The crystal: one broad soft reflection across the upper left, a short
  // sharp glint, and the lower edge catching the room.
  s.appendChild(sv('path', { d: 'M13.5 44 A37 37 0 0 1 56 8.6 A44 44 0 0 0 19 32 Z',
    fill: 'url(#' + id + '-xtal)' }, 'd-xtal'));
  s.appendChild(sv('path', { d: arc(50, 50, 42.6, 118, 160), fill: 'none' }, 'd-xtal-edge'));
  s.appendChild(sv('ellipse', { cx: 70.5, cy: 22.5, rx: 3.2, ry: 1.1, transform: 'rotate(38 70.5 22.5)' }, 'd-glint'));
  return s;
}

/* ---------------------------------------------------------------- the sky
   The heliograph as an instrument: the diurnal circle is an enamel plate
   seen edge-on in a satin brass bezel. Above the horizon the enamel is
   lapis (pale sky by day) with leaf stars at night; below it black (bone
   by day). The ring the sun runs on is a slot cut round the enamel, a dark
   groove with a lit lower lip, and the sun is a domed gilt bead riding it.
   g is the plate geometry from app.js's skyBox. */
function skyPlate(svgEl, g, horizonY, seed) {
  var defs = sv('defs');
  defs.appendChild(grad('linearGradient', 'sky-up', { gradientUnits: 'userSpaceOnUse', x1: 0, y1: g.cy - g.ry, x2: 0, y2: horizonY },
    [[0, 'sk-up0'], [0.7, 'sk-up1'], [1, 'sk-up2']]));
  defs.appendChild(grad('linearGradient', 'sky-dn', { gradientUnits: 'userSpaceOnUse', x1: 0, y1: horizonY, x2: 0, y2: g.cy + g.ry },
    [[0, 'sk-dn0'], [1, 'sk-dn1']]));
  defs.appendChild(grad('linearGradient', 'sky-bz', { x1: 0, y1: 0, x2: 0.3, y2: 1 },
    [[0, 'cs-b5'], [0.25, 'cs-b3'], [0.5, 'cs-b2'], [0.78, 'cs-b1'], [1, 'cs-b0']]));
  defs.appendChild(grad('radialGradient', 'sky-bead', { cx: 0.36, cy: 0.3, r: 0.75 },
    [[0, 'sk-bd0'], [0.35, 'cs-l3'], [0.7, 'cs-l2'], [1, 'cs-l0']]));
  var clip = sv('clipPath', { id: 'sky-enamel' });
  clip.appendChild(sv('ellipse', { cx: g.cx, cy: g.cy, rx: g.rx, ry: g.ry }));
  defs.appendChild(clip);
  svgEl.appendChild(defs);
  var B = 6.5;
  svgEl.appendChild(sv('ellipse', { cx: g.cx + 1.2, cy: g.cy + 2.4, rx: g.rx + B, ry: g.ry + B }, 'sk-cast'));
  svgEl.appendChild(sv('ellipse', { cx: g.cx, cy: g.cy, rx: g.rx + B, ry: g.ry + B, fill: 'url(#sky-bz)' }, 'sk-bezel'));
  svgEl.appendChild(sv('ellipse', { cx: g.cx, cy: g.cy, rx: g.rx + B - 0.8, ry: g.ry + B - 0.8 }, 'sk-bezel-lip'));
  var en = sv('g', { 'clip-path': 'url(#sky-enamel)' }, 'sk-enamel');
  en.appendChild(sv('rect', { x: 0, y: g.cy - g.ry - 2, width: g.W, height: horizonY - (g.cy - g.ry) + 2, fill: 'url(#sky-up)' }, 'sk-up'));
  en.appendChild(sv('rect', { x: 0, y: horizonY, width: g.W, height: g.cy + g.ry - horizonY + 2, fill: 'url(#sky-dn)' }, 'sk-dn'));
  // leaf stars, laid in the lapis where the plate has room for them
  var stars = sv('g', null, 'sk-stars');
  for (var i = 0, n = 0; i < 80 && n < 18; i++) {
    var x = g.cx + (draw(seed, 100 + i) * 2 - 1) * g.rx * 0.92;
    var y = g.cy - g.ry + draw(seed, 200 + i) * (horizonY - (g.cy - g.ry));
    var e = Math.pow((x - g.cx) / g.rx, 2) + Math.pow((y - g.cy) / g.ry, 2);
    if (e > 0.78 || y > horizonY - 5) continue;
    n++;
    var r = 0.7 + draw(seed, 300 + i) * 1.1;
    if (r > 1.45) {
      var pts = [];
      for (var k = 0; k < 8; k++) pts.push(polar(x, y, k % 2 ? r * 0.45 : r * 1.7, k * 45));
      stars.appendChild(sv('path', { d: 'M' + pts.map(P).join(' L') + ' Z' }));
    } else {
      stars.appendChild(sv('circle', { cx: f2(x), cy: f2(y), r: f2(r * 0.7) }));
    }
  }
  en.appendChild(stars);
  // the enamel's own gloss, and the bezel's shade falling on it
  en.appendChild(sv('ellipse', { cx: g.cx - g.rx * 0.25, cy: g.cy - g.ry * 0.55, rx: g.rx * 0.7, ry: g.ry * 0.28 }, 'sk-gloss'));
  svgEl.appendChild(en);
  svgEl.appendChild(sv('ellipse', { cx: g.cx, cy: g.cy, rx: g.rx, ry: g.ry }, 'sk-groove'));
  svgEl.appendChild(sv('ellipse', { cx: g.cx, cy: g.cy + 0.9, rx: g.rx, ry: g.ry }, 'sk-lip'));
}
function sunBead(svgEl, x, y, up) {
  var gr = sv('g', null, 'sk-sun' + (up ? '' : ' down'));
  gr.appendChild(sv('circle', { cx: f2(x + 0.9), cy: f2(y + 1.5), r: up ? 5.4 : 4.4 }, 'sk-bead-sh'));
  gr.appendChild(sv('circle', { cx: f2(x), cy: f2(y), r: up ? 5.2 : 4.2, fill: 'url(#sky-bead)' }, 'sk-bead'));
  gr.appendChild(sv('circle', { cx: f2(x - 1.5), cy: f2(y - 1.7), r: up ? 1.3 : 1 }, 'sk-bead-glint'));
  svgEl.appendChild(gr);
}

/* ---------------------------------------------------------------- the moon
   A shaded sphere under its own small crystal in a turned bezel. The lit
   face is the terminator's shape (app.js's ellipse), shaded as a ball; at
   night the dark side keeps a little earthshine. */
function moon(litPath, waxing, r) {
  var box = r + 6;
  var s = sv('svg', { viewBox: (-box) + ' ' + (-box) + ' ' + (box * 2) + ' ' + (box * 2),
    'aria-hidden': 'true' }, 'al-disc');
  var defs = sv('defs');
  defs.appendChild(grad('radialGradient', 'mn-lit', { cx: waxing ? 0.62 : 0.38, cy: 0.38, r: 0.72 },
    [[0, 'mn-l0'], [0.55, 'mn-l1'], [1, 'mn-l2']]));
  defs.appendChild(grad('radialGradient', 'mn-dark', { cx: 0.45, cy: 0.4, r: 0.7 },
    [[0, 'mn-d0'], [1, 'mn-d1']]));
  defs.appendChild(grad('linearGradient', 'mn-xtal', { x1: 0, y1: 0, x2: 1, y2: 1 },
    [[0, 'd-glint', 0.5], [0.45, 'd-glint', 0.08], [1, 'd-glint', 0]]));
  s.appendChild(defs);
  s.appendChild(sv('circle', { cx: 0, cy: 0, r: r + 4.6 }, 'mn-bezel'));
  s.appendChild(sv('circle', { cx: 0, cy: 0, r: r + 4.6, fill: 'none' }, 'mn-bezel-lip'));
  s.appendChild(sv('circle', { cx: 0, cy: 0, r: r + 1.2 }, 'mn-seat'));
  s.appendChild(sv('circle', { cx: 0, cy: 0, r: r, fill: 'url(#mn-dark)' }, 'm-dark'));
  var lit = sv('path', { d: litPath, fill: 'url(#mn-lit)' }, 'm-lit');
  if (!waxing) lit.setAttribute('transform', 'scale(-1,1)');
  s.appendChild(lit);
  // maria: a few soft grey seas on the lit face, clipped by the lit shape
  var clipId = 'mn-clip';
  var cp = sv('clipPath', { id: clipId });
  var cpp = sv('path', { d: litPath });
  if (!waxing) cpp.setAttribute('transform', 'scale(-1,1)');
  cp.appendChild(cpp);
  defs.appendChild(cp);
  defs.appendChild(grad('radialGradient', 'mn-mare', { cx: 0.5, cy: 0.5, r: 0.5 },
    [[0, 'mn-m0', 0.42], [0.6, 'mn-m0', 0.26], [1, 'mn-m0', 0]]));
  var maria = sv('g', { 'clip-path': 'url(#' + clipId + ')' }, 'mn-maria');
  [[-0.3, -0.28, 0.3, 0.24], [0.08, -0.14, 0.24, 0.2], [0.28, 0.2, 0.2, 0.17], [-0.14, 0.32, 0.18, 0.12],
   [0.34, -0.38, 0.12, 0.1], [-0.42, 0.1, 0.14, 0.2]]
    .forEach(function (m) {
      maria.appendChild(sv('ellipse', { cx: f2(m[0] * r), cy: f2(m[1] * r), rx: f2(m[2] * r), ry: f2(m[3] * r),
        fill: 'url(#mn-mare)' }));
    });
  s.appendChild(maria);
  s.appendChild(sv('circle', { cx: 0, cy: 0, r: r, fill: 'none' }, 'm-bezel'));
  s.appendChild(sv('path', { d: 'M' + f2(-r * 0.82) + ' ' + f2(-r * 0.1) + ' A' + r * 0.86 + ' ' + r * 0.86 +
    ' 0 0 1 ' + f2(r * 0.2) + ' ' + f2(-r * 0.84) + ' A' + r + ' ' + r + ' 0 0 0 ' + f2(-r * 0.82) + ' ' + f2(-r * 0.1) + ' Z',
    fill: 'url(#mn-xtal)' }, 'mn-xtal'));
  s.appendChild(sv('ellipse', { cx: f2(r * 0.46), cy: f2(-r * 0.52), rx: f2(r * 0.14), ry: f2(r * 0.06),
    transform: 'rotate(40 ' + f2(r * 0.46) + ' ' + f2(-r * 0.52) + ')' }, 'd-glint'));
  return s;
}

/* ---------------------------------------------------------------- the Ledger
   A programme card's fittings. The service mark sits in a cartouche like
   the gates': a stepped lozenge, the outer step convex and the middle step
   a cavetto, each step four flat facets taking the one light, over black
   enamel, held by four screws turned by the dispatch's hash. The card
   leans a hair in its holder and its time was stamped by hand, so no two
   hang or read quite alike. */
function cartouche(svgEl, seed) {
  var C = 20;
  [[19.4, 'c-outer'], [16.2, 'c-mid'], [13.6, 'c-field']].forEach(function (st, idx) {
    var R = st[0], r = idx < 2 ? R - 2.6 : 0;
    var T = [C, C - R], Rt = [C + R, C], B = [C, C + R], L = [C - R, C];
    if (idx === 2) {
      svgEl.appendChild(sv('path', { d: 'M' + [T, Rt, B, L].map(P).join(' L') + ' Z' }, st[1]));
      return;
    }
    var t = [C, C - r], rt = [C + r, C], bb = [C, C + r], l = [C - r, C];
    [['fa-tl', [L, T, t, l]], ['fa-tr', [T, Rt, rt, t]], ['fa-br', [Rt, B, bb, rt]], ['fa-bl', [B, L, l, bb]]]
      .forEach(function (f) {
        svgEl.appendChild(sv('path', { d: 'M' + f[1].map(P).join(' L') + ' Z' }, st[1] + ' ' + f[0]));
      });
  });
  [[0, -17.8], [17.8, 0], [0, 17.8], [-17.8, 0]].forEach(function (p, k) {
    var x = C + p[0], y = C + p[1], a = draw(seed, 20 + k) * 180;
    svgEl.appendChild(sv('circle', { cx: f2(x), cy: f2(y), r: 1.15 }, 'c-screw'));
    var q0 = polar(x, y, 0.9, a), q1 = polar(x, y, 0.9, a + 180);
    svgEl.appendChild(sv('path', { d: 'M' + P(q0) + ' L' + P(q1) }, 'c-slot'));
  });
}
function card(li, id, host) {
  var seed = fnv1a('dispatch:' + id);
  li.style.setProperty('--lean', f2((draw(seed, 1) - 0.5) * 0.7) + 'deg');
  li.style.setProperty('--stamp-rot', f2((draw(seed, 2) - 0.5) * 7) + 'deg');
  li.style.setProperty('--stamp-x', f2(draw(seed, 3) * 1.4) + 'em');
  li.style.setProperty('--ink-a', f2(0.74 + draw(seed, 4) * 0.22));
  li.style.setProperty('--stock', f2(draw(seed, 5)));
  li.style.setProperty('--clip-y', f2(18 + draw(seed, 6) * 24) + '%');
  var jewel = hx('span', 'pl-jewel');
  jewel.setAttribute('aria-hidden', 'true');
  jewel.appendChild(hx('i', 'pl-jewel-lit'));
  (host || li).appendChild(jewel);
  return seed;
}

/* ---------------------------------------------------------------- Preferences
   The panel is a starter's panel in Dunand lacquer, and every preference
   is a piece of switchgear: appearance a three-way rotary with a pilot
   jewel over each legend, language a double-throw knife switch on slate,
   engraving size an interlocked push-button bank, motion a bat toggle and
   the replay a spring-return key. The radios and buttons themselves stay
   exactly what they were; what is added here is aria-hidden hardware laid
   under and beside them, turned by CSS from the checked radio. */
function rotaryArt() {
  var wrap = hx('div', 'p-rotary');
  wrap.setAttribute('aria-hidden', 'true');
  var plate = sv('svg', { viewBox: '0 0 100 100' }, 'p-rotary-plate');
  var defs = sv('defs');
  defs.appendChild(grad('radialGradient', 'pr-plate', { cx: 0.4, cy: 0.35, r: 0.7 },
    [[0, 'cs-b5'], [0.35, 'cs-b3'], [0.7, 'cs-b2'], [1, 'cs-b1']]));
  plate.appendChild(defs);
  plate.appendChild(sv('circle', { cx: 51.5, cy: 53, r: 46 }, 'pr-sh'));
  plate.appendChild(sv('circle', { cx: 50, cy: 50, r: 46, fill: 'url(#pr-plate)' }, 'pr-plate'));
  var turn = sv('g', null, 'pr-turning');
  for (var r = 8; r < 45; r += 1.6) turn.appendChild(sv('circle', { cx: 50, cy: 50, r: f2(r) }));
  plate.appendChild(turn);
  plate.appendChild(sv('circle', { cx: 50, cy: 50, r: 44.5 }, 'pr-lip'));
  // engraved index marks for the three detents, and the stops between them
  [-52, 0, 52].forEach(function (a) {
    var p0 = polar(50, 50, 33, a), p1 = polar(50, 50, 43, a);
    plate.appendChild(sv('path', { d: 'M' + P(p0) + ' L' + P(p1), transform: 'translate(0.5 0.7)' }, 'pr-index-lip'));
    plate.appendChild(sv('path', { d: 'M' + P(p0) + ' L' + P(p1) }, 'pr-index'));
  });
  for (var t = -80; t <= 80; t += 13) {
    var m0 = polar(50, 50, 39, t), m1 = polar(50, 50, 43, t);
    plate.appendChild(sv('path', { d: 'M' + P(m0) + ' L' + P(m1) }, 'pr-tick'));
  }
  wrap.appendChild(plate);
  // the knob: a black bakelite chicken-head, its pointer inlaid in ivory
  var knob = hx('div', 'p-knob');
  var k = sv('svg', { viewBox: '0 0 100 100' });
  var kd = sv('defs');
  kd.appendChild(grad('radialGradient', 'pr-bake', { cx: 0.38, cy: 0.3, r: 0.8 },
    [[0, 'pk-0'], [0.45, 'pk-1'], [1, 'pk-2']]));
  k.appendChild(kd);
  var head = 'M50 6 C56 6 58 12 58 20 L60 44 C68 48 72 56 70 64 C66 76 34 76 30 64 C28 56 32 48 40 44 L42 20 C42 12 44 6 50 6 Z';
  k.appendChild(sv('path', { d: head, transform: 'translate(2.6 3.4)' }, 'pk-sh'));
  k.appendChild(sv('path', { d: head, fill: 'url(#pr-bake)' }, 'pk-body'));
  k.appendChild(sv('path', { d: 'M50 9 L50 40' }, 'pk-pointer'));
  k.appendChild(sv('circle', { cx: 50, cy: 60, r: 8.6 }, 'pk-cap'));
  k.appendChild(sv('path', { d: 'M44.5 12 C46 9.5 49 9 50 9', fill: 'none' }, 'pk-hi'));
  k.appendChild(sv('ellipse', { cx: 42, cy: 55, rx: 5, ry: 2.4, transform: 'rotate(-30 42 55)' }, 'pk-hi2'));
  knob.appendChild(k);
  wrap.appendChild(knob);
  return wrap;
}
function jewel(cls) {
  var j = hx('span', 'p-jewel' + (cls ? ' ' + cls : ''));
  j.setAttribute('aria-hidden', 'true');
  j.appendChild(hx('i', 'p-jewel-lit'));
  return j;
}
function knifeArt() {
  var wrap = hx('div', 'p-knife');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.appendChild(hx('div', 'kn-slate'));
  ['l', 'r'].forEach(function (side) {
    var jaw = sv('svg', { viewBox: '0 0 24 30' }, 'kn-jaw kn-jaw-' + side);
    jaw.appendChild(sv('rect', { x: 2, y: 23, width: 20, height: 5, rx: 1 }, 'kj-foot'));
    jaw.appendChild(sv('rect', { x: 6, y: 3, width: 4.2, height: 22, rx: 1 }, 'kj-leaf'));
    jaw.appendChild(sv('rect', { x: 13.8, y: 3, width: 4.2, height: 22, rx: 1 }, 'kj-leaf'));
    jaw.appendChild(sv('circle', { cx: 5, cy: 25.5, r: 1.5 }, 'kj-nut'));
    jaw.appendChild(sv('circle', { cx: 19, cy: 25.5, r: 1.5 }, 'kj-nut'));
    wrap.appendChild(jaw);
  });
  var hinge = sv('svg', { viewBox: '0 0 24 30' }, 'kn-hinge');
  hinge.appendChild(sv('rect', { x: 2, y: 23, width: 20, height: 5, rx: 1 }, 'kj-foot'));
  hinge.appendChild(sv('rect', { x: 5, y: 6, width: 4.4, height: 19, rx: 1 }, 'kj-leaf'));
  hinge.appendChild(sv('rect', { x: 14.6, y: 6, width: 4.4, height: 19, rx: 1 }, 'kj-leaf'));
  hinge.appendChild(sv('circle', { cx: 12, cy: 11, r: 3.2 }, 'kj-pin'));
  wrap.appendChild(hinge);
  // the blade: two copper bars joined by a crossbar, a bakelite handle on
  // the end. It flips over the hinge in depth (rotateY) when thrown.
  var blade = hx('div', 'kn-blade');
  var b = sv('svg', { viewBox: '0 0 100 30', preserveAspectRatio: 'none' });
  b.appendChild(sv('rect', { x: 2, y: 9, width: 96, height: 5, rx: 1.4 }, 'kb-bar'));
  b.appendChild(sv('rect', { x: 2, y: 16, width: 96, height: 5, rx: 1.4 }, 'kb-bar'));
  b.appendChild(sv('rect', { x: 2, y: 9.4, width: 96, height: 1.2 }, 'kb-hi'));
  b.appendChild(sv('rect', { x: 2, y: 16.4, width: 96, height: 1.2 }, 'kb-hi'));
  b.appendChild(sv('rect', { x: 20, y: 7.5, width: 7, height: 15, rx: 1.2 }, 'kb-cross'));
  blade.appendChild(b);
  blade.appendChild(hx('i', 'kn-handle'));
  wrap.appendChild(blade);
  return wrap;
}
function batArt() {
  var wrap = hx('div', 'p-bat');
  wrap.setAttribute('aria-hidden', 'true');
  var plate = sv('svg', { viewBox: '0 0 100 40' }, 'p-bat-plate');
  var defs = sv('defs');
  defs.appendChild(grad('linearGradient', 'pb-plate', { x1: 0, y1: 0, x2: 0.2, y2: 1 },
    [[0, 'cs-b5'], [0.3, 'cs-b3'], [0.65, 'cs-b2'], [1, 'cs-b1']]));
  defs.appendChild(grad('radialGradient', 'pb-bush', { cx: 0.38, cy: 0.32, r: 0.75 },
    [[0, 'cs-b5'], [0.5, 'cs-b2'], [1, 'cs-b0']]));
  plate.appendChild(defs);
  plate.appendChild(sv('rect', { x: 13.5, y: 21.5, width: 76, height: 17, rx: 3 }, 'pb-sh'));
  plate.appendChild(sv('rect', { x: 12, y: 20, width: 76, height: 17, rx: 3, fill: 'url(#pb-plate)' }, 'pb-body'));
  [18, 82].forEach(function (x, i) {
    var a = i ? 64 : 131;
    plate.appendChild(sv('circle', { cx: x, cy: 28.5, r: 2 }, 'pb-screw'));
    plate.appendChild(sv('path', { d: 'M' + (x - 1.5) + ' 28.5 H' + (x + 1.5), transform: 'rotate(' + a + ' ' + x + ' 28.5)' }, 'pb-slot'));
  });
  [-38, 0, 38].forEach(function (a) {
    var p0 = polar(50, 30, 9, a), p1 = polar(50, 30, 15, a);
    plate.appendChild(sv('path', { d: 'M' + P(p0) + ' L' + P(p1) }, 'pb-index'));
  });
  plate.appendChild(sv('circle', { cx: 50, cy: 30, r: 5.4, fill: 'url(#pb-bush)' }, 'pb-bush'));
  plate.appendChild(sv('circle', { cx: 50, cy: 30, r: 3.4 }, 'pb-nut'));
  wrap.appendChild(plate);
  var lever = hx('div', 'p-lever');
  var l = sv('svg', { viewBox: '0 0 20 60' });
  var ld = sv('defs');
  ld.appendChild(grad('linearGradient', 'pb-lever', { x1: 0, y1: 0, x2: 1, y2: 0 },
    [[0, 'bat-0'], [0.35, 'bat-2'], [0.55, 'bat-1'], [1, 'bat-0']]));
  l.appendChild(ld);
  // the bat: a tapered shaft swelling to a flattened paddle at the tip
  var bat = 'M8 58 L7 24 C3.6 19 2.8 10 4.8 4.6 C6.6 0.6 13.4 0.6 15.2 4.6 C17.2 10 16.4 19 13 24 L12 58 Z';
  l.appendChild(sv('path', { d: bat, transform: 'translate(1.4 1.6)' }, 'pv-sh'));
  l.appendChild(sv('path', { d: bat, fill: 'url(#pb-lever)' }, 'pv-body'));
  l.appendChild(sv('path', { d: 'M8 8 C8 5 9 4 10 4', fill: 'none' }, 'pv-hi'));
  lever.appendChild(l);
  wrap.appendChild(lever);
  return wrap;
}
function keyArt() {
  var s = sv('svg', { viewBox: '0 0 44 44', 'aria-hidden': 'true' }, 'p-key');
  var defs = sv('defs');
  defs.appendChild(grad('radialGradient', 'pkey-plate', { cx: 0.4, cy: 0.35, r: 0.75 },
    [[0, 'cs-b5'], [0.4, 'cs-b3'], [0.75, 'cs-b2'], [1, 'cs-b1']]));
  s.appendChild(defs);
  s.appendChild(sv('rect', { x: 5.5, y: 25.5, width: 35, height: 14, rx: 2.4 }, 'pkey-sh'));
  s.appendChild(sv('rect', { x: 4, y: 24, width: 35, height: 14, rx: 2.4, fill: 'url(#pkey-plate)' }, 'pkey-plate'));
  s.appendChild(sv('circle', { cx: 9, cy: 31, r: 1.6 }, 'pkey-screw'));
  s.appendChild(sv('circle', { cx: 34, cy: 31, r: 1.6 }, 'pkey-screw'));
  s.appendChild(sv('rect', { x: 17, y: 26.5, width: 9, height: 9, rx: 1.4 }, 'pkey-slot'));
  var arm = sv('g', null, 'pkey-arm');
  arm.appendChild(sv('path', { d: 'M20.3 31 L19.4 11 L23.6 11 L22.7 31 Z' }, 'pkey-shaft'));
  arm.appendChild(sv('rect', { x: 14.5, y: 3.5, width: 14, height: 9, rx: 4.5 }, 'pkey-cap'));
  arm.appendChild(sv('rect', { x: 16.5, y: 5, width: 7, height: 2.2, rx: 1.1 }, 'pkey-hi'));
  s.appendChild(arm);
  return s;
}
function dressPrefs(prefs) {
  if (!prefs || prefs.dataset.dressed) return;
  prefs.dataset.dressed = '1';
  var sheet = prefs.querySelector('.p-sheet');
  if (sheet) {
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
      var b = hx('i', 'p-bracket p-bracket-' + c);
      b.setAttribute('aria-hidden', 'true');
      sheet.appendChild(b);
    });
  }
  Array.prototype.forEach.call(prefs.querySelectorAll('[data-pref]'), function (group) {
    var pref = group.dataset.pref;
    var sec = group.closest('.p-group');
    if (sec) sec.dataset.control = pref;
    var radios = Array.prototype.slice.call(group.querySelectorAll('[role=radio]'));
    if (pref === 'theme') {
      group.insertBefore(rotaryArt(), group.firstChild);
      radios.forEach(function (r) { r.insertBefore(jewel(), r.firstChild); });
    } else if (pref === 'lang') {
      group.insertBefore(knifeArt(), group.firstChild);
      radios.forEach(function (r) { r.insertBefore(jewel('p-jewel-sm'), r.firstChild); });
    } else if (pref === 'motion') {
      group.insertBefore(batArt(), group.firstChild);
      radios.forEach(function (r) { r.insertBefore(jewel('p-jewel-sm'), r.firstChild); });
    }
  });
  var replay = prefs.querySelector('#replay');
  if (replay) {
    var sec2 = replay.closest('.p-group');
    if (sec2) sec2.dataset.control = 'replay';
    replay.insertBefore(keyArt(), replay.firstChild);
  }
}

window.Cabinet = {
  fnv1a: fnv1a, draw: draw, f2: f2, sv: sv, hx: hx, grad: grad,
  polar: polar, sector: sector, arc: arc, screw: screw, frame: frame,
  dressCase: dressCase, dial: dial, moon: moon, skyPlate: skyPlate, sunBead: sunBead,
  cartouche: cartouche, card: card, dressPrefs: dressPrefs
};
})();
