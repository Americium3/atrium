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
    s += '<rect class="ck-knurl" x="497.6" y="8" width="4.8" height="21"' +
         ' transform="rotate(' + (i * 2.727) + ' 500 500)"/>';
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
  return '<circle class="ck-subring" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
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
    '<path class="ck-moonshade" id="ck-shade" data-cx="' + (cx - 4) + '" data-cy="' + (cy - 2) + '" d=""/>' +
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
function secondsDial(cx, cy, r) {
  var t = '', i, h;
  for (i = 0; i < 60; i++) {
    h = i % 5 === 0;
    t += '<rect class="' + (h ? 'ck-baton' : 'ck-minute') + '" x="' +
         (cx - (h ? 4 : 2) / 2) + '" y="' + (cy - r + 9) +
         '" width="' + (h ? 4 : 2) + '" height="' + (h ? 15 : 8) +
         '" transform="rotate(' + (i * 6) + ' ' + cx + ' ' + cy + ')"/>';
  }
  return subframe(cx, cy, r) + t +
    '<g class="ck-ss">' +
    '<polygon class="ck-sec" points="' +
      (cx - 1.9) + ',' + cy + ' ' + (cx - 1.2) + ',' + (cy - r + 16) + ' ' +
      cx + ',' + (cy - r + 6) + ' ' + (cx + 1.2) + ',' + (cy - r + 16) + ' ' +
      (cx + 1.9) + ',' + cy + ' ' + (cx + 4) + ',' + (cy + 18) + ' ' +
      (cx - 4) + ',' + (cy + 18) + '"/>' +
    '<circle class="ck-secring" cx="' + cx + '" cy="' + (cy + 24) + '" r="8"/></g>' +
    '<circle class="ck-subboss" cx="' + cx + '" cy="' + cy + '" r="7"/>' +
    '<text class="ck-subcap" x="' + cx + '" y="' + (cy + r - 20) + '" text-anchor="middle">SEC</text>';
}

/* 9 — the works: two meshing wheels, geared 14:9 and turning against each
   other, so the hall's machinery is visibly driven by the clock. */
function worksDial(cx, cy, r) {
  function wheel(R, n, cls, id) {
    var g = '', i;
    for (i = 0; i < n; i++) {
      g += '<rect class="' + cls + '" x="-3.4" y="' + (-R - 7) +
           '" width="6.8" height="9" transform="rotate(' + (i * (360 / n)) + ')"/>';
    }
    return '<g class="' + id + '"><circle class="' + cls + '" cx="0" cy="0" r="' + R + '"/>' +
           g + '<circle class="ck-gearhole" cx="0" cy="0" r="' + (R * 0.34) + '"/></g>';
  }
  return subframe(cx, cy, r) +
    '<circle class="ck-gearwell" cx="' + cx + '" cy="' + cy + '" r="' + (r - 12) + '"/>' +
    '<g transform="translate(' + (cx - 16) + ',' + (cy - 6) + ')">' + wheel(30, 14, 'ck-gear', 'ck-gA') + '</g>' +
    '<g transform="translate(' + (cx + 26) + ',' + (cy + 20) + ')">' + wheel(19, 9, 'ck-gear2', 'ck-gB') + '</g>' +
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

function dial() {
  return '<circle class="ck-case2" cx="500" cy="500" r="499"/>' + knurl() +
    '<circle class="ck-caseline" cx="500" cy="500" r="472"/>' +
    '<circle class="ck-well" cx="500" cy="500" r="468"/>' + fret() +
    '<circle class="ck-hair2" cx="500" cy="500" r="444"/>' + guilloche() +
    '<circle class="ck-hair2" cx="500" cy="500" r="408"/>' +
    '<circle class="ck-goldrule" cx="500" cy="500" r="400"/>' +
    chapter() + numerals() +
    moonDial(500, 295, 88) + dateDial(705, 500, 88) +
    secondsDial(500, 705, 88) + worksDial(295, 500, 88) +
    hand('ck-h', 288, 80, 20, 36, 228, true) +
    hand('ck-m', 396, 96, 11, 24, 338, false) +
    '<circle class="ck-boss" cx="500" cy="500" r="31"/>' +
    '<circle class="ck-bosshair" cx="500" cy="500" r="20"/>';
}

function markup() {
  return '<path class="ck-case" d="' + octagon(0) + '"/>' +
    '<path class="ck-caseline2" d="' + octagon(16) + '"/>' +
    shoulders() + spandrels() + rivets() +
    '<g transform="translate(500,500) scale(0.855) translate(-500,-500)">' +
    dial() + '</g>';
}

/* ---- moon phase ----------------------------------------------------------
   The true moon, not the mean one. A mean synodic month from a reference new
   moon drifts by up to 17 hours in age and 9 points of illumination, which
   the Almanac prints to 0.1 d and a percent. This finds the actual new moons
   either side of `d` (Meeus, Astronomical Algorithms, ch. 49, periodic terms
   for the new moon) and the illuminated fraction from the moon's phase
   angle (ch. 48, low-precision form): minutes and a fraction of a percent.
   Shared with the Almanac through window.AtriumMoon so the clock's aperture
   and the east board can never disagree. */
var RAD = Math.PI / 180;
function jdOf(d) { return d.getTime() / 86400000 + 2440587.5; }
function newMoonJde(k) {
  var T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 -
            0.00000015 * T3 + 0.00000000073 * T4;
  var E = 1 - 0.002516 * T - 0.0000074 * T2;
  var M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
  var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 -
            0.000000058 * T4) * RAD;
  var F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 +
           0.000000011 * T4) * RAD;
  var O = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;
  var sin = Math.sin;
  return jde - 0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) +
    0.01039 * sin(2 * F) + 0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) +
    0.00208 * E * E * sin(2 * M) - 0.00111 * sin(Mp - 2 * F) -
    0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M) -
    0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) +
    0.00038 * E * sin(M - 2 * F) - 0.00024 * E * sin(2 * Mp - M) -
    0.00017 * sin(O) - 0.00007 * sin(Mp + 2 * M) + 0.00004 * sin(2 * Mp - 2 * F) +
    0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F) +
    0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) +
    0.00003 * sin(Mp - M + 2 * F) - 0.00002 * sin(Mp - M - 2 * F) -
    0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
}
function moonAt(d) {
  var jd = jdOf(d);
  // JDE is dynamical time; the ~70 s offset from UT is far under 0.1 d.
  var k = Math.floor((jd - 2451550.09766) / 29.530588861);
  while (newMoonJde(k) > jd) k--;
  while (newMoonJde(k + 1) <= jd) k++;
  var prev = newMoonJde(k), next = newMoonJde(k + 1);
  var T = (jd - 2451545) / 36525;
  var D = (297.8501921 + 445267.1114034 * T) * RAD;
  var Ms = (357.5291092 + 35999.0502909 * T) * RAD;
  var Mm = (134.9633964 + 477198.8675055 * T) * RAD;
  var i = 180 - D / RAD - 6.289 * Math.sin(Mm) + 2.1 * Math.sin(Ms) -
          1.274 * Math.sin(2 * D - Mm) - 0.658 * Math.sin(2 * D) -
          0.214 * Math.sin(2 * Mm) - 0.11 * Math.sin(D);
  var lit = (1 + Math.cos(i * RAD)) / 2;
  var age = jd - prev, length = next - prev;
  return { age: age, length: length, fraction: age / length,
           lit: lit, waxing: age < length / 2 };
}
/* The dark part of a disc of radius r at (cx, cy): the limb on the dark side
   and the terminator, an ellipse of vertical radius r and horizontal radius
   |1 - 2 lit| r. Waxing is lit on the right, as the moon stands from the
   northern hemisphere. At new moon it is the whole disc, at full moon none. */
function moonDarkPath(lit, waxing, cx, cy, r) {
  var rx = Math.abs(1 - 2 * lit) * r;
  var top = cx + ' ' + (cy - r), bottom = cx + ' ' + (cy + r);
  var limb = waxing ? 0 : 1;                      // sweep of the dark-side limb
  var bulge = (lit < 0.5) === waxing ? 0 : 1;     // terminator bows into the lit side when lit < half
  return 'M ' + top + ' A ' + r + ' ' + r + ' 0 0 ' + limb + ' ' + bottom +
         ' A ' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + bulge + ' ' + top + ' Z';
}
window.AtriumMoon = { at: moonAt, darkPath: moonDarkPath };

/* ---- the niche -----------------------------------------------------------
   The recess the dial is set into: a stepped deco surround on a 200x260 box,
   with the same three-step shoulder the gates use at their springing line, a
   sill under the dial and a keystone lozenge at the head. Drawn as a stretched
   overlay (preserveAspectRatio: none) so it tracks the recess at any size —
   only the shoulders and the sill carry meaning, and neither is a circle. */
function niche() {
  return '<svg class="n-frame" viewBox="0 0 200 260" preserveAspectRatio="none"' +
    ' aria-hidden="true" focusable="false">' +
    // outer reveal + inner hairline
    '<rect x="0.75" y="0.75" width="198.5" height="258.5" stroke-width="1.5"/>' +
    '<rect x="7" y="7" width="186" height="246" stroke-width="1"/>' +
    // three-step shoulders, the gates' language, at both heads
    '<path d="M0.75 26 h7 v-7 h7 v-7 h7 M199.25 26 h-7 v-7 h-7 v-7 h-7" stroke-width="1"/>' +
    // sill: a single rule with the plinth diamond, echoing a gate's foot
    '<path class="nf-metal" d="M12 236 H188" stroke-width="1"/>' +
    '<rect class="nf-metal" x="95" y="231" width="10" height="10"' +
    ' transform="rotate(45 100 236)" stroke-width="1"/>' +
    // head keystone
    '<path class="nf-metal" d="M84 13 L100 4 L116 13" stroke-width="1.5"/>' +
    '</svg>';
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
  host.appendChild(wrap);

  /* The dial itself is decorative art, but it is the hall's only clock — so
     the time also exists as text for assistive technology, rewritten only
     when the displayed minute actually changes. */
  var reader = document.createElement('time');
  reader.className = 'sr-only';
  host.appendChild(reader);

  var parts = {
    h: svg.querySelector('.ck-h'), m: svg.querySelector('.ck-m'),
    s: svg.querySelector('.ck-ss'), gA: svg.querySelector('.ck-gA'),
    gB: svg.querySelector('.ck-gB'), date: svg.querySelector('#ck-date'),
    shade: svg.querySelector('#ck-shade'),
  };
  var lastDate = -1, lastShade = '', lastMinute = -1, moonMinute = -1;

  function paint(now, deadbeat) {
    var ms = deadbeat ? 0 : now.getMilliseconds();
    var t = now.getSeconds() + ms / 1000;
    var sec = t * 6;
    var min = now.getMinutes() * 6 + t * 0.1;
    var hr = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;

    parts.s.setAttribute('transform', 'rotate(' + sec + ' 500 705)');
    parts.m.setAttribute('transform', 'rotate(' + min + ' 500 500)');
    parts.h.setAttribute('transform', 'rotate(' + hr + ' 500 500)');
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
    /* The shade is the dark part of the disc, drawn as a path from the
       true phase: new moon covers it all, a waning moon is lit on the left.
       (It was a circle slid across the disc, which drew every waning phase
       as its waxing twin and left a crescent lit at new moon.) Computed once
       a minute and written only when the path changes. */
    var minute = Math.floor(now.getTime() / 60000);
    if (minute !== moonMinute) {
      moonMinute = minute;
      var m = moonAt(now);
      var d = moonDarkPath(Math.round(m.lit * 200) / 200, m.waxing,
        +parts.shade.dataset.cx, +parts.shade.dataset.cy, 26.4);
      if (d !== lastShade) { lastShade = d; parts.shade.setAttribute('d', d); }
    }
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

  // data-motion is resolved from the reader's choice and the OS setting in
  // one place (the pre-paint script, then resolveMotion in app.js). Reading
  // the media query here as well overrode a reader who chose FULL.
  function reduced() {
    return root.dataset.motion === 'reduced';
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
