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
   Age in days since a known new moon, modulo the synodic month. Precise to
   a few hours over decades, which is well past what an 88-unit aperture can
   show. Reference new moon: 2000-01-06 18:14 UTC. */
var SYNODIC = 29.530588853;
function moonAge(d) {
  var days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

/* ---- the clock ----------------------------------------------------------- */
function build(host) {
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = markup();
  host.appendChild(svg);

  var parts = {
    h: svg.querySelector('.ck-h'), m: svg.querySelector('.ck-m'),
    s: svg.querySelector('.ck-ss'), gA: svg.querySelector('.ck-gA'),
    gB: svg.querySelector('.ck-gB'), date: svg.querySelector('#ck-date'),
    shade: svg.querySelector('#ck-shade'),
  };
  var lastDate = -1, lastShade = -1;

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
