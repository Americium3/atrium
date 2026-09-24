/* ===========================================================================
   THE SIGNAL DESK, DRESSED: the lever console as a picture-palace fitting.

   The console is statuary bronze: a cast carcass dressed with vertical
   brushing, darkened with a chemical patina and worn back to the bright
   metal (the wing's leaf) only where hands, hips and feet reach it: the
   nosing of the cornice, the body's two arrises at hip height, the plinth's
   toe, the lip of the quadrant the catch rides on. Its top is a real plane,
   foreshortened toward the floor's own vanishing point, so the machine
   stands IN the room instead of being pasted on its floor. Recesses hold
   oil-dark shadow, faces carry one horizon band, and the whole thing sits
   on a black Portoro plinth on the runner's pile.

   The lever is a railway points lever: black enamel shaft, a polished steel
   grip with the catch handle behind it, the catch block on the quadrant, the
   wing metal on the ferrule, and a brass badge: 1, WINGS. The gear train is
   seen through a glazed inspection window with one reflection band; the
   front wheel takes the lamp, the back one stays in the oil.

   Every tone is a CSS token on a gradient stop class (var() does not resolve
   in stop-color attributes). Siblings (pilasters, panels, screws, dentils)
   vary off fnv1a of a stable id, walked in drawing order.

   Geometry is the 360 x 220 assembly box. The silhouette of the old console
   is kept on purpose: its drawn shapes are the console's hit surface
   (.quadrant > * hit-tests on its own paint), and fitDesk() reads the art's
   top from this SVG's bounding box, so nothing is drawn above y = 24.
   =========================================================================== */
(function () {
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var DEG = Math.PI / 180;

function E(tag, attrs, cls) {
  var e = document.createElementNS(NS, tag);
  if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute('class', cls);
  return e;
}
function add(parent, tag, attrs, cls) {
  var e = E(tag, attrs, cls);
  parent.appendChild(e);
  return e;
}
function n2(v) { return (Math.round(v * 100) / 100).toString(); }

function fnv1a(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* Draw k from hash h: the same stream palace.js walks for the gates. */
function draw(h, k) {
  var n = (h ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
function rnd(id, k) { return draw(fnv1a(id), k || 0); }

/* A gradient whose stops are coloured by class: <id>-0, <id>-1 ... */
function grad(defs, id, radial, attrs, offsets) {
  var g = add(defs, radial ? 'radialGradient' : 'linearGradient', attrs);
  g.setAttribute('id', id);
  offsets.forEach(function (o, i) { add(g, 'stop', { offset: o }, id + '-' + i); });
  return g;
}
function pattern(defs, id, href, size) {
  var p = add(defs, 'pattern', { id: id, patternUnits: 'userSpaceOnUse', width: size, height: size });
  add(p, 'image', { href: href, width: size, height: size, preserveAspectRatio: 'none' });
  return p;
}
function U(id) { return 'url(#' + id + ')'; }

/* ------------------------------------------------------------ geometry */
var CAP_T = 84, CAP_B = 92, RISE_B = 100, FRZ_B = 114, BODY_B = 182, FLOOR = 196;
var CW_L = 32, CW_R = 328;
var TOP_BACK = 64;                 // the far edge of the console's top
var VP_X = 180, VP_Y = -480;       // the floor's vanishing point, in assembly units
var ARCH_CX = 180, ARCH_CY = 178, ARCH_R = 56;
var QPIV = 186, QS = 0.7;          // the quadrant is on the lever's own 0.7

/* Where a point on the front edge lands on the far edge of a plane that
   recedes toward the vanishing point. */
function recede(x, yFront, yBack) {
  return VP_X + (x - VP_X) * (VP_Y - yBack) / (VP_Y - yFront);
}

/* A slotted screw head: a domed disc, a slot turned by hash. */
function screw(g, cx, cy, r, id) {
  add(g, 'circle', { cx: n2(cx + 0.3), cy: n2(cy + 0.45), r: n2(r) }, 'dk-screw-sh');
  add(g, 'circle', { cx: n2(cx), cy: n2(cy), r: n2(r) }, 'dk-screw');
  var a = rnd(id) * 180 * DEG, dx = Math.cos(a) * r * 0.82, dy = Math.sin(a) * r * 0.82;
  add(g, 'path', { d: 'M' + n2(cx - dx) + ' ' + n2(cy - dy) + 'L' + n2(cx + dx) + ' ' + n2(cy + dy) }, 'dk-slot');
  add(g, 'path', { d: 'M' + n2(cx - dx) + ' ' + n2(cy - dy + 0.35) + 'L' + n2(cx + dx) + ' ' + n2(cy + dy + 0.35) }, 'dk-slot-lit');
}

/* Cast relief, drawn the way the gates' archivolts are: a lit copy up-left,
   a shadow copy down-right, then the body over both. */
function relief(g, d, body) {
  add(g, 'path', { d: d, transform: 'translate(-.45 -.55)' }, 'dk-rl-lit');
  add(g, 'path', { d: d, transform: 'translate(.7 .9)' }, 'dk-rl-sh');
  add(g, 'path', { d: d }, body || 'dk-rl-body');
}

/* Motifs, each inside a box (x, y, w, h). */
function fanPath(cx, by, r, rays) {
  // a half sunburst opening upward from its boss
  var d = '';
  for (var i = 0; i < rays; i++) {
    var a0 = Math.PI + (i + 0.14) * Math.PI / rays, a1 = Math.PI + (i + 0.86) * Math.PI / rays;
    d += 'M' + n2(cx) + ' ' + n2(by) + 'L' + n2(cx + r * Math.cos(a0)) + ' ' + n2(by + r * Math.sin(a0)) +
         'A' + r + ' ' + r + ' 0 0 1 ' + n2(cx + r * Math.cos(a1)) + ' ' + n2(by + r * Math.sin(a1)) + 'Z';
  }
  var rb = r * 0.26;
  d += 'M' + n2(cx - rb) + ' ' + n2(by) + 'A' + n2(rb) + ' ' + n2(rb) + ' 0 0 1 ' + n2(cx + rb) + ' ' + n2(by) + 'Z';
  return d;
}
function stepPath(cx, by, w, h, steps) {
  // a ziggurat: each course narrower than the one it stands on
  var d = '', sw = w / 2, sh = h / steps;
  for (var i = 0; i < steps; i++) {
    var hw = sw * (1 - i / steps), y0 = by - i * sh;
    d += 'M' + n2(cx - hw) + ' ' + n2(y0) + 'H' + n2(cx + hw) + 'V' + n2(y0 - sh * 0.78) + 'H' + n2(cx - hw) + 'Z';
  }
  return d;
}
function chevronPath(cx, by, w, h, n) {
  var d = '', t = h / (n * 2.1);
  for (var i = 0; i < n; i++) {
    var y = by - i * t * 2.1, hw = w / 2 - i * 0.6;
    d += 'M' + n2(cx - hw) + ' ' + n2(y) + 'L' + n2(cx) + ' ' + n2(y - h * 0.34) + 'L' + n2(cx + hw) + ' ' + n2(y) +
         'L' + n2(cx + hw) + ' ' + n2(y - t) + 'L' + n2(cx) + ' ' + n2(y - h * 0.34 - t) + 'L' + n2(cx - hw) + ' ' + n2(y - t) + 'Z';
  }
  return d;
}
function fountainPath(cx, by, w, h) {
  // the frozen fountain: a stem, a basin, three pairs of falling jets
  var d = 'M' + n2(cx - 1.1) + ' ' + n2(by) + 'V' + n2(by - h) + 'H' + n2(cx + 1.1) + 'V' + n2(by) + 'Z';
  d += 'M' + n2(cx - w * 0.36) + ' ' + n2(by) + 'H' + n2(cx + w * 0.36) + 'V' + n2(by - 2.2) + 'H' + n2(cx - w * 0.36) + 'Z';
  [0.92, 0.66, 0.4].forEach(function (f, k) {
    var y = by - h * f, s = w * (0.2 + 0.1 * k);
    [-1, 1].forEach(function (sg) {
      d += 'M' + n2(cx + sg * 1.1) + ' ' + n2(y) +
           'Q' + n2(cx + sg * s * 0.9) + ' ' + n2(y - 2.4) + ' ' + n2(cx + sg * s) + ' ' + n2(y + h * 0.2) +
           'L' + n2(cx + sg * (s - 1.3)) + ' ' + n2(y + h * 0.2) +
           'Q' + n2(cx + sg * s * 0.7) + ' ' + n2(y + 0.4) + ' ' + n2(cx + sg * 1.1) + ' ' + n2(y + 1.6) + 'Z';
    });
  });
  return d;
}

/* ------------------------------------------------------------ defs */
function buildDefs(svg) {
  var defs = add(svg, 'defs');
  var us = { gradientUnits: 'userSpaceOnUse' };
  function lin(id, x1, y1, x2, y2, offs) {
    return grad(defs, id, false, { gradientUnits: 'userSpaceOnUse', x1: x1, y1: y1, x2: x2, y2: y2 }, offs);
  }
  // The top plane: the room's light lies on its far half, the near half
  // falls away into the bronze.
  lin('dk-top', 0, TOP_BACK, 0, CAP_T, [0, 0.3, 0.7, 1]);
  grad(defs, 'dk-topspec', true, { gradientUnits: 'userSpaceOnUse', cx: 180, cy: TOP_BACK + 2, r: 150,
    gradientTransform: 'translate(180 ' + (TOP_BACK + 2) + ') scale(1 .11) translate(-180 ' + -(TOP_BACK + 2) + ')' }, [0, 0.55, 1]);
  lin('dk-cap', 0, CAP_T, 0, CAP_B, [0, 0.16, 0.5, 1]);
  lin('dk-dentil', 0, CAP_B + 0.5, 0, RISE_B - 1, [0, 0.25, 1]);
  lin('dk-frieze', 0, RISE_B, 0, FRZ_B, [0, 1]);
  lin('dk-rl', 0, RISE_B + 1, 0, FRZ_B - 1, [0, 0.5, 1]);
  // The faces: body, one horizon band a third of the way down, and the oil
  // that pools toward the foot. One userSpace gradient for every coplanar
  // face, so the band runs straight across pilasters and panels alike.
  lin('dk-face', 0, FRZ_B, 0, BODY_B, [0, 0.1, 0.28, 0.315, 0.35, 0.72, 1]);
  lin('dk-recess', 0, 124, 0, 174, [0, 1]);
  lin('dk-panel', 0, 127, 0, 169, [0, 0.12, 0.24, 0.29, 0.34, 1]);
  lin('dk-pmotif', 0, 130, 0, 166, [0, 1]);
  grad(defs, 'dk-flute', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.4, 0.82, 1]);
  grad(defs, 'dk-ring', true, { gradientUnits: 'userSpaceOnUse', cx: ARCH_CX, cy: ARCH_CY, r: ARCH_R + 6.5 },
       [0.9, 0.93, 0.955, 0.985, 1]);
  lin('dk-ringlight', 0, ARCH_CY - ARCH_R - 7, 0, ARCH_CY, [0, 0.55, 1]);
  lin('dk-key', 0, ARCH_CY - ARCH_R - 12, 0, ARCH_CY - ARCH_R + 6, [0, 0.4, 1]);
  lin('dk-btop', 0, BODY_B, 0, BODY_B + 2.2, [0, 1]);
  lin('dk-torus', 0, BODY_B + 2, 0, 189, [0, 0.3, 0.7, 1]);
  lin('dk-mtop', 0, 189, 0, 191, [0, 1]);
  lin('dk-mface', 0, 191, 0, FLOOR, [0, 1]);
  lin('dk-leafh', 22, 0, 338, 0, [0, 0.22, 0.4, 0.5, 0.6, 0.78, 1]);
  lin('dk-leafv', 0, FRZ_B, 0, BODY_B, [0, 0.45, 0.72, 0.9, 1]);
  lin('dk-leaftoe', 26, 0, 334, 0, [0, 0.35, 0.5, 0.65, 1]);
  grad(defs, 'dk-cyl', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.16, 0.3, 0.42, 0.78, 1]);
  lin('dk-quad', 0, 82, 0, 104, [0, 0.3, 1]);
  grad(defs, 'dk-cshadow', true, { cx: 0.5, cy: 0.42, r: 0.5 }, [0, 0.55, 1]);
  lin('dk-occl', 0, 193.5, 0, 199, [0, 0.42, 1]);
  grad(defs, 'dk-screw', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [0, 0.45, 1]);
  lin('dk-flange', 0, 181, 0, 190, [0, 0.3, 1]);
  grad(defs, 'dk-gaiter', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.3, 0.7, 1]);
  // Soft occlusion where one mass meets another: the light comes from
  // above and a little left, so shade falls down and to the right.
  grad(defs, 'dk-ao-down', false, { x1: 0, y1: 0, x2: 0, y2: 1 }, [0, 1]);
  grad(defs, 'dk-ao-right', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 1]);
  grad(defs, 'dk-glint', true, { cx: 0.5, cy: 0.5, r: 0.5 }, [0, 0.4, 1]);
  pattern(defs, 'dk-patina', '/static/assets/tex/patina-statuary.webp', 118);
  pattern(defs, 'dk-marble', '/static/assets/tex/stone-portoro.webp', 190);
  pattern(defs, 'dk-gilt', '/static/assets/tex/grain-gilt.webp', 60);
  return defs;
}

/* ------------------------------------------------------------ the console */
function buildConsole(q) {
  buildDefs(q);

  // Floor first: the runner's pile under the plinth. Not machine, so it
  // takes no pointer (.dk-floor).
  var floor = add(q, 'g', null, 'dk-floor');
  add(floor, 'ellipse', { cx: 180, cy: FLOOR + 1.5, rx: 184, ry: 10 }, 'dk-cshadow');
  add(floor, 'rect', { x: 16, y: 193.5, width: 328, height: 5.5 }, 'dk-occl');

  // The old vent stack ran down to the cornice; its footprint stays a target
  // (the drawn stack now stops on the top plane), unpainted.
  add(q, 'rect', { x: 240, y: 22, width: 11, height: 64 }, 'dk-hit');

  // ---- the top plane
  var xb0 = recede(22, CAP_T, TOP_BACK), xb1 = recede(338, CAP_T, TOP_BACK);
  var top = 'M22 ' + CAP_T + 'H338L' + n2(xb1) + ' ' + TOP_BACK + 'H' + n2(xb0) + 'Z';
  // The top is new paint, not new target: it takes no pointer, so the
  // console answers exactly where the old one did.
  var tp = add(q, 'g', null, 'dk-noptr');
  add(tp, 'path', { d: top }, 'dk-top');
  add(tp, 'path', { d: top }, 'dk-top-tex');
  add(tp, 'path', { d: top }, 'dk-topspec');
  add(tp, 'path', { d: 'M' + n2(xb0) + ' ' + TOP_BACK + 'H' + n2(xb1) }, 'dk-arris-back');
  // the sides of the top, seen edge-on as they run back
  add(tp, 'path', { d: 'M22 ' + CAP_T + 'L' + n2(xb0) + ' ' + TOP_BACK }, 'dk-arris-side');
  add(tp, 'path', { d: 'M338 ' + CAP_T + 'L' + n2(xb1) + ' ' + TOP_BACK }, 'dk-arris-side');

  // ---- cornice cap and its nosing
  add(q, 'rect', { x: 22, y: CAP_T, width: 316, height: CAP_B - CAP_T }, 'dk-cap');
  add(q, 'rect', { x: 22, y: CAP_T, width: 316, height: CAP_B - CAP_T }, 'dk-tex');
  add(q, 'rect', { x: 22, y: CAP_T - 0.3, width: 316, height: 1.9 }, 'dk-leaf dk-leaf-nose');
  // the niche's light, caught where the nosing turns
  [[150, 0.8], [196, 1], [236, 0.6]].forEach(function (g) {
    add(q, 'ellipse', { cx: g[0], cy: CAP_T + 0.5, rx: 9 * g[1], ry: 1.3 }, 'dk-glint dk-noptr');
  });
  add(q, 'rect', { x: 22, y: CAP_B - 1, width: 316, height: 1 }, 'dk-under');

  // ---- dentil course on the riser
  add(q, 'rect', { x: 28, y: CAP_B, width: 304, height: RISE_B - CAP_B }, 'dk-oil');
  var di = 0;
  for (var dx = 30; dx < 330; dx += 7, di++) {
    var w = 4.3 + (rnd('desk-dentil-' + di) - 0.5) * 0.5;
    add(q, 'rect', { x: n2(dx), y: CAP_B + 0.6, width: n2(w), height: 6.6 }, 'dk-dentil');
    add(q, 'rect', { x: n2(dx), y: CAP_B + 0.6, width: n2(w), height: 0.8 }, 'dk-dentil-top');
  }
  add(q, 'rect', { x: 28, y: RISE_B - 1.1, width: 304, height: 1.1 }, 'dk-fillet');

  // ---- frieze: fans and ziggurats in cast relief, alternating by hash
  add(q, 'rect', { x: CW_L, y: RISE_B, width: CW_R - CW_L, height: FRZ_B - RISE_B }, 'dk-frieze');
  var fr = add(q, 'g', null, 'dk-relief');
  var fanFirst = rnd('desk-frieze') < 0.5, mi = 0;
  var dFan = '', dStep = '';
  for (var fx = 42; fx <= 318; fx += 23, mi++) {
    if ((mi % 2 === 0) === fanFirst) dFan += fanPath(fx, FRZ_B - 1.4, 9.2, 7);
    else dStep += stepPath(fx, FRZ_B - 1.4, 13, 10.4, 4);
  }
  relief(fr, dFan);
  relief(fr, dStep);
  add(q, 'rect', { x: CW_L, y: FRZ_B - 1, width: CW_R - CW_L, height: 1 }, 'dk-fillet');
  add(q, 'rect', { x: CW_L, y: RISE_B, width: CW_R - CW_L, height: 3.5 }, 'dk-ao dk-ao-d');

  // ---- body
  add(q, 'rect', { x: CW_L, y: FRZ_B, width: CW_R - CW_L, height: BODY_B - FRZ_B }, 'dk-face');
  add(q, 'rect', { x: CW_L, y: FRZ_B, width: CW_R - CW_L, height: BODY_B - FRZ_B }, 'dk-tex');
  add(q, 'rect', { x: CW_L, y: FRZ_B, width: CW_R - CW_L, height: 5 }, 'dk-ao dk-ao-d');
  // the two end strips turn away from the room
  add(q, 'rect', { x: CW_L, y: FRZ_B, width: 7, height: BODY_B - FRZ_B }, 'dk-turn');
  add(q, 'rect', { x: CW_R - 7, y: FRZ_B, width: 7, height: BODY_B - FRZ_B }, 'dk-turn');
  // hips wear the two front arrises back to the leaf
  add(q, 'rect', { x: CW_L, y: FRZ_B, width: 1.3, height: BODY_B - FRZ_B }, 'dk-leaf dk-leaf-hip');
  add(q, 'rect', { x: CW_R - 1.3, y: FRZ_B, width: 1.3, height: BODY_B - FRZ_B }, 'dk-leaf dk-leaf-hip');

  // sunk panels either side of the window, each with its own cast motif
  var MOTIFS = ['fountain', 'fan', 'chevron', 'ziggurat'];
  var m0 = Math.floor(rnd('desk-panel-0') * 4), m1 = Math.floor(rnd('desk-panel-1') * 3);
  if (m1 >= m0) m1++;
  [[78, 113, MOTIFS[m0]], [247, 282, MOTIFS[m1]]].forEach(function (p) {
    var x0 = p[0], x1 = p[1], y0 = 124, y1 = 172, cx = (x0 + x1) / 2;
    add(q, 'rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, 'dk-recess');
    add(q, 'rect', { x: x0, y: y0, width: x1 - x0, height: 4 }, 'dk-ao dk-ao-d');
    // the bead that frames the recess: lit where it faces up, dark below
    add(q, 'path', { d: 'M' + x0 + ' ' + y1 + 'V' + y0 + 'H' + x1 }, 'dk-bead-lit');
    add(q, 'path', { d: 'M' + x1 + ' ' + y0 + 'V' + y1 + 'H' + x0 }, 'dk-bead-sh');
    var ix0 = x0 + 3.2, ix1 = x1 - 3.2, iy0 = y0 + 3.2, iy1 = y1 - 3.2;
    add(q, 'rect', { x: ix0 + 0.8, y: iy0 + 1, width: ix1 - ix0, height: iy1 - iy0 }, 'dk-cast-sh');
    add(q, 'rect', { x: ix0, y: iy0, width: ix1 - ix0, height: iy1 - iy0 }, 'dk-panel');
    add(q, 'rect', { x: ix0, y: iy0, width: ix1 - ix0, height: iy1 - iy0 }, 'dk-tex');
    add(q, 'path', { d: 'M' + n2(ix0) + ' ' + n2(iy1) + 'V' + n2(iy0) + 'H' + n2(ix1) }, 'dk-edge-lit');
    var g = add(q, 'g', null, 'dk-relief');
    var d;
    if (p[2] === 'fan') d = fanPath(cx, iy1 - 5, 13, 9) + stepPath(cx, iy0 + 14, 14, 8, 3);
    else if (p[2] === 'fountain') d = fountainPath(cx, iy1 - 4, ix1 - ix0 - 6, 30);
    else if (p[2] === 'chevron') d = chevronPath(cx, iy1 - 5, ix1 - ix0 - 8, 30, 4);
    else d = stepPath(cx, iy1 - 5, ix1 - ix0 - 8, 22, 5) + fanPath(cx, iy0 + 13, 7, 5);
    relief(g, d, 'dk-rl-panel');
  });

  // pilasters, proud of the field: flutes, a stepped capital, a base
  [40, 288].forEach(function (px, k) {
    var id = 'desk-pilaster-' + k, pw = 32;
    add(q, 'rect', { x: px + pw, y: FRZ_B, width: 5, height: BODY_B - FRZ_B }, 'dk-ao dk-ao-r');
    add(q, 'rect', { x: px, y: FRZ_B, width: pw, height: BODY_B - FRZ_B }, 'dk-face');
    add(q, 'rect', { x: px, y: FRZ_B, width: pw, height: BODY_B - FRZ_B }, 'dk-tex');
    add(q, 'path', { d: 'M' + px + ' ' + BODY_B + 'V' + FRZ_B }, 'dk-edge-lit');
    var nf = rnd(id) < 0.5 ? 3 : 4, gap = 2.6, fw = (pw - 10 - (nf - 1) * gap) / nf;
    for (var i = 0; i < nf; i++) {
      var fxx = px + 5 + i * (fw + gap);
      add(q, 'rect', { x: n2(fxx), y: FRZ_B + 10, width: n2(fw), height: BODY_B - FRZ_B - 20, rx: n2(fw / 2) }, 'dk-flute');
    }
    // capital: two courses, lit tops
    add(q, 'rect', { x: px - 2, y: FRZ_B, width: pw + 4, height: 3 }, 'dk-course');
    add(q, 'rect', { x: px - 2, y: FRZ_B, width: pw + 4, height: 0.8 }, 'dk-course-top');
    add(q, 'rect', { x: px - 1, y: FRZ_B + 3, width: pw + 2, height: 2.6 }, 'dk-course dk-course-2');
    add(q, 'rect', { x: px, y: FRZ_B + 5.6, width: pw, height: 3.4 }, 'dk-ao dk-ao-d');
    add(q, 'ellipse', { cx: px + 6, cy: FRZ_B + 0.5, rx: 5, ry: 0.9 }, 'dk-glint');
    // base
    add(q, 'rect', { x: px - 2, y: BODY_B - 6, width: pw + 4, height: 6 }, 'dk-course');
    add(q, 'rect', { x: px - 2, y: BODY_B - 6, width: pw + 4, height: 0.8 }, 'dk-course-top');
    add(q, 'rect', { x: px - 2, y: BODY_B - 6, width: pw + 4, height: 0.9 }, 'dk-leaf dk-leaf-base');
  });

  // the inspection window's archivolt, keystone and its four screws
  var Ro = ARCH_R + 6.5, Ri = ARCH_R + 0.5;
  var ring = 'M' + (ARCH_CX - Ro) + ' ' + ARCH_CY + 'A' + Ro + ' ' + Ro + ' 0 0 1 ' + (ARCH_CX + Ro) + ' ' + ARCH_CY +
             'H' + (ARCH_CX + Ri) + 'A' + Ri + ' ' + Ri + ' 0 0 0 ' + (ARCH_CX - Ri) + ' ' + ARCH_CY + 'Z';
  add(q, 'path', { d: ring, transform: 'translate(.8 1)' }, 'dk-cast-sh');
  add(q, 'path', { d: ring }, 'dk-ring');
  add(q, 'path', { d: ring }, 'dk-ringlight');
  var ky = ARCH_CY - ARCH_R;
  var key = 'M170.5 ' + (ky - 12) + 'H189.5L192.5 ' + (ky + 6) + 'H167.5Z';
  add(q, 'path', { d: key, transform: 'translate(.8 1)' }, 'dk-cast-sh');
  add(q, 'path', { d: key }, 'dk-key');
  add(q, 'path', { d: 'M170.5 ' + (ky - 12) + 'H189.5' }, 'dk-edge-lit');
  add(q, 'path', { d: stepPath(180, ky + 2, 10, 10, 3) }, 'dk-rl-body dk-key-step');
  [212, 248, 292, 328].forEach(function (a, i) {
    var r = (Ro + Ri) / 2;
    screw(q, ARCH_CX + r * Math.cos(a * DEG), ARCH_CY + r * Math.sin(a * DEG), 1.5, 'desk-ring-screw-' + i);
  });

  // the oil line where the body meets its base
  add(q, 'rect', { x: CW_L, y: BODY_B - 1.2, width: CW_R - CW_L, height: 1.2 }, 'dk-oil');

  // ---- base moulding (bronze) and the Portoro plinth
  add(q, 'rect', { x: 26, y: BODY_B, width: 308, height: 2.2 }, 'dk-btop');
  add(q, 'rect', { x: 26, y: BODY_B + 2, width: 308, height: 5 }, 'dk-torus');
  add(q, 'rect', { x: 26, y: BODY_B + 2, width: 308, height: 5 }, 'dk-tex');
  add(q, 'rect', { x: 26, y: BODY_B + 3.1, width: 308, height: 1.1 }, 'dk-leaf dk-leaf-toe');
  add(q, 'rect', { x: 20, y: 189, width: 320, height: 2.1 }, 'dk-mtop');
  add(q, 'rect', { x: 20, y: 191, width: 320, height: FLOOR - 191 }, 'dk-marble');
  add(q, 'rect', { x: 20, y: 191, width: 320, height: FLOOR - 191 }, 'dk-mface');
  add(q, 'rect', { x: 20, y: 191, width: 320, height: 0.6 }, 'dk-mlip');

  // ---- the quadrant plate, screwed to the cornice
  var qp = function (r, deg) {
    var a = deg * DEG;
    return n2(180 + r * QS * Math.sin(a)) + ' ' + n2(QPIV - r * QS * Math.cos(a));
  };
  var qr = function (r) { return n2(r * QS); };
  var plate = 'M' + qp(148, -22) + 'A' + qr(148) + ' ' + qr(148) + ' 0 0 1 ' + qp(148, 22) +
              'L' + qp(130, 22) + 'A' + qr(130) + ' ' + qr(130) + ' 0 0 0 ' + qp(130, -22) + 'Z';
  add(q, 'path', { d: plate, transform: 'translate(.8 1.1)' }, 'dk-cast-sh');
  add(q, 'path', { d: plate }, 'dk-quad');
  add(q, 'path', { d: plate }, 'dk-tex');
  add(q, 'path', { d: 'M' + qp(147.4, -21.6) + 'A' + qr(147.4) + ' ' + qr(147.4) + ' 0 0 1 ' + qp(147.4, 21.6) }, 'dk-edge-lit');
  // engraved scale between the notches
  var sc = '';
  for (var d = -14; d <= 14; d += 2) {
    sc += 'M' + qp(141, d) + 'L' + qp(d % 4 === 0 ? 146 : 144, d);
  }
  add(q, 'path', { d: sc }, 'dk-engrave');
  // the catch rides the inner lip: worn bright between the two notches
  add(q, 'path', { d: 'M' + qp(130.6, -16) + 'A' + qr(130.6) + ' ' + qr(130.6) + ' 0 0 1 ' + qp(130.6, 16) }, 'dk-leaf-stroke');
  var teeth = '';
  for (var t = -18; t <= 18; t += 4) {
    if (t === -16 || t === 16) continue;
    teeth += 'M' + qp(130, t) + 'L' + qp(126.5, t);
  }
  add(q, 'path', { d: teeth }, 'dk-teeth');
  [-16, 16].forEach(function (deg) {
    add(q, 'polygon', { points: [qp(126, deg - 1.8), qp(126, deg + 1.8), qp(138, deg + 1.3), qp(138, deg - 1.3)].join(' ') }, 'dk-notch');
  });
  screw(q, +qp(139, -19.5).split(' ')[0], +qp(139, -19.5).split(' ')[1], 1.35, 'desk-quad-screw-0');
  screw(q, +qp(139, 19.5).split(' ')[0], +qp(139, 19.5).split(' ')[1], 1.35, 'desk-quad-screw-1');

  // ---- the vent stack, standing on the top plane
  var vx = 240, vw = 11, vbase = 75;
  add(q, 'ellipse', { cx: vx + vw / 2 + 1, cy: vbase + 0.8, rx: 9.5, ry: 2.4 }, 'dk-oil dk-vent-sh dk-noptr');
  add(q, 'ellipse', { cx: vx + vw / 2, cy: vbase, rx: 8.5, ry: 2.2 }, 'dk-vent-flange dk-noptr');
  add(q, 'rect', { x: vx, y: 27, width: vw, height: vbase - 27 }, 'dk-cyl');
  [34, 44, 62].forEach(function (cy, i) {
    var cw = i === 2 ? 15 : 17;
    add(q, 'rect', { x: vx + vw / 2 - cw / 2, y: cy, width: cw, height: 2.8 }, 'dk-cyl dk-collar');
    add(q, 'rect', { x: vx + vw / 2 - cw / 2, y: cy, width: cw, height: 0.7 }, 'dk-collar-top');
  });
  // bell mouth, flared, dark inside
  add(q, 'path', { d: 'M' + vx + ' 30L' + (vx - 2.2) + ' 25H' + (vx + vw + 2.2) + 'L' + (vx + vw) + ' 30Z' }, 'dk-cyl');
  add(q, 'ellipse', { cx: vx + vw / 2, cy: 25, rx: vw / 2 + 2.2, ry: 1.3 }, 'dk-vent-mouth');
  add(q, 'path', { d: 'M' + (vx - 2.2) + ' 25H' + (vx + vw + 2.2) }, 'dk-collar-top');

  // ---- the lever's pivot bracket and gaiter, bolted to the base
  add(q, 'path', { d: 'M152 190V183.5L157 180H203L208 183.5V190Z', transform: 'translate(.8 1)' }, 'dk-cast-sh');
  add(q, 'path', { d: 'M152 190V183.5L157 180H203L208 183.5V190Z' }, 'dk-flange');
  add(q, 'path', { d: 'M152 183.5L157 180H203L208 183.5' }, 'dk-edge-lit');
  [157, 164, 196, 203].forEach(function (bx, i) { screw(q, bx, 186.4, 1.45, 'desk-flange-bolt-' + i); });
  add(q, 'rect', { x: 168, y: 176.5, width: 24, height: 8, rx: 3.2 }, 'dk-gaiter');
  var pleat = '';
  for (var px2 = 171; px2 <= 189; px2 += 3) pleat += 'M' + px2 + ' 177.4V183.8';
  add(q, 'path', { d: pleat }, 'dk-pleat');
}

/* ------------------------------------------------------------ the lever */
function buildLever(lv) {
  var defs = add(lv, 'defs');
  grad(defs, 'dk-enamel', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.14, 0.26, 0.55, 1]);
  grad(defs, 'dk-enamel-edge', false, { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 30, x2: 0, y2: 204 }, [0, 0.5, 1]);
  grad(defs, 'dk-steel', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.12, 0.25, 0.31, 0.4, 0.72, 1]);
  grad(defs, 'dk-steel-flat', false, { x1: 0, y1: 0, x2: 0, y2: 1 }, [0, 0.35, 1]);
  grad(defs, 'dk-dome', true, { cx: 0.38, cy: 0.3, r: 0.75 }, [0, 0.4, 1]);
  grad(defs, 'dk-wing', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.22, 0.34, 0.62, 1]);
  grad(defs, 'dk-wing-hi', false, { x1: 0, y1: 0, x2: 1, y2: 0 }, [0, 0.22, 0.34, 0.62, 1]);
  grad(defs, 'dk-brass', false, { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 94, x2: 0, y2: 134 }, [0, 0.12, 0.5, 1]);
  grad(defs, 'dk-grip-wear', false, { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 14, x2: 0, y2: 58 }, [0, 0.35, 0.65, 1]);

  // the catch handle, behind the grip, and its rod down to the catch block
  add(lv, 'path', { d: 'M76 21C84.5 22 86.5 25 86.5 31V49C86.5 53.5 84 56 78 56.5' }, 'lv-catch');
  add(lv, 'path', { d: 'M76.3 20.3C84 21.3 85.6 24.2 85.6 30V48' }, 'lv-catch-lit');
  add(lv, 'path', { d: 'M81.5 56V67' }, 'lv-rod');

  // the shaft: black enamel, a flat bar with a soft reflection down it
  add(lv, 'polygon', { points: '63.5,204 76.5,204 75,30 65,30' }, 'lv-arm');
  add(lv, 'path', { d: 'M63.9 204L65.35 30' }, 'lv-arm-lit');
  add(lv, 'path', { d: 'M76.1 204L74.65 30' }, 'lv-arm-shd');

  // the catch block on the quadrant radius, its tooth in the notch
  add(lv, 'rect', { x: 61.5, y: 64.5, width: 17, height: 12, rx: 1.2, transform: 'translate(.7 .9)' }, 'lv-block-sh');
  add(lv, 'rect', { x: 61.5, y: 64.5, width: 17, height: 12, rx: 1.2 }, 'lv-block');
  add(lv, 'rect', { x: 61.5, y: 64.5, width: 17, height: 1 }, 'lv-block-top');
  add(lv, 'rect', { x: 67.5, y: 76.5, width: 5, height: 3.2 }, 'lv-block');
  [[65, 70.5], [75, 70.5]].forEach(function (p, i) {
    add(lv, 'circle', { cx: p[0], cy: p[1], r: 1.5 }, 'lv-bolt');
    var a = rnd('desk-lever-bolt-' + i) * Math.PI;
    add(lv, 'path', { d: 'M' + n2(p[0] - Math.cos(a) * 1.2) + ' ' + n2(p[1] - Math.sin(a) * 1.2) +
                         'L' + n2(p[0] + Math.cos(a) * 1.2) + ' ' + n2(p[1] + Math.sin(a) * 1.2) }, 'dk-slot');
  });

  // the wing metal: the ferrule where the grip meets the shaft
  add(lv, 'rect', { x: 62, y: 56.5, width: 16, height: 7, rx: 1.4 }, 'lv-grip');
  add(lv, 'rect', { x: 62, y: 56.5, width: 16, height: 0.9 }, 'lv-ferrule-top');

  // the grip: polished steel, a turned cylinder, bright where the hand goes
  add(lv, 'rect', { x: 62.5, y: 14, width: 15, height: 44, rx: 7.5 }, 'lv-steel');
  add(lv, 'rect', { x: 62.5, y: 14, width: 15, height: 44, rx: 7.5 }, 'lv-wear');
  add(lv, 'rect', { x: 66.1, y: 18, width: 1.3, height: 36, rx: 0.65 }, 'lv-hot');
  add(lv, 'rect', { x: 73.6, y: 20, width: 0.8, height: 32, rx: 0.4 }, 'lv-rim');
  add(lv, 'ellipse', { cx: 70, cy: 16.2, rx: 6.2, ry: 2.4 }, 'lv-cap');

  // the badge: brass, engraved and filled black
  add(lv, 'rect', { x: 60.2, y: 94.6, width: 19.6, height: 40, rx: 2.6 }, 'lv-badge-sh');
  add(lv, 'rect', { x: 60, y: 94, width: 20, height: 40, rx: 2.6 }, 'lv-badge');
  add(lv, 'rect', { x: 61.6, y: 95.6, width: 16.8, height: 36.8, rx: 1.6 }, 'lv-badge-line');
  var n1 = add(lv, 'text', { x: 70, y: 116.5, 'text-anchor': 'middle' }, 'lv-badge-n');
  n1.textContent = '1';
  add(lv, 'path', { d: 'M70 119.6L71.3 120.9L70 122.2L68.7 120.9Z' }, 'lv-badge-dot');
  var w1 = add(lv, 'text', { x: 70, y: 128.2, 'text-anchor': 'middle' }, 'lv-badge-w');
  w1.textContent = 'WINGS';
  [98, 130].forEach(function (cy) {
    add(lv, 'circle', { cx: 70, cy: cy, r: 1.25 }, 'lv-rivet');
  });

  // the pivot: a bronze boss, a steel pin, a cotter
  add(lv, 'circle', { cx: 70.8, cy: 203, r: 8.6 }, 'lv-block-sh');
  add(lv, 'circle', { cx: 70, cy: 202, r: 8.6 }, 'lv-boss');
  add(lv, 'circle', { cx: 70, cy: 202, r: 3.3 }, 'lv-pin');
  add(lv, 'rect', { x: 67.2, y: 205.9, width: 5.6, height: 1.2, rx: 0.5 }, 'lv-cotter');
}

/* ------------------------------------------------------------ gear train */
/* Trapezoid-tooth gear on ISO proportions (addendum 1.0m, dedendum 1.25m).
   Meshing gears MUST share the module m. evenodd for the bore. */
function gearPath(N, m, o) {
  o = o || {};
  var rp = N * m / 2, ra = rp + m, rr = rp - 1.25 * m;
  var pitch = 2 * Math.PI / N, wTip = pitch * 0.32, wRoot = pitch * 0.52;
  var P = function (r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); };
  var d = '';
  for (var i = 0; i < N; i++) {
    var c = i * pitch, r0 = c - wRoot / 2, r1 = c + wRoot / 2, t0 = c - wTip / 2, t1 = c + wTip / 2;
    d += (i === 0 ? 'M ' + P(rr, r0) : ' A ' + rr + ' ' + rr + ' 0 0 1 ' + P(rr, r0));
    d += ' L ' + P(ra, t0) + ' A ' + ra + ' ' + ra + ' 0 0 1 ' + P(ra, t1) + ' L ' + P(rr, r1);
  }
  d += ' A ' + rr + ' ' + rr + ' 0 0 1 ' + P(rr, -wRoot / 2) + ' Z';
  var circle = function (r) {
    return ' M ' + r + ' 0 A ' + r + ' ' + r + ' 0 1 0 ' + (-r) + ' 0 A ' + r + ' ' + r + ' 0 1 0 ' + r + ' 0 Z';
  };
  d += circle(o.bore || 0.16 * rp);
  return d;
}

var GEAR_NA = 18, GEAR_NB = 9, GEAR_M = 4.4, GEAR_PHI = -20;

function buildGears(desk) {
  var P = function (r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); };
  function sectorPath(r, a0, a1) {
    var da = a1 - a0;
    if (da < 0) da += 2 * Math.PI;
    return 'M 0 0 L ' + P(r, a0) + ' A ' + r + ' ' + r + ' 0 ' + (da > Math.PI ? 1 : 0) + ' 1 ' + P(r, a1) + ' Z';
  }
  var rpA = GEAR_NA * GEAR_M / 2, rpB = GEAR_NB * GEAR_M / 2, phi = GEAR_PHI * DEG;
  // A's centre in the well; the mesh point lands inside the arch.
  var ax = 38, ay = 56;
  var bx = ax + (rpA + rpB) * Math.cos(phi), by = ay + (rpA + rpB) * Math.sin(phi);
  var phaseB = (((1 + GEAR_NA / GEAR_NB) * GEAR_PHI + 180 - 180 / GEAR_NB) % (360 / GEAR_NB) + 360 / GEAR_NB) % (360 / GEAR_NB);
  var gA = desk.querySelector('.gearA-svg'), gB = desk.querySelector('.gearB-svg');
  if (!gA || !gB) return;

  // Both wheels' shading is radial about their own axis, so it survives the
  // turn; the lamp's direction lives on static layers over the well.
  var dA = add(gA, 'defs');
  grad(dA, 'dk-gA', true, { gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: 41 }, [0, 0.3, 0.7, 0.84, 0.93, 1]);
  var dB = add(gB, 'defs');
  grad(dB, 'dk-gB', true, { gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: 23 }, [0, 0.35, 0.72, 0.9, 1]);

  var wA = E('g');
  add(wA, 'path', { d: gearPath(GEAR_NA, GEAR_M, {}), 'fill-rule': 'evenodd' }, 'ga-rim');
  add(wA, 'circle', { cx: 0, cy: 0, r: 32.9 }, 'ga-fillet');
  add(wA, 'circle', { cx: 0, cy: 0, r: 28 }, 'ga-web');
  for (var s = 0; s < 5; s++) {
    var a0 = s * 2 * Math.PI / 5 + 0.16, a1 = (s + 1) * 2 * Math.PI / 5 - 0.16;
    add(wA, 'path', { d: 'M ' + P(10.5, a0) + ' A 10.5 10.5 0 0 1 ' + P(10.5, a1) + ' L ' + P(28, a1) +
                         ' A 28 28 0 0 0 ' + P(28, a0) + ' Z' }, 'ga-spoke');
  }
  var lholeRad = [3.5, 3.1, 3.7, 3.3, 3.6];
  for (s = 0; s < 5; s++) {
    var lh = (s + 0.5) * 2 * Math.PI / 5;
    add(wA, 'circle', { cx: (19 * Math.cos(lh)).toFixed(2), cy: (19 * Math.sin(lh)).toFixed(2), r: lholeRad[s] }, 'ga-lhole');
  }
  add(wA, 'circle', { cx: 0, cy: 0, r: 24.5 }, 'ga-witness');
  add(wA, 'circle', { cx: 0, cy: 0, r: 9.5 }, 'ga-boss');
  add(wA, 'circle', { cx: 0, cy: 0, r: 3.2 }, 'ga-bore');
  add(wA, 'rect', { x: -1.6, y: -9.5, width: 3.2, height: 6.3 }, 'ga-keyway');
  add(wA, 'rect', { x: -1.2, y: -9.4, width: 2.4, height: 5.8 }, 'ga-key');
  add(wA, 'path', { d: 'M ' + P(39, 0) + ' L ' + P(36.5, 0) + ' M ' + P(41, 0) + ' L ' + P(40, 0) }, 'ga-index');
  add(wA, 'rect', { x: -10, y: 14, width: 20, height: 7, rx: 0.5 }, 'ga-pno-bg');
  var pno = add(wA, 'text', { x: 0, y: 20, 'text-anchor': 'middle' }, 'ga-pno-t');
  pno.textContent = 'GA-18';
  gA.appendChild(wA);

  var wB = E('g', { transform: 'rotate(' + phaseB.toFixed(2) + ')' });
  add(wB, 'path', { d: gearPath(GEAR_NB, GEAR_M, {}), 'fill-rule': 'evenodd' }, 'gb-rim');
  add(wB, 'circle', { cx: 0, cy: 0, r: 13.5 }, 'gb-web');
  for (s = 0; s < 3; s++) {
    var b0 = s * 2 * Math.PI / 3 + 0.18, b1 = (s + 1) * 2 * Math.PI / 3 - 0.18;
    add(wB, 'path', { d: 'M ' + P(7.5, b0) + ' A 7.5 7.5 0 0 1 ' + P(7.5, b1) + ' L ' + P(13.5, b1) +
                         ' A 13.5 13.5 0 0 0 ' + P(13.5, b0) + ' Z' }, 'gb-spoke');
  }
  add(wB, 'circle', { cx: 0, cy: 0, r: 6 }, 'gb-flange');
  add(wB, 'circle', { cx: 0, cy: 0, r: 2.5 }, 'gb-bore');
  add(wB, 'rect', { x: -2.5, y: 1.8, width: 5, height: 1 }, 'gb-dflat');
  add(wB, 'circle', { cx: 0, cy: 0, r: 11.5 }, 'gb-serial');
  add(wB, 'path', { d: 'M ' + P(20, 0) + ' L ' + P(18, 0) }, 'gb-index');
  gB.appendChild(wB);

  gA.style.left = (ax - 52) + 'px'; gA.style.top = (ay - 52) + 'px';
  gB.style.left = (bx - 30).toFixed(1) + 'px'; gB.style.top = (by - 30).toFixed(1) + 'px';

  // The window: a lamp at the head of the well (night), the oil the back
  // wheel stands in, and the glazing over both with its one reflection.
  var well = desk.querySelector('.gear-well');
  var lamp = document.createElement('div');
  lamp.className = 'gw-lamp';
  lamp.setAttribute('aria-hidden', 'true');
  well.insertBefore(lamp, well.firstChild);
  ['gw-shade', 'gw-glass'].forEach(function (c) {
    var d = document.createElement('div');
    d.className = c;
    d.setAttribute('aria-hidden', 'true');
    well.appendChild(d);
  });
}

/* ------------------------------------------------------------ throw plates */
function dressPlates(desk) {
  [['.l-salon', 'desk-plate-salon'], ['.l-bureau', 'desk-plate-bureau']].forEach(function (p) {
    var el = desk.querySelector(p[0]);
    if (!el || el.querySelector('.l-jewel')) return;
    // the screw slot turned by hash; the jewel sits where the inner screw was
    el.style.setProperty('--slot', Math.round(rnd(p[1]) * 180) + 'deg');
    var j = document.createElement('i');
    j.className = 'l-jewel';
    j.setAttribute('aria-hidden', 'true');
    el.appendChild(j);
  });
}

window.Desk = {
  build: function (desk) {
    if (!desk) return;
    var q = desk.querySelector('.quadrant'), lv = desk.querySelector('.lever-svg');
    if (q && !q.firstChild) buildConsole(q);
    if (lv && !lv.firstChild) buildLever(lv);
    buildGears(desk);
    dressPlates(desk);
  }
};
})();
