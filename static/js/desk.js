/* ===========================================================================
   THE HOUSE-LIGHTS BOARD: the hall's one control.

   A picture palace threw its house lights on a live-front switchboard: an
   upright slab of marble bolted to a frame, carrying knife switches with
   copper blades and ebonite handles, pilot jewels and a round ammeter at the
   head of the panel. This is that board cut down to one circuit pair and
   stood on its own bronze standard at the foot of the runner, facing the
   reader: a Bardiglio panel in a bolection frame, a stepped tablet over it
   for the meter, a fan on the tablet, two reeded legs and a Portoro plinth
   on the wool.

   The switch is one double-pole, double-throw knife switch, mounted to
   throw sideways as the wiring rules asked of a double-throw switch (thrown
   up and down, one could fall shut). Its hinge pin stands upright in the
   middle of the panel, the SALON jaws are to the left and the BUREAU jaws to
   the right. The two blades lie flat along the marble in the live wing's
   jaws, their tips joined by an ebonite crossbar, and the handle stands out
   along the blades past the jaws. A throw pulls the blades out of their
   jaws (the flash of the break), swings them out toward the reader until
   the handle points straight at the room, carries them over and seats them
   in the other pair, where they bounce once and settle.

   Everything is drawn as a solid in one camera: the floor's own. The hall's
   terrazzo is a plane tilted 58 degrees from the screen under an eye 3.2
   floor-heights away (atrium.css, .fl-plane), so the board is seen from 32
   degrees above, from a little further off than the floor's eye so that its
   uprights converge by a few percent and not by fifteen. Each part is a
   prism, a box or a turned solid in board units (x right, y up from the
   wool, z out of the panel toward the reader), projected through that
   camera and shaded by its facets' normals against the room: the key up
   and a little left, a bright band where the lit wall behind is mirrored,
   the dark house and the floor below it. Tones are the palace's custom
   properties, mixed with color-mix in style attributes (var() does not
   resolve in presentation attributes), so one drawing serves both themes.

   The static board is painted once. The swing is a stack of poses of the
   moving parts (blades, crossbar, handle, their shadows on the marble),
   each drawn at its own angle; the drive shows the one nearest the
   blades' angle, by opacity. The needle turns in the dial's own
   foreshortened plane; the pilots, the meter's lamp and the flash of the
   break are opacity layers.
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
  return grad(defs, id, false, { gradientUnits: 'userSpaceOnUse', x1: n2(x1), y1: n2(y1), x2: n2(x2), y2: n2(y2) }, stops);
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
function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

/* ------------------------------------------------------------ vectors */
function vadd(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vmul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function vnorm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
/* A point given in a part's own frame: o + a*i + b*j + c*k. */
function at(F3, i, j, k) {
  return [F3.o[0] + F3.a[0] * i + F3.b[0] * j + F3.c[0] * k,
          F3.o[1] + F3.a[1] * i + F3.b[1] * j + F3.c[1] * k,
          F3.o[2] + F3.a[2] * i + F3.b[2] * j + F3.c[2] * k];
}
var X3 = [1, 0, 0], Y3 = [0, 1, 0], Z3 = [0, 0, 1], DN = [0, -1, 0];

/* ------------------------------------------------------------ camera */
/* The floor's eye, 32 degrees above the board's foot. The assembly box is
   BOX_W x BOX_H units and the board's foot on the wool is (CX, FLOOR). u
   runs up the screen, w toward the eye. */
var PITCH = 32 * DEG, SP = Math.sin(PITCH), CP = Math.cos(PITCH), EYE = 1500;
var BOX_W = 460, BOX_H = 296, CX = 230, FLOOR = 271;
var EYE_P = [0, EYE * SP, EYE * CP];
function proj(p) {
  var u = p[1] * CP - p[2] * SP, w = p[1] * SP + p[2] * CP, s = EYE / (EYE - w);
  return [CX + p[0] * s, FLOOR - u * s, w];
}
function viewAt(p) { return vnorm(vsub(EYE_P, p)); }
function pathOf(pts) {
  var d = '';
  for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + n2(pts[i][0]) + ' ' + n2(pts[i][1]);
  return d + 'Z';
}
function path3(pts3) { return pathOf(pts3.map(proj)); }
/* The affine that carries a small plane figure (drawn in its own units, y
   down) to the screen about p0, with axes ex and ey: exact at p0 and good
   to a fraction of a unit across a dial or a jewel. */
function planeXf(p0, ex, ey) {
  var o = proj(p0), a = proj(vadd(p0, ex)), b = proj(vadd(p0, ey));
  return 'matrix(' + [a[0] - o[0], a[1] - o[1], b[0] - o[0], b[1] - o[1], o[0], o[1]].map(n2).join(' ') + ')';
}

/* ------------------------------------------------------------ light */
/* One key, up and a little left and in front: the skylight by day, the
   room's lamps by night. A polished part mirrors the room by the height of
   the ray it sends back: the floor and the dark house low down, the lit
   wall and its arches as a band a little above the horizon, the ceiling. */
var LIGHT = vnorm([-0.45, 0.72, 0.62]);
var ENV = [[-1, 0.05], [-0.4, 0.12], [-0.05, 0.16], [0.08, 0.3], [0.2, 0.6], [0.34, 0.7], [0.5, 0.78], [0.62, 0.66], [0.8, 0.7], [1, 0.8]];
/* The patinated bronze takes the room more darkly: its polish is the lit
   wall and the arches, one bright band a little above the horizon, and the
   ceiling over it is the dark of the house. With the ceiling as bright as
   the copper sees it, every top of the frame and the standard caught it and
   the eye read the board from above, as a plan. */
var ENV_SB = [[-1, 0.04], [-0.4, 0.08], [-0.1, 0.12], [0.04, 0.34], [0.14, 0.86], [0.24, 1], [0.34, 0.72], [0.46, 0.36], [0.7, 0.24], [1, 0.28]];
function interp(tab, x) {
  if (x <= tab[0][0]) return tab[0][1];
  for (var i = 1; i < tab.length; i++) {
    if (x <= tab[i][0]) {
      var f = (x - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]);
      return tab[i - 1][1] + (tab[i][1] - tab[i - 1][1]) * f;
    }
  }
  return tab[tab.length - 1][1];
}
/* Tone ramps, dark to light. The leaf's six tones are ordered by the law
   (glaze, shade, body, crest, relief, lip), so by brightness the crest
   comes last. */
var MAT = {
  cu:   { ramp: ['--kc-0', '--kc-1', '--kc-2', '--kc-3', '--kc-4', '--kc-5'], env: 0.66, diff: 0.3, spec: 0.6, pow: 40, tex: 'hb-brush', texOp: '--cu-tex' },
  sb:   { ramp: ['--sb-oil', '--sb-0', '--sb-1', '--sb-2', '--sb-3', '--sb-4', '--sb-5'], env: 0.92, diff: 0.16, spec: 0.9, pow: 30, tex: 'hb-patina', texOp: '--sb-tex', envTab: ENV_SB, side: 0.7 },
  bz:   { ramp: ['--bz-0', '--bz-1', '--bz-2', '--bz-3', '--bz-4'], env: 0.62, diff: 0.34, spec: 0.5, pow: 30 },
  lead: { ramp: ['--lead-0', '--lead-1', '--lead-2', '--lead-4', '--lead-5', '--lead-3'], env: 0.6, diff: 0.36, spec: 0.45, pow: 24 },
  eb:   { ramp: ['--eb-0', '--eb-1', '--eb-2', '--eb-3'], env: 0.4, diff: 0.3, spec: 0, pow: 1 },
  pt:   { ramp: ['--pt-0', '--pt-1', '--pt-2', '--pt-3'], env: 0.3, diff: 0.7, spec: 0.1, pow: 8 }
};
/* The room by the ray's height, plus the hall's lit side walls for a ray
   sent off sideways and the lit arches for one sent back toward the stage. */
function envT(r, tab, side) {
  return interp(tab || ENV, r[1]) + (side || 0.24) * Math.max(0, Math.abs(r[0]) - 0.25) + 0.1 * Math.max(0, -r[2]);
}
function shadeT(n, p, m) {
  var v = viewAt(p), nv = vdot(n, v);
  var r = vsub(vmul(n, 2 * nv), v);
  var d = Math.max(0, vdot(n, LIGHT)), s = Math.max(0, vdot(r, LIGHT));
  return clamp01(m.env * envT(r, m.envTab, m.side) + m.diff * (0.08 + 0.72 * d) + m.spec * Math.pow(s, m.pow));
}
function tone(m, t) {
  var n = m.ramp.length - 1, x = clamp01(t) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
  if (f < 0.06) return 'var(' + m.ramp[i] + ')';
  if (f > 0.94) return 'var(' + m.ramp[i + 1] + ')';
  return 'color-mix(in srgb, var(' + m.ramp[i + 1] + ') ' + Math.round(f * 100) + '%, var(' + m.ramp[i] + '))';
}

/* Faces are gathered per part, culled against the eye, and laid far to
   near. On the static board each face of any size also takes a sheen down
   its height: the room's light on its upper part, a little dirt and shade
   gathering toward its foot, so a flat facet reads as a surface. */
var SHEEN = false;
function Faces() { this.list = []; }
Faces.prototype.push = function (pts, n, m, o) {
  var c = [0, 0, 0];
  pts.forEach(function (p) { c = vadd(c, p); });
  c = vmul(c, 1 / pts.length);
  if (vdot(n, viewAt(c)) <= 1e-3) return null;
  var t = shadeT(n, c, m) + ((o && o.bias) || 0);
  var pp = pts.map(proj), y0 = Infinity, y1 = -Infinity;
  pp.forEach(function (q) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  var f = { d: pathOf(pp), w: proj(c)[2], fill: tone(m, t), tex: o && o.tex !== undefined ? o.tex : m.tex, texOp: m.texOp,
            sheen: SHEEN && y1 - y0 > 5 };
  this.list.push(f);
  return f;
};
/* Each face is sealed with a hair of its own colour round its edge: two
   anti-aliased edges that meet leave a seam of whatever lies under them,
   and on a turned bezel of 48 sectors those seams drew a mosaic. */
Faces.prototype.flush = function (g) {
  this.list.sort(function (a, b) { return a.w - b.w; }).forEach(function (f) {
    add(g, 'path', { d: f.d, style: F(f.fill) + ';stroke:' + f.fill + ';stroke-width:.3;stroke-linejoin:round' });
    if (f.tex) add(g, 'path', { d: f.d, fill: U(f.tex), style: 'opacity:var(' + (f.texOp || '--sb-tex') + ')' });
    if (f.sheen) add(g, 'path', { d: f.d, fill: U('hb-sheen') });
  });
  this.list = [];
};

/* Inset a counter-clockwise outline by d, along each corner's bisector. */
function inN(a, b) { var ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1; return [-ey / l, ex / l]; }
function inset(poly, d) {
  var n = poly.length, out = [];
  for (var k = 0; k < n; k++) {
    var a = poly[(k + n - 1) % n], b = poly[k], c = poly[(k + 1) % n];
    var m1 = inN(a, b), m2 = inN(b, c);
    var mx = m1[0] + m2[0], my = m1[1] + m2[1], ml = Math.hypot(mx, my) || 1;
    mx /= ml; my /= ml;
    var cs = Math.max(0.35, mx * m1[0] + my * m1[1]);
    out.push([b[0] + mx * d / cs, b[1] + my * d / cs]);
  }
  return out;
}
/* An extrusion: a counter-clockwise outline in the (a, b) plane of frame
   F3, swept along c from v0 to v1, its top arris chamfered by ch (the
   worked edge that takes the light). */
function prism(fc, F3, outline, v0, v1, ch, m, o) {
  var n = outline.length, ins = ch ? inset(outline, ch) : outline, top = v1 - (ch || 0);
  for (var k = 0; k < n; k++) {
    var p0 = outline[k], p1 = outline[(k + 1) % n];
    var ex = p1[0] - p0[0], ey = p1[1] - p0[1], l = Math.hypot(ex, ey);
    if (l < 1e-6) continue;
    var nw = vnorm(vadd(vmul(F3.a, ey / l), vmul(F3.b, -ex / l)));
    fc.push([at(F3, p0[0], p0[1], v0), at(F3, p1[0], p1[1], v0), at(F3, p1[0], p1[1], top), at(F3, p0[0], p0[1], top)], nw, m, o);
    if (ch) {
      var i0 = ins[k], i1 = ins[(k + 1) % n];
      fc.push([at(F3, p0[0], p0[1], top), at(F3, p1[0], p1[1], top), at(F3, i1[0], i1[1], v1), at(F3, i0[0], i0[1], v1)],
              vnorm(vadd(nw, F3.c)), m, o);
    }
  }
  fc.push(ins.map(function (p) { return at(F3, p[0], p[1], v1); }), F3.c, m, o);
  fc.push(outline.slice().reverse().map(function (p) { return at(F3, p[0], p[1], v0); }), vmul(F3.c, -1), m, o);
}
function rectO(a0, a1, b0, b1) { return [[a0, b0], [a1, b0], [a1, b1], [a0, b1]]; }
/* A box whose front (+z) arrises are chamfered. */
var FZ = { o: [0, 0, 0], a: X3, b: Y3, c: Z3 };
function boxZ(fc, x0, x1, y0, y1, z0, z1, ch, m, o) { prism(fc, FZ, rectO(x0, x1, y0, y1), z0, z1, ch, m, o); }
/* A box whose top (+y) arrises are chamfered: its outline in (x, -z). */
var FY = { o: [0, 0, 0], a: X3, b: [0, 0, -1], c: Y3 };
function boxY(fc, x0, x1, y0, y1, z0, z1, ch, m, o) { prism(fc, FY, rectO(x0, x1, -z1, -z0), y0, y1, ch, m, o); }

/* A turned part, flat-shaded in K sectors: the profile [[t, r], ...] swept
   about the axis from o along ax; u and v span the plane across it. */
function turned(fc, o, ax, u, v, prof, K, m, opt) {
  function P(a, r, t) { return vadd(vadd(o, vmul(ax, t)), vadd(vmul(u, Math.cos(a) * r), vmul(v, Math.sin(a) * r))); }
  for (var j = 0; j < prof.length - 1; j++) {
    var t0 = prof[j][0], r0 = prof[j][1], t1 = prof[j + 1][0], r1 = prof[j + 1][1];
    if (r0 < 1e-6 && r1 < 1e-6) continue;
    for (var k = 0; k < K; k++) {
      var a0 = k / K * 2 * Math.PI, a1 = (k + 1) / K * 2 * Math.PI, am = (a0 + a1) / 2;
      var rad = vadd(vmul(u, Math.cos(am)), vmul(v, Math.sin(am)));
      var nrm = vnorm(vsub(vmul(rad, t1 - t0), vmul(ax, r1 - r0)));
      var q = r0 < 1e-6 ? [P(a0, 0, t0), P(a1, r1, t1), P(a0, r1, t1)]
            : r1 < 1e-6 ? [P(a0, r0, t0), P(a1, r0, t0), P(a0, 0, t1)]
            : [P(a0, r0, t0), P(a1, r0, t0), P(a1, r1, t1), P(a0, r1, t1)];
      fc.push(q, nrm, m, opt);
    }
  }
}
/* A turned part that faces the eye along its axis (a bezel, a boss): each
   band of the profile is one shape, the hull of its two rims, laid back to
   front and shaded by a gradient in the part's own plane, run toward the
   side of the band the room lights most. Round a band the shade is a
   function of the angle from that side, which a linear gradient across it
   holds exactly for one light and closely for the room's several. Drawn
   in flat sectors, the meter's bezel had come out as a mosaic. */
function turnedFace(g, defs, id, o, ax, u, v, prof, m) {
  var K = 48;
  for (var j = 0; j < prof.length - 1; j++) {
    var t0 = prof[j][0], r0 = prof[j][1], t1 = prof[j + 1][0], r1 = prof[j + 1][1];
    if (r0 < 1e-6 && r1 < 1e-6) continue;
    var pts = [], sh = [], best = 0, tm = (t0 + t1) / 2, rm = (r0 + r1) / 2, k;
    for (k = 0; k < K; k++) {
      var a = k / K * 2 * Math.PI, rad = vadd(vmul(u, Math.cos(a)), vmul(v, Math.sin(a)));
      pts.push(proj(vadd(vadd(o, vmul(ax, t0)), vmul(rad, r0))));
      pts.push(proj(vadd(vadd(o, vmul(ax, t1)), vmul(rad, r1))));
      sh.push(shadeT(vnorm(vsub(vmul(rad, t1 - t0), vmul(ax, r1 - r0))), vadd(vadd(o, vmul(ax, tm)), vmul(rad, rm)), m));
      if (sh[k] > sh[best]) best = k;
    }
    var a0 = best / K * 2 * Math.PI, R = Math.max(r0, r1, 0.5), stops = [];
    for (k = 0; k <= K / 2; k++) {
      var phi = Math.PI * (1 - 2 * k / K);
      var tt = (sh[(best + K / 2 - k) % K] + sh[(best - K / 2 + k + K) % K]) / 2;
      stops.push([n2((1 + Math.cos(phi)) / 2), tone(m, tt)]);
    }
    var gid = id + '-' + j;
    grad(defs, gid, false, { gradientUnits: 'userSpaceOnUse', gradientTransform: planeXf(vadd(o, vmul(ax, tm)), u, v),
         x1: n2(-R * Math.cos(a0)), y1: n2(-R * Math.sin(a0)), x2: n2(R * Math.cos(a0)), y2: n2(R * Math.sin(a0)) }, stops);
    add(g, 'path', { d: pathOf(hull(pts)), fill: U(gid) });
  }
}
/* A hexagon nut on a stud along ax. */
function hexNut(fc, o, ax, u, v, r, h, m) {
  var ol = [];
  for (var i = 0; i < 6; i++) { var a = (i * 60 + 30) * DEG; ol.push([Math.cos(a) * r, Math.sin(a) * r]); }
  prism(fc, { o: o, a: u, b: v, c: ax }, ol, 0, h, r * 0.14, m);
}

/* Convex hull (monotone chain) of projected points. */
function hull(pts) {
  pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  var lo = [], up = [], i;
  for (i = 0; i < pts.length; i++) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop();
    lo.push(pts[i]);
  }
  for (i = pts.length - 1; i >= 0; i--) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop();
    up.push(pts[i]);
  }
  up.pop(); lo.pop();
  return lo.concat(up);
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

/* Cast relief (the fans on the bosses, the stretcher's sunburst, the
   finial): drawn flat, turned to metal by the filter: a worn silhouette, a
   lit shoulder toward the key, the far shoulder in shade and the shadow
   the form throws on its ground. The board never moves, so it is painted
   once. */
function castFilter(defs) {
  var f = add(defs, 'filter', { id: 'hb-cast', x: '-8%', y: '-14%', width: '120%', height: '134%',
                                'color-interpolation-filters': 'sRGB' });
  add(f, 'feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 0.42, result: 'b' });
  var ct = add(f, 'feComponentTransfer', { in: 'b', result: 'm0' });
  add(ct, 'feFuncA', { type: 'linear', slope: 3.4, intercept: -1.2 });
  add(f, 'feComposite', { in: 'm0', in2: 'SourceAlpha', operator: 'in', result: 'm' });
  add(f, 'feComposite', { in: 'SourceGraphic', in2: 'm', operator: 'in', result: 'body' });
  add(f, 'feOffset', { in: 'm', dx: 0.55, dy: 0.8, result: 'mo' });
  add(f, 'feComposite', { in: 'm', in2: 'mo', operator: 'out', result: 'ul' });
  add(f, 'feGaussianBlur', { in: 'ul', stdDeviation: 0.28, result: 'ulb' });
  add(f, 'feFlood', { result: 'lc', style: 'flood-color:var(--sb-rl-lit)' });
  add(f, 'feComposite', { in: 'lc', in2: 'ulb', operator: 'in', result: 'l0' });
  add(f, 'feComposite', { in: 'l0', in2: 'm', operator: 'in', result: 'lit' });
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
  ['drop', 'body', 'shade', 'lit'].forEach(function (r) { add(mg, 'feMergeNode', { in: r }); });
}
function fanPath(cx, by, r, rays, a0, a1) {
  var d = '', span = (a1 - a0) / rays;
  for (var i = 0; i < rays; i++) {
    var b0 = a0 + (i + 0.14) * span, b1 = a0 + (i + 0.86) * span;
    d += 'M' + n2(cx) + ' ' + n2(by) + 'L' + n2(cx + r * Math.cos(b0)) + ' ' + n2(by + r * Math.sin(b0)) +
         'A' + n2(r) + ' ' + n2(r) + ' 0 0 1 ' + n2(cx + r * Math.cos(b1)) + ' ' + n2(by + r * Math.sin(b1)) + 'Z';
  }
  return d;
}

/* ------------------------------------------------------------ the object */
/* Board units. The marble panel's face is the plane z = 0. The slab is
   cut in setbacks, the picture palace's own skyline: a broad body for the
   switch, a step for the two pilots and a head for the meter. */
var PX = 200, PY0 = 60, PY1 = 178, PT = 10;          // the body of the panel
var SX1 = 126, SY1 = 206;                            // the pilots' step
var SX2 = 62, SY2 = 250;                             // the meter's head
var FW = 9;                                          // the frame, outside the marble
var SLAB = [[-PX, PY0], [PX, PY0], [PX, PY1], [SX1, PY1], [SX1, SY1], [SX2, SY1], [SX2, SY2],
            [-SX2, SY2], [-SX2, SY1], [-SX1, SY1], [-SX1, PY1], [-PX, PY1]];
/* The bolection moulding, as (outward from the marble's edge, out of the
   panel): it laps the stone, rises to a rounded crest and falls to a
   square outer edge that runs back a little past the slab (not far: seen
   from above, that return is the top of every rail). */
var FPROF = [[-2.6, 0.3], [-1.8, 1.4], [-0.6, 2.6], [0.8, 3.6], [2.4, 4.4], [4, 4.8], [5.4, 4.7], [6.6, 4.2], [7.6, 3.4],
             [8.4, 2.4], [8.9, 1.3], [9, 0.4], [9, -1.6]];
var FANR = 15, FANY = SY2 + FW;                      // the finial
var MY = 227, MR = 16;                               // the ammeter
var JWX = 95, JWY = 192, JR = 7;                     // the pilots
/* the switch */
var PL = 108, PU = 146, HY = (PL + PU) / 2;          // the two poles and the handle's axis
var BL = 118, WB = 22, TB = 8, ZB = 22;              // blade length, width, thickness, stand-off
var JX = 100, PLATE_T = 79;                          // the jaws' centres, the plates' top edge
var LEAF = 2.8, LEAF_Z = ZB + WB / 2 + 2, JAW_W = 8.5; // the jaws' spring leaves
var XB0 = BL - 6, XB1 = BL + 3, XBQ = 8, XBY = 5;    // the crossbar: along, across, past the blades
var HANDLE = [                                       // the handle, turned: [t, r]
  [0, 8.6], [2.4, 8.6], [2.4, 6.9], [11, 6.9], [11.8, 7.8], [13.4, 7.8], [13.4, 6.3], [15, 6.5]
];
(function () {
  // the grip swells to its widest two thirds of the way out, then the end
  // is turned round
  for (var t = 17; t <= 76.01; t += 3.7) {
    var u = (t - 15) / 49;
    var r = t <= 64 ? 6.5 + 6 * Math.pow(Math.sin(Math.min(1, u) * Math.PI / 2), 0.8) : 12.5 - (t - 64) / 12 * 1;
    HANDLE.push([t, r]);
  }
  for (var k = 1; k <= 8; k++) {
    var a = k / 8 * Math.PI / 2;
    HANDLE.push([76 + 10.2 * Math.sin(a), 11.5 * Math.cos(a)]);
  }
})();
var H_FER = 5;                                       // HANDLE[0..H_FER] is the brass ferrule
var H_END = HANDLE[HANDLE.length - 1][0];
var LEG_X = 138;
var PLX = 166, PLY = 7, PLZ0 = -17, PLZ1 = 12;       // the plinth
var ART_TOP = Math.floor(proj([0, FANY + FANR + 8, 3])[1]);

/* ------------------------------------------------------------ defs */
function buildDefs(svg) {
  var defs = add(svg, 'defs');
  // the patina's brushing runs along each member: down a stile, along a rail
  pattern(defs, 'hb-patina', '/static/assets/tex/patina-board.webp', 150);
  pattern(defs, 'hb-patina-h', '/static/assets/tex/patina-board.webp', 150, 'rotate(90) translate(41 97)');
  pattern(defs, 'hb-marble', '/static/assets/tex/stone-bardiglio.webp', 300,
          'translate(' + Math.round(rnd('board-slab', 1) * 300) + ' ' + Math.round(rnd('board-slab', 2) * 300) + ')');
  pattern(defs, 'hb-portoro', '/static/assets/tex/stone-portoro.webp', 190);
  pattern(defs, 'hb-brush', '/static/assets/tex/brush-copper.webp', 26);
  castFilter(defs);
  add(add(defs, 'filter', { id: 'hb-soft', x: '-20%', y: '-40%', width: '140%', height: '180%' }),
      'feGaussianBlur', { stdDeviation: 1.6 });
  add(add(defs, 'filter', { id: 'hb-soft2', x: '-20%', y: '-40%', width: '140%', height: '180%' }),
      'feGaussianBlur', { stdDeviation: 2.6 });
  grad(defs, 'hb-cshadow', true, { cx: 0.5, cy: 0.45, r: 0.5 },
       [[0, 'var(--floor-shadow)'], [0.55, 'var(--floor-shadow)', 0.5], [1, 'var(--floor-shadow)', 0]]);
  // The marble's light: its veil by the hour and one band of polish.
  var t0 = proj([0, SY2, 0]), t1 = proj([0, PY0, 0]);
  lin(defs, 'hb-veil', 0, t0[1], 0, t1[1], [[0, 'var(--slab-top)'], [0.45, 'var(--slab-mid)'], [1, 'var(--slab-bot)']]);
  var b0 = proj([-PX, SY2, 0]), b1 = proj([PX * 0.6, PY0, 0]);
  lin(defs, 'hb-polish', b0[0], b0[1], b1[0], b1[1], [[0, 'var(--slab-spec)', 0], [0.33, 'var(--slab-spec)', 0], [0.38, 'var(--slab-spec)', 0.75],
      [0.42, 'var(--slab-spec)', 1], [0.45, 'var(--slab-spec)', 0.3], [0.5, 'var(--slab-spec)', 0.55], [0.54, 'var(--slab-spec)', 0.1],
      [0.62, 'var(--slab-spec)', 0], [1, 'var(--slab-spec)', 0]]);
  grad(defs, 'hb-cu-dome', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--kc-5)'], [0.45, 'var(--kc-3)'], [1, 'var(--kc-0)']]);
  grad(defs, 'hb-br-dome', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--bz-4)'], [0.45, 'var(--bz-2)'], [1, 'var(--bz-0)']]);
  grad(defs, 'hb-sb-dome', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--sb-5)'], [0.4, 'var(--sb-3)'], [1, 'var(--sb-0)']]);
  grad(defs, 'hb-facet-dark', true, { cx: 0.4, cy: 0.35, r: 0.8 }, [[0, '#fff', 0.2], [1, '#fff', 0.04]]);
  grad(defs, 'hb-sheen', false, { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, '#fff', 0.1], [0.3, '#fff', 0.02], [0.6, '#000', 0], [1, '#000', 0.16]]);
  grad(defs, 'hb-bz-h', false, { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, 'var(--bz-4)'], [0.4, 'var(--bz-2)'], [1, 'var(--bz-0)']]);
  return defs;
}

/* ------------------------------------------------------------ floor, plinth, stand */
function buildFloor(q) {
  var g = add(q, 'g', null, 'hb-floor');
  // The wool under it: a contact shadow, no return (wool does not reflect).
  var a = proj([-PLX - 14, 0, PLZ0 - 6]), b = proj([PLX + 14, 0, PLZ1 + 10]);
  var c = proj([8, 0, (PLZ0 + PLZ1) / 2 + 2]);
  add(g, 'ellipse', { cx: n2(c[0]), cy: n2(c[1]), rx: n2((b[0] - a[0]) / 2), ry: n2((b[1] - a[1]) / 2), fill: U('hb-cshadow') });
  var f0 = proj([-PLX, 0, PLZ1]), f1 = proj([PLX, 0, PLZ1]);
  add(g, 'path', { d: 'M' + n2(f0[0]) + ' ' + n2(f0[1] + 0.6) + 'H' + n2(f1[0] + 3), style: S('#000', 3, 'opacity:.62;stroke-linecap:round'), filter: U('hb-soft') });
}
function buildPlinth(q) {
  var g = add(q, 'g', null, 'hb-ped');
  var fc = new Faces();
  boxY(fc, -PLX, PLX, 0, PLY, PLZ0, PLZ1, 2.4, MAT.pt, { tex: null });
  // Portoro: the stone's own figure, then the light on each face
  fc.list.sort(function (a, b) { return a.w - b.w; }).forEach(function (f) {
    add(g, 'path', { d: f.d, fill: U('hb-portoro') });
    add(g, 'path', { d: f.d, style: F(f.fill) + ';opacity:.6' });
  });
  fc.list = [];
  // the bronze toe strip along its foot, rubbed to the wing's leaf by shoes
  boxZ(fc, -PLX, PLX, 0, 3.4, PLZ1, PLZ1 + 1.4, 0.6, MAT.sb);
  fc.flush(g);
  var t0 = proj([-PLX * 0.72, 1.9, PLZ1 + 1.4]), t1 = proj([PLX * 0.72, 1.9, PLZ1 + 1.4]);
  lin(q.querySelector('defs'), 'hb-toe', t0[0], 0, t1[0], 0, [[0, 'var(--lead-3)', 0], [0.3, 'var(--lead-5)', 0.8], [0.5, 'var(--lead-3)', 1], [0.7, 'var(--lead-5)', 0.8], [1, 'var(--lead-3)', 0]]);
  add(g, 'path', { d: 'M' + n2(t0[0]) + ' ' + n2(t0[1]) + 'H' + n2(t1[0]), style: 'fill:none;stroke:url(#hb-toe);stroke-width:1.1' });
}
function chevronPath(cx, by, w, h) {
  // a lightning chevron, the house's electric sign, cast
  var t = h * 0.3;
  return 'M' + n2(cx - w / 2) + ' ' + n2(by) + 'L' + n2(cx) + ' ' + n2(by - h) + 'L' + n2(cx + w / 2) + ' ' + n2(by) +
         'L' + n2(cx + w / 2 - t) + ' ' + n2(by) + 'L' + n2(cx) + ' ' + n2(by - h + t * 1.3) + 'L' + n2(cx - w / 2 + t) + ' ' + n2(by) + 'Z';
}
/* The standard: two reeded bronze legs on stepped feet, corbelled out under
   the frame, an apron of cast fans and lightning between them and a
   stretcher low down with a sunburst on it. */
function buildStand(q) {
  var g = add(q, 'g', null, 'hb-ped');
  var fc = new Faces();
  var capTop = PY0 - FW + 0.5, inner = LEG_X - 15;
  // The stretcher first: the legs' inner faces stand in front of its ends.
  boxZ(fc, -inner, inner, 21, 27, -9, -3, 1.1, MAT.sb);
  fc.flush(g);
  turnedFace(g, q.querySelector('defs'), 'hb-strb', [0, 30, -3], Z3, X3, Y3, [[-1, 10], [0.6, 10], [1.6, 9], [2, 0]], MAT.sb);
  var ray = add(g, 'g', { transform: planeXf([0, 30, -0.8], X3, DN), filter: U('hb-cast') });
  add(ray, 'path', { d: fanPath(0, 3, 8, 11, Math.PI, 2 * Math.PI) + 'M-2.6 3A2.6 2.6 0 0 1 2.6 3Z', style: F('var(--sb-3)') });
  // the apron under the frame's foot, set back from it
  var ay0 = capTop - 9, ay1 = capTop;
  boxZ(fc, -inner, inner, ay0, ay1, -9, -1.5, 0.8, MAT.sb);
  fc.flush(g);
  var fr = add(g, 'g', { transform: planeXf([0, ay0, -1.4], X3, DN), filter: U('hb-cast') });
  var dFan = '', dChev = '', n = 13, pitch = (2 * inner - 16) / (n - 1);
  for (var i = 0; i < n; i++) {
    var x = -inner + 8 + i * pitch;
    if (i % 2 === 0) dFan += fanPath(x, -1.2, 6, 7, Math.PI, 2 * Math.PI);
    else dChev += chevronPath(x, -1.4, 8, 6.2);
  }
  add(fr, 'path', { d: dFan + dChev, style: F('var(--sb-3)') });
  var al = proj([-inner, ay1 - 0.4, -1.5]), ar = proj([inner, ay1 - 0.4, -1.5]);
  add(g, 'path', { d: 'M' + n2(al[0]) + ' ' + n2(al[1]) + 'L' + n2(ar[0]) + ' ' + n2(ar[1]), style: S('var(--sb-oil)', 1.4, 'opacity:.8') });
  [-1, 1].forEach(function (sg) {
    var x = sg * LEG_X;
    // the foot: a stepped block, its toe rubbed to the leaf
    boxY(fc, x - 22, x + 22, PLY, PLY + 6, -15, 9, 1.5, MAT.sb);
    boxY(fc, x - 17.5, x + 17.5, PLY + 6, PLY + 9, -12, 6, 1.1, MAT.sb);
    fc.flush(g);
    var t0 = proj([x - 16, PLY + 6, 9]), t1 = proj([x + 16, PLY + 6, 9]);
    add(g, 'path', { d: 'M' + n2(t0[0]) + ' ' + n2(t0[1]) + 'L' + n2(t1[0]) + ' ' + n2(t1[1]), style: S('var(--lead-5)', 0.9, 'opacity:.85') });
    // the shaft: reeded on its face, a half round per reed
    var y0 = PLY + 9, y1 = capTop - 7;
    boxZ(fc, x - 13, x + 13, y0, y1, -11, 3, 0, MAT.sb);
    fc.flush(g);
    // each reed a half round, shaded across its round
    for (var r = 0; r < 5; r++) {
      var rx = x - 13 + 2.6 * (2 * r + 1);
      turnedShape(g, q.querySelector('defs'), 'hb-reed' + (sg < 0 ? 'l' : 'r') + r, [rx, y0, 3], Y3, Z3, [[0, 2.3], [y1 - y0, 2.3]], 0, 1, MAT.sb, false);
    }
    // the corbel under the frame, stepping out in two courses
    boxY(fc, x - 16, x + 16, y1, y1 + 3.2, -13, 5.5, 1, MAT.sb);
    boxY(fc, x - 20, x + 20, y1 + 3.2, capTop, -15, 7, 1, MAT.sb);
    fc.flush(g);
    var c0 = proj([x - 19, capTop, 7]), c1 = proj([x + 19, capTop, 7]);
    add(g, 'path', { d: 'M' + n2(c0[0]) + ' ' + n2(c0[1]) + 'L' + n2(c1[0]) + ' ' + n2(c1[1]), style: S('var(--lead-3)', 0.8, 'opacity:.6') });
  });
}

/* ------------------------------------------------------------ the panel */
function facePts(x0, x1, y0, y1, z) { return [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]; }
/* The slab's face, or a line inset from its edge (SLAB runs
   counter-clockwise, which inset() takes). */
function slabPath(d) {
  return path3((d ? inset(SLAB, d) : SLAB).map(function (p) { return [p[0], p[1], 0]; }));
}
function buildPanel(q) {
  var g = add(q, 'g', null, 'hb-panel');
  var face = slabPath(0);
  add(g, 'path', { d: face, fill: U('hb-marble') });
  add(g, 'path', { d: face, fill: U('hb-veil') });
  add(g, 'path', { d: face, fill: U('hb-polish') });
  // The frame's crest shades the stone under every rail that faces down
  // onto it and inside every stile on the lamp's side; each inner edge
  // has its line of occlusion.
  var sh = add(g, 'g', { filter: U('hb-soft'), style: F('var(--slab-shade)') });
  for (var i = 0; i < SLAB.length; i++) {
    var p0 = SLAB[i], p1 = SLAB[(i + 1) % SLAB.length];
    var nx = p1[1] - p0[1], ny = -(p1[0] - p0[0]), l = Math.hypot(nx, ny);
    nx /= l; ny /= l;                       // outward
    var w = ny > 0.5 ? 5 : nx < -0.5 ? 4 : 1.4;
    add(sh, 'path', { d: path3([[p0[0], p0[1], 0], [p1[0], p1[1], 0], [p1[0] - nx * w, p1[1] - ny * w, 0], [p0[0] - nx * w, p0[1] - ny * w, 0]]) });
  }
  // a brass stringing line let into the stone, a hair's shadow under it
  var sl = slabPath(11);
  add(g, 'path', { d: sl, style: S('#000', 0.9, 'opacity:.35'), transform: 'translate(.4 .6)' });
  add(g, 'path', { d: sl, style: S('var(--bz-2)', 0.8) });
  // A sunburst of brass let into the stone under the meter, fanning down
  // over the pilots' step to the jaws, inside the stringing: long and
  // short rays by turns.
  var defs = q.querySelector('defs'), cp = add(defs, 'clipPath', { id: 'hb-burst-clip' });
  add(cp, 'path', { d: path3(inset(SLAB, 13).map(function (p) { return [p[0], Math.max(p[1], PU + 16), 0]; })) });
  var rays = '', grooves = '';
  for (var k = 1; k < 24; k++) {
    var a = k / 24 * Math.PI, r1 = k % 2 ? 150 : 250;
    var q0 = proj([Math.cos(a) * (MR + 9), MY - 4 - Math.sin(a) * (MR + 9), 0]);
    var q1 = proj([Math.cos(a) * r1, MY - 4 - Math.sin(a) * r1, 0]);
    rays += 'M' + n2(q0[0]) + ' ' + n2(q0[1]) + 'L' + n2(q1[0]) + ' ' + n2(q1[1]);
    grooves += 'M' + n2(q0[0] + 0.35) + ' ' + n2(q0[1] + 0.5) + 'L' + n2(q1[0] + 0.35) + ' ' + n2(q1[1] + 0.5);
  }
  var bg = add(g, 'g', { 'clip-path': U('hb-burst-clip') });
  add(bg, 'path', { d: grooves, style: S('#000', 0.7, 'opacity:.3') });
  add(bg, 'path', { d: rays, style: S('var(--bz-2)', 0.55, 'opacity:.6') });
}

/* The bolection frame, swept round the slab's outline. Every corner is
   square, so each end of a run is mitred along the sum of the two sides'
   outward normals, for a setback's inside corners as for its outside ones.
   A facet (dout, dz) of the profile faces (-dz along the side's normal,
   dout out of the panel).
   Each run is one path, shaded by a gradient across it that is sampled
   from the moulding's normals, smoothed between the facets and broken only
   at the square outer arris. Flat facets had laid a dozen parallel stripes
   of brown along every stile, and a moulding shaded in stripes is wood; a
   cast one is dark and continuous, with one hard line of light along its
   round. The gradient's lines are laid along the run as the eye sees it
   (gradientTransform), so they follow a stile's slight convergence. The
   same mitred cross-section closes both runs at a corner, so they meet on
   one line and never overlap. */
function frameRuns(g, defs, poly, prof, m, idp) {
  var n = poly.length, norms = [], runs = [];
  for (var i = 0; i < n; i++) {
    var p0 = poly[i], p1 = poly[(i + 1) % n], l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    norms.push([(p1[1] - p0[1]) / l, -(p1[0] - p0[0]) / l]);
  }
  function P(c, s, p) { return [c[0] + s[0] * p[0], c[1] + s[1] * p[0], p[1]]; }
  for (i = 0; i < n; i++) {
    var c0 = poly[i], c1 = poly[(i + 1) % n], nr = norms[i];
    var pn = norms[(i + n - 1) % n], nn = norms[(i + 1) % n];
    var s0 = [nr[0] + pn[0], nr[1] + pn[1]], s1 = [nr[0] + nn[0], nr[1] + nn[1]];
    var cm = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2];
    // The facets the eye sees, from the lap outward: they run on until the
    // first that turns away, and whatever lies past it is behind them.
    var fn = [], a = -1, b = -1;
    for (var j = 0; j < prof.length - 1; j++) {
      var p = prof[j], r = prof[j + 1], dout = r[0] - p[0], dz = r[1] - p[1];
      var N = vnorm([-nr[0] * dz, -nr[1] * dz, dout]);
      fn.push(N);
      var vis = vdot(N, viewAt(P(cm, nr, [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2]))) > 1e-3;
      if (vis) { if (a < 0) a = j; b = j; } else if (a >= 0) break;
    }
    if (a < 0) continue;
    // samples across the moulding: position and a normal smoothed between
    // neighbouring facets, hard where they meet at more than 50 degrees
    var smp = [];
    for (j = a; j <= b; j++) {
      var nA = fn[j], nB = fn[j];
      if (j > a && vdot(fn[j - 1], fn[j]) > 0.64) nA = vnorm(vadd(fn[j - 1], fn[j]));
      if (j < b && vdot(fn[j + 1], fn[j]) > 0.64) nB = vnorm(vadd(fn[j + 1], fn[j]));
      for (var k = 0; k <= 3; k++) {
        var f = k / 3, pp = [prof[j][0] + (prof[j + 1][0] - prof[j][0]) * f, prof[j][1] + (prof[j + 1][1] - prof[j][1]) * f];
        smp.push({ p: pp, n: vnorm(vadd(vmul(nA, 1 - f), vmul(nB, f))) });
      }
    }
    var O = proj(P(cm, nr, prof[a])), E2 = proj(P(cm, nr, prof[b + 1]));
    var Ax = E2[0] - O[0], Ay = E2[1] - O[1];
    var pc = [4, 4.8], D0 = proj(P(c0, nr, pc)), D1 = proj(P(c1, nr, pc));
    var Dx = D1[0] - D0[0], Dy = D1[1] - D0[1], det = Ax * Dy - Ay * Dx;
    if (Math.abs(det) < 1e-6) continue;
    var id = idp + i, stops = [], tPrev = 0;
    smp.forEach(function (sm) {
      var q = proj(P(cm, nr, sm.p)), qx = q[0] - O[0], qy = q[1] - O[1];
      var t = Math.max(tPrev, clamp01((qx * Dy - qy * Dx) / det));
      tPrev = t;
      stops.push([n2(t), tone(m, shadeT(sm.n, P(cm, nr, sm.p), m))]);
    });
    grad(defs, id, false, { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 1, y2: 0,
         gradientTransform: 'matrix(' + [Ax, Ay, Dx, Dy, O[0], O[1]].map(n2).join(' ') + ')' }, stops);
    var ring = [];
    for (j = a; j <= b + 1; j++) ring.push(proj(P(c0, s0, prof[j])));
    for (j = b + 1; j >= a; j--) ring.push(proj(P(c1, s1, prof[j])));
    runs.push({ d: pathOf(ring), id: id, w: proj(P(cm, nr, pc))[2], tex: Math.abs(nr[1]) > 0.5 ? 'hb-patina-h' : 'hb-patina' });
  }
  runs.sort(function (x, y) { return x.w - y.w; }).forEach(function (r) {
    add(g, 'path', { d: r.d, fill: U(r.id) });
    add(g, 'path', { d: r.d, fill: U(r.tex), style: 'opacity:var(--sb-tex)' });
  });
}
function boss(g, fc, cx, cy, h, lead) {
  boxZ(fc, cx - h, cx + h, cy - h, cy + h, -1, 6.4, 1.5, MAT.sb);
  fc.flush(g);
  var fg = add(g, 'g', { transform: planeXf([cx, cy, 6.4], X3, DN), filter: U('hb-cast') });
  add(fg, 'path', { d: fanPath(0, h * 0.42, h * 0.6, 5, Math.PI, 2 * Math.PI) + 'M' + n2(-h * 0.2) + ' ' + n2(h * 0.42) + 'A' + n2(h * 0.2) + ' ' + n2(h * 0.2) + ' 0 0 1 ' + n2(h * 0.2) + ' ' + n2(h * 0.42) + 'Z',
                   style: F('var(--sb-3)') });
  var a = proj([cx - h + 1.5, cy + h - 0.2, 4.9]), b = proj([cx + h - 1.5, cy + h - 0.2, 4.9]);
  add(g, 'path', { d: 'M' + n2(a[0]) + ' ' + n2(a[1]) + 'H' + n2(b[0]), style: S('var(--lead-5)', 0.9, 'opacity:' + lead) });
}
function buildFrame(q) {
  var g = add(q, 'g', null, 'hb-frame');
  var fc = new Faces(), defs = q.querySelector('defs');
  frameRuns(g, defs, SLAB, FPROF, MAT.sb, 'hb-fr');
  // The wing's leaf where knuckles pass: the crest of each stile beside
  // the handle's rest, rubbed bright.
  [-1, 1].forEach(function (sg) {
    var x = sg * (PX + 4.3), y0 = HY - 40, y1 = HY + 40;
    var top = proj([x, y1, 5.3]), bot = proj([x, y0, 5.3]);
    var id = 'hb-wear-' + (sg < 0 ? 'l' : 'r');
    lin(defs, id, 0, top[1], 0, bot[1], [[0, 'var(--lead-3)', 0], [0.25, 'var(--lead-5)', 0.85], [0.5, 'var(--lead-3)', 1], [0.75, 'var(--lead-5)', 0.85], [1, 'var(--lead-3)', 0]]);
    add(g, 'path', { d: path3([[x - 1.5, y0, 5.3], [x + 1.5, y0, 5.3], [x + 1.5, y1, 5.3], [x - 1.5, y1, 5.3]]), fill: U(id) });
  });
  // a boss on every outside corner of the setbacks, a cast fan on each, the
  // wing's leaf on the crowns of the upper ones, where they are handled
  [[PX, PY0, 0.45], [PX, PY1, 0.9], [SX1, SY1, 0.9], [SX2, SY2, 0.9]].forEach(function (c) {
    [-1, 1].forEach(function (sg) { boss(g, fc, sg * (c[0] + 3.2), c[1] + (c[1] === PY0 ? -3.2 : 3.2), 7, c[2]); });
  });
}

/* ------------------------------------------------------------ the crest */
function buildCrest(q) {
  var g = add(q, 'g', null, 'hb-crest');
  var fc = new Faces();
  // the finial: a fan, cast, standing on the head's rail
  var ol = [];
  for (var i = 0; i <= 36; i++) { var a2 = i / 36 * Math.PI; ol.push([Math.cos(a2) * FANR, Math.sin(a2) * FANR]); }
  prism(fc, { o: [0, FANY, -4], a: X3, b: Y3, c: Z3 }, ol, 0, 7.5, 1.4, MAT.sb);
  fc.flush(g);
  var rg = add(g, 'g', { transform: planeXf([0, FANY, 3.5], X3, DN), filter: U('hb-cast') });
  add(rg, 'path', { d: fanPath(0, 0, FANR - 2.8, 9, Math.PI, 2 * Math.PI) + 'M-4 0A4 4 0 0 1 4 0Z', style: F('var(--sb-3)') });
  // its rim in the wing's leaf: the crest of the board, turned to the light
  var rim = '';
  for (i = 0; i <= 24; i++) {
    var a3 = Math.PI - i / 24 * Math.PI, p = proj([Math.cos(a3) * (FANR - 0.8), FANY + Math.sin(a3) * (FANR - 0.8), 3.4]);
    rim += (i ? 'L' : 'M') + n2(p[0]) + ' ' + n2(p[1]);
  }
  add(g, 'path', { d: rim, style: S('var(--lead-3)', 1, 'opacity:.9;stroke-linecap:round') });
}

/* ------------------------------------------------------------ the meter */
function buildMeter(q) {
  var g = add(q, 'g', null, 'hb-meter');
  var fc = new Faces(), defs = q.querySelector('defs');
  // the drawn brass case and its bezel, turned
  turnedFace(g, defs, 'hb-case', [0, MY, 0], Z3, X3, Y3, [[0, MR + 5], [1.2, MR + 5], [2.7, MR + 4.5], [4, MR + 3.5], [5, MR + 2.2], [5.8, MR + 1], [5.9, MR]], MAT.bz);
  // the dial: ivory enamel, drawn in its own plane (at a 17.5 radius)
  var d = add(add(g, 'g', { transform: planeXf([0, MY, 5.2], X3, DN) }), 'g', { transform: 'scale(' + n2(MR / 17.5) + ')' });
  grad(defs, 'hb-dial', true, { cx: 0.42, cy: 0.38, r: 0.7 }, [[0, 'var(--dial-1)'], [0.7, 'var(--dial-0)'], [1, 'var(--dial-2)']]);
  add(d, 'circle', { cx: 0, cy: 0, r: 17.5, fill: U('hb-dial') });
  function P(r, deg) { var a = deg * DEG; return n2(r * Math.sin(a)) + ' ' + n2(3.5 - r * Math.cos(a)); }
  function arc(r0, r1, a0, a1) {
    return 'M' + P(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + P(r1, a1) + 'L' + P(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + P(r0, a0) + 'Z';
  }
  // the Salon's arc in gold leaf, the Bureau's in nickel, zero between
  add(d, 'path', { d: arc(10.2, 12.2, -56, -8), style: F('var(--au-3)') + ';stroke:var(--au-1);stroke-width:.3' });
  add(d, 'path', { d: arc(10.2, 12.2, 8, 56), style: F('var(--ag-2)') + ';stroke:var(--ag-1);stroke-width:.3' });
  var ticks = '', major = '';
  for (var t = -56; t <= 56; t += 7) {
    if (t === 0) continue;
    if (t % 14 === 0) major += 'M' + P(12.8, t) + 'L' + P(15.6, t);
    else ticks += 'M' + P(12.8, t) + 'L' + P(14.4, t);
  }
  add(d, 'path', { d: 'M' + P(9.6, 0) + 'L' + P(15.8, 0), style: S('var(--dial-ink)', 0.9) });
  add(d, 'path', { d: major, style: S('var(--dial-ink)', 0.6) });
  add(d, 'path', { d: ticks, style: S('var(--dial-ink)', 0.34) });
  add(d, 'path', { d: 'M' + P(12.8, -57) + 'A12.8 12.8 0 0 1 ' + P(12.8, 57), style: S('var(--dial-ink)', 0.3) });
  stamp(d, 'AMPERES', 0, 5.6, 1.9, S('var(--dial-ink)', 0.3, 'stroke-linecap:round;stroke-linejoin:round;opacity:.8'));
  var rays = '';
  for (var r = -60; r <= 60; r += 12) rays += 'M' + P(3, r) + 'L' + P(9, r);
  add(d, 'path', { d: rays, style: S('var(--dial-ink)', 0.25, 'opacity:.3') });
  // the bezel's shadow on the enamel, heaviest under its upper lip
  add(d, 'circle', { cx: 0.5, cy: 0.8, r: 16.9, style: S('#000', 1.6, 'opacity:.28'), filter: U('hb-soft') });
  // the case's shadow on the stone
  var c = proj(onStone([0, MY, 6]));
  add(q.querySelector('.hb-shadows'), 'ellipse', { cx: n2(c[0]), cy: n2(c[1]), rx: n2(MR + 6), ry: n2(MR + 3.5) });
}

/* ------------------------------------------------------------ switchgear */
/* A domed screw head on a face, its slot turned by hash. */
function screw(g, p, r, id, dome) {
  var sg = add(g, 'g', { transform: planeXf(p, X3, DN) });
  add(sg, 'circle', { cx: 0.35, cy: 0.5, r: n2(r), style: F('var(--sb-oil)') + ';opacity:.7' });
  add(sg, 'circle', { cx: 0, cy: 0, r: n2(r), fill: U(dome) });
  var a = rnd(id) * 180 * DEG, dx = Math.cos(a) * r * 0.8, dy = Math.sin(a) * r * 0.8;
  add(sg, 'path', { d: 'M' + n2(-dx) + ' ' + n2(-dy) + 'L' + n2(dx) + ' ' + n2(dy), style: S('var(--sb-oil)', n2(r * 0.34), 'stroke-linecap:round') });
}
/* A spring leaf of a jaw: a copper plate standing out of the jaw over (or
   under) the blade's path, its mouth turned away, and on the upper one the
   nut that sets the spring. The upper leaf is drawn on the board, and
   again over the blade by each pose that has the blade in the jaws. */
function jawLeaf(fc, jx, yp, upper) {
  var s = upper ? 1 : -1, yA = yp + s * TB / 2, yB = yA + s * LEAF, w = JAW_W;
  var y0 = Math.min(yA, yB), y1 = Math.max(yA, yB);
  boxY(fc, jx - w, jx + w, y0, y1, 5, LEAF_Z, 0.5, MAT.cu);
  var m = [[jx - w, yB, LEAF_Z], [jx + w, yB, LEAF_Z], [jx + w, yB + s * 2.4, LEAF_Z + 2.6], [jx - w, yB + s * 2.4, LEAF_Z + 2.6]];
  fc.push(m, vnorm([0, s, 1]), MAT.cu, { bias: 0.08 });
  if (upper) hexNut(fc, [jx, y1, 10.5], Y3, X3, Z3, 3.4, 2, MAT.cu);
}
function jaw(g, jx, yp, id) {
  var fc = new Faces(), w = JAW_W;
  boxZ(fc, jx - 15, jx + 15, yp - 13, yp + 13, 0, 5.5, 1.1, MAT.cu);
  fc.flush(g);
  screw(g, [jx - 11.8, yp - 7.5, 5.5], 2, id + '-s0', 'hb-cu-dome');
  screw(g, [jx + 11.8, yp + 7.5, 5.5], 2, id + '-s1', 'hb-cu-dome');
  jawLeaf(fc, jx, yp, false);
  fc.flush(g);
  // the slot between the leaves, dark where no blade sits
  add(g, 'path', { d: path3([[jx - w, yp - TB / 2, 5.6], [jx + w, yp - TB / 2, 5.6], [jx + w, yp + TB / 2, 5.6], [jx - w, yp + TB / 2, 5.6]]),
                   style: F('var(--sb-oil)') + ';opacity:.95' });
  add(g, 'path', { d: path3([[jx - w, yp - TB / 2, 5.6], [jx + w, yp - TB / 2, 5.6], [jx + w, yp - TB / 2, LEAF_Z], [jx - w, yp - TB / 2, LEAF_Z]]),
                   style: F('var(--sb-oil)') + ';opacity:.6' });
  jawLeaf(fc, jx, yp, true);
  fc.flush(g);
}
/* The hinge: a copper block and a clevis whose two cheeks hold the blade's
   heel, an upright pin through them and a nut on the pin. A cheek's
   outline is taken in (x, -z) and swept up the pin. */
var CHEEK_OL = (function () {
  var r = 9, ol = [[-r, -5.5], [r, -5.5]];
  for (var i = 0; i <= 10; i++) { var a = i / 10 * Math.PI; ol.push([r * Math.cos(a), -ZB - r * Math.sin(a)]); }
  return ol.reverse();
})();
function cheek(fc, yp, upper) {
  var s = upper ? 1 : -1, yA = yp + s * TB / 2, yB = yA + s * (LEAF + 0.6);
  prism(fc, FY, CHEEK_OL, Math.min(yA, yB), Math.max(yA, yB), 0.6, MAT.cu);
  if (upper) {
    turned(fc, [0, Math.max(yA, yB), ZB], Y3, X3, Z3, [[0, 5.2], [0.7, 5.2], [0.7, 0]], 18, MAT.cu);
    hexNut(fc, [0, Math.max(yA, yB) + 0.7, ZB], Y3, X3, Z3, 4.4, 2.6, MAT.cu);
    turned(fc, [0, Math.max(yA, yB) + 3.3, ZB], Y3, X3, Z3, [[0, 2.2], [1.2, 2.2], [1.8, 0]], 12, MAT.cu);
  }
}
function hinge(g, yp, id) {
  var fc = new Faces();
  boxZ(fc, -17, 17, yp - 13.5, yp + 13.5, 0, 5.5, 1.1, MAT.cu);
  fc.flush(g);
  screw(g, [-13.2, yp - 7, 5.5], 2, id + '-s0', 'hb-cu-dome');
  screw(g, [13.2, yp + 7, 5.5], 2, id + '-s1', 'hb-cu-dome');
  screw(g, [-13.2, yp + 7, 5.5], 2, id + '-s2', 'hb-cu-dome');
  screw(g, [13.2, yp - 7, 5.5], 2, id + '-s3', 'hb-cu-dome');
  cheek(fc, yp, false);
  fc.flush(g);
  cheek(fc, yp, true);
  fc.flush(g);
}
function facets(g, cx, cy, r, gradId) {
  var d = '', n = 12;
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
/* A pilot: a jewel lamp in a knurled brass bezel. */
function buildPilot(g, x, side) {
  var fc = new Faces();
  turnedFace(g, g.ownerSVGElement.querySelector('defs'), 'hb-bzl-' + side, [x, JWY, 0], Z3, X3, Y3,
             [[0, 11.2], [1.4, 11.2], [1.4, 10], [4.2, 10], [5.3, 9], [6, 7.8], [6.1, JR]], MAT.bz);
  // the knurl round the bezel's drum
  var kn = '';
  for (var k = 0; k < 36; k++) {
    var a = k * 10 * DEG;
    if (Math.sin(a) < -0.2) continue;
    var p0 = proj([x + Math.cos(a) * 10, JWY + Math.sin(a) * 10, 1.8]), p1 = proj([x + Math.cos(a) * 10, JWY + Math.sin(a) * 10, 4]);
    kn += 'M' + n2(p0[0]) + ' ' + n2(p0[1]) + 'L' + n2(p1[0]) + ' ' + n2(p1[1]);
  }
  add(g, 'path', { d: kn, style: S('var(--bz-0)', 0.5, 'opacity:.55') });
  // the jewel, dark: facets round a table
  var j = add(g, 'g', { transform: planeXf([x, JWY, 6.4], X3, DN) });
  add(j, 'circle', { cx: 0, cy: 0, r: JR, style: F('var(--jw-off-' + side + ')') });
  facets(j, 0, 0, JR, 'hb-facet-dark');
}
/* Shadows the fittings throw on the stone: each footprint carried down the
   key onto the marble and softened. */
function onStone(p) { return vsub(p, vmul(LIGHT, p[2] / LIGHT[2])); }
function castBox(g, x0, x1, y0, y1, z) {
  var pts = [];
  [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(function (c) {
    pts.push(proj([c[0], c[1], 0]));
    pts.push(proj(onStone([c[0], c[1], z])));
  });
  add(g, 'path', { d: pathOf(hull(pts)) });
}
function buildSwitch(q) {
  var sh = q.querySelector('.hb-shadows');
  var gear = add(q, 'g', null, 'hb-gear');
  ['salon', 'bureau'].forEach(function (side, s) {
    var sg = add(gear, 'g', { 'data-side': side }, 'hb-side');
    var jx = s ? JX : -JX;
    [PL, PU].forEach(function (yp, k) {
      castBox(sh, jx - 15, jx + 15, yp - 13, yp + 13, 5.5);
      castBox(sh, jx - JAW_W, jx + JAW_W, yp - TB / 2 - LEAF, yp + TB / 2 + LEAF, LEAF_Z);
      jaw(sg, jx, yp, 'board-jaw-' + side + '-' + k);
    });
    castBox(sh, (s ? JWX : -JWX) - 10, (s ? JWX : -JWX) + 10, JWY - 10, JWY + 10, 6);
    buildPilot(sg, s ? JWX : -JWX, side);
  });
  [PL, PU].forEach(function (yp, k) {
    castBox(sh, -17, 17, yp - 13.5, yp + 13.5, 5.5);
    castBox(sh, -9, 9, yp - TB / 2 - LEAF, yp + TB / 2 + LEAF, ZB + 9);
    hinge(gear, yp, 'board-hinge-' + k);
  });
  // the maker's plate under the hinge
  var mp = add(gear, 'g', { transform: planeXf([0, 74, 0.8], X3, DN) }, 'hb-maker');
  add(mp, 'ellipse', { cx: 0.8, cy: 1.1, rx: 17, ry: 7.6, style: F('var(--sb-oil)') + ';opacity:.55' });
  add(mp, 'ellipse', { cx: 0, cy: 0, rx: 17, ry: 7.6, fill: U('hb-bz-h') });
  add(mp, 'ellipse', { cx: 0, cy: 0, rx: 15, ry: 5.9, style: S('var(--bz-ink)', 0.4, 'opacity:.6') });
  stamp(mp, 'ATRIUM', 0, -4.4, 3.3, S('var(--bz-ink)', 0.42, 'stroke-linecap:round;stroke-linejoin:round;opacity:.85'));
  stamp(mp, '250 V', 0, 0.8, 2.3, S('var(--bz-ink)', 0.36, 'stroke-linecap:round;stroke-linejoin:round;opacity:.7'));
  // the panel's four bolts, bronze, domed
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (c) {
    var bg = add(gear, 'g', { transform: planeXf([c[0] * (PX - 12), c[1] > 0 ? PY1 - 12 : PY0 + 12, 1], X3, DN) });
    add(bg, 'circle', { cx: 0.6, cy: 0.9, r: 3.6, style: F('var(--sb-oil)') + ';opacity:.6' });
    add(bg, 'circle', { cx: 0, cy: 0, r: 3.6, fill: U('hb-sb-dome') });
    add(bg, 'circle', { cx: 0, cy: 0, r: 3.6, style: S('var(--sb-oil)', 0.4, 'opacity:.6') });
  });
}

/* The focus ring: the gates' marquee at the board's scale, a stepped
   outline round the silhouette, clear of both plates. Laid first, so
   everything stands in front of it. */
function buildFocus(q) {
  var m = 7, z = 6;
  var pts = [[-FANR - 6, FANY + FANR, z], [FANR + 6, FANY + FANR, z]];
  // the slab's setbacks, right side down, outside the frame
  [[SX2 + FW, SY2 + FW], [SX2 + FW, SY1 + FW], [SX1 + FW, SY1 + FW], [SX1 + FW, PY1 + FW], [PX + FW, PY1 + FW], [PX + FW, PY0 - FW]].forEach(function (p) {
    pts.push([p[0], p[1], z]);
  });
  pts.push([LEG_X + 22, PY0 - FW, z], [LEG_X + 22, PLY, 9], [PLX, PLY, PLZ1], [PLX, 0, PLZ1]);
  for (var i = pts.length - 1; i >= 2; i--) pts.push([-pts[i][0], pts[i][1], pts[i][2]]);
  pts.push([-FANR - 6, FANY + FANR, z]);
  pts = pts.slice(0, -1).map(proj);
  // the list runs clockwise on screen: each edge's left normal points in
  var out = pts.map(function (p, k) {
    var a = pts[(k + pts.length - 1) % pts.length], c = pts[(k + 1) % pts.length];
    var n1 = inN(a, p), n2v = inN(p, c);
    return [p[0] - (n1[0] + n2v[0]) * m, p[1] - (n1[1] + n2v[1]) * m];
  });
  var d = pathOf(out);
  var fg = add(q, 'g', null, 'hb-focus-g hb-noptr');
  add(fg, 'path', { d: d }, 'hb-focus-bed');
  add(fg, 'path', { d: d }, 'hb-focus');
  add(fg, 'path', { d: d }, 'hb-focus-bulbs');
}

function buildBoard(q) {
  SHEEN = true;
  q.setAttribute('viewBox', '0 0 ' + BOX_W + ' ' + BOX_H);
  buildDefs(q);
  buildFocus(q);
  buildFloor(q);
  buildPlinth(q);
  buildStand(q);
  buildPanel(q);
  add(q, 'g', { filter: U('hb-soft2') }, 'hb-shadows hb-noptr');
  buildFrame(q);
  buildCrest(q);
  buildMeter(q);
  buildSwitch(q);
  SHEEN = false;
}

/* ------------------------------------------------------------ the swing */
/* The moving parts at blade angle phi (0 = in the Salon's jaws, 180 = in
   the Bureau's). A blade's frame: a along the blade, b across its broad
   face (out of the panel at rest), c up the pin. */
function bladeFrame(phi, y) {
  var a = phi * DEG;
  return { o: [0, y, ZB], a: [-Math.cos(a), 0, Math.sin(a)], b: [Math.sin(a), 0, Math.cos(a)], c: Y3 };
}
/* A blade's broad face: the heel rounded about the pin, the tip squared
   with its corners eased; counter-clockwise. */
var BLADE_OL = (function () {
  var r = WB / 2, out = [[0, -r], [BL - 2, -r], [BL, -r + 2], [BL, r - 2], [BL - 2, r], [0, r]];
  for (var i = 1; i < 6; i++) { var b = Math.PI / 2 + i / 6 * Math.PI; out.push([Math.cos(b) * r, Math.sin(b) * r]); }
  return out;
})();

/* A turned part in a pose: its silhouette as one path and its shading as a
   gradient across it, sampled from the surface's normals, so the grip
   reads as round at every angle. */
function turnedShape(g, defs, id, o, ax, up, prof, i0, i1, m, eb) {
  var e = vnorm(vcross(ax, up)), pts = [], j, k, R = 0;
  for (j = i0; j <= i1; j++) {
    var t = prof[j][0], r = prof[j][1];
    R = Math.max(R, r);
    for (k = 0; k < 24; k++) {
      var a = k / 24 * 2 * Math.PI;
      pts.push(proj(vadd(vadd(o, vmul(ax, t)), vadd(vmul(up, Math.cos(a) * r), vmul(e, Math.sin(a) * r)))));
    }
  }
  var mid = vadd(o, vmul(ax, (prof[i0][0] + prof[i1][0]) / 2)), v = viewAt(mid);
  var across = vcross(ax, v), al = Math.hypot(across[0], across[1], across[2]);
  across = al < 0.08 ? X3 : vmul(across, 1 / al);
  var vp = vnorm(vsub(v, vmul(ax, vdot(v, ax))));
  var p0 = proj(vsub(mid, vmul(across, R))), p1 = proj(vadd(mid, vmul(across, R)));
  var stops = [];
  for (k = 0; k <= 12; k++) {
    var b = Math.asin(Math.max(-1, Math.min(1, -1 + k / 6)));
    var n = vnorm(vadd(vmul(across, Math.sin(b)), vmul(vp, Math.cos(b))));
    var col;
    if (eb) {
      // ebonite: black, a warm bloom where it faces the key, and the lamp
      // and the lit wall mirrored in its polish
      var rr = vsub(vmul(n, 2 * vdot(n, v)), v);
      var sp = Math.pow(Math.max(0, vdot(rr, LIGHT)), 60), band = Math.max(0, 1 - Math.abs(rr[1] - 0.24) / 0.13);
      var base = tone(m, clamp01(0.1 + 0.34 * Math.max(0, vdot(n, LIGHT)) + 0.2 * envT(rr)));
      var hi = Math.min(1, sp * 1.5 + band * 0.3);
      col = hi > 0.02 ? 'color-mix(in srgb, var(--eb-hi) ' + Math.round(hi * 100) + '%, ' + base + ')' : base;
    } else col = tone(m, shadeT(n, mid, m));
    stops.push([n2(k / 12), col]);
  }
  lin(defs, id, p0[0], p0[1], p1[0], p1[1], stops);
  add(g, 'path', { d: pathOf(hull(pts)), fill: U(id) });
}

var POSE_A = (function () {
  var h = [0, 1.5, 3, 4.5, 6, 8, 10, 12.5, 15, 18, 22, 26, 31, 36, 42, 48, 54, 60, 67, 74, 82, 90];
  return h.concat(h.slice(0, -1).reverse().map(function (a) { return 180 - a; }));
})();
/* The swing is laid in five sheets of one SVG: the lower blade with every
   part's shadow; the lower pole's top cheek and top leaves over it; the
   upper blade; the upper pole's cheek and leaves; the crossbar and the
   handle. Seen from above, whatever stands higher or further out is nearer
   the eye, so the order holds at every angle: the upper blade passes in
   front of the lower jaws, and the handle in front of everything. Each
   moving sheet holds one group per pose; the fittings are drawn once. */
var stacks = null, poses = [], shown = [];

function poseGroup(k, i) {
  var g = E('g', { style: 'opacity:0;visibility:hidden' }, 'sw-pose');
  var next = null;
  for (var j = i + 1; j < poses.length; j++) if (poses[j]) { next = poses[j][k]; break; }
  stacks[k].insertBefore(g, next);
  return g;
}
function buildPose(i) {
  if (poses[i]) return poses[i];
  var phi = POSE_A[i], sn = Math.sin(phi * DEG);
  var P = [poseGroup(0, i), poseGroup(1, i), poseGroup(2, i)];
  poses[i] = P;
  var id = 'sp' + i;
  var FL = bladeFrame(phi, PL), FU = bladeFrame(phi, PU), d = FL.a, e = FL.b;
  // Their shadows on the marble, while they are near it.
  var shade = add(P[0], 'g', { filter: U('sw-soft') }, 'sw-shade');
  function shadowOf(pts3, zc) {
    var op = clamp01(1.5 - (zc - ZB) / 26);
    if (op <= 0.02) return;
    add(shade, 'path', { d: pathOf(hull(pts3.map(function (p) { return proj(onStone(p)); }))), style: 'opacity:' + n2(op) });
  }
  // the heel is under the cheeks: only the run out of the clevis casts
  [FL, FU].forEach(function (F3) {
    shadowOf(BLADE_OL.filter(function (p) { return p[0] > 6; }).map(function (p) { return at(F3, p[0], p[1], 0); }), ZB + sn * BL / 2);
  });
  var bar = [];
  [PL - XBY, PU + XBY].forEach(function (y) {
    [[XB0, -XBQ], [XB1, -XBQ], [XB1, XBQ], [XB0, XBQ]].forEach(function (c) { bar.push(at(FL, c[0], c[1], y - PL)); });
  });
  shadowOf(bar, ZB + sn * BL);
  var ho = [0, HY, ZB], hpts = [];
  HANDLE.forEach(function (p, j) {
    if (j % 2) return;
    for (var k2 = 0; k2 < 12; k2++) {
      var a2 = k2 / 12 * 2 * Math.PI;
      hpts.push(vadd(vadd(ho, vmul(d, XB1 + p[0])), vadd(vmul(Y3, Math.cos(a2) * p[1]), vmul(e, Math.sin(a2) * p[1]))));
    }
  });
  shadowOf(hpts, ZB + sn * (XB1 + H_END * 0.6));

  var fc = new Faces();
  [[FL, PL, P[0]], [FU, PU, P[1]]].forEach(function (pole) {
    var F3 = pole[0], g = pole[2];
    var defs = add(g, 'defs');
    prism(fc, F3, BLADE_OL, -TB / 2, TB / 2, 1.9, MAT.cu);
    fc.flush(g);
    // The broad face: the rolling's grain laid along the blade, the room's
    // light as a streak across it nearer the far arris, and the run the
    // jaws have burnished bright in a thousand throws.
    var top = pathOf(inset(BLADE_OL, 1.9).map(function (p) { return proj(at(F3, p[0], p[1], TB / 2)); }));
    var o0 = proj(at(F3, 0, 0, TB / 2)), oa = proj(at(F3, 1, 0, TB / 2)), ob = proj(at(F3, 0, 1, TB / 2));
    var bid = id + '-b' + pole[1];
    pattern(defs, bid + 'g', '/static/assets/tex/brush-copper.webp', 26,
            'matrix(' + [oa[0] - o0[0], oa[1] - o0[1], ob[0] - o0[0], ob[1] - o0[1], o0[0], o0[1]].map(n2).join(' ') + ')');
    add(g, 'path', { d: top, fill: U(bid + 'g'), style: 'opacity:var(--cu-tex)' });
    var q0 = proj(at(F3, BL / 2, WB / 2, TB / 2)), q1 = proj(at(F3, BL / 2, -WB / 2, TB / 2));
    lin(defs, bid + 'x', q0[0], q0[1], q1[0], q1[1], [[0, 'var(--kc-0)', 0.35], [0.2, 'var(--kc-0)', 0], [0.5, 'var(--kc-5)', 0.1],
        [0.62, 'var(--kc-5)', 0.55], [0.7, 'var(--kc-5)', 0.12], [0.9, 'var(--kc-0)', 0.05], [1, 'var(--kc-0)', 0.4]]);
    add(g, 'path', { d: top, fill: U(bid + 'x') });
    var h0 = proj(at(F3, 0, 0, TB / 2)), h1 = proj(at(F3, BL, 0, TB / 2));
    lin(defs, bid, h0[0], h0[1], h1[0], h1[1], [[0, 'var(--kc-0)', 0.3], [0.2, 'var(--kc-5)', 0], [0.66, 'var(--kc-5)', 0.06], [0.76, 'var(--kc-5)', 0.4],
        [0.88, 'var(--kc-5)', 0.5], [0.96, 'var(--kc-5)', 0.14], [1, 'var(--kc-5)', 0]]);
    add(g, 'path', { d: top, fill: U(bid) });
  });
  // the crossbar joins the tips, riveted through
  var g = P[2], defs = add(g, 'defs');
  prism(fc, { o: [0, 0, ZB], a: d, b: e, c: Y3 }, rectO(XB0, XB1, -XBQ, XBQ), PL - XBY, PU + XBY, 1.2, MAT.eb);
  fc.flush(g);
  [PL, PU].forEach(function (yp) {
    var rp = at(FL, BL - 1.5, XBQ + 0.1, yp - PL);
    if (vdot(e, viewAt(rp)) > 0.05) {
      add(add(g, 'g', { transform: planeXf(rp, vmul(d, -1), DN) }), 'circle', { cx: 0, cy: 0, r: 2.4, fill: U('sw-rivet') });
    }
  });
  // the handle: the ferrule, then the grip and its end
  var hbase = vadd(ho, vmul(d, XB1));
  turnedShape(g, defs, id + '-f', hbase, d, Y3, HANDLE, 0, H_FER, MAT.bz, false);
  turnedShape(g, defs, id + '-g', hbase, d, Y3, HANDLE, H_FER + 1, HANDLE.length - 1, MAT.eb, true);
  // the domed end catches the lamp as it comes round toward the room
  var DOME = HANDLE[HANDLE.length - 9], dc = vadd(hbase, vmul(d, DOME[0])), face = vdot(d, viewAt(dc));
  if (face > 0.12) {
    // the point of the dome whose normal halves the key and the eye
    var hv = vnorm(vadd(LIGHT, viewAt(dc)));
    var hd = vdot(hv, d), hr = vnorm(vsub(hv, vmul(d, hd)));
    var ang = Math.acos(Math.max(0, Math.min(1, hd)));
    var spot = vadd(dc, vadd(vmul(d, (H_END - DOME[0]) * Math.cos(ang)), vmul(hr, DOME[1] * Math.sin(ang))));
    var pp = proj(spot), k = clamp01((face - 0.12) / 0.5);
    grad(defs, id + '-d', true, { gradientUnits: 'userSpaceOnUse', cx: n2(pp[0]), cy: n2(pp[1]), r: 6.5 },
         [[0, 'var(--eb-hi)', n2(k)], [0.18, 'var(--eb-hi)', n2(0.6 * k)], [0.45, 'var(--eb-hi)', n2(0.12 * k)], [1, 'var(--eb-hi)', 0]]);
    add(g, 'circle', { cx: n2(pp[0]), cy: n2(pp[1]), r: 6.5, fill: U(id + '-d') });
  }
  return P;
}
function layer(fx, cls) {
  var s = E('svg', { viewBox: '0 0 ' + BOX_W + ' ' + BOX_H, 'aria-hidden': 'true', focusable: 'false' }, cls);
  fx.appendChild(s);
  return s;
}
function buildSwing(sw) {
  var s = layer(sw, 'sw-poses');
  var d = add(s, 'defs');
  add(add(d, 'filter', { id: 'sw-soft', x: '-20%', y: '-40%', width: '140%', height: '180%' }), 'feGaussianBlur', { stdDeviation: 1.5 });
  grad(d, 'sw-rivet', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--kc-5)'], [0.45, 'var(--kc-3)'], [1, 'var(--kc-0)']]);
  stacks = [];
  [PL, PU, null].forEach(function (yp) {
    stacks.push(add(s, 'g', null, 'sw-stack'));
    if (yp === null) return;
    // the pole's fittings that stand over its blade, drawn once
    var over = add(s, 'g', null, 'sw-over'), fc = new Faces();
    [-JX, JX].forEach(function (jx) { jawLeaf(fc, jx, yp, true); fc.flush(over); });
    cheek(fc, yp, true);
    fc.flush(over);
  });
  poses = new Array(POSE_A.length);
}
function showPose(i, on) {
  buildPose(i).forEach(function (g) { g.style.opacity = on ? '1' : '0'; g.style.visibility = on ? 'visible' : 'hidden'; });
}
/* The drive: 0 = the blades in the Salon's jaws, 1 = in the Bureau's. It
   shows the pose nearest the blades' angle, whole. The poses are 1.5
   degrees apart where the blades seat and bounce and 5 to 8 through the
   swing, which a frame of the throw crosses faster than that; a crossfade
   between two poses showed two handles in any frame caught between them. */
function drivePoses(v) {
  if (!stacks) return;
  var phi = clamp01(v) * 180, i = 0;
  while (i < POSE_A.length - 2 && POSE_A[i + 1] <= phi) i++;
  if (phi - POSE_A[i] > POSE_A[i + 1] - phi) i++;
  if (shown.length === 1 && shown[0] === i) return;
  showPose(i, 1);
  shown.forEach(function (k) { if (k !== i) showPose(k, 0); });
  shown = [i];
}
/* The rest of the poses are drawn while the hall is idle, so a throw only
   shows them. */
function prebuild() {
  var later = window.requestIdleCallback || function (f) { return setTimeout(f, 40); };
  var i = 0;
  later(function step(dl) {
    do { if (!poses[i]) buildPose(i); i++; } while (i < POSE_A.length && dl && dl.timeRemaining && dl.timeRemaining() > 3);
    if (i < POSE_A.length) later(step);
  });
}

/* ------------------------------------------------------------ lamps and meter */
function buildFx(fx) {
  var face = path3(facePts(-PX, PX, PY0, PY1, 0));
  // Night: each lit pilot throws its light on its half of the panel.
  ['salon', 'bureau'].forEach(function (side, s) {
    var p = layer(fx, 'sw-pool sw-drive sw-pool-' + side);
    var c = proj([s ? JWX : -JWX, JWY - 6, 0]);
    grad(add(p, 'defs'), 'sw-pool-g-' + side, true, { gradientUnits: 'userSpaceOnUse', cx: n2(c[0]), cy: n2(c[1]), r: 150,
         gradientTransform: 'translate(' + n2(c[0]) + ' ' + n2(c[1]) + ') scale(1 .72) translate(' + n2(-c[0]) + ' ' + n2(-c[1]) + ')' },
         [[0, 'var(--pool-' + side + ')'], [0.3, 'var(--pool-' + side + ')', 0.5], [1, 'var(--pool-' + side + ')', 0]]);
    add(p, 'path', { d: face, fill: U('sw-pool-g-' + side) });
  });
  // The pilots, lit: each its own layer, faded by opacity.
  ['salon', 'bureau'].forEach(function (side, s) {
    var p = layer(fx, 'sw-lit sw-drive sw-lit-' + side);
    var d = add(p, 'defs');
    var x = s ? JWX : -JWX, c = proj([x, JWY, 6.4]);
    grad(d, 'sw-jw-' + side, true, { cx: 0.5, cy: 0.55, r: 0.55 }, [[0, 'var(--jw-core-' + side + ')'], [0.35, 'var(--jw-mid-' + side + ')'], [1, 'var(--jw-rim-' + side + ')']]);
    grad(d, 'sw-bloom-' + side, true, { cx: 0.5, cy: 0.5, r: 0.5 }, [[0, 'var(--jw-bloom-' + side + ')'], [0.4, 'var(--jw-bloom-' + side + ')', 0.35], [1, 'var(--jw-bloom-' + side + ')', 0]]);
    grad(d, 'sw-facet-' + side, true, { cx: 0.4, cy: 0.35, r: 0.8 }, [[0, '#fff', 0.55], [1, '#fff', 0.1]]);
    add(p, 'circle', { cx: n2(c[0]), cy: n2(c[1]), r: 34, fill: U('sw-bloom-' + side) }, 'sw-bloom');
    var j = add(p, 'g', { transform: planeXf([x, JWY, 6.4], X3, DN) });
    add(j, 'circle', { cx: 0, cy: 0, r: JR, fill: U('sw-jw-' + side) });
    facets(j, 0, 0, JR, 'sw-facet-' + side);
  });
  // The meter's lamp (night), its needle and its glass.
  var dialXf = planeXf([0, MY, 5.4], X3, DN);
  var ml = layer(fx, 'sw-dial-lamp');
  grad(add(ml, 'defs'), 'sw-dial-lamp-g', true, { cx: 0.5, cy: 0.6, r: 0.55 },
       [[0, 'var(--dial-lamp)'], [0.7, 'var(--dial-lamp)', 0.55], [1, 'var(--dial-lamp)', 0.1]]);
  add(add(ml, 'g', { transform: dialXf }), 'circle', { cx: 0, cy: 0, r: MR, fill: U('sw-dial-lamp-g') });
  var nd = layer(fx, 'sw-needle sw-drive sw-raw');
  grad(add(nd, 'defs'), 'sw-cap', true, { cx: 0.36, cy: 0.3, r: 0.8 }, [[0, 'var(--bz-4)'], [0.5, 'var(--bz-2)'], [1, 'var(--bz-0)']]);
  var ng = add(nd, 'g', { transform: dialXf });
  var needle = 'M-0.75 3.5L-0.3 -11.2L0 -12.4L0.3 -11.2L0.75 3.5Z';
  add(ng, 'path', { d: needle, transform: 'translate(.7 1)', style: F('#000') + ';opacity:.3' });
  add(ng, 'path', { d: needle, style: F('var(--needle-ink)') });
  add(ng, 'path', { d: 'M-1.4 -5.2L0 -9.6L1.4 -5.2Z', style: F('var(--needle-ink)') });
  add(ng, 'circle', { cx: 0, cy: 7.4, r: 1.9, style: F('var(--needle-ink)') });
  add(ng, 'circle', { cx: 0, cy: 3.5, r: 2.6, fill: U('sw-cap') });
  var gl = layer(fx, 'sw-glass');
  grad(add(gl, 'defs'), 'sw-glass-g', false, { x1: 0.1, y1: 0, x2: 0.7, y2: 1 },
       [[0, '#fff', 0], [0.3, '#fff', 0], [0.38, 'var(--glass-band)'], [0.45, '#fff', 0.06], [0.52, '#fff', 0], [1, '#fff', 0]]);
  var gg = add(gl, 'g', { transform: planeXf([0, MY, 6.2], X3, DN) });
  add(gg, 'circle', { cx: 0, cy: 0, r: MR + 0.4, fill: U('sw-glass-g') });
  add(gg, 'ellipse', { cx: -5.5, cy: -8.5, rx: 5, ry: 2.2, transform: 'rotate(-28 -5.5 -8.5)', style: F('#fff') + ';opacity:.22' });

}
/* The swing and the flash of the break, over the plates. */
function buildSw(sw) {
  buildSwing(sw);
  // The flash of the break: a spark at the mouth of each pair of jaws.
  ['salon', 'bureau'].forEach(function (side, s) {
    var sp = layer(sw, 'sw-spark sw-spark-' + side);
    var jx = s ? JX : -JX;
    grad(add(sp, 'defs'), 'sw-arc-' + side, true, { cx: 0.5, cy: 0.5, r: 0.5 }, [[0, 'var(--arc-core)'], [0.25, 'var(--arc-mid)', 0.8], [1, 'var(--arc-mid)', 0]]);
    [PL, PU].forEach(function (y, k) {
      var c = proj([jx + (s ? -9 : 9), y, LEAF_Z + 1]), sid = 'board-spark-' + side + '-' + k;
      add(sp, 'ellipse', { cx: n2(c[0]), cy: n2(c[1]), rx: 22, ry: 14, fill: U('sw-arc-' + side) }, 'sw-arc-halo');
      var d2 = '';
      for (var r = 0; r < 9; r++) {
        var a = (r / 9) * 2 * Math.PI + rnd(sid, r) * 0.5, len = 5 + rnd(sid, r + 20) * 9;
        var mx = c[0] + Math.cos(a) * len * 0.5 + (rnd(sid, r + 40) - 0.5) * 2.4, my = c[1] + Math.sin(a) * len * 0.35;
        d2 += 'M' + n2(c[0]) + ' ' + n2(c[1]) + 'L' + n2(mx) + ' ' + n2(my) + 'L' + n2(c[0] + Math.cos(a) * len) + ' ' + n2(c[1] + Math.sin(a) * len * 0.7);
      }
      add(sp, 'path', { d: d2, style: S('var(--arc-core)', 0.8, 'stroke-linecap:round;stroke-linejoin:round') });
      add(sp, 'circle', { cx: n2(c[0]), cy: n2(c[1]), r: 2.8, style: F('var(--arc-core)') });
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
    var q = desk.querySelector('.hl-board'), fx = desk.querySelector('.desk-fx'), sw = desk.querySelector('.desk-sw');
    if (q && !q.firstChild) buildBoard(q);
    if (fx && !fx.firstChild) buildFx(fx);
    if (sw && !sw.firstChild) { buildSw(sw); prebuild(); }
    dressPlates(desk);
    // Where the parts CSS moves and places stand, in board units.
    var st = desk.style;
    var hp = proj([0, HY, ZB]), mc = proj([0, MY, 5.4]);
    var mk = (proj([0, MY + 1, 5.4])[1] - mc[1]) / (proj([1, MY, 5.4])[0] - mc[0]);
    st.setProperty('--hb-w', BOX_W + 'px');
    st.setProperty('--hb-h', BOX_H + 'px');
    st.setProperty('--sw-hx', n2(hp[0]) + 'px');
    st.setProperty('--sw-hy', n2(hp[1]) + 'px');
    st.setProperty('--sw-arm', n2((XB1 + H_END + 1) * 1.06) + 'px');
    st.setProperty('--sw-k', n2(SP));
    st.setProperty('--sw-mx', n2(mc[0]) + 'px');
    st.setProperty('--sw-my', n2(mc[1]) + 'px');
    st.setProperty('--sw-mk', n2(Math.abs(mk)));
    var pl = proj([-JX, PLATE_T, 1]), pr = proj([JX, PLATE_T, 1]);
    st.setProperty('--sw-plate-t', n2(pl[1]) + 'px');
    st.setProperty('--sw-plate-l', n2(pl[0]) + 'px');
    st.setProperty('--sw-plate-r', n2(pr[0]) + 'px');
  },
  drive: drivePoses
};
})();
