/* ===========================================================================
   THE CONCOURSE CLOCK — the hall's centrepiece.

   A grande-complication regulator in a stepped octagonal deco case, drawn
   entirely from flat fills and 1 / 1.5px hairlines (DESIGN.md material law:
   no gradients, no bevels, no glows — richness comes from line density).

   Case (1000-unit square)  octagon + stepped shoulders + diagonal spandrels
                            + rivets at the eight vertices.
   Dial (own 1000 space, scaled 0.855)
        knurled bronze bezel . fret band . guilloche field . 60-mark chapter
        ring . twelve Roman numerals (quarters in wing metal) . four
        complications on the cardinal axes:
            12  moon phase     3  date     6  seconds     9  the works
        pierced Breguet hands with stepped counterweights.

   Every stroke carries vector-effect:non-scaling-stroke, so the hairline law
   holds whether the dial is drawn at 160px or 620px.

   Drive: the loop reads `new Date()` on every frame and never accumulates,
   so drift is structurally impossible and a DST step or a machine sleep
   corrects itself on the next frame. Under reduced motion the sweep is
   replaced by a boundary-aligned 1 Hz deadbeat tick.
   =========================================================================== */
(function () {
'use strict';

var NS = 'http://www.w3.org/2000/svg';

/* ---- geometry helpers ---------------------------------------------------- */
function pt(a, r, cx, cy) {
  var t = (a - 90) * Math.PI / 180;
  return [(cx === undefined ? 500 : cx) + r * Math.cos(t),
          (cy === undefined ? 500 : cy) + r * Math.sin(t)];
}

function octagon(inset) {
  var c = 212 + inset, m = 4 + inset, M = 996 - inset;
  return 'M' + c + ' ' + m + ' H' + (1000 - c) + ' L' + M + ' ' + c +
         ' V' + (1000 - c) + ' L' + (1000 - c) + ' ' + M +
         ' H' + c + ' L' + m + ' ' + (1000 - c) + ' V' + c + ' Z';
}

function shoulders() {
  var s = '', i;
  for (i = 0; i < 4; i++) {
    s += '<path class="ck-step" transform="rotate(' + (i * 90) + ' 500 500)"' +
         ' d="M212 4 l0 13 l-13 0 M199 17 l-13 13 l0 13 M186 43 l-13 0"/>';
  }
  return s;
}

function spandrels() {
  var s = '', i;
  for (i = 0; i < 4; i++) {
    s += '<g transform="rotate(' + (i * 90 + 45) + ' 500 500)">' +
         '<path class="ck-span" d="M500 96 L529 125 L500 154 L471 125 Z"/>' +
         '<path class="ck-spanin" d="M500 116 L514 130 L500 144 L486 130 Z"/>' +
         '<path class="ck-hair" d="M462 125 L432 125 M538 125 L568 125"/>' +
         '<path class="ck-hair" d="M500 60 L500 92 M478 74 L490 88 M522 74 L510 88"/>' +
         '</g>';
  }
  return s;
}

function rivets() {
  var pts = [[212, 30], [788, 30], [970, 212], [970, 788],
             [788, 970], [212, 970], [30, 788], [30, 212]];
  return pts.map(function (p) {
    return '<circle class="ck-rivet" cx="' + p[0] + '" cy="' + p[1] + '" r="9"/>';
  }).join('');
}

function knurl() {
  var s = '', i;
  for (i = 0; i < 132; i++) {
    // a turned knurl takes the one light: teeth facing up-left are lit
    var a = i * 2.727, lit = Math.cos((a + 45) * Math.PI / 180);
    s += '<rect class="ck-knurl ' + (lit > 0.35 ? 'kn-lt' : lit < -0.35 ? 'kn-dk' : 'kn-md') +
         '" x="497.6" y="8" width="4.8" height="21"' +
         ' transform="rotate(' + a + ' 500 500)"/>';
  }
  return s;
}

function fret() {
  var s = '', i;
  for (i = 0; i < 60; i++) {
    s += '<path class="ck-hair" transform="rotate(' + (i * 6) + ' 500 500)"' +
         ' d="M490 466 L490 458 L500 458 L500 450 L510 450 L510 458"/>';
  }
  return s;
}

/* Concentric rules crossed by a fine radial fan — a hairline stand-in for
   engine turning. Kept under 10% ink so it reads as surface, not pattern. */
function guilloche() {
  var s = '', r, i;
  for (r = 96; r <= 300; r += 17) {
    s += '<circle class="ck-guil" cx="500" cy="500" r="' + r + '"/>';
  }
  for (i = 0; i < 90; i++) {
    s += '<line class="ck-guil2" x1="500" y1="404" x2="500" y2="200"' +
         ' transform="rotate(' + (i * 4) + ' 500 500)"/>';
  }
  return s;
}

function chapter() {
  var s = '', i, h, w, top, bot;
  for (i = 0; i < 60; i++) {
    h = i % 5 === 0; w = h ? 15 : 5; top = h ? 452 : 448; bot = h ? 414 : 432;
    s += '<rect class="' + (h ? 'ck-baton' : 'ck-minute') + '" x="' + (500 - w / 2) +
         '" y="' + (500 - top) + '" width="' + w + '" height="' + (top - bot) +
         '" transform="rotate(' + (i * 6) + ' 500 500)"/>';
  }
  return s;
}

var ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI',
             'VII', 'VIII', 'IX', 'X', 'XI'];

function numerals() {
  return ROMAN.map(function (t, i) {
    var p = pt(i * 30, 356);
    return '<text class="ck-num' + (i % 3 === 0 ? ' ck-numq' : '') +
           '" x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle"' +
           ' dominant-baseline="central">' + t + '</text>';
  }).join('');
}

function subframe(cx, cy, r) {
  return '<circle class="ck-subsink" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#ck-sink)"/>' +
         '<circle class="ck-subring" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
         '<circle class="ck-subring2" cx="' + cx + '" cy="' + cy + '" r="' + (r - 8) + '"/>';
}

/* 12 — moon phase. The shade disc is translated across the moon by the drive
   loop; a full traverse is one synodic month. */
function moonDial(cx, cy, r) {
  var stars = '', spec = [[-34, -22, 5], [26, -30, 4], [34, 14, 4.5], [-24, 22, 3.5]];
  spec.forEach(function (v) {
    var x = cx + v[0], y = cy + v[1], s = v[2], k = s * 0.34;
    stars += '<polygon class="ck-star" points="' +
      x + ',' + (y - s) + ' ' + (x + k) + ',' + (y - k) + ' ' +
      (x + s) + ',' + y + ' ' + (x + k) + ',' + (y + k) + ' ' +
      x + ',' + (y + s) + ' ' + (x - k) + ',' + (y + k) + ' ' +
      (x - s) + ',' + y + ' ' + (x - k) + ',' + (y - k) + '"/>';
  });
  return subframe(cx, cy, r) +
    '<circle class="ck-moonwell" cx="' + cx + '" cy="' + cy + '" r="' + (r - 12) + '"/>' +
    stars +
    '<circle class="ck-moondisc" cx="' + (cx - 4) + '" cy="' + (cy - 2) + '" r="26"/>' +
    '<circle class="ck-moonshade" id="ck-shade" cx="' + (cx - 26) + '" cy="' + (cy - 2) + '" r="25"/>' +
    '<text class="ck-subcap" x="' + cx + '" y="' + (cy + r - 20) + '" text-anchor="middle">LUNA</text>';
}

/* 3 — date, read through an aperture on a 31-step ring. */
function dateDial(cx, cy, r) {
  var t = '', i, h;
  for (i = 0; i < 31; i++) {
    h = i % 5 === 0;
    t += '<rect class="' + (h ? 'ck-baton' : 'ck-minute') + '" x="' +
         (cx - (h ? 3.6 : 2.2) / 2) + '" y="' + (cy - r + 9) +
         '" width="' + (h ? 3.6 : 2.2) + '" height="' + (h ? 13 : 8) +
         '" transform="rotate(' + (i * (360 / 31)) + ' ' + cx + ' ' + cy + ')"/>';
  }
  return subframe(cx, cy, r) + t +
    '<rect class="ck-datewin" x="' + (cx - 34) + '" y="' + (cy - 20) + '" width="68" height="40"/>' +
    '<text class="ck-datenum" id="ck-date" x="' + cx + '" y="' + (cy + 1) +
    '" text-anchor="middle" dominant-baseline="central">00</text>' +
    '<text class="ck-subcap" x="' + cx + '" y="' + (cy + r - 20) + '" text-anchor="middle">DATE</text>';
}

/* 6 — small seconds. Taking the seconds off the centre keeps the main dial
   quiet and is the regulator convention. */
function secondsDial(cx, cy, r, moving) {
  var t = '', i, h;
  for (i = 0; i < 60; i++) {
    h = i % 5 === 0;
    t += '<rect class="' + (h ? 'ck-baton' : 'ck-minute') + '" x="' +
         (cx - (h ? 4 : 2) / 2) + '" y="' + (cy - r + 9) +
         '" width="' + (h ? 4 : 2) + '" height="' + (h ? 15 : 8) +
         '" transform="rotate(' + (i * 6) + ' ' + cx + ' ' + cy + ')"/>';
  }
  var secHand = '<polygon points="' +
      (cx - 1.9) + ',' + cy + ' ' + (cx - 1.2) + ',' + (cy - r + 16) + ' ' +
      cx + ',' + (cy - r + 6) + ' ' + (cx + 1.2) + ',' + (cy - r + 16) + ' ' +
      (cx + 1.9) + ',' + cy + ' ' + (cx + 4) + ',' + (cy + 18) + ' ' +
      (cx - 4) + ',' + (cy + 18) + '"/>';
  if (!moving) {
    return subframe(cx, cy, r) + t +
      '<text class="ck-subcap" x="' + cx + '" y="' + (cy + r - 20) + '" text-anchor="middle">SEC</text>';
  }
  return '<g class="ck-hsh ck-sh-s">' + secHand + '</g>' +
    '<g class="ck-ss">' +
    '<polygon class="ck-sec" points="' +
      (cx - 1.9) + ',' + cy + ' ' + (cx - 1.2) + ',' + (cy - r + 16) + ' ' +
      cx + ',' + (cy - r + 6) + ' ' + (cx + 1.2) + ',' + (cy - r + 16) + ' ' +
      (cx + 1.9) + ',' + cy + ' ' + (cx + 4) + ',' + (cy + 18) + ' ' +
      (cx - 4) + ',' + (cy + 18) + '"/>' +
    '<circle class="ck-secring" cx="' + cx + '" cy="' + (cy + 24) + '" r="8"/></g>' +
    '<circle class="ck-subboss" cx="' + cx + '" cy="' + cy + '" r="7"/>';
}

/* 9 — the works: two meshing wheels, geared 14:9 and turning against each
   other, so the hall's machinery is visibly driven by the clock. */
function worksDial(cx, cy, r, moving) {
  function wheel(R, n, cls, id) {
    var g = '', i;
    for (i = 0; i < n; i++) {
      g += '<rect class="' + cls + '" x="-3.4" y="' + (-R - 7) +
           '" width="6.8" height="9" transform="rotate(' + (i * (360 / n)) + ')"/>';
    }
    return '<g class="' + id + '"><circle class="' + cls + '" cx="0" cy="0" r="' + R + '"/>' +
           g + '<circle class="ck-gearhole" cx="0" cy="0" r="' + (R * 0.34) + '"/></g>';
  }
  if (moving) {
    return '<g transform="translate(' + (cx - 16) + ',' + (cy - 6) + ')">' + wheel(30, 14, 'ck-gear', 'ck-gA') + '</g>' +
      '<g transform="translate(' + (cx + 26) + ',' + (cy + 20) + ')">' + wheel(19, 9, 'ck-gear2', 'ck-gB') + '</g>';
  }
  return subframe(cx, cy, r) +
    '<circle class="ck-gearwell" cx="' + cx + '" cy="' + cy + '" r="' + (r - 12) + '"/>' +
    '<text class="ck-subcap" x="' + cx + '" y="' + (cy + r - 20) + '" text-anchor="middle">WORKS</text>';
}

function hand(cls, len, tail, w, pomme, pommeAt, twin) {
  var ty = 500 - len, ly = 500 + tail, py = 500 - pommeAt;
  var s = '<g class="' + cls + '"><polygon class="ck-hand" points="' +
    (500 - w) + ',500 ' + (500 - w * 0.4) + ',' + (ty + 30) + ' 500,' + ty + ' ' +
    (500 + w * 0.4) + ',' + (ty + 30) + ' ' + (500 + w) + ',500 ' +
    (500 + w * 0.7) + ',' + (ly - 26) + ' ' + (500 + w * 1.6) + ',' + (ly - 16) + ' ' +
    (500 + w * 1.6) + ',' + ly + ' ' + (500 - w * 1.6) + ',' + ly + ' ' +
    (500 - w * 1.6) + ',' + (ly - 16) + ' ' + (500 - w * 0.7) + ',' + (ly - 26) + '"/>' +
    '<circle class="ck-pomme" cx="500" cy="' + py + '" r="' + pomme + '"/>' +
    '<circle class="ck-pommehole" cx="500" cy="' + py + '" r="' + (pomme * 0.5) + '"/>';
  if (twin) {
    s += '<circle class="ck-pomme" cx="500" cy="' + (py + pomme * 1.9) + '" r="' + (pomme * 0.52) + '"/>' +
         '<circle class="ck-pommehole" cx="500" cy="' + (py + pomme * 1.9) + '" r="' + (pomme * 0.24) + '"/>';
  }
  return s + '</g>';
}

/* Paint for the dial, coloured by CSS classes on the stops. The field is
   opal glass: lit from behind at night it glows cream at the centre and
   warms toward the rim; by day it is unlit milk, cool by reflected light. */
function dialDefs() {
  return '<defs>' +
    '<radialGradient id="ck-field" cx="500" cy="470" r="480" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" class="ckf s0"/><stop offset=".55" class="ckf s1"/>' +
      '<stop offset=".9" class="ckf s2"/><stop offset="1" class="ckf s3"/></radialGradient>' +
    '<radialGradient id="ck-sink" cx=".5" cy=".5" r=".5" fx=".5" fy=".62">' +
      '<stop offset=".72" class="cks s0"/><stop offset="1" class="cks s1"/></radialGradient>' +
    '<radialGradient id="ck-case-g" cx="360" cy="300" r="760" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" class="ckc s0"/><stop offset=".45" class="ckc s1"/>' +
      '<stop offset="1" class="ckc s2"/></radialGradient>' +
    '<radialGradient id="ck-dome" cx="380" cy="300" r="420" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" class="ckd s0"/><stop offset="1" class="ckd s1"/></radialGradient>' +
    '</defs>';
}

/* Hand shadows: each hand stands higher off the dial than the one below it,
   so its shadow falls further down along the key light. */
var SHADOW = { h: [5, 9], m: [8, 14], s: [11, 19] };

/* The dial is two layers: everything that stands still (painted once) and
   everything that moves (hands, their shadows, the small seconds, the works
   and the crystal over them), so the per-frame sweep repaints only the thin
   top sheet, never the guilloche, the chapter ring and the subdials. */
function dial() {
  return '<circle class="ck-case2" cx="500" cy="500" r="499"/>' + knurl() +
    '<circle class="ck-caseline" cx="500" cy="500" r="472"/>' +
    '<circle class="ck-well" cx="500" cy="500" r="468" fill="url(#ck-field)"/>' +
    '<circle class="ck-bezel-sh" cx="500" cy="500" r="462"/>' + fret() +
    '<circle class="ck-hair2" cx="500" cy="500" r="444"/>' + guilloche() +
    '<path class="ck-chapter" fill-rule="evenodd" d="M500 56 a444 444 0 1 0 0.01 0 Z M500 92 a408 408 0 1 1 -0.01 0 Z"/>' +
    '<circle class="ck-hair2" cx="500" cy="500" r="408"/>' +
    '<circle class="ck-goldrule" cx="500" cy="500" r="400"/>' +
    chapter() + numerals() +
    moonDial(500, 295, 88) + dateDial(705, 500, 88) +
    secondsDial(500, 705, 88, false) + worksDial(295, 500, 88, false);
}
function dialMoving() {
  return secondsDial(500, 705, 88, true) + worksDial(295, 500, 88, true) +
    '<g class="ck-hsh ck-sh-h">' + hand('', 288, 80, 20, 36, 228, true) + '</g>' +
    '<g class="ck-hsh ck-sh-m">' + hand('', 396, 96, 11, 24, 338, false) + '</g>' +
    hand('ck-h', 288, 80, 20, 36, 228, true) +
    hand('ck-m', 396, 96, 11, 24, 338, false) +
    '<circle class="ck-boss" cx="500" cy="500" r="31"/>' +
    '<circle class="ck-bosshair" cx="500" cy="500" r="20"/>' +
    '<circle class="ck-boss-lt" cx="492" cy="492" r="9"/>' +
    // The crystal: a domed glass over all of it. One long soft reflection of
    // the room's brightest source, one short sharp one, and the lit edge.
    '<g class="ck-crystal">' +
      '<ellipse class="ck-dome" cx="400" cy="300" rx="330" ry="210" transform="rotate(-32 400 300)"/>' +
      '<path class="ck-glint" d="M254 260 A300 300 0 0 1 430 128 A320 320 0 0 0 272 282 Z"/>' +
      '<circle class="ck-crys-edge" cx="500" cy="500" r="466"/>' +
      '<path class="ck-crys-lo" d="M150 700 A400 400 0 0 0 850 700"/>' +
    '</g>';
}

/* The octagon's bevel is eight flat planes, each lit by its angle to the
   key light (up and a little left): the top facet brightest, the bottom one
   in shade. Flat tones, no ramp; the planes are what make it a solid. */
function octagonPts(inset) {
  var c = 212 + inset, m = 4 + inset, M = 996 - inset;
  return [[c, m], [1000 - c, m], [M, c], [M, 1000 - c], [1000 - c, M], [c, M], [m, 1000 - c], [m, c]];
}
function facets() {
  var o = octagonPts(0), inn = octagonPts(24), s = '', i, j;
  for (i = 0; i < 8; i++) {
    j = (i + 1) % 8;
    var mx = (o[i][0] + o[j][0]) / 2 - 500, my = (o[i][1] + o[j][1]) / 2 - 500;
    var len = Math.sqrt(mx * mx + my * my);
    var lit = (-mx * 0.35 - my * 0.94) / len;          // facing up-left = 1
    var k = Math.max(0, Math.min(4, Math.round((lit + 1) * 2)));
    s += '<path class="ck-facet fc' + k + '" d="M' + o[i].join(' ') + ' L' + o[j].join(' ') +
         ' L' + inn[j].join(' ') + ' L' + inn[i].join(' ') + ' Z"/>';
  }
  return s;
}

function markup() {
  return dialDefs() + '<path class="ck-case" d="' + octagon(0) + '" fill="url(#ck-case-g)"/>' +
    facets() +
    '<path class="ck-caseline2" d="' + octagon(24) + '"/>' +
    shoulders() + spandrels() + rivets() +
    '<g transform="translate(500,500) scale(0.855) translate(-500,-500)">' +
    dial() + '</g>';
}
function markupHands() {
  return '<g transform="translate(500,500) scale(0.855) translate(-500,-500)">' +
    dialMoving() + '</g>';
}

/* ---- moon phase ----------------------------------------------------------
   Age in days since a known new moon, modulo the synodic month. Precise to
   a few hours over decades, which is well past what an 88-unit aperture can
   show. Reference new moon: 2000-01-06 18:14 UTC. */
var SYNODIC = 29.530588853;
function moonAge(d) {
  var days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

/* ---- the niche -----------------------------------------------------------
   The recess the dial is set into: a stepped deco surround on a 200x260 box,
   with the same three-step shoulder the gates use at their springing line, a
   sill under the dial and a keystone lozenge at the head. Drawn as a stretched
   overlay (preserveAspectRatio: none) so it tracks the recess at any size —
   only the shoulders and the sill carry meaning, and neither is a circle. */
function niche() {
  // Three stepped frames, each cut as four mitred facets (top lit, bottom in
  // shade), round a back of gold smalti; a lamp trough at the head washes the
  // mosaic at night; a black marble sill with a gilt nosing carries the case.
  return '<div class="n-mosaic"></div><div class="n-cove"></div>' +
    '<div class="n-step n-s1"></div><div class="n-step n-s2"></div><div class="n-step n-s3"></div>' +
    '<div class="n-sill"></div>' +
    '<svg class="n-crest" viewBox="0 0 120 40" aria-hidden="true" focusable="false">' +
      '<path class="nc-sh" transform="translate(1 1.4)" d="' + crestFan() + '"/>' +
      '<path class="nc-body" d="' + crestFan() + '"/>' +
      '<path class="nc-lt" transform="translate(-.5 -.6)" d="' + crestRays() + '"/></svg>';
}
function crestFan() {
  return 'M16 40 H104 V35 H16 Z M28 35 A32 32 0 0 1 92 35 Z';
}
function crestRays() {
  var d = '', k, a;
  for (k = 1; k < 9; k++) {
    a = Math.PI + k * Math.PI / 9;
    d += 'M60 35 L' + (60 + 30 * Math.cos(a)).toFixed(2) + ' ' + (35 + 30 * Math.sin(a)).toFixed(2) + ' ';
  }
  return d;
}

/* ---- the clock ----------------------------------------------------------- */
function build(host) {
  var wrap = document.createElement('div');
  wrap.className = 'niche';
  wrap.innerHTML = niche();

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'dial');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = markup();
  wrap.appendChild(svg);
  var hands = document.createElementNS(NS, 'svg');
  hands.setAttribute('class', 'dial-hands');
  hands.setAttribute('viewBox', '0 0 1000 1000');
  hands.setAttribute('aria-hidden', 'true');
  hands.setAttribute('focusable', 'false');
  hands.innerHTML = markupHands();
  wrap.appendChild(hands);
  host.appendChild(wrap);
  // The niche in the waxed floor: sill, frame and the dial's light, flipped
  // about the sill's foot. Static paint; the hands are not worth a
  // reflection that repaints every second.
  var mir = document.createElement('div');
  mir.className = 'ck-mirror';
  host.appendChild(mir);

  /* The dial itself is decorative art, but it is the hall's only clock — so
     the time also exists as text for assistive technology, rewritten only
     when the displayed minute actually changes. */
  var reader = document.createElement('time');
  reader.className = 'sr-only';
  host.appendChild(reader);

  var parts = {
    hs: hands.querySelector('.ck-sh-h'), ms: hands.querySelector('.ck-sh-m'),
    ss: hands.querySelector('.ck-sh-s'),
    h: hands.querySelector('.ck-h'), m: hands.querySelector('.ck-m'),
    s: hands.querySelector('.ck-ss'), gA: hands.querySelector('.ck-gA'),
    gB: hands.querySelector('.ck-gB'), date: svg.querySelector('#ck-date'),
    shade: svg.querySelector('#ck-shade'),
  };
  var lastDate = -1, lastShade = -1, lastMinute = -1;

  function paint(now, deadbeat) {
    var ms = deadbeat ? 0 : now.getMilliseconds();
    var t = now.getSeconds() + ms / 1000;
    var sec = t * 6;
    var min = now.getMinutes() * 6 + t * 0.1;
    var hr = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;

    parts.s.setAttribute('transform', 'rotate(' + sec + ' 500 705)');
    parts.m.setAttribute('transform', 'rotate(' + min + ' 500 500)');
    parts.h.setAttribute('transform', 'rotate(' + hr + ' 500 500)');
    // translate first in the list = applied last: the offset stays down the
    // key light whatever angle the hand stands at
    parts.ms.setAttribute('transform', 'translate(' + SHADOW.m + ') rotate(' + min + ' 500 500)');
    parts.hs.setAttribute('transform', 'translate(' + SHADOW.h + ') rotate(' + hr + ' 500 500)');
    parts.ss.setAttribute('transform', 'translate(' + SHADOW.s + ') rotate(' + sec + ' 500 705)');
    /* The works turn off the seconds arbor at 1:4, meshed 14:9 and opposed. */
    parts.gA.setAttribute('transform', 'rotate(' + (sec * 0.25) + ')');
    parts.gB.setAttribute('transform', 'rotate(' + (-sec * 0.25 * 14 / 9) + ')');

    var minute = now.getHours() * 60 + now.getMinutes();
    if (minute !== lastMinute) {
      lastMinute = minute;
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      reader.dateTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
      reader.textContent = now.toLocaleTimeString(
        document.documentElement.lang === 'zh' ? 'zh-CN' : 'en-GB',
        { hour: '2-digit', minute: '2-digit' });
    }

    var dom = now.getDate();
    if (dom !== lastDate) {
      lastDate = dom;
      parts.date.textContent = dom < 10 ? '0' + dom : String(dom);
    }
    /* The shade sweeps 295 -> 725 across the 12 o'clock aperture; new moon
       covers the disc, full moon parks it clear. Only rewritten when the
       rounded position actually moves — a synodic month is 2.5M seconds. */
    var phase = moonAge(now) / SYNODIC;
    var cx = Math.round(474 + Math.cos(phase * 2 * Math.PI) * 26);
    if (cx !== lastShade) { lastShade = cx; parts.shade.setAttribute('cx', cx); }
  }

  return paint;
}

/* Reading the wall clock every frame means the loop cannot drift, and a DST
   step, a suspend/resume, or a throttled background tab all self-correct on
   the next frame. Reduced motion swaps the sweep for a boundary-aligned
   deadbeat tick — the mechanism a real regulator actually has. */
function start(paint) {
  var root = document.documentElement;
  var timer = null, raf = null;

  function reduced() {
    return root.dataset.motion === 'reduced' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  function run() {
    stop();
    if (reduced()) {
      (function tick() {
        paint(new Date(), true);
        timer = setTimeout(tick, 1000 - (Date.now() % 1000));
      })();
    } else {
      (function frame() {
        paint(new Date(), false);
        raf = requestAnimationFrame(frame);
      })();
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else { run(); }
  });
  window.addEventListener('atrium:motionchange', run);
  run();
}

function init() {
  var host = document.getElementById('clock');
  if (!host) return;
  start(build(host));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else { init(); }

})();
