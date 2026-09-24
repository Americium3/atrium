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

   Drive: each moving part is its own layer, turned by a compositor
   animation set in phase from `new Date()` and re-set every ten seconds,
   so it never accumulates, cannot drift, and a DST step or a machine sleep
   comes right at the next re-set. Under reduced motion the sweep is
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
  // Domed bronze rivets: a shadow cast down-right, the dome, and the one
  // lit spot on the side that faces the key light.
  return pts.map(function (p) {
    return '<circle class="ck-rivet-sh" cx="' + (p[0] + 3) + '" cy="' + (p[1] + 4) + '" r="9.5"/>' +
      '<circle class="ck-rivet" cx="' + p[0] + '" cy="' + p[1] + '" r="9"/>' +
      '<circle class="ck-rivet-lt" cx="' + (p[0] - 3) + '" cy="' + (p[1] - 3.2) + '" r="3.2"/>';
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
    '<text class="ck-subcap" x="' + cx + '" y="' + (cy + r - 20) + '" text-anchor="middle">SEC</text>';
}
/* The small seconds' baton, standing at XII about its arbor. */
function secPoints(cx, cy, r) {
  return (cx - 1.9) + ',' + cy + ' ' + (cx - 1.2) + ',' + (cy - r + 16) + ' ' +
    cx + ',' + (cy - r + 6) + ' ' + (cx + 1.2) + ',' + (cy - r + 16) + ' ' +
    (cx + 1.9) + ',' + cy + ' ' + (cx + 4) + ',' + (cy + 18) + ' ' +
    (cx - 4) + ',' + (cy + 18);
}

/* 9 — the works: two meshing wheels, geared 14:9 and turning against each
   other, so the hall's machinery is visibly driven by the clock. A wheel is
   drawn about its own arbor at (0, 0). */
function wheel(R, n, cls, id) {
  var g = '', i;
  for (i = 0; i < n; i++) {
    g += '<rect class="' + cls + '" x="-3.4" y="' + (-R - 7) +
         '" width="6.8" height="9" transform="rotate(' + (i * (360 / n)) + ')"/>';
  }
  return '<g class="' + id + '"><circle class="' + cls + '" cx="0" cy="0" r="' + R + '"/>' +
         g + '<circle class="ck-gearhole" cx="0" cy="0" r="' + (R * 0.34) + '"/></g>';
}
function worksDial(cx, cy, r) {
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
    // Cast bronze is never one flat brown: the patina lies in clouds, darker
    // where the wax has worn thin. The leaf on the bevels is laid in the
    // same 85 mm squares as the gates' archivolts.
    '<pattern id="ck-patina" patternUnits="userSpaceOnUse" width="470" height="470">' +
      '<image href="/static/assets/tex/metal-bronze.webp" width="470" height="470"/></pattern>' +
    // Metal is known by what it reflects. The waxed face gives back the one
    // bright thing above it (the cove lamp by night, the skylight by day) as
    // a soft band across its upper part, and a broad warm lift toward the
    // key light; the rest of the face stays in its patina.
    '<linearGradient id="ck-sheen-g" gradientUnits="userSpaceOnUse" x1="330" y1="0" x2="620" y2="1000">' +
      '<stop offset="0" class="cks2 s0"/><stop offset=".07" class="cks2 s1"/>' +
      '<stop offset=".13" class="cks2 s2"/><stop offset=".2" class="cks2 s3"/>' +
      '<stop offset=".62" class="cks2 s3"/><stop offset="1" class="cks2 s4"/></linearGradient>' +
    // The leaf on a bevel is burnished flat, so each facet mirrors the room:
    // brighter at the end nearer the lamp, a darker reach toward the far one.
    '<linearGradient id="ck-bev-g" gradientUnits="userSpaceOnUse" x1="80" y1="60" x2="920" y2="940">' +
      '<stop offset="0" class="ckb s0"/><stop offset=".2" class="ckb s1"/>' +
      '<stop offset=".42" class="ckb s2"/><stop offset=".58" class="ckb s3"/>' +
      '<stop offset="1" class="ckb s4"/></linearGradient>' +
    '<radialGradient id="ck-lift-g" gradientUnits="userSpaceOnUse" cx="250" cy="230" r="420">' +
      '<stop offset="0" class="ckl s0"/><stop offset="1" class="ckl s1"/></radialGradient>' +
    '<pattern id="ck-leaf" patternUnits="userSpaceOnUse" width="290" height="290">' +
      '<image href="/static/assets/tex/grain-gilt.webp" width="290" height="290"/></pattern>' +
    // The turned bezel: a lathe leaves concentric brushing, so the ring
    // takes the light in two opposed sectors, as a conic sweep would.
    '<linearGradient id="ck-turn" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" class="ckt s0"/><stop offset=".3" class="ckt s1"/>' +
      '<stop offset=".5" class="ckt s2"/><stop offset=".72" class="ckt s3"/>' +
      '<stop offset="1" class="ckt s4"/></linearGradient>' +
    '</defs>';
}

/* Hand shadows: each hand stands higher off the dial than the one below it,
   so its shadow falls further down along the key light. */
var SHADOW = { h: [5, 9], m: [8, 14], s: [11, 19] };

/* Each moving part's period in ms, and where in it the part stands at a
   given moment. The hands count from local midnight. The works turn off the
   seconds arbor at 1:4 (one turn in four minutes), meshed 14:9 and opposed;
   they count from the epoch, so they no longer jump back three and a half
   teeth at the top of every minute. The deadbeat drops the milliseconds. */
var PERIOD = { s: 60000, m: 3600000, h: 43200000, gA: 240000, gB: 240000 * 9 / 14 };
var SENSE = { gB: -1 };
function phaseAt(key, now, deadbeat) {
  var ms = deadbeat ? 0 : now.getMilliseconds();
  var t = key === 'gA' || key === 'gB' ? now.getTime() - now.getMilliseconds() + ms :
    (((now.getHours() % 12) * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1000 + ms;
  return t % PERIOD[key];
}
function angleAt(key, now, deadbeat) {
  return (phaseAt(key, now, deadbeat) / PERIOD[key] * 360 * (SENSE[key] || 1)).toFixed(3);
}

/* The dial is two sheets: everything that stands still (painted once) and
   everything that moves (hands, their shadows, the small seconds, the works
   and the crystal over them), so the sweep never repaints the guilloche,
   the chapter ring and the subdials. */
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
    secondsDial(500, 705, 88) + worksDial(295, 500, 88);
}

/* The moving sheet is a stack of thin layers, one per moving part: an HTML
   box the size of the dial, turned about the part's arbor by a transform
   animation that the compositor runs. Eight transform writes a frame on
   SVG nodes re-laid and hit-tested the whole page sixty times a second, at
   up to a quarter of a CPU core with the hall at rest (MO-9); a layer the
   compositor turns costs the page no layout, paint or script at all. */
var DS = 0.855;                                   // the dial's scale in the case
function dpct(u) { return (50 + (u - 500) * DS / 10).toFixed(4) + '%'; }
function layer(inner) {
  return '<svg class="dh-svg" viewBox="0 0 1000 1000" focusable="false">' +
    '<g transform="translate(500,500) scale(' + DS + ') translate(-500,-500)">' + inner + '</g></svg>';
}
function sheet(inner) { return '<div class="dh-sheet">' + layer(inner) + '</div>'; }
function rotor(key, cx, cy, inner, cast) {
  var r = '<div class="dh-rotor" data-r="' + key + '" style="transform-origin:' +
    dpct(cx) + ' ' + dpct(cy) + '">' + layer(inner) + '</div>';
  if (!cast) return r;
  // A shadow turns with its hand and then stands off the dial down the key
  // light, so the offset sits outside the turn, whatever the hand's angle.
  return '<div class="dh-sheet" style="transform:translate(' + (cast[0] * DS / 10).toFixed(4) + '%,' +
    (cast[1] * DS / 10).toFixed(4) + '%)">' + r + '</div>';
}
function dialMoving() {
  var sp = secPoints(500, 705, 88);
  return rotor('s', 500, 705, '<g class="ck-hsh ck-sh-s"><polygon points="' + sp + '"/></g>', SHADOW.s) +
    rotor('s', 500, 705, '<g class="ck-ss"><polygon class="ck-sec" points="' + sp + '"/>' +
      '<circle class="ck-secring" cx="500" cy="729" r="8"/></g>') +
    sheet('<circle class="ck-subboss" cx="500" cy="705" r="7"/>') +
    rotor('gA', 279, 494, '<g transform="translate(279,494)">' + wheel(30, 14, 'ck-gear', 'ck-gA') + '</g>') +
    rotor('gB', 321, 520, '<g transform="translate(321,520)">' + wheel(19, 9, 'ck-gear2', 'ck-gB') + '</g>') +
    rotor('h', 500, 500, '<g class="ck-hsh ck-sh-h">' + hand('', 288, 80, 20, 36, 228, true) + '</g>', SHADOW.h) +
    rotor('m', 500, 500, '<g class="ck-hsh ck-sh-m">' + hand('', 396, 96, 11, 24, 338, false) + '</g>', SHADOW.m) +
    rotor('h', 500, 500, hand('ck-h', 288, 80, 20, 36, 228, true)) +
    rotor('m', 500, 500, hand('ck-m', 396, 96, 11, 24, 338, false)) +
    sheet(bossAndCrystal());
}
function bossAndCrystal() {
  return '<circle class="ck-boss" cx="500" cy="500" r="31"/>' +
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
  // Statuary bronze for the case, leaf only on the eight bevels: the patina
  // clouds the flat face, the leaf lattice lies over the bevel ring alone.
  return dialDefs() + '<path class="ck-case" d="' + octagon(0) + '" fill="url(#ck-case-g)"/>' +
    '<path class="ck-patina" d="' + octagon(24) + '"/>' +
    '<path class="ck-lift" d="' + octagon(24) + '" fill="url(#ck-lift-g)"/>' +
    '<path class="ck-sheen" d="' + octagon(24) + '" fill="url(#ck-sheen-g)"/>' +
    facets() +
    '<path class="ck-bevel-leaf" fill-rule="evenodd" d="' + octagon(0) + ' ' + octagon(24) + '"/>' +
    '<path class="ck-bevel-sheen" fill-rule="evenodd" fill="url(#ck-bev-g)" d="' + octagon(0) + ' ' + octagon(24) + '"/>' +
    '<path class="ck-caseline2" d="' + octagon(24) + '"/>' +
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
  // Three stepped frames, each cut as four mitred facets (top lit, bottom in
  // shade), round a back of gold smalti; a lamp trough at the head washes the
  // mosaic at night; a black marble sill with a gilt nosing carries the case.
  return '<div class="n-mosaic"></div><div class="n-cove"></div>' +
    '<div class="n-step n-s1"></div><div class="n-step n-s2"></div><div class="n-step n-s3"></div>' +
    // Corner blocks where the frame's mitres meet: a cast bronze square with
    // a turned boss, the boss's crown the only leaf on it.
    '<i class="n-corner nc-tl"></i><i class="n-corner nc-tr"></i>' +
    '<i class="n-corner nc-bl"></i><i class="n-corner nc-br"></i>' +
    // The sill's two stone halves are its ::before and ::after; the gilt
    // fillet on the plinth line is its own element over both.
    '<div class="n-sill"><i class="n-nose"></i><i class="n-fillet"></i></div>' +
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
  // The drawing is scenery. The host itself is not hidden: the time below
  // is read from it, and inside an aria-hidden host it never was (AT-2).
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = niche();

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'dial');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = markup();
  wrap.appendChild(svg);
  var hands = document.createElement('div');
  hands.className = 'dial-hands';
  hands.innerHTML = dialMoving();
  wrap.appendChild(hands);
  host.appendChild(wrap);
  // The niche in the waxed floor: sill, frame and the dial's light, flipped
  // about the sill's foot. Static paint; the hands are not worth a
  // reflection that repaints every second.
  var mir = document.createElement('div');
  mir.className = 'ck-mirror';
  mir.setAttribute('aria-hidden', 'true');
  host.appendChild(mir);

  /* The dial itself is decorative art, but it is the hall's only clock — so
     the time also exists as text for assistive technology, rewritten only
     when the displayed minute actually changes. */
  var reader = document.createElement('time');
  reader.className = 'sr-only';
  host.appendChild(reader);

  var rotors = Array.prototype.map.call(hands.querySelectorAll('.dh-rotor'), function (el) {
    return { el: el, key: el.dataset.r, anim: null };
  });
  var parts = { date: svg.querySelector('#ck-date'), shade: svg.querySelector('#ck-shade') };
  var lastDate = -1, lastShade = '', lastMinute = -1, moonMinute = -1;

  /* Full motion: each rotor turns once a period under the compositor, set
     in phase with the wall clock. Re-set every few seconds, so a DST step,
     a suspend or a throttled tab comes right again at the next one. */
  function sweep(now) {
    rotors.forEach(function (r) {
      if (!r.el.animate) { r.el.style.transform = 'rotate(' + angleAt(r.key, now, false) + 'deg)'; return; }
      r.el.style.transform = '';
      if (!r.anim) {
        r.anim = r.el.animate([{ transform: 'rotate(0deg)' },
          { transform: 'rotate(' + 360 * (SENSE[r.key] || 1) + 'deg)' }],
          { duration: PERIOD[r.key], iterations: Infinity });
      }
      r.anim.currentTime = phaseAt(r.key, now, false);
    });
  }
  /* Reduced motion: the deadbeat. Each rotor is set once a second, at the
     second, and stands still between. */
  function tick(now) {
    rotors.forEach(function (r) {
      if (r.anim) { r.anim.cancel(); r.anim = null; }
      r.el.style.transform = 'rotate(' + angleAt(r.key, now, true) + 'deg)';
    });
  }

  /* What changes by the minute or the day: the spoken time, the date and
     the moon. Each is written only when it changes. */
  function slow(now) {
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
    var epochMin = Math.floor(now.getTime() / 60000);
    if (epochMin !== moonMinute) {
      moonMinute = epochMin;
      var m = moonAt(now);
      var d = moonDarkPath(Math.round(m.lit * 200) / 200, m.waxing,
        +parts.shade.dataset.cx, +parts.shade.dataset.cy, 26.4);
      if (d !== lastShade) { lastShade = d; parts.shade.setAttribute('d', d); }
    }
  }

  return { sweep: sweep, tick: tick, slow: slow };
}

/* The sweep is set from the wall clock, never accumulated, so it cannot
   drift, and a DST step, a suspend/resume or a throttled background tab all
   come right at the next re-set, every ten seconds on the boundary. Reduced
   motion swaps the sweep for a boundary-aligned deadbeat tick, the
   mechanism a real regulator actually has. */
var RESYNC_MS = 10000;
function start(clock) {
  var root = document.documentElement;
  var timer = null;

  // data-motion is resolved from the reader's choice and the OS setting in
  // one place (the pre-paint script, then resolveMotion in app.js). Reading
  // the media query here as well overrode a reader who chose FULL.
  function reduced() {
    return root.dataset.motion === 'reduced';
  }

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function run() {
    stop();
    var deadbeat = reduced(), step = deadbeat ? 1000 : RESYNC_MS;
    (function beat() {
      var now = new Date();
      if (deadbeat) clock.tick(now); else clock.sweep(now);
      clock.slow(now);
      // a hair past the boundary, so the new minute is read on the minute
      timer = setTimeout(beat, step - (Date.now() % step) + (deadbeat ? 0 : 5));
    })();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else { run(); }
  });
  // A motion flip in a hidden tab (another tab's Preferences, the OS
  // setting) only chooses the drive; visibilitychange starts it on the way
  // back. Running it here restarted the deadbeat tick in the background.
  window.addEventListener('atrium:motionchange', function () {
    if (!document.hidden) run();
  });
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
