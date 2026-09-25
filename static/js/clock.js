/* ===========================================================================
   THE CONCOURSE CLOCK — the hall's centrepiece.

   A grande-complication regulator in a stepped octagonal deco case, drawn
   entirely from flat fills and 1 / 1.5px hairlines (DESIGN.md material law:
   no gradients, no bevels, no glows — richness comes from line density).

   Case (1000-unit square)  octagon + stepped shoulders cast under the
                            diagonal bevels + rivets at the eight vertices.
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

/* The key light's bearing, up and a little left, as a unit vector in the
   case's own units (y down). */
var KEY = [-0.35, -0.94];
function rot(p, deg) {
  var t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), x = p[0] - 500, y = p[1] - 500;
  return [500 + x * c - y * s, 500 + x * s + y * c];
}
function pts(list) {
  return list.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ');
}
/* A cast edge from a to b, on a solid whose outline runs clockwise on
   screen: a strip `w` wide laid into the solid, lit, mid or in shade by how
   squarely its outward normal faces the key. */
function arris(a, b, w, cls) {
  var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
  var nx = dy / len, ny = -dx / len;
  var lit = nx * KEY[0] + ny * KEY[1];
  var k = lit > 0.25 ? 'lt' : lit < -0.25 ? 'dk' : 'md';
  return '<polygon class="' + cls + ' ' + cls + '-' + k + '" points="' +
    pts([a, b, [b[0] - nx * w, b[1] - ny * w], [a[0] - nx * w, a[1] - ny * w]]) + '"/>';
}

/* The stepped shoulders, the gates' three steps, cast on the case face under
   each diagonal bevel: a stepped block hanging from the bevel, each tier
   narrower toward the dial. Relief is drawn along the key light: a shadow
   copy down and right, the body in its patina, and each edge lit or in
   shade by the way it faces (AR-16: they were a stepped hairline laid
   across the leaf and out over the smalti). Local frame: the diagonal points
   straight up and its bevel's inner edge lies at y = -20.
   A block standing proud of the face: its body a step lighter and warmer
   than the face (it faces the lamp, and hands rub its high points), its
   risers 4.5 units, and a soft shadow cast well down and right onto the
   face. In the face's own patina with 2.2-unit edges it read as a stepped
   wire bent on the face (AR-41). */
function shoulders() {
  var local = [[430, -19], [570, -19], [570, -3], [548, -3], [548, 13], [526, 13],
               [526, 29], [474, 29], [474, 13], [452, 13], [452, -3], [430, -3]];
  var s = '', i, k;
  for (i = 0; i < 4; i++) {
    var P = local.map(function (p) { return rot(p, i * 90 + 45); });
    var sh = P.map(function (p) { return [p[0] + 5, p[1] + 7]; });
    s += '<polygon class="ck-sho-sh" filter="url(#ck-soft)" points="' + pts(sh) + '"/>' +
         '<polygon class="ck-sho" points="' + pts(P) + '"/>' +
         '<polygon class="ck-sho-tex" points="' + pts(P) + '"/>' +
         '<polygon class="ck-sho-lit" points="' + pts(P) + '" fill="url(#ck-sho-g)"/>';
    // every edge but the one the block hangs from takes the light (the
    // outline runs clockwise)
    for (k = 1; k < P.length; k++) s += arris(P[k], P[(k + 1) % P.length], 4.5, 'ck-sho-e');
  }
  return s;
}

/* The patina keeps to the recesses, as a waxed bronze's does: a shade laid
   inside the bevel's foot and round the bezel, where the wax is never
   rubbed and the dark stays. The flat face between stays the even waxed
   brown (AR-29: dark clouds lay in the middle of the flat faces, and the
   case read as sooty cast iron). */
function recesses() {
  return '<g clip-path="url(#ck-face-clip)" class="ck-recess">' +
    '<path class="ck-rc ck-rc-a" d="' + octagon(24) + '"/>' +
    '<path class="ck-rc ck-rc-b" d="' + octagon(24) + '"/>' +
    '<path class="ck-rc ck-rc-c" d="' + octagon(24) + '"/>' +
    '<circle class="ck-rc-bz" cx="500" cy="500" r="470" fill="url(#ck-bz-g)"/></g>';
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

/* A subdial's caption: 26 units, set on a baseline 60 below the arbor,
   under the moon, the aperture and the works and inside the batons. It is
   light on the dark moon and works wells and ink on the white dials, and it
   is engraved only where the dial draws it at 10px or more (atrium.css).
   WORKS is set close to fit the well's chord. */
function subcap(cx, cy, word, well) {
  return '<text class="ck-subcap' + (well ? ' on-well' : '') + '" x="' + cx + '" y="' + (cy + 60) +
    '" text-anchor="middle"' + (word.length > 4 ? ' textLength="88" lengthAdjust="spacingAndGlyphs"' : '') +
    '>' + word + '</text>';
}

function subframe(cx, cy, r) {
  return '<circle class="ck-subsink" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#ck-sink)"/>' +
         '<circle class="ck-subring" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
         '<circle class="ck-subring2" cx="' + cx + '" cy="' + cy + '" r="' + (r - 8) + '"/>';
}

/* An arc of radius r about (cx, cy) from clock angle a0 to a1, clockwise. */
function arcD(cx, cy, r, a0, a1) {
  var p0 = pt(a0, r, cx, cy), p1 = pt(a1, r, cx, cy), sweep = ((a1 - a0) % 360 + 360) % 360;
  return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' +
    (sweep > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
}

/* 12 — moon phase, on a disc of polished sapphire. The stone is cut flat
   and polished, so it holds the one key light as a still reflection at its
   upper left; the light that enters there gathers low on the right; fine
   rutile silk runs through it in three directions at 60 degrees, as it does
   in the natural stone. By night the dial behind is lit and a little of it
   comes through the stone; by day the stone is seen by reflection alone.
   The moon and the stars are the wing's leaf, laid on the stone, so a throw
   gilds or silvers them and never touches the sapphire. The shade that
   draws the phase is cut from the same stone, so it closes seamlessly. */
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
  var R = r - 12, silk = '', i, k;
  for (k = 0; k < 3; k++) {
    for (i = -15; i <= 15; i++) {
      silk += '<line x1="' + (cx - R) + '" y1="' + (cy + i * 5) + '" x2="' + (cx + R) + '" y2="' + (cy + i * 5) +
        '" transform="rotate(' + (k * 60 + 17) + ' ' + cx + ' ' + cy + ')"/>';
    }
  }
  return subframe(cx, cy, r) +
    '<circle class="ck-moonwell" cx="' + cx + '" cy="' + cy + '" r="' + R + '"/>' +
    '<circle class="ck-sa-deep" cx="' + (cx + 34) + '" cy="' + (cy + 33) + '" r="34" fill="url(#ck-sapph-deep)"/>' +
    '<g class="ck-sa-silk" clip-path="url(#ck-sapph-clip)">' + silk + '</g>' +
    stars +
    '<circle class="ck-moondisc" cx="' + (cx - 4) + '" cy="' + (cy - 2) + '" r="26"/>' +
    '<path class="ck-moonshade" id="ck-shade" data-cx="' + (cx - 4) + '" data-cy="' + (cy - 2) + '" d=""/>' +
    '<path class="ck-sa-rim-lt" d="' + arcD(cx, cy, R - 0.8, 250, 20) + '"/>' +
    '<path class="ck-sa-rim-dk" d="' + arcD(cx, cy, R - 1, 75, 205) + '"/>' +
    '<ellipse class="ck-sa-spec" cx="' + (cx - 34) + '" cy="' + (cy - 36) + '" rx="27" ry="11"' +
      ' transform="rotate(-38 ' + (cx - 34) + ' ' + (cy - 36) + ')" fill="url(#ck-sapph-spec)"/>' +
    '<path class="ck-sa-tick" d="' + arcD(cx, cy, R - 4.5, 302, 326) + '"/>' +
    subcap(cx, cy, 'LUNA', true);
}

/* The maker's line. Twelve is taken by the moon, so the name stands where a
   complicated watch sets it then, on the axis between the moon and the
   arbor. It is cut into the dial and filled, and the far wall of each cut,
   which faces the key light, shows as a lit hair along the letters' lower
   right. */
function makerLine() {
  return '<text class="ck-maker-lt" x="504.2" y="433.9" text-anchor="middle">SAPPHIRE</text>' +
    '<text class="ck-maker" x="503.5" y="433" text-anchor="middle">SAPPHIRE</text>';
}

/* BEGIN generated dedication */
var DEDICATION = [[["M646 309Q668 308 685 296Q699 286 713 286Q741 286 777 321Q812 354 812 375Q812 386 792 403Q781 412 773 442Q745 550 719 664Q744 669 756 687Q764 698 764 710Q764 741 735 741L672 737Q614 737 539 743Q428 751 341 764Q314 768 296 778Q281 788 261 788Q234 788 195 740Q169 707 169 683Q169 657 180 657Q184 657 193 666Q215 687 231 693Q248 700 273 700Q298 700 366 694Q435 688 629 667Q658 532 673 408L676 373Q667 373 662 373Q655 373 622 375Q475 384 338 402Q304 406 291 415Q276 426 260 426Q227 426 191 376Q165 340 165 309Q165 303 169 296Q173 290 176 290Q179 290 197 305Q219 323 232 329Q248 336 268 336Q287 336 359 331Q630 310 646 309ZM742 159Q785 170 811 191Q848 220 848 250Q848 265 839 275Q830 286 815 286Q794 286 781 263Q752 210 718 175Q707 164 707 162Q707 155 719 155Q730 155 742 159ZM822 93Q864 100 902 122Q938 143 938 173Q938 190 928 201Q919 210 907 210Q883 210 870 188Q842 142 800 110Q788 101 788 98Q788 90 796 90Q808 90 822 93Z", 1000], ["M893 506Q893 522 882 535Q872 546 857 546Q842 546 794 544Q751 541 709 541Q502 541 335 556Q255 562 236 575Q225 583 209 583Q176 583 129 514Q110 487 110 460Q110 436 122 436Q126 436 135 445Q162 471 183 479Q195 483 219 483Q250 483 324 478Q524 465 678 462Q732 460 756 448Q772 440 784 440Q806 440 829 450Q893 477 893 506Z", 1000], ["M477 342Q477 292 470 276Q462 255 424 240Q412 235 412 229Q412 222 426 214Q438 207 454 207Q490 207 545 242Q585 267 585 293Q585 307 571 321Q564 328 563 345Q562 386 558 571V645Q558 658 563 658Q570 658 587 650Q689 606 758 566Q838 520 917 456Q937 440 942 440Q952 440 952 449Q952 453 944 463Q841 604 591 752Q578 760 571 773Q563 787 548 787Q525 787 498 755Q470 721 470 695Q470 688 473 678Q478 661 478 617Q478 469 477 342ZM292 388Q292 360 242 340Q229 335 229 331Q229 325 243 317Q255 310 268 310Q313 310 374 349Q404 368 404 392Q404 406 390 418Q382 425 373 452Q332 576 291 638Q208 765 89 824Q73 832 69 832Q60 832 60 822Q60 817 70 808Q153 735 211 633Q252 561 280 459Q292 414 292 388Z", 1000], ["M473 411Q571 416 654 450Q747 489 747 551Q747 575 731 591Q718 604 704 604Q672 604 649 575Q607 526 577 502Q525 460 473 445Q473 556 473 619Q473 645 477 861Q477 908 440 908Q411 908 398 885Q376 848 376 806Q376 787 381 777Q385 767 385 760Q388 723 389 536Q390 483 390 443L389 262Q389 191 385 177Q381 164 364 154Q344 142 330 138Q320 135 320 129Q320 123 333 114Q347 105 361 105Q403 105 462 132Q502 150 502 179Q502 195 485 211Q479 217 478 231Q473 278 473 411ZM668 119Q710 131 737 151Q774 180 774 211Q774 226 765 236Q755 246 741 246Q720 246 707 223Q677 170 644 135Q633 124 633 122Q633 115 645 115Q655 115 668 119ZM750 52Q792 59 830 81Q866 102 866 132Q866 149 855 160Q847 169 835 169Q811 169 798 147Q770 101 728 69Q716 60 716 57Q716 49 724 49Q736 49 750 52Z", 1000], ["M372 166Q388 166 426 162Q489 153 548 140Q561 137 593 124Q615 115 632 115Q667 115 695 131Q719 145 719 160Q719 187 699 193Q681 198 638 204Q607 208 409 231Q379 234 361 234Q333 234 313 220Q296 208 275 178Q261 159 261 135Q261 124 267 124Q270 124 278 131Q309 154 326 160Q342 166 372 166ZM287 361Q308 361 378 353Q408 349 497 340Q585 331 648 324Q665 323 683 310Q698 301 712 301Q739 301 790 348Q814 370 814 389Q814 401 793 412Q775 421 757 455Q697 568 601 675Q458 833 273 907Q257 913 251 913Q241 913 241 903Q241 901 255 889Q405 792 544 612Q625 507 669 402Q676 385 676 381Q676 378 669 378Q663 378 653 380Q541 390 367 420Q323 428 307 437Q289 447 275 447Q252 447 220 415Q181 375 181 342Q181 314 191 314Q195 314 206 324Q231 347 245 354Q261 361 287 361Z", 1000], ["M286 724Q302 724 337 704Q492 613 614 508Q744 392 849 264Q856 255 862 255Q872 255 872 264Q872 271 866 281Q776 438 658 561Q536 686 391 795Q376 806 365 819Q347 843 325 843Q299 843 264 805Q208 745 208 712Q208 674 224 674Q229 674 240 687Q275 724 286 724ZM198 260Q191 256 191 250Q191 242 201 242Q210 242 220 243Q290 251 347 283Q416 320 416 383Q416 410 398 426Q383 439 362 439Q328 439 313 402Q298 367 271 330Q234 281 198 260Z", 1000], ["M473 411Q571 416 654 450Q747 489 747 551Q747 575 731 591Q718 604 704 604Q672 604 649 575Q607 526 577 502Q525 460 473 445Q473 556 473 619Q473 645 477 861Q477 908 440 908Q411 908 398 885Q376 848 376 806Q376 787 381 777Q385 767 385 760Q388 723 389 536Q390 483 390 443L389 262Q389 191 385 177Q381 164 364 154Q344 142 330 138Q320 135 320 129Q320 123 333 114Q347 105 361 105Q403 105 462 132Q502 150 502 179Q502 195 485 211Q479 217 478 231Q473 278 473 411ZM668 119Q710 131 737 151Q774 180 774 211Q774 226 765 236Q755 246 741 246Q720 246 707 223Q677 170 644 135Q633 124 633 122Q633 115 645 115Q655 115 668 119ZM750 52Q792 59 830 81Q866 102 866 132Q866 149 855 160Q847 169 835 169Q811 169 798 147Q770 101 728 69Q716 60 716 57Q716 49 724 49Q736 49 750 52Z", 1000], ["M478 234Q515 275 515 316Q515 354 493 422Q470 498 430 566Q369 681 319 733Q281 774 236 774Q193 774 160 735Q105 674 105 553Q105 473 148 401Q196 316 283 261Q388 196 525 196Q674 196 773 274Q890 368 890 528Q890 652 798 734Q731 793 650 823Q554 857 445 861Q423 861 423 851Q423 842 442 838Q604 802 699 707Q750 654 770 599Q789 547 789 475Q789 348 701 287Q635 240 541 232Q531 232 517 232Q493 232 478 234ZM445 240Q343 254 272 320Q216 370 187 443Q170 485 170 538Q170 605 195 646Q216 679 239 679Q263 679 308 615Q396 492 442 370Q463 317 463 285Q463 253 445 240Z", 1000], ["M730 364Q757 360 768 354Q786 344 806 344Q847 344 896 373Q916 385 916 407Q916 437 885 437Q869 437 834 430Q789 422 732 421Q695 421 672 421Q664 612 605 707Q516 852 316 901Q292 906 285 906Q272 906 272 898Q272 892 278 890Q367 857 437 795Q500 740 537 669Q585 575 590 422Q512 424 404 438Q404 465 404 520Q404 575 403 603Q402 635 387 650Q376 660 363 660Q317 660 317 610Q317 594 320 535Q323 483 323 446Q285 452 254 460Q222 469 211 478Q195 491 175 491Q145 491 108 452Q77 419 77 387Q77 370 86 370Q87 370 100 378Q143 410 173 410Q205 410 242 406Q256 404 285 400Q306 397 324 395Q324 328 324 292Q324 260 314 250Q296 231 261 223Q251 220 251 215Q251 209 263 201Q277 191 304 191Q346 191 392 217Q424 234 424 254Q424 269 415 282Q410 291 407 319Q405 353 405 388Q500 377 592 371Q592 295 592 262Q592 193 586 179Q580 165 561 157Q548 151 527 146Q516 144 516 138Q516 131 531 120Q545 110 567 110Q602 110 647 125Q697 141 697 172Q697 185 686 201Q679 211 677 230Q675 284 673 368Q709 366 730 364Z", 1000], ["M637 296Q434 318 331 338Q312 342 296 352Q285 359 267 359Q241 359 207 316Q174 275 174 246Q174 216 185 216Q190 216 202 228Q224 252 241 260Q257 268 279 268Q284 268 289 268Q337 266 363 264Q570 245 652 235Q683 231 697 221Q712 209 723 209Q748 208 788 238Q816 259 825 273Q833 286 833 302Q833 317 812 328Q788 339 769 376Q685 531 579 642Q438 789 249 858Q240 861 234 861Q221 861 221 850Q221 844 237 834Q406 730 520 586Q601 481 676 331Q689 307 689 297Q689 292 679 292Q666 292 637 296Z", 1000], ["M546 529Q527 629 497 690Q466 756 414 810Q366 860 310 888Q292 898 285 898Q277 898 277 890Q277 884 286 877Q340 830 373 781Q403 737 432 668Q468 583 468 500V489Q468 480 466 474Q462 461 424 458Q414 456 414 451Q414 441 429 431Q441 423 465 423Q521 423 546 435Q561 442 561 455Q561 464 558 469Q555 474 550 499Q592 466 657 389Q669 375 669 369Q669 364 659 364Q656 364 650 364Q583 369 511 377Q440 385 361 399Q333 404 313 415Q296 426 285 426Q260 426 229 392Q206 366 206 336Q206 312 215 312Q215 312 229 324Q256 350 280 350Q285 350 341 346Q380 343 506 332Q595 323 650 320Q677 317 687 312Q709 301 711 301Q734 301 768 335Q801 363 801 384Q801 404 771 407Q753 408 726 426Q652 477 546 529Z", 1000], ["M496 419Q333 584 148 682Q127 693 126 693Q114 693 114 680Q114 674 131 662Q279 551 451 355Q541 250 570 197Q586 167 586 155Q586 141 554 121Q536 110 536 107Q536 99 549 91Q562 84 578 84Q598 84 629 96Q659 107 684 124Q727 152 727 179Q727 204 693 215Q682 219 673 229Q547 365 532 382Q596 427 596 450Q596 462 592 469Q589 475 589 503V647L591 873Q591 896 578 908Q567 918 553 918Q522 918 508 897Q487 870 487 832Q487 821 492 809Q502 776 502 715L503 484Q503 440 496 419Z", 1000], ["M692 171Q728 168 739 161Q762 147 770 147Q795 147 839 186Q866 213 869 216Q882 233 882 250Q882 274 844 279Q817 282 787 304Q686 373 558 436Q534 566 496 645Q456 729 390 798Q328 863 256 899Q234 910 224 910Q216 910 216 901Q216 896 231 884Q348 782 418 616Q465 507 465 399V387Q465 374 462 365Q457 349 410 344Q397 342 397 335Q397 326 416 312Q430 302 458 302Q528 302 556 317Q575 326 575 343Q575 350 572 358Q565 369 563 399Q625 353 723 244Q730 236 730 228Q730 223 719 223Q716 223 711 224Q581 234 554 236Q453 246 367 260Q277 276 256 288Q232 302 219 302Q188 302 152 258Q123 220 123 192Q123 164 134 164Q139 164 152 176Q177 198 188 204Q201 210 217 210Q244 210 304 204Z", 1000], ["M673 483Q757 531 890 584Q921 598 937 616Q948 629 948 647Q948 663 939 679Q923 705 889 705Q867 705 817 679Q675 606 463 411Q428 379 411 379Q395 379 363 407Q292 468 243 535Q227 557 212 583Q202 600 178 600Q144 600 104 555Q68 514 68 484Q68 460 80 460Q84 460 90 466Q117 493 137 493Q150 493 161 485Q201 458 204 456Q312 375 342 356Q382 329 418 329Q446 329 472 348Q481 355 506 372Q531 389 546 400Q608 444 673 483Z", 1000]], [["M630 401Q625 527 609 613Q584 743 528 826Q482 894 402 949Q401 950 400 950Q397 950 393 946Q390 942 390 940Q390 939 390 938Q458 856 491 765Q521 682 534 557Q542 480 542 276Q542 218 536 145Q610 176 641 191Q710 158 771 105Q801 80 826 51Q926 110 926 129Q926 142 900 142Q893 142 882 141Q744 204 633 217V241Q633 298 631 378H832Q879 318 892 318Q901 318 952 360Q978 381 978 391Q978 401 965 401H829V587L831 929Q831 965 774 965Q734 965 734 935L738 679V401ZM230 714Q175 783 131 819Q92 851 31 884Q31 884 30 884Q23 884 23 875Q23 874 24 873Q99 795 144 724Q183 662 215 580H119Q94 580 58 585L47 549Q83 557 115 557H228V527Q228 494 224 448Q292 453 317 460Q339 466 339 477Q339 489 311 500V557H381Q423 506 435 506Q446 506 489 542Q512 560 512 570Q512 580 499 580H311V628Q458 656 458 732Q458 754 444 768Q433 779 416 779Q396 779 386 768Q377 758 368 732Q347 673 311 644V685L314 927Q314 966 261 966Q238 966 230 957Q223 949 223 931Q223 924 226 842Q229 768 230 714ZM228 186V120Q228 83 225 45Q348 55 348 72Q348 85 316 97V186H382Q419 135 432 135Q441 135 485 171Q507 190 507 199Q507 209 494 209H139Q115 209 79 215L68 178Q104 186 136 186ZM294 407Q322 336 334 286Q342 253 346 218Q456 250 456 270Q456 284 419 287Q373 353 320 407H384Q432 349 444 349Q454 349 502 389Q527 411 527 420Q527 430 514 430H115Q92 430 56 436L45 399Q83 407 114 407ZM244 335Q244 360 229 374Q217 387 199 387Q176 387 169 373Q163 362 157 319Q150 268 131 238Q130 237 130 236Q130 230 136 230Q137 230 138 230Q244 270 244 335Z", 1000], ["M676 639H506V678Q506 718 451 718Q412 718 412 687Q412 682 412 644Q414 525 415 359H258V860H737Q799 783 812 783Q822 783 886 836Q919 864 919 873Q919 883 907 883H258V923Q258 967 201 967Q158 967 158 931Q158 922 159 856Q163 662 164 359H134Q96 359 41 365L30 328Q86 336 135 336H164V299Q164 140 158 69Q262 82 277 86Q291 90 291 102Q291 116 258 128V336H415V266Q415 126 411 61Q494 69 514 75Q534 80 534 91Q534 104 506 115V336H676V158Q676 115 673 60Q753 67 775 74Q795 80 795 92Q795 104 766 117V336H795Q854 265 867 265Q877 265 938 315Q970 339 970 349Q970 359 957 359H766Q766 450 768 572Q769 657 769 675Q769 714 715 714Q676 714 676 681ZM506 616H676V359H506Z", 1000], ["M736 452H557Q626 527 723 571Q825 616 972 630Q975 631 975 636Q975 643 971 644Q927 654 908 705Q903 721 900 725Q896 729 889 729Q875 729 843 720Q782 699 718 655Q696 639 687 631Q678 637 664 643V688L668 925Q668 964 611 964Q586 964 577 954Q569 945 569 927L573 745Q573 656 567 589Q609 594 649 601Q590 547 531 452H479Q423 538 347 595Q405 600 422 605Q435 610 435 619Q435 631 406 643Q397 785 338 852Q271 928 98 968Q91 969 91 958Q91 956 93 955Q216 896 265 819Q308 751 308 650Q308 632 307 622Q203 687 44 723Q41 723 38 719Q35 716 35 713Q35 711 37 710Q268 615 362 452H252V464Q252 502 198 502Q158 502 158 468L161 210Q161 125 157 56Q208 77 263 107H726Q768 62 778 62Q790 62 833 95Q856 112 856 123Q856 136 828 157V207L833 459Q833 502 779 502Q736 502 736 468ZM736 429V288H537V429ZM252 429H447V288H252ZM736 265V130H537V265ZM447 130H252V265H447Z", 1000], ["M539 677Q687 708 773 769Q819 801 819 834Q819 851 808 865Q797 877 786 877Q756 877 728 855Q617 768 541 744Q542 752 542 765Q542 834 496 871Q453 904 378 904Q286 904 239 872Q189 837 189 784Q189 757 208 731Q223 710 245 698Q307 665 391 665Q435 665 459 668Q449 444 449 306V262Q449 180 438 166Q429 153 413 147Q395 142 383 140Q370 138 370 132Q370 125 381 117Q406 100 434 100Q476 100 527 140Q562 167 562 188Q562 206 549 219Q540 228 532 262Q525 292 524 323Q524 336 543 336Q566 336 603 321Q628 311 654 292Q682 271 711 271Q743 271 762 284Q778 294 778 312Q778 339 756 347Q721 361 669 374Q610 389 585 389Q546 389 522 365V391Q522 527 539 677ZM462 730Q416 720 379 720Q307 720 269 732Q225 746 225 778Q225 802 244 817Q274 841 357 841Q410 841 441 810Q456 795 459 776Q462 758 462 730Z", 1000], ["M371 510Q396 429 428 347Q454 277 483 236Q517 190 568 190Q637 190 680 261Q729 342 729 468Q729 635 660 734Q606 812 530 858Q458 903 358 928Q340 933 329 933Q316 933 316 923Q316 917 334 910Q495 848 571 728Q608 669 622 604Q634 546 634 455Q634 346 614 289Q594 231 552 231Q511 231 483 283Q454 337 422 472Q404 547 403 579Q403 584 403 586L408 646Q408 683 373 683Q351 683 333 659Q316 640 308 610Q294 564 294 476Q294 400 318 258Q326 208 326 172Q326 143 300 111Q292 101 292 98Q292 86 314 86Q326 86 343 98Q387 129 409 175Q421 199 421 218Q421 237 408 250Q399 259 391 280Q355 386 355 454Q355 499 358 512Q359 517 363 517Q369 517 371 510Z", 1000]]];
/* END generated dedication */

/* Two lines engraved on the dial's inner flange, just inside the gilt rule,
   either side of six: tops toward the arbor, reading left to right along the
   bottom of the dial, 11 units high, so from any distance they are a fine
   engraved band and close up they read. The glyphs are outlines baked from
   Yu Mincho Demibold (a 1000-unit box, baseline at 1000), so they do not
   depend on any face the page loads. */
var DED_R = 397.5, DED_SIZE = 11, DED_TRACK = 1.2, DED_GAP = 4;
function dedication() {
  var step = (DED_SIZE + DED_TRACK) / (DED_R - DED_SIZE / 2) * 180 / Math.PI;
  var ink = '', lit = '';
  function lay(line, first) {
    line.forEach(function (g, i) {
      var a = first - i * step, p = pt(a, DED_R), s = DED_SIZE / 1000;
      var tf = 'translate(' + p[0].toFixed(2) + ' ' + p[1].toFixed(2) + ') rotate(' + (a - 180).toFixed(3) +
        ') scale(' + s + ') translate(-500 -1000)';
      ink += '<path transform="' + tf + '" d="' + g[0] + '"/>';
      lit += '<path transform="translate(.3 .42) ' + tf + '" d="' + g[0] + '"/>';
    });
  }
  lay(DEDICATION[0], 180 + DED_GAP + (DEDICATION[0].length - 0.5) * step);
  lay(DEDICATION[1], 180 - DED_GAP - 0.5 * step);
  return '<g class="ck-ded-lt">' + lit + '</g><g class="ck-ded">' + ink + '</g>';
}

/* The crown stone: a star sapphire cabochon rub-over set in the wing's
   leaf at the head of the case. The stone is milky with silk, as a star
   stone is, and its six-rayed star stands where the dome gives back the one
   key light, up and to the left of the stone's centre. The star is a
   reflection of that light and does not move. */
var CAB = { x: 500, y: 37, r: 23 };
function crownStone() {
  var x = CAB.x, y = CAB.y, r = CAB.r, sx = x - 6.5, sy = y - 7.5, rays = '', defs = '', k;
  for (k = 0; k < 6; k++) {
    var a = (k * 60 + 12) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    // reach from the star's centre to the stone's edge along this ray
    var bx = sx - x, by = sy - y, b = bx * dx + by * dy, c = bx * bx + by * by - (r - 1.5) * (r - 1.5);
    var L = -b + Math.sqrt(b * b - c), tx = sx + dx * L, ty = sy + dy * L, w = 0.75;
    defs += '<linearGradient id="ck-ray' + k + '" gradientUnits="userSpaceOnUse" x1="' + sx.toFixed(2) +
      '" y1="' + sy.toFixed(2) + '" x2="' + tx.toFixed(2) + '" y2="' + ty.toFixed(2) + '">' +
      '<stop offset="0" class="ckr s0"/><stop offset=".55" class="ckr s1"/><stop offset="1" class="ckr s2"/></linearGradient>';
    rays += '<polygon fill="url(#ck-ray' + k + ')" points="' + pts([[sx - dy * w, sy + dx * w], [tx, ty], [sx + dy * w, sy - dx * w]]) + '"/>';
  }
  return '<defs>' + defs + '</defs>' +
    '<circle class="ck-cab-sh" cx="' + (x + 3.5) + '" cy="' + (y + 5) + '" r="' + (r + 5) + '" filter="url(#ck-soft)"/>' +
    '<circle class="ck-cab-bz" cx="' + x + '" cy="' + y + '" r="' + (r + 5) + '"/>' +
    '<path class="ck-cab-bz-lt" d="' + arcD(x, y, r + 3.6, 240, 30) + '"/>' +
    '<path class="ck-cab-bz-dk" d="' + arcD(x, y, r + 3.6, 70, 210) + '"/>' +
    '<circle class="ck-cab-lip" cx="' + x + '" cy="' + y + '" r="' + (r + 0.9) + '"/>' +
    '<circle class="ck-cab" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#ck-cab-g)"/>' +
    '<circle class="ck-cab-silk" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#ck-cab-silk-g)"/>' +
    '<path class="ck-cab-foot" d="' + arcD(x, y, r - 1.6, 95, 215) + '"/>' +
    '<g class="ck-cab-star">' + rays + '</g>' +
    '<circle class="ck-cab-glow" cx="' + sx + '" cy="' + sy + '" r="6.5" fill="url(#ck-cab-spec-g)"/>' +
    '<circle class="ck-cab-core" cx="' + sx + '" cy="' + sy + '" r="1.5"/>';
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
    // the aperture is cut for a numeral of 44 units, 10px on the smallest
    // dial the hall draws (1280x800)
    '<rect class="ck-datewin" x="' + (cx - 37) + '" y="' + (cy - 23) + '" width="74" height="46"/>' +
    '<text class="ck-datenum" id="ck-date" x="' + cx + '" y="' + (cy + 1) +
    '" text-anchor="middle" dominant-baseline="central">00</text>' +
    subcap(cx, cy, 'DATE', false);
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
    subcap(cx, cy, 'SEC', false);
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
    subcap(cx, cy, 'WORKS', true);
}

/* A hand is blued steel, ground to a ridge down its length: two flanks,
   each a plane lit by the way it faces the key light as the hand turns
   (lightHands sets their tones), and the ridge between them polished. */
function hand(cls, len, tail, w, pomme, pommeAt, twin) {
  var ty = 500 - len, ly = 500 + tail, py = 500 - pommeAt;
  var half = function (sg) {
    return pts([[500 + sg * w, 500], [500 + sg * w * 0.4, ty + 30], [500, ty], [500, ly],
      [500 + sg * w * 1.6, ly], [500 + sg * w * 1.6, ly - 16], [500 + sg * w * 0.7, ly - 26]]);
  };
  var s = '<g class="' + cls + '"><polygon class="ck-hand" points="' +
    (500 - w) + ',500 ' + (500 - w * 0.4) + ',' + (ty + 30) + ' 500,' + ty + ' ' +
    (500 + w * 0.4) + ',' + (ty + 30) + ' ' + (500 + w) + ',500 ' +
    (500 + w * 0.7) + ',' + (ly - 26) + ' ' + (500 + w * 1.6) + ',' + (ly - 16) + ' ' +
    (500 + w * 1.6) + ',' + ly + ' ' + (500 - w * 1.6) + ',' + ly + ' ' +
    (500 - w * 1.6) + ',' + (ly - 16) + ' ' + (500 - w * 0.7) + ',' + (ly - 26) + '"/>' +
    '<polygon class="ck-hf-l" points="' + half(-1) + '"/>' +
    '<polygon class="ck-hf-r" points="' + half(1) + '"/>' +
    '<path class="ck-hridge" d="M500 ' + (ty + 8) + ' V' + (py - pomme - 2) + ' M500 ' + (py + pomme + 2) + ' V' + (500 + tail * 0.5) + '"/>' +
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
    // ...and the casting and the years over it: a signed relighting tile
    // (room-case-patina, baked by materials_room.py) in plain alpha, the
    // patina's clouds and islands, the wax rubbed through, the sand-cast
    // tooth and the pits. Nothing in it runs one way: a cast face was never
    // brushed.
    '<pattern id="ck-cast" patternUnits="userSpaceOnUse" width="380" height="380">' +
      '<image href="/static/assets/tex/room-case-patina.webp" width="380" height="380"/></pattern>' +
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
    // A shoulder's face takes the lamp from up and to the left, brightest
    // on the block nearest it; the shade round the bezel is a ring just
    // outside the dial's own radius (0.855 of 499).
    '<linearGradient id="ck-sho-g" gradientUnits="userSpaceOnUse" x1="180" y1="120" x2="820" y2="900">' +
      '<stop offset="0" class="ckh s0"/><stop offset="1" class="ckh s1"/></linearGradient>' +
    '<radialGradient id="ck-bz-g" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="480">' +
      '<stop offset=".885" class="ckz s0"/><stop offset=".9" class="ckz s1"/>' +
      '<stop offset=".96" class="ckz s2"/><stop offset="1" class="ckz s3"/></radialGradient>' +
    '<clipPath id="ck-face-clip"><path d="' + octagon(24) + '"/></clipPath>' +
    '<filter id="ck-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.5"/></filter>' +
    '<pattern id="ck-leaf" patternUnits="userSpaceOnUse" width="290" height="290">' +
      '<image href="/static/assets/tex/grain-gilt.webp" width="290" height="290"/></pattern>' +
    // The turned bezel: a lathe leaves concentric brushing, so the ring
    // takes the light in two opposed sectors, as a conic sweep would.
    '<linearGradient id="ck-turn" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" class="ckt s0"/><stop offset=".3" class="ckt s1"/>' +
      '<stop offset=".5" class="ckt s2"/><stop offset=".72" class="ckt s3"/>' +
      '<stop offset="1" class="ckt s4"/></linearGradient>' +
    // The sapphire moon disc (dial units, the well at 500,295 r 76): the
    // stone's body, deepest at its rim, lightest a little up and left of
    // centre; the light it gathers low on the right; its still reflection.
    '<radialGradient id="ck-sapph" gradientUnits="userSpaceOnUse" cx="488" cy="282" r="88" fx="480" fy="274">' +
      '<stop offset="0" class="cksa s0"/><stop offset=".35" class="cksa s1"/><stop offset=".7" class="cksa s2"/>' +
      '<stop offset=".9" class="cksa s3"/><stop offset="1" class="cksa s4"/></radialGradient>' +
    '<radialGradient id="ck-sapph-deep"><stop offset="0" class="cksd s0"/><stop offset="1" class="cksd s1"/></radialGradient>' +
    '<radialGradient id="ck-sapph-spec"><stop offset="0" class="cksp s0"/><stop offset=".55" class="cksp s1"/>' +
      '<stop offset="1" class="cksp s2"/></radialGradient>' +
    '<clipPath id="ck-sapph-clip"><circle cx="500" cy="295" r="76"/></clipPath>' +
    // The crown's star sapphire (case units): a milky cornflower dome,
    // brightest where it faces the key light, deep blue at its foot.
    '<radialGradient id="ck-cab-g" gradientUnits="userSpaceOnUse" cx="496" cy="32" r="25" fx="492" fy="28">' +
      '<stop offset="0" class="ckcb s0"/><stop offset=".38" class="ckcb s1"/><stop offset=".78" class="ckcb s2"/>' +
      '<stop offset="1" class="ckcb s3"/></radialGradient>' +
    '<radialGradient id="ck-cab-silk-g" gradientUnits="userSpaceOnUse" cx="493.5" cy="29.5" r="20">' +
      '<stop offset="0" class="ckcs s0"/><stop offset="1" class="ckcs s1"/></radialGradient>' +
    '<radialGradient id="ck-cab-spec-g"><stop offset="0" class="ckcp s0"/><stop offset="1" class="ckcp s1"/></radialGradient>' +
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
    chapter() + numerals() + dedication() + makerLine() +
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
    // the works stand a little high in their well, clear of its caption
    rotor('gA', 279, 488, '<g transform="translate(279,488)">' + wheel(30, 14, 'ck-gear', 'ck-gA') + '</g>') +
    rotor('gB', 321, 514, '<g transform="translate(321,514)">' + wheel(19, 9, 'ck-gear2', 'ck-gB') + '</g>') +
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
    // The sharp one lies in the field inside the numerals: laid on the
    // chapter ring it ran straight through XI and took it to 3.7:1, and no
    // light crosses lettering.
    '<g class="ck-crystal">' +
      '<ellipse class="ck-dome" cx="400" cy="300" rx="330" ry="210" transform="rotate(-32 400 300)"/>' +
      '<path class="ck-glint" d="M' + pts([pt(295, 312)]) + ' A312 312 0 0 1 ' + pts([pt(340, 312)]) +
        ' A330 330 0 0 0 ' + pts([pt(297, 290)]) + ' Z"/>' +
      '<circle class="ck-crys-edge" cx="500" cy="500" r="466"/>' +
      '<path class="ck-crys-lo" d="M150 700 A400 400 0 0 0 850 700"/>' +
    '</g>';
}

/* The octagon's bevel is eight flat planes, each lit by its angle to the
   key light (up and a little left): the top facet brightest, the bottom one
   in shade. Flat tones, no ramp; the planes are what make it a solid. Each
   plane then takes its two arrises by the same angle (the crest where it
   leaves the face, the lip where it drops to the case side), and the leaf
   is rubbed through to the bronze along the lip, where hands have worn it
   (AR-7: the bevels were eight flat gold strips). */
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
function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
function facetEdges() {
  var o = octagonPts(0), inn = octagonPts(24), wear = '', edges = '', i, j;
  for (i = 0; i < 8; i++) {
    j = (i + 1) % 8;
    var mx = (o[i][0] + o[j][0]) / 2 - 500, my = (o[i][1] + o[j][1]) / 2 - 500;
    var lit = (mx * KEY[0] + my * KEY[1]) / Math.sqrt(mx * mx + my * my);
    var k = lit > 0.3 ? 'lt' : lit < -0.3 ? 'dk' : 'md';
    wear += '<polygon class="ck-wear" points="' + pts([o[i], o[j], lerp(o[j], inn[j], 0.4), lerp(o[i], inn[i], 0.4)]) + '"/>';
    edges += '<polygon class="ck-crest ck-crest-' + k + '" points="' +
      pts([inn[i], inn[j], lerp(inn[j], o[j], 0.14), lerp(inn[i], o[i], 0.14)]) + '"/>' +
      '<polygon class="ck-lip ck-lip-' + k + '" points="' +
      pts([o[i], o[j], lerp(o[j], inn[j], 0.09), lerp(o[i], inn[i], 0.09)]) + '"/>';
  }
  return wear + edges;
}

function markup() {
  // Statuary bronze for the case, leaf only on the eight bevels: the patina
  // clouds the flat face, the leaf lattice lies over the bevel ring alone.
  return dialDefs() + '<path class="ck-case" d="' + octagon(0) + '" fill="url(#ck-case-g)"/>' +
    '<path class="ck-patina" d="' + octagon(24) + '"/>' +
    '<path class="ck-cast" d="' + octagon(24) + '"/>' +
    '<path class="ck-lift" d="' + octagon(24) + '" fill="url(#ck-lift-g)"/>' +
    recesses() +
    '<path class="ck-sheen" d="' + octagon(24) + '" fill="url(#ck-sheen-g)"/>' +
    facets() +
    '<path class="ck-bevel-leaf" fill-rule="evenodd" d="' + octagon(0) + ' ' + octagon(24) + '"/>' +
    '<path class="ck-bevel-sheen" fill-rule="evenodd" fill="url(#ck-bev-g)" d="' + octagon(0) + ' ' + octagon(24) + '"/>' +
    facetEdges() +
    '<path class="ck-caseline2" d="' + octagon(24) + '"/>' +
    shoulders() + rivets() + crownStone() +
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

  /* The blued steel's six tones (atrium.css --bs-0 to --bs-5, shade to the
     cornflower flash), and the hour and minute hands' flanks lit from them
     by the angle each hand stands at. A flank facing up and left takes the
     flash; the one facing away goes to the deep blue. Written only when a
     tone moves a step, so a hand repaints a few times an hour. */
  var steel = (function () {
    var cs = getComputedStyle(document.documentElement), out = [], k, v, n;
    var fall = ['#070b22', '#0e1747', '#172670', '#223a9a', '#3a5dc4', '#7b9bef'];
    for (k = 0; k < 6; k++) {
      v = (cs.getPropertyValue('--bs-' + k) || '').trim();
      if (!/^#[0-9a-f]{6}$/i.test(v)) v = fall[k];
      n = parseInt(v.slice(1), 16);
      out.push([n >> 16, (n >> 8) & 255, n & 255]);
    }
    return out;
  })();
  function steelAt(t) {
    var x = Math.max(0, Math.min(1, t)) * 5, i = Math.min(4, Math.floor(x)), f = x - i, a = steel[i], b = steel[i + 1];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
      Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }
  var steelHands = rotors.filter(function (r) { return r.el.querySelector('.ck-h, .ck-m'); });
  function lightHands(now, deadbeat) {
    steelHands.forEach(function (r) {
      var a = +angleAt(r.key, now, deadbeat) * Math.PI / 180;
      var lit = -KEY[0] * Math.cos(a) - KEY[1] * Math.sin(a);   // the left flank's face to the key
      var tl = Math.round((0.36 + 0.3 * lit) * 40) / 40, tr = Math.round((0.36 - 0.3 * lit) * 40) / 40;
      if (r.lit === tl + '/' + tr) return;
      r.lit = tl + '/' + tr;
      r.el.style.setProperty('--hf-l', steelAt(tl));
      r.el.style.setProperty('--hf-r', steelAt(tr));
      r.el.style.setProperty('--hf-m', steelAt(0.3));
      r.el.style.setProperty('--hf-x', steelAt(Math.max(tl, tr) + 0.34));
    });
  }

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
    lightHands(now, false);
  }
  /* Reduced motion: the deadbeat. Each rotor is set once a second, at the
     second, and stands still between. */
  function tick(now) {
    rotors.forEach(function (r) {
      if (r.anim) { r.anim.cancel(); r.anim = null; }
      r.el.style.transform = 'rotate(' + angleAt(r.key, now, true) + 'deg)';
    });
    lightHands(now, true);
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
