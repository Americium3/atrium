/* ===========================================================================
   THE PICTURE PALACE — gate identity and the proscenium portal.

   Every gate is a gilt proscenium: stepped archivolts that telescope out from
   a lit fanlight (Radio City's arcs, the Paramount's amber glass), a black
   glass sign on the transom, a velvet house curtain and a lacquered apron.
   The fixtures are identical on all six (sign, transom, cartouche, apron,
   lamp); the art is each gate's own, and all of it comes off a fixed hash of
   the service id, walked in registry order so a newly registered hall never
   repaints the ones already standing:

     archivolt count   3..6, unique within a wing
     metal chord       the wing's leaf leads, then bronze and the other leaf
     relief programme  per band, loud and quiet bands alternating
     fanlight          glazing pattern, ray count and glass colour
     crest             the small cast ornament riding the crown (unique
                       within a wing)
     card              the border of the day screen's title card (unique
                       within a wing)
     velvet            the house curtain's colour, fold pitch and phase

   All geometry lives on the gate's 300 x 570 design box. The archivolts are
   stilted arches: boundary k of n sits DJ*k/n in from the jamb but DC*k/n
   down from the crown, so every band is thicker at the crown than on the
   jamb, which is what makes the stack read as arcs telescoping out of the
   wall rather than as a picture frame.
   =========================================================================== */
(function () {
'use strict';

var CX = 150, R0 = 140, Y0 = 162, X0 = 10, BOT = 536, DJ = 22, DC = 56;
var FAN_R = 113;                               // fanlight glass radius
var YS = Y0 + DC - DJ;                         // 196: the shared transom line
var MARK_Y = 146;                              // cartouche centre

function fnv1a(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* A stream of independent draws off one id: draw k of hash h. */
function draw(h, k) {
  var n = (h ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
function pick(list, h, k) { return list[Math.floor(draw(h, k) * list.length)]; }
function pickUnique(list, h, k, taken) {
  var n = list.length, s = Math.floor(draw(h, k) * n);
  for (var i = 0; i < n; i++) {
    var j = (s + i) % n;
    if (!taken[j]) { taken[j] = 1; return list[j]; }
  }
  return list[s];
}

var VELVET = ['claret', 'emerald', 'sapphire', 'plum', 'peacock', 'umber'];
var GLASS = ['amber', 'rose', 'celadon', 'opal', 'honey', 'aqua'];
var FANS = ['rays', 'fan', 'fountain', 'stepped', 'sunrise', 'chevron'];
var CRESTS = ['fan', 'ziggurat', 'star', 'palmette'];
var CARDS = ['fans', 'steps', 'lozenge'];
var LOUD = ['ray', 'chevron', 'dentil', 'step', 'scallop'];
var QUIET = ['bead', 'reed', 'flute', 'plain'];

/* Walk the registry in order: the (velvet, glass, fanlight) of a gate is its
   own unless a gate ahead of it in the registry already took it. */
function identities(list) {
  var out = {}, tv = {}, tg = {}, tf = {}, tn = {}, tc = {}, tk = {};
  list.forEach(function (svc) {
    if (svc.vacant) { out[svc.id] = vacant(svc); return; }
    var h = fnv1a(svc.id);
    var wingN = tn[svc.wing] || (tn[svc.wing] = {});
    var wingC = tc[svc.wing] || (tc[svc.wing] = {});
    var wingK = tk[svc.wing] || (tk[svc.wing] = {});
    var lead = svc.wing === 'bureau' ? 'ag' : 'au';
    var other = lead === 'au' ? 'ag' : 'au';
    var n = pickUnique([3, 4, 5, 6], h, 4, wingN);
    var chord = draw(h, 7) < 0.5 ? [lead, 'cu', other] : [lead, other, 'cu'];
    var loudFirst = draw(h, 8) < 0.5;
    var motifs = [], metals = [], last = '';
    for (var b = 0; b < n; b++) {
      var pool = ((b % 2 === 0) === loudFirst) ? LOUD : QUIET;
      var m = pool[Math.floor(draw(h, 20 + b) * pool.length)];
      if (m === last) m = pool[(pool.indexOf(m) + 1) % pool.length];
      motifs.push(m); last = m;
      metals.push(chord[b % 3]);
    }
    out[svc.id] = {
      h: h, n: n, motifs: motifs, metals: metals,
      velvet: pickUnique(VELVET, h, 1, tv),
      glass: pickUnique(GLASS, h, 2, tg),
      fan: pickUnique(FANS, h, 3, tf),
      rays: [9, 11, 13, 15, 17][Math.floor(draw(h, 5) * 5)],
      crest: pickUnique(CRESTS, h, 6, wingC),        // no two alike in a wing
      card: pickUnique(CARDS, h, 12, wingK),         // the day screen's title card
      folds: 7 + Math.floor(draw(h, 9) * 5),        // folds across the house
      foldX: Math.round(draw(h, 10) * 100),         // fold phase, %
      tilt: (draw(h, 11) - 0.5) * 0.6               // cartouche screw slots, deg/10
    };
  });
  return out;
}

/* The reserved gate: the same proscenium, built and not yet gilded. Bare
   plaster relief, an unglazed fanlight, a blank cartouche and the iron down.
   Nothing about it is hashed: it is the stock the other six are cut from. */
function vacant(svc) {
  return { h: 0, n: 4, motifs: ['plain', 'bead', 'plain', 'reed'],
           metals: ['pl', 'pl', 'pl', 'pl'], velvet: 'iron', glass: 'void',
           fan: 'rays', rays: 9, crest: 'none', folds: 1, foldX: 0, tilt: 0,
           vacant: true };
}

/* ---- geometry ------------------------------------------------------------ */
function bnd(k, n) {
  var j = DJ * k / n, c = DC * k / n;
  return { x: X0 + j, r: R0 - j, ys: Y0 + c - j };
}
function f2(v) { return (Math.round(v * 100) / 100).toString(); }
function archD(b) {
  return 'M' + f2(b.x) + ' ' + BOT + ' V' + f2(b.ys) + ' A' + f2(b.r) + ' ' + f2(b.r) +
    ' 0 0 1 ' + f2(300 - b.x) + ' ' + f2(b.ys) + ' V' + BOT;
}
function archOnlyD(b) {
  return 'M' + f2(b.x) + ' ' + f2(b.ys) + ' A' + f2(b.r) + ' ' + f2(b.r) +
    ' 0 0 1 ' + f2(300 - b.x) + ' ' + f2(b.ys);
}
function ringD(o, i) {
  return 'M' + f2(o.x) + ' ' + BOT + ' V' + f2(o.ys) + ' A' + f2(o.r) + ' ' + f2(o.r) +
    ' 0 0 1 ' + f2(300 - o.x) + ' ' + f2(o.ys) + ' V' + BOT + ' H' + f2(300 - i.x) +
    ' V' + f2(i.ys) + ' A' + f2(i.r) + ' ' + f2(i.r) + ' 0 0 0 ' + f2(i.x) + ' ' +
    f2(i.ys) + ' V' + BOT + ' Z';
}
/* Point on band (o outer, i inner) at arch angle th (0 = right springing,
   PI = left) and fraction f across the band (0 inner, 1 outer). */
function onArch(o, i, th, f) {
  var ix = CX + i.r * Math.cos(th), iy = i.ys - i.r * Math.sin(th);
  var ox = CX + o.r * Math.cos(th), oy = o.ys - o.r * Math.sin(th);
  return [ix + (ox - ix) * f, iy + (oy - iy) * f];
}
function P(p) { return f2(p[0]) + ' ' + f2(p[1]); }
function poly(pts) { return 'M' + pts.map(P).join(' L') + ' Z'; }

/* ---- one band's relief ---------------------------------------------------
   Returns path data for the raised parts of a band. The caller lays it three
   times: a shadow copy pushed down-right along the key light, the body, and
   a lit copy nudged up-left. That is the whole of a cast relief at this
   scale, and it agrees with every other highlight in the room. */
function relief(kind, o, i, b, n) {
  var d = '', k, th, w, a, c, pts;
  var thickC = (i.ys - i.r) - (o.ys - o.r);          // at the crown
  var thickJ = i.x - o.x;                            // on the jamb
  var arcLen = Math.PI * (o.r + i.r) / 2;
  if (kind === 'ray') {
    var cnt = Math.max(11, Math.round(arcLen / 7.4) | 1);
    for (k = 0; k < cnt; k++) {
      th = Math.PI * (k + 0.5) / cnt;
      var long = k % 2 === 0;
      var w0 = Math.PI / cnt * 0.16, w1 = Math.PI / cnt * (long ? 0.36 : 0.26);
      var f1 = long ? 0.94 : 0.66;
      d += poly([onArch(o, i, th - w0, 0.08), onArch(o, i, th + w0, 0.08),
                 onArch(o, i, th + w1, f1), onArch(o, i, th - w1, f1)]);
    }
  } else if (kind === 'flute') {
    var cf = Math.max(15, Math.round(arcLen / 4.6));
    for (k = 1; k < cf; k++) {
      th = Math.PI * k / cf;
      d += poly([onArch(o, i, th - 0.006, 0.14), onArch(o, i, th + 0.006, 0.14),
                 onArch(o, i, th + 0.006, 0.86), onArch(o, i, th - 0.006, 0.86)]);
    }
  } else if (kind === 'dentil') {
    var cd = Math.max(13, Math.round(arcLen / 6.2));
    for (k = 0; k < cd; k++) {
      th = Math.PI * (k + 0.5) / cd;
      w = Math.PI / cd * 0.30;
      d += poly([onArch(o, i, th - w, 0.2), onArch(o, i, th + w, 0.2),
                 onArch(o, i, th + w, 0.8), onArch(o, i, th - w, 0.8)]);
    }
    // the course carries on down the jambs as blocks
    var pitch = 6.2, y;
    for (y = i.ys + pitch; y < BOT - 4; y += pitch) {
      a = o.x + thickJ * 0.2; c = o.x + thickJ * 0.8;
      d += 'M' + f2(a) + ' ' + f2(y) + ' H' + f2(c) + ' V' + f2(y + pitch * 0.55) + ' H' + f2(a) + ' Z';
      d += 'M' + f2(300 - c) + ' ' + f2(y) + ' H' + f2(300 - a) + ' V' + f2(y + pitch * 0.55) + ' H' + f2(300 - c) + ' Z';
    }
  } else if (kind === 'chevron') {
    var cc = Math.max(9, Math.round(arcLen / 9));
    for (k = 0; k < cc; k++) {
      var t0 = Math.PI * k / cc, t1 = Math.PI * (k + 0.5) / cc, t2 = Math.PI * (k + 1) / cc;
      pts = [onArch(o, i, t0, 0.2), onArch(o, i, t1, 0.8), onArch(o, i, t2, 0.2),
             onArch(o, i, t2, 0.42), onArch(o, i, t1, 0.98), onArch(o, i, t0, 0.42)];
      d += poly(pts);
    }
  } else if (kind === 'step') {
    // a stepped fret: ziggurat teeth standing on the band's inner edge
    var cs = Math.max(9, Math.round(arcLen / 10));
    for (k = 0; k < cs; k++) {
      th = Math.PI * (k + 0.5) / cs;
      var s1 = Math.PI / cs * 0.42, s2 = Math.PI / cs * 0.26, s3 = Math.PI / cs * 0.11;
      pts = [onArch(o, i, th - s1, 0.1), onArch(o, i, th + s1, 0.1),
             onArch(o, i, th + s1, 0.38), onArch(o, i, th + s2, 0.38),
             onArch(o, i, th + s2, 0.64), onArch(o, i, th + s3, 0.64),
             onArch(o, i, th + s3, 0.9), onArch(o, i, th - s3, 0.9),
             onArch(o, i, th - s3, 0.64), onArch(o, i, th - s2, 0.64),
             onArch(o, i, th - s2, 0.38), onArch(o, i, th - s1, 0.38)];
      d += poly(pts);
    }
  } else if (kind === 'scallop') {
    // little fans, one per voussoir, opening outward
    var cn = Math.max(7, Math.round(arcLen / 13));
    for (k = 0; k < cn; k++) {
      th = Math.PI * (k + 0.5) / cn;
      var half = Math.PI / cn * 0.46;
      pts = [onArch(o, i, th, 0.1)];
      for (var q = 0; q <= 8; q++) pts.push(onArch(o, i, th - half + 2 * half * q / 8, 0.9));
      d += poly(pts);
    }
  } else if (kind === 'bead') {
    // beads along the band's spine, arch and jambs alike
    var br = Math.max(0.9, Math.min(thickJ, thickC) * 0.3), step = br * 2.7;
    var spine = bnd(b + 0.5, n);
    var len = Math.PI * spine.r, m = Math.floor(len / step);
    for (k = 0; k <= m; k++) {
      th = Math.PI * k / m;
      var p = [CX + spine.r * Math.cos(th), spine.ys - spine.r * Math.sin(th)];
      d += circ(p[0], p[1], br);
    }
    for (var yy = spine.ys + step; yy < BOT - 3; yy += step) {
      d += circ(spine.x, yy, br) + circ(300 - spine.x, yy, br);
    }
  }
  return d;
}
function circ(x, y, r) {
  return 'M' + f2(x - r) + ' ' + f2(y) + ' a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(2 * r) +
    ' 0 a' + f2(r) + ' ' + f2(r) + ' 0 1 0 ' + f2(-2 * r) + ' 0 Z';
}

/* ---- the fanlight -------------------------------------------------------- */
function fanBars(kind, rays) {
  var d = '', k, th, r0 = 20, R = FAN_R, x, y;
  function ray(th, a, b) {
    d += 'M' + f2(CX + a * Math.cos(th)) + ' ' + f2(YS - a * Math.sin(th)) +
         ' L' + f2(CX + b * Math.cos(th)) + ' ' + f2(YS - b * Math.sin(th));
  }
  function arc(r) { d += 'M' + f2(CX - r) + ' ' + YS + ' A' + r + ' ' + r + ' 0 0 1 ' + f2(CX + r) + ' ' + YS; }
  if (kind === 'rays' || kind === 'fan') {
    for (k = 1; k <= rays; k++) {
      th = Math.PI * k / (rays + 1);
      ray(th, r0, kind === 'fan' && k % 2 ? 60 : R);
    }
    arc(60);
    if (kind === 'fan') arc(90);
  } else if (kind === 'sunrise') {
    arc(40);
    for (k = 1; k <= rays; k++) {
      th = Math.PI * k / (rays + 1);
      ray(th, 40, k % 2 ? R : 78);
    }
    for (k = 1; k < 8; k++) { th = Math.PI * k / 8; ray(th, 12, 40); }
  } else if (kind === 'fountain') {
    ray(Math.PI / 2, r0, R);
    [[34, 0.84], [64, 0.64], [92, 0.44]].forEach(function (j) {
      var spread = j[0], rise = R * j[1];
      [-1, 1].forEach(function (s) {
        d += 'M' + CX + ' ' + f2(YS - 16) + ' Q' + f2(CX + s * spread * 0.2) + ' ' + f2(YS - rise * 1.25) +
             ' ' + f2(CX + s * spread) + ' ' + f2(YS - rise * 0.62) +
             ' T' + f2(CX + s * spread * 1.22) + ' ' + f2(YS - 2);
      });
    });
    arc(R * 0.5);
  } else if (kind === 'stepped') {
    // nested ziggurats standing on the transom
    [[96, 22], [72, 48], [48, 72], [24, 96]].forEach(function (s, idx) {
      x = s[0]; y = s[1];
      d += 'M' + f2(CX - x) + ' ' + YS + ' V' + f2(YS - y + 12) + ' H' + f2(CX - x + 12) +
           ' V' + f2(YS - y) + ' H' + f2(CX + x - 12) + ' V' + f2(YS - y + 12) + ' H' + f2(CX + x) + ' V' + YS;
    });
    for (k = 1; k <= 4; k++) ray(Math.PI * k / 5, 96 * 0.9, R);
  } else if (kind === 'chevron') {
    ray(Math.PI / 2, r0, R);
    [30, 54, 78, 100].forEach(function (h) {
      d += 'M' + f2(CX - h * 0.95) + ' ' + f2(YS - 4) + ' L' + CX + ' ' + f2(YS - h) + ' L' + f2(CX + h * 0.95) + ' ' + f2(YS - 4);
    });
  }
  return d;
}

/* ---- the crest riding the crown ----------------------------------------- */
function crest(kind) {
  var d = '', k, th;
  if (kind === 'fan') {
    var pts = [[CX, 24]];
    for (k = 0; k <= 12; k++) { th = Math.PI * k / 12; pts.push([CX + 17 * Math.cos(th), 24 - 17 * Math.sin(th)]); }
    d = poly(pts);
  } else if (kind === 'ziggurat') {
    d = 'M131 24 V18 H136 V12 H142 V6 H158 V12 H164 V18 H169 V24 Z';
  } else if (kind === 'star') {
    var s = [];
    for (k = 0; k < 16; k++) {
      th = Math.PI * k / 8 - Math.PI / 2;
      var r = k % 2 ? 4.6 : 11.5;
      s.push([CX + r * Math.cos(th), 13 + r * Math.sin(th)]);
    }
    d = poly(s);
  } else if (kind === 'palmette') {
    for (k = -2; k <= 2; k++) {
      th = Math.PI / 2 + k * 0.42;
      var tip = [CX + 18 * Math.cos(th), 24 - 18 * Math.sin(th)];
      var l = [CX + 6 * Math.cos(th + 0.5), 24 - 6 * Math.sin(th + 0.5)];
      var rr = [CX + 6 * Math.cos(th - 0.5), 24 - 6 * Math.sin(th - 0.5)];
      d += poly([[CX, 24], l, tip, rr]);
    }
  }
  return d;
}

/* ---- the portal ---------------------------------------------------------- */
var STOPS = [0, 0.2, 0.5, 0.74, 0.9, 1];
function stops(metal) {
  return STOPS.map(function (o, k) {
    return '<stop offset="' + o + '" class="s-' + metal + ' s' + k + '"/>';
  }).join('');
}

function portal(gid, id) {
  var n = id.n, defs = '', body = '', lights = '', k, b;
  var bd = [];
  for (k = 0; k <= n; k++) bd.push(bnd(k, n));
  var inner = bd[n];

  // Plinth and the wall's own reveal behind the jambs.
  body += '<path class="p-reveal" d="' + archD(bd[0]) + ' Z"/>';

  for (b = 0; b < n; b++) {
    var o = bd[b], i = bd[b + 1], metal = id.metals[b];
    var gA = gid + '-a' + b, gL = gid + '-l' + b, gR = gid + '-r' + b, cp = gid + '-c' + b;
    defs += '<radialGradient id="' + gA + '" gradientUnits="userSpaceOnUse" cx="' + CX + '" cy="' +
      f2(o.ys) + '" r="' + f2(o.r) + '" fx="' + CX + '" fy="' + f2(i.ys) + '" fr="' + f2(i.r) + '">' +
      stops(metal) + '</radialGradient>';
    defs += '<linearGradient id="' + gL + '" gradientUnits="userSpaceOnUse" x1="' + f2(i.x) +
      '" y1="0" x2="' + f2(o.x) + '" y2="0">' + stops(metal) + '</linearGradient>';
    defs += '<linearGradient id="' + gR + '" gradientUnits="userSpaceOnUse" x1="' + f2(300 - i.x) +
      '" y1="0" x2="' + f2(300 - o.x) + '" y2="0">' + stops(metal) + '</linearGradient>';
    defs += '<clipPath id="' + cp + '"><path d="' + ringD(o, i) + '"/></clipPath>';

    var archPart = 'M' + f2(o.x) + ' ' + f2(i.ys) + ' V' + f2(o.ys) + ' A' + f2(o.r) + ' ' + f2(o.r) +
      ' 0 0 1 ' + f2(300 - o.x) + ' ' + f2(o.ys) + ' V' + f2(i.ys) + ' H' + f2(300 - i.x) +
      ' A' + f2(i.r) + ' ' + f2(i.r) + ' 0 0 0 ' + f2(i.x) + ' ' + f2(i.ys) + ' Z';
    body += '<g class="band m-' + metal + '">' +
      '<path class="b-face" fill="url(#' + gA + ')" d="' + archPart + '"/>' +
      '<rect class="b-face" fill="url(#' + gL + ')" x="' + f2(o.x) + '" y="' + f2(i.ys) +
        '" width="' + f2(i.x - o.x + 0.2) + '" height="' + f2(BOT - i.ys) + '"/>' +
      '<rect class="b-face" fill="url(#' + gR + ')" x="' + f2(300 - i.x - 0.2) + '" y="' + f2(i.ys) +
        '" width="' + f2(i.x - o.x + 0.2) + '" height="' + f2(BOT - i.ys) + '"/>';
    var rel = relief(id.motifs[b], o, i, b, n);
    if (rel) {
      body += '<g clip-path="url(#' + cp + ')">' +
        '<path class="r-sh" transform="translate(0.5 0.8)" d="' + rel + '"/>' +
        '<path class="r-body" d="' + rel + '"/>' +
        '<path class="r-lt" transform="translate(-0.35 -0.5)" d="' + rel + '"/>' +
        '<path class="r-body" transform="translate(0.1 0.15)" d="' + rel + '"/></g>';
    }
    // Arris: the outer lip catches the light, the step down into the next
    // band sits in its own glaze.
    body += '<path class="b-lip" d="' + archD(bnd(b + 0.06, n)) + '"/>' +
            '<path class="b-crest" d="' + archD(bnd(b + 0.34, n)) + '"/>' +
            '<path class="b-glaze" d="' + archD(bnd(b + 0.97, n)) + '"/>' +
            '</g>';
    // The cove: a lamp trough hidden behind band b-1's lip, washing band b
    // from its outer edge inward. Radio City's proscenium, one arc at a time.
    if (b > 0) {
      lights += '<g class="lit cove" clip-path="url(#' + cp + ')">' +
        '<path class="cv3" d="' + archD(bnd(b + 0.34, n)) + '"/>' +
        '<path class="cv2" d="' + archD(bnd(b + 0.16, n)) + '"/>' +
        '<path class="cv1" d="' + archD(bnd(b + 0.04, n)) + '"/></g>';
    }
  }
  // The leaf itself: 85 mm squares laid edge to edge, each a shade off its
  // neighbours, soft-lit over every band so the gradients read as gilding
  // rather than as paint.
  body += '<path class="p-leaf" d="' + ringD(bd[0], inner) + '"/>';
  // The outermost arris against the wall and the innermost reveal into the
  // opening: the two lines that say how deep the portal stands.
  body += '<path class="p-edge-out" d="' + archD(bd[0]) + '"/>';
  body += '<path class="p-edge-in" d="' + archD(inner) + '"/>';

  // Fanlight: unlit glass, the lit layer (night), etching, bars, hub, frame.
  var glassD = 'M' + (CX - FAN_R) + ' ' + YS + ' A' + FAN_R + ' ' + FAN_R + ' 0 0 1 ' +
    (CX + FAN_R) + ' ' + YS + ' Z';
  var fan = '<g class="fanlight">' +
    '<path class="fg-well" d="M' + f2(inner.x) + ' ' + YS + ' V' + f2(inner.ys) + ' ' +
      archOnlyD(inner).replace(/^M[^A]+/, '') + ' V' + YS + ' Z"/>' +
    '<path class="fg-base" d="' + glassD + '"/>' +
    '<path class="lit fg-lit" fill="url(#fl-' + id.glass + ')" d="' + glassD + '"/>' +
    '<path class="fg-etch" d="' + glassD + '"/>' +
    '<path class="fg-tex" d="' + glassD + '"/>' +
    '<path class="fg-spec" d="' + glassD + '"/>';
  var bars = fanBars(id.fan, id.rays);
  // The cames are leaded INTO the glass: they stop at the rim, whatever the
  // pattern's own curves would like to do.
  defs += '<clipPath id="' + gid + '-glass"><path d="' + glassD + '"/></clipPath>';
  fan += '<g clip-path="url(#' + gid + '-glass)">' +
         '<path class="bar-sh" transform="translate(0.7 1.1)" d="' + bars + '"/>' +
         '<path class="bar" d="' + bars + '"/>' +
         '<path class="bar-lt" transform="translate(-0.45 -0.55)" d="' + bars + '"/></g>';
  // hub and the glazing frame round the rim
  fan += '<path class="hub" d="M' + (CX - 21) + ' ' + YS + ' A21 21 0 0 1 ' + (CX + 21) + ' ' + YS + ' Z"/>' +
    '<path class="hub-lt" d="M' + (CX - 17) + ' ' + (YS - 1) + ' A17 17 0 0 1 ' + (CX + 17) + ' ' + (YS - 1) + '"/>' +
    '<path class="rim" d="M' + (CX - FAN_R) + ' ' + YS + ' A' + FAN_R + ' ' + FAN_R + ' 0 0 1 ' + (CX + FAN_R) + ' ' + YS + '"/>' +
    '<path class="rim-lt" d="M' + (CX - FAN_R + 2.2) + ' ' + (YS - 0.5) + ' A' + (FAN_R - 2.2) + ' ' + (FAN_R - 2.2) + ' 0 0 1 ' + (CX + FAN_R - 2.2) + ' ' + (YS - 0.5) + '"/>' +
    '</g>';

  // Transom bar: the gilt lintel the sign hangs from.
  var tx0 = inner.x, tx1 = 300 - inner.x;
  var transom = '<g class="transom">' +
    '<rect class="tr-body" x="' + f2(tx0) + '" y="' + YS + '" width="' + f2(tx1 - tx0) + '" height="8"/>' +
    '<rect class="tr-lt" x="' + f2(tx0) + '" y="' + YS + '" width="' + f2(tx1 - tx0) + '" height="1.3"/>' +
    '<rect class="tr-sh" x="' + f2(tx0) + '" y="' + (YS + 6.6) + '" width="' + f2(tx1 - tx0) + '" height="1.4"/>' +
    '</g>';

  // Cartouche: a stepped lozenge, each step cut as four flat facets that
  // take the one light (upper-left lit, lower-right in shade).
  var cart = '<g class="cartouche">';
  [[48, 'c-outer'], [41, 'c-mid'], [35, 'c-field']].forEach(function (s, idx) {
    var R = s[0], r = idx < 2 ? R - 5 : 0;
    var T = [CX, MARK_Y - R], Rt = [CX + R, MARK_Y], B = [CX, MARK_Y + R], L = [CX - R, MARK_Y];
    if (idx === 2) {
      cart += '<path class="' + s[1] + '" d="' + poly([T, Rt, B, L]) + '"/>';
      return;
    }
    var t = [CX, MARK_Y - r], rt = [CX + r, MARK_Y], bb = [CX, MARK_Y + r], l = [CX - r, MARK_Y];
    cart += '<path class="' + s[1] + ' fa-tl" d="' + poly([L, T, t, l]) + '"/>' +
            '<path class="' + s[1] + ' fa-tr" d="' + poly([T, Rt, rt, t]) + '"/>' +
            '<path class="' + s[1] + ' fa-br" d="' + poly([Rt, B, bb, rt]) + '"/>' +
            '<path class="' + s[1] + ' fa-bl" d="' + poly([B, L, l, bb]) + '"/>';
  });
  // four screws at the lozenge points, slots turned by the hash
  [[0, -44], [44, 0], [0, 44], [-44, 0]].forEach(function (p, idx) {
    var sx = CX + p[0], sy = MARK_Y + p[1], a = (id.tilt * 100 + idx * 37) % 180;
    cart += '<circle class="screw" cx="' + sx + '" cy="' + sy + '" r="2.1"/>' +
            '<path class="screw-slot" transform="rotate(' + f2(a) + ' ' + sx + ' ' + sy + ')" d="M' +
            f2(sx - 1.6) + ' ' + sy + ' H' + f2(sx + 1.6) + '"/>';
  });
  cart += '</g>';

  var cr = crest(id.crest);
  var crestG = cr ? '<g class="crest"><path class="cr-sh" transform="translate(0.6 0.9)" d="' + cr +
    '"/><path class="cr-body" d="' + cr + '"/><path class="cr-lt" transform="translate(-0.35 -0.45)" d="' +
    cr + '"/><path class="cr-body" transform="translate(0.08 0.12)" d="' + cr + '"/></g>' : '';

  // Imposts and pedestals: the capital block the archivolts spring from and
  // the stepped base they stand on. Fixtures, so identical on every gate;
  // each step is a slab with a lit top, a face and a shadow thrown down-right
  // onto whatever lies behind it.
  var blocks = '<g class="imposts">';
  [[146, 4.5, 16], [150.5, 6, 14.5], [156.5, 5, 13], [161.5, 3, 11]].forEach(function (s, k) {
    blocks += slab(21, s[0], s[1], s[2], k === 1) + slab(279, s[0], s[1], s[2], k === 1);
  });
  [[504, 6, 12], [510, 9, 13.5], [519, 17, 15.5]].forEach(function (s, k) {
    blocks += slab(21, s[0], s[1], s[2], k === 1) + slab(279, s[0], s[1], s[2], k === 1);
  });
  blocks += '</g>';

  // Plinth: black marble, gilt nosing, stepped out past the jambs.
  var plinth = '<g class="plinth">' +
    '<rect class="pl-body" x="4" y="' + BOT + '" width="292" height="' + (560 - BOT) + '"/>' +
    '<rect class="pl-nose" x="4" y="' + BOT + '" width="292" height="2.6"/>' +
    '<rect class="pl-nose-lt" x="4" y="' + BOT + '" width="292" height="0.9"/>' +
    '<rect class="pl-foot" x="0" y="556" width="300" height="4"/>' +
    '</g>';

  // The one sanctioned hover sheen, confined to the gilding: a band that
  // travels across the archivolts only, never the glass or the sign.
  defs += '<clipPath id="' + gid + '-gilt"><path d="' + ringD(bd[0], inner) + '"/></clipPath>';
  var sheen = '<g clip-path="url(#' + gid + '-gilt)"><rect class="p-sheen" x="-120" y="0" width="70" height="570"/></g>';
  var focus = '<path class="p-focus" d="' + archD(bnd(-0.18, n)) + '"/>';

  return '<defs>' + defs + '</defs>' + body + '<g class="lights">' + lights + '</g>' +
    fan + transom + blocks + cart + crestG + plinth + sheen + focus;
}

/* One slab of an impost or pedestal, centred on cx, half-width hw. A boss
   rides the face of the middle course. */
function slab(cx, y, h, hw, boss) {
  var x = cx - hw, w = hw * 2;
  var out = '<rect class="im-sh" x="' + f2(x + 0.8) + '" y="' + f2(y + 1.2) + '" width="' + f2(w) + '" height="' + f2(h) + '"/>' +
    '<rect class="im-face" x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(w) + '" height="' + f2(h) + '"/>' +
    '<rect class="im-top" x="' + f2(x) + '" y="' + f2(y) + '" width="' + f2(w) + '" height="0.9"/>' +
    '<rect class="im-foot" x="' + f2(x) + '" y="' + f2(y + h - 0.8) + '" width="' + f2(w) + '" height="0.8"/>' +
    '<rect class="im-end" x="' + f2(x) + '" y="' + f2(y) + '" width="0.8" height="' + f2(h) + '"/>';
  if (boss) {
    out += '<path class="im-boss" d="' + circ(cx, y + h / 2, 1.9) + '"/>' +
           '<path class="im-boss-lt" d="' + circ(cx - 0.5, y + h / 2 - 0.6, 0.8) + '"/>';
  }
  return out;
}

/* ---- the reflection -------------------------------------------------------
   The portal as the waxed floor gives it back: the same bands, the same
   gradients (referenced from the portal itself, so the leaf matches to the
   stop), the fanlight's light, the black sign, the house and the apron,
   flipped about the plinth's foot. No relief and no glazing bars: at the
   blur a polished floor puts on a reflection, they would not survive. */
function mirror(pgid, id) {
  var n = id.n, s = '', b, bd = [];
  for (b = 0; b <= n; b++) bd.push(bnd(b, n));
  var inner = bd[n];
  s += '<g transform="translate(0 560) scale(1 -1)">';
  s += '<path class="p-reveal" d="' + archD(bd[0]) + ' Z"/>';
  for (b = 0; b < n; b++) {
    var o = bd[b], i = bd[b + 1];
    s += '<path fill="url(#' + pgid + '-a' + b + ')" d="M' + f2(o.x) + ' ' + f2(i.ys) + ' V' + f2(o.ys) +
      ' A' + f2(o.r) + ' ' + f2(o.r) + ' 0 0 1 ' + f2(300 - o.x) + ' ' + f2(o.ys) + ' V' + f2(i.ys) +
      ' H' + f2(300 - i.x) + ' A' + f2(i.r) + ' ' + f2(i.r) + ' 0 0 0 ' + f2(i.x) + ' ' + f2(i.ys) + ' Z"/>' +
      '<rect fill="url(#' + pgid + '-l' + b + ')" x="' + f2(o.x) + '" y="' + f2(i.ys) + '" width="' +
        f2(i.x - o.x + 0.2) + '" height="' + f2(BOT - i.ys) + '"/>' +
      '<rect fill="url(#' + pgid + '-r' + b + ')" x="' + f2(300 - i.x - 0.2) + '" y="' + f2(i.ys) + '" width="' +
        f2(i.x - o.x + 0.2) + '" height="' + f2(BOT - i.ys) + '"/>';
  }
  var glassD = 'M' + (CX - FAN_R) + ' ' + YS + ' A' + FAN_R + ' ' + FAN_R + ' 0 0 1 ' + (CX + FAN_R) + ' ' + YS + ' Z';
  s += '<path class="fg-base" d="' + glassD + '"/>' +
       '<path class="lit fg-lit" fill="url(#fl-' + id.glass + ')" d="' + glassD + '"/>';
  s += '<rect class="mr-sign" x="' + f2(inner.x + 3) + '" y="' + (YS + 8) + '" width="' + f2(300 - 2 * inner.x - 6) + '" height="40"/>';
  s += '<rect class="mr-house" x="' + f2(inner.x) + '" y="' + (YS + 54) + '" width="' + f2(300 - 2 * inner.x) + '" height="' + (BOT - 50 - YS - 54) + '"/>';
  s += '<rect class="mr-apron" x="' + f2(inner.x) + '" y="' + (BOT - 50) + '" width="' + f2(300 - 2 * inner.x) + '" height="50"/>';
  s += '<rect class="pl-body" x="4" y="' + BOT + '" width="292" height="' + (560 - BOT) + '"/>' +
       '<rect class="pl-nose" x="4" y="' + BOT + '" width="292" height="2.6"/>';
  s += '</g>';
  return s;
}

window.Palace = {
  identities: identities, portal: portal, mirror: mirror,
  geometry: { YS: YS, MARK_Y: MARK_Y, BOT: BOT, INNER_X: X0 + DJ }
};
})();
