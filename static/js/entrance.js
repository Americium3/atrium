/* The entrance: through the doors (DESIGN.md, "Entrance animation").

   The reader stands on the pavement in front of the picture palace. Over
   the entrance hangs the canopy: ATRIUM in bulbs on its fascia, a coffered
   soffit of downlights under it. Ahead is the entrance bay, a bronze
   storefront of three pairs of doors under a row of fanlights, and through
   the clear glass of the centre pair the foyer: the hall itself, standing
   far behind the doors. The doors swing in, and the reader walks through
   them. The hall lands exactly where it rests.

   The street is a small projective scene. Every object is a flat piece in
   the world (metres; x to the right, y up from the pavement, z out from
   the door plane toward the street), and the camera walks down z at eye
   height, tilting from the canopy down to the doors as it goes. Each frame
   of the walk is sampled every STEP ms into Web Animations keyframes, one
   list per piece, so every moving part runs on the compositor and the
   whole timeline can be stopped at any millisecond (seek()).

   Two kinds of piece:
   - Faces toward the camera (the facade, the fascia): a 2D translate and
     scale, their size falling off as 1/distance.
   - Planes seen at an angle (the pavement, the soffit, the door leaves):
     the same camera as a perspective() transform, with the piece placed
     and turned in the world.
   A piece is let go once it has left the screen for good: its last pose is
   held and it fades out, so nothing is drawn from behind the camera.

   Every layer of every piece is painted once, while the street stands
   before the clock starts, into a <canvas> at the resolution the walk will
   ask of it at most (capped). The compositor then only moves textures: a
   piece scaled eightfold as the reader reaches the doors is never
   rastered again. Drawn as SVG and scaled live, the facade alone put
   frames of 100-270ms into the walk at 3440, rastering each piece again as
   it grew.

   The hall is not a picture of the hall. #hall and #signal-desk are scaled
   about the eye point as the far wall of the foyer would be, HALL_D metres
   behind the doors, and land at scale 1 on the last frame of the walk. */
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
var f5 = function (v) { return (Math.round(v * 100000) / 100000).toString(); };

/* ----- The street, in metres -------------------------------------------- */
var EYE = 1.6;          // eye height over the pavement
var U = 100;            // CSS px per metre inside every piece
var OPEN = 1.0;         // half the centre pair's opening
var DOOR_H = 2.7;       // the doors' head
var JAMB = 0.12;        // the bronze jamb either side of the centre pair
var SIDE = 3.05;        // outer edge of the side pairs
var BAY = 3.55;         // outer edge of the bay's stepped surround
var HEAD = 3.4;         // top of the transom; the soffit meets the wall here
var CAN = { z: 3.2, y0: 3.4, y1: 4.8, half: 6.5, crest: 5.36 };
var WALL = 15;          // half the facade's width, cut to the screen (dress)
var UPPER = 11;         // top of the facade we ever see, likewise
var SPLIT = 6.55;       // where the wall's near and far pieces meet
var Z0 = 10.5;          // where the walk starts, from the door plane
var HALL_D = 9;         // the hall's wall behind the doors
var GROUND = [[0, 1], [1, 2], [2, 3.2], [3.2, 4.3], [4.3, 5.4], [5.4, 6.6]];

/* ----- The timeline, ms from the start of the clock ---------------------- */
var STEP = 40;
var EASE_TILT = bezier(0.5, 0.0, 0.3, 1);
var EASE_SWING = bezier(0.42, 0.0, 0.24, 1);
/* The walk is laid out as [ms, how far along] pairs, "how far" measured in
   the log of the distance to the doors, which is how fast the doors grow
   on the screen. It stands nearly still while the canopy lights, gathers
   pace as the doors open, passes under the fascia, and slows into the
   doorway so the hall settles rather than stops. */
var TIMES = {
  onyx: {
    letters: 0, letterGap: 78,
    haze: [40, 560],
    posters: 300,
    soffit: 360, soffitGap: 70,
    chase: 600, chaseStep: 105,
    walk: [[220, 0], [700, 0.03], [1100, 0.115], [1500, 0.285], [1850, 0.525], [2150, 0.77], [2400, 0.935], [2580, 1]],
    tilt: [240, 2200],
    doors: 760, doorsDur: 900, doorLag: 70,
    spill: [800, 1500],
    veil: [2140, 2660],
    house: 2300, marquee: 2480,
    doneFade: 2640
  },
  ivory: {
    haze: [0, 480],
    walk: [[200, 0], [600, 0.04], [1000, 0.15], [1400, 0.33], [1750, 0.565], [2050, 0.785], [2300, 0.945], [2480, 1]],
    tilt: [220, 2120],
    doors: 380, doorsDur: 920, doorLag: 60,
    veil: [2060, 2620],
    doneFade: 2600,
    end: 2760
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
var TEX_FILES = ['stone-portoro.webp', 'stone-calacatta.webp', 'terrazzo-onyx.webp', 'terrazzo-ivory.webp',
  'grain-frost.webp', 'relief-frieze-night.webp', 'relief-frieze-day.webp'];
var TEX = {};
var texReady = Promise.all(TEX_FILES.map(function (f) {
  return fetch('/static/assets/tex/' + f).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) {
    if (!b) return null;
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () { TEX[f] = fr.result; res(); };
      fr.onerror = function () { res(); };
      fr.readAsDataURL(b);
    });
  }).catch(function () { return null; });
}));

/* =========================================================================
   Camera
   ========================================================================= */
function Camera(W, H, yEnd, t) {
  this.W = W; this.H = H; this.t = t;
  this.f = 1.25 * H;
  this.yh0 = 0.66 * H;
  this.yhf = yEnd;
  // The walk ends where the centre pair's jambs stand just past the screen's
  // edges: the doorway is the frame, and the frame has gone.
  this.dF = this.f * OPEN / (0.53 * W);
  this.walk = monotone(t.walk);
  this.walkEnd = t.walk[t.walk.length - 1][0];
}
Camera.prototype.at = function (ms) {
  var t = this.t;
  var z = Z0 * Math.pow(this.dF / Z0, this.walk(ms));
  var v = EASE_TILT(clamp01((ms - t.tilt[0]) / (t.tilt[1] - t.tilt[0])));
  return { z: z, yh: lerp(this.yh0, this.yhf, v) };
};
/* A world point to the screen, or null when it is behind the camera. */
Camera.prototype.project = function (c, x, y, z) {
  var d = c.z - z;
  if (d < 0.05) return null;
  return [this.W / 2 + this.f * x / d, c.yh - this.f * (y - EYE) / d];
};
Camera.prototype.offscreen = function (c, pts) {
  var W = this.W, H = this.H, M = 4;
  var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (var i = 0; i < pts.length; i++) {
    var p = this.project(c, pts[i][0], pts[i][1], pts[i][2]);
    if (!p) return true;
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  return x1 < -M || x0 > W + M || y1 < -M || y0 > H + M;
};

/* =========================================================================
   Pieces and their layers
   ========================================================================= */
function div(cls, parent) {
  var e = document.createElement('div');
  e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}
/* A layer: SVG markup in its piece's metres (a face: x and -y; a plane: x
   and -z), the part of the piece it covers (sub), and how it is painted:
   `res` scales the piece's resolution for soft light that needs little;
   `solid` makes it a plain colour, which needs no painting at all. */
function lay(cls, markup, sub, opts) {
  opts = opts || {};
  return { cls: cls, markup: markup, sub: sub || null, res: opts.res || 1, texts: opts.texts || null, solid: opts.solid || null };
}
function addLayers(part, layers, place) {
  part.layers = {}; part.paint = [];
  layers.forEach(function (l) {
    var sub = l.sub || part.box, r = place(sub);
    var e = document.createElement(l.solid ? 'div' : 'canvas');
    e.className = 'e-layer ' + l.cls;
    e.style.left = f2(r[0]) + 'px'; e.style.top = f2(r[1]) + 'px';
    e.style.width = f2(r[2]) + 'px'; e.style.height = f2(r[3]) + 'px';
    if (l.solid) e.style.background = l.solid;
    part.el.appendChild(e);
    var key = l.cls.split(' ')[0];
    if (!part.layers[key]) part.layers[key] = e;
    if (!l.solid) part.paint.push({ el: e, layer: l, sub: sub, vb: r[4], wm: r[5], hm: r[6] });
  });
}
/* A face toward the camera: a box in the world at depth z. */
function face(cls, box, layers) {
  var e = div('e-card ' + cls);
  var L = box.x0 * U, T = -(box.y1 - EYE) * U;
  e.style.left = L + 'px'; e.style.top = T + 'px';
  e.style.width = (box.x1 - box.x0) * U + 'px';
  e.style.height = (box.y1 - box.y0) * U + 'px';
  e.style.transformOrigin = (-L) + 'px ' + (-T) + 'px';
  var part = { el: e, box: box, kind: 'face' };
  addLayers(part, layers, function (s) {
    return [(s.x0 - box.x0) * U, (box.y1 - s.y1) * U, (s.x1 - s.x0) * U, (s.y1 - s.y0) * U,
      f3(s.x0) + ' ' + f3(-s.y1) + ' ' + f3(s.x1 - s.x0) + ' ' + f3(s.y1 - s.y0), s.x1 - s.x0, s.y1 - s.y0];
  });
  return part;
}
/* A level plane (the pavement, the soffit) from z0 to z1 (z1 nearer), at
   height y. */
function plane(cls, box, layers) {
  var e = div('e-row ' + cls);
  e.style.width = (box.x1 - box.x0) * U + 'px';
  e.style.height = (box.z1 - box.z0) * U + 'px';
  var part = { el: e, box: box, kind: 'plane' };
  addLayers(part, layers, function (s) {
    return [(s.x0 - box.x0) * U, (box.z1 - s.z1) * U, (s.x1 - s.x0) * U, (s.z1 - s.z0) * U,
      f3(s.x0) + ' ' + f3(-s.z1) + ' ' + f3(s.x1 - s.x0) + ' ' + f3(s.z1 - s.z0), s.x1 - s.x0, s.z1 - s.z0];
  });
  return part;
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
    leaf: six(wing === 'bureau' ? 'ag' : 'au'),
    sb: six('sb'),
    brassHi: tok('--brass-hi') || '#f4d68c', brassLo: tok('--brass-lo') || '#2e1f0b',
    // the glass the foyer's light comes through, and the frost on it
    foyer: night ? ['#ffe6b4', '#f3b865', '#b86a24'] : ['#fff6e2', '#f2e2c2', '#cdb58c'],
    frost: night ? ['#ecc585', '#bd7a38', '#5a2a0c'] : ['#f6f8f8', '#dfe5e8', '#aebbc3'],
    stone: night ? 'url(#e-portoro)' : 'url(#e-calacatta)',
    stoneVeil: night ? 'rgba(6, 4, 3, 0.52)' : 'rgba(255, 252, 245, 0.08)',
    joint: night ? 'rgba(0, 0, 0, 0.75)' : 'rgba(96, 82, 60, 0.42)'
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
  tex('e-frost', 'grain-frost.webp', 0.5, 0.5, false);
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
  D['e-sky'] = '<linearGradient id="e-sky" x1="0" y1="0" x2="0.35" y2="1">' +
    '<stop offset="0" stop-color="#eef3f7"/><stop offset="0.45" stop-color="#cfdbe5"/>' +
    '<stop offset="0.72" stop-color="#a9b6bf"/><stop offset="1" stop-color="#8d969a"/></linearGradient>';
  D['e-sheen'] = '<linearGradient id="e-sheen" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,255,255,0)"/><stop offset="0.42" stop-color="rgba(255,255,255,0)"/>' +
    '<stop offset="0.5" stop-color="rgba(255,255,255,1)"/><stop offset="0.62" stop-color="rgba(255,255,255,0)"/>' +
    '<stop offset="1" stop-color="rgba(255,255,255,0)"/></linearGradient>';
  D['e-pool'] = '<radialGradient id="e-pool"><stop offset="0" stop-color="rgba(255,200,130,0.55)"/>' +
    '<stop offset="0.5" stop-color="rgba(255,176,96,0.18)"/><stop offset="1" stop-color="rgba(255,160,80,0)"/></radialGradient>';
  D['e-spill'] = '<linearGradient id="e-spill" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,196,120,0)"/><stop offset="0.7" stop-color="rgba(255,196,120,0.3)"/>' +
    '<stop offset="1" stop-color="rgba(255,208,140,0.55)"/></linearGradient>';
  D['e-wash-up'] = '<linearGradient id="e-wash-up" x1="0" y1="1" x2="0" y2="0">' +
    '<stop offset="0" stop-color="rgba(255,176,96,0.5)"/><stop offset="0.45" stop-color="rgba(255,160,80,0.14)"/>' +
    '<stop offset="1" stop-color="rgba(255,150,70,0)"/></linearGradient>';
  D['e-wash-down'] = '<linearGradient id="e-wash-down" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="rgba(255,190,110,0.55)"/><stop offset="0.5" stop-color="rgba(255,170,90,0.16)"/>' +
    '<stop offset="1" stop-color="rgba(255,160,80,0)"/></linearGradient>';
  // the street before the canopy lights: dark but for what the lit doors
  // reach, centred on the bay
  D['e-dusk-g'] = '<radialGradient id="e-dusk-g" gradientUnits="userSpaceOnUse" cx="0" cy="-1.4" r="7.5">' +
    '<stop offset="0" stop-color="rgba(3,2,5,0.18)"/><stop offset="0.32" stop-color="rgba(3,2,5,0.5)"/>' +
    '<stop offset="1" stop-color="rgba(3,2,5,0.78)"/></radialGradient>';
  D['e-dim'] = '<filter id="e-dim" x="0" y="0" width="1" height="1"><feComponentTransfer>' +
    '<feFuncR type="linear" slope="0.34"/><feFuncG type="linear" slope="0.3"/><feFuncB type="linear" slope="0.3"/></feComponentTransfer></filter>';
  D['e-softer'] = '<filter id="e-softer" filterUnits="userSpaceOnUse" x="-2" y="-4" width="5" height="6"><feGaussianBlur stdDeviation="0.12"/></filter>';
  D['e-streak'] = '<filter id="e-streak" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.06 0.3"/></filter>';
  return D;
}

/* =========================================================================
   Painting: each layer's SVG, drawn once into its canvas
   ========================================================================= */
/* How many px per metre a piece is ever shown at while it is on the screen,
   sampled along the walk: the most it will be asked for. */
function peak(part, cam, times) {
  var best = 0, b = part.box, H = cam.H, f = cam.f;
  for (var i = 0; i < times.length; i++) {
    var c = cam.at(times[i]), pp = part.poseAt(c, times[i]);
    if (pp.gone) break;
    var d;
    if (part.kind === 'face') d = c.z - b.z;
    else if (part.kind === 'plane') {
      // the nearest of it on the screen: its near edge, or where the plane
      // leaves the screen's foot (the pavement) or head (the soffit)
      var h = Math.abs(b.y - EYE), edge = b.y < EYE ? f * h / Math.max(1, H - c.yh) : f * h / Math.max(1, c.yh);
      d = Math.max(c.z - b.z1, edge);
    } else d = c.z;
    best = Math.max(best, f / Math.max(0.2, d));
  }
  return best;
}
function paint(parts, cam, P) {
  var D = defsMap(P), H = cam.H;
  var fontsReady = document.fonts && document.fonts.load
    ? document.fonts.load('560 20px "EB Garamond"').catch(function () { return null; }) : Promise.resolve();
  var jobs = [];
  parts.forEach(function (part) {
    if (!part.paint || !part.paint.length) return;
    var times = samples(cam.walkEnd + 400);
    var res = Math.max(0.05 * H, Math.min(peak(part, cam, times), (part.cap || 0.4) * H));
    part.paint.forEach(function (p) {
      var r = res * p.layer.res;
      // no canvas side over 8192px
      r = Math.min(r, 8192 / Math.max(p.wm, p.hm));
      var cw = Math.max(2, Math.round(p.wm * r)), ch = Math.max(2, Math.round(p.hm * r));
      p.el.width = cw; p.el.height = ch;
      var ids = {}, used = '', m, re = /url\(#([\w-]+)\)/g;
      while ((m = re.exec(p.layer.markup))) ids[m[1]] = 1;
      Object.keys(ids).forEach(function (id) { if (D[id]) used += D[id]; });
      var src = '<svg xmlns="http://www.w3.org/2000/svg" width="' + cw + '" height="' + ch + '" viewBox="' + p.vb +
        '" preserveAspectRatio="none"><defs>' + used + '</defs>' + p.layer.markup + '</svg>';
      var url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml' }));
      var img = new Image();
      img.src = url;
      jobs.push(img.decode().then(function () {
        return p.layer.texts ? fontsReady : null;
      }).then(function () {
        var ctx = p.el.getContext('2d');
        ctx.drawImage(img, 0, 0, cw, ch);
        if (p.layer.texts) {
          p.layer.texts.forEach(function (t) {
            ctx.save();
            ctx.font = (t.weight || 500) + ' ' + f2(t.size * r) + 'px "EB Garamond", Georgia, serif';
            if ('letterSpacing' in ctx) ctx.letterSpacing = f2(t.spacing * r) + 'px';
            ctx.textAlign = 'center';
            ctx.fillStyle = t.color;
            ctx.fillText(t.str, (t.x - p.sub.x0) * r + (t.spacing * r) / 2, (p.sub.y1 - t.y) * r);
            ctx.restore();
          });
        }
        URL.revokeObjectURL(url);
      }).catch(function () { URL.revokeObjectURL(url); }));
    });
  });
  return Promise.all(jobs);
}

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
      // centre of the circle through both points, on the sweep's side
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
  // a corner shared by two runs gets one bulb
  var keep = [];
  out.forEach(function (p) {
    if (!keep.some(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) < pitch * 0.55; })) keep.push(p);
  });
  return keep;
}
function bulbBase(x, y, r, P) {
  // socket collar, then the envelope, dark glass by night and clear by day
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

function buildFascia(P) {
  var x0 = -CAN.half - 0.24, x1 = CAN.half + 0.24, y0 = CAN.y0 - 0.02, y1 = CAN.crest;
  var yb = CAN.y0, yt = CAN.y1, mh = 0.15;          // the mouldings
  var base = '', wash = '', letters = [], rows = [['', ''], ['', ''], ['', '']], returns = '';
  var h = P.night;

  // the field: book-matched stone, darker toward its head
  base += rect(-CAN.half, yb + mh, CAN.half * 2, yt - mh, P.stone);
  base += rect(-CAN.half, yb + mh, CAN.half * 2, yt - mh, P.stoneVeil);
  base += '<rect x="' + (-CAN.half) + '" y="' + f3(-(yt - mh)) + '" width="' + (CAN.half * 2) + '" height="0.08" fill="rgba(0,0,0,' + (h ? 0.5 : 0.18) + ')"/>';
  // mouldings top and bottom, each a channel the bulbs sit in
  [[yt - mh, yt], [yb, yb + mh]].forEach(function (m) {
    base += member(-CAN.half, m[0], CAN.half * 2, m[1], P, false);
    base += rect(-CAN.half, m[0] + mh * 0.3, CAN.half * 2, m[1] - mh * 0.3, P.sb[0], ' opacity="0.85"');
    base += rect(-CAN.half, m[1] - 0.012, CAN.half * 2, m[1], P.leaf[3], ' opacity="0.9"');
    base += rect(-CAN.half, m[0], CAN.half * 2, m[0] + 0.01, P.leaf[1]);
  });
  // the returns: a stepped gilt jamb at each end with three bulbs
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
  // border bulbs, every 12cm along both mouldings; every third one on the
  // same beat of the chase
  var n = Math.floor(CAN.half * 2 / 0.12);
  for (var i = 0; i <= n; i++) {
    var bx2 = -CAN.half + 0.06 + i * ((CAN.half * 2 - 0.12) / n);
    [yt - mh / 2, yb + mh / 2].forEach(function (yy, row) {
      base += bulbBase(bx2, -yy, 0.03, P);
      rows[(i + row) % 3][row] += bulbLit(bx2, -yy, 0.03, 3.2);
    });
  }
  // the letters
  var order = 'ATRIUM', gap = 0.46, tw = 0, CH = 0.8, boxes = [];
  order.split('').forEach(function (c, k) { tw += GLYPHS[c].w + (k ? gap : 0); });
  var lx = -tw / 2, top = (yb + yt) / 2 + CH / 2;
  order.split('').forEach(function (c) {
    var gph = GLYPHS[c];
    var tr = 'translate(' + f3(lx) + ' ' + f3(-top) + ')';
    // the channel: its cast shadow, the gilt body, the lit lip, the well
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
    boxes.push({ x0: lx - 0.14, x1: lx + gph.w + 0.14, y0: top - CH - 0.14, y1: top + 0.14 });
    if (h) {
      // the letter's bulbs light the stone round it; gold takes the light,
      // it never gives it
      wash += '<g transform="' + tr + '" filter="url(#e-softer)"><path d="' + gph.d + '" fill="none" stroke="rgba(255,176,90,0.34)" stroke-width="0.3"/></g>';
    }
    lx += gph.w + gap;
  });
  if (h) {
    wash += rect(-CAN.half, yt - mh - 0.28, CAN.half * 2, yt - mh, 'url(#e-wash-down)');
    wash += rect(-CAN.half, yb + mh, CAN.half * 2, yb + mh + 0.28, 'url(#e-wash-up)');
  }

  // The crest: a stepped bronze pediment over the entrance carrying a
  // fanlight of lit glass, the hall's fanlights in little.
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
  // the two little pylons at the pediment's ends
  [-1, 1].forEach(function (s) {
    var px = s < 0 ? -1.55 : 1.35;
    cr += member(px, yt + 0.1, 0.2, yt + 0.44, P, false);
    cr += member(px + 0.03, yt + 0.44, 0.14, yt + 0.52, P, true);
  });

  var box = { x0: x0, x1: x1, y0: y0, y1: y1, z: CAN.z };
  var layers = [lay('e-base', base + cr)];
  if (h) {
    layers.push(lay('e-dark', '', null, { solid: 'rgba(3,2,5,0.66)' }));
    layers.push(lay('e-wash', wash, { x0: -CAN.half, x1: CAN.half, y0: yb, y1: yt }, { res: 0.25 }));
    layers.push(lay('e-crest-lit', fan + glaze, { x0: -0.6, x1: 0.6, y0: yt + 0.16, y1: yt + 0.7 }));
    layers.push(lay('e-returns', returns, { x0: x0, x1: -CAN.half + 0.02, y0: yb, y1: yt }));
    layers.push(lay('e-returns', returns, { x0: CAN.half - 0.02, x1: x1, y0: yb, y1: yt }));
    letters.forEach(function (l, k) { layers.push(lay('e-letter e-l' + k, l, boxes[k])); });
    rows.forEach(function (r, k) {
      layers.push(lay('e-phase e-ph' + k, r[0], { x0: -CAN.half, x1: CAN.half, y0: yt - mh - 0.08, y1: yt + 0.08 }));
      layers.push(lay('e-phase e-ph' + k, r[1], { x0: -CAN.half, x1: CAN.half, y0: yb - 0.08, y1: yb + mh + 0.08 }));
    });
  }
  var part = face('e-fascia', box, layers);
  part.cap = 0.42;
  return part;
}

/* =========================================================================
   The soffit: the canopy's coffered underside, a downlight in every coffer
   ========================================================================= */
function buildSoffit(P) {
  var h = P.night, rows = 4, depth = CAN.z / rows, n = 16, pitch = CAN.half * 2 / n;
  var base = '', lit = [];
  base += '<rect x="' + (-CAN.half) + '" y="' + (-CAN.z) + '" width="' + (CAN.half * 2) + '" height="' + CAN.z + '" fill="' + (h ? '#140e09' : '#b9ad98') + '"/>';
  for (var r = 0; r < rows; r++) {
    var zn = CAN.z - r * depth, zf = zn - depth, l = '';
    for (var i = 0; i < n; i++) {
      var cx = -CAN.half + (i + 0.5) * pitch, cz = (zn + zf) / 2;
      var cw = pitch - 0.1, cd = depth - 0.1;
      // the coffer, stepped in twice
      base += '<rect x="' + f3(cx - cw / 2) + '" y="' + f3(-cz - cd / 2) + '" width="' + f3(cw) + '" height="' + f3(cd) + '" fill="' + (h ? '#0b0806' : '#a79b86') + '"/>';
      base += '<rect x="' + f3(cx - cw / 2 + 0.06) + '" y="' + f3(-cz - cd / 2 + 0.06) + '" width="' + f3(cw - 0.12) + '" height="' + f3(cd - 0.12) + '" fill="' + (h ? '#17100a' : '#c3b8a3') + '"/>';
      // the downlight: a brass cup and its frosted lens
      base += '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.12" fill="' + P.brassLo + '"/>' +
        '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.1" fill="none" stroke="' + P.leaf[3] + '" stroke-width="0.012"/>' +
        '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.075" fill="' + (h ? '#2a2016' : '#e8e4da') + '"/>';
      l += '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.36" fill="url(#e-pool)"/>' +
        '<circle cx="' + f3(cx) + '" cy="' + f3(-cz) + '" r="0.078" fill="url(#e-bulb)"/>';
    }
    // the ribs between the rows of coffers
    base += rect(-CAN.half, zf - 0.03, CAN.half * 2, zf + 0.03, P.sb[2]);
    lit.push({ markup: l, z0: zf, z1: zn });
  }
  for (var j = 0; j <= n; j++) {
    var rx = -CAN.half + j * pitch;
    base += '<rect x="' + f3(rx - 0.035) + '" y="' + (-CAN.z) + '" width="0.07" height="' + CAN.z + '" fill="' + P.sb[2] + '"/>' +
      '<rect x="' + f3(rx - 0.035) + '" y="' + (-CAN.z) + '" width="0.012" height="' + CAN.z + '" fill="' + P.leaf[2] + '" opacity="0.7"/>';
  }
  if (!h) {
    // shade under the canopy, deepest against the wall
    base += '<rect x="' + (-CAN.half) + '" y="' + (-CAN.z) + '" width="' + (CAN.half * 2) + '" height="' + CAN.z + '" fill="rgba(40,48,58,0.16)"/>';
  }
  var layers = [lay('e-base', base)];
  if (h) {
    lit.forEach(function (l, k) {
      layers.push(lay('e-srow e-sr' + k, l.markup, { x0: -CAN.half, x1: CAN.half, z0: l.z0, z1: l.z1 }, { res: 0.6 }));
    });
  }
  var part = plane('e-soffit', { x0: -CAN.half, x1: CAN.half, z0: 0, z1: CAN.z, y: CAN.y0 }, layers);
  part.cap = 0.28;
  return part;
}

/* =========================================================================
   The facade at z = 0
   ========================================================================= */
/* Stone laid slab by slab, book-matched; each slab's veil a shade off its
   neighbour's so the joints read. */
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
/* A fluted pilaster: bronze reeds between two fillets, a stepped capital
   under the canopy line. */
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
/* A poster case: a bronze frame round lit glass, a lamp hood over it, and
   the bill inside: the hall's own rooms, billed as the programme. */
var BILLS = [
  { name: 'THE SALON', sky: ['#4a0f18', '#8c2330', '#d2733c'], art: 'sun' },
  { name: 'THE BUREAU', sky: ['#0e1b2c', '#1f3d5c', '#8aa3b8'], art: 'towers' },
  { name: 'THE LEDGER', sky: ['#0b2622', '#1d5148', '#c9b87a'], art: 'fan' },
  { name: 'THE ALMANAC', sky: ['#0a0f24', '#23305e', '#e7d49a'], art: 'moon' }
];
var billN = 0;
function bill(x0, y0, w, h, b, P, texts) {
  var s = '', n = billN++, id = 'e-bill-' + n, clip = 'e-bclip-' + n, xm = x0 + w / 2;
  s += '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + b.sky[0] + '"/><stop offset="0.6" stop-color="' + b.sky[1] + '"/>' +
    '<stop offset="1" stop-color="' + b.sky[2] + '"/></linearGradient>' +
    '<clipPath id="' + clip + '">' + rect(x0, y0, w, y0 + h, '#000') + '</clipPath></defs><g clip-path="url(#' + clip + ')">';
  s += rect(x0, y0, w, y0 + h, 'url(#' + id + ')');
  var ya = y0 + h * 0.34;      // the horizon of the bill's picture
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
  // the house's band across the foot: the room's name over NOW SHOWING,
  // set in the hall's own face once the bill is painted
  s += rect(x0, y0, w, y0 + h * 0.2, '#0c0906');
  s += rect(x0, y0 + h * 0.2, w, y0 + h * 0.2 + 0.012, P.leaf[3]);
  texts.push({ x: xm, y: y0 + h * 0.105, size: 0.1, spacing: 0.02, weight: 560, color: P.leaf[3], str: b.name });
  texts.push({ x: xm, y: y0 + h * 0.035, size: 0.046, spacing: 0.012, weight: 500, color: '#cdbf9e', str: 'NOW SHOWING' });
  return s;
}
function posterCase(cx, P, b, texts) {
  var w = 1.24, h = 1.86, y0 = 0.62, s = '', lit = '';
  s += rect(cx - w / 2 - 0.05, y0 - 0.06, w + 0.1, y0 + h + 0.02, 'rgba(0,0,0,' + (P.night ? 0.55 : 0.2) + ')');
  s += member(cx - w / 2, y0, w, y0 + h, P, false);
  s += member(cx - w / 2 + 0.05, y0 + 0.05, w - 0.1, y0 + h - 0.05, P, true);
  s += bill(cx - w / 2 + 0.08, y0 + 0.08, w - 0.16, h - 0.16, b, P, texts);
  // the glass over the bill: one reflection band
  s += '<rect x="' + f3(cx - w / 2 + 0.08) + '" y="' + f3(-(y0 + h - 0.08)) + '" width="' + f3(w - 0.16) + '" height="' + f3(h - 0.16) +
    '" fill="url(#e-sheen)" opacity="' + (P.night ? 0.06 : 0.22) + '"/>';
  // the lamp hood
  s += member(cx - w / 2 - 0.02, y0 + h, w + 0.04, y0 + h + 0.09, P, false);
  if (P.night) {
    lit += rect(cx - w / 2 + 0.08, y0 + h - 0.1, w - 0.16, y0 + h - 0.08, '#fff2d0') +
      '<rect x="' + f3(cx - w / 2 - 0.3) + '" y="' + f3(-(y0 + h + 0.3)) + '" width="' + f3(w + 0.6) + '" height="' + f3(h + 0.5) +
      '" fill="url(#e-pool)" opacity="0.5"/>';
  }
  return { s: s, lit: lit };
}

/* The wall either side of the bay, in a near piece and a far one: the far
   one leaves the screen long before the near one, and is painted smaller. */
function buildWall(side, P, far) {
  var a = far ? SPLIT - 0.02 : BAY - 0.05, b = far ? WALL : SPLIT + 0.02;
  var x0 = side < 0 ? -b : a, x1 = side < 0 ? -a : b;
  var y0 = -0.12, y1 = HEAD + 0.1, texts = [];
  var s = cladding(x0, y0, x1, y1, P, side < 0 ? 11 : 23), lit = '';
  // a plinth of darker stone and a bronze skirting along the foot
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
  if (P.night) {
    // the soffit's light washing down the stone under the canopy
    lit += rect(x0, HEAD - 0.9, x1 - x0, HEAD + 0.1, 'url(#e-wash-down)');
  }
  var box = { x0: x0, x1: x1, y0: y0, y1: y1, z: 0 };
  var layers = [lay('e-base', s, null, { texts: texts })];
  if (lit) layers.push(lay('e-lit', lit, null, { res: 0.5 }));
  var part = face('e-wall e-wall-' + (side < 0 ? 'l' : 'r') + (far ? ' e-far' : ''), box, layers);
  part.cap = 0.4;
  return part;
}

function buildUpper(P, x0, x1, cls) {
  var y0 = HEAD - 0.1, y1 = UPPER;
  var s = cladding(x0, y0, x1, y1, P, 41), lit = '';
  // the frieze band and its fillets, the hall's own relief
  s += rect(x0, 5.7, x1 - x0, 6.25, 'url(#e-frieze)');
  s += member(x0, 5.62, x1 - x0, 5.7, P, true);
  s += member(x0, 6.25, x1 - x0, 6.33, P, true);
  // the pilasters carry on up the building
  [0, 3.95, 7.15, 10.35, 13.55].forEach(function (px) {
    [-1, 1].forEach(function (sd) {
      if (px === 0 && sd > 0) return;
      var c = sd * px || 0;
      if (c + 0.3 < x0 || c - 0.3 > x1) return;
      s += pilaster(c, y0, 5.62, P);
      s += pilaster(c, 6.33, y1, P);
    });
  });
  // tall windows between them, dark by night, the sky in them by day
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
    // the canopy's uplights: a warm scallop over every pilaster, fading up
    for (var i = -6; i <= 6; i++) {
      var ux = i * 1.05;
      if (ux < x0 - 0.8 || ux > x1 + 0.8) continue;
      lit += '<ellipse cx="' + f3(ux) + '" cy="' + f3(-(CAN.y1 + 0.2)) + '" rx="0.7" ry="1.6" fill="url(#e-pool)" opacity="0.7"/>';
    }
    lit += rect(Math.max(x0, -CAN.half - 0.5), CAN.y1, Math.min(x1, CAN.half + 0.5) - Math.max(x0, -CAN.half - 0.5), CAN.y1 + 1.4, 'url(#e-wash-up)');
  }
  var layers = [lay('e-base', s)];
  if (lit) layers.push(lay('e-lit', lit, null, { res: 0.35 }));
  var part = face('e-upper ' + cls, { x0: x0, x1: x1, y0: y0, y1: y1, z: 0 }, layers);
  part.cap = 0.3;
  return part;
}

/* The transom of three fanlights over the three pairs. */
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
  // mullions up through the transom, and the transom bar
  var frame = '';
  [-SIDE, -1.06, 1.06, SIDE].forEach(function (mx) { frame += member(mx - 0.06, y0, 0.12, y1, P, false); });
  frame += member(x0, DOOR_H - 0.02, x1 - x0, DOOR_H + 0.1, P, false);
  frame += rect(x0, DOOR_H + 0.085, x1 - x0, DOOR_H + 0.1, P.leaf[3]);
  frame += member(x0, HEAD - 0.08, x1 - x0, HEAD + 0.02, P, false);
  s += frame;
  if (P.night) lit += frame;
  var layers = [lay('e-base', s)];
  if (lit) layers.push(lay('e-lit', lit, null, { res: 0.6 }));
  var part = face('e-transom', { x0: x0, x1: x1, y0: y0, y1: y1, z: 0 }, layers);
  part.cap = 0.5;
  return part;
}

function buildSurround(side, P) {
  var xi = side * SIDE, xo = side * BAY;
  var x0 = Math.min(xi, xo) - 0.02, x1 = Math.max(xi, xo) + 0.02, y0 = -0.08, y1 = HEAD + 0.02;
  var s = '';
  // three steps, each a bronze member proud of the last
  for (var k = 0; k < 3; k++) {
    var w = (BAY - SIDE) / 3, xa = side < 0 ? -BAY + k * w : SIDE + (2 - k) * w;
    s += member(xa, y0 + k * 0.03, w + 0.004, y1, P, false);
    s += rect(side < 0 ? xa + w - 0.012 : xa, y0, 0.012, y1, P.leaf[3], ' opacity="0.8"');
  }
  var part = face('e-surround e-sur-' + (side < 0 ? 'l' : 'r'), { x0: x0, x1: x1, y0: y0, y1: y1, z: 0 }, [lay('e-base', s)]);
  part.cap = 0.5;
  return part;
}

/* A door leaf's face: bronze stiles and rails, glass that is clear on the
   centre pair and etched on the side pairs, a pull, a kick plate. x0 is
   the leaf's left edge; `meet` is the side its pull stands on. */
function leafFace(x0, w, P, clear, meet, fanSide) {
  var s = '', st = 0.085, tr = 0.11, br = 0.3, gx0 = x0 + st, gx1 = x0 + w - st, gy0 = br, gy1 = DOOR_H - tr;
  if (clear) {
    // clear glass: the foyer shows through it; an etched border and half a
    // sunburst at the head, whose other half is on the other leaf
    var e = P.night ? 'rgba(255,226,170,0.34)' : 'rgba(255,255,255,0.5)';
    s += '<rect x="' + f3(gx0 + 0.04) + '" y="' + f3(-(gy1 - 0.04)) + '" width="' + f3(gx1 - gx0 - 0.08) + '" height="' + f3(gy1 - gy0 - 0.08) +
      '" fill="none" stroke="' + e + '" stroke-width="0.035"/>';
    var fx = fanSide < 0 ? gx0 : gx1, fy = gy1, rays = '';
    for (var i = 0; i < 7; i++) {
      var a0 = Math.PI / 2 * (i / 7), a1 = a0 + Math.PI / 2 / 7 * 0.55;
      var sx = fanSide < 0 ? 1 : -1, R = 0.72;
      rays += 'M' + f3(fx) + ' ' + f3(-fy) + 'L' + f3(fx + sx * R * Math.cos(a0)) + ' ' + f3(-fy + R * Math.sin(a0)) +
        'L' + f3(fx + sx * R * Math.cos(a1)) + ' ' + f3(-fy + R * Math.sin(a1)) + 'Z';
    }
    s += '<path d="' + rays + '" fill="' + e + '"/>';
    s += '<path d="M' + f3(fx) + ' ' + f3(-fy + 0.8) + 'A0.8 0.8 0 0 ' + (fanSide < 0 ? 0 : 1) + ' ' + f3(fx + (fanSide < 0 ? 0.8 : -0.8)) + ' ' + f3(-fy) + '" fill="none" stroke="' + e + '" stroke-width="0.02"/>';
    // the one reflection band across the glass
    s += '<rect x="' + f3(gx0) + '" y="' + f3(-gy1) + '" width="' + f3(gx1 - gx0) + '" height="' + f3(gy1 - gy0) + '" fill="url(#e-sheen)" opacity="' + (P.night ? 0.07 : 0.18) + '"/>';
  } else {
    // acid-frosted glass with the lamps of the vestibule behind it; the
    // pattern is cut clear, so it reads darker by night and brighter by day
    s += rect(gx0, gy0, gx1 - gx0, gy1, 'url(#e-frostglow)');
    s += rect(gx0, gy0, gx1 - gx0, gy1, 'url(#e-frost)', ' opacity="' + (P.night ? 0.08 : 0.3) + '"');
    var cx = (gx0 + gx1) / 2, cy = gy0 + 0.42, cut = '', cutW = P.night ? 'rgba(92,40,10,0.42)' : 'rgba(255,255,255,0.75)';
    for (var j = 0; j < 11; j++) {
      var b = Math.PI * (0.08 + 0.84 * j / 10);
      cut += 'M' + f3(cx + Math.cos(b) * 0.2) + ' ' + f3(-cy - Math.sin(b) * 0.2) + 'L' + f3(cx + Math.cos(b) * 0.5) + ' ' + f3(-cy - Math.sin(b) * 1.62) + ' ';
    }
    s += '<path d="' + cut + '" stroke="' + cutW + '" stroke-width="0.016"/>';
    s += '<path d="M' + f3(cx - 0.2) + ' ' + f3(-cy) + 'A0.2 0.2 0 0 1 ' + f3(cx + 0.2) + ' ' + f3(-cy) + '" fill="none" stroke="' + cutW + '" stroke-width="0.02"/>';
    s += '<path d="M' + f3(cx - 0.12) + ' ' + f3(-cy) + 'A0.12 0.12 0 0 1 ' + f3(cx + 0.12) + ' ' + f3(-cy) + 'Z" fill="' + cutW + '"/>';
    // a clear border cut round the pane, and stepped corners at its head
    s += '<rect x="' + f3(gx0 + 0.035) + '" y="' + f3(-(gy1 - 0.035)) + '" width="' + f3(gx1 - gx0 - 0.07) + '" height="' + f3(gy1 - gy0 - 0.07) +
      '" fill="none" stroke="' + cutW + '" stroke-width="0.012"/>';
    [0, 1].forEach(function (q) {
      var ex = q ? gx1 - 0.035 : gx0 + 0.035, sx2 = q ? -1 : 1;
      s += '<path d="M' + f3(ex) + ' ' + f3(-(gy1 - 0.2)) + 'h' + f3(sx2 * 0.06) + 'v-0.06h' + f3(sx2 * 0.06) + 'v-0.06h' + f3(sx2 * 0.06) + 'v-0.045" fill="none" stroke="' + cutW + '" stroke-width="0.012"/>';
    });
    // the pane is darker where it meets the metal
    s += '<rect x="' + f3(gx0) + '" y="' + f3(-gy1) + '" width="' + f3(gx1 - gx0) + '" height="' + f3(gy1 - gy0) +
      '" fill="none" stroke="' + (P.night ? 'rgba(60,24,4,0.5)' : 'rgba(40,48,56,0.25)') + '" stroke-width="0.04"/>';
    s += rect(gx0, gy0, gx1 - gx0, gy1, 'url(#e-sheen)', ' opacity="' + (P.night ? 0.06 : 0.3) + '"');
  }
  // stiles and rails
  s += member(x0, 0, st, DOOR_H, P, false) + member(x0 + w - st, 0, st, DOOR_H, P, false);
  s += member(x0, DOOR_H - tr, w, DOOR_H, P, false);
  s += member(x0, 0, w, br, P, false);
  // the kick plate: engraved lines
  s += rect(x0 + st, 0.04, w - 2 * st, br - 0.05, 'url(#e-lf-h)', ' opacity="0.9"');
  for (var k = 0; k < 4; k++) s += rect(x0 + st + 0.03, 0.08 + k * 0.045, w - 2 * st - 0.06, 0.086 + k * 0.045, P.leaf[0], ' opacity="0.55"');
  // the pull: a tall bronze bar on two standoffs, stepped at its ends
  var px = meet > 0 ? x0 + w - st - 0.09 : x0 + st + 0.09;
  s += rect(px - 0.025 + 0.02, 0.72 - 0.03, 0.05, 1.72 - 0.03, 'rgba(0,0,0,' + (P.night ? 0.55 : 0.3) + ')');
  s += member(px - 0.02, 0.76, 0.04, 1.68, P, true);
  s += member(px - 0.035, 0.72, 0.07, 0.8, P, false) + member(px - 0.035, 1.64, 0.07, 1.72, P, false);
  return s;
}

function buildSide(side, P) {
  var xi = side * (OPEN + JAMB), xo = side * SIDE, x0 = Math.min(xi, xo), x1 = Math.max(xi, xo);
  var s = rect(x0, -0.06, x1 - x0, DOOR_H + 0.02, P.sb[0]), w = (x1 - x0 - 0.1) / 2;
  s += leafFace(x0, w, P, false, 1, 0) + leafFace(x0 + w + 0.1, w, P, false, -1, 0);
  s += member(x0 + w, -0.04, 0.1, DOOR_H, P, false);
  var part = face('e-side e-side-' + (side < 0 ? 'l' : 'r'), { x0: x0, x1: x1, y0: -0.06, y1: DOOR_H + 0.02, z: 0 }, [lay('e-base', s)]);
  part.cap = 0.6;
  return part;
}

/* By night, before the canopy lights, the street is dark but for what
   the lit doors reach: one sheet over the facade with the bay cut out of
   it, let go once the canopy is up. */
function buildDusk(t) {
  var d = 'M' + f3(-WALL) + ' 0.2H' + f3(WALL) + 'V' + f3(-UPPER) + 'H' + f3(-WALL) + 'Z' +
    'M' + (-BAY) + ' 0.1H' + BAY + 'V' + (-HEAD) + 'H' + (-BAY) + 'Z';
  var part = face('e-dusk', { x0: -WALL, x1: WALL, y0: -0.2, y1: UPPER, z: 0 },
    [lay('e-base', '<path d="' + d + '" fill="url(#e-dusk-g)" fill-rule="evenodd"/>', null, { res: 0.3 })]);
  part.until = t.soffit + 420;
  part.cap = 0.3;
  return part;
}

/* The centre pair's jambs, head and threshold: the last of the street to
   leave the screen, painted in three narrow pieces. */
function buildJambs(P) {
  var x0 = -OPEN - JAMB, x1 = OPEN + JAMB, y0 = -0.06, y1 = DOOR_H + 0.1;
  var s = '';
  [-1, 1].forEach(function (sd) {
    var xa = sd < 0 ? -OPEN - JAMB : OPEN;
    s += member(xa, y0, JAMB, y1, P, false);
    s += rect(sd < 0 ? xa + JAMB - 0.014 : xa, y0, 0.014, DOOR_H, P.leaf[3], ' opacity="0.85"');
    if (P.night) s += rect(sd < 0 ? xa + JAMB - 0.05 : xa, 0, 0.05, DOOR_H, 'rgba(255,200,130,0.28)');
  });
  s += member(x0, DOOR_H, x1 - x0, y1, P, false);
  // the threshold: a bronze sill, its nosing in leaf
  s += member(x0, y0, x1 - x0, 0.03, P, false);
  s += rect(x0, 0.018, x1 - x0, 0.03, P.leaf[3]);
  var part = face('e-jambs', { x0: x0, x1: x1, y0: y0, y1: y1, z: 0 }, [
    lay('e-base', s, { x0: x0, x1: -OPEN, y0: y0, y1: y1 }),
    lay('e-base', s, { x0: OPEN, x1: x1, y0: y0, y1: y1 }),
    lay('e-base', s, { x0: -OPEN, x1: OPEN, y0: DOOR_H, y1: y1 }),
    lay('e-base', s, { x0: -OPEN, x1: OPEN, y0: y0, y1: 0.03 })
  ]);
  part.cap = 0.9;
  return part;
}

/* A leaf of the centre pair, turned in the world about its hinge. The glass
   is clear; over it by night a haze of the foyer's light, by day the
   street's reflection, which is what hides the hall while it is being drawn
   behind the doors. */
function buildLeaf(side, P) {
  var x0 = side < 0 ? -OPEN : 0;
  var e = div('e-leaf e-leaf-' + (side < 0 ? 'l' : 'r'));
  e.style.width = OPEN * U + 'px';
  e.style.height = DOOR_H * U + 'px';
  var gx0 = x0 + 0.085, gw = OPEN - 0.17, gy0 = 0.3, gy1 = DOOR_H - 0.11;
  var haze;
  if (P.night) {
    haze = rect(gx0, gy0, gw, gy1, 'url(#e-foyer)') +
      '<ellipse cx="' + f3(side < 0 ? gx0 + gw : gx0) + '" cy="' + f3(-1.25) + '" rx="0.9" ry="1.3" fill="url(#e-pool)" opacity="0.9"/>' +
      rect(gx0, gy0, gw, gy1, 'url(#e-frost)', ' opacity="0.12"') +
      rect(gx0, gy0, gw, gy1, 'url(#e-sheen)', ' opacity="0.12"');
  } else {
    // the far side of the street in the glass: pale sky over soft fronts,
    // the sheen across it all
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
  var box = { x0: x0, x1: x0 + OPEN, y0: 0, y1: DOOR_H };
  var part = { el: e, box: box, kind: 'leaf', side: side, cap: 0.6 };
  addLayers(part, [lay('e-haze', haze, { x0: gx0, x1: gx0 + gw, y0: gy0, y1: gy1 }, { res: 0.6 }),
    lay('e-base', leafFace(x0, OPEN, P, true, side < 0 ? 1 : -1, side < 0 ? 1 : -1) +
      (P.night ? '' : rect(x0, HEAD - 1.05, OPEN, DOOR_H, 'rgba(34,42,58,0.3)')))], function (s) {
    return [(s.x0 - box.x0) * U, (box.y1 - s.y1) * U, (s.x1 - s.x0) * U, (s.y1 - s.y0) * U,
      f3(s.x0) + ' ' + f3(-s.y1) + ' ' + f3(s.x1 - s.x0) + ' ' + f3(s.y1 - s.y0), s.x1 - s.x0, s.y1 - s.y0];
  });
  return part;
}

/* Brass stanchions with velvet rope either side of the way in, as the hall
   has them along its floor: a lane to the centre pair. A face at z = 1.5,
   in front of the side doors, which the reader walks between. */
function buildStanchions(P) {
  var z = 1.5, hgt = 0.96, s = '', lit = '';
  var posts = [1.3, 2.3, 3.3];
  [-1, 1].forEach(function (sd) {
    // the rope first, sagging between the posts, then the posts over it
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
      // the base: a turned disc on the stone, seen nearly edge on
      s += '<ellipse cx="' + f3(x + 0.02) + '" cy="0.01" rx="0.2" ry="0.035" fill="rgba(0,0,0,' + (P.night ? 0.55 : 0.28) + ')"/>';
      s += '<ellipse cx="' + f3(x) + '" cy="-0.03" rx="0.16" ry="0.04" fill="url(#e-lf-h)"/>';
      s += member(x - 0.05, 0.05, 0.1, 0.12, P, true);
      // the post, turned brass, and its ball
      s += member(x - 0.022, 0.1, 0.044, hgt - 0.06, P, true);
      s += member(x - 0.04, hgt - 0.14, 0.08, hgt - 0.08, P, true);
      s += '<circle cx="' + f3(x) + '" cy="' + f3(-hgt) + '" r="0.055" fill="url(#e-lf-h)"/>' +
        '<circle cx="' + f3(x - 0.018) + '" cy="' + f3(-hgt - 0.02) + '" r="0.016" fill="' + P.leaf[3] + '"/>';
      if (P.night) lit += '<circle cx="' + f3(x - 0.012) + '" cy="' + f3(-hgt - 0.018) + '" r="0.022" fill="rgba(255,236,196,0.8)"/>' +
        rect(x - 0.022, 0.1, 0.012, hgt - 0.06, 'rgba(255,214,150,0.5)');
    });
  });
  var box = { x0: -3.55, x1: 3.55, y0: -0.06, y1: hgt + 0.08, z: z };
  // By night the brass is in the dark until the canopy lights it: the
  // standing piece is the brass unlit, and the lit brass fades in over it.
  var dark = P.night ? '<g filter="url(#e-dim)">' + s + '</g>' : s;
  var L = { x0: -3.55, x1: -1.1, y0: box.y0, y1: box.y1 }, R = { x0: 1.1, x1: 3.55, y0: box.y0, y1: box.y1 };
  var layers = [lay('e-base', dark, L), lay('e-base', dark, R)];
  if (lit) {
    layers.push(lay('e-lit', s + lit, L));
    layers.push(lay('e-lit', s + lit, R));
  }
  var part = face('e-stanchions', box, layers);
  part.cap = 0.5;
  return part;
}

/* By day a low sun stands behind the reader's left shoulder: the canopy
   throws its shadow down the wall and across the heads of the doors, a
   little to the right of itself. The doorway is cut out of it; the open
   leaves carry their own. */
function buildShade() {
  var sh = 0.7, top = HEAD, bot = HEAD - 1.05;
  var d = 'M' + f3(-CAN.half + sh) + ' ' + f3(-top) + 'H' + f3(CAN.half + sh) + 'V' + f3(-bot) + 'H' + f3(-CAN.half + sh) + 'Z' +
    'M' + (-OPEN) + ' ' + f3(-Math.min(DOOR_H, top)) + 'H' + OPEN + 'V0.2H' + (-OPEN) + 'Z';
  var soft = '<linearGradient id="e-shade-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(34,42,58,0.36)"/>' +
    '<stop offset="0.9" stop-color="rgba(34,42,58,0.3)"/><stop offset="1" stop-color="rgba(34,42,58,0.06)"/></linearGradient>';
  var part = face('e-shade', { x0: -CAN.half + sh - 0.1, x1: CAN.half + sh + 0.1, y0: bot - 0.1, y1: top + 0.1, z: 0 },
    [lay('e-base', '<defs>' + soft + '</defs><path d="' + d + '" fill="url(#e-shade-g)" fill-rule="evenodd"/>', null, { res: 0.3 })]);
  part.cap = 0.4;
  return part;
}

/* =========================================================================
   The pavement: a terrazzo apron under the canopy with a sunburst poured
   in it at the doors, then the public paving. Night: wet, and the lit
   entrance lies in it.
   ========================================================================= */
function groundArt(P) {
  var h = P.night, s = h ? '<g opacity="0.74">' : '';
  // the apron
  s += rect(-WALL, 0, WALL * 2, CAN.z, 'url(#e-terrazzo)');
  if (h) s += '<rect x="' + f3(-WALL) + '" y="' + f3(-CAN.z) + '" width="' + f3(WALL * 2) + '" height="' + CAN.z + '" fill="rgba(4,3,2,0.35)"/>';
  // the sunburst: rays of two stones between brass strips, a band round it
  var R = 2.55, n = 18, rays = '', strips = '';
  for (var i = 0; i < n; i++) {
    var a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
    rays += '<path d="M0 0L' + f3(-Math.cos(a0) * R) + ' ' + f3(-Math.sin(a0) * R) + 'A' + R + ' ' + R + ' 0 0 1 ' +
      f3(-Math.cos(a1) * R) + ' ' + f3(-Math.sin(a1) * R) + 'Z" fill="' +
      (i % 2 ? (h ? '#3a0e14' : '#a4776a') : (h ? '#171109' : '#e7ddca')) + '" opacity="' + (h ? 0.86 : 0.8) + '"/>';
    strips += 'M0 0L' + f3(-Math.cos(a0) * R) + ' ' + f3(-Math.sin(a0) * R);
  }
  s += rays;
  if (h) s += '</g><g opacity="0.84">';
  s += '<path d="M' + f3(-R - 0.22) + ' 0A' + f3(R + 0.22) + ' ' + f3(R + 0.22) + ' 0 0 1 ' + f3(R + 0.22) + ' 0L' + f3(R) + ' 0A' + R + ' ' + R + ' 0 0 0 ' + f3(-R) + ' 0Z" fill="' + (h ? '#0e1512' : '#5a6a60') + '"/>';
  s += '<path d="' + strips + '" stroke="' + P.leaf[3] + '" stroke-width="0.018"/>';
  s += '<path d="M' + f3(-R) + ' 0A' + R + ' ' + R + ' 0 0 1 ' + f3(R) + ' 0M' + f3(-R - 0.22) + ' 0A' + f3(R + 0.22) + ' ' + f3(R + 0.22) + ' 0 0 1 ' + f3(R + 0.22) + ' 0" fill="none" stroke="' + P.leaf[3] + '" stroke-width="0.026"/>';
  s += '<circle r="0.32" fill="' + (h ? '#3a0e14' : '#8e5d50') + '" stroke="' + P.leaf[3] + '" stroke-width="0.026"/>';
  // the apron's border strip at the canopy line
  s += rect(-WALL, CAN.z - 0.04, WALL * 2, CAN.z + 0.04, P.leaf[2]);
  // the public pavement: large granite flags
  s += '<rect x="' + f3(-WALL) + '" y="' + f3(-(GROUND[GROUND.length - 1][1])) + '" width="' + f3(WALL * 2) + '" height="' + f3(GROUND[GROUND.length - 1][1] - CAN.z - 0.04) +
    '" fill="' + (h ? '#141417' : '#b9b6ae') + '"/>';
  for (var fz = CAN.z + 1.1; fz < 7; fz += 1.1) s += '<rect x="' + f3(-WALL) + '" y="' + f3(-fz - 0.01) + '" width="' + f3(WALL * 2) + '" height="0.02" fill="' + P.joint + '"/>';
  for (var fx = -Math.floor(WALL / 1.2) * 1.2; fx <= WALL; fx += 1.2) s += '<rect x="' + f3(fx - 0.01) + '" y="-7" width="0.02" height="' + f3(7 - CAN.z - 0.04) + '" fill="' + P.joint + '"/>';
  if (h) s += '</g>';
  if (!h) {
    // speckle in the granite
    for (var k = 0; k < 400; k++) {
      s += '<rect x="' + f3(-WALL + hash01(k * 3 + 1) * WALL * 2) + '" y="' + f3(-(CAN.z + 0.05 + hash01(k * 5 + 2) * 3.4)) + '" width="0.03" height="0.03" fill="rgba(80,74,64,' + f3(0.2 + hash01(k) * 0.3) + ')"/>';
    }
  }
  return s;
}
function groundLit() {
  // under the canopy, a pool from every downlight
  var s = '';
  for (var r = 0; r < 4; r++) {
    for (var i = 0; i < 16; i++) {
      var cx = -CAN.half + (i + 0.5) * (CAN.half * 2 / 16), cz = CAN.z - (r + 0.5) * CAN.z / 4;
      s += '<ellipse cx="' + f3(cx) + '" cy="' + f3(-cz) + '" rx="0.75" ry="0.62" fill="url(#e-pool)" opacity="0.5"/>';
    }
  }
  return s;
}
function groundSpill() {
  // the foyer's light through the open doorway, fanning out over the stone
  return '<path d="M-1 0L1 0L2.6 -4.2L-2.6 -4.2Z" fill="url(#e-spill)"/>';
}
function buildGround(P, cam) {
  var art = groundArt(P), lit = P.night ? groundLit() : '', spill = groundSpill();
  return GROUND.map(function (g, k) {
    // each row as wide as the screen ever shows it
    var hw = Math.min(WALL, (cam.W / 2) * (Z0 - g[0]) / cam.f + 0.5);
    var layers = [lay('e-base', art)];
    if (lit && g[0] < CAN.z) {
      layers.push(lay('e-lit', lit, { x0: -Math.min(hw, CAN.half + 0.8), x1: Math.min(hw, CAN.half + 0.8), z0: g[0], z1: Math.min(g[1], CAN.z) }, { res: 0.4 }));
    }
    if (P.night && g[0] < 4.2) layers.push(lay('e-spill', spill, { x0: -2.7, x1: 2.7, z0: g[0], z1: Math.min(g[1], 4.2) }, { res: 0.4 }));
    var part = plane('e-ground e-g' + k, { x0: -hw, x1: hw, z0: g[0], z1: g[1], y: 0 }, layers);
    part.cap = 0.2;
    return part;
  });
}

/* The lit entrance, lying in the wet stone: every lamp of the bay mirrored
   below the door line and pulled into streaks, over a plain dark ground.
   Faces at z = 0, under the pavement's glaze. Night only. */
function buildMirrorGround() {
  return face('e-mirror-ground', { x0: -WALL, x1: WALL, y0: -8, y1: 0.02, z: 0 }, []);
}
function buildMirror() {
  var hw = Math.min(WALL, 6.4), x0 = -hw, x1 = hw, y0 = -2.8, y1 = 0.02, g = '';
  g += rect(-OPEN, -DOOR_H + 0.3, OPEN * 2, 0, 'rgba(255,200,130,0.95)');
  g += rect(-SIDE, -DOOR_H + 0.3, SIDE - OPEN - JAMB, 0, 'rgba(236,166,88,0.75)');
  g += rect(OPEN + JAMB, -DOOR_H + 0.3, SIDE - OPEN - JAMB, 0, 'rgba(236,166,88,0.75)');
  g += rect(-BAY, -HEAD, BAY * 2, -DOOR_H - 0.1, 'rgba(240,170,90,0.5)');
  [-1, 1].forEach(function (sd) { g += rect(sd * 5.55 - 0.55, -2.4, 1.1, -0.7, 'rgba(255,220,170,0.16)'); });
  var part = face('e-mirror', { x0: x0, x1: x1, y0: y0, y1: y1, z: 0 },
    [lay('e-base', '<g filter="url(#e-streak)">' + g + '</g>', null, { res: 0.5 })]);
  part.cap = 0.2;
  return part;
}

/* =========================================================================
   The foyer's far wall: the ring round the hall and the veil over it
   ========================================================================= */
function buildHallPlane(cls, W, H, kind) {
  var e = div('e-plane ' + cls);
  e.style.width = W + 'px'; e.style.height = H + 'px';
  if (kind === 'ring') {
    // Past the hall's edges the foyer goes on: its ceiling in shadow over
    // the masthead, its floor under the hall's own, its walls either side.
    // Seen only in the last of the walk, in the doorway's corners.
    var top = div('e-ring-top', e), bot = div('e-ring-bot', e), l = div('e-ring-l', e), r = div('e-ring-r', e);
    [top, bot, l, r].forEach(function (b) { b.style.position = 'absolute'; });
    top.style.cssText += ';left:' + (-W) + 'px;top:' + (-H) + 'px;width:' + (3 * W) + 'px;height:' + H + 'px';
    bot.style.cssText += ';left:' + (-W) + 'px;top:' + H + 'px;width:' + (3 * W) + 'px;height:' + H + 'px';
    l.style.cssText += ';left:' + (-W) + 'px;top:0;width:' + W + 'px;height:' + H + 'px';
    r.style.cssText += ';left:' + W + 'px;top:0;width:' + W + 'px;height:' + H + 'px';
  }
  return { el: e, kind: 'hall' };
}

/* =========================================================================
   Assembly
   ========================================================================= */
function build(host, P, cam, T) {
  var world = div('e-world');
  host.insertBefore(world, host.firstChild);
  var parts = [];
  var add = function (p) { world.appendChild(p.el); parts.push(p); return p; };
  var ring = add(buildHallPlane('e-ring', cam.W, cam.H, 'ring'));
  var veil = add(buildHallPlane('e-veil', cam.W, cam.H, 'veil'));
  var leaves = [add(buildLeaf(-1, P)), add(buildLeaf(1, P))];
  // The middle of the upper facade is gone behind the canopy as soon as the
  // fascia's head rises past it; the ends stand beyond the canopy.
  var mid = Math.min(CAN.half + 0.3, WALL);
  var upper = add(buildUpper(P, -mid, mid, 'e-upper-m'));
  upper.hideWhen = function (c) {
    var a = cam.project(c, 0, CAN.y1, CAN.z), b = cam.project(c, 0, UPPER, 0);
    return !a || !b || a[1] < b[1];
  };
  var uppers = [upper];
  if (WALL > mid) {
    uppers.push(add(buildUpper(P, -WALL, -mid + 0.02, 'e-upper-l')));
    uppers.push(add(buildUpper(P, mid - 0.02, WALL, 'e-upper-r')));
  }
  var walls = [add(buildWall(-1, P, false)), add(buildWall(1, P, false))];
  if (WALL > SPLIT) walls.push(add(buildWall(-1, P, true)), add(buildWall(1, P, true)));
  add(buildSurround(-1, P)); add(buildSurround(1, P));
  add(buildSide(-1, P)); add(buildSide(1, P));
  var transom = add(buildTransom(P));
  add(buildJambs(P));
  if (!P.night) add(buildShade());
  var dusk = P.night ? add(buildDusk(T)) : null;
  if (P.night) { add(buildMirrorGround()); add(buildMirror()); }
  var rows = buildGround(P, cam).map(add);
  var stanchions = add(buildStanchions(P));
  var soffit = add(buildSoffit(P));
  var fascia = add(buildFascia(P));
  return {
    world: world, parts: parts, ring: ring, veil: veil, leaves: leaves, uppers: uppers, walls: walls,
    transom: transom, dusk: dusk, rows: rows, soffit: soffit, fascia: fascia, stanchions: stanchions
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
  if (kf[0].offset > 0) { var first = {}; for (var q in kf[0]) first[q] = kf[0][q]; first.offset = 0; kf.unshift(first); }
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
  return run(el, pts.map(function (p) {
    var o = { opacity: Math.max(0.004, p[1]) };
    if (p[2]) o.easing = p[2];
    return [p[0], o];
  }), total);
}
function fadeAll(els, pts, total) { (els || []).forEach(function (e) { fade(e, pts, total); }); }

/* The camera's keyframes for one piece, sampled every STEP ms over the walk,
   and let go once it is off the screen for good. */
function track(part, cam, times, total) {
  var frames = [], gone = false;
  for (var i = 0; i < times.length && !gone; i++) {
    var ms = times[i], c = cam.at(ms), pp = part.poseAt(c, ms);
    if (pp.gone) {
      gone = true;
      frames.push([ms, { transform: pp.transform, opacity: 0 }]);
    } else {
      frames.push([ms, { transform: pp.transform, opacity: 1 }]);
    }
  }
  if (!frames.length) return;
  run(part.el, frames, total);
}
function poser(part, cam) {
  var W = cam.W, f = cam.f;
  var head = function (c) { return 'translate(' + f2(W / 2) + 'px,' + f2(c.yh) + 'px) '; };
  var persp = function (c) { return head(c) + 'perspective(' + f2(f) + 'px) translate3d(0px,0px,' + f2(f - U * c.z) + 'px) '; };
  var extra = function (c, ms) {
    return (part.until && ms > part.until) || (part.hideWhen && part.hideWhen(c));
  };
  if (part.kind === 'face') {
    var b = part.box, pts = [[b.x0, b.y0, b.z], [b.x1, b.y1, b.z]];
    return function (c, ms) {
      var d = c.z - b.z;
      return { transform: head(c) + 'scale(' + f5(f / (U * d)) + ')', gone: extra(c, ms) || cam.offscreen(c, pts) };
    };
  }
  if (part.kind === 'plane') {
    var p = part.box;
    var ptsP = [[p.x0, p.y, p.z0], [p.x1, p.y, p.z0], [p.x0, p.y, p.z1], [p.x1, p.y, p.z1]];
    var place = 'translate3d(' + f2(U * p.x0) + 'px,' + f2(U * (EYE - p.y)) + 'px,' + f2(U * p.z1) + 'px) rotateX(-90deg)';
    return function (c, ms) {
      // a plane is let go before any of it could reach the camera
      var off = c.z - p.z1 < 0.6 || cam.offscreen(c, ptsP);
      return { transform: persp(c) + place, gone: off || extra(c, ms) };
    };
  }
  if (part.kind === 'leaf') {
    var t = cam.t, sd = part.side;
    return function (c, ms) {
      var a = swing(t, ms, sd);
      var pl = sd < 0
        ? 'translate3d(' + f2(-U * OPEN) + 'px,' + f2(-U * (DOOR_H - EYE)) + 'px,0px) rotateY(' + f2(a) + 'deg)'
        : 'translate3d(' + f2(U * OPEN) + 'px,' + f2(-U * (DOOR_H - EYE)) + 'px,0px) rotateY(' + f2(-a) + 'deg) translateX(' + f2(-U * OPEN) + 'px)';
      // folded back behind the side pairs, it has gone
      return { transform: persp(c) + pl, gone: a > 168 };
    };
  }
  return function () { return { transform: 'none', gone: false }; };
}
function swing(t, ms, side) {
  var t0 = t.doors + (side > 0 ? t.doorLag : 0);
  return 170 * EASE_SWING(clamp01((ms - t0) / t.doorsDur));
}

/* The hall, and the planes that stand with it, scaled about the eye point
   as a wall HALL_D behind the doors. */
function hallFrames(cam, times) {
  return times.map(function (ms) {
    var c = cam.at(ms), s = (cam.dF + HALL_D) / (c.z + HALL_D);
    return [ms, { transform: 'translate(0px,' + f2(c.yh - cam.yhf) + 'px) scale(' + f5(s) + ')' }];
  });
}

/* =========================================================================
   The lamps of the hall at the landing (night): the fanlights from the
   clock outward, the pair in each bay together, their floor streaks with
   them; then the marquee's bulbs chase once.
   ========================================================================= */
function hallLamps(total, t) {
  var clock = $('#clock');
  if (!clock) return;
  var c = clock.getBoundingClientRect(), mid = c.left + c.width / 2;
  var bays = [];
  $$('#gates .gate.active').forEach(function (g) {
    var r = g.getBoundingClientRect();
    bays.push({ g: g, d: Math.abs(r.left + r.width / 2 - mid), left: r.left + r.width / 2 < mid, i: 0 });
  });
  [true, false].forEach(function (left) {
    bays.filter(function (b) { return b.left === left; })
      .sort(function (a, b) { return a.d - b.d; })
      .forEach(function (b, i) { b.i = i; });
  });
  var light = function (el, i) {
    var to = parseFloat(getComputedStyle(el).opacity);
    if (!(to > 0.01)) return;
    var at = t.house + 110 + Math.min(2, i) * 150;
    fade(el, [[0, 0], [at, 0], [at + 440, to]], total);
  };
  bays.forEach(function (b) {
    if (b.g.dataset.state !== 'open') return;
    $$('.lit', b.g).forEach(function (l) { light(l, b.i); });
    // its fanlight's streak on the floor is the same lamp (Law 10)
    $$('.st-fan').forEach(function (s) { if (s.dataset.gate === b.g.id) light(s, b.i); });
  });
}
var E_CHASE_STEPS = 28;
function marqueeChase(host, total, at) {
  var tk = $('#ticker'), mq = $('.e-marquee', host);
  if (!tk || !mq) return;
  // read before the clock starts, while the hall still stands at rest
  var r = tk.getBoundingClientRect();
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
   The lights of the street (night) and the day's glass
   ========================================================================= */
function layersOf(part, cls) { return part ? $$('.' + cls, part.el) : []; }
function lights(sc, P, t, total) {
  if (P.night) {
    // the letters come on one by one, each with a stammer, A to M
    for (var k = 0; k < 6; k++) {
      var a = t.letters + k * t.letterGap;
      fadeAll(layersOf(sc.fascia, 'e-l' + k), [[0, 0], [a, 0], [a + 30, 0.95], [a + 55, 0.3], [a + 95, 1]], total);
    }
    var lettersUp = t.letters + 6 * t.letterGap;
    fadeAll(layersOf(sc.fascia, 'e-returns'), [[0, 0], [t.letters + 40, 0], [t.letters + 120, 1]], total);
    fadeAll(layersOf(sc.fascia, 'e-wash'), [[0, 0], [t.letters + 60, 0], [lettersUp + 120, 1, 'ease-out']], total);
    fadeAll(layersOf(sc.fascia, 'e-dark'), [[0, 1], [t.letters + 40, 1], [lettersUp + 60, 0, 'ease-out']], total);
    fadeAll(layersOf(sc.fascia, 'e-crest-lit'), [[0, 0.25], [lettersUp - 80, 0.25], [lettersUp + 180, 1, 'ease-out']], total);
    // the border's bulbs chase, a bulb pitch every chaseStep
    for (var ph = 0; ph < 3; ph++) {
      var pts = [[0, 0], [t.chase, 0], [t.chase + 90, 0.6]];
      for (var s = 0; s < 40; s++) pts.push([t.chase + 120 + s * t.chaseStep, (s % 3) === ph ? 1 : 0.42, 'steps(1, end)']);
      fadeAll(layersOf(sc.fascia, 'e-ph' + ph), pts, total);
    }
    // the soffit's downlights, row by row from the fascia to the wall
    for (var r = 0; r < 4; r++) {
      var at = t.soffit + r * t.soffitGap;
      fadeAll(layersOf(sc.soffit, 'e-sr' + r), [[0, 0], [at, 0], [at + 40, 0.8], [at + 70, 0.5], [at + 140, 1]], total);
    }
    // what those lamps light: the wall under the canopy, the posters, the
    // facade over it, the stone at the reader's feet
    sc.uppers.concat(sc.walls, [sc.transom, sc.stanchions]).forEach(function (p) {
      fadeAll(layersOf(p, 'e-lit'), [[0, 0], [t.posters, 0], [t.soffit + 300, 1, 'ease-out']], total);
    });
    sc.rows.forEach(function (row) {
      fadeAll(layersOf(row, 'e-lit'), [[0, 0], [t.soffit, 0], [t.soffit + 360, 1, 'ease-out']], total);
      // the doors open, and the foyer's light spills out over the wet stone
      fadeAll(layersOf(row, 'e-spill'), [[0, 0.3], [t.spill[0], 0.3], [t.spill[1], 1, 'ease-in-out']], total);
    });
    if (sc.dusk) fadeAll(layersOf(sc.dusk, 'e-base'), [[0, 1], [t.posters, 1], [t.soffit + 380, 0, 'ease-in-out']], total);
    // the haze on the centre pair's glass burns off: the foyer, lit
    sc.leaves.forEach(function (l) { fadeAll(layersOf(l, 'e-haze'), [[0, 0.96], [t.haze[0], 0.96], [t.haze[1], 0.1, 'ease-in-out']], total); });
  } else {
    // the street's reflection thins as the eye finds the foyer behind it
    sc.leaves.forEach(function (l) { fadeAll(layersOf(l, 'e-haze'), [[0, 0.97], [t.haze[0], 0.97], [t.haze[1], 0.62, 'ease-out']], total); });
  }
}

/* =========================================================================
   Public
   ========================================================================= */
var E = window.Entrance = {};

/* Dress the street for this theme and screen, every piece in its first
   pose, the clock parked: nothing moves until start(). yEnd is the eye
   point in the hall (the clock's dial), where the horizon lands. Returns a
   promise that settles once every piece is painted. */
E.dress = function (host, opts) {
  E.clear();
  var theme = opts.theme === 'ivory' ? 'ivory' : 'onyx';
  var W = window.innerWidth, H = window.innerHeight;
  var t = TIMES[theme];
  var P = palette(theme, opts.wing);
  var cam = new Camera(W, H, opts.yEnd || H * 0.45, t);
  WALL = Math.min(15, (W / 2) * Z0 / cam.f + 0.9);
  UPPER = Math.min(11, cam.yh0 * Z0 / cam.f + EYE + 0.5);
  billN = 0;
  var sc = build(host, P, cam, t);
  sc.parts.forEach(function (p) { if (p.kind !== 'hall') p.poseAt = poser(p, cam); });
  var my = S = { host: host, sc: sc, cam: cam, P: P, t: t, theme: theme, W: W, H: H, ready: false };
  var t0 = performance.now();
  S.total = theme === 'ivory' ? t.end : t.house + 110 + 2 * 150 + 460;
  pose0();
  sc.world.style.visibility = 'hidden';
  return texReady.then(function () {
    if (S !== my) return false;
    return paint(sc.parts, cam, P);
  }).then(function () {
    if (S !== my) return false;
    sc.world.style.removeProperty('visibility');
    S.ready = true;
    window.__entrancePaintMs = Math.round(performance.now() - t0);   // read by the capture scripts
    return true;
  });
};

/* Pose everything for the walk: the camera's pieces, the hall, the lights.
   Called on dress and again whenever the hall's eye point moves before the
   clock starts (the stage solved). */
function pose0() {
  anims.forEach(function (a) { a.cancel(); });
  anims = [];
  var sc = S.sc, cam = S.cam, t = S.t, total = S.total;
  var times = samples(Math.max(cam.walkEnd, t.tilt[1], t.doors + t.doorLag + t.doorsDur));
  sc.parts.forEach(function (p) { if (p.kind !== 'hall') track(p, cam, times, total); });
  var hall = hallFrames(cam, samples(cam.walkEnd));
  [sc.ring.el, sc.veil.el].forEach(function (e) {
    e.style.transformOrigin = f2(S.W / 2) + 'px ' + f2(cam.yhf) + 'px';
    run(e, hall, total);
  });
  fade(sc.veil.el, [[0, 1], [t.veil[0], 1], [t.veil[1], 0, 'ease-in-out']], total);
  // The hall itself takes its pose only when the clock starts: while the
  // street stands, the hall lays itself out and measures its own boxes, and
  // a box read through a pose half its size put the aisle cases out of the
  // hall at 3440. Parked with no backward fill, it stands at rest until then.
  ['#hall', '#signal-desk'].forEach(function (sel) {
    var e = $(sel);
    if (!e) return;
    var r = e.getBoundingClientRect();
    e.style.transformOrigin = f2(S.W / 2 - r.left) + 'px ' + f2(cam.yhf - r.top) + 'px';
    run(e, hall, total, 'forwards');
  });
  lights(sc, S.P, t, total);
  park();
}
/* Hold every animation on its first frame until the clock starts, parked a
   long way ahead. The hall's own is parked without a pose, so it is drawn
   at the scale it lands on while the street still stands. */
function park() {
  var now = document.timeline.currentTime || 0;
  anims.forEach(function (a) { a.startTime = now + BIG; });
}

/* Re-aim the walk's end at the hall's eye point (the stage was solved). */
E.measure = function (yEnd) {
  if (!S || S.started) return;
  if (Math.abs(yEnd - S.cam.yhf) < 0.5) return;
  S.cam.yhf = yEnd;
  pose0();
};

E.start = function () {
  if (!S || S.started || !S.ready) return false;
  // the hall's own lamps join the clock now that the hall is built
  if (S.P.night) {
    hallLamps(S.total, S.t);
    marqueeChase(S.host, S.total, S.t.marquee);
  }
  S.started = true;
  var now = document.timeline.currentTime;
  anims.forEach(function (a) { a.startTime = now; });
  return true;
};

/* Stop the clock at ms (frame capture). */
E.seek = function (ms) {
  if (!S) return;
  if (!S.started) E.start();
  S.frozen = true;
  anims.forEach(function (a) { a.pause(); a.currentTime = ms; });
};

/* Everything off: the hall at rest, the street gone. */
E.clear = function () {
  anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* gone */ } });
  anims = [];
  ['#hall', '#signal-desk'].forEach(function (s) {
    var e = $(s);
    if (e) e.style.removeProperty('transform-origin');
  });
  if (S && S.sc && S.sc.world && S.sc.world.parentNode) S.sc.world.parentNode.removeChild(S.sc.world);
  S = null;
};

E.beats = function () { return S ? { doneFade: S.t.doneFade, total: S.total } : null; };
E.running = function () { return !!(S && S.started); };
E.ready = function () { return !!(S && S.ready); };
E.frozen = function () { return !!(S && S.frozen); };

})();
