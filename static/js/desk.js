/* ===========================================================================
   THE HOUSE-LIGHTS BOARD: the hall's one control.

   A picture palace threw its house lights on a switchboard: a slab of
   insulating marble in a frame, carrying knife switches with copper blades
   and ebonite handles, cartridge fuses, pilot jewels and an ammeter. This is
   that board cut down to one circuit pair and stood on a pedestal at the
   foot of the runner, where an usher would find it: a Bardiglio slab laid
   as a lectern's sloped top in a statuary bronze frame, a fluted stem, a
   Portoro plinth on the wool, and a fan-shaped ammeter standing on the far
   rail like a sunrise.

   The switch is one double-pole, double-throw knife switch. Its hinge is in
   the middle of the slab and its jaws are to either side: SALON on the left,
   BUREAU on the right. The blade lies in one pair of jaws with its handle
   out over the frame. A throw lifts it out of them (the flash of the
   break), swings it up off the marble and over the hinge toward the reader,
   and drops it into the other pair, where it bounces once on the springs
   and settles. The pilot jewel over the live jaws is lit and the meter's
   needle stands on that side.

   The swing is drawn as the real one would be seen. The hinge pin runs up
   the slope, so the blade turns in a plane that faces the reader and leans
   back: each blade is its own layer, turned about its own hinge and
   flattened by K (the plane's foreshortening); the crossbar that joins the
   two blade tips only travels; the handle travels with it, turns to the
   blade's projected angle and grows a little as it comes toward the reader.
   All of it is transform and opacity, derived in CSS from one number, --sw,
   which app.js writes on the parts that read it (atrium.css).

   Every tone is a CSS custom property, set through style attributes (var()
   does not resolve in presentation attributes). Siblings that repeat
   (screws, flutes, fuses, sparks) vary off fnv1a of a stable id.
   =========================================================================== */
(function () {
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var DEG = Math.PI / 180;

function E(tag, attrs, cls) {
  var e = document.createElementNS(NS, tag);
  if (attrs) for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== '') e.setAttribute(k, attrs[k]);
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

/* A gradient. Each stop is [offset, colour, opacity?]; the colour is CSS
   (usually a var()), so it goes in a style attribute. */
function grad(defs, id, radial, attrs, stops) {
  var g = add(defs, radial ? 'radialGradient' : 'linearGradient', attrs);
  g.setAttribute('id', id);
  stops.forEach(function (s) {
    add(g, 'stop', { offset: s[0], style: 'stop-color:' + s[1] + (s[2] !== undefined ? ';stop-opacity:' + s[2] : '') });
  });
  return g;
}
function lin(defs, id, x1, y1, x2, y2, stops) {
  return grad(defs, id, false, { gradientUnits: 'userSpaceOnUse', x1: x1, y1: y1, x2: x2, y2: y2 }, stops);
}
function box(defs, id, vertical, stops) {
  return grad(defs, id, false, vertical ? { x1: 0, y1: 0, x2: 0, y2: 1 } : { x1: 0, y1: 0, x2: 1, y2: 0 }, stops);
}
function pattern(defs, id, href, size, xf) {
  var p = add(defs, 'pattern', { id: id, patternUnits: 'userSpaceOnUse', width: size, height: size });
  if (xf) p.setAttribute('patternTransform', xf);
  add(p, 'image', { href: href, width: size, height: size, preserveAspectRatio: 'none' });
  return p;
}
function U(id) { return 'url(#' + id + ')'; }
function F(v) { return 'fill:' + v; }
function S(v, w, extra) { return 'fill:none;stroke:' + v + ';stroke-width:' + w + (extra ? ';' + extra : ''); }

/* ------------------------------------------------------------ geometry */
/* The assembly box is 440 x 300 units. Everything the board draws sits
   between ART_TOP (the focus ring over the finial) and the floor; the
   handle's arc peaks under the finial. */
var BOX_W = 440, BOX_H = 300, ART_TOP = 6;
var CX = 220, FLOOR = 292;
var VP_Y = FLOOR - 720;                       // the floor's vanishing point
/* the switch: two poles, one hinge line, jaws JAW_R either side */
var HINGE_Y = 118, POLE_FAR = 103, POLE_NEAR = 133;
var JAW_R = 100, BLADE_L = 122, GRIP_L = 70, K = 0.52;
/* the slab and its frame: the far rail is thin and high, the lip thick and
   low, and the far edge narrower, because the top slopes away */
var FAR_Y = 70, FAR_IN = 76, NEAR_IN = 167, NEAR_Y = 181, APRON_B = 197;
var OUT_FAR = 52, OUT_NEAR = 18, IN_FAR = 62, IN_NEAR = 32;
var MET_Y = 76, MET_R = 38;
var JEWEL_Y = 90, JEWEL_DX = 148;
var PLATE_B = 165;

function outerX(y) { return OUT_NEAR + (OUT_FAR - OUT_NEAR) * (NEAR_Y - y) / (NEAR_Y - FAR_Y); }
function innerX(y) { return IN_NEAR + (IN_FAR - IN_NEAR) * (NEAR_IN - y) / (NEAR_IN - FAR_IN); }
function mirror(x) { return 2 * CX - x; }
/* Where a point on a horizontal plane's front edge lands on its back edge. */
function recede(x, yFront, yBack) { return CX + (x - CX) * (VP_Y - yBack) / (VP_Y - yFront); }
function quad(x0, y0, x1, y1, x2, y2, x3, y3) {
  return 'M' + n2(x0) + ' ' + n2(y0) + 'L' + n2(x1) + ' ' + n2(y1) + 'L' + n2(x2) + ' ' + n2(y2) + 'L' + n2(x3) + ' ' + n2(y3) + 'Z';
}
function rect(x, y, w, h) { return quad(x, y, x + w, y, x + w, y + h, x, y + h); }
function fieldPath() {
  return quad(innerX(FAR_IN), FAR_IN, mirror(innerX(FAR_IN)), FAR_IN, mirror(IN_NEAR), NEAR_IN, IN_NEAR, NEAR_IN);
}

/* Stamped legends, cut as strokes: texture at a glance, letters under a
   loupe. Each glyph sits in a cell 3 units tall, origin top left. */
var STAMP = {
  A: ['M0 3L1 0L2 3M.35 2H1.65', 2],
  M: ['M0 3V0L1 1.8L2 0V3', 2],
  P: ['M0 3V0H1.2C1.8 0 2 .4 2 .8S1.8 1.6 1.2 1.6H0', 2],
  E: ['M1.8 0H0V3H1.8M0 1.5H1.4', 1.8],
  R: ['M0 3V0H1.2C1.8 0 2 .4 2 .8S1.8 1.6 1.2 1.6H0M1.1 1.6L2 3', 2],
  S: ['M1.7 .5C1.5 .12 1.2 0 .9 0C.4 0 .1 .3 .1 .8C.1 1.9 1.8 1.2 1.8 2.3C1.8 2.7 1.4 3 .9 3C.5 3 .2 2.8 0 2.4', 1.8],
  T: ['M0 0H2M1 0V3', 2],
  I: ['M.3 0V3', 0.6],
  U: ['M0 0V2C0 2.6 .4 3 1 3S2 2.6 2 2V0', 2],
  V: ['M0 0L1 3L2 0', 2],
  '0': ['M1 0C.4 0 0 .7 0 1.5S.4 3 1 3S2 2.3 2 1.5S1.6 0 1 0Z', 2],
  '2': ['M.1 .6C.3 .2 .6 0 1 0C1.6 0 1.9 .4 1.9 .8C1.9 1.6 .1 2.2 .1 3H1.9', 2],
  '5': ['M1.8 0H.3L.1 1.4C.4 1.2 .7 1.1 1 1.1C1.6 1.1 1.9 1.6 1.9 2S1.6 3 1 3C.6 3 .3 2.8 .1 2.5', 2],
  ' ': ['', 1.2]
};
function stamp(parent, text, cx, top, h, style) {
  var k = h / 3, gap = 0.6, w = 0;
  text.split('').forEach(function (c, i) { w += STAMP[c][1] + (i ? gap : 0); });
  var g = add(parent, 'g', { transform: 'translate(' + n2(cx - w * k / 2) + ' ' + n2(top) + ') scale(' + n2(k) + ')', style: style });
  var x = 0;
  text.split('').forEach(function (c) {
    if (STAMP[c][0]) {
      var p = add(g, 'path', { d: STAMP[c][0] });
      if (x) p.setAttribute('transform', 'translate(' + n2(x) + ' 0)');
    }
    x += STAMP[c][1] + gap;
  });
  return g;
}

/* A slotted screw head, domed, its slot turned by hash. */
function screw(g, cx, cy, r, id, metal) {
  add(g, 'circle', { cx: n2(cx + 0.35), cy: n2(cy + 0.5), r: n2(r), style: F('var(--sb-oil)') + ';opacity:.7' });
  add(g, 'circle', { cx: n2(cx), cy: n2(cy), r: n2(r), fill: U(metal === 'cu' ? 'hb-cu-dome' : 'hb-br-dome') });
  var a = rnd(id) * 180 * DEG, dx = Math.cos(a) * r * 0.8, dy = Math.sin(a) * r * 0.8;
  add(g, 'path', { d: 'M' + n2(cx - dx) + ' ' + n2(cy - dy) + 'L' + n2(cx + dx) + ' ' + n2(cy + dy),
                   style: S('var(--sb-oil)', n2(r * 0.36), 'stroke-linecap:round') });
}
/* A hex nut on a stud, seen from the front and a little above. */
function nut(g, cx, cy, r) {
  var d = '';
  for (var i = 0; i < 6; i++) {
    var a = (i * 60 + 30) * DEG;
    d += (i ? 'L' : 'M') + n2(cx + r * Math.cos(a)) + ' ' + n2(cy + r * 0.8 * Math.sin(a));
  }
  add(g, 'path', { d: d + 'Z', transform: 'translate(.4 .6)', style: F('var(--sb-oil)') + ';opacity:.75' });
  add(g, 'path', { d: d + 'Z', fill: U('hb-cu-nut') });
  add(g, 'circle', { cx: n2(cx), cy: n2(cy), r: n2(r * 0.42), style: F('var(--kc-1)') });
  add(g, 'circle', { cx: n2(cx - r * 0.1), cy: n2(cy - r * 0.12), r: n2(r * 0.22), style: F('var(--kc-4)') + ';opacity:.8' });
}

/* Cast relief (the apron's frieze, the bosses' fans): drawn flat, turned to
   metal by the filter: a worn silhouette, a lit shoulder toward the room's
   light, a sheen over each form, the far shoulder in shade and the shadow
   the form throws on its ground. The board never moves, so the filter is
   painted once. */
function castFilter(defs) {
  var f = add(defs, 'filter', { id: 'hb-cast', x: '-8%', y: '-14%', width: '120%', height: '134%',
                                'color-interpolation-filters': 'sRGB' });
  add(f, 'feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 0.42, result: 'b' });
  var ct = add(f, 'feComponentTransfer', { in: 'b', result: 'm0' });
  add(ct, 'feFuncA', { type: 'linear', slope: 3.4, intercept: -1.2 });
  add(f, 'feComposite', { in: 'm0', in2: 'SourceAlpha', operator: 'in', result: 'm' });
  add(f, 'feComposite', { in: 'SourceGraphic', in2: 'm', operator: 'in', result: 'body' });
  add(f, 'feTurbulence', { type: 'fractalNoise', baseFrequency: '0.32 0.5', numOctaves: 2, seed: 11, result: 'n' });
  add(f, 'feColorMatrix', { in: 'n', type: 'matrix', result: 'wear',
    values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.2 0 0 0 -0.3' });
  add(f, 'feOffset', { in: 'm', dx: 0.55, dy: 0.8, result: 'mo' });
  add(f, 'feComposite', { in: 'm', in2: 'mo', operator: 'out', result: 'ul' });
  add(f, 'feGaussianBlur', { in: 'ul', stdDeviation: 0.28, result: 'ulb' });
  add(f, 'feFlood', { result: 'lc', style: 'flood-color:var(--sb-rl-lit)' });
  add(f, 'feComposite', { in: 'lc', in2: 'ulb', operator: 'in', result: 'l0' });
  add(f, 'feComposite', { in: 'l0', in2: 'wear', operator: 'in', result: 'l1' });
  add(f, 'feComposite', { in: 'l1', in2: 'm', operator: 'in', result: 'lit' });
  add(f, 'feOffset', { in: 'm', dx: 1.6, dy: 2.2, result: 'mo2' });
  add(f, 'feComposite', { in: 'm', in2: 'mo2', operator: 'out', result: 'ul2' });
  add(f, 'feGaussianBlur', { in: 'ul2', stdDeviation: 0.9, result: 'ul2b' });
  add(f, 'feFlood', { result: 'sc', style: 'flood-color:var(--sb-4);flood-opacity:.42' });
  add(f, 'feComposite', { in: 'sc', in2: 'ul2b', operator: 'in', result: 's0' });
  add(f, 'feComposite', { in: 's0', in2: 'm', operator: 'in', result: 'sheen' });
  add(f, 'feOffset', { in: 'm', dx: -0.6, dy: -0.85, result: 'mo3' });
  add(f, 'feComposite', { in: 'm', in2: 'mo3', operator: 'out', result: 'lr' });
  add(f, 'feGaussianBlur', { in: 'lr', stdDeviation: 0.4, result: 'lrb' });
  add(f, 'feFlood', { result: 'dc', style: 'flood-color:var(--sb-oil);flood-opacity:.8' });
  add(f, 'feComposite', { in: 'dc', in2: 'lrb', operator: 'in', result: 'd0' });
  add(f, 'feComposite', { in: 'd0', in2: 'm', operator: 'in', result: 'shade' });
  add(f, 'feOffset', { in: 'b', dx: 0.75, dy: 1.05, result: 'so' });
  add(f, 'feGaussianBlur', { in: 'so', stdDeviation: 0.35, result: 'sob' });
  add(f, 'feFlood', { result: 'oc', style: 'flood-color:var(--sb-oil);flood-opacity:.9' });
  add(f, 'feComposite', { in: 'oc', in2: 'sob', operator: 'in', result: 'drop' });
  var mg = add(f, 'feMerge');
  ['drop', 'body', 'sheen', 'shade', 'lit'].forEach(function (r) { add(mg, 'feMergeNode', { in: r }); });
}
function fanPath(cx, by, r, rays) {
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
function chevronPath(cx, by, w, h) {
  // a lightning chevron: the house's electric sign, cast
  var t = h * 0.3;
  return 'M' + n2(cx - w / 2) + ' ' + n2(by) + 'L' + n2(cx) + ' ' + n2(by - h) + 'L' + n2(cx + w / 2) + ' ' + n2(by) +
         'L' + n2(cx + w / 2 - t) + ' ' + n2(by) + 'L' + n2(cx) + ' ' + n2(by - h + t * 1.3) + 'L' + n2(cx - w / 2 + t) + ' ' + n2(by) + 'Z';
}

/* ------------------------------------------------------------ defs */
function buildDefs(svg) {
  var defs = add(svg, 'defs');
  // Statuary bronze faces: the room's light on the top third, the dark
  // house as a band, the oil pooling toward the foot.
  box(defs, 'hb-face', true, [[0, 'var(--sb-3)'], [0.14, 'var(--sb-2)'], [0.38, 'var(--sb-band)'],
                              [0.52, 'var(--sb-2)'], [0.8, 'var(--sb-1)'], [1, 'var(--sb-0)']]);
  box(defs, 'hb-course', true, [[0, 'var(--sb-5)'], [0.12, 'var(--sb-4)'], [0.5, 'var(--sb-2)'], [1, 'var(--sb-0)']]);
  box(defs, 'hb-cyl', false, [[0, 'var(--sb-oil)'], [0.14, 'var(--sb-1)'], [0.28, 'var(--sb-3)'], [0.38, 'var(--sb-4)'],
                              [0.48, 'var(--sb-3)'], [0.78, 'var(--sb-1)'], [1, 'var(--sb-oil)']]);
  box(defs, 'hb-pier', true, [[0, 'var(--sb-2)'], [0.3, 'var(--sb-band)'], [0.5, 'var(--sb-2)'], [0.85, 'var(--sb-1)'], [1, 'var(--sb-0)']]);
  box(defs, 'hb-reed', false, [[0, 'var(--sb-4)'], [0.3, 'var(--sb-3)'], [0.7, 'var(--sb-1)'], [1, 'var(--sb-oil)']]);
  box(defs, 'hb-flute', false, [[0, 'var(--sb-oil)'], [0.4, 'var(--sb-1)'], [0.82, 'var(--sb-3)'], [1, 'var(--sb-2)']]);
  // The lip is a rounded bolection turned to the light: a hot line along
  // its crown, falling into shade as it rolls under toward the apron.
  lin(defs, 'hb-lip', 0, NEAR_IN, 0, NEAR_Y, [[0, 'var(--sb-1)'], [0.12, 'var(--sb-3)'], [0.3, 'var(--sb-5)'], [0.42, 'var(--sb-4)'],
                                             [0.66, 'var(--sb-2)'], [0.9, 'var(--sb-0)'], [1, 'var(--sb-oil)']]);
  // The lip is where the hands rest: the patina is rubbed back to the leaf
  // across the middle, fading toward the corners no one leans on.
  lin(defs, 'hb-lipwear', OUT_NEAR, 0, BOX_W - OUT_NEAR, 0, [[0, 'var(--lead-3)', 0], [0.2, 'var(--lead-4)', 0.3],
      [0.36, 'var(--lead-5)', 0.85], [0.5, 'var(--lead-3)', 1], [0.64, 'var(--lead-5)', 0.85], [0.8, 'var(--lead-4)', 0.3], [1, 'var(--lead-3)', 0]]);
  lin(defs, 'hb-rail-far', 0, FAR_Y, 0, FAR_IN, [[0, 'var(--sb-5)'], [0.3, 'var(--sb-4)'], [0.7, 'var(--sb-2)'], [1, 'var(--sb-0)']]);
  box(defs, 'hb-rail-side', false, [[0, 'var(--sb-4)'], [0.3, 'var(--sb-3)'], [0.75, 'var(--sb-1)'], [1, 'var(--sb-0)']]);
  lin(defs, 'hb-apron', 0, NEAR_Y, 0, APRON_B, [[0, 'var(--sb-oil)'], [0.12, 'var(--sb-1)'], [0.3, 'var(--sb-2)'],
                                               [0.46, 'var(--sb-band)'], [0.62, 'var(--sb-2)'], [1, 'var(--sb-0)']]);
  lin(defs, 'hb-rl', 0, NEAR_Y + 2, 0, APRON_B - 2, [[0, 'var(--sb-4)'], [0.5, 'var(--sb-3)'], [1, 'var(--sb-1)']]);
  // The slab's light: a veil by night that the room lifts toward the far
  // rail, the skylight by day; the frame's shade along the side rails; and
  // one reflection band in the polish.
  lin(defs, 'hb-slab-light', 0, FAR_IN, 0, NEAR_IN, [[0, 'var(--slab-far)'], [0.5, 'var(--slab-mid)'], [1, 'var(--slab-near)']]);
  lin(defs, 'hb-slab-side', IN_NEAR, 0, BOX_W - IN_NEAR, 0, [[0, 'var(--slab-edge)'], [0.1, 'var(--slab-edge)', 0], [0.9, 'var(--slab-edge)', 0], [1, 'var(--slab-edge)']]);
  lin(defs, 'hb-slab-band', 70, FAR_IN, 170, NEAR_IN, [[0, 'var(--slab-spec)', 0], [0.36, 'var(--slab-spec)', 0], [0.43, 'var(--slab-spec)', 1],
                                                     [0.47, 'var(--slab-spec)', 0.5], [0.55, 'var(--slab-spec)', 0], [1, 'var(--slab-spec)', 0]]);
  // Copper: rolled bar, bright on its lit arris, dark where it turns under.
  box(defs, 'hb-cu-v', true, [[0, 'var(--kc-5)'], [0.16, 'var(--kc-4)'], [0.5, 'var(--kc-3)'], [0.85, 'var(--kc-1)'], [1, 'var(--kc-0)']]);
  box(defs, 'hb-cu-leaf', true, [[0, 'var(--kc-5)'], [0.14, 'var(--kc-4)'], [0.32, 'var(--kc-3)'], [0.8, 'var(--kc-2)'], [1, 'var(--kc-1)']]);
  grad(defs, 'hb-cu-dome', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--kc-5)'], [0.45, 'var(--kc-3)'], [1, 'var(--kc-0)']]);
  grad(defs, 'hb-cu-nut', true, { cx: 0.35, cy: 0.25, r: 0.9 }, [[0, 'var(--kc-4)'], [0.5, 'var(--kc-2)'], [1, 'var(--kc-0)']]);
  grad(defs, 'hb-br-dome', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--bz-4)'], [0.45, 'var(--bz-2)'], [1, 'var(--bz-0)']]);
  // Brass, turned: the meter's bezel and the pilots' knurled rings.
  grad(defs, 'hb-bezel-ring', true, { gradientUnits: 'userSpaceOnUse', cx: CX, cy: MET_Y, r: MET_R + 6 },
       [[0.84, 'var(--bz-0)'], [0.87, 'var(--bz-2)'], [0.92, 'var(--bz-4)'], [0.96, 'var(--bz-1)'], [1, 'var(--bz-0)']]);
  lin(defs, 'hb-bezel-light', 0, MET_Y - MET_R - 6, 0, MET_Y, [[0, '#fff', 0.3], [0.6, '#fff', 0], [1, '#000', 0.3]]);
  box(defs, 'hb-bz-h', true, [[0, 'var(--bz-4)'], [0.4, 'var(--bz-2)'], [1, 'var(--bz-0)']]);
  grad(defs, 'hb-knurl', true, { cx: 0.42, cy: 0.36, r: 0.7 }, [[0, 'var(--bz-4)'], [0.55, 'var(--bz-2)'], [1, 'var(--bz-0)']]);
  grad(defs, 'hb-bezel-lip', true, { cx: 0.5, cy: 0.5, r: 0.5 }, [[0.7, 'var(--bz-0)'], [0.8, 'var(--bz-3)'], [0.9, 'var(--bz-4)'], [1, 'var(--bz-1)']]);
  grad(defs, 'hb-jewel-dark', true, { cx: 0.5, cy: 0.58, r: 0.55 }, [[0, 'var(--jw-off)'], [1, '#040201']]);
  grad(defs, 'hb-facet-dark', true, { cx: 0.4, cy: 0.35, r: 0.8 }, [[0, '#fff', 0.16], [1, '#fff', 0.03]]);
  // Red vulcanised fibre, the fuses' barrels, and their brass ferrules.
  box(defs, 'hb-fibre', true, [[0, 'var(--fb-2)'], [0.22, 'var(--fb-3)'], [0.4, 'var(--fb-2)'], [0.75, 'var(--fb-1)'], [1, 'var(--fb-0)']]);
  box(defs, 'hb-ferrule', true, [[0, 'var(--bz-2)'], [0.22, 'var(--bz-4)'], [0.45, 'var(--bz-2)'], [0.8, 'var(--bz-1)'], [1, 'var(--bz-0)']]);
  // Portoro plinth faces and treads.
  box(defs, 'hb-pface', true, [[0, '#000', 0], [1, '#000', 0.55]]);
  box(defs, 'hb-ptop', true, [[0, 'var(--pt-far)'], [1, 'var(--pt-near)']]);
  // The meter: an ivory enamel dial.
  grad(defs, 'hb-dial', true, { gradientUnits: 'userSpaceOnUse', cx: CX, cy: MET_Y, r: MET_R },
       [[0, 'var(--dial-1)'], [0.7, 'var(--dial-0)'], [1, 'var(--dial-2)']]);
  // Floor under the plinth, and soft occlusion where masses meet.
  grad(defs, 'hb-cshadow', true, { cx: 0.5, cy: 0.42, r: 0.5 }, [[0, 'var(--floor-shadow)'], [0.55, 'var(--floor-shadow)', 0.45], [1, 'var(--floor-shadow)', 0]]);
  box(defs, 'hb-ao-d', true, [[0, '#000', 0.6], [1, '#000', 0]]);
  pattern(defs, 'hb-patina', '/static/assets/tex/patina-statuary.webp', 272);
  pattern(defs, 'hb-patina-b', '/static/assets/tex/patina-statuary.webp', 272, 'translate(97 41) scale(1 -1)');
  pattern(defs, 'hb-patina-v', '/static/assets/tex/patina-statuary.webp', 272, 'translate(30 0) rotate(90)');
  pattern(defs, 'hb-bardiglio', '/static/assets/tex/stone-bardiglio.webp', 300,
          'translate(' + Math.round(rnd('board-slab', 1) * 300) + ' 0) scale(1 .6)');
  pattern(defs, 'hb-portoro', '/static/assets/tex/stone-portoro.webp', 190);
  castFilter(defs);
  return defs;
}

/* ------------------------------------------------------------ the pedestal */
function buildPedestal(q) {
  // The wool under it: a contact shadow, no return (wool does not reflect).
  var floor = add(q, 'g', null, 'hb-floor');
  add(floor, 'ellipse', { cx: CX + 4, cy: FLOOR + 1, rx: 150, ry: 10, fill: U('hb-cshadow') });
  add(floor, 'ellipse', { cx: CX + 2, cy: FLOOR - 0.5, rx: 122, ry: 3.4, style: F('#000') + ';opacity:.55' });

  var ped = add(q, 'g', null, 'hb-ped');
  // Portoro plinth, two courses, each with its tread seen from above.
  [[FLOOR - 12, FLOOR, 120, 5], [FLOOR - 24, FLOOR - 16, 98, 4]].forEach(function (c, i) {
    var y0 = c[0], y1 = c[1], hw = c[2], tread = c[3];
    var tb = y0 - tread, xl = recede(CX - hw, y0, tb), xr = recede(CX + hw, y0, tb);
    add(ped, 'path', { d: quad(CX - hw, y0, CX + hw, y0, xr, tb, xl, tb), fill: U('hb-portoro') });
    add(ped, 'path', { d: quad(CX - hw, y0, CX + hw, y0, xr, tb, xl, tb), fill: U('hb-ptop'), style: 'opacity:.8' });
    add(ped, 'path', { d: 'M' + n2(CX - hw) + ' ' + y0 + 'H' + (CX + hw), style: S('var(--pt-lip)', 0.8) });
    add(ped, 'path', { d: rect(CX - hw, y0, hw * 2, y1 - y0), fill: U('hb-portoro') });
    add(ped, 'path', { d: rect(CX - hw, y0, hw * 2, y1 - y0), fill: U('hb-pface') });
    if (i === 0) {
      // the bronze toe strip on the lower course, rubbed by shoes
      add(ped, 'path', { d: rect(CX - hw, y1 - 3, hw * 2, 3), fill: U('hb-course') });
      add(ped, 'path', { d: rect(CX - hw * 0.7, y1 - 2.6, hw * 1.4, 1), style: F('var(--lead-3)') + ';opacity:.5' });
    }
  });
  // The base block the pier stands on, with the wing's leaf on its toe.
  var bb0 = FLOOR - 36, bb1 = FLOOR - 25;
  add(ped, 'path', { d: rect(CX - 94, bb0, 188, bb1 - bb0), fill: U('hb-course') });
  add(ped, 'path', { d: rect(CX - 94, bb0, 188, bb1 - bb0), fill: U('hb-patina'), style: 'opacity:var(--sb-tex)' });
  add(ped, 'path', { d: rect(CX - 94, bb0 + 0.2, 188, 1), style: F('var(--lead-3)') + ';opacity:.6' });
  add(ped, 'path', { d: rect(CX - 94, bb1 - 2.4, 188, 1), style: F('var(--lead-5)') + ';opacity:.35' });
  // The pier: a reeded bronze body that widens as it rises to carry the
  // desk, the way the house's pulpits and ticket kiosks were cut.
  var p0 = APRON_B + 7, p1 = bb0, hwT = 106, hwB = 82;
  var pier = quad(CX - hwT, p0, CX + hwT, p0, CX + hwB, p1, CX - hwB, p1);
  add(ped, 'path', { d: pier, fill: U('hb-pier') });
  add(ped, 'path', { d: pier, fill: U('hb-patina-v'), style: 'opacity:var(--sb-tex)' });
  var nr = 15;
  for (var i = 0; i < nr; i++) {
    var u0 = (i + 0.14) / nr, u1 = (i + 0.86) / nr;
    var yt = p0 + 17, yb = p1 - 5;
    var wt = hwT - (hwT - hwB) * (yt - p0) / (p1 - p0), wb = hwT - (hwT - hwB) * (yb - p0) / (p1 - p0);
    var xt0 = CX - wt + 2 * wt * u0, xt1 = CX - wt + 2 * wt * u1, xb0 = CX - wb + 2 * wb * u0, xb1 = CX - wb + 2 * wb * u1;
    var rd = 'M' + n2(xt0) + ' ' + (yt + 2) + 'Q' + n2((xt0 + xt1) / 2) + ' ' + (yt - 1) + ' ' + n2(xt1) + ' ' + (yt + 2) +
             'L' + n2(xb1) + ' ' + yb + 'L' + n2(xb0) + ' ' + yb + 'Z';
    // each reed is a half round: lit on the side toward the room's lamps,
    // its shadow on the pier to the right
    add(ped, 'path', { d: rd, transform: 'translate(1.1 0)', style: F('var(--sb-oil)') + ';opacity:.45' });
    add(ped, 'path', { d: rd, fill: U('hb-reed') });
  }
  // speed bands under the capital: two fillets in the wing's leaf
  [p0 + 5, p0 + 10].forEach(function (y, k) {
    var w = hwT - (hwT - hwB) * (y - p0) / (p1 - p0);
    add(ped, 'path', { d: rect(CX - w, y, 2 * w, 2.4), fill: U('hb-course') });
    add(ped, 'path', { d: rect(CX - w, y + 0.3, 2 * w, 0.9), style: F('var(--lead-3)') + ';opacity:' + (0.8 - k * 0.2) });
  });
  add(ped, 'path', { d: rect(CX - hwT, p0, 2 * hwT, 4), fill: U('hb-ao-d') });
  // the pier's two arrises, the left one catching the light
  add(ped, 'path', { d: 'M' + (CX - hwT + 0.6) + ' ' + p0 + 'L' + (CX - hwB + 0.6) + ' ' + p1, style: S('var(--sb-5)', 0.9, 'opacity:.55') });
  add(ped, 'path', { d: 'M' + (CX + hwT - 0.6) + ' ' + p0 + 'L' + (CX + hwB - 0.6) + ' ' + p1, style: S('var(--sb-oil)', 1.2, 'opacity:.8') });
  // a cast fan at the head of the reeding, on the pier's axis
  var cf = add(ped, 'g', { filter: U('hb-cast') });
  add(cf, 'path', { d: fanPath(CX, p0 + 30, 15, 9), fill: U('hb-rl') });
  // the oil where the pier meets its base
  add(ped, 'path', { d: rect(CX - hwB, p1 - 3, 2 * hwB, 3), style: F('var(--sb-oil)') + ';opacity:.55' });

  // The capital: one course under the apron, shading the pier's head.
  add(ped, 'path', { d: rect(CX - 178, APRON_B, 356, 7), fill: U('hb-course') });
  add(ped, 'path', { d: rect(CX - 178, APRON_B, 356, 7), fill: U('hb-patina-b'), style: 'opacity:var(--sb-tex)' });
  add(ped, 'path', { d: 'M' + (CX - 178) + ' ' + (APRON_B + 0.4) + 'H' + (CX + 178), style: S('var(--sb-5)', 0.6, 'opacity:.6') });
  add(ped, 'path', { d: rect(CX - 170, APRON_B + 7, 340, 3.4), fill: U('hb-ao-d') });
}

/* ------------------------------------------------------------ the desk */
function buildDesk(q) {
  var g = add(q, 'g', null, 'hb-desk');
  // The apron: the desk's front, a band of cast relief between two fillets.
  var aw = BOX_W - 2 * OUT_NEAR;
  add(g, 'path', { d: rect(OUT_NEAR, NEAR_Y, aw, APRON_B - NEAR_Y), fill: U('hb-apron') });
  add(g, 'path', { d: rect(OUT_NEAR, NEAR_Y, aw, APRON_B - NEAR_Y), fill: U('hb-patina'), style: 'opacity:var(--sb-tex)' });
  var fr = add(g, 'g', { filter: U('hb-cast') });
  var dFan = '', dChev = '';
  var n = 15, pitch = (aw - 40) / (n - 1);
  for (var i = 0; i < n; i++) {
    var x = OUT_NEAR + 20 + i * pitch;
    if (i % 2 === 0) dFan += fanPath(x, APRON_B - 3, 9.4, 7);
    else dChev += chevronPath(x, APRON_B - 3.4, 12, 9.6);
  }
  add(fr, 'path', { d: dFan, fill: U('hb-rl') });
  add(fr, 'path', { d: dChev, fill: U('hb-rl') });
  add(g, 'path', { d: rect(OUT_NEAR, APRON_B - 1.4, aw, 1.4), style: F('var(--sb-oil)') + ';opacity:.9' });
  add(g, 'path', { d: rect(OUT_NEAR, NEAR_Y, aw, 3.4), fill: U('hb-ao-d') });
  // The apron's two ends turn away from the room.
  add(g, 'path', { d: rect(OUT_NEAR, NEAR_Y, 6, APRON_B - NEAR_Y), style: F('#000') + ';opacity:.3' });
  add(g, 'path', { d: rect(BOX_W - OUT_NEAR - 6, NEAR_Y, 6, APRON_B - NEAR_Y), style: F('#000') + ';opacity:.3' });

  // The slab: Bardiglio, polished, under the room's light.
  var field = fieldPath();
  add(g, 'path', { d: field, fill: U('hb-bardiglio') });
  add(g, 'path', { d: field, fill: U('hb-slab-light') });
  add(g, 'path', { d: field, fill: U('hb-slab-side') });
  add(g, 'path', { d: field, fill: U('hb-slab-band') });
  // a brass stringing line let into the stone, inset from the frame
  var ins = 6;
  add(g, 'path', { d: quad(innerX(FAR_IN + ins) + ins, FAR_IN + ins, mirror(innerX(FAR_IN + ins) + ins), FAR_IN + ins,
                           mirror(innerX(NEAR_IN - ins) + ins), NEAR_IN - ins, innerX(NEAR_IN - ins) + ins, NEAR_IN - ins),
                   style: S('var(--bz-2)', 0.9, 'opacity:.75') });
  add(g, 'path', { d: quad(innerX(FAR_IN + ins) + ins + 0.6, FAR_IN + ins + 0.7, mirror(innerX(FAR_IN + ins) + ins) - 0.6, FAR_IN + ins + 0.7,
                           mirror(innerX(NEAR_IN - ins) + ins) - 0.6, NEAR_IN - ins + 0.7, innerX(NEAR_IN - ins) + ins + 0.6, NEAR_IN - ins + 0.7),
                   style: S('#000', 0.5, 'opacity:.35') });
  // the far rail's shadow on the stone
  add(g, 'path', { d: quad(innerX(FAR_IN), FAR_IN, mirror(innerX(FAR_IN)), FAR_IN, mirror(innerX(FAR_IN + 6)), FAR_IN + 6, innerX(FAR_IN + 6), FAR_IN + 6), fill: U('hb-ao-d') });

  // The frame. Side rails first, each a sloped moulding lit on its left.
  [0, 1].forEach(function (s) {
    var m = s ? mirror : function (x) { return x; };
    var d = quad(m(outerX(FAR_Y)), FAR_Y, m(innerX(FAR_IN)), FAR_IN, m(IN_NEAR), NEAR_IN, m(OUT_NEAR), NEAR_Y);
    add(g, 'path', { d: d, fill: U('hb-rail-side') });
    add(g, 'path', { d: d, fill: U('hb-patina-b'), style: 'opacity:var(--sb-tex)' });
    add(g, 'path', { d: 'M' + n2(m(outerX(FAR_Y + 2) + 0.8)) + ' ' + (FAR_Y + 2) + 'L' + n2(m(OUT_NEAR + 0.8)) + ' ' + (NEAR_Y - 1),
                     style: S('var(--sb-5)', 0.8, 'opacity:' + (s ? 0.25 : 0.7)) });
    add(g, 'path', { d: 'M' + n2(m(innerX(FAR_IN))) + ' ' + FAR_IN + 'L' + n2(m(IN_NEAR)) + ' ' + NEAR_IN,
                     style: S('var(--sb-oil)', 1, 'opacity:.8') });
  });
  // Far rail: thin, because it is seen nearly edge-on, and lit along its top.
  var far = quad(outerX(FAR_Y), FAR_Y, mirror(outerX(FAR_Y)), FAR_Y, mirror(innerX(FAR_IN)), FAR_IN, innerX(FAR_IN), FAR_IN);
  add(g, 'path', { d: far, fill: U('hb-rail-far') });
  add(g, 'path', { d: far, fill: U('hb-patina'), style: 'opacity:var(--sb-tex)' });
  add(g, 'path', { d: 'M' + n2(outerX(FAR_Y)) + ' ' + (FAR_Y + 0.5) + 'H' + n2(mirror(outerX(FAR_Y))), style: S('var(--lead-3)', 1, 'opacity:.75') });
  // Near rail: the lip the hands rest on.
  var lip = quad(IN_NEAR, NEAR_IN, mirror(IN_NEAR), NEAR_IN, mirror(OUT_NEAR), NEAR_Y, OUT_NEAR, NEAR_Y);
  add(g, 'path', { d: lip, fill: U('hb-lip') });
  add(g, 'path', { d: lip, fill: U('hb-patina'), style: 'opacity:var(--sb-tex)' });
  add(g, 'path', { d: rect(OUT_NEAR + 6, NEAR_IN + 3.4, BOX_W - 2 * OUT_NEAR - 12, 2.6), fill: U('hb-lipwear') });
  add(g, 'path', { d: 'M' + IN_NEAR + ' ' + (NEAR_IN + 0.3) + 'H' + mirror(IN_NEAR), style: S('var(--sb-oil)', 0.9) });
  // Corner bosses: square, stepped, each cast with a small fan.
  [[outerX(FAR_Y) - 3, FAR_Y - 3, 14, 10], [OUT_NEAR - 2, NEAR_IN - 2, 17, 16]].forEach(function (c) {
    [0, 1].forEach(function (s) {
      var x = s ? mirror(c[0]) - c[2] : c[0], y = c[1], w = c[2], h = c[3];
      add(g, 'path', { d: rect(x + 0.8, y + 1, w, h), style: F('var(--sb-oil)') + ';opacity:.7' });
      add(g, 'path', { d: rect(x, y, w, h), fill: U('hb-course') });
      add(g, 'path', { d: rect(x + 2, y + 2, w - 4, h - 4), fill: U('hb-face') });
      add(g, 'path', { d: 'M' + x + ' ' + (y + h) + 'V' + y + 'H' + (x + w), style: S('var(--lead-5)', 0.8, 'opacity:.75') });
      var fg = add(g, 'g', { filter: U('hb-cast') });
      add(fg, 'path', { d: fanPath(x + w / 2, y + h - 2.6, Math.min(w, h) * 0.34, 5), fill: U('hb-rl') });
    });
  });
}

/* ------------------------------------------------------------ the crest */
function buildCrest(q) {
  var g = add(q, 'g', null, 'hb-crest');
  // The shoulders the dial stands on: a ziggurat in three steps.
  [[FAR_Y + 2, FAR_Y - 10, 78], [FAR_Y - 10, FAR_Y - 20, 64], [FAR_Y - 20, FAR_Y - 30, 52]].forEach(function (s, i) {
    var d = rect(CX - s[2], s[1], s[2] * 2, s[0] - s[1]);
    add(g, 'path', { d: d, transform: 'translate(.9 1.2)', style: F('var(--sb-oil)') + ';opacity:.6' });
    add(g, 'path', { d: d, fill: U('hb-course') });
    add(g, 'path', { d: d, fill: U('hb-patina-b'), style: 'opacity:var(--sb-tex)' });
    add(g, 'path', { d: 'M' + (CX - s[2]) + ' ' + (s[1] + 0.45) + 'H' + (CX + s[2]), style: S('var(--lead-3)', 0.9, 'opacity:' + (0.5 + i * 0.15)) });
  });
  // the finial: a small stepped cap
  add(g, 'path', { d: rect(CX - 14, FAR_Y - 46, 28, 8), fill: U('hb-course') });
  add(g, 'path', { d: rect(CX - 8, FAR_Y - 52, 16, 6), fill: U('hb-course') });
  add(g, 'path', { d: 'M' + (CX - 14) + ' ' + (FAR_Y - 45.6) + 'H' + (CX + 14) + 'M' + (CX - 8) + ' ' + (FAR_Y - 51.6) + 'H' + (CX + 8),
                   style: S('var(--lead-3)', 0.9, 'opacity:.85') });
  // The bezel: a turned brass ring round a semicircular dial.
  var R0 = MET_R, R1 = MET_R + 6;
  var ring = 'M' + (CX - R1) + ' ' + MET_Y + 'A' + R1 + ' ' + R1 + ' 0 0 1 ' + (CX + R1) + ' ' + MET_Y +
             'H' + (CX + R0) + 'A' + R0 + ' ' + R0 + ' 0 0 0 ' + (CX - R0) + ' ' + MET_Y + 'Z';
  add(g, 'path', { d: ring, transform: 'translate(.9 1.2)', style: F('var(--sb-oil)') + ';opacity:.8' });
  add(g, 'path', { d: ring, fill: U('hb-bezel-ring') });
  add(g, 'path', { d: ring, fill: U('hb-bezel-light') });
  // the dial's foot: a brass sill the fan springs from
  add(g, 'path', { d: rect(CX - R1 - 2, MET_Y, 2 * R1 + 4, 4.5), fill: U('hb-bz-h') });
  // The dial: ivory enamel, a scale each side of a centre zero, the Salon's
  // arc in gold leaf and the Bureau's in nickel.
  var dial = 'M' + (CX - R0) + ' ' + MET_Y + 'A' + R0 + ' ' + R0 + ' 0 0 1 ' + (CX + R0) + ' ' + MET_Y + 'Z';
  add(g, 'path', { d: dial, fill: U('hb-dial') });
  function P(r, deg) { var a = deg * DEG; return n2(CX + r * Math.sin(a)) + ' ' + n2(MET_Y - 2 - r * Math.cos(a)); }
  function arc(r0, r1, a0, a1) {
    return 'M' + P(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + P(r1, a1) + 'L' + P(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + P(r0, a0) + 'Z';
  }
  add(g, 'path', { d: arc(22, 26.5, -74, -9), style: F('var(--au-3)') });
  add(g, 'path', { d: arc(22, 26.5, -74, -9), style: S('var(--au-1)', 0.5) });
  add(g, 'path', { d: arc(22, 26.5, 9, 74), style: F('var(--ag-2)') });
  add(g, 'path', { d: arc(22, 26.5, 9, 74), style: S('var(--ag-1)', 0.5) });
  var ticks = '', major = '';
  for (var t = -75; t <= 75; t += 7.5) {
    if (t === 0) continue;
    if (Math.abs(t) % 15 === 0) major += 'M' + P(27.5, t) + 'L' + P(34.5, t);
    else ticks += 'M' + P(27.5, t) + 'L' + P(31.5, t);
  }
  add(g, 'path', { d: 'M' + P(21, 0) + 'L' + P(35, 0), style: S('var(--dial-ink)', 1.4) });
  add(g, 'path', { d: major, style: S('var(--dial-ink)', 0.95) });
  add(g, 'path', { d: ticks, style: S('var(--dial-ink)', 0.5) });
  add(g, 'path', { d: 'M' + P(27.5, -75) + 'A27.5 27.5 0 0 1 ' + P(27.5, 75), style: S('var(--dial-ink)', 0.45) });
  stamp(g, 'AMPERES', CX, MET_Y - 16, 2.7, S('var(--dial-ink)', 0.32, 'stroke-linecap:round;stroke-linejoin:round;opacity:.8'));
  // the fan's rays behind the scale: the crest is a sunrise
  var rays = '';
  for (var r = -80; r <= 80; r += 10) rays += 'M' + P(7, r) + 'L' + P(20.5, r);
  add(g, 'path', { d: rays, style: S('var(--dial-ink)', 0.35, 'opacity:.28') });
  [-62, 62].forEach(function (a, i) {
    var aa = a * DEG, rr = (R0 + R1) / 2;
    screw(g, CX + rr * Math.sin(aa), MET_Y - rr * Math.cos(aa), 1.4, 'board-meter-screw-' + i);
  });
}

/* ------------------------------------------------------------ switchgear */
/* A jaw, seen from the front and a little above: a copper base bolted to
   the marble, the far spring leaf standing behind the blade's path (drawn
   here) and the near one in front of it (drawn on the front layer). */
var JW = 9;            // half the leaves' width
function jawBack(g, x, y, id) {
  add(g, 'path', { d: rect(x - 14, y - 1, 28, 11), transform: 'translate(1 1.4)', style: F('var(--sb-oil)') + ';opacity:.6' });
  add(g, 'path', { d: rect(x - 14, y - 1, 28, 11), fill: U('hb-cu-v') });
  add(g, 'path', { d: 'M' + (x - 14) + ' ' + (y - 0.6) + 'H' + (x + 14), style: S('var(--kc-5)', 0.6, 'opacity:.85') });
  screw(g, x - 10.5, y + 5, 1.7, id + '-s0', 'cu');
  screw(g, x + 10.5, y + 5, 1.7, id + '-s1', 'cu');
  // the far leaf: a copper plate standing up, its mouth flared
  add(g, 'path', { d: 'M' + (x - JW) + ' ' + (y - 1) + 'V' + (y - 9) + 'L' + (x - JW - 2) + ' ' + (y - 12) + 'H' + (x + JW + 2) + 'L' + (x + JW) + ' ' + (y - 9) + 'V' + (y - 1) + 'Z', fill: U('hb-cu-leaf') });
  add(g, 'path', { d: 'M' + (x - JW - 2) + ' ' + (y - 11.7) + 'H' + (x + JW + 2), style: S('var(--kc-5)', 0.9) });
  // the slot between the leaves, dark where no blade sits
  add(g, 'path', { d: rect(x - JW, y - 3.2, JW * 2, 3.2), style: F('var(--sb-oil)') + ';opacity:.9' });
}
function jawFront(g, x, y) {
  var d = 'M' + (x - JW) + ' ' + (y + 5.5) + 'V' + (y - 5.4) + 'L' + (x - JW - 2.2) + ' ' + (y - 8.6) + 'H' + (x + JW + 2.2) + 'L' + (x + JW) + ' ' + (y - 5.4) + 'V' + (y + 5.5) + 'Z';
  add(g, 'path', { d: d, transform: 'translate(.9 1.2)', style: F('var(--sb-oil)') + ';opacity:.55' });
  add(g, 'path', { d: d, fill: U('hb-cu-leaf') });
  add(g, 'path', { d: 'M' + (x - JW - 2.2) + ' ' + (y - 8.3) + 'H' + (x + JW + 2.2), style: S('var(--kc-5)', 1) });
  // the bolt that holds the leaves' spring, through both leaves
  add(g, 'circle', { cx: x, cy: y + 1, r: 2, fill: U('hb-cu-dome') });
}
function hingeBack(g, x, y, id) {
  add(g, 'path', { d: rect(x - 15, y - 1, 30, 12), transform: 'translate(1 1.4)', style: F('var(--sb-oil)') + ';opacity:.6' });
  add(g, 'path', { d: rect(x - 15, y - 1, 30, 12), fill: U('hb-cu-v') });
  screw(g, x - 11.5, y + 5.2, 1.7, id + '-s0', 'cu');
  screw(g, x + 11.5, y + 5.2, 1.7, id + '-s1', 'cu');
  add(g, 'path', { d: 'M' + (x - 7) + ' ' + (y - 1) + 'V' + (y - 11) + 'A7 7 0 0 1 ' + (x + 7) + ' ' + (y - 11) + 'V' + (y - 1) + 'Z', fill: U('hb-cu-leaf') });
}
function hingeFront(g, x, y) {
  var d = 'M' + (x - 7.5) + ' ' + (y + 6) + 'V' + (y - 5) + 'A7.5 7.5 0 0 1 ' + (x + 7.5) + ' ' + (y - 5) + 'V' + (y + 6) + 'Z';
  add(g, 'path', { d: d, transform: 'translate(.9 1.2)', style: F('var(--sb-oil)') + ';opacity:.55' });
  add(g, 'path', { d: d, fill: U('hb-cu-leaf') });
  // the pin's nut, the pivot the whole throw turns on
  nut(g, x, y - 4.6, 4.2);
}
/* A bullseye jewel's facets: a ring of triangles round a flat table. */
function facets(g, cx, cy, r, gradId) {
  var d = '', n = 10;
  for (var i = 0; i < n; i += 2) {
    var a0 = i * 2 * Math.PI / n, a1 = (i + 1) * 2 * Math.PI / n, am = (i + 0.5) * 2 * Math.PI / n;
    d += 'M' + n2(cx + r * 0.45 * Math.cos(am)) + ' ' + n2(cy + r * 0.45 * Math.sin(am)) +
         'L' + n2(cx + r * 0.96 * Math.cos(a0)) + ' ' + n2(cy + r * 0.96 * Math.sin(a0)) +
         'L' + n2(cx + r * 0.96 * Math.cos(a1)) + ' ' + n2(cy + r * 0.96 * Math.sin(a1)) + 'Z';
  }
  add(g, 'path', { d: d, fill: U(gradId) });
  add(g, 'circle', { cx: n2(cx), cy: n2(cy), r: n2(r * 0.42), style: S('#fff', 0.35, 'opacity:.25') });
  add(g, 'ellipse', { cx: n2(cx - r * 0.34), cy: n2(cy - r * 0.4), rx: n2(r * 0.26), ry: n2(r * 0.16), style: F('#fff') + ';opacity:.55',
                      transform: 'rotate(-30 ' + n2(cx - r * 0.34) + ' ' + n2(cy - r * 0.4) + ')' });
}
function buildSwitchBack(q) {
  var g = add(q, 'g', null, 'hb-gear');
  ['salon', 'bureau'].forEach(function (side, s) {
    var sg = add(g, 'g', { 'data-side': side }, 'hb-side');
    var jx = s ? CX + JAW_R : CX - JAW_R;
    // the jaws, both poles
    jawBack(sg, jx, POLE_FAR, 'board-jaw-' + side + '-f');
    jawBack(sg, jx, POLE_NEAR, 'board-jaw-' + side + '-n');
    // the pilot lamp: a faceted jewel in a knurled brass bezel
    var lx = s ? CX + JEWEL_DX : CX - JEWEL_DX;
    add(sg, 'circle', { cx: lx + 1.2, cy: JEWEL_Y + 1.6, r: 13.5, style: F('var(--sb-oil)') + ';opacity:.7' });
    add(sg, 'circle', { cx: lx, cy: JEWEL_Y, r: 13.5, fill: U('hb-knurl') });
    var kn = '';
    for (var k = 0; k < 40; k++) {
      var a = k * 9 * DEG;
      kn += 'M' + n2(lx + 11.8 * Math.cos(a)) + ' ' + n2(JEWEL_Y + 11.8 * Math.sin(a)) + 'L' + n2(lx + 13.5 * Math.cos(a)) + ' ' + n2(JEWEL_Y + 13.5 * Math.sin(a));
    }
    add(sg, 'path', { d: kn, style: S('var(--bz-0)', 0.7, 'opacity:.55') });
    add(sg, 'circle', { cx: lx, cy: JEWEL_Y, r: 11, fill: U('hb-bezel-lip') });
    add(sg, 'circle', { cx: lx, cy: JEWEL_Y, r: 8.8, fill: U('hb-jewel-dark') });
    facets(sg, lx, JEWEL_Y, 8.8, 'hb-facet-dark');
  });
  // The hinges, both poles, and the maker's plate under them.
  hingeBack(g, CX, POLE_FAR, 'board-hinge-f');
  hingeBack(g, CX, POLE_NEAR, 'board-hinge-n');
  var mp = add(g, 'g', null, 'hb-maker');
  add(mp, 'ellipse', { cx: CX + 0.8, cy: 156.1, rx: 21, ry: 7.4, style: F('var(--sb-oil)') + ';opacity:.55' });
  add(mp, 'ellipse', { cx: CX, cy: 155, rx: 21, ry: 7.4, fill: U('hb-bz-h') });
  add(mp, 'ellipse', { cx: CX, cy: 155, rx: 18.6, ry: 5.6, style: S('var(--bz-ink)', 0.4, 'opacity:.6') });
  stamp(mp, 'ATRIUM', CX, 150.6, 3.4, S('var(--bz-ink)', 0.42, 'stroke-linecap:round;stroke-linejoin:round;opacity:.85'));
  stamp(mp, '250 V', CX, 155.6, 2.4, S('var(--bz-ink)', 0.36, 'stroke-linecap:round;stroke-linejoin:round;opacity:.7'));
}

/* The focus ring: the gates' marquee at the board's scale, a stepped
   outline round the crest, the slab and the pedestal, clear of every
   plate. It is laid first, so everything stands in front of it. */
function buildFocus(q) {
  var y0 = FAR_Y - 58, xl = 8, xr = BOX_W - 8;
  var d = 'M' + (CX - 22) + ' ' + y0 + 'H' + (CX + 22) + 'V' + (FAR_Y - 38) + 'H' + (CX + 88) + 'V' + (FAR_Y - 10) +
          'H' + xr + 'V' + (APRON_B + 16) + 'H' + (CX + 114) + 'V' + (FLOOR - 40) + 'H' + (CX + 128) + 'V' + (FLOOR + 4) +
          'H' + (CX - 128) + 'V' + (FLOOR - 40) + 'H' + (CX - 114) + 'V' + (APRON_B + 16) + 'H' + xl + 'V' + (FAR_Y - 10) +
          'H' + (CX - 88) + 'V' + (FAR_Y - 38) + 'H' + (CX - 22) + 'Z';
  var fg = add(q, 'g', null, 'hb-focus-g hb-noptr');
  add(fg, 'path', { d: d }, 'hb-focus-bed');
  add(fg, 'path', { d: d }, 'hb-focus');
  add(fg, 'path', { d: d }, 'hb-focus-bulbs');
}

function buildBoard(q) {
  q.setAttribute('viewBox', '0 0 ' + BOX_W + ' ' + BOX_H);
  buildDefs(q);
  buildFocus(q);
  buildPedestal(q);
  buildDesk(q);
  buildCrest(q);
  buildSwitchBack(q);
}

/* ------------------------------------------------------------ moving parts */
function layer(fx, cls) {
  var s = E('svg', { viewBox: '0 0 ' + BOX_W + ' ' + BOX_H, 'aria-hidden': 'true', focusable: 'false' }, cls);
  fx.appendChild(s);
  return s;
}
/* One blade: a copper bar drawn standing on its hinge, pointing up. At rest
   it is turned a quarter each way and flattened by K, so it lies along the
   marble; each of its long arrises is the top one on one side, so each
   carries its own light, crossfaded by --sw. */
function bladeLayer(fx, y, cls, id) {
  var s = layer(fx, 'sw-blade sw-drive ' + cls);
  var d = add(s, 'defs');
  box(d, id + '-cu', false, [[0, 'var(--kc-1)'], [0.18, 'var(--kc-3)'], [0.5, 'var(--kc-4)'], [0.82, 'var(--kc-3)'], [1, 'var(--kc-1)']]);
  var w = 16, top = y - BLADE_L - 5;
  var body = 'M' + (CX - w / 2) + ' ' + (y + 5) + 'V' + top + 'H' + (CX + w / 2) + 'V' + (y + 5) + 'A' + (w / 2) + ' ' + (w / 2) + ' 0 0 1 ' + (CX - w / 2) + ' ' + (y + 5) + 'Z';
  add(s, 'path', { d: body, fill: U(id + '-cu') });
  // the two arrises, one lit at each rest, and the one away from the light
  add(s, 'path', { d: rect(CX - w / 2, top, 2.8, y - top), style: F('var(--kc-5)') }, 'sw-lit-l');
  add(s, 'path', { d: rect(CX + w / 2 - 2.8, top, 2.8, y - top), style: F('var(--kc-5)') }, 'sw-lit-r');
  add(s, 'path', { d: rect(CX + w / 2 - 2, top, 2, y - top), style: F('var(--kc-0)') }, 'sw-lit-l');
  add(s, 'path', { d: rect(CX - w / 2, top, 2, y - top), style: F('var(--kc-0)') }, 'sw-lit-r');
  // where the blade has run in its jaws a thousand times: a bright band
  add(s, 'path', { d: rect(CX - w / 2, y - JAW_R - 9, w, 18), style: F('var(--kc-5)') + ';opacity:.26' });
  // the pivot eye
  add(s, 'circle', { cx: CX, cy: y + 1.5, r: 2.8, style: F('var(--kc-0)') });
}
function buildFx(fx) {
  // Night: each lit pilot throws a warm pool on its side of the slab.
  ['salon', 'bureau'].forEach(function (side, s) {
    var p = layer(fx, 'sw-pool sw-drive sw-pool-' + side);
    var d = add(p, 'defs');
    var lx = s ? CX + JEWEL_DX : CX - JEWEL_DX, ly = JEWEL_Y + 14;
    grad(d, 'sw-pool-g-' + side, true, { gradientUnits: 'userSpaceOnUse', cx: lx, cy: ly, r: 130,
         gradientTransform: 'translate(' + lx + ' ' + ly + ') scale(1 .6) translate(' + -lx + ' ' + -ly + ')' },
         [[0, 'var(--pool-' + side + ')'], [0.35, 'var(--pool-' + side + ')', 0.45], [1, 'var(--pool-' + side + ')', 0]]);
    add(p, 'path', { d: fieldPath(), fill: U('sw-pool-g-' + side) });
  });
  // The shadow of the lying blades and handle on the marble, one per rest,
  // gone as soon as the blade lifts.
  ['salon', 'bureau'].forEach(function (side, s) {
    var p = layer(fx, 'sw-rest sw-drive sw-rest-' + side);
    var sg = s ? 1 : -1, g = add(p, 'g', { transform: 'translate(2.4 5)' });
    [POLE_FAR, POLE_NEAR].forEach(function (y) {
      add(g, 'path', { d: rect(Math.min(CX, CX + sg * (BLADE_L + 2)), y - 2.4, BLADE_L + 2, 6.6) });
    });
    add(g, 'path', { d: rect(CX + sg * BLADE_L - 5, POLE_FAR - 6, 10, POLE_NEAR - POLE_FAR + 12) });
    var hx0 = CX + sg * BLADE_L, hx1 = CX + sg * (BLADE_L + GRIP_L);
    add(g, 'ellipse', { cx: n2((hx0 + hx1) / 2 + sg * 6), cy: HINGE_Y + 1, rx: n2(GRIP_L / 2 - 2), ry: 10 });
  });
  // The meter's lamp (night) and its needle, under the glass.
  var dialD = 'M' + (CX - MET_R) + ' ' + MET_Y + 'A' + MET_R + ' ' + MET_R + ' 0 0 1 ' + (CX + MET_R) + ' ' + MET_Y + 'Z';
  var ml = layer(fx, 'sw-dial-lamp');
  grad(add(ml, 'defs'), 'sw-dial-lamp-g', true, { gradientUnits: 'userSpaceOnUse', cx: CX, cy: MET_Y, r: MET_R },
       [[0, 'var(--dial-lamp)'], [0.75, 'var(--dial-lamp)', 0.55], [1, 'var(--dial-lamp)', 0.15]]);
  add(ml, 'path', { d: dialD, fill: U('sw-dial-lamp-g') });
  var nd = layer(fx, 'sw-needle sw-drive sw-raw');
  grad(add(nd, 'defs'), 'sw-cap', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--bz-4)'], [0.5, 'var(--bz-2)'], [1, 'var(--bz-0)']]);
  var py = MET_Y - 2;
  var needle = 'M' + (CX - 1.1) + ' ' + py + 'L' + (CX - 0.4) + ' ' + (py - 33) + 'L' + CX + ' ' + (py - 35) + 'L' + (CX + 0.4) + ' ' + (py - 33) + 'L' + (CX + 1.1) + ' ' + py + 'Z';
  add(nd, 'path', { d: needle, transform: 'translate(.9 1.2)', style: F('#000') + ';opacity:.28' });
  add(nd, 'path', { d: needle, style: F('var(--needle-ink)') });
  add(nd, 'path', { d: 'M' + (CX - 2) + ' ' + (py - 23) + 'L' + CX + ' ' + (py - 29.5) + 'L' + (CX + 2) + ' ' + (py - 23) + 'Z', style: F('var(--needle-ink)') });
  add(nd, 'circle', { cx: CX, cy: py + 6, r: 2.8, style: F('var(--needle-ink)') });
  add(nd, 'circle', { cx: CX, cy: py, r: 3.6, fill: U('sw-cap') });
  // the glass over the dial: one reflection band
  var gl = layer(fx, 'sw-glass');
  lin(add(gl, 'defs'), 'sw-glass-g', CX - 30, MET_Y - 38, CX + 10, MET_Y, [[0, '#fff', 0], [0.34, '#fff', 0], [0.42, 'var(--glass-band)'], [0.5, '#fff', 0.05], [0.58, '#fff', 0], [1, '#fff', 0]]);
  add(gl, 'path', { d: dialD, fill: U('sw-glass-g') });
  add(gl, 'path', { d: 'M' + (CX - MET_R + 1.5) + ' ' + MET_Y + 'A' + (MET_R - 1.5) + ' ' + (MET_R - 1.5) + ' 0 0 1 ' + (CX + MET_R - 1.5) + ' ' + MET_Y,
                    style: S('#000', 2, 'opacity:.25') });

  // The pilots, lit: each its own layer, faded by opacity.
  ['salon', 'bureau'].forEach(function (side, s) {
    var p = layer(fx, 'sw-lit sw-drive sw-lit-' + side);
    var d = add(p, 'defs');
    var lx = s ? CX + JEWEL_DX : CX - JEWEL_DX;
    grad(d, 'sw-jw-' + side, true, { cx: 0.5, cy: 0.55, r: 0.55 }, [[0, 'var(--jw-core-' + side + ')'], [0.35, 'var(--jw-mid-' + side + ')'], [1, 'var(--jw-rim-' + side + ')']]);
    grad(d, 'sw-bloom-' + side, true, { cx: 0.5, cy: 0.5, r: 0.5 }, [[0, 'var(--jw-bloom-' + side + ')'], [0.4, 'var(--jw-bloom-' + side + ')', 0.35], [1, 'var(--jw-bloom-' + side + ')', 0]]);
    grad(d, 'sw-facet-' + side, true, { cx: 0.4, cy: 0.35, r: 0.8 }, [[0, '#fff', 0.5], [1, '#fff', 0.08]]);
    // its reflection in the polished marble, drawn down the slope
    grad(d, 'sw-refl-' + side, true, { cx: 0.5, cy: 0.5, r: 0.5 }, [[0, 'var(--jw-refl-' + side + ')'], [0.5, 'var(--jw-refl-' + side + ')', 0.35], [1, 'var(--jw-refl-' + side + ')', 0]]);
    add(p, 'ellipse', { cx: lx, cy: JEWEL_Y + 24, rx: 9, ry: 14, fill: U('sw-refl-' + side) });
    add(p, 'circle', { cx: lx, cy: JEWEL_Y, r: 36, fill: U('sw-bloom-' + side) }, 'sw-bloom');
    add(p, 'circle', { cx: lx, cy: JEWEL_Y, r: 8.8, fill: U('sw-jw-' + side) });
    facets(p, lx, JEWEL_Y, 8.8, 'sw-facet-' + side);
  });

  // The blades and, over each, its pole's near leaves and hinge cheek.
  bladeLayer(fx, POLE_FAR, 'sw-blade-far', 'sw-bf');
  var ff = layer(fx, 'sw-front sw-front-far');
  ['salon', 'bureau'].forEach(function (side, s) {
    jawFront(add(ff, 'g', { 'data-side': side }, 'hb-side'), s ? CX + JAW_R : CX - JAW_R, POLE_FAR);
  });
  hingeFront(ff, CX, POLE_FAR);
  bladeLayer(fx, POLE_NEAR, 'sw-blade-near', 'sw-bn');
  var fn = layer(fx, 'sw-front sw-front-near');
  ['salon', 'bureau'].forEach(function (side, s) {
    jawFront(add(fn, 'g', { 'data-side': side }, 'hb-side'), s ? CX + JAW_R : CX - JAW_R, POLE_NEAR);
  });
  hingeFront(fn, CX, POLE_NEAR);

  // The crossbar: ebonite, riveted to both blade tips. It lies along the
  // hinge pin, so it only travels.
  var bar = layer(fx, 'sw-bar sw-drive');
  var bd = add(bar, 'defs');
  box(bd, 'sw-eb-bar', false, [[0, 'var(--eb-0)'], [0.3, 'var(--eb-2)'], [0.45, 'var(--eb-3)'], [0.7, 'var(--eb-1)'], [1, 'var(--eb-0)']]);
  grad(bd, 'sw-rivet', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--kc-5)'], [0.45, 'var(--kc-3)'], [1, 'var(--kc-0)']]);
  var bw = 7.5, b0 = POLE_FAR - 9, b1 = POLE_NEAR + 9;
  var barD = 'M' + (CX - bw) + ' ' + (b0 + 3) + 'Q' + (CX - bw) + ' ' + b0 + ' ' + CX + ' ' + b0 + 'Q' + (CX + bw) + ' ' + b0 + ' ' + (CX + bw) + ' ' + (b0 + 3) +
             'V' + (b1 - 3) + 'Q' + (CX + bw) + ' ' + b1 + ' ' + CX + ' ' + b1 + 'Q' + (CX - bw) + ' ' + b1 + ' ' + (CX - bw) + ' ' + (b1 - 3) + 'Z';
  add(bar, 'path', { d: barD, transform: 'translate(1 1.4)', style: F('#000') + ';opacity:.5' });
  add(bar, 'path', { d: barD, fill: U('sw-eb-bar') });
  [POLE_FAR, POLE_NEAR].forEach(function (y) { add(bar, 'circle', { cx: CX, cy: y, r: 2.6, fill: U('sw-rivet') }); });

  // The handle: turned ebonite on a brass ferrule, drawn standing on the
  // crossbar and swung into place by CSS.
  var hd = layer(fx, 'sw-handle sw-drive');
  var hdd = add(hd, 'defs');
  box(hdd, 'sw-eb', false, [[0, 'var(--eb-0)'], [0.2, 'var(--eb-1)'], [0.5, 'var(--eb-2)'], [0.8, 'var(--eb-1)'], [1, 'var(--eb-0)']]);
  box(hdd, 'sw-fer', false, [[0, 'var(--bz-0)'], [0.3, 'var(--bz-2)'], [0.5, 'var(--bz-4)'], [0.75, 'var(--bz-1)'], [1, 'var(--bz-0)']]);
  var b = HINGE_Y, L = GRIP_L;
  function hw(t) {
    // the turned profile: ferrule, neck, a long swelling grip, a domed end
    if (t < 0.2) return 4;
    if (t < 0.27) return 4 + (t - 0.2) / 0.07 * 2.4;
    var u = (t - 0.27) / 0.73;
    return 6.4 + 5.2 * Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.6);
  }
  var pts = [], N = 28;
  for (var i = 0; i <= N; i++) { var t = 0.12 + (0.93 - 0.12) * i / N; pts.push([hw(t), b - t * L]); }
  var endR = pts[pts.length - 1][0], endY = pts[pts.length - 1][1];
  var dH = 'M' + n2(CX - pts[0][0]) + ' ' + n2(pts[0][1]);
  pts.forEach(function (p) { dH += 'L' + n2(CX - p[0]) + ' ' + n2(p[1]); });
  dH += 'C' + n2(CX - endR) + ' ' + n2(endY - endR * 0.95) + ' ' + n2(CX + endR) + ' ' + n2(endY - endR * 0.95) + ' ' + n2(CX + endR) + ' ' + n2(endY);
  for (i = pts.length - 1; i >= 0; i--) dH += 'L' + n2(CX + pts[i][0]) + ' ' + n2(pts[i][1]);
  dH += 'Z';
  add(hd, 'path', { d: dH, fill: U('sw-eb') });
  // the lamp's line along whichever side of the grip is on top at rest,
  // and a broad soft sheen down the middle that stays wherever it points
  var hi = function (f) {
    var d = '';
    pts.forEach(function (p, k) { if (k < 6) return; d += (d ? 'L' : 'M') + n2(CX + f * p[0]) + ' ' + n2(p[1]); });
    return d;
  };
  add(hd, 'path', { d: hi(-0.6), style: S('var(--eb-hi)', 1.8, 'stroke-linecap:round') }, 'sw-lit-l');
  add(hd, 'path', { d: hi(0.6), style: S('var(--eb-hi)', 1.8, 'stroke-linecap:round') }, 'sw-lit-r');
  add(hd, 'path', { d: hi(0), style: S('var(--eb-hi)', 3.4, 'stroke-linecap:round;opacity:.22') });
  // the ferrule and its collar
  add(hd, 'path', { d: rect(CX - 4.6, b - 0.2 * L, 9.2, 0.2 * L - 6), fill: U('sw-fer') });
  add(hd, 'path', { d: rect(CX - 5.4, b - 0.2 * L - 1, 10.8, 2.4), fill: U('sw-fer') });

  // The flash of the break: a spark at each pair of jaws.
  ['salon', 'bureau'].forEach(function (side, s) {
    var sp = layer(fx, 'sw-spark sw-spark-' + side);
    var jx = s ? CX + JAW_R : CX - JAW_R;
    grad(add(sp, 'defs'), 'sw-arc-' + side, true, { cx: 0.5, cy: 0.5, r: 0.5 }, [[0, 'var(--arc-core)'], [0.25, 'var(--arc-mid)', 0.8], [1, 'var(--arc-mid)', 0]]);
    [POLE_FAR, POLE_NEAR].forEach(function (y, k) {
      var cy = y - 9, id = 'board-spark-' + side + '-' + k;
      add(sp, 'ellipse', { cx: jx, cy: cy, rx: 20, ry: 13, fill: U('sw-arc-' + side) }, 'sw-arc-halo');
      var d2 = '';
      for (var r = 0; r < 9; r++) {
        var a = (r / 9) * 2 * Math.PI + rnd(id, r) * 0.5, len = 5 + rnd(id, r + 20) * 8;
        var mx = jx + Math.cos(a) * len * 0.5 + (rnd(id, r + 40) - 0.5) * 2.4, my = cy + Math.sin(a) * len * 0.35;
        d2 += 'M' + jx + ' ' + cy + 'L' + n2(mx) + ' ' + n2(my) + 'L' + n2(jx + Math.cos(a) * len) + ' ' + n2(cy + Math.sin(a) * len * 0.7);
      }
      add(sp, 'path', { d: d2, style: S('var(--arc-core)', 0.8, 'stroke-linecap:round;stroke-linejoin:round') });
      add(sp, 'circle', { cx: jx, cy: cy, r: 2.8, style: F('var(--arc-core)') });
    });
  });
}

/* ------------------------------------------------------------ the plates */
function dressPlates(desk) {
  [['.l-salon', 'board-plate-salon'], ['.l-bureau', 'board-plate-bureau']].forEach(function (p) {
    var el = desk.querySelector(p[0]);
    if (!el) return;
    el.style.setProperty('--slot', Math.round(rnd(p[1]) * 180) + 'deg');
    el.style.setProperty('--slot2', Math.round(rnd(p[1], 1) * 180) + 'deg');
  });
}

window.Desk = {
  BOX_W: BOX_W, BOX_H: BOX_H, ART_TOP: ART_TOP,
  build: function (desk) {
    if (!desk) return;
    var q = desk.querySelector('.hl-board'), fx = desk.querySelector('.desk-fx');
    if (q && !q.firstChild) buildBoard(q);
    if (fx && !fx.firstChild) buildFx(fx);
    dressPlates(desk);
    // The swing's geometry, for the transforms in atrium.css.
    var st = desk.style;
    st.setProperty('--sw-cx', CX + 'px');
    st.setProperty('--sw-hy', HINGE_Y + 'px');
    st.setProperty('--sw-far', POLE_FAR + 'px');
    st.setProperty('--sw-near', POLE_NEAR + 'px');
    st.setProperty('--sw-bl', BLADE_L + 'px');
    st.setProperty('--sw-k', String(K));
    st.setProperty('--sw-met', (MET_Y - 2) + 'px');
    st.setProperty('--sw-plate-b', (BOX_H - PLATE_B) + 'px');
    st.setProperty('--sw-plate-l', (CX - JAW_R) + 'px');
    st.setProperty('--sw-plate-r', (CX + JAW_R) + 'px');
    st.setProperty('--sw-arm', (BLADE_L + GRIP_L + 8) + 'px');
  }
};
})();
