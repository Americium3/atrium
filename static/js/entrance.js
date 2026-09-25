/* The entrance: through the doors (DESIGN.md, "Entrance animation").

   The reader stands on the pavement in front of the picture palace. Over
   the entrance hangs the canopy: ATRIUM in bulbs on its fascia, a coffered
   soffit of downlights under it. Ahead is the entrance bay, a bronze
   storefront of three pairs of doors under a row of fanlights. Behind the
   doors is the foyer, and its far wall is the hall itself. The reader walks
   in: the centre pair swings open ahead of them, the canopy goes overhead,
   and the hall lands exactly where it rests.

   The street is a small projective scene. Every object is a flat piece in
   the world (metres; x to the right, y up from the pavement, z out from
   the door plane toward the street), and one camera looks at all of it.
   The camera is a person: it walks at a brisk pace with a small bob and
   sway at the rhythm of its steps, slows at the threshold, and lowers its
   gaze from the sign to the doors as it comes (a real pitch about the eye,
   not a shifted lens). Every piece carries the same camera as a CSS
   transform list, perspective() with a pitch and a translation, followed
   by the piece's own fixed place in the world. The lists are the same
   functions in every keyframe, so the browser interpolates the camera's
   own numbers and every frame is a true projection: nothing wobbles
   between keyframes. The camera is sampled every STEP ms into Web
   Animations keyframes, so every moving part runs on the compositor and the
   whole timeline can be stopped at any millisecond (seek()).

   The foyer is built as a room: its floor, ceiling and side walls run from
   the doors back to the far wall, and the far wall is the hall. The hall is
   not a picture of the hall: its own boxes (#masthead, #ticker, #backwall,
   #stage, the cases, #floorplane and #signal-desk) are posed by transform
   alone, the wall pieces as a plane FOYER metres behind the doors, the
   floor as the floor, re-projected through its own homography, and the
   board as a plane standing on it. At the walk's last frame every one of
   those transforms is the identity. Their layout never changes, so the
   hall lands without laying itself out again.

   Every layer of every piece is painted once, while the street stands
   before the clock starts, into canvases. A layer is cut into tiles, and
   each tile is painted at the most pixels per metre the walk ever shows it
   at (times devicePixelRatio): a tile that leaves the screen early is
   painted small, the last strip of a jamb large. The compositor then only
   moves textures; nothing is rastered again during the walk. */
(function () {
'use strict';

var root = document.documentElement;
var $ = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

function hash01(n) {
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
var D2R = Math.PI / 180;
/* cubic-bezier(x1, y1, x2, y2) as a function of progress. */
function bezier(x1, y1, x2, y2) {
  var bx = function (t) { return 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t; };
  var by = function (t) { return 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t; };
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var lo = 0, hi = 1, t = x;
    for (var i = 0; i < 40; i++) {
      var v = bx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return by(t);
  };
}
/* A monotone cubic through [x, y] pairs: smooth, never overshooting, flat
   at both ends. */
function monotone(pts) {
  var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
  var n = xs.length, d = [], m = [], i;
  for (i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = 0; m[n - 1] = 0;
  for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    var a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { var tau = 3 / Math.sqrt(h); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  return function (x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    var k = 0;
    while (x > xs[k + 1]) k++;
    var hh = xs[k + 1] - xs[k], t = (x - xs[k]) / hh, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * hh * m[k] +
      (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * hh * m[k + 1];
  };
}
var f2 = function (v) { return (Math.round(v * 100) / 100).toString(); };
var f3 = function (v) { return (Math.round(v * 1000) / 1000).toString(); };
var f4 = function (v) { return (Math.round(v * 10000) / 10000).toString(); };
var f5 = function (v) { return (Math.round(v * 100000) / 100000).toString(); };
function norm(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }

/* ----- The street, in metres -------------------------------------------- */
var EYE = 1.6;          // eye height over the pavement
var U = 100;            // CSS px per metre inside every piece
var OPEN = 1.0;         // half the centre pair's opening
var DOOR_H = 2.7;       // the doors' head
var JAMB = 0.12;        // the bronze jamb either side of the centre pair
var SIDE = 3.05;        // outer edge of the side pairs
var BAY = 3.55;         // outer edge of the bay's stepped surround
var HEAD = 3.4;         // top of the transom; the soffit meets the wall here
var REVEAL = 0.16;      // the storefront's depth: the doorway's bronze reveal
var CAN = { z: 2.4, y0: 3.4, y1: 4.8, half: 6.5, crest: 5.36 };
var STAN_Z = 1.15;      // the stanchions' line, out from the doors
var WALL = 15;          // half the facade's width, cut to the screen (dress)
var UPPER = 11;         // top of the facade we ever see, likewise
var SPLIT = 6.55;       // where the wall's near and far pieces meet
var FK = 0.95;          // the lens: focal length in screen heights
var Z0 = 5.7;           // where the reader stands, out from the doors
var STRIDE = 1.1;       // one step of a brisk walk
var BOB = 0.03, SWAY = 0.022, ROLL = 0.3, NOD = 0.2;   // m, m, deg, deg
/* By day a low sun stands behind the reader's left shoulder, 15 degrees up;
   this is the way to it. */
var SUN = norm([-0.4, 0.26, 0.88]);
var LIGHT = [-SUN[0], -SUN[1], -SUN[2]];

/* ----- The timeline, ms from the start of the clock ---------------------- */
/* The clock starts as the street is uncovered: until then a plate of the
   street's own dark (by day, its stone) holds the screen while the street
   is painted under it, and it lifts over the first `reveal` ms. */
var STEP = 25;
var EASE_TILT = bezier(0.45, 0.0, 0.3, 1);
var EASE_SWING = bezier(0.42, 0.0, 0.24, 1);
var TIMES = {
  onyx: {
    reveal: [0, 200],
    letters: 130, letterGap: 68,
    haze: [150, 610],
    posters: 340,
    soffit: 400, soffitGap: 60,
    chase: 600, chaseStep: 100,
    walk: [210, 2660],
    tilt: [270, 2290],
    doors: 680, doorsDur: 900, doorLag: 60,
    spill: [720, 1380],
    veil: [2110, 2600],
    house: 2130, bayGap: 100, lampUp: 300, marquee: 2170,
    doneFade: 2640
  },
  ivory: {
    reveal: [0, 200],
    cloud: [40, 480],
    shadow: [150, 620],
    sheen: 320, sheenGap: 38, sheenDur: 200,
    haze: [100, 620],
    walk: [340, 2640],
    tilt: [400, 2280],
    doors: 640, doorsDur: 900, doorLag: 55,
    sun: [220, 760],
    sunOut: [2100, 2650],
    veil: [1760, 2620],
    doneFade: 2600,
    end: 2660
  }
};

/* ----- State --------------------------------------------------------------- */
var S = null;           // the dressed scene
var anims = [];         // every animation the entrance runs, one clock
var BIG = 1e7;          // how far ahead a held animation's start is parked

/* =========================================================================
   Textures: fetched once and inlined, since an SVG drawn as an image may
   not load anything from outside itself.
   ========================================================================= */
var TEX_FILES = {
  onyx: ['stone-portoro.webp', 'terrazzo-onyx.webp', 'grain-frost-small.webp', 'relief-frieze-night.webp', 'carpet-field.webp', 'carpet-border.webp'],
  ivory: ['stone-calacatta.webp', 'terrazzo-ivory.webp', 'grain-frost-small.webp', 'relief-frieze-day.webp', 'carpet-field.webp', 'carpet-border.webp']
};
var TEX = {}, TEX_P = {};
/* Fetched when the plate is first sketched, and only this theme's: a load
   the entrance does not play for (?entrance=0, reduced motion) fetches
   none of them. The frost's grain lies at a sixth of its strength over
   etching seen at most a metre and a half wide, so it comes baked at half
   size (grain-frost-small.webp): made small in the page, the first
   encode held the paint back 1.4s on a new profile. */
function texFile(f) {
  if (!TEX_P[f]) {
    TEX_P[f] = fetch('/static/assets/tex/' + f).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
      if (!b) return null;
      return new Promise(function (res) {
        var fr = new FileReader();
        fr.onload = function () { TEX[f] = fr.result; res(); };
        fr.onerror = function () { res(); };
        fr.readAsDataURL(b);
      });
    }).catch(function () { return null; });
  }
  return TEX_P[f];
}
function texReady(theme) { return Promise.all(TEX_FILES[theme].map(texFile)); }

/* Every face the canvases set text in, loaded before anything is painted
   (a caption painted in the fallback face would stay in it). A font that
   has not come in 1.5s is given up on. */
var FACES = ['500 20px "EB Garamond"', '560 20px "EB Garamond"'];
var FACES_ZH = ['500 20px "LXGW Heart Serif"'];
function faces() { return root.lang === 'zh' ? FACES.concat(FACES_ZH) : FACES; }
function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  var all = Promise.all(faces().map(function (f) { return document.fonts.load(f); }));
  return Promise.race([all, new Promise(function (r) { setTimeout(r, 1500); })]).catch(function () { return null; });
}

/* =========================================================================
   Camera: a person walking in, eye 1.6 m up
   ========================================================================= */
/* The pace of the walk as a shape: a first step from standing, a steady
   brisk walk, a little slower at the threshold, and standing still as the
   hall lands. Integrated to the distance walked. */
var PACE = monotone([[0, 0], [0.05, 0.2], [0.13, 0.72], [0.22, 1], [0.62, 1], [0.8, 0.84],
  [0.9, 0.64], [0.965, 0.3], [1, 0]]);
function Walk(t, len) {
  var a = t.walk[0], b = t.walk[1], n = Math.ceil(b - a), cum = [0], v = [PACE(0)], total = 0;
  for (var i = 1; i <= n; i++) {
    var s = PACE(i / n);
    total += (v[i - 1] + s) / 2;
    cum.push(total); v.push(s);
  }
  this.a = a; this.n = n; this.cum = cum; this.v = v; this.total = total; this.len = len;
  // metres a second at the steady pace
  this.speed = len * 1000 / total;
}
Walk.prototype.at = function (ms) {
  var x = ms - this.a;
  if (x <= 0) return { s: 0, v: 0 };
  if (x >= this.n) return { s: this.len, v: 0 };
  var i = Math.floor(x), fr = x - i, j = Math.min(i + 1, this.n);
  return {
    s: this.len * (this.cum[i] + (this.cum[j] - this.cum[i]) * fr) / this.total,
    v: this.v[i] + (this.v[j] - this.v[i]) * fr
  };
};

function Camera(o) {
  this.W = o.W; this.H = o.H; this.Px = o.W / 2; this.Py = o.Py; this.f = o.f; this.t = o.t;
  this.zEnd = o.zEnd; this.z0 = o.z0;
  this.walk = new Walk(o.t, o.z0 - o.zEnd);
  this.walkEnd = o.t.walk[1];
  // Looking up at the sign: the fascia's top moulding just under the top
  // of the screen.
  var aTop = Math.atan((CAN.y1 + 0.06 - EYE) / (o.z0 - CAN.z)), aScreen = Math.atan(0.98 * o.Py / o.f);
  this.pitch0 = Math.max(3, Math.min(21, (aTop - aScreen) / D2R));
}
/* Where the eye is at ms, and which way it looks. At the end of the walk it
   stands at zEnd, level, still: the hall's own eye point. */
Camera.prototype.at = function (ms) {
  var t = this.t, w = this.walk.at(ms), ph = w.s / STRIDE, env = w.v;
  var tilt = EASE_TILT(clamp01((ms - t.tilt[0]) / (t.tilt[1] - t.tilt[0])));
  var c2 = Math.cos(2 * Math.PI * ph), s1 = Math.sin(Math.PI * ph);
  return {
    x: SWAY * env * s1,
    y: EYE - 0.5 * BOB * env * c2,       // lowest at each heel strike
    z: this.z0 - w.s,
    pitch: this.pitch0 * (1 - tilt) + NOD * env * c2,
    roll: ROLL * env * s1
  };
};
/* A world point into the eye's frame: [right, up, depth]. */
Camera.prototype.view = function (c, p) {
  var vx = p[0] - c.x, vy = p[1] - c.y, vz = p[2] - c.z;
  var sn = Math.sin(c.pitch * D2R), cs = Math.cos(c.pitch * D2R);
  return [vx, vy * cs + vz * sn, vy * sn - vz * cs];
};
Camera.prototype.screen = function (c, v) {
  var sx = this.f * v[0] / v[2], sy = -this.f * v[1] / v[2];
  var cr = Math.cos(c.roll * D2R), sr = Math.sin(c.roll * D2R);
  return [this.Px + sx * cr - sy * sr, this.Py + sx * sr + sy * cr];
};
Camera.prototype.project = function (c, p) {
  var v = this.view(c, p);
  return v[2] < 0.02 ? null : this.screen(c, v);
};
/* The screen box of a flat polygon, clipped to what lies in front of the
   eye; null when none of it does. */
Camera.prototype.box = function (c, pts) {
  var vs = pts.map(function (p) { return this.view(c, p); }, this), NEAR = 0.02, poly = [];
  for (var i = 0; i < vs.length; i++) {
    var a = vs[i], b = vs[(i + 1) % vs.length];
    if (a[2] >= NEAR) poly.push(a);
    if ((a[2] >= NEAR) !== (b[2] >= NEAR)) {
      var k = (NEAR - a[2]) / (b[2] - a[2]);
      poly.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]);
    }
  }
  if (!poly.length) return null;
  var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  poly.forEach(function (v) {
    var s = this.screen(c, v);
    x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]);
  }, this);
  return [x0, y0, x1, y1];
};
Camera.prototype.onScreen = function (c, pts, m) {
  var b = this.box(c, pts);
  m = m || 2;
  return !!b && b[2] > -m && b[0] < this.W + m && b[3] > -m && b[1] < this.H + m;
};
/* The camera as a CSS transform list. The same functions in every frame:
   the principal point, the lens, the roll and pitch about the eye, and the
   eye's place in the world. */
Camera.prototype.css = function (c) {
  return 'translate(' + f2(this.Px) + 'px,' + f2(this.Py) + 'px) perspective(' + f2(this.f) + 'px) translate3d(0px,0px,' +
    f2(this.f) + 'px) rotateZ(' + f4(c.roll) + 'deg) rotateX(' + f4(c.pitch) + 'deg) translate3d(' + f3(-U * c.x) + 'px,' +
    f3(U * c.y) + 'px,' + f3(-U * c.z) + 'px)';
};

/* =========================================================================
   Pieces: flat things in the world, each with its place, and layers
   ========================================================================= */
function div(cls, parent) {
  var e = document.createElement('div');
  e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}
/* A rectangle in a piece's own plane: a runs across it (left to right as it
   is seen), b up it (for a level plane, b is z). The layers' SVG uses
   (a, -b). */
function R(a0, a1, b0, b1) { return { a0: a0, a1: a1, b0: b0, b1: b1 }; }
/* A layer: SVG markup in the piece's metres, the part of the piece it
   covers (sub), and how it is painted: `res` scales the resolution for soft
   light that needs little; `solid` makes it a plain colour; `alpha` marks
   see-through paint, which is cut into tiles only along `cuts` (a list of
   [axis, value], lines where the paint is opaque); `when` limits the times
   its resolution is read at to when it shows. */
function lay(cls, markup, sub, opts) {
  opts = opts || {};
  return { cls: cls, markup: markup, sub: sub || null, res: opts.res || 1, texts: opts.texts || null,
    solid: opts.solid || null, alpha: !!opts.alpha, cuts: opts.cuts || null, when: opts.when || null };
}
/* kind: 'face' (upright, facing the street, at z), 'plane' (level, at
   height h, b is z), 'sideL' / 'sideR' (upright, facing +x / -x, at x = xs;
   a is depth into the foyer / z), 'leaf' (a door leaf on its hinge). */
function piece(kind, cls, box, layers, o) {
  var e = div('e-piece ' + cls);
  e.style.width = f2((box.a1 - box.a0) * U) + 'px';
  e.style.height = f2((box.b1 - box.b0) * U) + 'px';
  var part = { el: e, kind: kind, box: box, spec: layers, layers: {}, host: 'street' };
  for (var k in o || {}) part[k] = o[k];
  layers.forEach(function (l) {
    var sub = l.sub || box;
    var w = div('e-layer ' + l.cls, e);
    w.__layer = true;
    w.__solid = !!l.solid;
    w.style.left = f2((sub.a0 - box.a0) * U) + 'px'; w.style.top = f2((box.b1 - sub.b1) * U) + 'px';
    w.style.width = f2((sub.a1 - sub.a0) * U) + 'px'; w.style.height = f2((sub.b1 - sub.b0) * U) + 'px';
    if (l.solid) w.style.background = l.solid;
    l.el = w; l.sub = sub; w.__sub = sub;
    var key = l.cls.split(' ')[0];
    if (!part.layers[key]) part.layers[key] = w;
  });
  return part;
}
/* A point of a piece's plane in the world, at ms (only a leaf moves). */
function mapAt(part, a, b, ms) {
  switch (part.kind) {
    case 'face': return [a, b, part.z];
    case 'plane': return [a, part.h, b];
    case 'sideL': return [part.xs, b, -a];
    case 'sideR': return [part.xs, b, a];
    case 'leaf': {
      var s = swing(S ? S.t : part.t, ms, part.side) * D2R;
      var r = part.side < 0 ? a + OPEN : OPEN - a;
      return [part.side < 0 ? -OPEN + r * Math.cos(s) : OPEN - r * Math.cos(s), b, -r * Math.sin(s)];
    }
  }
  return [a, b, 0];
}
function corners(part, ms, r) {
  r = r || part.box;
  return [mapAt(part, r.a0, r.b1, ms), mapAt(part, r.a1, r.b1, ms), mapAt(part, r.a1, r.b0, ms), mapAt(part, r.a0, r.b0, ms)];
}
/* The piece's own place in the world, after the camera in its transform. */
function placeAt(part, ms) {
  var b = part.box;
  switch (part.kind) {
    case 'face': return 'translate3d(' + f2(U * b.a0) + 'px,' + f2(-U * b.b1) + 'px,' + f2(U * part.z) + 'px)';
    case 'plane': return 'translate3d(' + f2(U * b.a0) + 'px,' + f2(-U * part.h) + 'px,' + f2(U * b.b1) + 'px) rotateX(-90deg)';
    case 'sideL': return 'translate3d(' + f2(U * part.xs) + 'px,' + f2(-U * b.b1) + 'px,' + f2(-U * b.a0) + 'px) rotateY(90deg)';
    case 'sideR': return 'translate3d(' + f2(U * part.xs) + 'px,' + f2(-U * b.b1) + 'px,' + f2(U * b.a0) + 'px) rotateY(-90deg)';
    case 'leaf': {
      var s = swing(S.t, ms, part.side);
      return part.side < 0
        ? 'translate3d(' + f2(-U * OPEN) + 'px,' + f2(-U * b.b1) + 'px,0px) rotateY(' + f4(s) + 'deg) translateX(0px)'
        : 'translate3d(' + f2(U * OPEN) + 'px,' + f2(-U * b.b1) + 'px,0px) rotateY(' + f4(-s) + 'deg) translateX(' + f2(-U * OPEN) + 'px)';
    }
  }
  return '';
}
function swing(t, ms, side) {
  var t0 = t.doors + (side > 0 ? t.doorLag : 0);
  return 170 * EASE_SWING(clamp01((ms - t0) / t.doorsDur));
}

/* Metal as the hall draws it: six tones across a moulding, in the order
   glaze, shade, body, crest, relief body, lip (DESIGN.md, the material law),
   laid so the lip and the crest face the key light, up and to the left. */
function ramp(id, tones, vertical) {
  var a = vertical ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
  return '<linearGradient id="' + id + '" ' + a + '>' +
    '<stop offset="0" stop-color="' + tones[5] + '"/>' +
    '<stop offset="0.12" stop-color="' + tones[3] + '"/>' +
    '<stop offset="0.34" stop-color="' + tones[4] + '"/>' +
    '<stop offset="0.6" stop-color="' + tones[2] + '"/>' +
    '<stop offset="0.86" stop-color="' + tones[1] + '"/>' +
    '<stop offset="1" stop-color="' + tones[0] + '"/></linearGradient>';
}
function rect(x, y0, w, y1, fill, extra) {
  // world box (x, y0) to (x + w, y1), y up
  return '<rect x="' + f3(x) + '" y="' + f3(-y1) + '" width="' + f3(w) + '" height="' + f3(y1 - y0) +
    '" fill="' + fill + '"' + (extra || '') + '/>';
}
/* A bronze member: the body in its ramp, then an arris of light on the
   edges that face the key and a line of glaze on the edges that do not. */
function member(x, y0, w, y1, P, leaf) {
  var vertical = (y1 - y0) > w;
  var g = leaf ? (vertical ? 'url(#e-lf-v)' : 'url(#e-lf-h)') : (vertical ? 'url(#e-sb-v)' : 'url(#e-sb-h)');
  var t = leaf ? P.leaf : P.sb, a = Math.min(w, y1 - y0) * 0.09;
  return rect(x, y0, w, y1, g) +
    rect(x, y1 - a, w, y1, t[5], ' opacity="0.85"') +
    rect(x, y0, a, y1, t[5], ' opacity="0.55"') +
    rect(x + w - a, y0, a, y1, t[0], ' opacity="0.8"') +
    rect(x, y0, w, y0 + a, t[0], ' opacity="0.9"');
}
function pathD(pts) {
  return 'M' + pts.map(function (p) { return f3(p[0]) + ' ' + f3(-p[1]); }).join('L') + 'Z';
}

/* =========================================================================
   Palette: the hall's own tokens, read off :root for this theme and wing
   ========================================================================= */
function palette(theme, wing) {
  var cs = getComputedStyle(root);
  var tok = function (n) { return cs.getPropertyValue(n).trim(); };
  var six = function (p) { return [0, 1, 2, 3, 4, 5].map(function (i) { return tok('--' + p + '-' + i); }); };
  var night = theme === 'onyx';
  return {
    night: night,
    wing: wing,
    leaf: six(wing === 'bureau' ? 'ag' : 'au'),
    sb: six('sb'),
    brassHi: tok('--brass-hi') || '#f4d68c', brassLo: tok('--brass-lo') || '#2e1f0b',
    // the glass the foyer's light comes through, and the frost on it
    foyer: night ? ['#ffe6b4', '#f3b865', '#b86a24'] : ['#fff6e2', '#f2e2c2', '#cdb58c'],
    frost: night ? ['#ecc585', '#bd7a38', '#5a2a0c'] : ['#f6f8f8', '#dfe5e8', '#aebbc3'],
    // etched glass: the clear field lets the foyer through, a little dark;
    // the frosted etching is lit from behind by night, white in the sun
    clear: night ? 'rgba(22, 13, 6, 0.2)' : 'rgba(150, 170, 186, 0.26)',
    etch: night ? ['#f6dcae', '#e7b574', '#a9672f'] : ['#fbfdfd', '#eef2f4', '#d3dde3'],
    etchA: night ? 0.8 : 0.84,
    etchEdge: night ? 'rgba(255, 238, 204, 0.8)' : 'rgba(255, 255, 255, 0.95)',
    etchShade: night ? 'rgba(70, 30, 6, 0.5)' : 'rgba(96, 112, 124, 0.45)',
    stone: night ? 'url(#e-portoro)' : 'url(#e-calacatta)',
    stoneVeil: night ? 'rgba(6, 4, 3, 0.52)' : 'rgba(255, 252, 245, 0.08)',
    joint: night ? 'rgba(0, 0, 0, 0.75)' : 'rgba(96, 82, 60, 0.42)',
    // the foyer's floor, in the hall's own floor's tokens: its grade where
    // it meets the reader (the plane's near tone, then the room's shade),
    // its strips and its runner
    floor: {
      base: tok('--floor-base') || (night ? '#15120e' : '#ddd3bf'),
      // by night the hall's floor is lighter a hand's breadth in from its
      // very edge than the plane's own tones say (its lamps are in it):
      // the foyer takes that, and darkens toward the doors
      near: night ? 'rgba(0,0,0,0.3)' : (tok('--floor-near') || 'rgba(90,70,40,0.1)'),
      shade: night ? ['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.42)'] : [tok('--shade') || 'rgba(42,36,22,0.3)', tok('--shade') || 'rgba(42,36,22,0.3)'],
      strip: tok('--strip') || 'rgba(196,150,74,0.34)', stripLt: tok('--strip-lt') || 'rgba(255,226,160,0.2)',
      rug: tok('--rug') || (night ? '#4a0f14' : '#6d1820'), rugVeil: tok('--rug-veil') || 'rgba(8,3,3,0.42)',
      fringe: night ? '#3d1a12' : '#7e3f2c', brass: night ? '#5e4822' : '#937638'
    }
  };
}

/* =========================================================================
   Shared paint: the gradients, patterns and filters, by id; each layer's
   SVG carries only the ones it uses.
   ========================================================================= */
function defsMap(P) {
  var n = P.night, D = {};
  var tex = function (id, file, w, h, flip) {
    var href = TEX[file] || ('/static/assets/tex/' + file);
    D[id] = '<pattern id="' + id + '" patternUnits="userSpaceOnUse" width="' + (flip ? w * 2 : w) + '" height="' + h + '">' +
      '<image href="' + href + '" width="' + w + '" height="' + h + '" preserveAspectRatio="none"/>' +
      (flip ? '<image href="' + href + '" width="' + w + '" height="' + h + '" preserveAspectRatio="none" transform="translate(' + (w * 2) + ' 0) scale(-1 1)"/>' : '') +
      '</pattern>';
  };
  D['e-sb-h'] = ramp('e-sb-h', P.sb, false); D['e-sb-v'] = ramp('e-sb-v', P.sb, true);
  D['e-lf-h'] = ramp('e-lf-h', P.leaf, false); D['e-lf-v'] = ramp('e-lf-v', P.leaf, true);
  tex('e-portoro', 'stone-portoro.webp', 1.6, 1.2, true);
  tex('e-calacatta', 'stone-calacatta.webp', 1.6, 1.2, true);
  tex('e-terrazzo', n ? 'terrazzo-onyx.webp' : 'terrazzo-ivory.webp', 1.4, 1.4, false);
  // the foyer's floor and runner, at the size the hall's floor has them
  // where the two meet
  tex('e-ftz', n ? 'terrazzo-onyx.webp' : 'terrazzo-ivory.webp', P.tz || 0.8, P.tz || 0.8, false);
  tex('e-rugf', 'carpet-field.webp', P.rt || 0.5, P.rt || 0.5, false);
  tex('e-rugb', 'carpet-border.webp', P.rb || 0.1, 2 * (P.rb || 0.1), false);
  tex('e-frost', 'grain-frost-small.webp', 0.5, 0.5, false);
  tex('e-frieze', n ? 'relief-frieze-night.webp' : 'relief-frieze-day.webp', 1.1, 0.55, false);
  D['e-bulb'] = '<radialGradient id="e-bulb" cx="0.42" cy="0.4" r="0.62">' +
    '<stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#fff6de"/>' +
    '<stop offset="0.75" stop-color="#ffd98c"/><stop offset="1" stop-color="#e59a3c"/></radialGradient>';
  D['e-halo'] = '<radialGradient id="e-halo"><stop offset="0" stop-color="rgba(255,214,150,0.75)"/>' +
    '<stop offset="0.35" stop-color="rgba(255,190,110,0.28)"/><stop offset="1" stop-color="rgba(255,170,80,0)"/></radialGradient>';
  D['e-bulb-dark'] = '<radialGradient id="e-bulb-dark" cx="0.4" cy="0.36" r="0.7">' +
    '<stop offset="0" stop-color="#6a5a44"/><stop offset="0.5" stop-color="#2c2218"/><stop offset="1" stop-color="#120c07"/></radialGradient>';
  D['e-bulb-clear'] = '<radialGradient id="e-bulb-clear" cx="0.38" cy="0.34" r="0.72">' +
    '<stop offset="0" stop-color="#ffffff"/><stop offset="0.28" stop-color="rgba(255,255,255,0.55)"/>' +
    '<stop offset="0.7" stop-color="rgba(236,232,220,0.35)"/><stop offset="0.9" stop-color="rgba(120,104,80,0.55)"/>' +
    '<stop offset="1" stop-color="rgba(60,44,20,0.7)"/></radialGradient>';
  D['e-foyer'] = '<linearGradient id="e-foyer" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + P.foyer[1] + '"/><stop offset="0.55" stop-color="' + P.foyer[0] + '"/>' +
    '<stop offset="1" stop-color="' + P.foyer[1] + '"/></linearGradient>';
  D['e-frostglow'] = '<radialGradient id="e-frostglow" cx="0.5" cy="0.62" r="0.75">' +
    '<stop offset="0" stop-color="' + P.frost[0] + '"/><stop offset="0.6" stop-color="' + P.frost[1] + '"/>' +
    '<stop offset="1" stop-color="' + P.frost[2] + '"/></radialGradient>';
  // the frosted etching: the foyer's light through it, blurred by the frost,
  // brightest at the height of the hall's lamps, dimmer toward the floor
  D['e-etch'] = '<linearGradient id="e-etch" gradientUnits="userSpaceOnUse" x1="0" y1="-2.7" x2="0" y2="0">' +
    '<stop offset="0" stop-color="' + P.etch[1] + '"/><stop offset="0.38" stop-color="' + P.etch[0] + '"/>' +
    '<stop offset="0.72" stop-color="' + P.etch[1] + '"/><stop offset="1" stop-color="' + P.etch[2] + '"/></linearGradient>';
  D['e-sky'] = '<linearGradient id="e-sky" x1="0" y1="0" x2="0.35" y2="1">' +
    '<stop offset="0" stop-color="#eef3f7"/><stop offset="0.45" stop-color="#cfdbe5"/>' +
    '<stop offset="0.72" stop-color="#a9b6bf"/><stop offset="1" stop-color="#8d969a"/></linearGradient>';
  D['e-sheen'] = '<linearGradient id="e-sheen" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,255,255,0)"/><stop offset="0.42" stop-color="rgba(255,255,255,0)"/>' +
    '<stop offset="0.5" stop-color="rgba(255,255,255,1)"/><stop offset="0.62" stop-color="rgba(255,255,255,0)"/>' +
    '<stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient>';
  // the sun's glare across a pane, a broad band and a narrow one
  D['e-glare'] = '<linearGradient id="e-glare" x1="0" y1="0" x2="1" y2="0.8">' +
    '<stop offset="0" stop-color="rgba(255,255,255,0)"/><stop offset="0.3" stop-color="rgba(255,255,255,0)"/>' +
    '<stop offset="0.4" stop-color="rgba(255,253,244,0.9)"/><stop offset="0.47" stop-color="rgba(255,253,244,0.25)"/>' +
    '<stop offset="0.53" stop-color="rgba(255,253,244,0.6)"/><stop offset="0.58" stop-color="rgba(255,255,255,0)"/>' +
    '<stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient>';
  D['e-pool'] = '<radialGradient id="e-pool"><stop offset="0" stop-color="rgba(255,200,130,0.55)"/>' +
    '<stop offset="0.5" stop-color="rgba(255,176,96,0.18)"/><stop offset="1" stop-color="rgba(255,160,80,0)"/></radialGradient>';
  D['e-refl'] = '<radialGradient id="e-refl"><stop offset="0" stop-color="rgba(255,248,226,1)"/>' +
    '<stop offset="0.25" stop-color="rgba(255,226,170,0.7)"/><stop offset="1" stop-color="rgba(255,190,110,0)"/></radialGradient>';
  D['e-spill'] = '<linearGradient id="e-spill" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,196,120,0)"/><stop offset="0.7" stop-color="rgba(255,196,120,0.3)"/>' +
    '<stop offset="1" stop-color="rgba(255,208,140,0.55)"/></linearGradient>';
  D['e-wash-up'] = '<linearGradient id="e-wash-up" x1="0" y1="1" x2="0" y2="0">' +
    '<stop offset="0" stop-color="rgba(255,176,96,0.5)"/><stop offset="0.45" stop-color="rgba(255,160,80,0.14)"/>' +
    '<stop offset="1" stop-color="rgba(255,150,70,0)"/></linearGradient>';
  D['e-wash-down'] = '<linearGradient id="e-wash-down" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,190,110,0.55)"/><stop offset="0.5" stop-color="rgba(255,170,90,0.16)"/>' +
    '<stop offset="1" stop-color="rgba(255,160,80,0)"/></linearGradient>';
  D['e-dusk-g'] = '<radialGradient id="e-dusk-g" gradientUnits="userSpaceOnUse" cx="0" cy="-1.4" r="7.5">' +
    '<stop offset="0" stop-color="rgba(3,2,5,0.18)"/><stop offset="0.32" stop-color="rgba(3,2,5,0.5)"/>' +
    '<stop offset="1" stop-color="rgba(3,2,5,0.78)"/></radialGradient>';
  // the brass before the canopy lights it: its own shape, in the dark
  D['e-unlit'] = '<filter id="e-unlit" x="-0.1" y="-0.1" width="1.2" height="1.2"><feColorMatrix type="matrix" values="0 0 0 0 0.012 0 0 0 0 0.008 0 0 0 0 0.006 0 0 0 0.7 0"/></filter>';
  D['e-softer'] = '<filter id="e-softer" filterUnits="userSpaceOnUse" x="-2" y="-4" width="5" height="6"><feGaussianBlur stdDeviation="0.12"/></filter>';
  D['e-soft'] = '<filter id="e-soft" filterUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40"><feGaussianBlur stdDeviation="0.05"/></filter>';
  D['e-sunedge'] = '<filter id="e-sunedge" filterUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40"><feGaussianBlur stdDeviation="0.08"/></filter>';
  D['e-penumbra'] = '<filter id="e-penumbra" filterUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40"><feGaussianBlur stdDeviation="0.3"/></filter>';
  D['e-streak'] = '<filter id="e-streak" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.06 0.3"/></filter>';
  return D;
}

/* =========================================================================
   Painting: each layer cut into tiles, each tile drawn once into its
   canvas at the most pixels per metre the walk shows it at
   ========================================================================= */
/* Seen through the facade: the foyer is only ever seen through the doorway
   and the side doors' glass, so a point of it is only seen when the line
   from the eye to it passes through one of them. */
function throughOpening(c, p) {
  var k = p[2] >= -0.001 ? 1 : c.z / (c.z - p[2]), x = Math.abs(c.x + (p[0] - c.x) * k), y = c.y + (p[1] - c.y) * k;
  return (x <= OPEN + 0.05 && y >= -0.05 && y <= DOOR_H + 0.05) || (x >= OPEN + JAMB - 0.05 && x <= SIDE + 0.05 && y >= 0.25 && y <= 2.65);
}
/* How many px per metre a layer is shown at, across it (a) and up it (b),
   on a grid of points over it at every sample time: 0 where the point is
   off the screen (a point counts while it is within a grid spacing of the
   screen, so no part of the layer between points is missed) or, inside,
   hidden behind the facade. Sampled once per layer; a tile reads the
   points in and around it. */
function sampleLayer(part, sub, cam, times) {
  var sp = Math.max(0.08, Math.min(0.35, Math.max(sub.a1 - sub.a0, sub.b1 - sub.b0) / 30));
  var na = Math.max(2, Math.ceil((sub.a1 - sub.a0) / sp) + 1), nb = Math.max(2, Math.ceil((sub.b1 - sub.b0) / sp) + 1);
  var spA = (sub.a1 - sub.a0) / (na - 1), spB = (sub.b1 - sub.b0) / (nb - 1);
  var da = 0.01, W = cam.W, H = cam.H, inside = part.host === 'foyer' || part.host === 'sun';
  var nt = times.length, sA = new Float32Array(na * nb * nt), sB = new Float32Array(na * nb * nt);
  for (var i = 0; i < nt; i++) {
    var ms = times[i], c = cam.at(ms);
    for (var ia = 0; ia < na; ia++) {
      var a = sub.a0 + spA * ia;
      for (var ib = 0; ib < nb; ib++) {
        var b = sub.b0 + spB * ib, w = mapAt(part, a, b, ms);
        var p = cam.project(c, w);
        if (!p) continue;
        var pa = cam.project(c, mapAt(part, a + (ia < na - 1 ? da : -da), b, ms));
        var pb = cam.project(c, mapAt(part, a, b + (ib < nb - 1 ? da : -da), ms));
        if (!pa || !pb) continue;
        var qa = Math.hypot(pa[0] - p[0], pa[1] - p[1]) / da, qb = Math.hypot(pb[0] - p[0], pb[1] - p[1]) / da;
        var m = Math.min(0.012 * W, Math.max(spA * qa, spB * qb)) + 2;
        if (p[0] < -m || p[0] > W + m || p[1] < -m || p[1] > H + m) continue;
        if (cam.view(c, w)[2] < 0.25) continue;
        if (inside && !throughOpening(c, w)) continue;
        if (part.skip && part.skip(a, b)) continue;
        var k = (ia * nb + ib) * nt + i;
        sA[k] = qa; sB[k] = qb;
      }
    }
  }
  return { sub: sub, na: na, nb: nb, spA: spA, spB: spB, nt: nt, sA: sA, sB: sB };
}
function scaleTrack(g, r) {
  var out = [], i0 = Math.max(0, Math.ceil((r.a0 - g.sub.a0) / g.spA - 0.35)), i1 = Math.min(g.na - 1, Math.floor((r.a1 - g.sub.a0) / g.spA + 0.35));
  var j0 = Math.max(0, Math.ceil((r.b0 - g.sub.b0) / g.spB - 0.35)), j1 = Math.min(g.nb - 1, Math.floor((r.b1 - g.sub.b0) / g.spB + 0.35));
  if (i1 < i0) { i0 = Math.max(0, Math.floor((r.a0 - g.sub.a0) / g.spA)); i1 = Math.min(g.na - 1, i0 + 1); }
  if (j1 < j0) { j0 = Math.max(0, Math.floor((r.b0 - g.sub.b0) / g.spB)); j1 = Math.min(g.nb - 1, j0 + 1); }
  for (var t = 0; t < g.nt; t++) {
    var A = 0, B = 0;
    for (var ia = i0; ia <= i1; ia++) {
      for (var ib = j0; ib <= j1; ib++) {
        var k = (ia * g.nb + ib) * g.nt + t;
        if (g.sA[k] > A) A = g.sA[k];
        if (g.sB[k] > B) B = g.sB[k];
      }
    }
    out.push([A, B]);
  }
  return out;
}
/* How much of its largest size a piece is painted for. The pieces the reader
   comes closest to (the doors, their frames, the rope) are painted for all
   of it. The rest, seen largest only as it leaves the top or the bottom of
   the screen, are painted a little under it, which keeps the canvases near
   the memory the owner accepted. */
var SHARP = { 'e-nfloor': 0.7, 'e-ceiling': 0.6, 'e-fwall': 0.6, 'e-upper': 0.6, 'e-fascia': 0.82,
  'e-soffit': 0.66, 'e-wall': 0.78, 'e-ground': 0.9, 'e-mirror': 0.8, 'e-shade': 0.35, 'e-leaf': 0.8, 'e-side': 0.94 };
var TILE_PX = 0.5e6;        // a tile worth splitting, in canvas pixels
var CANVAS_MAX = 8192;
var KMAX = 1;   // two levels: the finest and its half
/* A layer cut into tiles, each with its levels. A tile is split while the
   halves need fewer pixels between them (they reach their largest at
   different times, or one never shows). Each tile then keeps a level for
   every halving of its scale the walk passes through, so the compositor
   never shrinks a texture by more than half (it samples without mipmaps,
   and a line shrunk further breaks into steps). A level shows from the
   moment the tile first grows past the level under it. */
var GRIDS = {};
function planTiles(part, l, cam, times, dpr) {
  var out = [], cache = {};
  var ts = l.when ? times.filter(function (t) { return t >= l.when[0] && t <= l.when[1]; }) : times;
  var gk = part.el.className + '|' + [l.sub.a0, l.sub.a1, l.sub.b0, l.sub.b1].map(f3).join(',') + '|' + (l.when || '');
  var grid = GRIDS[gk] || (GRIDS[gk] = sampleLayer(part, l.sub, cam, ts));
  var soft = l.res < 0.7;
  var info = function (r) {
    var k = [r.a0, r.a1, r.b0, r.b1].map(f3).join(',');
    if (!cache[k]) {
      var tr = scaleTrack(grid, r), pk = [0, 0];
      tr.forEach(function (q) { pk[0] = Math.max(pk[0], q[0]); pk[1] = Math.max(pk[1], q[1]); });
      var m = l.res * dpr * (SHARP[part.el.className.split(' ')[1]] || 1);
      cache[k] = { track: tr, peak: pk, res: [Math.max(6, pk[0] * m), Math.max(6, pk[1] * m)] };
    }
    return cache[k];
  };
  var px = function (r) {
    var q = info(r);
    if (!q.peak[0] && !q.peak[1]) return 0;
    return (r.a1 - r.a0) * q.res[0] * (r.b1 - r.b0) * q.res[1];
  };
  var halves = function (r) {
    var q = info(r), alongA = (r.a1 - r.a0) * q.res[0] >= (r.b1 - r.b0) * q.res[1], cands = [];
    [alongA ? 'a' : 'b', alongA ? 'b' : 'a'].forEach(function (ax) {
      if (cands.length) return;
      var lo = r[ax + '0'], hi = r[ax + '1'], mid = (lo + hi) / 2;
      var lines = l.cuts ? l.cuts.filter(function (c) { return c[0] === ax && c[1] > lo + 0.05 && c[1] < hi - 0.05; }).map(function (c) { return c[1]; })
        : (l.alpha ? [] : [mid]);
      if (!lines.length || hi - lo < 0.12) return;
      lines.sort(function (u, v) { return Math.abs(u - mid) - Math.abs(v - mid); });
      var cut = lines[0], A = R(r.a0, r.a1, r.b0, r.b1), B = R(r.a0, r.a1, r.b0, r.b1);
      A[ax + '1'] = cut; B[ax + '0'] = cut;
      cands.push([A, B]);
    });
    return cands[0] || null;
  };
  (function split(r, depth) {
    var q = info(r);
    if (!q.peak[0] && !q.peak[1]) return;                // never seen
    var big = (r.a1 - r.a0) * q.res[0] > CANVAS_MAX || (r.b1 - r.b0) * q.res[1] > CANVAS_MAX;
    if (depth < 9 && (big || px(r) > TILE_PX)) {
      var h = halves(r);
      if (h && (big || px(r) > 2.5 * TILE_PX || px(h[0]) + px(h[1]) < 0.9 * px(r))) { split(h[0], depth + 1); split(h[1], depth + 1); return; }
    }
    // the levels, from the running largest scale against the peak
    var levels = [], run = 0, cur = -1;
    q.track.forEach(function (s, i) {
      if (!s[0] && !s[1]) return;
      run = Math.max(run, Math.max(q.peak[0] ? s[0] / q.peak[0] : 0, q.peak[1] ? s[1] / q.peak[1] : 0));
      var k = soft ? 0 : Math.min(KMAX, Math.max(0, Math.floor(-Math.log(run) / Math.LN2 + 1e-9)));
      if (k !== cur) { levels.push({ k: k, from: levels.length ? ts[i] : 0 }); cur = k; }
    });
    levels.forEach(function (lv, i) { lv.to = i < levels.length - 1 ? levels[i + 1].from : Infinity; });
    out.push({ r: r, res: q.res, levels: levels });
  })(l.sub, 0);
  return out;
}
/* Paint every layer's tiles, all while the street stands: a tile's finest
   level from its SVG, its coarser one halved from it. Painting a tile while
   the walk ran cost the walk its frames: on the GPU it held the GPU's own
   thread for 60-200ms a tile; on this thread, the page's frames. Each level
   shows in its own stretch of the walk. Returns the paint's promise and the
   plan the clock runs (see Levels). */
function paint(parts, cam, P) {
  var dpr = Math.min(3, window.devicePixelRatio || 1);
  var times = [], tp = performance.now();
  GRIDS = {};
  for (var t = 0; t <= cam.walkEnd + 200; t += 80) times.push(t);
  var hold = [], all = [], layers = [], stats = { canvases: 0, bytes: 0, pieces: {} };
  parts.forEach(function (part) {
    var key = part.el.className.replace('e-piece ', '').split(' ')[0];
    var gone = part.lastSeen >= 0 && part.lastSeen < cam.walkEnd ? part.lastSeen + 80 : Infinity;
    (part.spec || []).forEach(function (l) {
      if (l.solid || !l.markup) return;
      var sub = l.sub;
      l.used = ''; l.imgP = null; l.pending = 0;
      layers.push(l);
      planTiles(part, l, cam, times, dpr).forEach(function (tl) {
        l.pending++;
        var r = tl.r, kMax = Math.max.apply(null, tl.levels.map(function (lv) { return lv.k; }));
        // Opaque paint runs two pixels (of the coarsest level) into its
        // neighbour, so no seam shows between tiles; the layer's own edges
        // stay where they are.
        var qc = [tl.res[0] / Math.pow(2, kMax), tl.res[1] / Math.pow(2, kMax)], bl = l.alpha ? 0 : 2;
        var job = { l: l, x0: r.a0 - (r.a0 > sub.a0 + 1e-6 ? bl / qc[0] : 0), x1: r.a1 + (r.a1 < sub.a1 - 1e-6 ? bl / qc[0] : 0),
          y0: r.b0 - (r.b0 > sub.b0 + 1e-6 ? bl / qc[1] : 0), y1: r.b1 + (r.b1 < sub.b1 - 1e-6 ? bl / qc[1] : 0), levels: [] };
        // A whole number of pixels at every level, the tile grown by under a
        // pixel to fit: a canvas rounded to its size draws its picture a
        // fraction off scale, and two tiles met with a step between them.
        var mk = Math.pow(2, kMax);
        var cw = Math.min(CANVAS_MAX, Math.max(mk, Math.ceil((job.x1 - job.x0) * tl.res[0] / mk - 1e-6) * mk));
        var chh = Math.min(CANVAS_MAX, Math.max(mk, Math.ceil((job.y1 - job.y0) * tl.res[1] / mk - 1e-6) * mk));
        job.x1 = job.x0 + cw / tl.res[0]; job.y0 = job.y1 - chh / tl.res[1];
        tl.levels.forEach(function (lv, i) {
          var q = [tl.res[0] / Math.pow(2, lv.k), tl.res[1] / Math.pow(2, lv.k)];
          var cv = document.createElement('canvas');
          cv.className = 'e-tile';
          cv.width = 0; cv.height = 0;
          cv.style.left = f2((job.x0 - sub.a0) * U) + 'px'; cv.style.top = f2((sub.b1 - job.y1) * U) + 'px';
          cv.style.width = f2((job.x1 - job.x0) * U) + 'px'; cv.style.height = f2((job.y1 - job.y0) * U) + 'px';
          l.el.appendChild(cv);
          var L = { cv: cv, job: job, k: lv.k, from: lv.from, to: Math.min(lv.to, gone), gone: gone, prev: null, next: null,
            w: Math.max(1, Math.round(cw / Math.pow(2, lv.k))), h: Math.max(1, Math.round(chh / Math.pow(2, lv.k))),
            painted: false, multi: tl.levels.length > 1 };
          if (i) { L.prev = job.levels[i - 1]; job.levels[i - 1].next = L; }
          job.levels.push(L);
          all.push(L);
          hold.push(L);
          stats.canvases++; stats.bytes += L.w * L.h * 4;
          stats.pieces[key] = (stats.pieces[key] || 0) + L.w * L.h * 4;
        });
      });
    });
  });
  stats.planMs = Math.round(performance.now() - tp);
  GRIDS = {};
  // what is alive at once: everything from the hold, each level let go
  // when it is done with
  var alive = function (ms) {
    var b = 0;
    all.forEach(function (L) { if (ms < L.to) b += L.w * L.h * 4; });
    return b;
  };
  stats.peak = 0;
  for (var ms = 0; ms <= cam.walkEnd + 400; ms += 40) { var a = alive(ms); if (a > stats.peak) { stats.peak = a; stats.peakAt = ms; } }
  // the hold's levels: a tile's finest among them drawn from its SVG, the
  // coarser ones halved from it
  var groups = [];
  hold.forEach(function (L) {
    var g = L.job.__hold || (L.job.__hold = []);
    if (!g.length) groups.push(L.job);
    g.push(L);
  });
  groups.sort(function (a, b) { return b.__hold[0].w * b.__hold[0].h - a.__hold[0].w * a.__hold[0].h; });
  var gen = S;
  var next = function () {
    var job = groups.shift();
    if (!job || S !== gen) return null;
    var ls = job.__hold.slice().sort(function (a, b) { return a.k - b.k; });
    return drawLevel(ls[0]).then(function () {
      for (var i = 1; i < ls.length; i++) halve(ls[i - 1], ls[i]);
    }).then(next);
  };
  // The plan needs only the camera; the drawing waits for the textures
  // and the faces (draw()).
  return { stats: stats, all: all, layers: layers, draw: function () {
    var D = defsMap(P);
    layers.forEach(function (l) { l.used = defsFor(l.markup, D); });
    return Promise.all([next(), next(), next(), next()]);
  } };
}
/* The shared paint a layer's markup asks for, by id. */
function defsFor(markup, D) {
  var ids = {}, used = '', m, re = /url\(#([\w-]+)\)/g;
  while ((m = re.exec(markup))) ids[m[1]] = 1;
  Object.keys(ids).forEach(function (id) { if (D[id]) used += D[id]; });
  return used;
}
/* One picture a layer: its SVG parsed once and drawn into each of its tiles
   at the tile's own size (an SVG drawn to a canvas is drawn again from its
   vectors at the size asked, never scaled from pixels). Parsing the whole
   layer again for every tile kept the page's thread busy for most of the
   paint, seconds on a busy machine. */
function layerImage(l) {
  if (!l.imgP) {
    var s = l.sub, w = Math.max(1, Math.round((s.a1 - s.a0) * U)), h = Math.max(1, Math.round((s.b1 - s.b0) * U));
    var src = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="' +
      f5(s.a0) + ' ' + f5(-s.b1) + ' ' + f5(s.a1 - s.a0) + ' ' + f5(s.b1 - s.b0) + '" preserveAspectRatio="none"><defs>' + l.used + '</defs>' + l.markup + '</svg>';
    var url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
    var img = l.img = new Image();
    img.src = url;
    l.imgW = w; l.imgH = h;
    l.imgP = img.decode().then(function () { URL.revokeObjectURL(url); return img; }, function () { URL.revokeObjectURL(url); return null; });
  }
  return l.imgP;
}
function dropImage(l) {
  if (l.img) { l.img.removeAttribute('src'); l.img = null; }
  l.imgP = null;
}
function drawLevel(L) {
  var job = L.job, l = job.l, cv = L.cv;
  cv.width = L.w; cv.height = L.h;
  return layerImage(l).then(function (img) {
    if (!img || !cv.width) return;     // let go meanwhile
    var s = l.sub, kx = l.imgW / (s.a1 - s.a0), ky = l.imgH / (s.b1 - s.b0);
    var ctx = cv.getContext('2d');
    ctx.drawImage(img, (job.x0 - s.a0) * kx, (s.b1 - job.y1) * ky, (job.x1 - job.x0) * kx, (job.y1 - job.y0) * ky, 0, 0, L.w, L.h);
    if (l.texts) {
      var sx = L.w / (job.x1 - job.x0), sy = L.h / (job.y1 - job.y0);
      l.texts.forEach(function (tx) {
        ctx.save();
        ctx.scale(sx / sy, 1);
        ctx.font = (tx.weight || 500) + ' ' + f2(tx.size * sy) + 'px ' + (tx.face || '"EB Garamond", Georgia, serif');
        if ('letterSpacing' in ctx) ctx.letterSpacing = f2(tx.spacing * sy) + 'px';
        ctx.textAlign = 'center';
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.str, ((tx.x - job.x0) * sx + (tx.spacing * sx) / 2) * sy / sx, (job.y1 - tx.y) * sy);
        ctx.restore();
      });
    }
    L.painted = true;
    // the layer's picture goes once its last tile is drawn
    if (--l.pending <= 0) { dropImage(l); l.pending = 0; }
  });
}
function halve(from, to) {
  to.cv.width = to.w; to.cv.height = to.h;
  var c = to.cv.getContext('2d');
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(from.cv, 0, 0, to.w, to.h);
  to.painted = true;
}
/* The levels on the clock. Each level's canvas shows in its own stretch of
   the walk by an opacity animation on the entrance's clock, so the
   compositor switches them and the page's thread does nothing at the
   moment of the switch. Nothing is let go until the hall lands: freeing a
   canvas as its piece left the screen made the page's thread wait on the
   GPU, 100 to 1200ms at a time at 3440 on a busy machine, in the walk.

   A layer's own fade (a lamp coming up, the haze burning off) is carried
   by its canvases too, never by the layer: an opacity animated on a layer
   of several canvases has the compositor draw them into a surface of their
   own at the layer's CSS size, 100 px a metre, and then enlarge it, and
   the rope at the reader's knees came out in steps. */
var EASE_KW = { ease: bezier(0.25, 0.1, 0.25, 1), 'ease-in': bezier(0.42, 0, 1, 1), 'ease-out': bezier(0, 0, 0.58, 1),
  'ease-in-out': bezier(0.42, 0, 0.58, 1) };
function easeFn(e) {
  if (!e || e === 'linear') return function (x) { return x; };
  if (/^steps/.test(e)) return function (x) { return x < 1 ? 0 : 1; };
  var m = /cubic-bezier\(([^)]*)\)/.exec(e);
  if (m) { var a = m[1].split(',').map(parseFloat); return bezier(a[0], a[1], a[2], a[3]); }
  return EASE_KW[e] || function (x) { return x; };
}
/* A fade (points [ms, value, easing to the next]) seen only while its level
   is on (sw: [ms, on] switches, on0 before the first): the fade's own
   points where the level is on, a lamp that is out (0.004) where it is
   off. An eased stretch a switch falls inside is followed in short straight
   pieces, so the fade keeps its shape either side of the switch. */
function combine(pts, on0, sw) {
  var P = pts && pts.length ? pts : [[0, 1]];
  var cuts = sw.map(function (q) { return q[0]; }), Q = [];
  var at = function (ms) {
    if (ms <= P[0][0]) return P[0][1];
    for (var i = 0; i < P.length - 1; i++) {
      var a = P[i], b = P[i + 1];
      if (ms < b[0]) return a[1] + (b[1] - a[1]) * easeFn(a[2])((ms - a[0]) / (b[0] - a[0]));
    }
    return P[P.length - 1][1];
  };
  P.forEach(function (a, i) {
    var b = P[i + 1];
    var inside = b ? cuts.filter(function (c) { return c > a[0] && c < b[0]; }) : [];
    if (!inside.length || a[1] === b[1] || (a[2] && /^steps/.test(a[2]))) { Q.push([a[0], a[1], a[2]]); return; }
    var n = Math.max(2, Math.ceil((b[0] - a[0]) / 16));
    for (var k = 0; k < n; k++) { var ms = a[0] + (b[0] - a[0]) * k / n; Q.push([ms, at(ms), null]); }
  });
  // the value just before a switch, under the stretch it ends
  var out = [], on = on0, j = 0, sws = sw.slice().sort(function (u, v) { return u[0] - v[0]; });
  var val = function (v, o) { return o ? Math.max(0.004, v) : 0.004; };
  var emitSwitches = function (upTo) {
    while (j < sws.length && sws[j][0] < upTo) {
      var c = sws[j][0], v = at(c);
      out.push([c, val(v, on), null]);
      on = sws[j][1];
      // the stretch after the switch runs on as the fade's does
      var e = null;
      for (var q = Q.length - 1; q >= 0; q--) { if (Q[q][0] <= c) { e = Q[q][2]; break; } }
      out.push([c, val(v, on), e]);
      j++;
    }
  };
  Q.forEach(function (k) {
    emitSwitches(k[0]);
    out.push([k[0], val(k[1], on), k[2]]);
  });
  emitSwitches(Infinity);
  return out;
}
var Levels = {
  timers: [],
  // A level out of its stretch stands at 0.004, not 0, like a lamp that is
  // out: invisible, but drawn, so its first showing is not also its first
  // draw (at 0 a newly shown level was laid out and drawn by the page's
  // thread in the walk, up to 850ms on a browser drawing for the first time).
  animate: function (plan, total) {
    plan.all.forEach(function (L) {
      var f = L.job.l.el.__fade;
      if (!L.multi && !f) return;
      var sw = [];
      if (L.multi) {
        if (L.from > 0) sw.push([L.from, true]);
        if (L.next) sw.push([L.next.from, false]);
      }
      var on0 = !L.multi || !(L.from > 0);
      var fr = combine(f, on0, sw).map(function (k) {
        var o = { opacity: k[1] };
        if (k[2]) o.easing = k[2];
        return [k[0], o];
      });
      run(L.cv, fr, total);
    });
  },
  start: function () {},
  seek: function (plan) {
    this.stop();
    var pend = [];
    plan.all.forEach(function (L) { if (!L.painted) pend.push(drawLevel(L)); });
    return Promise.all(pend);
  },
  stop: function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
};

/* =========================================================================
   The canopy's fascia, face on, at z = CAN.z
   ========================================================================= */
/* ATRIUM as a sign-maker bends it: each letter a gilt channel on a
   centreline, the bulbs seated along it. Metres, from the letter's top left,
   y down. */
var GLYPHS = {
  A: { w: 0.62, d: 'M0 0.8L0.27 0L0.35 0L0.62 0.8M0.11 0.53L0.51 0.53' },
  T: { w: 0.6, d: 'M0 0L0.6 0M0.3 0L0.3 0.8' },
  R: { w: 0.54, d: 'M0 0.8L0 0L0.32 0A0.21 0.21 0 0 1 0.32 0.42L0 0.42M0.22 0.42L0.54 0.8' },
  I: { w: 0, d: 'M0 0L0 0.8' },
  U: { w: 0.58, d: 'M0 0L0 0.51A0.29 0.29 0 0 0 0.58 0.51L0.58 0' },
  M: { w: 0.68, d: 'M0 0.8L0 0L0.34 0.56L0.68 0L0.68 0.8' }
};
/* Points every `pitch` along a path of M/L/A commands (the arcs above are
   all quarter or half circles on the stroke's own centreline). */
function walkPath(d, pitch) {
  var toks = d.match(/[MLA]|-?[\d.]+/g), i = 0, runs = [], cur = null, px = 0, py = 0;
  var num = function () { return parseFloat(toks[i++]); };
  while (i < toks.length) {
    var c = toks[i++];
    if (c === 'M') { px = num(); py = num(); cur = [[px, py]]; runs.push(cur); }
    else if (c === 'L') { px = num(); py = num(); cur.push([px, py]); }
    else if (c === 'A') {
      var r = num(); num(); num(); num(); var sweep = num(); var x = num(), y = num();
      var mx = (px + x) / 2, my = (py + y) / 2, dx = x - px, dy = y - py, q = Math.hypot(dx, dy);
      var h = Math.sqrt(Math.max(0, r * r - q * q / 4));
      var s = sweep ? 1 : -1;
      var cx = mx - s * h * dy / q, cy = my + s * h * dx / q;
      var a0 = Math.atan2(py - cy, px - cx), a1 = Math.atan2(y - cy, x - cx);
      var da = a1 - a0;
      if (sweep && da < 0) da += 2 * Math.PI;
      if (!sweep && da > 0) da -= 2 * Math.PI;
      for (var k = 1; k <= 16; k++) {
        var a = a0 + da * k / 16;
        cur.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      px = x; py = y;
    }
  }
  var out = [];
  runs.forEach(function (pts) {
    var len = 0, segs = [];
    for (var j = 1; j < pts.length; j++) {
      var l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
      segs.push(l); len += l;
    }
    var n = Math.max(1, Math.round(len / pitch)), step = len / n;
    var j2 = 0, acc = 0;
    for (var k2 = 0; k2 <= n; k2++) {
      var want = k2 * step;
      while (j2 < segs.length - 1 && acc + segs[j2] < want - 1e-9) { acc += segs[j2]; j2++; }
      var t = segs[j2] ? (want - acc) / segs[j2] : 0;
      t = Math.max(0, Math.min(1, t));
      var p0 = pts[j2], p1 = pts[j2 + 1] || pts[j2];
      out.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
    }
  });
  var keep = [];
  out.forEach(function (p) {
    if (!keep.some(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) < pitch * 0.55; })) keep.push(p);
  });
  return keep;
}
function bulbBase(x, y, r, P) {
  var s = '<circle cx="' + f3(x) + '" cy="' + f3(y) + '" r="' + f3(r * 1.42) + '" fill="' + P.brassLo + '"/>' +
    '<circle cx="' + f3(x - r * 0.12) + '" cy="' + f3(y - r * 0.12) + '" r="' + f3(r * 1.22) + '" fill="none" stroke="' + P.leaf[3] + '" stroke-width="' + f3(r * 0.22) + '" opacity="0.8"/>';
  if (P.night) {
    s += '<circle cx="' + f3(x) + '" cy="' + f3(y) + '" r="' + f3(r) + '" fill="url(#e-bulb-dark)"/>';
  } else {
    s += '<circle cx="' + f3(x) + '" cy="' + f3(y) + '" r="' + f3(r) + '" fill="url(#e-bulb-clear)"/>' +
      '<path d="M' + f3(x - r * 0.3) + ' ' + f3(y + r * 0.3) + 'q' + f3(r * 0.3) + ' ' + f3(-r * 0.6) + ' ' + f3(r * 0.6) + ' 0" fill="none" stroke="rgba(70,48,18,0.7)" stroke-width="' + f3(r * 0.12) + '"/>';
  }
  return s + '<circle cx="' + f3(x - r * 0.38) + '" cy="' + f3(y - r * 0.4) + '" r="' + f3(r * 0.22) + '" fill="#fff" opacity="' + (P.night ? 0.35 : 0.95) + '"/>';
}
function bulbLit(x, y, r, halo) {
  return '<circle cx="' + f3(x) + '" cy="' + f3(y) + '" r="' + f3(r * halo) + '" fill="url(#e-halo)"/>' +
    '<circle cx="' + f3(x) + '" cy="' + f3(y) + '" r="' + f3(r) + '" fill="url(#e-bulb)"/>';
}

var SHEEN_N = 8;       // the day's glint crosses each letter in this many beats
function buildFascia(P) {
  var x0 = -CAN.half - 0.24, x1 = CAN.half + 0.24, y0 = CAN.y0 - 0.02, y1 = CAN.crest;
  var yb = CAN.y0, yt = CAN.y1, mh = 0.15;
  var base = '', wash = '', letters = [], rows = [['', ''], ['', ''], ['', '']], returns = '', sheen = [];
  var h = P.night;

  base += rect(-CAN.half, yb + mh, CAN.half * 2, yt - mh, P.stone);
  base += rect(-CAN.half, yb + mh, CAN.half * 2, yt - mh, P.stoneVeil);
  base += '<rect x="' + (-CAN.half) + '" y="' + f3(-(yt - mh)) + '" width="' + (CAN.half * 2) + '" height="0.08" fill="rgba(0,0,0,' + (h ? 0.5 : 0.18) + ')"/>';
  [[yt - mh, yt], [yb, yb + mh]].forEach(function (m) {
    base += member(-CAN.half, m[0], CAN.half * 2, m[1], P, false);
    base += rect(-CAN.half, m[0] + mh * 0.3, CAN.half * 2, m[1] - mh * 0.3, P.sb[0], ' opacity="0.85"');
    base += rect(-CAN.half, m[1] - 0.012, CAN.half * 2, m[1], P.leaf[3], ' opacity="0.9"');
    base += rect(-CAN.half, m[0], CAN.half * 2, m[0] + 0.01, P.leaf[1]);
  });
  [-1, 1].forEach(function (s) {
    var xa = s < 0 ? x0 : CAN.half, w = 0.24;
    base += member(xa, yb - 0.02, w, yt + 0.02, P, true);
    base += member(s < 0 ? xa + 0.04 : xa, yb + 0.08, w - 0.04, yt - 0.08, P, false);
    for (var k = 0; k < 3; k++) {
      var by = -(yb + 0.3 + k * 0.4), bx = xa + w / 2;
      base += bulbBase(bx, by, 0.04, P);
      returns += bulbLit(bx, by, 0.04, 3.4);
    }
  });
  var n = Math.floor(CAN.half * 2 / 0.12);
  for (var i = 0; i <= n; i++) {
    var bx2 = -CAN.half + 0.06 + i * ((CAN.half * 2 - 0.12) / n);
    [yt - mh / 2, yb + mh / 2].forEach(function (yy, row) {
      base += bulbBase(bx2, -yy, 0.03, P);
      rows[(i + row) % 3][row] += bulbLit(bx2, -yy, 0.03, 3.2);
    });
  }
  var order = 'ATRIUM', gap = 0.46, tw = 0, CH = 0.8, boxes = [];
  order.split('').forEach(function (c, k) { tw += GLYPHS[c].w + (k ? gap : 0); });
  var lx = -tw / 2, top = (yb + yt) / 2 + CH / 2;
  order.split('').forEach(function (c, k) {
    var gph = GLYPHS[c];
    var tr = 'translate(' + f3(lx) + ' ' + f3(-top) + ')';
    base += '<g transform="' + tr + '" fill="none" stroke-linecap="square" stroke-linejoin="miter">' +
      '<path d="' + gph.d + '" stroke="rgba(0,0,0,' + (h ? 0.7 : 0.4) + ')" stroke-width="0.1" transform="translate(0.018 0.026)"/>' +
      '<path d="' + gph.d + '" stroke="' + P.leaf[2] + '" stroke-width="0.094"/>' +
      '<path d="' + gph.d + '" stroke="' + P.leaf[5] + '" stroke-width="0.02" transform="translate(-0.028 -0.028)" opacity="0.9"/>' +
      '<path d="' + gph.d + '" stroke="' + P.leaf[4] + '" stroke-width="0.056"/>' +
      '<path d="' + gph.d + '" stroke="' + P.leaf[0] + '" stroke-width="0.036"/>' +
      '</g>';
    var lit = '';
    walkPath(gph.d, 0.085).forEach(function (p) {
      base += bulbBase(lx + p[0], -top + p[1], 0.022, P);
      lit += bulbLit(lx + p[0], -top + p[1], 0.022, 4.2);
    });
    letters.push(lit);
    var bx = { a0: lx - 0.14, a1: lx + gph.w + 0.14, b0: top - CH - 0.14, b1: top + 0.14 };
    boxes.push(bx);
    if (h) {
      wash += '<g transform="' + tr + '" filter="url(#e-softer)"><path d="' + gph.d + '" fill="none" stroke="rgba(255,176,90,0.34)" stroke-width="0.3"/></g>';
    } else {
      // By day the sun runs along the gilt: a glint crossing the channel's
      // lit faces, drawn at SHEEN_N places across the letter and shown one
      // after the next. Gold takes the sun; it never gives light.
      var clip = 'e-lc' + k, frames = [];
      for (var j = 0; j < SHEEN_N; j++) {
        var cx = bx.a0 - 0.2 + (bx.a1 - bx.a0 + 0.4) * (j + 0.5) / SHEEN_N;
        frames.push('<defs><mask id="' + clip + '-' + j + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="40" height="40"><g transform="' + tr + '"><path d="' + gph.d + '" fill="none" stroke="#fff" stroke-width="0.094" stroke-linecap="square"/></g></mask></defs>' +
          '<g mask="url(#' + clip + '-' + j + ')"><g filter="url(#e-soft)">' +
          '<path d="M' + f3(cx - 0.09) + ' ' + f3(-bx.b0) + 'L' + f3(cx + 0.02) + ' ' + f3(-bx.b0) + 'L' + f3(cx + 0.24) + ' ' + f3(-bx.b1) + 'L' + f3(cx + 0.13) + ' ' + f3(-bx.b1) + 'Z" fill="' + (P.wing === 'bureau' ? 'rgba(232,242,255,0.72)' : 'rgba(255,232,170,0.7)') + '"/>' +
          '<path d="M' + f3(cx - 0.045) + ' ' + f3(-bx.b0) + 'L' + f3(cx - 0.015) + ' ' + f3(-bx.b0) + 'L' + f3(cx + 0.205) + ' ' + f3(-bx.b1) + 'L' + f3(cx + 0.175) + ' ' + f3(-bx.b1) + 'Z" fill="' + (P.wing === 'bureau' ? '#fbfdff' : '#fffcee') + '"/></g></g>');
      }
      sheen.push(frames);
    }
    lx += gph.w + gap;
  });
  if (h) {
    wash += rect(-CAN.half, yt - mh - 0.28, CAN.half * 2, yt - mh, 'url(#e-wash-down)');
    wash += rect(-CAN.half, yb + mh, CAN.half * 2, yb + mh + 0.28, 'url(#e-wash-up)');
  }

  var cr = '';
  cr += member(-1.55, yt, 3.1, yt + 0.1, P, false);
  cr += member(-1.2, yt + 0.1, 2.4, yt + 0.18, P, false);
  cr += rect(-1.55, yt + 0.098, 3.1, yt + 0.108, P.leaf[3]);
  cr += rect(-1.2, yt + 0.178, 2.4, yt + 0.186, P.leaf[3]);
  var fr = 0.46, fcx = 0, fcy = -(yt + 0.18);
  cr += '<path d="M' + f3(-fr - 0.07) + ' ' + f3(fcy) + 'A' + (fr + 0.07) + ' ' + (fr + 0.07) + ' 0 0 1 ' + f3(fr + 0.07) + ' ' + f3(fcy) + 'Z" fill="url(#e-sb-h)"/>';
  cr += '<path d="M' + f3(-fr) + ' ' + f3(fcy) + 'A' + fr + ' ' + fr + ' 0 0 1 ' + f3(fr) + ' ' + f3(fcy) + 'Z" fill="' + (h ? '#3a2410' : '#c9d3d8') + '"/>';
  var fan = '<path d="M' + f3(-fr) + ' ' + f3(fcy) + 'A' + fr + ' ' + fr + ' 0 0 1 ' + f3(fr) + ' ' + f3(fcy) + 'Z" fill="' + (h ? 'url(#e-foyer)' : 'url(#e-sky)') + '"/>';
  var bars = '';
  for (var b = 1; b < 10; b++) {
    var a = Math.PI * b / 10;
    bars += 'M' + f3(fcx - 0.1 * Math.cos(a)) + ' ' + f3(fcy - 0.1 * Math.sin(a)) + 'L' + f3(fcx - fr * Math.cos(a)) + ' ' + f3(fcy - fr * Math.sin(a));
  }
  var glaze = '<path d="' + bars + '" stroke="' + P.sb[1] + '" stroke-width="0.022"/>' +
    '<path d="M' + f3(-fr * 0.62) + ' ' + f3(fcy) + 'A' + f3(fr * 0.62) + ' ' + f3(fr * 0.62) + ' 0 0 1 ' + f3(fr * 0.62) + ' ' + f3(fcy) + '" fill="none" stroke="' + P.sb[1] + '" stroke-width="0.02"/>' +
    '<path d="M' + f3(-0.13) + ' ' + f3(fcy) + 'A0.13 0.13 0 0 1 0.13 ' + f3(fcy) + 'Z" fill="url(#e-lf-h)"/>' +
    '<path d="M' + f3(-fr) + ' ' + f3(fcy) + 'A' + fr + ' ' + fr + ' 0 0 1 ' + f3(fr) + ' ' + f3(fcy) + '" fill="none" stroke="' + P.leaf[3] + '" stroke-width="0.012"/>';
  if (h) cr += glaze; else cr += fan + glaze;
  [-1, 1].forEach(function (s) {
    var px = s < 0 ? -1.55 : 1.35;
    cr += member(px, yt + 0.1, 0.2, yt + 0.44, P, false);
    cr += member(px + 0.03, yt + 0.44, 0.14, yt + 0.52, P, true);
  });

  var box = R(x0, x1, y0, y1);
  var fc = [['b', yb + mh / 2], ['b', yt - mh / 2], ['b', yt + 0.05]];
  boxes.forEach(function (bx, k) { if (k) fc.push(['a', (boxes[k - 1].a1 + bx.a0) / 2]); });
  [-4.5, -3.2, 3.2, 4.5, -CAN.half, CAN.half].forEach(function (x) { fc.push(['a', x]); });
  var layers = [lay('e-base', base + cr, null, { cuts: fc })];
  if (h) {
    layers.push(lay('e-dark', '', null, { solid: 'rgba(3,2,5,0.66)' }));
    layers.push(lay('e-wash', wash, R(-CAN.half, CAN.half, yb, yt), { res: 0.25, alpha: true }));
    layers.push(lay('e-crest-lit', fan + glaze, R(-0.6, 0.6, yt + 0.16, yt + 0.7), { alpha: true }));
    layers.push(lay('e-returns', returns, R(x0, -CAN.half + 0.02, yb, yt), { alpha: true }));
    layers.push(lay('e-returns', returns, R(CAN.half - 0.02, x1, yb, yt), { alpha: true }));
    letters.forEach(function (l, k) { layers.push(lay('e-letter e-l' + k, l, boxes[k], { alpha: true })); });
    rows.forEach(function (r, k) {
      layers.push(lay('e-phase e-ph' + k, r[0], R(-CAN.half, CAN.half, yt - mh - 0.08, yt + 0.08), { alpha: true }));
      layers.push(lay('e-phase e-ph' + k, r[1], R(-CAN.half, CAN.half, yb - 0.08, yb + mh + 0.08), { alpha: true }));
    });
  } else {
    sheen.forEach(function (frames, k) {
      frames.forEach(function (m, j) { layers.push(lay('e-sheen e-sh' + k + '-' + j, m, boxes[k], { res: 0.7, alpha: true, when: [300, 1300] })); });
    });
  }
  return piece('face', 'e-fascia', box, layers, { z: CAN.z });
}

/* =========================================================================
   The soffit: the canopy's coffered underside, a downlight in every coffer.
   One piece to a row, so each is let go as the reader passes under it.
   ========================================================================= */
function buildSoffit(P) {
  var h = P.night, rows = 3, depth = CAN.z / rows, n = 16, pitch = CAN.half * 2 / n, out = [];
  for (var r = 0; r < rows; r++) {
    var zn = CAN.z - r * depth, zf = zn - depth, base = '', l = '';
    base += '<rect x="' + (-CAN.half) + '" y="' + f3(-zn) + '" width="' + (CAN.half * 2) + '" height="' + f3(depth) + '" fill="' + (h ? '#140e09' : '#b9ad98') + '"/>';
    for (var i = 0; i < n; i++) {
      var cx = -CAN.half + (i + 0.5) * pitch, cz = (zn + zf) / 2;
      var cw = pitch - 0.1, cd = depth - 0.1;
      base += '<rect x="' + f3(cx - cw / 2) + '" y="' + f3(-cz - cd / 2) + '" width="' + f3(cw) + '" height="' + f3(cd) + '" fill="' + (h ? '#0b0806' : '#a79b86') + '"/>';
      base += '<rect x="' + f3(cx - cw / 2 + 0.06) + '" y="' + f3(-cz - cd / 2 + 0.06) + '" width="' + f3(cw - 0.12) + '" height="' + f3(cd - 0.12) + '" fill="' + (h ? '#17100a' : '#c3b8a3') + '"/>';
      base += '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.12" fill="' + P.brassLo + '"/>' +
        '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.1" fill="none" stroke="' + P.leaf[3] + '" stroke-width="0.012"/>' +
        '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.075" fill="' + (h ? '#2a2016' : '#e8e4da') + '"/>';
      l += '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.36" fill="url(#e-pool)"/>' +
        '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.078" fill="url(#e-bulb)"/>';
    }
    base += rect(-CAN.half, zf - 0.03, CAN.half * 2, zf + 0.03, P.sb[2]);
    for (var j = 0; j <= n; j++) {
      var rx = -CAN.half + j * pitch;
      base += '<rect x="' + f3(rx - 0.035) + '" y="' + f3(-zn) + '" width="0.07" height="' + f3(depth) + '" fill="' + P.sb[2] + '"/>' +
        '<rect x="' + f3(rx - 0.035) + '" y="' + f3(-zn) + '" width="0.012" height="' + f3(depth) + '" fill="' + P.leaf[2] + '" opacity="0.7"/>';
    }
    if (!h) base += '<rect x="' + (-CAN.half) + '" y="' + f3(-zn) + '" width="' + (CAN.half * 2) + '" height="' + f3(depth) + '" fill="rgba(40,48,58,' + f3(0.1 + 0.05 * r) + ')"/>';
    var layers = [lay('e-base', base)];
    if (h) layers.push(lay('e-srow e-sr' + r, l, null, { res: 0.6, alpha: true }));
    out.push(piece('plane', 'e-soffit e-soffit-' + r, R(-CAN.half, CAN.half, zf, zn), layers, { h: CAN.y0 }));
  }
  return out;
}

/* =========================================================================
   The facade at z = 0
   ========================================================================= */
function cladding(x0, y0, x1, y1, P, seed) {
  var s = rect(x0, y0, x1 - x0, y1, P.stone) + rect(x0, y0, x1 - x0, y1, P.stoneVeil);
  var sw = 1.6, sh = 1.2;
  for (var x = Math.floor(x0 / sw) * sw; x < x1; x += sw) {
    for (var y = Math.floor(y0 / sh) * sh; y < y1; y += sh) {
      var k = hash01(Math.round(x * 10) * 131 + Math.round(y * 10) * 7 + seed);
      var a0 = Math.max(x, x0), a1 = Math.min(x + sw, x1), b0 = Math.max(y, y0), b1 = Math.min(y + sh, y1);
      if (a1 <= a0 || b1 <= b0) continue;
      s += rect(a0, b0, a1 - a0, b1, P.night ? 'rgba(0,0,0,' + f3(k * 0.18) + ')' : 'rgba(255,255,255,' + f3(k * 0.12) + ')');
    }
  }
  for (var jx = Math.ceil(x0 / sw) * sw; jx < x1; jx += sw) s += rect(jx - 0.006, y0, 0.012, y1, P.joint);
  for (var jy = Math.ceil(y0 / sh) * sh; jy < y1; jy += sh) s += rect(x0, jy - 0.006, x1 - x0, jy + 0.006, P.joint);
  return s;
}
function pilaster(cx, y0, y1, P) {
  var w = 0.42, s = '';
  s += rect(cx - w / 2 - 0.04, y0, w + 0.08, y1, 'rgba(0,0,0,' + (P.night ? 0.5 : 0.18) + ')');
  s += member(cx - w / 2, y0, w, y1, P, false);
  for (var k = 0; k < 5; k++) {
    var fx = cx - w / 2 + 0.05 + k * ((w - 0.1) / 5);
    s += rect(fx, y0 + 0.2, 0.05, y1 - 0.12, 'url(#e-sb-v)') + rect(fx + 0.052, y0 + 0.2, 0.012, y1 - 0.12, P.sb[0], ' opacity="0.7"');
  }
  s += member(cx - w / 2 - 0.05, y1 - 0.12, w + 0.1, y1, P, true);
  s += member(cx - w / 2 - 0.03, y0, w + 0.06, y0 + 0.2, P, false);
  return s;
}
/* The bills in the cases: the hall's own rooms. Under Chinese they are
   lettered in Chinese, the rooms by the names the hall gives them. */
var BILLS = [
  { name: 'THE SALON', zh: '沙龙翼', sky: ['#4a0f18', '#8c2330', '#d2733c'], art: 'sun' },
  { name: 'THE BUREAU', zh: '事务翼', sky: ['#0e1b2c', '#1f3d5c', '#8aa3b8'], art: 'towers' },
  { name: 'THE LEDGER', zh: '消息总台', sky: ['#0b2622', '#1d5148', '#c9b87a'], art: 'fan' },
  { name: 'THE ALMANAC', zh: '天象', sky: ['#0a0f24', '#23305e', '#e7d49a'], art: 'moon' }
];
var ZH_FACE = '"LXGW Heart Serif", "EB Garamond", serif';
var billN = 0;
function bill(x0, y0, w, h, b, P, texts) {
  var s = '', n = billN++, id = 'e-bill-' + n, clip = 'e-bclip-' + n, xm = x0 + w / 2;
  s += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + b.sky[0] + '"/><stop offset="0.6" stop-color="' + b.sky[1] + '"/>' +
    '<stop offset="1" stop-color="' + b.sky[2] + '"/></linearGradient>' +
    '<clipPath id="' + clip + '">' + rect(x0, y0, w, y0 + h, '#000') + '</clipPath></defs><g clip-path="url(#' + clip + ')">';
  s += rect(x0, y0, w, y0 + h, 'url(#' + id + ')');
  var ya = y0 + h * 0.34;
  if (b.art === 'sun') {
    for (var i = 0; i < 13; i++) {
      var a = Math.PI * (i + 0.5) / 13;
      s += '<path d="M' + f3(xm) + ' ' + f3(-ya) + 'L' + f3(xm - Math.cos(a - 0.05) * w) + ' ' + f3(-ya - Math.sin(a - 0.05) * w) +
        'L' + f3(xm - Math.cos(a + 0.05) * w) + ' ' + f3(-ya - Math.sin(a + 0.05) * w) + 'Z" fill="' + P.leaf[3] + '" opacity="0.28"/>';
    }
    s += '<circle cx="' + f3(xm) + '" cy="' + f3(-ya) + '" r="' + f3(w * 0.22) + '" fill="' + P.leaf[3] + '"/>';
  } else if (b.art === 'towers') {
    [[-0.34, 0.5], [-0.18, 0.72], [0, 0.95], [0.18, 0.7], [0.34, 0.46]].forEach(function (t) {
      var tx = xm + t[0] * w, tw2 = w * 0.13, th = t[1] * h * 0.55;
      s += rect(tx - tw2 / 2, ya, tw2, ya + th, '#0b1522');
      s += rect(tx - tw2 / 2, ya + th, tw2, ya + th + 0.03, P.leaf[3]);
      s += rect(tx - tw2 * 0.3, ya + th + 0.03, tw2 * 0.6, ya + th + 0.07, '#0b1522');
    });
  } else if (b.art === 'fan') {
    for (var j = 0; j < 7; j++) {
      var a2 = Math.PI * (0.18 + 0.64 * j / 6);
      s += '<rect x="' + f3(xm - 0.06) + '" y="' + f3(-ya - w * 0.46) + '" width="0.12" height="' + f3(w * 0.46) + '" fill="' + (j % 2 ? '#e8dcc0' : P.leaf[3]) + '" transform="rotate(' + f2(a2 * 180 / Math.PI - 90) + ' ' + f3(xm) + ' ' + f3(-ya) + ')"/>';
    }
  } else {
    s += '<circle cx="' + f3(xm + w * 0.12) + '" cy="' + f3(-(y0 + h * 0.68)) + '" r="' + f3(w * 0.2) + '" fill="#f1e3b6"/>' +
      '<circle cx="' + f3(xm + w * 0.2) + '" cy="' + f3(-(y0 + h * 0.7)) + '" r="' + f3(w * 0.18) + '" fill="' + b.sky[0] + '"/>';
    for (var k = 0; k < 18; k++) {
      s += '<circle cx="' + f3(x0 + 0.06 + hash01(k * 7 + 3) * (w - 0.12)) + '" cy="' + f3(-(y0 + h * 0.45 + hash01(k * 11 + 5) * h * 0.45)) + '" r="0.008" fill="#fff4d0"/>';
    }
  }
  s += '</g>';
  s += rect(x0, y0, w, y0 + h * 0.2, '#0c0906');
  s += rect(x0, y0 + h * 0.2, w, y0 + h * 0.2 + 0.012, P.leaf[3]);
  if (root.lang === 'zh') {
    texts.push({ x: xm, y: y0 + h * 0.1, size: 0.1, spacing: 0.03, weight: 500, color: P.leaf[3], str: b.zh, face: ZH_FACE });
    texts.push({ x: xm, y: y0 + h * 0.03, size: 0.052, spacing: 0.02, weight: 500, color: '#cdbf9e', str: '正在上映', face: ZH_FACE });
  } else {
    texts.push({ x: xm, y: y0 + h * 0.105, size: 0.1, spacing: 0.02, weight: 560, color: P.leaf[3], str: b.name });
    texts.push({ x: xm, y: y0 + h * 0.035, size: 0.046, spacing: 0.012, weight: 500, color: '#cdbf9e', str: 'NOW SHOWING' });
  }
  return s;
}
function posterCase(cx, P, b, texts) {
  var w = 1.24, h = 1.86, y0 = 0.62, s = '', lit = '';
  s += rect(cx - w / 2 - 0.05, y0 - 0.06, w + 0.1, y0 + h + 0.02, 'rgba(0,0,0,' + (P.night ? 0.55 : 0.2) + ')');
  s += member(cx - w / 2, y0, w, y0 + h, P, false);
  s += member(cx - w / 2 + 0.05, y0 + 0.05, w - 0.1, y0 + h - 0.05, P, true);
  s += bill(cx - w / 2 + 0.08, y0 + 0.08, w - 0.16, h - 0.16, b, P, texts);
  s += '<rect x="' + f3(cx - w / 2 + 0.08) + '" y="' + f3(-(y0 + h - 0.08)) + '" width="' + f3(w - 0.16) + '" height="' + f3(h - 0.16) +
    '" fill="url(#e-sheen)" opacity="' + (P.night ? 0.06 : 0.22) + '"/>';
  s += member(cx - w / 2 - 0.02, y0 + h, w + 0.04, y0 + h + 0.09, P, false);
  if (P.night) {
    lit += rect(cx - w / 2 + 0.08, y0 + h - 0.1, w - 0.16, y0 + h - 0.08, '#fff2d0') +
      '<rect x="' + f3(cx - w / 2 - 0.3) + '" y="' + f3(-(y0 + h + 0.3)) + '" width="' + f3(w + 0.6) + '" height="' + f3(h + 0.5) +
      '" fill="url(#e-pool)" opacity="0.5"/>';
  }
  return { s: s, lit: lit };
}
function buildWall(side, P, far) {
  var a = far ? SPLIT - 0.02 : BAY - 0.05, b = far ? WALL : SPLIT + 0.02;
  var x0 = side < 0 ? -b : a, x1 = side < 0 ? -a : b;
  var y0 = -0.12, y1 = HEAD + 0.1, texts = [];
  var s = cladding(x0, y0, x1, y1, P, side < 0 ? 11 : 23), lit = '';
  s += rect(x0, y0, x1 - x0, 0.36, P.night ? 'rgba(0,0,0,0.45)' : 'rgba(70,58,40,0.22)');
  s += member(x0, 0.3, x1 - x0, 0.36, P, false);
  var bills = side < 0 ? [BILLS[0], BILLS[2], BILLS[1]] : [BILLS[1], BILLS[3], BILLS[0]];
  [3.95, 7.15, 10.35, 13.55].forEach(function (px) {
    var c = side * px;
    if (c + 0.3 > x0 && c - 0.3 < x1) s += pilaster(c, 0, HEAD + 0.1, P);
  });
  [5.55, 8.75, 11.95].forEach(function (px, k) {
    var c = side * px;
    if (c + 0.7 < x0 || c - 0.7 > x1) return;
    var pc = posterCase(c, P, bills[k], texts);
    s += pc.s; lit += pc.lit;
  });
  if (P.night) lit += rect(x0, HEAD - 0.9, x1 - x0, HEAD + 0.1, 'url(#e-wash-down)');
  var layers = [lay('e-base', s, null, { texts: texts })];
  if (lit) layers.push(lay('e-lit', lit, null, { res: 0.5, alpha: true }));
  return piece('face', 'e-wall e-wall-' + (side < 0 ? 'l' : 'r') + (far ? ' e-far' : ''), R(x0, x1, y0, y1), layers, { z: 0 });
}
function buildUpper(P, x0, x1, cls) {
  var y0 = HEAD - 0.1, y1 = UPPER;
  var s = cladding(x0, y0, x1, y1, P, 41), lit = '';
  s += rect(x0, 5.7, x1 - x0, 6.25, 'url(#e-frieze)');
  s += member(x0, 5.62, x1 - x0, 5.7, P, true);
  s += member(x0, 6.25, x1 - x0, 6.33, P, true);
  [0, 3.95, 7.15, 10.35, 13.55].forEach(function (px) {
    [-1, 1].forEach(function (sd) {
      if (px === 0 && sd > 0) return;
      var c = sd * px || 0;
      if (c + 0.3 < x0 || c - 0.3 > x1) return;
      s += pilaster(c, y0, 5.62, P);
      s += pilaster(c, 6.33, y1, P);
    });
  });
  [1.95, 5.55, 8.75, 11.95].forEach(function (px) {
    [-1, 1].forEach(function (sd) {
      var cx = sd * px, w = 1.1;
      if (cx + 0.7 < x0 || cx - 0.7 > x1) return;
      s += member(cx - w / 2 - 0.06, 6.7, w + 0.12, 10.4, P, false);
      s += rect(cx - w / 2, 6.76, w, 10.34, P.night ? '#0a0806' : 'url(#e-sky)');
      for (var k = 1; k < 5; k++) s += rect(cx - w / 2, 6.76 + k * 0.72 - 0.015, w, 6.76 + k * 0.72 + 0.015, P.sb[1]);
      s += rect(cx - 0.015, 6.76, 0.03, 10.34, P.sb[1]);
    });
  });
  if (P.night) {
    for (var i = -6; i <= 6; i++) {
      var ux = i * 1.05;
      if (ux < x0 - 0.8 || ux > x1 + 0.8) continue;
      lit += '<ellipse cx="' + f3(ux) + '" cy="' + f3(-(CAN.y1 + 0.2)) + '" rx="0.7" ry="1.6" fill="url(#e-pool)" opacity="0.7"/>';
    }
    lit += rect(Math.max(x0, -CAN.half - 0.5), CAN.y1, Math.min(x1, CAN.half + 0.5) - Math.max(x0, -CAN.half - 0.5), CAN.y1 + 1.4, 'url(#e-wash-up)');
  }
  var layers = [lay('e-base', s)];
  if (lit) layers.push(lay('e-lit', lit, null, { res: 0.35, alpha: true }));
  return piece('face', 'e-upper ' + cls, R(x0, x1, y0, y1), layers, { z: 0 });
}
function buildTransom(P) {
  var x0 = -BAY, x1 = BAY, y0 = DOOR_H - 0.02, y1 = HEAD + 0.02;
  var s = '', lit = '';
  s += rect(x0, y0, x1 - x0, y1, P.sb[0]);
  [[-2.08, 0.9], [0, 1.0], [2.08, 0.9]].forEach(function (f) {
    var cx = f[0], r = f[1] * 0.62, base = DOOR_H + 0.1;
    var glass = '<path d="M' + f3(cx - r * 1.45) + ' ' + f3(-base) + 'L' + f3(cx - r * 1.45) + ' ' + f3(-(base + 0.26)) +
      'A' + f3(r * 1.6) + ' ' + f3(r * 0.9) + ' 0 0 1 ' + f3(cx + r * 1.45) + ' ' + f3(-(base + 0.26)) + 'L' + f3(cx + r * 1.45) + ' ' + f3(-base) + 'Z"';
    s += glass + ' fill="' + (P.night ? 'url(#e-frostglow)' : 'url(#e-sky)') + '"/>';
    if (P.night) lit += glass + ' fill="url(#e-foyer)" opacity="0.55"/>';
    var bars = '';
    for (var i = 1; i < 12; i++) {
      var a = Math.PI * i / 12;
      bars += 'M' + f3(cx) + ' ' + f3(-base) + 'L' + f3(cx - Math.cos(a) * r * 1.6) + ' ' + f3(-(base + Math.sin(a) * r * 0.9)) + ' ';
    }
    var fill = '<path d="' + bars + '" stroke="' + P.sb[1] + '" stroke-width="0.03"/>' +
      '<path d="M' + f3(cx - 0.16) + ' ' + f3(-base) + 'A0.16 0.12 0 0 1 ' + f3(cx + 0.16) + ' ' + f3(-base) + 'Z" fill="url(#e-lf-h)"/>' +
      glass + ' fill="none" stroke="' + P.leaf[3] + '" stroke-width="0.014"/>';
    s += fill;
    if (P.night) lit += fill;
  });
  var frame = '';
  [-SIDE, -1.06, 1.06, SIDE].forEach(function (mx) { frame += member(mx - 0.06, y0, 0.12, y1, P, false); });
  frame += member(x0, DOOR_H - 0.02, x1 - x0, DOOR_H + 0.1, P, false);
  frame += rect(x0, DOOR_H + 0.085, x1 - x0, DOOR_H + 0.1, P.leaf[3]);
  frame += member(x0, HEAD - 0.08, x1 - x0, HEAD + 0.02, P, false);
  s += frame;
  if (P.night) lit += frame;
  var tc = [['b', DOOR_H + 0.04], ['b', HEAD - 0.03]];
  [-SIDE, -1.06, 1.06, SIDE].forEach(function (mx) { tc.push(['a', mx]); });
  var layers = [lay('e-base', s, null, { cuts: tc })];
  if (lit) layers.push(lay('e-lit', lit, null, { res: 0.6, alpha: true }));
  return piece('face', 'e-transom', R(x0, x1, y0, y1), layers, { z: 0 });
}
function buildSurround(side, P) {
  var xi = side * SIDE, xo = side * BAY;
  var x0 = Math.min(xi, xo) - 0.02, x1 = Math.max(xi, xo) + 0.02, y0 = -0.08, y1 = HEAD + 0.02;
  var s = '';
  for (var k = 0; k < 3; k++) {
    var w = (BAY - SIDE) / 3, xa = side < 0 ? -BAY + k * w : SIDE + (2 - k) * w;
    s += member(xa, y0 + k * 0.03, w + 0.004, y1, P, false);
    s += rect(side < 0 ? xa + w - 0.012 : xa, y0, 0.012, y1, P.leaf[3], ' opacity="0.8"');
  }
  return piece('face', 'e-surround e-sur-' + (side < 0 ? 'l' : 'r'), R(x0, x1, y0, y1), [lay('e-base', s)], { z: 0 });
}

/* A leaf of the centre pair: bronze stiles and rails, clear glass with an
   etched border and half a sunburst at its head (the other half is on the
   other leaf), a pull, a kick plate. x0 is the leaf's left edge; `meet` is
   the side its pull stands on. */
function leafFace(x0, w, P, meet, fanSide) {
  var s = '', st = 0.085, tr = 0.11, br = 0.3, gx0 = x0 + st, gx1 = x0 + w - st, gy0 = br, gy1 = DOOR_H - tr;
  var e = P.night ? 'rgba(255,226,170,0.34)' : 'rgba(255,255,255,0.5)';
  s += '<rect x="' + f3(gx0 + 0.04) + '" y="' + f3(-(gy1 - 0.04)) + '" width="' + f3(gx1 - gx0 - 0.08) + '" height="' + f3(gy1 - gy0 - 0.08) +
    '" fill="none" stroke="' + e + '" stroke-width="0.035"/>';
  var fx = fanSide < 0 ? gx0 : gx1, fy = gy1, rays = '';
  for (var i = 0; i < 7; i++) {
    var a0 = Math.PI / 2 * (i / 7), a1 = a0 + Math.PI / 2 / 7 * 0.55;
    var sx = fanSide < 0 ? 1 : -1, Rr = 0.72;
    rays += 'M' + f3(fx) + ' ' + f3(-fy) + 'L' + f3(fx + sx * Rr * Math.cos(a0)) + ' ' + f3(-fy + Rr * Math.sin(a0)) +
      'L' + f3(fx + sx * Rr * Math.cos(a1)) + ' ' + f3(-fy + Rr * Math.sin(a1)) + 'Z';
  }
  s += '<path d="' + rays + '" fill="' + e + '"/>';
  s += '<path d="M' + f3(fx) + ' ' + f3(-fy + 0.8) + 'A0.8 0.8 0 0 ' + (fanSide < 0 ? 0 : 1) + ' ' + f3(fx + (fanSide < 0 ? 0.8 : -0.8)) + ' ' + f3(-fy) + '" fill="none" stroke="' + e + '" stroke-width="0.02"/>';
  s += member(x0, 0, st, DOOR_H, P, false) + member(x0 + w - st, 0, st, DOOR_H, P, false);
  s += member(x0, DOOR_H - tr, w, DOOR_H, P, false);
  s += member(x0, 0, w, br, P, false);
  s += rect(x0 + st, 0.04, w - 2 * st, br - 0.05, 'url(#e-lf-h)', ' opacity="0.9"');
  for (var k = 0; k < 4; k++) s += rect(x0 + st + 0.03, 0.08 + k * 0.045, w - 2 * st - 0.06, 0.086 + k * 0.045, P.leaf[0], ' opacity="0.55"');
  var px = meet > 0 ? x0 + w - st - 0.09 : x0 + st + 0.09;
  s += rect(px - 0.025 + 0.02, 0.72 - 0.03, 0.05, 1.72 - 0.03, 'rgba(0,0,0,' + (P.night ? 0.55 : 0.3) + ')');
  s += member(px - 0.02, 0.76, 0.04, 1.68, P, true);
  s += member(px - 0.035, 0.72, 0.07, 0.8, P, false) + member(px - 0.035, 1.64, 0.07, 1.72, P, false);
  return s;
}

/* A leaf of a side pair, as the cinemas of 1935 had them: a bronze frame,
   a lock rail with a push bar, a slim glazing bar high up, a kick plate,
   and plate glass that is clear, with a fountain acid-etched into it in
   frost: a stepped basin, jets arcing out to the corners, a sunburst at the
   head, speed lines in the low panel. The clear field shows the foyer; the
   frost is lit from behind by it at night and white in the sun by day, and
   every etched line has a bright edge on the side its light comes from.
   `hand` is the side the hinge stands on. Returns the frame and glass, and
   the lines the paint can be cut along (the bars, which are opaque). */
var SL = { st: 0.085, tr: 0.11, br: 0.3, lr0: 0.95, lr1: 1.09, mu0: 1.93, mu1: 1.965 };
function etchedLeaf(x0, w, P, hand) {
  var st = SL.st, gx0 = x0 + st, gx1 = x0 + w - st, cx = (gx0 + gx1) / 2, gw = gx1 - gx0;
  var top = DOOR_H - SL.tr, glass = '', etch = '', edge = '', frame = '';
  var panes = [[SL.br, SL.lr0], [SL.lr1, SL.mu0], [SL.mu1, top]];
  var tint = '';
  panes.forEach(function (p) { tint += rect(gx0, p[0], gw, p[1], P.clear); });
  // Etched fine, as the cinemas had it: hairlines of frost on clear plate,
  // never a painted panel. A hairline border round every pane, 3cm in.
  var line = function (pts, wd) {
    return '<path d="M' + pts.map(function (q) { return f3(q[0]) + ' ' + f3(-q[1]); }).join('L') + '" fill="none" stroke-width="' + (wd || 0.013) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  };
  panes.forEach(function (p) {
    var a = 0.032;
    etch += line([[gx0 + a, p[0] + a], [gx1 - a, p[0] + a], [gx1 - a, p[1] - a], [gx0 + a, p[1] - a], [gx0 + a, p[0] + a]], 0.011);
  });
  // the low panel: three speed lines broken by a double chevron
  for (var k = 0; k < 3; k++) {
    var y = SL.br + 0.2 + k * 0.13;
    etch += line([[gx0 + 0.08, y], [cx - 0.12, y]], 0.014) + line([[cx + 0.12, y], [gx1 - 0.08, y]], 0.014);
  }
  [0, 0.09].forEach(function (o) { etch += line([[cx - 0.09, SL.br + 0.2 + o], [cx, SL.br + 0.3 + o], [cx + 0.09, SL.br + 0.2 + o]], 0.014); });
  // the tall pane: the fountain. A stepped basin of three thin slabs...
  var fb = SL.lr1 + 0.08;
  [0.24, 0.17, 0.1].forEach(function (b, i) {
    etch += '<rect x="' + f3(cx - b) + '" y="' + f3(-(fb + i * 0.04 + 0.022)) + '" width="' + f3(2 * b) + '" height="0.022"/>';
  });
  // ...four jets a side, arcing up and falling to the corners, each with
  // its falling drops...
  var jt = fb + 0.13, hj = SL.mu0 - 0.16 - jt;
  for (var jn = 0; jn < 4; jn++) {
    var spread = 0.14 + jn * 0.085, rise = hj * (0.92 - jn * 0.15);
    [-1, 1].forEach(function (sd) {
      var x1 = cx + sd * (0.03 + jn * 0.018), xe = cx + sd * Math.min(gw / 2 - 0.08, spread * 1.9), ye = jt + rise * (0.3 + 0.12 * jn);
      etch += '<path d="M' + f3(x1) + ' ' + f3(-jt) + 'C' + f3(x1 + sd * 0.02) + ' ' + f3(-(jt + rise * 0.95)) + ' ' + f3(xe - sd * 0.06) + ' ' + f3(-(jt + rise)) + ' ' + f3(xe) + ' ' + f3(-ye) +
        '" fill="none" stroke-width="0.013" stroke-linecap="round"/>';
      etch += '<circle cx="' + f3(xe) + '" cy="' + f3(-(ye - 0.05)) + '" r="0.011"/><circle cx="' + f3(xe) + '" cy="' + f3(-(ye - 0.1)) + '" r="0.008"/><circle cx="' + f3(xe) + '" cy="' + f3(-(ye - 0.14)) + '" r="0.006"/>';
    });
  }
  // ...and the centre jet throwing up a sun: a ring, a disc, fine rays
  var sy = SL.mu0 - 0.2;
  etch += line([[cx, jt], [cx, sy - 0.09]], 0.014);
  etch += '<circle cx="' + f3(cx) + '" cy="' + f3(-sy) + '" r="0.03"/><circle cx="' + f3(cx) + '" cy="' + f3(-sy) + '" r="0.058" fill="none" stroke-width="0.011"/>';
  for (var rr = 0; rr < 16; rr++) {
    var an = Math.PI * 2 * rr / 16, r0 = 0.076, r1 = rr % 2 ? 0.105 : 0.13;
    etch += line([[cx + Math.cos(an) * r0, sy + Math.sin(an) * r0], [cx + Math.cos(an) * r1, sy + Math.sin(an) * r1]], 0.008);
  }
  // a fan of fine rays in each top corner of the tall pane
  [-1, 1].forEach(function (sd) {
    var ox = sd < 0 ? gx0 + 0.032 : gx1 - 0.032, oy = SL.mu0 - 0.032;
    for (var q = 1; q < 6; q++) {
      var a2 = Math.PI / 2 * q / 6;
      etch += line([[ox, oy], [ox - sd * Math.cos(a2) * 0.2, oy - Math.sin(a2) * 0.2]], 0.008);
    }
    etch += '<path d="M' + f3(ox - sd * 0.2) + ' ' + f3(-oy) + 'A0.2 0.2 0 0 ' + (sd < 0 ? 0 : 1) + ' ' + f3(ox) + ' ' + f3(-(oy - 0.2)) + '" fill="none" stroke-width="0.009"/>';
  });
  // the head panel: half a sunburst of fine rays standing on the glazing bar
  var hy = SL.mu1 + 0.03, hr = Math.min(gw / 2 - 0.06, top - hy - 0.05);
  for (var q2 = 1; q2 < 14; q2++) {
    var b0 = Math.PI * q2 / 14, rin = 0.07, rout = q2 % 2 ? hr : hr * 0.78;
    etch += line([[cx - Math.cos(b0) * rin, hy + Math.sin(b0) * rin], [cx - Math.cos(b0) * rout, hy + Math.sin(b0) * rout]], q2 % 2 ? 0.012 : 0.008);
  }
  etch += '<path d="M' + f3(cx - 0.05) + ' ' + f3(-hy) + 'A0.05 0.05 0 0 1 ' + f3(cx + 0.05) + ' ' + f3(-hy) + 'Z"/>';
  etch += '<path d="M' + f3(cx - hr - 0.02) + ' ' + f3(-hy) + 'A' + f3(hr + 0.02) + ' ' + f3(hr + 0.02) + ' 0 0 1 ' + f3(cx + hr + 0.02) + ' ' + f3(-hy) + '" fill="none" stroke-width="0.01"/>';
  // The etching drawn three times along the light that shows it: a dark
  // line where the frost's edge turns from it, the frost, a bright line on
  // the edge that meets it (lit from behind at night: below; by day, the
  // sun from the upper left).
  var lx = P.night ? 0 : -0.003, ly = P.night ? -0.003 : 0.003;
  edge = '<g fill="' + P.etchShade + '" stroke="' + P.etchShade + '" stroke-width="0" transform="translate(' + f3(-lx) + ' ' + f3(ly) + ')">' + etch + '</g>' +
    '<g fill="' + P.etchEdge + '" stroke="' + P.etchEdge + '" stroke-width="0" transform="translate(' + f3(lx) + ' ' + f3(-ly) + ')">' + etch + '</g>';
  var frost = '<g fill="url(#e-etch)" stroke="url(#e-etch)" stroke-width="0" opacity="' + P.etchA + '">' + etch + '</g>' +
    '<g fill="url(#e-frost)" stroke="url(#e-frost)" stroke-width="0" opacity="' + (P.night ? 0.16 : 0.3) + '">' + etch + '</g>';
  // the frame: stiles, rails, the glazing bar
  frame += member(x0, 0, st, DOOR_H, P, false) + member(x0 + w - st, 0, st, DOOR_H, P, false);
  frame += member(x0, top, w, DOOR_H, P, false);
  frame += member(x0, SL.lr0, w, SL.lr1, P, false);
  frame += member(gx0, SL.mu0, gw, SL.mu1, P, false);
  frame += member(x0, 0, w, SL.br, P, false);
  // the kick plate, engraved
  frame += rect(x0 + st, 0.035, w - 2 * st, SL.br - 0.045, 'url(#e-lf-h)', ' opacity="0.92"');
  for (var e2 = 0; e2 < 5; e2++) frame += rect(x0 + st + 0.03, 0.07 + e2 * 0.04, w - 2 * st - 0.06, 0.075 + e2 * 0.04, P.leaf[0], ' opacity="0.5"');
  // the push bar on its two standoffs, and its shadow on the rail
  var pb = SL.lr0 + 0.035, pw0 = x0 + st + 0.05, pw1 = x0 + w - st - 0.05;
  frame += rect(pw0 + 0.01, pb - 0.028, pw1 - pw0, pb + 0.04, 'rgba(0,0,0,' + (P.night ? 0.5 : 0.28) + ')');
  frame += member(pw0, pb, pw1 - pw0, pb + 0.045, P, true);
  frame += member(pw0 + 0.04, pb - 0.012, 0.05, pb + 0.057, P, false) + member(pw1 - 0.09, pb - 0.012, 0.05, pb + 0.057, P, false);
  // the hinges, on the hinge stile
  var hx = hand < 0 ? x0 - 0.008 : x0 + w - 0.016;
  [0.35, 1.35, 2.35].forEach(function (y) { frame += member(hx, y, 0.024, y + 0.12, P, true); });
  return { glass: glass + frost + edge, frame: frame, tint: tint };
}

/* The side pairs: etched glass on bronze. One painted layer with the glass
   see-through, cut only along the bars; the lamps of the canopy reflected
   in the clear field by night; the sun's glare on it by day; and, while
   the street stands before the clock starts, the foyer's light (night) or
   the street's reflection (day) laid over all of it. */
function buildSide(side, P) {
  var xi = side * (OPEN + JAMB), xo = side * SIDE, x0 = Math.min(xi, xo), x1 = Math.max(xi, xo);
  var w = (x1 - x0 - 0.1) / 2, s = '', cuts = [];
  var la = etchedLeaf(x0, w, P, -1), lb = etchedLeaf(x0 + w + 0.1, w, P, 1);
  s += la.glass + lb.glass + la.frame + lb.frame + member(x0 + w, -0.04, 0.1, DOOR_H, P, false);
  s += rect(x0, -0.06, x1 - x0, 0, P.sb[0]);
  [x0 + SL.st / 2, x0 + w + 0.05, x1 - SL.st / 2].forEach(function (x) { cuts.push(['a', x]); });
  [SL.br / 2, (SL.lr0 + SL.lr1) / 2, (SL.mu0 + SL.mu1) / 2, DOOR_H - SL.tr / 2].forEach(function (y) { cuts.push(['b', y]); });
  var box = R(x0, x1, -0.06, DOOR_H + 0.02);
  // cut only along the bars: two tiles painted at different sizes meet a
  // pixel apart, and across a line of the etching that shows
  var layers = [lay('e-tint', la.tint + lb.tint, null, { res: 0.12, alpha: true }), lay('e-base', s, null, { cuts: cuts })];
  var clearPanes = function (fn) {
    var out = '';
    [[x0, w], [x0 + w + 0.1, w]].forEach(function (lf) {
      var gx0 = lf[0] + SL.st, gw = lf[1] - 2 * SL.st;
      [[SL.br, SL.lr0], [SL.lr1, SL.mu0], [SL.mu1, DOOR_H - SL.tr]].forEach(function (p) { out += fn(gx0, gw, p[0], p[1]); });
    });
    return out;
  };
  if (P.night) {
    // the canopy's lamps in the glass: the soffit's downlights in rows,
    // smaller and closer together as they go back, and the fascia's bulbs
    // along the top of the head panels
    var refl;
    refl = clearPanes(function (gx0, gw, y0, y1) {
      var o = '';
      for (var r = 0; r < 3; r++) {
        var yy = y1 - 0.12 - r * 0.2 * (1 - r * 0.12), rad = 0.018 * (1 - r * 0.22), pitch = 0.2 * (1 - r * 0.16);
        if (yy < y0 + 0.05 || y1 - y0 < 0.5) continue;
        for (var x = gx0 + 0.06 + hash01(r * 31 + Math.round(gx0 * 100)) * pitch; x < gx0 + gw - 0.04; x += pitch) {
          o += '<circle cx="' + f3(x) + '" cy="' + f3(-yy) + '" r="' + f3(rad * 3.2) + '" fill="url(#e-refl)" opacity="0.55"/>' +
            '<ellipse cx="' + f3(x) + '" cy="' + f3(-yy) + '" rx="' + f3(rad) + '" ry="' + f3(rad * 0.7) + '" fill="#fff4dc"/>';
        }
      }
      // a soft band of the lit soffit across the pane's head
      o += rect(gx0, y1 - 0.5, gw, y1, 'url(#e-wash-down)', ' opacity="0.35"');
      return o;
    });
    layers.push(lay('e-refl', refl, null, { res: 0.35, alpha: true, cuts: cuts }));
    // the foyer's light on the glass before the clock starts
    layers.push(lay('e-haze', clearPanes(function (gx0, gw, y0, y1) {
      return rect(gx0, y0, gw, y1, 'url(#e-foyer)') + rect(gx0, y0, gw, y1, 'url(#e-frost)', ' opacity="0.14"');
    }), null, { res: 0.4, alpha: true, cuts: cuts, when: [0, 700] }));
  } else {
    // the sky in the glass and the sun's glare across it
    layers.push(lay('e-glare', clearPanes(function (gx0, gw, y0, y1) {
      return rect(gx0, y0, gw, y1, 'url(#e-glare)', ' opacity="0.8"') +
        rect(gx0, y1 - 0.3, gw, y1, 'rgba(236, 244, 250, 0.35)');
    }), null, { res: 0.4, alpha: true, cuts: cuts }));
    layers.push(lay('e-haze', clearPanes(function (gx0, gw, y0, y1) {
      var far = '';
      for (var i = 0; i < 3; i++) {
        var bx = gx0 + (i + 0.5) * gw / 3, bh = 0.4 + hash01(i * 13 + Math.round(gx0 * 10)) * 0.6;
        far += rect(bx - 0.1, y0, 0.2, Math.min(y1, y0 + bh), 'rgba(120,128,132,0.32)');
      }
      return rect(gx0, y0, gw, y1, 'url(#e-sky)') + '<g filter="url(#e-softer)">' + far + '</g>';
    }), null, { res: 0.4, alpha: true, cuts: cuts, when: [0, 1500] }));
  }
  return piece('face', 'e-side e-side-' + (side < 0 ? 'l' : 'r'), box, layers, { z: 0 });
}

/* By night, before the canopy lights, the street is dark but for what
   the lit doors reach: one sheet over the facade with the bay cut out of
   it, let go once the canopy is up. */
function buildDusk(t) {
  var d = 'M' + f3(-WALL) + ' 0.2H' + f3(WALL) + 'V' + f3(-UPPER) + 'H' + f3(-WALL) + 'Z' +
    'M' + (-BAY) + ' 0.1H' + BAY + 'V' + (-HEAD) + 'H' + (-BAY) + 'Z';
  var p = piece('face', 'e-dusk', R(-WALL, WALL, -0.2, UPPER),
    [lay('e-base', '<path d="' + d + '" fill="url(#e-dusk-g)" fill-rule="evenodd"/>', null, { res: 0.3, alpha: true, when: [0, t.soffit + 460] })], { z: 0 });
  p.until = t.soffit + 420;
  return p;
}

/* The centre pair's jambs, head and threshold: the last of the street to
   leave the screen. */
function buildJambs(P) {
  var x0 = -OPEN - JAMB, x1 = OPEN + JAMB, y0 = -0.06, y1 = DOOR_H + 0.1;
  var s = '';
  [-1, 1].forEach(function (sd) {
    var xa = sd < 0 ? -OPEN - JAMB : OPEN;
    s += member(xa, y0, JAMB, y1, P, false);
    s += rect(sd < 0 ? xa + JAMB - 0.014 : xa, y0, 0.014, DOOR_H, P.leaf[3], ' opacity="0.85"');
    // a reed down the jamb's face
    s += rect(xa + JAMB * 0.36, 0.1, JAMB * 0.1, DOOR_H - 0.1, P.sb[0], ' opacity="0.7"');
    s += rect(xa + JAMB * 0.47, 0.1, JAMB * 0.06, DOOR_H - 0.1, P.sb[4], ' opacity="0.8"');
    if (P.night) s += rect(sd < 0 ? xa + JAMB - 0.05 : xa, 0, 0.05, DOOR_H, 'rgba(255,200,130,0.28)');
  });
  s += member(x0, DOOR_H, x1 - x0, y1, P, false);
  s += member(x0, y0, x1 - x0, 0.03, P, false);
  s += rect(x0, 0.018, x1 - x0, 0.03, P.leaf[3]);
  var box = R(x0, x1, y0, y1);
  return piece('face', 'e-jambs', box, [
    lay('e-base', s, R(x0, -OPEN, y0, y1)),
    lay('e-base', s, R(OPEN, x1, y0, y1)),
    lay('e-base', s, R(-OPEN, OPEN, DOOR_H, y1)),
    lay('e-base', s, R(-OPEN, OPEN, y0, 0.03))
  ], { z: 0 });
}
/* The doorway's reveal: the depth of the bronze storefront, its two
   returns, its head and its sill, seen as the reader comes close. */
function buildReveal(P) {
  var out = [];
  var ret = function (lit) {
    // a return seen edge-on: the bronze in bands across its depth
    var s = rect(0, 0, REVEAL, DOOR_H, 'url(#e-sb-v)');
    s += rect(0, 0, 0.012, DOOR_H, P.leaf[3], ' opacity="0.9"');
    s += rect(REVEAL * 0.45, 0, 0.01, DOOR_H, P.sb[0], ' opacity="0.8"');
    if (lit) s += rect(0, 0, REVEAL, DOOR_H, lit);
    return s;
  };
  var glow = P.night ? 'rgba(255,196,120,0.16)' : 'rgba(0,0,0,0.08)';
  out.push(piece('sideL', 'e-reveal e-rev-l', R(0, REVEAL, 0, DOOR_H), [lay('e-base', ret(glow))], { xs: -OPEN }));
  out.push(piece('sideR', 'e-reveal e-rev-r', R(-REVEAL, 0, 0, DOOR_H), [lay('e-base', '<g transform="scale(-1 1)">' + ret(glow) + '</g>')], { xs: OPEN }));
  var head = rect(-OPEN, -REVEAL, 2 * OPEN, 0, 'url(#e-sb-h)') + rect(-OPEN, -0.012, 2 * OPEN, 0, P.leaf[3]);
  out.push(piece('plane', 'e-reveal e-rev-h', R(-OPEN, OPEN, -REVEAL, 0), [lay('e-base', head)], { h: DOOR_H }));
  var sill = rect(-OPEN, -REVEAL, 2 * OPEN, 0, 'url(#e-lf-h)') + rect(-OPEN, -0.02, 2 * OPEN, 0, P.leaf[5]);
  out.push(piece('plane', 'e-reveal e-rev-s', R(-OPEN, OPEN, -REVEAL, 0), [lay('e-base', sill)], { h: 0.03 }));
  return out;
}

/* A leaf of the centre pair, turned in the world about its hinge. The glass
   is clear; over it by night a haze of the foyer's light, by day the
   street's reflection, which hides the hall until the clock starts. By
   day the right leaf also carries the sun's flash as it swings through the
   angle that throws the sun at the reader. */
function buildLeaf(side, P) {
  var x0 = side < 0 ? -OPEN : 0;
  var gx0 = x0 + 0.085, gw = OPEN - 0.17, gy0 = 0.3, gy1 = DOOR_H - 0.11;
  var haze;
  if (P.night) {
    haze = rect(gx0, gy0, gw, gy1, 'url(#e-foyer)') +
      '<ellipse cx="' + f3(side < 0 ? gx0 + gw : gx0) + '" cy="' + f3(-1.25) + '" rx="0.9" ry="1.3" fill="url(#e-pool)" opacity="0.9"/>' +
      rect(gx0, gy0, gw, gy1, 'url(#e-frost)', ' opacity="0.12"') +
      rect(gx0, gy0, gw, gy1, 'url(#e-sheen)', ' opacity="0.12"');
  } else {
    haze = rect(gx0, gy0, gw, gy1, 'url(#e-sky)');
    var far = '';
    for (var i = 0; i < 7; i++) {
      var bx = gx0 - 0.1 + i * (gw + 0.2) / 6, bh = 0.7 + hash01(i * 13 + (side < 0 ? 1 : 7)) * 0.9;
      far += rect(bx - 0.14, gy0, 0.28, gy0 + bh, 'rgba(120,128,132,0.32)');
    }
    haze += '<g filter="url(#e-softer)">' + far + '</g>';
    haze += rect(gx0, gy0, gw, gy0 + 0.5, 'rgba(236,230,216,0.45)');
    haze += rect(gx0, gy0, gw, gy1, 'url(#e-sheen)', ' opacity="0.42"');
  }
  var box = R(x0, x0 + OPEN, 0, DOOR_H);
  var layers = [lay('e-haze', haze, R(gx0, gx0 + gw, gy0, gy1), { res: 0.6, alpha: true, when: [0, 800] }),
    lay('e-gsheen', rect(gx0, gy0, gw, gy1, 'url(#e-sheen)', ' opacity="' + (P.night ? 0.07 : 0.18) + '"'), R(gx0, gx0 + gw, gy0, gy1), { res: 0.2, alpha: true }),
    lay('e-base', leafFace(x0, OPEN, P, side < 0 ? 1 : -1, side < 0 ? 1 : -1))];
  if (!P.night && side > 0) {
    // the sun in the glass: a broad glare, a white-hot core and a short
    // star of light off it
    var fx = gx0 + gw * 0.42, fy = 1.55, star = '';
    [[0.62, 0.012], [0.34, 0.009]].forEach(function (a, k) {
      [0, 90].forEach(function (deg) {
        var r = k ? a[0] * 0.8 : a[0];
        star += '<ellipse cx="' + f3(fx) + '" cy="' + f3(-fy) + '" rx="' + f3(r) + '" ry="' + f3(a[1]) + '" fill="url(#e-refl)" transform="rotate(' + (deg + (k ? 45 : 0)) + ' ' + f3(fx) + ' ' + f3(-fy) + ')"/>';
      });
    });
    layers.push(lay('e-flash', '<ellipse cx="' + f3(fx) + '" cy="' + f3(-fy) + '" rx="' + f3(gw * 0.75) + '" ry="1.2" fill="url(#e-refl)"/>' +
      rect(gx0, gy0, gw, gy1, 'url(#e-glare)') +
      '<ellipse cx="' + f3(fx) + '" cy="' + f3(-fy) + '" rx="0.2" ry="0.16" fill="url(#e-refl)"/>' +
      '<ellipse cx="' + f3(fx) + '" cy="' + f3(-fy) + '" rx="0.07" ry="0.06" fill="#fffef8"/>' + star,
      R(gx0, gx0 + gw, gy0, gy1), { res: 0.4, alpha: true, when: [600, 1500] }));
  }
  return piece('leaf', 'e-leaf e-leaf-' + (side < 0 ? 'l' : 'r'), box, layers, { side: side });
}

/* Brass stanchions with velvet rope either side of the way in, as the hall
   has them along its floor: a lane to the centre pair, which the reader
   walks between. */
function buildStanchions(P) {
  var z = STAN_Z, hgt = 0.96, s = '', lit = '';
  var posts = [1.3, 2.3, 3.3];
  [-1, 1].forEach(function (sd) {
    for (var i = 0; i < posts.length - 1; i++) {
      var xa = sd * posts[i], xb = sd * posts[i + 1], y = hgt - 0.1, dip = 0.2;
      var d = 'M' + f3(xa) + ' ' + f3(-y) + 'Q' + f3((xa + xb) / 2) + ' ' + f3(-(y - dip * 2)) + ' ' + f3(xb) + ' ' + f3(-y);
      s += '<path d="' + d + '" fill="none" stroke="rgba(0,0,0,' + (P.night ? 0.6 : 0.3) + ')" stroke-width="0.07" transform="translate(0.012 0.02)"/>' +
        '<path d="' + d + '" fill="none" stroke="' + (P.night ? '#4a0d16' : '#7a1c26') + '" stroke-width="0.062" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="' + (P.night ? '#a8404a' : '#c35a62') + '" stroke-width="0.016" transform="translate(0 -0.018)" opacity="0.7"/>';
      if (P.night) lit += '<path d="' + d + '" fill="none" stroke="rgba(255,190,120,0.35)" stroke-width="0.02" transform="translate(0 -0.02)"/>';
    }
    posts.forEach(function (px) {
      var x = sd * px;
      s += '<ellipse cx="' + f3(x + 0.02) + '" cy="0.01" rx="0.2" ry="0.035" fill="rgba(0,0,0,' + (P.night ? 0.55 : 0.28) + ')"/>';
      s += '<ellipse cx="' + f3(x) + '" cy="-0.03" rx="0.16" ry="0.04" fill="url(#e-lf-h)"/>';
      s += member(x - 0.05, 0.05, 0.1, 0.12, P, true);
      s += member(x - 0.022, 0.1, 0.044, hgt - 0.06, P, true);
      s += member(x - 0.04, hgt - 0.14, 0.08, hgt - 0.08, P, true);
      s += '<circle cx="' + f3(x) + '" cy="' + f3(-hgt) + '" r="0.055" fill="url(#e-lf-h)"/>' +
        '<circle cx="' + f3(x - 0.018) + '" cy="' + f3(-hgt - 0.02) + '" r="0.016" fill="' + P.leaf[3] + '"/>';
      if (P.night) lit += '<circle cx="' + f3(x - 0.012) + '" cy="' + f3(-hgt - 0.018) + '" r="0.022" fill="rgba(255,236,196,0.8)"/>' +
        rect(x - 0.022, 0.1, 0.012, hgt - 0.06, 'rgba(255,214,150,0.5)');
    });
  });
  var box = R(-3.55, 3.55, -0.06, hgt + 0.08);
  var L = R(-3.55, -1.1, box.b0, box.b1), Rr = R(1.1, 3.55, box.b0, box.b1);
  // cut at the posts and below the rope, never across it
  var sc = [['b', 0.5], ['b', 0.25]];
  posts.forEach(function (px) { sc.push(['a', px], ['a', -px]); });
  // The brass as the canopy's lamps light it, and by night, before they
  // come up, the dark over it: a see-through layer that goes as they do, so
  // no two opaque tiles are ever faded across each other.
  var layers = [lay('e-base', s + lit, L, { cuts: sc }), lay('e-base', s + lit, Rr, { cuts: sc })];
  if (P.night) {
    var dark = '<g filter="url(#e-unlit)">' + s + '</g>';
    layers.push(lay('e-unlit', dark, L, { alpha: true, when: [0, 820] }));
    layers.push(lay('e-unlit', dark, Rr, { alpha: true, when: [0, 820] }));
  }
  return piece('face', 'e-stanchions', box, layers, { z: z });
}

/* By day the low sun behind the reader throws the canopy's shadow down the
   wall, across the transom and a little to the right. While a cloud is
   over the sun it is a soft grey smudge; as the sun comes out it sharpens
   and settles. The doorway is cut out of it. */
function buildShade() {
  var drop = CAN.z * LIGHT[1] / LIGHT[2], shift = CAN.z * LIGHT[0] / -LIGHT[2];
  var top = HEAD, bot = CAN.y0 - drop;
  var mk = function (y0, y1, a0, a1) {
    // the doorway is cut out of it only where the two meet (a cut that ran
    // past the shadow was itself filled, over the open doorway)
    var d = 'M' + f3(-CAN.half + shift) + ' ' + f3(-y1) + 'H' + f3(CAN.half + shift) + 'V' + f3(-y0) + 'H' + f3(-CAN.half + shift) + 'Z' +
      (DOOR_H > y0 + 0.001 ? 'M' + (-OPEN) + ' ' + f3(-Math.min(DOOR_H, y1)) + 'H' + OPEN + 'V' + f3(-y0) + 'H' + (-OPEN) + 'Z' : '');
    return '<defs><linearGradient id="e-shade-g' + a0 + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(34,42,58,' + a0 + ')"/>' +
      '<stop offset="0.85" stop-color="rgba(34,42,58,' + a1 + ')"/><stop offset="1" stop-color="rgba(34,42,58,' + (a1 * 0.3) + ')"/></linearGradient></defs>' +
      '<path d="' + d + '" fill="url(#e-shade-g' + a0 + ')" fill-rule="evenodd"/>';
  };
  var sharp = mk(bot, top, 0.36, 0.3);
  var soft = '<g filter="url(#e-penumbra)">' + mk(bot + 0.25, top, 0.2, 0.16) + '</g>';
  return piece('face', 'e-shade', R(-CAN.half + shift - 1.2, CAN.half + shift + 1.2, bot - 1, top + 0.1), [
    lay('e-shade-soft', soft, null, { res: 0.15, alpha: true, when: [0, 1100] }),
    lay('e-shade-sharp', sharp, null, { res: 0.4, alpha: true })
  ], { z: 0.002 });
}

/* =========================================================================
   The pavement: a terrazzo apron under the canopy with a sunburst poured
   in it at the doors, then the public paving. Night: wet, and the lit
   entrance lies in it.
   ========================================================================= */
function groundArt(P) {
  var h = P.night, s = h ? '<g opacity="0.74">' : '';
  s += rect(-WALL, 0, WALL * 2, CAN.z, 'url(#e-terrazzo)');
  if (h) s += '<rect x="' + f3(-WALL) + '" y="' + f3(-CAN.z) + '" width="' + f3(WALL * 2) + '" height="' + CAN.z + '" fill="rgba(4,3,2,0.35)"/>';
  var Rr = 2.3, n = 18, rays = '', strips = '';
  for (var i = 0; i < n; i++) {
    var a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
    rays += '<path d="M0 0L' + f3(-Math.cos(a0) * Rr) + ' ' + f3(-Math.sin(a0) * Rr) + 'A' + Rr + ' ' + Rr + ' 0 0 1 ' +
      f3(-Math.cos(a1) * Rr) + ' ' + f3(-Math.sin(a1) * Rr) + 'Z" fill="' +
      (i % 2 ? (h ? '#3a0e14' : '#a4776a') : (h ? '#171109' : '#e7ddca')) + '" opacity="' + (h ? 0.86 : 0.8) + '"/>';
    strips += 'M0 0L' + f3(-Math.cos(a0) * Rr) + ' ' + f3(-Math.sin(a0) * Rr);
  }
  s += rays;
  if (h) s += '</g><g opacity="0.84">';
  s += '<path d="M' + f3(-Rr - 0.2) + ' 0A' + f3(Rr + 0.2) + ' ' + f3(Rr + 0.2) + ' 0 0 1 ' + f3(Rr + 0.2) + ' 0L' + f3(Rr) + ' 0A' + Rr + ' ' + Rr + ' 0 0 0 ' + f3(-Rr) + ' 0Z" fill="' + (h ? '#0e1512' : '#5a6a60') + '"/>';
  s += '<path d="' + strips + '" stroke="' + P.leaf[3] + '" stroke-width="0.018"/>';
  s += '<path d="M' + f3(-Rr) + ' 0A' + Rr + ' ' + Rr + ' 0 0 1 ' + f3(Rr) + ' 0M' + f3(-Rr - 0.2) + ' 0A' + f3(Rr + 0.2) + ' ' + f3(Rr + 0.2) + ' 0 0 1 ' + f3(Rr + 0.2) + ' 0" fill="none" stroke="' + P.leaf[3] + '" stroke-width="0.026"/>';
  s += '<circle r="0.32" fill="' + (h ? '#3a0e14' : '#8e5d50') + '" stroke="' + P.leaf[3] + '" stroke-width="0.026"/>';
  s += rect(-WALL, CAN.z - 0.04, WALL * 2, CAN.z + 0.04, P.leaf[2]);
  var far = 8;
  s += '<rect x="' + f3(-WALL) + '" y="' + f3(-far) + '" width="' + f3(WALL * 2) + '" height="' + f3(far - CAN.z - 0.04) +
    '" fill="' + (h ? '#141417' : '#b9b6ae') + '"/>';
  for (var fz = CAN.z + 1.1; fz < far; fz += 1.1) s += '<rect x="' + f3(-WALL) + '" y="' + f3(-fz - 0.01) + '" width="' + f3(WALL * 2) + '" height="0.02" fill="' + P.joint + '"/>';
  for (var fx = -Math.floor(WALL / 1.2) * 1.2; fx <= WALL; fx += 1.2) s += '<rect x="' + f3(fx - 0.01) + '" y="' + f3(-far) + '" width="0.02" height="' + f3(far - CAN.z - 0.04) + '" fill="' + P.joint + '"/>';
  if (h) s += '</g>';
  if (!h) {
    for (var k = 0; k < 500; k++) {
      s += '<rect x="' + f3(-WALL + hash01(k * 3 + 1) * WALL * 2) + '" y="' + f3(-(CAN.z + 0.05 + hash01(k * 5 + 2) * (far - CAN.z))) + '" width="0.03" height="0.03" fill="rgba(80,74,64,' + f3(0.2 + hash01(k) * 0.3) + ')"/>';
    }
  }
  return s;
}
function groundLit() {
  var s = '';
  for (var r = 0; r < 3; r++) {
    for (var i = 0; i < 16; i++) {
      var cx = -CAN.half + (i + 0.5) * (CAN.half * 2 / 16), cz = CAN.z - (r + 0.5) * CAN.z / 3;
      s += '<ellipse cx="' + f3(cx) + '" cy="' + f3(-cz) + '" rx="0.75" ry="0.62" fill="url(#e-pool)" opacity="0.5"/>';
    }
  }
  return s;
}
function buildGround(P, rows) {
  var art = groundArt(P), lit = P.night ? groundLit() : '', spill = '<path d="M-1 0L1 0L2.6 -4.2L-2.6 -4.2Z" fill="url(#e-spill)"/>';
  return rows.map(function (g, k) {
    var hw = g[2];
    var layers = [lay('e-base', art, null)];
    if (lit && g[0] < CAN.z) layers.push(lay('e-lit', lit, R(-Math.min(hw, CAN.half + 0.8), Math.min(hw, CAN.half + 0.8), g[0], Math.min(g[1], CAN.z)), { res: 0.4, alpha: true }));
    if (P.night && g[0] < 4.2) layers.push(lay('e-spill', spill, R(-2.7, 2.7, g[0], Math.min(g[1], 4.2)), { res: 0.4, alpha: true }));
    return piece('plane', 'e-ground e-g' + k, R(-hw, hw, g[0], g[1]), layers, { h: 0 });
  });
}
function buildMirrorGround() {
  return piece('face', 'e-mirror-ground', R(-WALL, WALL, -8, 0.02), [lay('e-base', '', null, { solid: '#050406' })], { z: 0 });
}
function buildMirror() {
  var hw = Math.min(WALL, 6.4), g = '';
  g += rect(-OPEN, -DOOR_H + 0.3, OPEN * 2, 0, 'rgba(255,200,130,0.95)');
  g += rect(-SIDE, -DOOR_H + 0.3, SIDE - OPEN - JAMB, 0, 'rgba(236,166,88,0.75)');
  g += rect(OPEN + JAMB, -DOOR_H + 0.3, SIDE - OPEN - JAMB, 0, 'rgba(236,166,88,0.75)');
  g += rect(-BAY, -HEAD, BAY * 2, -DOOR_H - 0.1, 'rgba(240,170,90,0.5)');
  [-1, 1].forEach(function (sd) { g += rect(sd * 5.55 - 0.55, -2.4, 1.1, -0.7, 'rgba(255,220,170,0.16)'); });
  return piece('face', 'e-mirror', R(-hw, hw, -2.8, 0.02), [lay('e-base', '<g filter="url(#e-streak)">' + g + '</g>', null, { res: 0.5, alpha: true })], { z: 0 });
}

/* =========================================================================
   The foyer, between the doors and the hall. Its floor, ceiling and side
   walls are sized to the hall, so the far wall they meet is the hall's own
   wall, edge to edge, and the floor meets the hall's floor on the line
   where the hall's floor leaves the bottom of the screen at rest.
   ========================================================================= */
function buildFoyer(P, G) {
  var out = [], n = P.night, zw = G.zWall, xw = G.Xw, yc = G.Yc;
  // The ceiling: coffered plaster between bronze beams, dark by night but
  // for the light off the hall's wall; the beams run to the far wall.
  var c = rect(-xw, zw, 2 * xw, 0, n ? '#0e0a07' : '#c8bfae');
  var nb = Math.max(4, Math.round(2 * xw / 1.6)), pitch = 2 * xw / nb, nd = Math.max(2, Math.round(-zw / 1.5)), dp = -zw / nd;
  for (var i = 0; i < nb; i++) {
    for (var j = 0; j < nd; j++) {
      var cx0 = -xw + i * pitch, cz0 = zw + j * dp;
      c += rect(cx0 + 0.1, cz0 + 0.1, pitch - 0.2, cz0 + dp - 0.1, n ? '#080604' : '#b9b09e');
      c += rect(cx0 + 0.22, cz0 + 0.22, pitch - 0.44, cz0 + dp - 0.22, n ? '#140e09' : '#d2cab9');
      c += '<circle cx="' + f3(cx0 + pitch / 2) + '" cy="' + f3(-(cz0 + dp / 2)) + '" r="0.16" fill="' + P.brassLo + '"/>' +
        '<circle cx="' + f3(cx0 + pitch / 2) + '" cy="' + f3(-(cz0 + dp / 2)) + '" r="0.1" fill="' + (n ? '#3a2a18' : '#ece6d8') + '"/>';
    }
  }
  for (var bi = 0; bi <= nb; bi++) c += rect(-xw + bi * pitch - 0.05, zw, 0.1, 0, P.sb[2]) + rect(-xw + bi * pitch - 0.05, zw, 0.015, 0, P.leaf[2], ' opacity="0.6"');
  for (var bj = 0; bj <= nd; bj++) c += rect(-xw, zw + bj * dp - 0.05, 2 * xw, zw + bj * dp + 0.05, P.sb[2]);
  // the far wall's light on the ceiling where they meet
  c += rect(-xw, zw, 2 * xw, zw + 1.6, n ? 'rgba(255,184,110,0.2)' : 'rgba(255,250,236,0.2)');
  c += rect(-xw, -0.8, 2 * xw, 0, 'rgba(0,0,0,' + (n ? 0.5 : 0.18) + ')');
  out.push(piece('plane', 'e-ceiling', R(-xw, xw, zw, 0), [lay('e-base', c)], { h: yc, host: 'foyer' }));

  // The side walls: stone between fluted bronze pilasters over a dado, the
  // stone in the hall's own marble; lit from the hall by night.
  var wallArt = function (len, seed) {
    var s = cladding(0, 0, len, yc, P, seed);
    s += rect(0, 0, len, 0.9, n ? 'rgba(0,0,0,0.35)' : 'rgba(70,58,40,0.12)') + member(0, 0.84, len, 0.9, P, false) + member(0, 0, len, 0.14, P, false);
    for (var x = 0.9; x < len - 0.4; x += 2.2) s += pilaster(x, 0, yc - 0.2, P);
    s += member(0, yc - 0.26, len, yc, P, true);
    s += rect(0, 0, len, yc, n ? 'rgba(4,3,2,0.3)' : 'rgba(40,40,44,0.1)');
    return s;
  };
  var len = -zw;
  out.push(piece('sideL', 'e-fwall e-fwall-l', R(0, len, 0, yc), [lay('e-base', wallArt(len, 71))], { xs: -xw, host: 'foyer' }));
  out.push(piece('sideR', 'e-fwall e-fwall-r', R(zw, 0, 0, yc), [lay('e-base', '<g transform="translate(' + f3(zw) + ' 0)">' + wallArt(len, 83) + '</g>')], { xs: xw, host: 'foyer' }));

  // The floor, from the threshold to where the hall's own floor takes over
  // (G.zNear, where the hall's floor leaves the bottom of the screen at
  // rest). It is the hall's floor carried out to the doors: the same
  // terrazzo at the size the hall's floor shows it along that line, the
  // same grade (by night the dark of the reader's side of the room), its
  // strips, and the hall's runner, woven the same, coming out to meet the
  // reader. The hall's floor, seen through the doorway, is the rest of it:
  // a trapezoid cut out of this one along a soft edge, so the two meet on
  // no line and the lamps in the hall's wax fade into it.
  var F = P.floor, zn = G.zNear, run = G.runner, fe = G.feather;
  var slope = G.half / G.f, sp = fe * Math.sqrt(1 + slope * slope);
  var hole = function (z) { return G.half * (G.zEnd - z) / G.f; };
  // the hole, drawn in by s across its edges (and past the far wall)
  var inner = function (s) {
    var zb = zn - s, w0 = Math.max(0, hole(zw - 1) - s * sp / fe), w1 = Math.max(0, hole(zb) - s * sp / fe);
    return pathD([[-w0, zw - 1], [w0, zw - 1], [w1, zb], [-w1, zb]]);
  };
  var fl = '<defs><filter id="e-nff" filterUnits="userSpaceOnUse" x="-50" y="-50" width="100" height="100"><feGaussianBlur stdDeviation="' + f3(fe / 4) + '"/></filter>' +
    '<mask id="e-nfm" maskUnits="userSpaceOnUse" x="-50" y="-50" width="100" height="100"><rect x="-50" y="-50" width="100" height="100" fill="#fff"/>' +
    '<path d="' + inner(fe / 2) + '" fill="#000" filter="url(#e-nff)"/></mask></defs><g mask="url(#e-nfm)">';
  fl += rect(-xw, zw - 0.02, 2 * xw, 0, F.base) + rect(-xw, zw - 0.02, 2 * xw, 0, 'url(#e-ftz)');
  // the slabs' strips
  var jx = '', jz = '';
  for (var sx = -Math.floor(xw / G.slab) * G.slab; sx <= xw; sx += G.slab) jx += rect(sx - 0.004, zw, 0.008, 0, F.strip) + rect(sx + 0.004, zw, 0.004, 0, F.stripLt);
  for (var sz = zn; sz < -0.1; sz += G.slab * 0.8) jz += rect(-xw, sz - 0.004, 2 * xw, sz + 0.004, F.strip) + rect(-xw, sz + 0.004, 2 * xw, sz + 0.008, F.stripLt);
  for (var sz2 = zn - G.slab * 0.8; sz2 > zw; sz2 -= G.slab * 0.8) jz += rect(-xw, sz2 - 0.004, 2 * xw, sz2 + 0.004, F.strip) + rect(-xw, sz2 + 0.004, 2 * xw, sz2 + 0.008, F.stripLt);
  fl += jx + jz;
  // the plane's own near tone
  fl += rect(-xw, zw - 0.02, 2 * xw, 0, F.near);
  // the runner, bound in its border, its pile darker toward the reader, and
  // a fringe where it starts
  var bw = run * 2 * 0.11, rz0 = zw - 0.02, rz1 = -0.35;
  fl += rect(-run - 0.03, rz0, 2 * run + 0.06, rz1, 'rgba(0,0,0,0.4)');
  fl += rect(-run, rz0, 2 * run, rz1, F.rug) + rect(-run, rz0, 2 * run, rz1, 'url(#e-rugf)');
  fl += '<g transform="translate(' + f3(-run) + ' 0)">' + rect(0, rz0, bw, rz1, 'url(#e-rugb)') + '</g>';
  fl += '<g transform="translate(' + f3(run - bw) + ' 0)">' + rect(0, rz0, bw, rz1, 'url(#e-rugb)') + '</g>';
  fl += rect(-run, rz0, 2 * run, rz1, F.rugVeil) + rect(-run, rz0, 2 * run, rz1, P.night ? 'rgba(96,74,52,0.22)' : 'rgba(0,0,0,0.2)');
  for (var fr = -run; fr <= run; fr += 0.03) fl += rect(fr, -0.35, 0.012, -0.28, F.fringe, ' opacity="0.8"');
  // the room's shade on the reader's side, over all of it
  fl += '<linearGradient id="e-nfs" gradientUnits="userSpaceOnUse" x1="0" y1="' + f3(-zn) + '" x2="0" y2="0">' +
    '<stop offset="0" stop-color="' + F.shade[0] + '"/><stop offset="1" stop-color="' + F.shade[1] + '"/></linearGradient>';
  fl += rect(-xw, zw - 0.02, 2 * xw, 0, 'url(#e-nfs)');
  fl += '</g>';
  // the threshold's brass strip
  fl += rect(-xw, -0.08, 2 * xw, 0, F.brass) + rect(-xw, -0.1, 2 * xw, -0.08, 'rgba(0,0,0,0.4)');
  var nf = piece('plane', 'e-nfloor', R(-xw, xw, zw, 0), [lay('e-base', fl)], { h: 0, host: 'foyer' });
  // Where the hall's floor shows through the cut the canvases hold nothing,
  // so they are not planned there.
  nf.skip = function (a, b) { return b < zn - fe - 0.02 && Math.abs(a) < hole(b) - sp - 0.02; };
  out.push(nf);
  return out;
}

/* =========================================================================
   By day, the sun through the doors into the foyer: each doorway cast on
   the floor along the sun and, where the beam reaches the far wall, up the
   wall. The centre pair's leaves shade their doorway until they open; as
   they swing in, their shadows draw back across the band toward the hinges.
   Screened over the foyer (#e-sun).
   ========================================================================= */
function castFloor(x, y, z) { var t = y / -LIGHT[1]; return [x + LIGHT[0] * t, z + LIGHT[2] * t]; }
function buildSun(G) {
  var out = [], zw = G.zWall;
  var beam = function (xa, xb, strength) {
    // the doorway's opening cast on the floor, clipped at the far wall,
    // and the rest of it standing up the wall
    var f = [castFloor(xa, 0, 0), castFloor(xb, 0, 0), castFloor(xb, DOOR_H, 0), castFloor(xa, DOOR_H, 0)];
    return { floor: f, strength: strength };
  };
  var fillA = function (a) { return 'rgba(255,226,178,' + a + ')'; };
  var floorArt = '', wallArt = '';
  var add = function (xa, xb, a) {
    var b = beam(xa, xb, a);
    floorArt += '<path d="' + b.floor.map(function (p, i) { return (i ? 'L' : 'M') + f3(p[0]) + ' ' + f3(-p[1]); }).join('') + 'Z" fill="' + fillA(a) + '"/>';
    // up the far wall: where each ray through the opening meets z = zw
    var tw = -zw / -LIGHT[2], yw = [0, DOOR_H].map(function (y) { return y + LIGHT[1] * tw; });
    var dx = LIGHT[0] * tw;
    if (yw[1] > 0) {
      // up the wall it grazes and thins toward the lintel's soft shadow
      wallArt += '<defs><linearGradient id="e-wb' + Math.round(xa * 100) + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + f3(-yw[1]) + '">' +
        '<stop offset="0" stop-color="' + fillA(a * 0.7) + '"/><stop offset="0.7" stop-color="' + fillA(a * 0.45) + '"/><stop offset="1" stop-color="' + fillA(0) + '"/></linearGradient></defs>' +
        '<path d="M' + f3(xa + dx) + ' ' + f3(-Math.max(0, yw[0])) + 'L' + f3(xb + dx) + ' ' + f3(-Math.max(0, yw[0])) +
        'L' + f3(xb + dx) + ' ' + f3(-yw[1]) + 'L' + f3(xa + dx) + ' ' + f3(-yw[1]) + 'Z" fill="url(#e-wb' + Math.round(xa * 100) + ')"/>';
    }
  };
  // the side pairs' etched glass: a softer beam, broken by the bars
  add(-SIDE, -OPEN - JAMB, 0.45); add(OPEN + JAMB, SIDE, 0.45);
  // the centre pair's glass lets a part of the sun through while it is shut
  add(-OPEN, OPEN, 0.4);
  var centreFloor = '', centreWall = '';
  (function () {
    var save = [floorArt, wallArt];
    floorArt = ''; wallArt = '';
    add(-OPEN, OPEN, 0.6);
    centreFloor = floorArt; centreWall = wallArt;
    floorArt = save[0]; wallArt = save[1];
  })();
  // what the centre beam covers, with room for its soft edge: the leaves'
  // shadow frames need cover no more than this
  var cb = beam(-OPEN, OPEN, 0).floor, cxs = cb.map(function (q) { return q[0]; });
  var twc = -zw / -LIGHT[2], dxc = LIGHT[0] * twc;
  // the bars of the side pairs' shadows across their beams
  var bars = '';
  [-1, 1].forEach(function (sd) {
    [SL.br, (SL.lr0 + SL.lr1) / 2, (SL.mu0 + SL.mu1) / 2].forEach(function (y) {
      var a = castFloor(sd * (OPEN + JAMB), y, 0), b = castFloor(sd * SIDE, y, 0);
      bars += '<path d="M' + f3(a[0]) + ' ' + f3(-a[1]) + 'L' + f3(b[0]) + ' ' + f3(-b[1]) + '" stroke="rgba(0,0,0,1)" stroke-width="0.14"/>';
    });
  });
  var fx0 = -SIDE - 0.5, fx1 = SIDE + LIGHT[0] * (DOOR_H / -LIGHT[1]) + 0.8;
  var floorBox = R(Math.min(fx0, -G.Xw), Math.max(fx1, G.Xw), zw, 0.05);
  var soft = function (m) { return '<g filter="url(#e-sunedge)">' + m + '</g>'; };
  var sides = piece('plane', 'e-sunfloor', floorBox, [lay('e-sun-side', soft('<mask id="e-sm"><rect x="-50" y="-50" width="100" height="100" fill="#fff"/>' + bars.replace(/rgba\(0,0,0,1\)/g, '#000') + '</mask><g mask="url(#e-sm)">' + floorArt + '</g>'), null, { res: 0.3, alpha: true })], { h: 0.002, host: 'sun' });
  out.push(sides);
  var cSub = R(Math.max(floorBox.a0, Math.min.apply(null, cxs) - 0.45), Math.min(floorBox.a1, Math.max.apply(null, cxs) + 0.45), zw, 0.05);
  var centre = piece('plane', 'e-sunfloor-c', floorBox, [lay('e-sun-centre', soft(centreFloor), cSub, { res: 0.3, alpha: true })], { h: 0.003, host: 'sun' });
  out.push(centre);
  var wx0 = -SIDE + LIGHT[0] * (-zw / -LIGHT[2]) - 0.6, wx1 = SIDE + LIGHT[0] * (-zw / -LIGHT[2]) + 0.6;
  var wBox = R(Math.max(-G.Xw, wx0), Math.min(G.Xw, wx1), 0, DOOR_H);
  var wSub = R(Math.max(wBox.a0, -OPEN + dxc - 0.45), Math.min(wBox.a1, OPEN + dxc + 0.45), 0, DOOR_H);
  var wallPiece = piece('face', 'e-sunwall', wBox, [
    lay('e-sun-side', soft(wallArt), null, { res: 0.3, alpha: true }),
    lay('e-sun-centre', soft(centreWall), wSub.a1 > wSub.a0 ? wSub : null, { res: 0.3, alpha: true })
  ], { z: zw + 0.01, host: 'sun' });
  out.push(wallPiece);
  // The leaves' shadows: a window over the centre beam whose two edges are
  // the shadows of the leaves' free edges. On the floor such an edge runs
  // along the sun's direction, so the window's frames are turned to it and
  // only slide; on the wall it stands upright.
  centre.window = windowFrames(centre, 'floor');
  wallPiece.window = windowFrames(wallPiece, 'wall');
  return out;
}
/* Two nested frames, each with a soft edge, which slide and whose contents
   slide back: what lies between their edges shows. */
function windowFrames(part, kind) {
  var layer = part.layers['e-sun-centre'];
  if (!layer) return null;
  var host = layer.parentNode, box = part.box;
  // The frames' x axis runs across the leaves' shadow edges. On the floor
  // an edge runs along the sun's way (in the piece's px: x right, y away,
  // so (L.x, -L.z)); on the wall it stands upright.
  var ang = kind === 'floor' ? Math.atan2(-LIGHT[0], -LIGHT[2]) : 0;
  var mk = function (cls, rightEdge) {
    var f = div('e-win ' + cls);
    f.style.left = '0px'; f.style.top = '0px';
    var inner = div('e-win-in', f);
    return { f: f, inner: inner, right: rightEdge };
  };
  var A = mk('e-win-a', false), B = mk('e-win-b', true);
  host.replaceChild(A.f, layer);
  A.inner.appendChild(B.f);
  B.inner.appendChild(layer);
  return { A: A, B: B, ang: ang, kind: kind, part: part, layer: layer };
}

/* =========================================================================
   The hall, posed. Each of its boxes is laid out where it rests; its
   transform carries it to where the camera sees it and is the identity at
   the walk's end. The wall pieces are a plane at the far wall; the floor is
   the floor, its picture taken back through the lens that drew it; the
   board is a plane standing on the floor.
   ========================================================================= */
var HALL = [['#masthead', 'wall'], ['#ticker', 'wall'], ['#backwall', 'wall'], ['#floorplane', 'floor'],
  ['#works', 'wall'], ['#stage', 'wall'], ['#almanac', 'wall'], ['#signal-desk', 'desk']];
function hallPieces() {
  var out = [];
  HALL.forEach(function (h) {
    var e = $(h[0]);
    if (!e) return;
    var r = e.getBoundingClientRect();
    if (!r.width || !r.height) return;
    out.push({ el: e, kind: h[1], L: r.left, T: r.top, B: r.bottom });
  });
  return out;
}
function hallPlace(h, cam, G) {
  var Px = cam.Px, Py = cam.Py, f = cam.f;
  if (h.kind === 'floor') {
    // (u, v) on the screen at rest to (U x, U distance) on the floor
    return 'translate3d(0px,0px,' + f2(U * G.zEnd) + 'px) rotateX(-90deg) matrix3d(' +
      [U * EYE, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, -U * EYE * Px, U * f * EYE, 0, -Py].map(f5).join(',') + ')';
  }
  var D = h.kind === 'desk' ? G.Ddesk : G.D, k = U * D / f;
  return 'translate3d(' + f3(-k * Px) + 'px,' + f3(-U * EYE - k * Py) + 'px,' + f3(U * (G.zEnd - D)) + 'px) scale(' + f5(k) + ')';
}

/* =========================================================================
   Assembly
   ========================================================================= */
function build(host, P, cam, T, G) {
  var world = div('e-world');
  host.insertBefore(world, host.firstChild);
  var foyer = $('#e-foyer'), sunHost = $('#e-sun');
  var fworld = foyer ? div('e-world', foyer) : null, sworld = sunHost ? div('e-world', sunHost) : null;
  var parts = [];
  var add = function (p) {
    var w = p.host === 'foyer' ? fworld : p.host === 'sun' ? sworld : world;
    if (!w) return p;
    w.appendChild(p.el); parts.push(p); return p;
  };
  // inside, back to front
  buildFoyer(P, G).forEach(add);
  if (!P.night) buildSun(G).forEach(add);
  // the street, back to front
  buildReveal(P).forEach(add);
  var leaves = [add(buildLeaf(-1, P)), add(buildLeaf(1, P))];
  var mid = Math.min(CAN.half + 0.3, WALL);
  var uppers = [add(buildUpper(P, -mid, mid, 'e-upper-m'))];
  if (WALL > mid) {
    uppers.push(add(buildUpper(P, -WALL, -mid + 0.02, 'e-upper-l')));
    uppers.push(add(buildUpper(P, mid - 0.02, WALL, 'e-upper-r')));
  }
  var walls = [add(buildWall(-1, P, false)), add(buildWall(1, P, false))];
  if (WALL > SPLIT) walls.push(add(buildWall(-1, P, true)), add(buildWall(1, P, true)));
  add(buildSurround(-1, P)); add(buildSurround(1, P));
  var sides = [add(buildSide(-1, P)), add(buildSide(1, P))];
  var transom = add(buildTransom(P));
  add(buildJambs(P));
  var shade = !P.night ? add(buildShade()) : null;
  var dusk = P.night ? add(buildDusk(T)) : null;
  if (P.night) { add(buildMirrorGround()); add(buildMirror()); }
  var rows = buildGround(P, G.rows).map(add);
  var stanchions = add(buildStanchions(P));
  var soffit = buildSoffit(P).reverse().map(add);
  var fascia = add(buildFascia(P));
  var cloud = null;
  if (!P.night) {
    cloud = div('e-cloud', host);
    cloud.style.width = f2(cam.W * 2.6) + 'px';
  }
  return {
    world: world, fworld: fworld, sworld: sworld, parts: parts, leaves: leaves, uppers: uppers, walls: walls, sides: sides,
    transom: transom, dusk: dusk, shade: shade, rows: rows, soffit: soffit, fascia: fascia, stanchions: stanchions,
    cloud: cloud
  };
}

/* =========================================================================
   Animation
   ========================================================================= */
function samples(end) {
  var out = [];
  for (var t = 0; t < end; t += STEP) out.push(t);
  out.push(end);
  return out;
}
/* One animation on the entrance's clock: `frames` are [ms, {props}] pairs,
   laid on a timeline as long as the whole entrance. */
function run(el, frames, total, fill) {
  if (!el) return null;
  var kf = frames.map(function (fr) {
    var k = {};
    for (var p in fr[1]) k[p] = fr[1][p];
    k.offset = Math.min(1, Math.max(0, fr[0] / total));
    return k;
  });
  if (kf[0].offset > 0) { var first = {}; for (var q in kf[0]) first[q] = kf[0][q]; first.offset = 0; delete first.easing; kf.unshift(first); }
  var lastK = kf[kf.length - 1];
  if (lastK.offset < 1) { var last = {}; for (var r in lastK) last[r] = lastK[r]; last.offset = 1; delete last.easing; kf.push(last); }
  var a = el.animate(kf, { duration: total, fill: fill || 'both' });
  a.pause();
  anims.push(a);
  return a;
}
/* A lamp that is out stands at 0.004, not 0: invisible, but a layer the
   compositor still draws, so its first light is not also its first draw. */
function fade(el, pts, total) {
  // a layer of canvases carries its fade on each canvas (Levels.animate)
  if (el && el.__layer && !el.__solid) {
    el.__fade = pts.map(function (p) { return [p[0], Math.max(0.004, p[1]), p[2] || null]; });
    return null;
  }
  return run(el, pts.map(function (p) {
    var o = { opacity: Math.max(0.004, p[1]) };
    if (p[2]) o.easing = p[2];
    return [p[0], o];
  }), total);
}
function fadeAll(els, pts, total) { (els || []).forEach(function (e) { fade(e, pts, total); }); }

/* The camera's keyframes for one piece, every STEP ms, and its letting go:
   once it has left the screen for good its last pose is held and it goes
   out, so nothing is drawn that cannot be seen. */
function track(part, cam, times, total) {
  var vis = [], last = -1;
  for (var i = 0; i < times.length; i++) {
    var c = cam.at(times[i]);
    var on = cam.onScreen(c, corners(part, times[i]), 4) && !(part.until && times[i] > part.until);
    vis.push(on);
    if (on) last = i;
  }
  part.lastSeen = last < 0 ? -1 : times[last];
  if (last < 0) return false;
  var frames = [];
  for (var j = 0; j <= Math.min(times.length - 1, last); j++) {
    frames.push([times[j], { transform: cam.css(cam.at(times[j])) + ' ' + placeAt(part, times[j]) }]);
  }
  // Let go by folding it to nothing, not by fading it: an opacity animated on
  // a piece of many tiles made the compositor draw the piece into a surface
  // of its own every frame.
  if (last < times.length - 1) {
    frames[frames.length - 1][1].easing = 'steps(1, end)';
    frames.push([times[last + 1], { transform: 'scale(0)' }]);
  }
  run(part.el, frames, total);
  return true;
}

/* The hall's lamps at the landing (night): the fanlights from the clock
   outward, the pair in each bay together, their floor streaks with them;
   then the marquee's bulbs chase once. A gate drawn again while the walk
   runs (a poll's answer) is given the same cue (E.adopt). */
function bayOrder() {
  var clock = $('#clock');
  if (!clock) return [];
  var restRect = window.restRect || function (e) { return e.getBoundingClientRect(); };
  var c = restRect(clock), mid = c.left + c.width / 2, bays = [];
  $$('#gates .gate.active').forEach(function (g) {
    var r = restRect(g);
    bays.push({ g: g, d: Math.abs(r.left + r.width / 2 - mid), left: r.left + r.width / 2 < mid, i: 0 });
  });
  [true, false].forEach(function (left) {
    bays.filter(function (b) { return b.left === left; })
      .sort(function (a, b) { return a.d - b.d; })
      .forEach(function (b, i) { b.i = i; });
  });
  return bays;
}
function lampTarget(el) {
  // A lamp may be on its way up by its own transition: aim for where it is
  // going, not where it is.
  var tr = el.getAnimations ? el.getAnimations().filter(function (a) { return a.transitionProperty === 'opacity'; })[0] : null;
  if (tr && tr.effect && tr.effect.getKeyframes) {
    var k = tr.effect.getKeyframes();
    if (k.length) return parseFloat(k[k.length - 1].opacity);
  }
  return parseFloat(getComputedStyle(el).opacity);
}
function lightBay(b, total, t) {
  if (b.g.dataset.state !== 'open') return;
  var light = function (el) {
    if (el.__eLit) return;
    var to = lampTarget(el);
    if (!(to > 0.01)) return;
    el.__eLit = true;
    var at = t.house + 110 + Math.min(2, b.i) * t.bayGap;
    var a = fade(el, [[0, 0], [at, 0], [at + t.lampUp, to]], total);
    if (a && S && S.started && !S.frozen && S.startTime != null) a.startTime = S.startTime;
    else if (a && S && S.frozen) a.currentTime = S.frozenAt;
  };
  $$('.lit', b.g).forEach(light);
  $$('.st-fan').forEach(function (s) { if (s.dataset.gate === b.g.id) light(s); });
}
function hallLamps(total, t) { bayOrder().forEach(function (b) { lightBay(b, total, t); }); }
var E_CHASE_STEPS = 28;
function marqueeChase(host, total, at) {
  var tk = $('#ticker'), mq = $('.e-marquee', host);
  if (!tk || !mq) return;
  var r = (window.restRect || function (e) { return e.getBoundingClientRect(); })(tk);
  mq.style.left = r.left + 'px'; mq.style.top = r.top + 'px';
  mq.style.width = r.width + 'px'; mq.style.height = r.height + 'px';
  var ui = parseFloat(getComputedStyle(tk).getPropertyValue('--ui')) || 1;
  var pitch = 13 * ui;
  var runN = Math.max(1, Math.round(r.width * 0.24 / pitch));
  var span = runN + Math.ceil(r.width / pitch);
  var step = Math.ceil(span / E_CHASE_STEPS);
  var from = -runN * pitch, to = (step * E_CHASE_STEPS - runN) * pitch;
  mq.style.setProperty('--ec-w', (runN * pitch) + 'px');
  var dur = 560;
  $$('.e-chase', mq).forEach(function (el, k) {
    var a = k ? to : from, b = k ? from : to, fr = [[0, { transform: 'translateX(' + a + 'px)', opacity: 0 }],
      [at - 1, { transform: 'translateX(' + a + 'px)', opacity: 0 }]];
    for (var s = 0; s <= E_CHASE_STEPS; s++) {
      var x = a + (b - a) * s / E_CHASE_STEPS;
      fr.push([at + dur * s / E_CHASE_STEPS, { transform: 'translateX(' + f2(x) + 'px)', opacity: s === E_CHASE_STEPS ? 0 : 1, easing: 'steps(1, end)' }]);
    }
    run(el, fr, total);
  });
}

/* =========================================================================
   The lights of the street (night) and the day's sun
   ========================================================================= */
function layersOf(part, cls) { return part ? $$('.' + cls, part.el) : []; }
function lights(sc, P, t, total, cam) {
  if (P.night) {
    for (var k = 0; k < 6; k++) {
      var a = t.letters + k * t.letterGap;
      fadeAll(layersOf(sc.fascia, 'e-l' + k), [[0, 0], [a, 0], [a + 30, 0.95], [a + 55, 0.3], [a + 95, 1]], total);
    }
    var lettersUp = t.letters + 6 * t.letterGap;
    fadeAll(layersOf(sc.fascia, 'e-returns'), [[0, 0], [t.letters + 40, 0], [t.letters + 120, 1]], total);
    fadeAll(layersOf(sc.fascia, 'e-wash'), [[0, 0], [t.letters + 60, 0], [lettersUp + 120, 1, 'ease-out']], total);
    fadeAll(layersOf(sc.fascia, 'e-dark'), [[0, 1], [t.letters + 40, 1], [lettersUp + 60, 0, 'ease-out']], total);
    fadeAll(layersOf(sc.fascia, 'e-crest-lit'), [[0, 0.25], [lettersUp - 80, 0.25], [lettersUp + 180, 1, 'ease-out']], total);
    for (var ph = 0; ph < 3; ph++) {
      var pts = [[0, 0], [t.chase, 0], [t.chase + 90, 0.6]];
      for (var s = 0; s < 40; s++) pts.push([t.chase + 120 + s * t.chaseStep, (s % 3) === ph ? 1 : 0.42, 'steps(1, end)']);
      fadeAll(layersOf(sc.fascia, 'e-ph' + ph), pts, total);
    }
    sc.soffit.forEach(function (row, i) {
      var r = sc.soffit.length - 1 - i, at = t.soffit + r * t.soffitGap;
      fadeAll(layersOf(row, 'e-srow'), [[0, 0], [at, 0], [at + 40, 0.8], [at + 70, 0.5], [at + 140, 1]], total);
    });
    sc.uppers.concat(sc.walls, [sc.transom]).forEach(function (p) {
      fadeAll(layersOf(p, 'e-lit'), [[0, 0], [t.posters, 0], [t.soffit + 300, 1, 'ease-out']], total);
    });
    // the brass in the dark, painted only for the start, goes as the lamps
    // come up on it
    fadeAll(layersOf(sc.stanchions, 'e-unlit'), [[0, 1], [t.posters, 1], [t.soffit + 300, 0, 'ease-out']], total);
    // the canopy's lamps come up in the side doors' glass with the soffit
    sc.sides.forEach(function (p) {
      fadeAll(layersOf(p, 'e-refl'), [[0, 0.1], [t.soffit, 0.1], [t.soffit + 260, 1, 'ease-out']], total);
    });
    sc.rows.forEach(function (row) {
      fadeAll(layersOf(row, 'e-lit'), [[0, 0], [t.soffit, 0], [t.soffit + 360, 1, 'ease-out']], total);
      fadeAll(layersOf(row, 'e-spill'), [[0, 0.3], [t.spill[0], 0.3], [t.spill[1], 1, 'ease-in-out']], total);
    });
    if (sc.dusk) fadeAll(layersOf(sc.dusk, 'e-base'), [[0, 1], [t.posters, 1], [t.soffit + 380, 0, 'ease-in-out']], total);
    sc.leaves.concat(sc.sides).forEach(function (l) {
      fadeAll(layersOf(l, 'e-haze'), [[0, 0.96], [t.haze[0], 0.96], [t.haze[1], 0.1, 'ease-in-out']], total);
    });
  } else {
    day(sc, t, total, cam);
  }
}

/* The day: a cloud over the sun, and then the sun. */
function day(sc, t, total, cam) {
  // The cloud's shade lies over the street and slides off to the left as
  // the sun comes out from behind it, the other way from the glint that
  // follows it along the letters.
  if (sc.cloud) {
    var W = cam.W;
    run(sc.cloud, [[0, { transform: 'translateX(' + f2(-1.25 * W) + 'px)' }], [t.cloud[0], { transform: 'translateX(' + f2(-1.25 * W) + 'px)', easing: 'cubic-bezier(0.4, 0, 0.5, 1)' }],
      [t.cloud[1], { transform: 'translateX(' + f2(-2.65 * W) + 'px)' }]], total);
  }
  // the canopy's shadow: soft, then sharp, settling a little down the wall
  fadeAll(layersOf(sc.shade, 'e-shade-soft'), [[0, 1], [t.shadow[0], 1], [t.shadow[1], 0, 'ease-in-out']], total);
  fadeAll(layersOf(sc.shade, 'e-shade-sharp'), [[0, 0], [t.shadow[0], 0], [t.shadow[1], 1, 'ease-in-out']], total);
  layersOf(sc.shade, 'e-shade-sharp').forEach(function (e) {
    run(e, [[0, { transform: 'translateY(' + f2(-0.16 * U) + 'px)' }], [t.shadow[0], { transform: 'translateY(' + f2(-0.16 * U) + 'px)', easing: 'cubic-bezier(0.3, 0, 0.3, 1)' }],
      [t.shadow[1] + 120, { transform: 'translateY(0px)' }]], total);
  });
  // the glint runs along the gilt, letter by letter, A to M
  for (var k = 0; k < 6; k++) {
    var a0 = t.sheen + k * t.sheenGap, step = t.sheenDur / SHEEN_N;
    for (var j = 0; j < SHEEN_N; j++) {
      var at = a0 + j * step, peak = j === 0 || j === SHEEN_N - 1 ? 0.5 : 1;
      fadeAll(layersOf(sc.fascia, 'e-sh' + k + '-' + j), [[0, 0], [at - step * 0.7, 0], [at, peak], [at + step * 0.9, 0]], total);
    }
  }
  // the glass: the street's reflection thins, the sun's glare comes up
  sc.leaves.concat(sc.sides).forEach(function (l) {
    fadeAll(layersOf(l, 'e-haze'), [[0, 0.97], [t.haze[0], 0.97], [t.haze[1], 0.5, 'ease-out'], [1500, 0.22, 'ease-in-out']], total);
  });
  sc.sides.forEach(function (p) {
    fadeAll(layersOf(p, 'e-glare'), [[0, 0.25], [t.sun[0], 0.25], [t.sun[1], 1, 'ease-out']], total);
  });
  // The right leaf flashes as it swings through the angle that throws the
  // sun at the reader.
  var flash = layersOf(sc.leaves[1], 'e-flash')[0], fpts = [];
  var T0 = t.doors + t.doorLag, T1 = T0 + t.doorsDur;
  for (var ms = T0; ms <= T1; ms += STEP) {
    var s = swing(t, ms, 1), c = cam.at(ms);
    var aa = s * D2R, N = [-Math.sin(aa), 0, Math.cos(aa)], LN = LIGHT[0] * N[0] + LIGHT[2] * N[2];
    var Rv = norm([LIGHT[0] - 2 * LN * N[0], LIGHT[1], LIGHT[2] - 2 * LN * N[2]]);
    var ctr = [OPEN - 0.5 * Math.cos(aa), 1.45, -0.5 * Math.sin(aa)], toEye = norm([c.x - ctr[0], c.y - ctr[1], c.z - ctr[2]]);
    // horizontally only: the leaf turns about an upright hinge
    var hR = Math.atan2(Rv[0], Rv[2]), hE = Math.atan2(toEye[0], toEye[2]), dh = (hR - hE) / D2R;
    fpts.push([ms, Math.min(1, 1.15 * Math.exp(-dh * dh / 800)) * clamp01((ms - T0) / 100)]);
  }
  if (flash) fade(flash, [[0, 0], [T0, 0]].concat(fpts.map(function (p) { return [p[0], p[1]]; })).concat([[T1 + 40, 0]]), total);
  // The sun through the doors: the foyer's bands come up as the cloud goes,
  // the leaves' shadows draw back as the doors open, and the bands settle
  // as the eye adjusts.
  sc.parts.filter(function (p) { return p.host === 'sun'; }).forEach(function (p) {
    fade(p.el, [[0, 0], [t.sun[0], 0], [t.sun[1], 1, 'ease-out'], [t.sunOut[0], 1], [t.sunOut[1], 0, 'ease-in-out']], total);
    if (p.window) sunWindow(p.window, t, total);
  });
}
/* Where the free edge of each centre leaf casts its shadow, across the
   window's frame, frame by frame. */
function sunWindow(w, t, total) {
  var box = w.part.box, fa = [], fb = [], ia = [], ib = [], dAs = [], dBs = [];
  var T0 = t.doors, T1 = t.doors + t.doorLag + t.doorsDur;
  var ca = Math.cos(w.ang), sa = Math.sin(w.ang), rot = 'rotate(' + f4(w.ang / D2R) + 'deg) ', un = ' rotate(' + f4(-w.ang / D2R) + 'deg)';
  var ms;
  for (ms = T0 - STEP; ms <= T1 + STEP; ms += STEP) {
    var sl = swing(t, ms, -1) * D2R, sr = swing(t, ms, 1) * D2R;
    var eL = [-OPEN + OPEN * Math.cos(sl), -OPEN * Math.sin(sl)], eR = [OPEN - OPEN * Math.cos(sr), -OPEN * Math.sin(sr)];
    // how far across the frames' axis a leaf's free edge casts its shadow
    var off = function (e) {
      if (w.kind === 'wall') return (e[0] + LIGHT[0] * ((w.part.z - e[1]) / LIGHT[2]) - box.a0) * U;
      var px = (e[0] - box.a0) * U, py = (box.b1 - e[1]) * U;
      return px * ca + py * sa;
    };
    dAs.push([ms, off(eL)]); dBs.push([ms, off(eR)]);
  }
  // The frames need cover only the beam's own box (they were once cut
  // twice the piece's diagonal square, 3700 px at 3440, and rastered again
  // every frame they moved): across the edges' axis, from the furthest the
  // left edge goes to the beam's far side, and so for the right; along it,
  // the beam's reach either way.
  var sub = w.layer.__sub || box, xs = [], ys = [];
  [[sub.a0, sub.b1], [sub.a1, sub.b1], [sub.a1, sub.b0], [sub.a0, sub.b0]].forEach(function (q) {
    var px = (q[0] - box.a0) * U, py = (box.b1 - q[1]) * U;
    xs.push(px * ca + py * sa); ys.push(-px * sa + py * ca);
  });
  var minA = Math.min.apply(null, dAs.map(function (q) { return q[1]; })), maxB = Math.max.apply(null, dBs.map(function (q) { return q[1]; }));
  var B = Math.ceil(Math.max(Math.max.apply(null, xs) - minA, maxB - Math.min.apply(null, xs),
    2 * Math.max.apply(null, ys.map(Math.abs))) + 60);
  [w.A.f, w.B.f].forEach(function (f) { f.style.width = B + 'px'; f.style.height = B + 'px'; });
  w.size = B;
  for (var k = 0; k < dAs.length; k++) {
    ms = dAs[k][0];
    var dA = dAs[k][1], dB = dBs[k][1];
    // frame A holds what lies past the left leaf's edge, frame B what lies
    // short of the right leaf's; each content is carried back to the piece
    fa.push([ms, { transform: rot + 'translate(' + f2(dA) + 'px,' + f2(-B / 2) + 'px)' }]);
    ia.push([ms, { transform: 'translate(' + f2(-dA) + 'px,' + f2(B / 2) + 'px)' + un }]);
    fb.push([ms, { transform: rot + 'translate(' + f2(dB - B) + 'px,' + f2(-B / 2) + 'px)' }]);
    ib.push([ms, { transform: 'translate(' + f2(B - dB) + 'px,' + f2(B / 2) + 'px)' + un }]);
  }
  run(w.A.f, fa, total); run(w.A.inner, ia, total);
  run(w.B.f, fb, total); run(w.B.inner, ib, total);
}

/* =========================================================================
   Public
   ========================================================================= */
var E = window.Entrance = {};

/* The camera for this theme and screen. yEnd is the eye point in the hall
   (the clock's dial), where the horizon lands. */
function stageFor(opts) {
  var theme = opts.theme === 'ivory' ? 'ivory' : 'onyx';
  var W = window.innerWidth, H = window.innerHeight, t = TIMES[theme];
  var Py = opts.yEnd || H * 0.45, f = FK * H;
  var zEnd = f * OPEN / (0.51 * W) - REVEAL;
  var cam = new Camera({ W: W, H: H, Py: Py, f: f, t: t, zEnd: zEnd, z0: Math.max(Z0, zEnd + 4.2) });
  return { theme: theme, W: W, H: H, t: t, Py: Py, f: f, zEnd: zEnd, cam: cam };
}

/* The plate, until the street is painted: the street as the first frame
   will show it, out of focus. Its big shapes and its light (by night the
   dark front and the lit doors, by day the stone under a cloud and the
   cool glass) are drawn where the camera will see them, on a canvas an
   eighth of the screen's size and blurred, and the screen enlarges it.
   It is drawn in a few ms, before the page's first frame, so the first
   thing the reader sees is the street coming into focus, never a flat
   colour. The textures and faces the paint needs are asked for now. */
var SKETCH = {
  onyx: { bg: '#0a0807', fascia: '#16110c', soffit: '#21180f', bay: '#3a2a1a', frame: '#5c4329', fan: '#d9954e',
    side: '#caa06a', centre: '#dab884', pave: '#120e0b', spill: 'rgba(196,140,80,0.55)', sky: null },
  ivory: { bg: '#6a6c71', fascia: '#7d8082', soffit: '#56575b', bay: '#48443f', frame: '#5a524a', fan: '#6f7f90',
    side: '#5f6873', centre: '#6a7684', pave: '#5e5c63', spill: null, sky: '#8793a0' }
};
E.sketch = function (host, opts) {
  var plate = $('.e-plate', host);
  var st = stageFor(opts);
  texReady(st.theme); fontsReady();
  if (!plate) return;
  var k = 1 / 8, cw = Math.ceil(st.W * k), ch = Math.ceil(st.H * k);
  var cv = $('canvas', plate) || plate.appendChild(document.createElement('canvas'));
  cv.width = cw; cv.height = ch;
  var x = cv.getContext('2d'), C = SKETCH[st.theme], cam = st.cam, c0 = cam.at(0);
  if (!x) return;
  if ('filter' in x) x.filter = 'blur(1.6px)';
  x.scale(k, k);
  x.fillStyle = C.bg; x.fillRect(-40, -40, st.W + 80, st.H + 80);
  var poly = function (pts, fill) {
    var q = pts.map(function (p) { return cam.project(c0, p); });
    if (q.some(function (p) { return !p; })) return;
    x.beginPath();
    q.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); });
    x.closePath(); x.fillStyle = fill; x.fill();
  };
  var face = function (x0, x1, y0, y1, z, fill) { poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill); };
  var level = function (x0, x1, z0, z1, y, fill) { poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], fill); };
  var near = c0.z - 1.5;
  // the pavement, and by night the doors' light spilt on the wet stone
  level(-WALL, WALL, 0, near, 0, C.pave);
  if (C.spill) poly([[-SIDE, 0, 0], [SIDE, 0, 0], [SIDE + 1.6, 0, Math.min(near, 3.4)], [-SIDE - 1.6, 0, Math.min(near, 3.4)]], C.spill);
  // the bay: its bronze, the fanlights, the six doors' glass
  face(-BAY, BAY, 0, HEAD, 0, C.bay);
  [-2.08, 0, 2.08].forEach(function (cx) {
    var r = (cx ? 0.9 : 1) * 0.62, pts = [];
    for (var i = 0; i <= 10; i++) { var a = Math.PI * i / 10; pts.push([cx - Math.cos(a) * r * 1.45, DOOR_H + 0.1 + Math.sin(a) * r * 0.75, 0]); }
    poly(pts, C.fan);
  });
  face(-SIDE, SIDE, 0, DOOR_H, 0, C.frame);
  [-1, 1].forEach(function (sd) {
    var a = sd * (OPEN + JAMB + 0.09), b = sd * (SIDE - 0.09);
    face(Math.min(a, b), Math.max(a, b), 0.3, DOOR_H - 0.12, 0, C.side);
  });
  face(-OPEN + 0.09, OPEN - 0.09, 0.3, DOOR_H - 0.12, 0, C.centre);
  if (C.sky) face(-OPEN + 0.09, OPEN - 0.09, 1.9, DOOR_H - 0.12, 0, C.sky);
  // the canopy: its underside and its fascia
  level(-CAN.half, CAN.half, 0, CAN.z, CAN.y0, C.soffit);
  face(-CAN.half - 0.24, CAN.half + 0.24, CAN.y0 - 0.02, CAN.crest, CAN.z, C.fascia);
};

/* Dress the street for this theme and screen, every piece in its first
   pose, the clock parked: nothing moves until start(). yEnd is the eye
   point in the hall (the clock's dial), where the horizon lands. Returns a
   promise that settles once every piece is painted. */
E.dress = function (host, opts) {
  E.clear(true);
  var st = stageFor(opts);
  var theme = st.theme, W = st.W, H = st.H, t = st.t, Py = st.Py, f = st.f, zEnd = st.zEnd, cam = st.cam;
  var P = palette(theme, opts.wing);
  // The foyer, sized to the hall: its far wall is the hall's own wall, the
  // floor line on the floor, the top of the screen at rest where the
  // ceiling meets it.
  var hall = hallPieces();
  var fp = hall.filter(function (h) { return h.kind === 'floor'; })[0], dk = hall.filter(function (h) { return h.kind === 'desk'; })[0];
  var yFloor = fp ? fp.T : H * 0.7;
  var D = Math.max(3.5, Math.min(16, f * EYE / Math.max(20, yFloor - Py)));
  var G = { zEnd: zEnd, D: D, zWall: zEnd - D, Xw: (W / 2) * D / f, Yc: EYE + Py * D / f, half: W / 2, f: f };
  G.Dnear = f * EYE / Math.max(20, H - Py); G.zNear = zEnd - G.Dnear;
  G.Ddesk = dk ? Math.max(1.5, Math.min(D, f * EYE / Math.max(20, dk.B - Py))) : D;
  // The hall's floor where it meets the foyer, in metres: its terrazzo (a
  // tile 0.9 of the floor box's height across, in the plane's px, which are
  // screen px along that line), its runner (12.5% of a plane twice the
  // screen's width) and the runner's weave, and the soft edge between them.
  var fh = fp ? Math.max(40, fp.B - fp.T) : H * 0.3, mpp = G.Dnear / f;
  P.tz = 0.9 * fh * mpp; P.rt = 0.62 * fh * mpp;
  G.runner = 0.1275 * W * mpp; P.rb = 2 * G.runner * 0.11;
  G.slab = 0.2 * W * mpp;
  G.feather = Math.max(0.25, Math.min(0.45, 60 * mpp));
  // how much of the street the first frame shows
  var c0 = cam.at(0), ext = { x: 0, y: 0 };
  [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (q) {
    var vx = (q[0] - cam.Px) / f, vy = -(q[1] - Py) / f, th = c0.pitch * D2R;
    var dir = [vx, vy * Math.cos(th) + Math.sin(th), vy * Math.sin(th) - Math.cos(th)];
    var k = c0.z / -dir[2];
    ext.x = Math.max(ext.x, Math.abs(c0.x + dir[0] * k));
    ext.y = Math.max(ext.y, c0.y + dir[1] * k);
  });
  WALL = Math.min(15, ext.x + 0.9);
  UPPER = Math.min(11, ext.y + 0.5);
  G.rows = [];
  for (var z = 0, k = 0; z < c0.z - 0.5; z += 0.8, k++) {
    var z1 = Math.min(z + 0.8, c0.z);
    G.rows.push([z, z1, Math.min(WALL, (W / 2) * (c0.z - z) / f + 1.2)]);
  }
  billN = 0;
  var sc = build(host, P, cam, t, G);
  var my = S = { host: host, sc: sc, cam: cam, P: P, t: t, theme: theme, W: W, H: H, G: G, ready: false, hall: hall };
  S.total = theme === 'ivory' ? t.end : t.house + 110 + 2 * t.bayGap + t.lampUp;
  var t0 = performance.now();
  pose0();
  root.classList.add('e-hold');
  // The hall is drawn at rest as layers (html.e-hold), so it is rastered
  // at the size it lands at; it takes its first pose (prepose) once it is
  // built. All of it, the street too, is drawn under the plate, which is a
  // hair short of opaque so that nothing under it is left undrawn: whatever
  // is drawn for the first time is drawn now, not in the walk's first
  // frames.
  S.times = { dress: Math.round(t0) };
  var assets = Promise.all([texReady(theme), fontsReady()]);
  // The tiles are planned while the textures and the faces come in; each
  // level shows in its own stretch, parked with the rest until the clock
  // starts.
  var p = S.plan = paint(sc.parts.filter(function (q) { return q.lastSeen >= 0; }), cam, P);
  S.stats = p.stats;
  var n0 = anims.length;
  Levels.animate(p, S.total);
  var now0 = document.timeline.currentTime || 0;
  for (var i = n0; i < anims.length; i++) anims[i].startTime = now0 + BIG;
  S.times.planned = Math.round(performance.now());
  return assets.then(function () {
    if (S !== my) return false;
    S.times.assets = Math.round(performance.now());
    S.fontsOk = !document.fonts || faces().every(function (f) { return document.fonts.check(f); });
    return p.draw();
  }).then(function (ok) {
    if (S !== my || ok === false) return false;
    // The canvases' drawing is queued for the GPU and run there in order;
    // reading a pixel back waits until all of it has run, so the walk does
    // not begin with the GPU still at it (it ran into the walk's first
    // second on a new profile at 3440). Read in the frame after the last
    // draw, once every canvas has handed its drawing over.
    S.times.drawn = Math.round(performance.now());
    return nextFrame(1).then(function () {
      if (S !== my) return false;
      drain(S.plan);
      S.times.drained = Math.round(performance.now());
      S.drainMs = S.times.drained - S.times.drawn;
      S.ready = true;
      S.paintMs = Math.round(performance.now() - t0);
      window.__entrancePaintMs = S.paintMs;
      return true;
    });
  });
};
function nextFrame(n) {
  return new Promise(function (res) {
    var k = n || 1;
    requestAnimationFrame(function tick() { if (--k <= 0) res(); else requestAnimationFrame(tick); });
  });
}
function drain(plan) {
  var L = null;
  for (var i = plan.all.length - 1; i >= 0 && !L; i--) if (plan.all[i].painted && plan.all[i].cv.width) L = plan.all[i];
  if (!L) return;
  try { L.cv.getContext('2d').getImageData(0, 0, 1, 1); } catch (e) { /* nothing to wait for */ }
}

/* Pose everything for the walk: the camera's pieces, the hall, the lights. */
function pose0() {
  anims.forEach(function (a) { a.cancel(); });
  anims = [];
  var sc = S.sc, cam = S.cam, t = S.t, total = S.total;
  var times = samples(Math.max(cam.walkEnd, t.tilt[1], t.doors + t.doorLag + t.doorsDur) + STEP);
  sc.parts.forEach(function (p) {
    if (!track(p, cam, times, total)) p.el.style.display = 'none';
  });
  // The hall takes its pose only when the clock starts: while the street
  // stands, the hall stands at rest, laid out, measured and drawn at the
  // size it lands at. Parked with no backward fill.
  var ht = samples(cam.walkEnd);
  S.hall.forEach(function (h) {
    h.place = hallPlace(h, cam, S.G);
    var fr = ht.map(function (ms) { return [ms, { transform: hallAt(h, cam.at(ms)) }]; });
    // The walk ends on the identity itself, not the last pose computed (the
    // identity as a 3D matrix), as the reader comes to a stop. (The floor's
    // pixel step at the landing was its fractional top: atrium.css puts it
    // on a whole pixel.)
    fr[fr.length - 1][1].easing = 'steps(1, end)';
    fr.push([cam.walkEnd + 1, { transform: 'none' }]);
    h.anim = run(h.el, fr, total, 'forwards');
  });
  // The inside seen from the sunlit (day) or dark (night) street: dimmer
  // until the reader is in it.
  // The plate over the street lifts as the clock starts.
  var plate = $('.e-plate', S.host);
  if (plate) run(plate, [[0, { opacity: 0.996, easing: 'cubic-bezier(0.3, 0, 0.45, 1)' }], [t.reveal[1], { opacity: 0 }]], total);
  var veil = $('#e-veil');
  if (veil) fade(veil, S.P.night ? [[0, 1], [t.veil[0], 1], [t.veil[1], 0, 'ease-in-out']] : [[0, 1], [t.veil[0], 1], [t.veil[1], 0, 'ease-in-out']], total);
  lights(sc, S.P, t, total, cam);
  // The foyer's floor goes as the reader reaches the threshold: by then
  // only its soft edge over the hall's floor is on the screen, and the hall
  // lands without it.
  sc.parts.forEach(function (p) {
    if (p.el.classList.contains('e-nfloor')) fadeAll(layersOf(p, 'e-base'), [[0, 1], [cam.walkEnd - 320, 1], [cam.walkEnd - 20, 0, 'ease-in']], total);
  });
  park();
}
function hallAt(h, c) {
  return 'translate(' + f2(-h.L) + 'px,' + f2(-h.T) + 'px) ' + S.cam.css(c) + ' ' + h.place + ' translate(' + f2(h.L) + 'px,' + f2(h.T) + 'px)';
}
function park() {
  var now = document.timeline.currentTime || 0;
  anims.forEach(function (a) { a.startTime = now + BIG; });
}

/* Re-aim the walk at the hall's eye point when the stage is solved while
   the street stands: the foyer is sized to the hall, so it is dressed
   again. */
E.measure = function (yEnd) {
  if (!S || S.started) return false;
  var fp = $('#floorplane'), yf = fp ? (window.restRect || function (e) { return e.getBoundingClientRect(); })(fp).top : 0;
  var was = S.hall.filter(function (h) { return h.kind === 'floor'; })[0];
  if (Math.abs(yEnd - S.cam.Py) < 0.5 && (!was || Math.abs(was.T - yf) < 0.5)) return false;
  return true;
};

/* The hall's first pose, drawn while the street still stands: the hall is
   drawn at rest first (the size it lands at, kept by html.e-hold), then
   posed where the walk begins, so the clock starts with nothing of the hall
   left to draw for the first time. It shows behind the haze on the glass.
   Called once the hall is built: SVG text laid out under the pose is laid
   out for it (Chrome sizes the glyphs for the scale they are drawn at). */
E.prepose = function () {
  if (!S || S.started || S.preposed) return false;
  S.preposed = true;
  root.classList.add('e-posed');
  var c = S.cam.at(0);
  // Held there by an animation, not a style: one that runs on to the
  // hall's own pose at rest over a thousand years, so it does not move,
  // and the compositor draws the hall as a transform animation from here
  // on. Posed by a style, the hall was drawn again at the scale the walk
  // reaches (the floor's plane, 7000px wide at 3440) in the frame the walk
  // started, and on a new profile that froze the walk's first 300-500ms.
  S.hall.forEach(function (h) { if (h.anim) h.anim.effect.updateTiming({ fill: 'both' }); });
  return true;
};

/* A GPU drawing for the first time (coldGpu) builds what it draws the hall
   with at each new size the first time it meets it, and the walk's first
   step met them all at once (300-500ms at 3440). So there, under the
   plate, the hall is run for a few frames at points along the walk and put
   back, and the walk finds them built. Calls fn once it has. */
E.warm = function (fn) {
  if (!S || S.started || !S.hall || S.warmed) { fn(); return; }
  if (S.warming) { S.warming.push(fn); return; }
  var my = S, waiting = S.warming = [fn];
  var hall = S.hall.filter(function (h) { return h.anim; }), pts = [0.35, 0.7, 1], k = 0;
  var done = function () {
    if (my.warming === waiting) { my.warming = null; my.warmed = true; }
    waiting.forEach(function (f) { f(); });
  };
  var step = function () {
    if (S !== my || S.started) { done(); return; }
    var now = document.timeline.currentTime || performance.now();
    if (k < pts.length) {
      var at = pts[k++] * S.cam.walkEnd;
      hall.forEach(function (h) { h.anim.startTime = now - at; });
      nextFrame(3).then(step);
      return;
    }
    hall.forEach(function (h) { h.anim.startTime = now + BIG; });
    done();
  };
  step();
};

/* Everything the walk's first frame would otherwise measure, measured
   now: the fanlights' bays and the marquee, read at rest (one lift of the
   pose for all of it), and their cues laid on the clock. Called a few
   frames before start(), so the clock's first frame only starts it. */
E.prime = function () {
  if (!S || S.started || S.primed || !S.ready) return false;
  S.primed = true;
  if (S.P.night) {
    var atRest = window.atRest || function (fn) { return fn(); };
    atRest(function () {
      hallLamps(S.total, S.t);
      marqueeChase(S.host, S.total, S.t.marquee);
    });
    var now = document.timeline.currentTime || 0;
    anims.forEach(function (a) { if (a.playState === 'paused') a.startTime = now + BIG; });
  }
  return true;
};

/* The clock starts `lead` ms from now: every animation is handed its start
   time at once, and the frames that carry that to the compositor (a few,
   and heavy at 3440) go out while the street still stands at its first
   pose. Returns the clock's zero, on the page's clock. */
E.start = function (lead) {
  if (!S || S.started || !S.ready) return null;
  E.prime();
  S.started = true;
  root.classList.add('e-posed');
  E.prepose();
  var now = document.timeline.currentTime;
  if (now == null) now = performance.now();
  S.startTime = now + Math.max(0, lead || 0);
  anims.forEach(function (a) { a.startTime = S.startTime; });
  // the hall's own track takes over from its hold at the clock's zero
  holdUntil(S.startTime);
  if (S.plan) Levels.start(S.plan);
  return S.startTime;
};

/* The hold on the hall's first pose lets go a little after the clock
   starts: until the walk's first step the hall's track holds that same
   pose, so the hand-over shows nothing, and the hall is a transform
   animation throughout. Or at once, when the street is cleared. */
var holdTimer = 0;
function holdUntil(t) {
  clearTimeout(holdTimer);
  holdTimer = setTimeout(dropHold, Math.max(0, t - performance.now()) + 150);
}
function dropHold() {
  clearTimeout(holdTimer);
  if (!S || !S.holdAnims) return;
  S.holdAnims.forEach(function (a) { try { a.cancel(); } catch (e) { /* gone */ } });
  S.holdAnims = null;
}

/* A gate drawn again while the walk runs joins the fanlights' cascade on
   the clock, where its bay stands in it. */
E.adopt = function () {
  if (!S || !(S.started || S.primed) || !S.P.night) return;
  bayOrder().forEach(function (b) { lightBay(b, S.total, S.t); });
};

/* Stop the clock at ms (frame capture). */
E.seek = function (ms) {
  if (!S) return Promise.resolve();
  if (!S.started) E.start();
  S.frozen = true; S.frozenAt = ms;
  dropHold();
  anims.forEach(function (a) { a.pause(); a.currentTime = ms; });
  return S.plan ? Levels.seek(S.plan) : Promise.resolve();
};

/* Everything off: the hall at rest, the street gone (the plate's sketch
   too, unless the street is only being dressed again). */
E.clear = function (keepSketch) {
  Levels.stop();
  if (S && S.hall) S.hall.forEach(function (h) { h.el.style.removeProperty('transform'); });
  dropHold();
  anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* gone */ } });
  anims = [];
  $$('.lit, .st-fan').forEach(function (e) { if (e.__eLit) e.__eLit = false; });
  root.classList.remove('e-hold', 'e-posed');
  if (S && S.sc) {
    [S.sc.world, S.sc.fworld, S.sc.sworld, S.sc.cloud].forEach(function (w) { if (w && w.parentNode) w.parentNode.removeChild(w); });
  }
  // Out of the page, the canvases still held their pixels (300 MB at 3440)
  // until the next full collection, seconds later. Emptied now, they go at
  // once, and so do the layers' pictures.
  if (S && S.plan) {
    S.plan.all.forEach(function (L) { L.cv.width = 0; L.cv.height = 0; });
    S.plan.layers.forEach(function (l) { dropImage(l); });
  }
  if (!keepSketch) $$('.e-plate canvas').forEach(function (c) { c.width = 0; c.height = 0; });
  S = null;
};

E.beats = function () { return S ? { doneFade: S.t.doneFade, total: S.total } : null; };
E.running = function () { return !!(S && S.started); };
/* The GPU is drawing for the first time (a new profile, its shaders not
   yet built): its drawing of the street took more than 400ms to run (1.7
   to 1.9s on a new profile at 3440; under 200ms on a GPU that has drawn
   the hall before, even a busy one). The hall's first raster then comes
   in waves for a second or more after it, a frame or two apart. */
E.coldGpu = function () { return !!(S && S.drainMs > 400); };
E.ready = function () { return !!(S && S.ready); };
E.frozen = function () { return !!(S && S.frozen); };
E.stats = function () {
  if (!S) return null;
  var c = S.cam;
  return { fonts: S.fontsOk, times: S.times, paint: S.stats, peak: S.stats && S.stats.peak, speed: c.walk.speed, path: c.walk.len, z0: c.z0, zEnd: c.zEnd, pitch0: c.pitch0, f: c.f, G: S.G };
};
/* The camera at ms, for checks. */
E.cameraAt = function (ms) { return S ? S.cam.at(ms) : null; };

})();
