/* ===========================================================================
   THE ROOM: the picture palace's masthead, wall and floor.

   The gates are the portals (palace.js) and the clock is its own niche
   (clock.js); this file dresses what they stand in. The canopy fascia and
   its fittings (a crown over the clock's axis, a cast frieze panel either
   side, turned-metal medallions on the controls), the stone the wall and
   the fascia are cut from, the lights between the portals and the floor's
   answer to every lamp in the room.

   Every sibling of one kind (a slab, a pier light, a bay's panel) is one
   family but never a copy: each draws its variation off fnv1a of a stable
   name, walked in a stable order, so a reload changes nothing and a new
   bay never repaints the ones already standing.

   Nothing here takes the pointer or a tab stop; all of it is aria-hidden.
   =========================================================================== */
(function () {
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var root = document.documentElement;
var $ = function (s, c) { return (c || document).querySelector(s); };

function fnv1a(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* Draw k of the stream a name seeds: independent values in [0, 1). */
function draw(name, k) {
  var n = (fnv1a(name) ^ Math.imul((k || 0) + 1, 0x9e3779b1)) >>> 0;
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n = n ^ (n >>> 4);
  n = Math.imul(n, 0x27d4eb2d);
  n = n ^ (n >>> 15);
  return (n >>> 0) / 4294967296;
}
function pick(list, name, k) { return list[Math.floor(draw(name, k) * list.length)]; }
function f2(v) { return (+v).toFixed(2); }

function svgEl(tag, attrs, cls) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (cls) e.setAttribute('class', cls);
  return e;
}
function el(tag, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
function ui() {
  var v = parseFloat(getComputedStyle(root).getPropertyValue('--ui'));
  return isFinite(v) && v > 0 ? v : 1;
}
function ringSeg(cx, cy, r0, r1, a0, a1) {
  var big = (a1 - a0) > Math.PI ? 1 : 0;
  var p = function (r, a) { return f2(cx + Math.cos(a) * r) + ' ' + f2(cy + Math.sin(a) * r); };
  return 'M' + p(r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + p(r1, a1) +
         ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + p(r0, a0) + ' Z';
}

/* ----- Turned metal -------------------------------------------------------
   A disc spun on a lathe carries its polish in circles, so it does not take
   a light as one soft spot: it takes it as a bow tie, a bright wedge toward
   the lamp and its twin opposite, dark across. SVG has no conic gradient, so
   the ring is laid as narrow sectors, each mixed between the metal's lit and
   dark tone by how squarely it faces the key (up and to the left), with the
   lathe's own fine rings over it. The tones are the host's --tm-hi/--tm-lo,
   so the same drawing is brass on one control and nickel on another. */
var KEY = -2.36;   // the key light's bearing: up and to the left
function turned(g, cx, cy, r0, r1, n, sharp) {
  for (var i = 0; i < n; i++) {
    var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    var m = (a0 + a1) / 2;
    var f = Math.pow(Math.abs(Math.cos(m - KEY)), sharp || 2.4);
    // the half toward the lamp is a shade brighter than its twin
    f *= Math.cos(m - KEY) > 0 ? 1 : 0.62;
    var p = Math.round(6 + f * 88);
    var s = svgEl('path', { d: ringSeg(cx, cy, r0, r1, a0, a1 + 0.012) }, 'tm-sec');
    s.setAttribute('style', 'fill:color-mix(in oklab, var(--tm-hi) ' + p + '%, var(--tm-lo))');
    g.appendChild(s);
  }
  for (var r = r0 + 0.45, k = 0; r < r1 - 0.2; r += 0.62, k++) {
    g.appendChild(svgEl('circle', { cx: cx, cy: cy, r: f2(r) }, k % 2 ? 'tm-ring' : 'tm-ring tm-ring-lt'));
  }
}
/* A knurled edge: fine straight cuts round the rim, each with a lit flank
   where it faces the key. */
function knurl(g, cx, cy, r0, r1, n) {
  for (var i = 0; i < n; i++) {
    var a = i / n * Math.PI * 2;
    var lit = Math.cos(a - KEY) > 0.2;
    g.appendChild(svgEl('line', {
      x1: f2(cx + Math.cos(a) * r0), y1: f2(cy + Math.sin(a) * r0),
      x2: f2(cx + Math.cos(a) * r1), y2: f2(cy + Math.sin(a) * r1)
    }, lit ? 'kn-cut kn-lit' : 'kn-cut'));
  }
}
/* A slotted screw head, the slot turned by the hash. */
function screw(g, cx, cy, r, turn) {
  g.appendChild(svgEl('circle', { cx: f2(cx + r * 0.18), cy: f2(cy + r * 0.26), r: f2(r) }, 'sc-seat'));
  g.appendChild(svgEl('circle', { cx: f2(cx), cy: f2(cy), r: f2(r) }, 'sc-head'));
  var a = turn * Math.PI, dx = Math.cos(a) * r * 0.82, dy = Math.sin(a) * r * 0.82;
  g.appendChild(svgEl('line', { x1: f2(cx - dx), y1: f2(cy - dy), x2: f2(cx + dx), y2: f2(cy + dy) }, 'sc-slot'));
}

/* ----- The monogram: an enamelled radiator badge -------------------------
   A turned-brass bezel with a knurled rim, a gilt step, and translucent
   oxblood enamel fired over an engine-turned sunray, with the hall's A
   cast in gilt and standing proud of it under a faint glass dome. */
function monogram(svg) {
  svg.textContent = '';
  svg.setAttribute('class', 'medal-brass');
  var d = svgEl('defs');
  d.innerHTML =
    '<radialGradient id="mg-enamel" cx=".42" cy=".36" r=".72">' +
      '<stop offset="0" class="mge s0"/><stop offset=".55" class="mge s1"/><stop offset="1" class="mge s2"/></radialGradient>' +
    '<linearGradient id="mg-a" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" class="mga s0"/><stop offset=".3" class="mga s1"/><stop offset=".55" class="mga s2"/>' +
      '<stop offset=".78" class="mga s3"/><stop offset="1" class="mga s4"/></linearGradient>' +
    '<radialGradient id="mg-dome" cx=".34" cy=".26" r=".6">' +
      '<stop offset="0" class="mgd s0"/><stop offset="1" class="mgd s1"/></radialGradient>';
  svg.appendChild(d);
  svg.appendChild(svgEl('circle', { cx: 24.7, cy: 25.1, r: 23.5 }, 'md-seat'));
  var bez = svgEl('g', {}, 'md-bezel');
  turned(bez, 24, 24, 18.6, 23.5, 72, 2.2);
  knurl(bez, 24, 24, 22.1, 23.5, 60);
  svg.appendChild(bez);
  svg.appendChild(svgEl('circle', { cx: 24, cy: 24, r: 18.6 }, 'md-groove'));
  var step = svgEl('g', {}, 'md-step');
  turned(step, 24, 24, 16.6, 18.2, 48, 1.6);
  svg.appendChild(step);
  // the engine turning under the enamel: a sunray cut, sixty lines
  var gu = svgEl('g', {}, 'md-guilloche');
  gu.appendChild(svgEl('circle', { cx: 24, cy: 24, r: 16.6 }, 'md-gu-ground'));
  var rays = '';
  for (var i = 0; i < 60; i++) {
    var a = i / 60 * Math.PI * 2;
    rays += 'M' + f2(24 + Math.cos(a) * 2) + ' ' + f2(24 + Math.sin(a) * 2) +
            'L' + f2(24 + Math.cos(a) * 16.4) + ' ' + f2(24 + Math.sin(a) * 16.4);
  }
  gu.appendChild(svgEl('path', { d: rays }, 'md-gu-ray'));
  for (var r = 3; r < 16.5; r += 2.7) gu.appendChild(svgEl('circle', { cx: 24, cy: 24, r: f2(r) }, 'md-gu-ring'));
  svg.appendChild(gu);
  svg.appendChild(svgEl('circle', { cx: 24, cy: 24, r: 16.6, fill: 'url(#mg-enamel)' }, 'md-enamel'));
  // the A: a Deco capital, its bar set low, cast and standing off the enamel
  var A = 'M24 10.8 L32.7 33.6 H29.3 L27.7 29.1 H20.3 L18.7 33.6 H15.3 Z M24 17.6 L21.3 26.5 H26.7 Z';
  svg.appendChild(svgEl('path', { d: A, transform: 'translate(0.7 1)' }, 'md-a-sh'));
  svg.appendChild(svgEl('path', { d: A, transform: 'translate(0 -0.35)' }, 'md-a-lit'));
  svg.appendChild(svgEl('path', { d: A, fill: 'url(#mg-a)' }, 'md-a'));
  svg.appendChild(svgEl('path', { d: 'M13.2 36.5 H34.8', transform: 'translate(0 0)' }, 'md-a-rule'));
  svg.appendChild(svgEl('circle', { cx: 24, cy: 24, r: 16.6, fill: 'url(#mg-dome)' }, 'md-dome'));
  svg.appendChild(svgEl('path', { d: 'M13.3 16.2 A12.4 12.4 0 0 1 22.6 9.2' }, 'md-glint'));
}

/* ----- The Preferences key: a nickel escutcheon -------------------------
   The same turned bezel in nickel silver, and in its field a stepped
   escutcheon with the keyhole cut through it. The plate is what turns
   when the pointer finds it (the key going in); the bezel stays put, as a
   turned rim's highlight does. */
function prefsKey(svg) {
  svg.textContent = '';
  var d = svgEl('defs');
  d.innerHTML =
    '<linearGradient id="pk-plate" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" class="pkp s0"/><stop offset=".45" class="pkp s1"/><stop offset="1" class="pkp s2"/></linearGradient>';
  svg.appendChild(d);
  svg.appendChild(svgEl('circle', { cx: 24.7, cy: 25.1, r: 23.5 }, 'md-seat'));
  var bez = svgEl('g', {}, 'md-bezel');
  turned(bez, 24, 24, 17.8, 23.5, 72, 2.2);
  knurl(bez, 24, 24, 22.1, 23.5, 60);
  svg.appendChild(bez);
  svg.appendChild(svgEl('circle', { cx: 24, cy: 24, r: 17.8 }, 'md-groove'));
  var field = svgEl('g', {}, 'pk-field');
  turned(field, 24, 24, 0.6, 17.3, 64, 3.2);
  svg.appendChild(field);
  var turn = svgEl('g', {}, 'pk-turn');
  // a stepped escutcheon: a tall lozenge with its points cut square
  var E = 'M24 7.8 L28.2 12 V17.4 L31.2 20.4 V27.6 L28.2 30.6 V36 L24 40.2 L19.8 36 V30.6 L16.8 27.6 V20.4 L19.8 17.4 V12 Z';
  turn.appendChild(svgEl('path', { d: E, transform: 'translate(0.6 0.9)' }, 'pk-sh'));
  turn.appendChild(svgEl('path', { d: E, fill: 'url(#pk-plate)' }, 'pk-plate'));
  turn.appendChild(svgEl('path', { d: E }, 'pk-edge'));
  turn.appendChild(svgEl('path', { d: 'M24 10.2 L26.6 12.8 V17.9 M21.4 17.9 V12.8 L24 10.2' }, 'pk-lit'));
  // the keyhole, cut through: a round and a tapered slot, dark inside
  var K = 'M24 19.2 a3.1 3.1 0 0 1 1.7 5.7 L27 30.4 H21 L22.3 24.9 A3.1 3.1 0 0 1 24 19.2 Z';
  turn.appendChild(svgEl('path', { d: K, transform: 'translate(0 -0.5)' }, 'pk-hole-lip'));
  turn.appendChild(svgEl('path', { d: K }, 'pk-hole'));
  [[24, 14.4], [24, 34.4]].forEach(function (p, i) { screw(turn, p[0], p[1], 1.25, draw('pkey', i)); });
  svg.appendChild(turn);
}

/* ----- The Ledger hatch: its housing's turning and fittings ------------- */
function hatch(svg) {
  var house = $('.hatch-housing', svg), kn = $('.hatch-knurl', svg), rim = $('.hatch-rim', svg);
  var lathe = $('.hatch-lathe', svg);
  if (!house || house.firstChild) return;
  turned(house, 24, 24, 18.3, 23.2, 72, 2.2);
  knurl(kn, 24, 24, 21.8, 23.2, 56);
  [0.25, 0.75, 1.25, 1.75].forEach(function (a, i) {
    var ang = a * Math.PI;
    screw(rim, 24 + Math.cos(ang) * 20.1, 24 + Math.sin(ang) * 20.1, 1.05, draw('hatch', i));
  });
  for (var r = 9; r < 16.8; r += 1.25) lathe.appendChild(svgEl('circle', { cx: 24, cy: 24, r: f2(r) }, 'hl-ring'));
  // the knob's own knurl, cut between its skirt and its cap
  var cap = $('.hatch-knob-cap', svg), kk = svgEl('g', {}, 'hatch-knob-kn');
  knurl(kk, 24, 24, 3.4, 6.1, 30);
  if (cap) cap.parentNode.insertBefore(kk, cap);
}

/* ----- The crown over the clock's axis ------------------------------------
   The picture palace's answer to the Chrysler crown: three arched tiers
   telescoping up and back, each one narrower and higher than the one in
   front of it, so the silhouette steps at every shoulder. Every tier is a
   gilt archivolt pierced with triangular windows lit from inside; the
   setbacks between them are dark reveals; the top tier holds a leaded
   fanlight over a lit transom, and a stepped spire stands on it. The whole
   stands on a stepped base. It is in the wing's leaf (--lead-*), so it
   re-leafs with the lever. */
var CROWN_W = 220, CROWN_H = 112;
function crown(host) {
  var CX = CROWN_W / 2, BASE = 92;
  // [springing y, outer rx, outer ry, inner rx, inner ry, windows]
  var tiers = [
    [BASE, 101, 47, 89, 37, 17],
    [78, 74, 46, 63, 36.5, 13],
    [65, 47, 46, 37.5, 36.5, 9]
  ];
  function arc(sy, rx, ry, bottom) {
    return 'M' + f2(CX - rx) + ' ' + f2(bottom) + ' V' + f2(sy) +
           ' A' + rx + ' ' + ry + ' 0 0 1 ' + f2(CX + rx) + ' ' + f2(sy) + ' V' + f2(bottom) + ' Z';
  }
  function band(t) {
    var sy = t[0];
    return 'M' + f2(CX - t[1]) + ' ' + BASE + ' V' + f2(sy) +
           ' A' + t[1] + ' ' + t[2] + ' 0 0 1 ' + f2(CX + t[1]) + ' ' + f2(sy) + ' V' + BASE +
           ' H' + f2(CX + t[3]) + ' V' + f2(sy) +
           ' A' + t[3] + ' ' + t[4] + ' 0 0 0 ' + f2(CX - t[3]) + ' ' + f2(sy) + ' V' + BASE + ' Z';
  }
  // windows: triangles cut through a band, apex outward, a sunburst
  function windows(t) {
    var n = t[5], w = '';
    var p = function (rx, ry, a) { return f2(CX + Math.cos(a) * rx) + ' ' + f2(t[0] + Math.sin(a) * ry); };
    var irx = t[3] + (t[1] - t[3]) * 0.2, iry = t[4] + (t[2] - t[4]) * 0.2;
    var orx = t[1] - (t[1] - t[3]) * 0.3, ory = t[2] - (t[2] - t[4]) * 0.3;
    for (var k = 0; k < n; k++) {
      var a = Math.PI + (k + 0.5) / n * Math.PI, half = Math.PI / n * 0.3;
      w += 'M' + p(irx, iry, a - half) + ' L' + p(orx, ory, a) + ' L' + p(irx, iry, a + half) + ' Z ';
    }
    return w;
  }
  var s = '<defs>';
  // each band's gilt: an elliptical ramp from its glaze to its lip
  tiers.forEach(function (t, i) {
    var a = (t[3] / t[1] + t[4] / t[2]) / 2, w = 1 - a;
    s += '<radialGradient id="mc-b' + i + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" ' +
         'gradientTransform="translate(' + CX + ' ' + t[0] + ') scale(' + t[1] + ' ' + t[2] + ')">' +
      '<stop offset="' + f2(a) + '" class="mcg g0"/><stop offset="' + f2(a + w * 0.14) + '" class="mcg g1"/>' +
      '<stop offset="' + f2(a + w * 0.4) + '" class="mcg g2"/><stop offset="' + f2(a + w * 0.62) + '" class="mcg g3"/>' +
      '<stop offset="' + f2(a + w * 0.84) + '" class="mcg g4"/><stop offset="1" class="mcg g5"/></radialGradient>';
  });
  s += '<radialGradient id="mc-glass" gradientUnits="userSpaceOnUse" cx="' + CX + '" cy="' + tiers[2][0] + '" r="46">' +
       '<stop offset="0" class="mcw s0"/><stop offset=".45" class="mcw s1"/><stop offset=".8" class="mcw s2"/><stop offset="1" class="mcw s3"/></radialGradient>';
  s += '<linearGradient id="mc-course" x1="0" y1="0" x2="0" y2="1">' +
       '<stop offset="0" class="mcc s0"/><stop offset=".12" class="mcc s1"/><stop offset=".5" class="mcc s2"/><stop offset="1" class="mcc s3"/></linearGradient>';
  s += '<linearGradient id="mc-light" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="30" y2="' + BASE + '">' +
       '<stop offset="0" class="mcl s0"/><stop offset="1" class="mcl s1"/></linearGradient>';
  s += '<filter id="mc-bloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>';
  s += '</defs>';
  // the silhouette: every tier's outer arch, and the spire
  var spire = [[104, 116, 11, 18.6], [106.4, 113.6, 5.5, 11], [108.2, 111.8, 2.2, 5.5]];
  var sil = tiers.map(function (t) { return arc(t[0], t[1], t[2], BASE); }).join(' ');
  var spPath = spire.map(function (b) { return 'M' + b[0] + ' ' + b[2] + ' H' + b[1] + ' V' + b[3] + ' H' + b[0] + ' Z'; }).join(' ');
  s += '<g class="mc-shadow" transform="translate(2.2 3.2)"><path d="' + sil + '"/><path d="' + spPath + '"/></g>';
  // back to front: the top tier's glass, then each tier in front of it
  var t3 = tiers[2];
  var fan = arc(t3[0], t3[3], t3[4], t3[0]);
  var transom = 'M' + f2(CX - t3[3]) + ' ' + t3[0] + ' H' + f2(CX + t3[3]) + ' V' + BASE + ' H' + f2(CX - t3[3]) + ' Z';
  var cames = '';
  for (var c = 1; c < 8; c++) {
    var ca = Math.PI + c / 8 * Math.PI;
    cames += 'M' + f2(CX + Math.cos(ca) * 6) + ' ' + f2(t3[0] + Math.sin(ca) * 6) +
             ' L' + f2(CX + Math.cos(ca) * t3[3]) + ' ' + f2(t3[0] + Math.sin(ca) * t3[4]) + ' ';
  }
  cames += 'M' + f2(CX - 20) + ' ' + t3[0] + ' A20 19.5 0 0 1 ' + f2(CX + 20) + ' ' + t3[0] + ' ';
  // the transom's glazing: mullions and a bar, set out from the axis
  [-26, -13, 0, 13, 26].forEach(function (dx) { cames += 'M' + f2(CX + dx) + ' ' + t3[0] + ' V' + BASE + ' '; });
  cames += 'M' + f2(CX - t3[3]) + ' ' + (t3[0] + 12) + ' H' + f2(CX + t3[3]) + ' ';
  // the setbacks: each front tier's opening is a dark recess wherever the
  // tier behind it does not fill it
  s += '<path class="mc-reveal" d="' + arc(tiers[0][0], tiers[0][3] + 0.6, tiers[0][4] + 0.6, BASE) + '"/>';
  s += '<path class="mc-reveal" d="' + arc(tiers[1][0], tiers[1][3] + 0.6, tiers[1][4] + 0.6, BASE) + '"/>';
  s += '<path class="mc-glass" d="' + fan + ' ' + transom + '"/>';
  s += '<path class="mc-glass-lit lamp" d="' + fan + ' ' + transom + '"/>';
  s += '<path class="mc-came-sh" d="' + cames + '" transform="translate(0.4 0.5)"/><path class="mc-came" d="' + cames + '"/>';
  s += '<path class="mc-hub" d="M' + f2(CX - 6) + ' ' + t3[0] + ' A6 6 0 0 1 ' + f2(CX + 6) + ' ' + t3[0] + ' Z"/>';
  var winAll = '';
  for (var i = tiers.length - 1; i >= 0; i--) {
    var t = tiers[i];
    s += '<path class="mc-glaze" d="' + band(t) + '" transform="translate(0.8 1.1)"/>';
    s += '<path d="' + band(t) + '" fill="url(#mc-b' + i + ')"/>';
    var w = windows(t);
    winAll += w;
    s += '<path class="mc-win-rv" d="' + w + '" transform="translate(-0.5 -0.6)"/>';
    s += '<path class="mc-win" d="' + w + '"/>';
    // the tier's lit arris along its outer edge
    s += '<path class="mc-reed" d="M' + f2(CX - t[1] + 1.2) + ' ' + BASE + ' V' + f2(t[0]) +
         ' A' + f2(t[1] - 1.2) + ' ' + f2(t[2] - 1.2) + ' 0 0 1 ' + f2(CX + t[1] - 1.2) + ' ' + f2(t[0]) + ' V' + BASE + '"/>';
  }
  // a bead course on the front tier's lip
  var beads = '', t1 = tiers[0];
  for (var bI = 0; bI < 33; bI++) {
    var ba = Math.PI + (bI + 0.5) / 33 * Math.PI;
    beads += '<circle cx="' + f2(CX + Math.cos(ba) * (t1[1] - 2.6)) + '" cy="' + f2(t1[0] + Math.sin(ba) * (t1[2] - 2.6)) + '" r="0.95"/>';
  }
  s += '<g class="mc-bead">' + beads + '</g>';
  s += '<path class="mc-light" d="' + sil + '"/>';
  // base courses, each a slab with a lit top and a dark foot
  [[3, 217, 104, 112], [11, 209, 98, 104], [19, 201, 92, 98]].forEach(function (c) {
    s += '<rect class="mc-face" x="' + c[0] + '" y="' + c[2] + '" width="' + (c[1] - c[0]) + '" height="' + (c[3] - c[2]) + '" fill="url(#mc-course)"/>' +
         '<rect class="mc-top" x="' + c[0] + '" y="' + c[2] + '" width="' + (c[1] - c[0]) + '" height="1.1"/>' +
         '<rect class="mc-foot" x="' + c[0] + '" y="' + (c[3] - 0.9) + '" width="' + (c[1] - c[0]) + '" height="0.9"/>';
  });
  // the spire: stepped blocks, a lit slot in each, and a needle
  spire.forEach(function (b) {
    s += '<rect class="mc-face" x="' + b[0] + '" y="' + b[2] + '" width="' + (b[1] - b[0]) + '" height="' + (b[3] - b[2]) + '" fill="url(#mc-course)"/>' +
         '<rect class="mc-top" x="' + b[0] + '" y="' + b[2] + '" width="' + (b[1] - b[0]) + '" height="0.9"/>';
  });
  s += '<path class="mc-needle" d="M108.9 2.2 L110 -3.6 L111.1 2.2 Z"/><path class="mc-needle-lt" d="M108.9 2.2 L110 -3.6 L110 2.2 Z"/>';
  var slots = 'M108.6 12.6 h2.8 v4.2 h-2.8 Z M109.1 6.6 h1.8 v3.4 h-1.8 Z';
  s += '<path class="mc-win" d="' + slots + '"/>';
  // the glass's own light spilling onto the gilt round each window
  s += '<g class="mc-bloom lamp" filter="url(#mc-bloom)"><path d="' + winAll + slots + '"/><path d="' + fan + ' ' + transom + '"/></g>';
  host.innerHTML = '<div class="mc-wash lamp"></div><svg viewBox="0 -4 ' + CROWN_W + ' ' + (CROWN_H + 4) +
    '" preserveAspectRatio="xMidYMax meet">' + s + '</svg>';
}

/* ----- Book-matched stone -------------------------------------------------
   Slabs are laid out from the clock's axis: the two either side of it are
   one block opened like a book, and so is every pair outward, each pair its
   own block (its own cut of the texture and its own tone, off the hash of
   the wall's name and the pair's place). The left half of the wall is the
   right half seen in a mirror, which is how a lobby's stone is set. Only the
   texture layer is flipped; joints, tone and light are laid over it. */
function slabs(host, cls, pitch, name, axisX) {
  // Measured before the old slabs come out: read after, it restyled and
  // laid out the page again (MO-17). The slabs do not size their host.
  var W = host.clientWidth;
  var old = host.querySelectorAll('.' + cls);
  for (var i = 0; i < old.length; i++) old[i].remove();
  if (!W || !(pitch > 20)) return;
  var axis = axisX == null ? W / 2 : axisX;
  var n = Math.ceil(Math.max(axis, W - axis) / pitch) + 1;
  var frag = document.createDocumentFragment();
  for (var k = 0; k < n; k++) {
    var block = k >> 1, mir = (k & 1) === 1;
    var sx = draw(name, block * 3), sy = draw(name, block * 3 + 1), tn = draw(name, block * 3 + 2);
    [1, -1].forEach(function (side) {
      var x0 = side > 0 ? axis + k * pitch : axis - (k + 1) * pitch;
      if (x0 > W || x0 + pitch < 0) return;
      var s = el('div', cls + ((side > 0) === mir ? ' mir' : ''));
      s.style.left = f2(x0) + 'px';
      s.style.width = f2(pitch + 0.5) + 'px';
      s.style.setProperty('--sx', (-sx * 100).toFixed(1) + '%');
      s.style.setProperty('--sy', (-sy * 100).toFixed(1) + '%');
      s.style.setProperty('--tn', tn.toFixed(3));
      s.appendChild(el('div', 'sl-tex'));
      s.appendChild(el('div', 'sl-tone'));
      frag.appendChild(s);
    });
  }
  host.insertBefore(frag, host.firstChild);
}

function buildFascia() {
  var m = $('#masthead');
  if (!m) return;
  var f = $('.m-fascia', m);
  if (!f) {
    f = el('div', 'm-fascia');
    f.setAttribute('aria-hidden', 'true');
    f.appendChild(el('div', 'mf-light'));
    f.appendChild(el('div', 'mf-crest'));
    f.appendChild(el('div', 'mf-foot'));
    m.insertBefore(f, m.firstChild);
  }
  var w = f.clientWidth;
  if (f.dataset.w === String(w) + '|' + ui()) return;
  f.dataset.w = String(w) + '|' + ui();
  slabs(f, 'm-slab', 330 * ui(), 'fascia');
}

/* ----- The canopy's layout ------------------------------------------------
   The crown stands on the clock's axis; each frieze panel takes the stretch
   of fascia between its neighbours, less a margin, and is not hung at all
   when the stretch is too short to read as a panel rather than a tab. The
   fascia also runs down behind the marquee to the cornice, so the board is
   set into the building rather than floating in front of the page. */
function fitMasthead() {
  var m = $('#masthead');
  if (!m) return;
  var mr = m.getBoundingClientRect();
  if (!mr.width) return;
  var u = ui();
  buildFascia();
  var con = $('#concourse');
  if (con) m.style.setProperty('--mast-drop', Math.max(0, con.getBoundingClientRect().top - mr.bottom) + 'px');
  var cr = $('.m-crown', m), fl = $('.m-frieze-l', m), fr = $('.m-frieze-r', m);
  var title = $('.m-title', m), right = $('.m-right', m), date = $('#dateline');
  if (!cr || !title || !right) return;
  var tr = title.getBoundingClientRect();
  var rr = (date && date.offsetWidth ? date : right).getBoundingClientRect();
  var axis = mr.width / 2;
  var gap = 26 * u, min = 110 * u;
  var tRight = tr.right - mr.left, rLeft = rr.left - mr.left;
  // The crown is cast smaller, down to four fifths, before it gives up its
  // place: a tight masthead (1366 with the large engraving) keeps it.
  var room = 2 * Math.min(axis - tRight, rLeft - axis) - 2 * gap * 0.6;
  var kH = Math.min(1, room / (168 * u));
  // It must also stand under the fascia's crest moulding, and on screen:
  // sized from the width alone, its spire ran up through the moulding and
  // off the top of the page at every size (VD-5). Its foot is 1u above the
  // masthead's, and the spire's needle is the top of its box.
  var crest = $('.mf-crest', m);
  var ceiling = Math.max(0, crest ? crest.getBoundingClientRect().bottom : mr.top) + 3 * u;
  var kV = ((mr.bottom - u) - ceiling) / (88 * u);
  var k = Math.min(kH, kV);
  var crownFits = kH >= 0.8 && kV >= 0.6;
  cr.style.setProperty('--ck', crownFits ? k.toFixed(3) : '1');
  cr.classList.toggle('stowed', !crownFits);
  var cw = crownFits ? 168 * u * k : 0;
  var lo = crownFits ? axis - cw / 2 - gap : null, ro = crownFits ? axis + cw / 2 + gap : null;
  function hang(f, x0, x1) {
    if (!f) return;
    var w = x1 - x0;
    if (!(w >= min)) { f.classList.add('stowed'); return; }
    f.classList.remove('stowed');
    f.style.left = f2(x0) + 'px';
    f.style.width = f2(w) + 'px';
  }
  if (crownFits) {
    // The panels hang as a pair, each the width of the narrower stretch, so
    // the canopy stays symmetric about the clock's axis: hung one at a time,
    // a long English title stowed the left panel and left the right one
    // hanging alone (VD-12).
    var w = Math.min(lo - (tRight + gap), (rLeft - gap) - ro);
    hang(fl, lo - w, lo);
    hang(fr, ro, ro + w);
  } else {
    hang(fl, 0, -1);
    hang(fr, 0, -1);
  }
}

function buildMasthead() {
  var mono = $('#monogram');
  if (mono) monogram(mono);
  var key = $('#prefs-btn svg');
  if (key) prefsKey(key);
  var h = $('#ledger-btn svg.hatch');
  if (h) hatch(h);
  var cr = $('#masthead .m-crown');
  if (cr) crown(cr);
  // each frieze panel is broken at its middle by a cast lozenge cartouche
  var fz = document.querySelectorAll('#masthead .m-frieze');
  for (var i = 0; i < fz.length; i++) {
    if (!fz[i].firstChild) fz[i].appendChild(el('span', 'mfz-boss'));
  }
  fitMasthead();
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { fitMasthead(); });
    ['#masthead', '#masthead .m-title', '#masthead .m-right', '#concourse'].forEach(function (sel) {
      var e = $(sel);
      if (e) ro.observe(e);
    });
  }
  window.addEventListener('resize', fitMasthead);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMasthead);
}

/* ==========================================================================
   THE BACK WALL
   ========================================================================== */

/* The arch as palace.js draws it on the 300 x 570 gate box: outer radius
   140 about (150, 162). Half the arch's outer width at a given height, in
   the wall's own pixels. */
function archHalf(gateW, gateTop, gh, y) {
  var R = gateW * 140 / 300, yc = gateTop + gh * 162 / 570;
  if (y >= yc) return R;
  var dy = yc - y;
  return dy >= R ? 0 : Math.sqrt(R * R - dy * dy);
}

var TINTS = ['amber', 'honey', 'rose', 'amber', 'smoke'];
var HEADS = [2, 3, 4];

/* One pier light: an onyx window in a gilt surround, standing in the gap
   between two portals (or between a case and its portal), flaring into a
   stepped onyx capital in the spandrel where the arches fall away, on a
   bronze trough that hides its lamp. The Paramount lit its foyer this way,
   with amber glass in its piers; this one is onyx, as the Chrysler lit its
   lobby. Everything that varies (the tint, the cut of the stone, the number
   of tiers in the capital) is the pier's own, off its name. */
function pier(p) {
  var u = p.u, name = p.name;
  var tint = pick(TINTS, name, 0);
  var tiers = pick(HEADS, name, 1);
  var ft = Math.max(2, 2.6 * u);                  // the gilt surround
  var sw = Math.max(7 * u, Math.min(p.gap * 0.34, 20 * u));
  var W = sw + 2 * ft;
  var top = p.top, bottom = p.bottom, y1 = p.headFoot;
  // the capital flares toward the cornice as far as the spandrel allows
  // tiers set back like a tower's, the lowest the tallest
  var wsum = 0, wts = [];
  for (var j = 0; j < tiers; j++) { wts.push(tiers + 1.4 - j); wsum += tiers + 1.4 - j; }
  var steps = [], acc = 0;
  for (var k = 0; k < tiers; k++) {
    var yb = y1 - (y1 - top) * (acc / wsum);
    acc += wts[k];
    var yt = y1 - (y1 - top) * (acc / wsum);
    var room = p.spandrel(yb) - 6 * u;
    var w = Math.min(sw + (k + 1) * sw * 0.62, room);
    steps.push({ yt: yt, yb: yb, w: Math.max(sw, w) });
  }
  var x = p.x;
  var minX = x - Math.max(W, steps[steps.length - 1].w + 2 * ft) / 2 - 4;
  var box = { x: minX, w: 2 * (x - minX), y: top - ft - 4, h: bottom - top + ft + 8 };
  // the silhouette: the shaft, then each tier wider than the one below
  var P = 'M' + f2(x - sw / 2) + ' ' + f2(bottom) + ' V' + f2(y1);
  steps.forEach(function (s) { P += ' H' + f2(x - s.w / 2) + ' V' + f2(s.yt); });
  steps.slice().reverse().forEach(function (s, i, arr) {
    P += ' H' + f2(x + s.w / 2) + ' V' + f2(s.yb);
  });
  P += ' H' + f2(x + sw / 2) + ' V' + f2(bottom) + ' Z';
  var id = 'pr-' + name;
  var T = 300 * u;                                // the slab: a few strata per tier
  var ox = -draw(name, 2) * T, oy = -draw(name, 3) * T;
  var s = '<defs>' +
    '<pattern id="' + id + '-o" patternUnits="userSpaceOnUse" width="' + f2(T) + '" height="' + f2(T) + '" x="' + f2(ox) + '" y="' + f2(oy) + '">' +
      '<image class="on-lit" href="/static/assets/tex/room-onyx-glow-lit.webp" width="' + f2(T) + '" height="' + f2(T) + '"/>' +
      '<image class="on-day" href="/static/assets/tex/room-onyx-glow-day.webp" width="' + f2(T) + '" height="' + f2(T) + '"/></pattern>' +
    '<linearGradient id="' + id + '-c" gradientUnits="userSpaceOnUse" x1="' + f2(x - steps[tiers - 1].w / 2) + '" y1="0" x2="' + f2(x + steps[tiers - 1].w / 2) + '" y2="0">' +
      '<stop offset="0" class="prc s0"/><stop offset=".5" class="prc s1"/><stop offset="1" class="prc s0"/></linearGradient>' +
    '<linearGradient id="' + id + '-v" gradientUnits="userSpaceOnUse" x1="0" y1="' + f2(top) + '" x2="0" y2="' + f2(bottom) + '">' +
      '<stop offset="0" class="prv s0"/><stop offset="' + f2((y1 - top) / (bottom - top)) + '" class="prv s1"/><stop offset=".62" class="prv s2"/><stop offset=".9" class="prv s1"/><stop offset="1" class="prv s3"/></linearGradient>' +
    '<linearGradient id="' + id + '-g" gradientUnits="userSpaceOnUse" x1="' + f2(minX) + '" y1="0" x2="' + f2(2 * x - minX) + '" y2="0">' +
      '<stop offset="0" class="prg s0"/><stop offset=".3" class="prg s1"/><stop offset=".5" class="prg s2"/><stop offset=".7" class="prg s3"/><stop offset="1" class="prg s4"/></linearGradient>' +
    // the lamp's bloom round the glass: a static blur of the silhouette
    '<filter id="' + id + '-b" x="-150%" y="-10%" width="400%" height="120%"><feGaussianBlur stdDeviation="' + f2(Math.max(2.5, 4.5 * u)) + '"/></filter>' +
    '</defs>';
  s += '<path class="pr-cast" d="' + P + '" transform="translate(' + f2(2.5 * u) + ' ' + f2(3.5 * u) + ')"/>';
  // At night the glass is the lamp: it blooms past its frame onto the wall.
  s += '<path class="pr-halo lamp" d="' + P + '" stroke-width="' + f2(2 * ft + 5 * u) + '" filter="url(#' + id + '-b)"/>';
  s += '<path class="pr-rim" d="' + P + '" stroke-width="' + f2(2 * ft + 2.2) + '"/>';
  s += '<path class="pr-frame" d="' + P + '" stroke="url(#' + id + '-g)" stroke-width="' + f2(2 * ft) + '"/>';
  s += '<path class="pr-onyx" d="' + P + '" fill="url(#' + id + '-o)"/>';
  s += '<path class="pr-lamp" d="' + P + '" fill="url(#' + id + '-c)"/>';
  s += '<path class="pr-fall" d="' + P + '" fill="url(#' + id + '-v)"/>';
  // the gilt's inner arris, lit by the glass it holds
  s += '<path class="pr-lip lamp" d="' + P + '" stroke-width="' + f2(ft * 1.3) + '"/>';
  s += '<path class="pr-glaze" d="' + P + '" stroke-width="' + f2(Math.max(1, 1.4 * u)) + '"/>';
  // gilt fillets between the tiers, and the collar where capital meets shaft
  var fil = '';
  steps.forEach(function (st, i) {
    var w = (i ? steps[i - 1].w : sw) + 2 * ft;
    fil += '<rect class="pr-fillet" x="' + f2(x - w / 2) + '" y="' + f2(st.yb - ft * 0.55) + '" width="' + f2(w) + '" height="' + f2(ft * 1.1) + '"/>';
    fil += '<rect class="pr-fillet-lt" x="' + f2(x - w / 2) + '" y="' + f2(st.yb - ft * 0.55) + '" width="' + f2(w) + '" height="' + f2(Math.max(0.6, ft * 0.3)) + '"/>';
  });
  // the abacus over the capital: a stepped gilt slab
  var aw = steps[tiers - 1].w + 2 * ft + 5 * u, ah = Math.max(3, 3.6 * u);
  fil += '<rect class="pr-abacus" x="' + f2(x - aw / 2) + '" y="' + f2(top - ft - ah) + '" width="' + f2(aw) + '" height="' + f2(ah) + '"/>' +
         '<rect class="pr-abacus-lt" x="' + f2(x - aw / 2) + '" y="' + f2(top - ft - ah) + '" width="' + f2(aw) + '" height="' + f2(Math.max(0.7, ah * 0.28)) + '"/>' +
         '<rect class="pr-abacus" x="' + f2(x - aw / 2 + 2.5 * u) + '" y="' + f2(top - ft - ah * 1.8) + '" width="' + f2(aw - 5 * u) + '" height="' + f2(ah * 0.8) + '"/>';
  // the trough at the foot: a bronze box with a lit lip, hiding the lamp
  var tw = W + 6 * u, th = Math.max(6, 9 * u);
  fil += '<rect class="pr-trough" x="' + f2(x - tw / 2) + '" y="' + f2(bottom - th) + '" width="' + f2(tw) + '" height="' + f2(th) + '" fill="url(#' + id + '-g)"/>' +
         '<rect class="pr-trough-lt" x="' + f2(x - tw / 2) + '" y="' + f2(bottom - th) + '" width="' + f2(tw) + '" height="' + f2(Math.max(0.8, 1.1 * u)) + '"/>' +
         '<rect class="pr-trough-sh" x="' + f2(x - tw / 2) + '" y="' + f2(bottom - 1.2 * u) + '" width="' + f2(tw) + '" height="' + f2(1.2 * u) + '"/>';
  s += fil;
  var d = el('div', 'pier');
  d.dataset.tint = tint;
  d.style.setProperty('--px', f2(x) + 'px');
  d.style.setProperty('--pw', f2(steps[tiers - 1].w) + 'px');
  d.style.setProperty('--ptop', f2(top) + 'px');
  d.style.setProperty('--pbot', f2(bottom) + 'px');
  d.style.setProperty('--phead', f2(y1) + 'px');
  var wash = el('div', 'pr-wash lamp');
  d.appendChild(wash);
  var up = el('div', 'pr-up lamp');
  d.appendChild(up);
  d.appendChild(el('div', 'pr-foot lamp'));
  var svg = svgEl('svg', { viewBox: [f2(box.x), f2(box.y), f2(box.w), f2(box.h)].join(' '), 'aria-hidden': 'true' }, 'pr-body');
  svg.style.left = f2(box.x) + 'px';
  svg.style.top = f2(box.y) + 'px';
  svg.style.width = f2(box.w) + 'px';
  svg.style.height = f2(box.h) + 'px';
  svg.innerHTML = s;
  d.appendChild(svg);
  return d;
}

/* The damask is hung in panels, one to a bay, and no two bays were cut from
   the same length: each takes its own phase of the repeat and its own dye
   lot (a shade toward garnet, wine or brown). The aisle bays, which have
   room, carry a gilt bead frame round the panel. */
var LOTS = ['oxblood', 'garnet', 'wine', 'umber', 'oxblood', 'claret'];
function bay(x0, x1, name, framed) {
  var d = el('div', 'wall-bay' + (framed ? ' framed' : ''));
  d.style.left = f2(x0) + 'px';
  d.style.width = f2(x1 - x0) + 'px';
  d.dataset.lot = pick(LOTS, name, 0);
  d.style.setProperty('--bx', (draw(name, 1) * 100).toFixed(1) + '%');
  d.style.setProperty('--by', (draw(name, 2) * 100).toFixed(1) + '%');
  d.style.setProperty('--bs', (118 + Math.floor(draw(name, 3) * 3) * 10) + 'px');
  return d;
}

function layoutWall(g) {
  var wall = $('#backwall');
  if (!wall) return;
  var u = ui();
  var H = wall.clientHeight, W = wall.clientWidth;
  if (!H || !W || !g.row) return;
  var corn = $('.wall-cornice', wall), dado = $('.wall-dado', wall);
  var cornH = corn ? corn.offsetHeight : 60 * u, dadoH = dado ? dado.offsetHeight : 90 * u;
  var r = g.row, axis = g.axis;
  // A throw of the lever re-lays the wall with the same bays: nothing here
  // moves, so nothing is rebuilt (and the floor's lamps can fade across).
  var wkey = [W, H, f2(axis), u, f2(r.half), f2(r.gateW), f2(r.spacing), r.nSide, cornH, dadoH,
              JSON.stringify(g.boards || [])].join('|');
  if (wall.dataset.roomKey === wkey) return;
  wall.dataset.roomKey = wkey;
  // The wall and its pilasters are measured once, before anything below is
  // written: each read after a write restyled and laid out the page again,
  // three times a resize (MO-17). Nothing written here moves either.
  var wr = wall.getBoundingClientRect();
  var pilR = Array.prototype.map.call(wall.querySelectorAll('.aisle-wall .pilaster'),
    function (n) { return n.getBoundingClientRect(); });
  var gh = r.gateW * 1.9, gateTop = H - gh;
  var ys = gateTop + gh * 162 / 570;               // the arches' springing line
  var crownY = gateTop + gh * 22 / 570;
  var reachEdge = r.half + r.gateW + Math.max(0, r.nSide - 1) * r.spacing;

  // Book-matched dado
  if (dado) {
    var slabHost = $('.dado-slabs', dado);
    if (!slabHost) {
      slabHost = el('div', 'dado-slabs');
      dado.insertBefore(slabHost, dado.firstChild);
      dado.appendChild(el('div', 'dado-rail'));
      dado.appendChild(el('div', 'dado-skirt'));
    }
    var key = [W, H, f2(axis), u].join('|');
    if (slabHost.dataset.key !== key) {
      slabHost.dataset.key = key;
      slabs(slabHost, 'd-slab', 172 * u, 'dado', axis);
    }
  }

  // Bays of damask
  var bays = $('.wall-bays', wall);
  if (!bays) {
    bays = el('div', 'wall-bays');
    var field = $('.wall-field', wall);
    wall.insertBefore(bays, field ? field.nextSibling : wall.firstChild);
  }
  bays.textContent = '';
  var cuts = [];
  var pierXs = [];
  for (var k = 0; k < r.nSide - 1; k++) {
    var off = r.half + r.gateW / 2 + (k + 0.5) * r.spacing;
    pierXs.push({ x: axis - off, side: 'w', rank: k, gap: r.spacing - r.gateW });
    pierXs.push({ x: axis + off, side: 'e', rank: k, gap: r.spacing - r.gateW });
  }
  (g.boards || []).forEach(function (b, i) {
    if (!b) return;
    var inner = i === 0 ? b[1] : b[0];
    var edge = i === 0 ? axis - reachEdge : axis + reachEdge;
    var gap = Math.abs(edge - inner);
    if (gap > 14 * u) pierXs.push({ x: (inner + edge) / 2, side: i === 0 ? 'w' : 'e', rank: 'case', gap: gap, board: true });
  });
  // bay boundaries: the clock's jambs, every pier, and the row's ends
  var niche = r.half - r.gateW * 0.10;
  cuts.push(axis - niche, axis + niche, axis - reachEdge - 14 * u, axis + reachEdge + 14 * u);
  pierXs.forEach(function (p) { cuts.push(p.x); });
  pilR.forEach(function (pr) { cuts.push(pr.left + pr.width / 2 - wr.left); });
  cuts.push(0, W);
  cuts = cuts.filter(function (c) { return c >= 0 && c <= W; }).sort(function (a, b) { return a - b; });
  for (var c = 0; c < cuts.length - 1; c++) {
    var a0 = cuts[c], a1 = cuts[c + 1];
    if (a1 - a0 < 4) continue;
    var mid = (a0 + a1) / 2;
    var outside = Math.abs(mid - axis) > reachEdge + 14 * u;
    // named by its place counted out from the axis, so both halves of a
    // symmetric wall are named alike only in rank, never in side
    var nm = 'bay-' + (mid < axis ? 'w' : 'e') + Math.round(Math.abs(mid - axis) / (40 * u));
    bays.appendChild(bay(a0, a1, nm, outside && a1 - a0 > 96 * u));
  }

  // Console blocks: the frieze is broken over every pier light and every
  // pilaster by a cast gilt block, so the cornice keeps the wall's bays
  // instead of running one stamp from end to end. Each block's motif is
  // its own (off its place counted out from the axis).
  if (corn) {
    var old = corn.querySelectorAll('.cn-block');
    for (var ob = 0; ob < old.length; ob++) old[ob].remove();
    var at = pierXs.map(function (p) { return { x: p.x, w: 24 * u }; });
    pilR.forEach(function (b0) {
      at.push({ x: b0.left + b0.width / 2 - wr.left, w: b0.width * 0.8 });
    });
    at.forEach(function (c) {
      if (c.x < -20 || c.x > W + 20) return;
      var nm = 'console-' + (c.x < axis ? 'w' : 'e') + Math.round(Math.abs(c.x - axis) / (20 * u));
      var blk = el('span', 'cn-block');
      blk.dataset.motif = pick(['fan', 'lozenge', 'steps'], nm, 0);
      blk.style.left = f2(c.x - c.w / 2) + 'px';
      blk.style.width = f2(c.w) + 'px';
      corn.appendChild(blk);
    });
  }

  // Pier lights
  var piers = $('.wall-piers', wall);
  if (!piers) {
    piers = el('div', 'wall-piers');
    wall.appendChild(piers);
  }
  piers.textContent = '';
  var top = cornH + 12 * u, bottom = H - dadoH + 1;
  var headFoot = Math.min(ys - 4 * u, crownY + (ys - crownY) * 0.62);
  lastPiers = [];
  pierXs.forEach(function (p) {
    var name = 'pier-' + p.side + '-' + p.rank;
    lastPiers.push({ x: wr.left + p.x, top: wr.top + top, w: Math.max(7 * u, Math.min(p.gap * 0.34, 20 * u)) + 5.2 * u });
    var spandrel;
    if (p.board) {
      spandrel = function () { return p.gap - 4 * u; };
    } else {
      spandrel = function (y) { return r.spacing - 2 * archHalf(r.gateW, gateTop, gh, y); };
    }
    piers.appendChild(pier({ x: p.x, gap: p.gap, top: top, bottom: bottom,
      headFoot: p.board ? headFoot : headFoot, spandrel: spandrel, u: u, name: name }));
  });
}

/* ==========================================================================
   THE FLOOR: every lamp in the room comes back off the wax
   ==========================================================================
   The portals and the clock carry their own reflections. Everything else
   that gives light (the torchieres, the pier lights, each lit fanlight,
   the marquee's returns) answers as a streak in the floor straight under
   it: hung from the skirting, as wide as its source, broken into ripples by
   the wax, brightest toward the viewer where its image would lie. They are
   cheap screen-space layers, not copies of anything, and all of them are
   lamps: opacity --lamp-on, so by day the floor gives back no light. */
var lastPiers = [];
function streak(host, x, w, len, kind, attrs) {
  var s = el('div', 'fl-streak st-' + kind);
  s.style.left = f2(x - w / 2) + 'px';
  s.style.width = f2(w) + 'px';
  s.style.height = f2(len) + 'px';
  for (var k in attrs || {}) s.dataset[k] = attrs[k];
  host.appendChild(s);
  return s;
}
/* A fanlight's streak is that fanlight's lamp on the floor, so it follows
   its own gate: lit while the gate stands in the hall with its line open,
   rising and falling on the gate's own beat (--slot-delay, and --fan-i in
   the entrance). Gated on the root's wing, every streak switched at once,
   up to a second ahead of the lamp it stands for (MO-3). */
function syncStreaks() {
  var host = $('#floorplane .fl-streaks');
  if (!host) return;
  var ss = host.querySelectorAll('.st-fan');
  for (var i = 0; i < ss.length; i++) {
    var s = ss[i], g = document.getElementById(s.dataset.gate);
    if (!g) continue;
    s.style.setProperty('--slot-delay', g.style.getPropertyValue('--slot-delay') || '0ms');
    s.style.setProperty('--fan-i', g.style.getPropertyValue('--fan-i') || '0');
    if (s.dataset.state !== (g.dataset.state || '')) s.dataset.state = g.dataset.state || '';
    s.classList.toggle('on', g.classList.contains('active'));
  }
}
function layoutFloor() {
  var fp = $('#floorplane');
  if (!fp) return;
  var host = $('.fl-streaks', fp);
  if (!host) {
    host = el('div', 'fl-streaks');
    host.setAttribute('aria-hidden', 'true');
    var plane = $('.fl-plane', fp);
    fp.insertBefore(host, plane ? plane.nextSibling : null);
    var gates = $('#gates');
    if (gates && window.MutationObserver) {
      // a gate's state, its place in the lit wing (class) and its beat
      // (style); anything inside a gate is not the streak's business
      new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) {
          if (ms[i].target.classList && ms[i].target.classList.contains('gate')) { syncStreaks(); return; }
        }
      }).observe(gates, { subtree: true, attributes: true, attributeFilter: ['data-state', 'class', 'style'] });
    }
  }
  var fr = fp.getBoundingClientRect();
  var H = fr.height, u = ui();
  if (!H) return;
  var tk0 = $('#ticker'), tr0 = tk0 ? tk0.getBoundingClientRect() : { left: 0, right: 0 };
  var fkey = [f2(fr.left), f2(fr.top), f2(fr.width), f2(H), u, f2(tr0.left), f2(tr0.right),
              JSON.stringify(lastPiers), document.querySelectorAll('#backwall .sconce').length,
              document.querySelectorAll('#gates .gate').length].join('|');
  if (host.dataset.key === fkey) { syncStreaks(); return; }
  // Everything is measured before the first streak goes in. A streak
  // written between two reads made the next read restyle and lay out the
  // page again, eight times a resize (MO-17).
  var floorTop = fr.top;
  var torches = Array.prototype.map.call(
    document.querySelectorAll('#backwall .sconce .sc-body'),
    function (n) { return n.getBoundingClientRect(); });
  var stage = $('#stage'), sr = stage ? stage.getBoundingClientRect() : null;
  var fans = [];
  if (sr) {
    var gs = document.querySelectorAll('#gates .gate');
    for (var j = 0; j < gs.length; j++) {
      var a = gs[j];
      if (a.classList.contains('vacant') || !a.dataset.glass) continue;
      var sx = parseFloat(a.style.getPropertyValue('--slot-x'));
      if (isFinite(sx)) fans.push({ a: a, sx: sx, gw: a.offsetWidth });
    }
  }
  host.dataset.key = fkey;
  host.textContent = '';
  // the torchieres
  torches.forEach(function (r) {
    if (r.right < 0 || r.left > fr.width) return;
    streak(host, r.left + r.width / 2 - fr.left, r.width * 0.95, Math.min(H, (floorTop - r.top) * 0.95), 'torch');
  });
  // the pier lights
  lastPiers.forEach(function (p) {
    streak(host, p.x - fr.left, p.w * 1.5, Math.min(H, (floorTop - p.top) * 0.9), 'pier');
  });
  // each portal's fanlight, lit only while its wing stands and its lines are open
  if (sr) {
    var axis = sr.left + sr.width / 2;
    fans.forEach(function (f) {
      var a = f.a;
      streak(host, axis + f.sx - fr.left, f.gw * 0.42, Math.min(H, f.gw * 1.2), 'fan', {
        gate: a.id, wing: a.dataset.wing || '', glass: a.dataset.glass, state: a.dataset.state || ''
      });
    });
  }
  // the marquee's returns, the brightest things in the room
  if (tk0) {
    [tr0.left + 8 * u, tr0.right - 8 * u].forEach(function (x) {
      streak(host, x - fr.left, 22 * u, H, 'marquee');
    });
  }
  syncStreaks();
}

/* ==========================================================================
   THE MARQUEE'S CHASER
   ==========================================================================
   Every third bulb burns brighter and the pattern steps one bulb pitch at a
   time: the chase layer is a strip rasterised once (will-change), moved in
   whole pitches by a data attribute three times a second, never an
   animation asking for sixty frames. It runs only when the board has
   something new to announce: with nothing unread the band stands still and
   so do its bulbs, all burning evenly. Night and full motion only, and
   never in a hidden tab. */
function chaser() {
  var tk = $('#ticker'), track = $('#ticker-track');
  if (!tk || !track) return;
  var timer = null, k = 0;
  // Not behind the curtain either: the entrance's house beat chases the
  // bulbs once, and a steady chase already stepping under the curtain left
  // that sweep running over the every-third-bulb pattern.
  function wanted() {
    return !document.hidden && root.dataset.motion === 'full' && root.dataset.theme === 'onyx' &&
      root.dataset.entered === 'yes' && !!track.querySelector('.t-new');
  }
  function step() {
    k = (k + 1) % 3;
    tk.dataset.chase = String(k);
  }
  function sync() {
    if (wanted()) {
      if (!timer) { step(); timer = setInterval(step, 300); }
    } else {
      if (timer) { clearInterval(timer); timer = null; }
      if (tk.hasAttribute('data-chase')) tk.removeAttribute('data-chase');
    }
  }
  if (window.MutationObserver) {
    // the board is rebuilt whole today; a dispatch marked read in place
    // (its class dropped) must stop the chase just the same
    new MutationObserver(sync).observe(track, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion', 'data-entered'] });
  }
  document.addEventListener('visibilitychange', sync);
  sync();
}

window.Room = {
  fnv1a: fnv1a, draw: draw, pick: pick,
  buildMasthead: buildMasthead, fitMasthead: fitMasthead,
  layoutWall: layoutWall, layoutFloor: layoutFloor
};

function boot() { buildMasthead(); chaser(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
