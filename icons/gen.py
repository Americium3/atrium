"""The six app marks and their house curtains, from one source.

Each mark is a 1930s enamelled badge cut from one die: a plain turned gilt
lip with one groove, translucent enamel fired over an engine-turned ground,
and a stone in a collet at the crown. The die is shared; the enamel, the
turning under it and the stone are each app's own.

Inside the die each app carries one charge, seen from the same place (level
with it or a few degrees above) and lit by the one key light, up and to the
left: a globe, a dish, a shelf of bound volumes, a card held out by hand,
a gunner's quadrant, a canary in its cage. Each is drawn from the real
object's geometry and proportions, never pieced together from circles and
rectangles, and never lettered. Its form is then cut into three or four flat
planes of tone along the key light, the way a woodcut or a Deco poster cuts
it: no gradient inside a plane and no outline round it (icons/solid.py
projects the solids and traces the planes). Colour is laid in as the eye
remembers the thing. Nothing on a mark glows and nothing carries a gloss
band: the domed crystal the gate's bezel holds over it supplies the one
reflection glass is allowed.

Every mark also has a small cut (#mark-<id>-s), drawn from the same geometry
with fewer planes, no engraving, and its struts, wires and cords drawn
heavier, for the Ledger, the gate on a laptop and a future favicon.

HUE below is the one source of truth. Each entry carries the mark's enamel,
the dye of the velvet its gate hangs (per theme) and the ink its gate's day
card is printed in, so the house follows the mark in code and not by eye.
The script writes them into the hall:

    python icons/gen.py            # the hall's defs and the velvet CSS, in this repo

and nothing else unless asked. Building an app's brand directory (favicon,
PNGs, manifest) is behind an explicit flag, refuses unknown app names, and
refuses any directory outside this repository unless a second flag says so:

    python icons/gen.py --brand autopilot --out icons/_build/autopilot
    python icons/gen.py --brand autopilot --allow-outside-repo      # the app's own repo

Rasters go through icons/raster.js, which runs only under the Atrium kit's
Playwright shim (a seeded profile; a bare headless Chrome probes the Windows
password and locks the owner out). Nothing here starts chrome.exe itself.
"""
import argparse
import io
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import solid as S  # noqa: E402  (true forms: geometry and the key light)

ROOT = Path(__file__).resolve().parents[1]          # this repository
ATRIUM_INDEX = ROOT / 'static' / 'index.html'
VELVET_CSS = ROOT / 'static' / 'css' / 'palace-gates.css'
RASTER_JS = ROOT / 'icons' / 'raster.js'

# --------------------------------------------------------------------------
# The one source. Per app:
#   deep / field / lit   the translucent enamel at its rim, its body and where
#            it lies thinnest over the turning. The field is what a reader
#            matches the curtain against, and every mark draws it.
#   pop      the crown stone
#   velvet   the gate's house curtain: an honest name and the dye at its
#            brightest crest, per theme. Every crest stays a quarter darker
#            than the leaf's body (--au-2) and inside the field's family;
#            tests/test_web_assets.py holds both. Bourse's tray band is fired
#            in this same dye, read from here.
#   ink      the day screen's title card is printed in this ink (one of
#            oxblood, bottle, navy; no two alike in a wing)
# --------------------------------------------------------------------------
HUE = {
    'autopilot': {
        'name': 'Anime Autopilot', 'short': 'Autopilot',
        'deep': '#24060d', 'field': '#621925', 'lit': '#983446', 'pop': '#fff4d2',
        'velvet': {'name': 'mulberry', 'onyx': '#92304c', 'ivory': '#9c4660'},
        'ink': 'oxblood',
    },
    'groundstation': {
        'name': 'Ground Station', 'short': 'Ground Stn',
        'deep': '#5a2f08', 'field': '#c8781f', 'lit': '#eea24c', 'pop': '#ffb454',
        'velvet': {'name': 'cognac', 'onyx': '#8a4f22', 'ivory': '#a0622a'},
        'ink': 'bottle',
    },
    'outreach': {
        'name': 'Outreach Desk', 'short': 'Outreach',
        'deep': '#0a2230', 'field': '#1c4a5f', 'lit': '#3a6e86', 'pop': '#e8c968',
        'velvet': {'name': 'prussian', 'onyx': '#1f5066', 'ivory': '#2d5d74'},
        'ink': 'navy',
    },
    'pressroom': {
        'name': 'The Press Room', 'short': 'Press Room',
        'deep': '#0b2616', 'field': '#1e6a40', 'lit': '#3f9463', 'pop': '#5a8040',
        'velvet': {'name': 'emerald', 'onyx': '#24754b', 'ivory': '#36906a'},
        'ink': 'bottle',
    },
    'arsenal': {
        'name': 'Arsenal', 'short': 'Arsenal',
        'deep': '#161c22', 'field': '#46535e', 'lit': '#72808b', 'pop': '#b03a2e',
        'velvet': {'name': 'gunmetal', 'onyx': '#44545f', 'ivory': '#5a6a74'},
        'ink': 'navy',
    },
    'bourse': {
        'name': 'Bourse', 'short': 'Bourse',
        'deep': '#0f0e05', 'field': '#35320f', 'lit': '#5e5a22', 'pop': '#e6a817',
        'velvet': {'name': 'olive gold', 'onyx': '#6b692c', 'ivory': '#8e8c4a'},
        'ink': 'oxblood',
    },
}
# The inks a day card can be printed in, as palace-gates.css draws them.
INKS = {'oxblood': '#6a1d19', 'bottle': '#1d4633', 'navy': '#1c2b4c'}

# The house cloth for a gate whose service has no mark of its own yet: the
# claret of the entrance curtain.
HOUSE_VELVET = {'name': 'claret', 'onyx': '#c22b3b', 'ivory': '#c83a4a'}

# The hall's own mark keeps its July drawing (a keystone on gold); it is not
# one of the six and is not hung over any gate.
ATRIUM = {'field': '#c9a227', 'deep': '#8a6c12', 'ink': '#1a1409', 'pop': '#fff8e1'}

MARKS = list(HUE)                       # registry order

# Brand directories in the apps' own repositories. Written only with
# --brand ... --allow-outside-repo, after the owner has signed off.
TARGETS = {
    'autopilot':     r'X:\Github\anime-rss-auto\static\brand',
    'groundstation': r'X:\Github\pdx-mod-hub\web\public\brand',
    'outreach':      r'X:\Github\linkedin-networking\static\brand',
    'atrium':        str(ROOT / 'static' / 'brand'),
    'arsenal':       r'X:\Github\arsenal\static\brand',
    # Bourse has no brand directory yet, and The Press Room never had one:
    # their marks reach the hall only.
}
SYMBOL_TARGETS = {
    'autopilot': r'X:\Github\anime-rss-auto\static\index.html',
}
CHROME_BG = {'autopilot': '#1a0e06'}
SPLASH_BG = {'atrium': '#0c0a07'}

# --------------------------------------------------------------------------
# Metals. One badge gilt for all six, fixed like the hall's --br brass, so a
# mark reads as its own object in a gold (Salon) or a nickel (Bureau) bezel.
# Six tones: glaze, shade, body, crest, relief body, lip.
# --------------------------------------------------------------------------
GILT = ['#271806', '#5a4019', '#9a7430', '#f8e3a2', '#c69c48', '#ebcd82']
LX, LY = -0.7071, -0.7071                # toward the key light, y down


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def tone(lit, pal=GILT):
    """Pick one of the six tones for a face whose normal makes `lit`
    (cosine) with the key light."""
    if lit > 0.72:
        return pal[3]
    if lit > 0.3:
        return pal[5]
    if lit > -0.05:
        return pal[4]
    if lit > -0.4:
        return pal[2]
    if lit > -0.78:
        return pal[1]
    return pal[0]


def pt(cx, cy, r, a):
    return (cx + r * math.cos(a), cy + r * math.sin(a))


def poly_d(points):
    return 'M' + ' L'.join('%s %s' % (f(x), f(y)) for x, y in points) + ' Z'


def circle_d(cx, cy, r):
    return ('M%s %s A%s %s 0 1 0 %s %s A%s %s 0 1 0 %s %s Z'
            % (f(cx - r), f(cy), f(r), f(r), f(cx + r), f(cy), f(r), f(r), f(cx - r), f(cy)))


def wedge_d(cx, cy, r0, r1, a0, a1):
    """An annulus sector, angles in radians (SVG sense, y down)."""
    large = 1 if (a1 - a0) > math.pi else 0
    p0, p1 = pt(cx, cy, r1, a0), pt(cx, cy, r1, a1)
    q1, q0 = pt(cx, cy, r0, a1), pt(cx, cy, r0, a0)
    if r0 <= 0:
        return ('M%s %s L%s %s A%s %s 0 %d 1 %s %s Z'
                % (f(cx), f(cy), f(p0[0]), f(p0[1]), f(r1), f(r1), large, f(p1[0]), f(p1[1])))
    return ('M%s %s A%s %s 0 %d 1 %s %s L%s %s A%s %s 0 %d 0 %s %s Z'
            % (f(p0[0]), f(p0[1]), f(r1), f(r1), large, f(p1[0]), f(p1[1]),
               f(q1[0]), f(q1[1]), f(r0), f(r0), large, f(q0[0]), f(q0[1])))


def rot(points, cx, cy, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in points]


class Mark:
    """Collects one mark's gradients (namespaced mk-<app>-*) and body."""

    def __init__(self, app, suffix=''):
        self.app, self.pre = app, 'mk-%s%s-' % (app, suffix)
        self.defs, self.body = [], []

    def id(self, name):
        return self.pre + name

    def url(self, name):
        return 'url(#%s)' % self.id(name)

    def lin(self, name, stops, x1, y1, x2, y2, user=True):
        units = ' gradientUnits="userSpaceOnUse"' if user else ''
        self.defs.append('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s"%s>%s</linearGradient>'
                         % (self.id(name), f(x1), f(y1), f(x2), f(y2), units, stops_xml(stops)))
        return self.url(name)

    def rad(self, name, stops, cx, cy, r, fx=None, fy=None, user=True):
        units = ' gradientUnits="userSpaceOnUse"' if user else ''
        foc = '' if fx is None else ' fx="%s" fy="%s"' % (f(fx), f(fy))
        self.defs.append('<radialGradient id="%s" cx="%s" cy="%s" r="%s"%s%s>%s</radialGradient>'
                         % (self.id(name), f(cx), f(cy), f(r), foc, units, stops_xml(stops)))
        return self.url(name)

    def clip(self, name, inner):
        self.defs.append('<clipPath id="%s">%s</clipPath>' % (self.id(name), inner))
        return self.url(name)

    def pattern(self, name, w, h, inner, transform=''):
        """An engine-turning tile, laid in the mark's own units."""
        tf = ' patternTransform="%s"' % transform if transform else ''
        self.defs.append('<pattern id="%s" patternUnits="userSpaceOnUse" width="%s" height="%s"%s>%s</pattern>'
                         % (self.id(name), f(w), f(h), tf, inner))
        return self.url(name)

    def add(self, s):
        self.body.append(s)

    def markup(self):
        return ('<defs>%s</defs>' % ''.join(self.defs) if self.defs else '') + ''.join(self.body)


def stops_xml(stops):
    out = []
    for st in stops:
        off, col = st[0], st[1]
        op = '' if len(st) < 3 else ' stop-opacity="%s"' % f(st[2])
        out.append('<stop offset="%s" stop-color="%s"%s/>' % (f(off), col, op))
    return ''.join(out)


def relief(d, body, lit=GILT[3], shade='#0a0603', dx=0.55, dy=0.8, sh_op=0.7, lo=0.42, extra=''):
    """A raised shape drawn three times along the key light: its shadow down
    and right, a lit edge up and left, and the body over both."""
    return ('<path d="%s" fill="%s" fill-opacity="%s" transform="translate(%s %s)"/>'
            '<path d="%s" fill="%s" transform="translate(%s %s)"/>'
            '<path d="%s" fill="%s"%s/>'
            % (d, shade, f(sh_op), f(dx), f(dy), d, lit, f(-lo), f(-lo), d, body, extra))


def faceted_ring(cx, cy, r0, r1, facing, pal=GILT, n=72, bias=0.0):
    """A turned or cast ring in six tones. facing=+1: the face looks out
    (lit on the lamp side); -1: it looks in (lit on the far side); 0: flat
    top, lit a little toward the lamp. Neighbouring facets of one tone are
    cut as one arc; one path per tone."""
    tones = []
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        nx, ny = math.cos(a), math.sin(a)
        if facing == 0:
            lit = 0.55 * (nx * LX + ny * LY) + 0.35 + bias
        else:
            lit = facing * (nx * LX + ny * LY) + bias
        tones.append(tone(lit, pal))
    # start the walk where the tone changes, so no run wraps past zero
    start = next((k for k in range(n) if tones[k] != tones[k - 1]), 0)
    paths, k0 = {}, start
    for i in range(1, n + 1):
        k = (start + i) % n
        if i == n or tones[k] != tones[k0]:
            span = (k - k0) % n or n
            a0 = 2 * math.pi * k0 / n - 0.004
            a1 = 2 * math.pi * (k0 + span) / n + 0.004
            if span == n:
                paths.setdefault(tones[k0], []).append(circle_d(cx, cy, r1) + ' ' + circle_d(cx, cy, r0))
            else:
                paths.setdefault(tones[k0], []).append(wedge_d(cx, cy, r0, r1, a0, a1))
            k0 = k
    return ''.join('<path d="%s" fill="%s" fill-rule="evenodd"/>' % (' '.join(v), c) for c, v in paths.items())


def facet_poly(outer, inner, pal=GILT, shade_all=0.0):
    """A bevelled frame between two polygons of the same vertex count; each
    trapezoid facet takes the tone of its outward normal."""
    out, n = [], len(outer)
    cx = sum(p[0] for p in outer) / n
    cy = sum(p[1] for p in outer) / n
    for i in range(n):
        a, b = outer[i], outer[(i + 1) % n]
        c, d = inner[(i + 1) % n], inner[i]
        mx, my = (a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy
        ln = math.hypot(mx, my) or 1
        lit = (mx / ln) * LX + (my / ln) * LY + shade_all
        out.append('<path d="%s" fill="%s"/>' % (poly_d([a, b, c, d]), tone(lit, pal)))
    return ''.join(out)


# --------------------------------------------------------------------------
# The die: shared by all six
# --------------------------------------------------------------------------
R_LIP, R_GROOVE, R_FIELD = 47.4, 43.6, 42.2
C = 48.0


def die_back(m, h):
    """Everything under the field: the badge's cast shadow, a plain turned
    lip, the one groove cut inside it, and the fillet the enamel is poured
    to. No beads and no rivets: the gate's bezel owns the rivet ring."""
    m.add('<circle cx="%s" cy="%s" r="%s" fill="#000" fill-opacity=".55"/>' % (f(C + 0.9), f(C + 1.3), f(R_LIP)))
    m.add(faceted_ring(C, C, 46.0, R_LIP, +1, n=48))      # outer bevel of the lip
    m.add(faceted_ring(C, C, 44.6, 46.0, 0, n=48))        # its crown, turned flat
    m.add(faceted_ring(C, C, R_GROOVE, 44.6, -1, n=48))   # the inner bevel, down into the groove
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_GROOVE), GILT[0]))
    m.add(faceted_ring(C, C, R_FIELD, 42.9, -1, n=48))    # the fillet the enamel is poured to


def enamel_open(m, h, paint=None):
    """Open the enamel field: the fired colour over its engine turning.
    `paint(m, h)` lays an app's own ground (a sky, a lamp's pool); without it
    the enamel is fired in one colour, lit where it lies thinnest."""
    clip = m.clip('field', '<circle cx="48" cy="48" r="%s"/>' % f(R_FIELD))
    m.add('<g clip-path="%s">' % clip)
    if paint:
        paint(m, h)
    else:
        grad = m.rad('enamel', [(0, h['lit']), (0.55, h['field']), (1, h['deep'])], 40, 38, 48, 44, 40)
        m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), grad))
    # the enamel pools deeper against the fillet, and the fillet shades the
    # lamp side of the sunk field
    pool = m.rad('pool', [(0.72, h['deep'], 0), (1, h['deep'], 0.75)], 48, 48, R_FIELD)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), pool))
    m.add('<path d="%s" fill="#000" fill-opacity=".32"/>'
          % wedge_d(C, C, R_FIELD - 2.2, R_FIELD, math.radians(150), math.radians(300)))


def enamel_close(m):
    m.add('</g>')


def crown(m, stone, shape='round'):
    """The crown stone in its collet, riding the top of the rim."""
    cx, cy = 48.0, 5.4
    if shape == 'kite':
        # the Press Room's ◆: a notched lozenge with its two trailing dots
        outer = [(cx, cy - 5.2), (cx + 5.2, cy), (cx, cy + 5.2), (cx - 5.2, cy)]
        inner = [(cx, cy - 3.3), (cx + 3.3, cy), (cx, cy + 3.3), (cx - 3.3, cy)]
        m.add('<path d="%s" fill="#000" fill-opacity=".6" transform="translate(.5 .75)"/>' % poly_d(outer))
        m.add(facet_poly(outer, inner))
        g = m.lin('stone', [(0, lighten(stone, 0.35)), (0.5, stone), (1, darken(stone, 0.45))], cx - 3, cy - 3, cx + 3, cy + 3)
        m.add('<path d="%s" fill="%s"/>' % (poly_d(inner), g))
        m.add('<path d="M%s %s L%s %s L%s %s Z" fill="%s" fill-opacity=".55"/>'
              % (f(cx - 3.3), f(cy), f(cx), f(cy - 3.3), f(cx + 0.9), f(cy - 0.9), darken(stone, 0.5)))
        m.add('<circle cx="%s" cy="%s" r="1" fill="%s"/><circle cx="%s" cy="%s" r="1" fill="%s"/>'
              % (f(cx + 7.4), f(cy + 0.4), GILT[4], f(cx + 10.2), f(cy + 0.4), GILT[4]))
        return
    m.add('<circle cx="%s" cy="%s" r="5.3" fill="#000" fill-opacity=".6"/>' % (f(cx + 0.5), f(cy + 0.75)))
    m.add(faceted_ring(cx, cy, 3.5, 5.1, +1, n=24))
    # four claws
    for a in (45, 135, 225, 315):
        x, y = pt(cx, cy, 3.9, math.radians(a))
        lit = math.cos(math.radians(a)) * LX + math.sin(math.radians(a)) * LY
        m.add('<circle cx="%s" cy="%s" r=".95" fill="%s"/>' % (f(x), f(y), tone(lit + 0.4)))
    # a cabochon: dark at the lamp side's rim, the light carried through it
    # to the far side (the caustic), never a glint on its skin
    g = m.rad('stone', [(0, lighten(stone, 0.45)), (0.45, stone), (1, darken(stone, 0.55))],
              cx + 1.1, cy + 1.2, 4.2, cx + 1.4, cy + 1.6)
    m.add('<circle cx="%s" cy="%s" r="3.5" fill="%s"/>' % (f(cx), f(cy), g))


def hexrgb(c):
    c = c.lstrip('#')
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def rgbhex(v):
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(round(x)))) for x in v)


def lighten(c, k):
    return rgbhex([x + (255 - x) * k for x in hexrgb(c)])


def darken(c, k):
    return rgbhex([x * (1 - k) for x in hexrgb(c)])


# --------------------------------------------------------------------------

# --------------------------------------------------------------------------
# Drawing the subjects: true forms, cut into planes
# --------------------------------------------------------------------------
# Every subject is one charge on the enamel, seen from the same place: level
# with it or a few degrees above (the hall's eye), lit from the one key light
# up and to the left. A form is first drawn as its true silhouette, then cut
# into three or four flat planes of tone along that light, the way a woodcut
# or a Deco poster cuts it: no gradient inside a plane, no outline round it.
# Colour is laid in as the eye remembers the thing.
PITCH = 8.0                                  # degrees above level, for every mark


def lines_path(segs):
    return ' '.join('M%s %sL%s %s' % (f(a), f(b), f(c), f(d)) for a, b, c, d in segs)


def shadow(d, dx=0.8, dy=1.2, op=0.5, extra=''):
    """The charge's own shadow on the enamel, cast down and right."""
    return ('<path d="%s" fill="#000" fill-opacity="%s" transform="translate(%s %s)"%s/>'
            % (d, f(op), f(dx), f(dy), extra))


def planes(m, name, sil, lit, box, tones, cuts, step=0.4, eps=0.12):
    """Cut a form into flat planes. `sil` is its silhouette (path data),
    `lit(x, y)` how squarely the surface under (x, y) faces the key light,
    `tones` its colours from the darkest up and `cuts` the light at which
    each next plane begins. The silhouette is laid in the darkest tone and
    each lighter plane over it, clipped to the silhouette."""
    out = ['<path d="%s" fill="%s"/>' % (sil, tones[0])]
    body = []
    for t, col in zip(cuts, tones[1:]):
        d = S.region_d(lambda x, y, t=t: t - lit(x, y), box, step, eps)
        if d:
            body.append('<path d="%s" fill="%s" fill-rule="evenodd"/>' % (d, col))
    if body:
        clip = m.clip(name, '<path d="%s"/>' % sil)
        out.append('<g clip-path="%s">%s</g>' % (clip, ''.join(body)))
    return ''.join(out)


def facet(lit, tones, cuts):
    """The tone of one flat face whose light is `lit`."""
    k = 0
    for i, t in enumerate(cuts):
        if lit >= t:
            k = i + 1
    return tones[k]


def lam(n):
    """How squarely a view-space normal faces the key light, 0..1."""
    return max(0.0, S.dot(S.norm(n), S.KEY))


def smooth_d(points, closed=True, tension=1.0):
    """A path through the given points on a Catmull-Rom spline. A point
    written (x, y, 1) is a corner: the curve arrives and leaves it straight."""
    n = len(points)
    P = [(p[0], p[1]) for p in points]
    corner = [len(p) > 2 and p[2] for p in points]
    out = ['M%s %s' % (f(P[0][0]), f(P[0][1]))]
    last = n if closed else n - 1
    for i in range(last):
        p0, p1 = P[(i - 1) % n], P[i]
        p2, p3 = P[(i + 1) % n], P[(i + 2) % n]
        if not closed:
            p0 = P[max(i - 1, 0)]
            p3 = P[min(i + 2, n - 1)]
        k = tension / 6.0
        c1 = p1 if corner[i] else (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = p2 if corner[(i + 1) % n] else (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        out.append('C%s %s %s %s %s %s' % (f(c1[0]), f(c1[1]), f(c2[0]), f(c2[1]), f(p2[0]), f(p2[1])))
    return ' '.join(out) + (' Z' if closed else '')


LAND = {
    'eurasia': [(25, 71), (44, 68), (60, 69), (70, 73), (100, 77), (130, 72), (160, 70), (180, 66), (163, 60),
                (160, 55), (157, 51), (152, 58), (140, 58), (135, 54), (140, 48), (132, 43), (129, 36),
                (127, 34.5), (126, 37.5), (124.5, 40), (121, 40.8), (118, 39), (119.5, 37.5), (122.5, 37),
                (120, 35), (121, 32), (122, 30.5), (120, 26), (116, 23), (114, 22.3), (110, 21.2), (107.5, 21.5),
                (106, 19.5), (108.5, 16), (109.2, 12), (106.5, 9), (104.8, 8.6), (105, 10.5), (102.5, 12),
                (100.5, 13.5), (100, 11), (99.5, 8), (101, 6.5), (103.5, 1.5), (102, 2.5), (100.5, 5),
                (98.5, 8.5), (98, 10), (97.5, 16.5), (94.2, 16), (94, 19), (91.8, 22.2), (88.5, 21.6),
                (86.5, 20), (84.5, 18.5), (80.2, 15.5), (80, 10.5), (77.5, 8), (76, 10.5), (74.5, 14.5),
                (72.8, 19), (72.6, 21.5), (70, 22.5), (68.5, 23.5), (66.5, 25.2), (61.5, 25.2), (57.5, 25.8),
                (56.5, 27), (54, 26.6), (51, 29.5), (48, 30), (49.5, 27.5), (50.8, 25), (51.6, 24),
                (56, 24.3), (58, 23.5), (59.8, 22.4), (57.5, 19), (55, 17), (52, 15.8), (48.5, 14),
                (45, 12.8), (43.3, 13), (42.5, 16), (40.5, 20), (39, 21.8), (37, 25.5), (35, 28), (34.4, 28.1),
                (32.6, 30), (34.3, 31.3), (35, 33), (35.9, 35.5), (36.1, 36.6), (32.5, 36.2), (30, 36.3),
                (28, 36.7), (26.7, 38.2), (26.5, 40.2), (28.9, 41.1), (31, 41.2), (35, 42), (38.5, 40.9),
                (41.5, 41.5), (40, 43.4), (37.8, 44.8), (35, 45.2), (33.5, 44.6), (32.5, 45.5), (30.8, 46.5),
                (29.5, 45.2), (28.6, 43.8), (28, 42), (26.2, 40.9), (24, 40.8), (22.9, 40.5), (23.5, 38),
                (22.5, 36.5), (21.5, 37.5), (20.2, 39.6), (19.4, 41.5), (15.8, 43.5), (13.6, 45.6),
                (12.3, 44.3), (13.5, 43.6), (16, 41.9), (18.5, 40.2), (16.6, 38.5), (15.7, 38), (15.6, 40),
                (12.5, 41.5), (10.5, 43), (8.8, 44.4), (6.6, 43.2), (3.2, 43.3), (3.2, 41.9), (0.5, 40.5),
                (-0.4, 38.5), (-2, 36.7), (-5.5, 36), (-7, 37.2), (-9, 37), (-9.5, 39), (-8.8, 42.5),
                (-8, 43.7), (-3.5, 43.5), (-1.5, 43.4), (-1.2, 46), (-2.5, 47.3), (-4.6, 48.4), (-1.5, 48.8),
                (1.6, 50.2), (2.5, 51.1), (4.5, 52.8), (7, 53.5), (8.5, 55.5), (8.2, 57), (10.5, 57.6),
                (10.6, 56), (12.5, 55.5), (14, 54.1), (18.5, 54.6), (21, 55.5), (21.3, 57.3), (24, 57.5),
                (23.5, 59.2), (28.5, 59.9), (29.5, 60.2), (25, 60.3), (22.8, 60.1), (21.5, 61.5), (21.3, 63.3),
                (25.3, 65.2), (22, 65.8), (18, 63), (17.2, 61.1), (18.6, 59.8), (16.5, 57), (14.2, 55.4),
                (12.5, 56.3), (11.3, 58.8), (8.5, 58.2), (5.5, 58.8), (5, 61.5), (8, 63.5), (12.5, 66.2),
                (15.5, 68.5), (19, 70), (23, 70.7)],
    'africa': [(32.6, 30), (29.5, 31), (25, 31.6), (20, 30.8), (19.8, 32.2), (15.5, 32.2), (11, 33.2),
               (10.2, 36.8), (3, 36.8), (-2, 35.1), (-5.9, 35.8), (-9.6, 32.5), (-10, 29.5), (-16, 23.5),
               (-17, 20.5), (-16.7, 12.5), (-13.5, 9), (-8, 4.5), (-2, 4.8), (4.5, 6.3), (8.5, 4.5), (9.7, 2.2),
               (9.3, -1), (11.8, -4.2), (13.3, -8.8), (11.8, -16.5), (14.5, -22.8), (15.2, -27), (18.4, -34.2),
               (22, -34), (25.5, -33.9), (28.5, -32.2), (32.4, -28.5), (32.8, -26), (35.3, -24),
               (35.5, -21), (39.5, -16.5), (40.6, -14), (40.2, -10.3), (39.3, -6.5), (39.8, -4.2), (42, -0.8),
               (45, 1.9), (48.5, 5.8), (51.2, 10.4), (51.2, 11.9), (48.5, 11.2), (44.5, 10.4), (43.3, 11.8),
               (42.5, 13.8), (41.2, 14.9), (39.2, 15.8), (37.3, 18.8), (37, 22), (35.6, 23.9), (34, 26.6),
               (32.7, 29.6)],
    'madagascar': [(44, -25), (47.1, -25), (50.4, -15.6), (49.3, -12), (47.9, -13.6), (44.2, -16.5), (43.4, -21.8)],
    'arabia_gulf': [],
    'srilanka': [(79.9, 6.2), (81.8, 7.2), (81.2, 8.6), (80.1, 9.8), (79.7, 8)],
    'honshu': [(130.9, 34), (132.4, 35.4), (135.8, 35.7), (136.9, 37.2), (138.6, 37.9), (140, 39.8), (140.1, 41.3),
               (141.5, 41.2), (142, 39.5), (141, 38.2), (140.9, 36.4), (140.5, 35.2), (139.1, 34.8),
               (137.2, 34.6), (136.2, 33.6), (135.1, 33.8), (133.2, 33.3), (132, 33.8)],
    'kyushu': [(129.6, 33.3), (130.9, 33.9), (131.9, 32.8), (131.3, 31.3), (130.3, 31.2)],
    'hokkaido': [(140.1, 42.2), (141.3, 43.2), (141.7, 45.4), (143.6, 44.2), (145.6, 43.3), (143.4, 42),
                 (141.1, 41.8)],
    'sakhalin': [(142, 46.2), (143.5, 46.8), (143, 49.2), (144.6, 49), (142.7, 54.3), (142.2, 51)],
    'taiwan': [(120.1, 23.1), (121, 25.2), (121.9, 24.6), (120.8, 21.9)],
    'hainan': [(108.7, 19.2), (110.5, 20.1), (111, 19.6), (109.5, 18.2)],
    'luzon': [(120, 18.4), (122.3, 18.5), (122.1, 16), (124, 13.4), (123.9, 12.6), (121.5, 13.7), (120.4, 14.5), (120, 16.3)],
    'mindanao': [(122, 7.2), (124.3, 6.2), (126.5, 6.6), (125.6, 9.7), (123.5, 8.6)],
    'borneo': [(109.1, 1.6), (110.3, -1.2), (111, -3.1), (114.5, -4), (116.5, -3.1), (118, 0.9), (119.2, 5.3),
               (117.2, 7), (116.1, 6.7), (113.2, 3.2), (111.2, 2.3)],
    'sumatra': [(95.3, 5.6), (98.3, 4), (100.5, 2), (104, -1.3), (106, -3.3), (106, -5.8), (104.6, -5.9),
                (101.5, -3.2), (99.5, 0.2), (97.5, 2.4)],
    'java': [(105.3, -6.8), (108.5, -6.4), (111, -6.5), (114.5, -7.7), (114.4, -8.7), (110, -8.2), (106.5, -7.4)],
    'sulawesi': [(119.5, -5.5), (119, -3), (120.2, 0.6), (124.8, 1.5), (121, -0.8), (123.2, -1.5), (121.2, -2.5),
                 (122.5, -4.8), (121, -4.2)],
    'newguinea': [(131, -1.4), (134, -0.8), (137, -1.6), (141, -2.6), (145.5, -4.8), (147.5, -6.3), (148, -8.2),
                  (150.2, -10.5), (146, -8.5), (143.5, -9.1), (141, -9.1), (139, -8.2), (138, -7.5), (137.8, -5),
                  (135, -4.4), (133, -3.9), (132, -2.9)],
    'australia': [(113.5, -22), (114.1, -26.4), (115.1, -33.9), (117.8, -35.1), (123.5, -33.9), (126.2, -32.2),
                  (129, -31.6), (131.5, -31.5), (134.2, -32.8), (135.8, -34.8), (137.8, -33), (138.1, -35.6),
                  (140, -37.9), (143.5, -38.8), (146.3, -39), (148.2, -37.8), (150, -37.4), (151.2, -33.9),
                  (153.1, -30.3), (153.6, -28), (153, -25), (150.8, -22.6), (149.2, -21), (146.3, -19),
                  (145.4, -15.2), (143.6, -14.2), (142.5, -10.7), (141.6, -12.9), (141.5, -16.6), (140.6, -17.6),
                  (139.3, -17.4), (137.1, -15.9), (135.4, -14.8), (136.8, -12.3), (132.6, -11.5), (131, -12.2),
                  (129.7, -14.9), (128.2, -14.9), (126.1, -14.1), (125, -16.4), (122.2, -17.3), (121.2, -19.6),
                  (118.8, -20.3), (116.7, -20.6)],
    'britain': [(-5.6, 50.1), (-3.5, 50.4), (1.4, 51.2), (1.7, 52.8), (0.2, 53.5), (-0.2, 54.6), (-1.6, 55.6),
                (-2, 57.6), (-4, 58.6), (-5.1, 58.5), (-6.2, 56.6), (-4.8, 55), (-3, 54.9), (-3.1, 53.3),
                (-4.6, 53.2), (-4.2, 51.6), (-5.2, 51.7)],
    'ireland': [(-6, 52.2), (-6.2, 54.5), (-7.6, 55.3), (-10, 54.2), (-10.3, 51.8), (-8.4, 51.6)],
}
LAKES = {
    'caspian': [(47, 45), (49.5, 46.6), (51.4, 47), (53.2, 45.4), (51.3, 44.5), (52.9, 41), (54, 37.4),
                (50.8, 37), (49, 38.2), (49.6, 40.6), (47.8, 42.8)],
}


# --------------------------------------------------------------------------
# The Press Room: the world on a desk globe, half of it in night, girdled
# by the paper's own staff
# --------------------------------------------------------------------------
GLOBE = {'cx': 48.0, 'cy': 43.0, 'r': 25.5, 'lean': 23.4, 'ring_yaw': 64.0, 'lon0': 60.0,
         'sun': S.norm((-0.84, 0.46, 0.28))}
SEA = ['#0a2a1d', '#9c7446', '#2c7058', '#5c9f82', '#a6d4b8']      # night, twilight, shade, body, lit
LANDC = ['#1f3220', '#c49658', '#8a7a44', '#c6b274', '#f0e2ae']
BONE = ['#34331f', '#c8a878', '#9a9270', '#d6cea4', '#f6f0c6']
DAY = [0.0, 0.075, 0.36, 0.72]                                    # where each plane begins (n . sun)


def _globe_frame():
    g = GLOBE
    t, ph = math.radians(g['lean']), math.radians(g['ring_yaw'])
    h = (math.cos(ph), 0.0, math.sin(ph))                  # the ring plane's level direction
    axis = S.norm(S.add(S.mul((0.0, 1.0, 0.0), math.cos(t)), S.mul(h, math.sin(t))))
    nr = S.norm(S.cross((0.0, 1.0, 0.0), h))               # the ring plane's normal
    b1 = nr
    b2 = S.cross(b1, axis)                                  # east runs to the right, seen from outside
    view = S.View(g['cx'], g['cy'], g['r'], yaw=0, pitch=PITCH)
    # turn the globe so that lon0 faces the reader
    vz = _unview(view, (0.0, 0.0, 1.0))
    alpha = math.atan2(S.dot(vz, b1), S.dot(vz, b2))
    spin = math.radians(g['lon0']) - alpha
    return view, axis, h, nr, b1, b2, spin


def _unview(view, n):
    """A view-space direction back into the world (the View's inverse)."""
    x, y, z = n
    y, z = y * view.cp_ + z * view.sp_, -y * view.sp_ + z * view.cp_
    x, z = x * view.cy_ - z * view.sy_, x * view.sy_ + z * view.cy_
    return (x, y, z)


def globe_world(lon, lat, fr):
    view, axis, h, nr, b1, b2, spin = fr
    lo, la = math.radians(lon) - spin, math.radians(lat)
    return S.add(S.mul(S.add(S.mul(b2, math.cos(lo)), S.mul(b1, math.sin(lo))), math.cos(la)),
                 S.mul(axis, math.sin(la)))


def globe_screen(p, fr, clamp=True):
    view = fr[0]
    x, y, z = view.proj(p)
    if z < 0 and clamp:
        dx, dy = x - view.cx, y - view.cy
        k = view.s / (math.hypot(dx, dy) or 1)
        x, y = view.cx + dx * k, view.cy + dy * k
    return (x, y, z)


def subject_pressroom(m, h, small=False):
    """The world as a cast desk globe, turned to the hemisphere the paper
    reads, Europe to the Pacific. The sun rakes it from the key light's side,
    so half of it lies in night, with a band of twilight at the terminator.
    Round its equator runs the paper's own staff, the rule with its dashes
    and its hung triples of dots, printed in bone as a globe prints its
    graduated equator. A gilt meridian ring holds it by the poles and it
    stands on a turned foot."""
    g = GLOBE
    fr = _globe_frame()
    view, axis, hdir, nr, b1, b2, spin = fr
    cx, cy, R = g['cx'], g['cy'], g['r']
    sun = g['sun']

    def nview(x, y):
        X, Y = (x - cx) / R, -(y - cy) / R
        q = X * X + Y * Y
        if q >= 0.998:
            k = math.sqrt(0.998 / q)
            X, Y, q = X * k, Y * k, 0.998
        return (X, Y, math.sqrt(1 - q))

    def light(x, y):
        return S.dot(nview(x, y), sun)

    disc = circle_d(cx, cy, R)
    box = (cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1)
    step = 0.7 if small else 0.42
    # -- the meridian ring, the stand -----------------------------------------
    r_o, r_i = 1.15, 1.08

    def ring_pts(rr, th0, th1, n=36):
        return [S.mul(S.add(S.mul(axis, math.cos(th0 + (th1 - th0) * k / n)),
                            S.mul(S.cross(nr, axis), math.sin(th0 + (th1 - th0) * k / n))), rr) for k in range(n + 1)]
    side = S.cross(nr, axis)
    front_sign = 1 if view.rot(side)[2] > 0 else -1

    def ring_half(front):
        th0, th1 = (0, math.pi) if (front_sign > 0) == front else (math.pi, 2 * math.pi)
        o = [view.proj(p)[:2] for p in ring_pts(r_o, th0, th1)]
        i = [view.proj(p)[:2] for p in ring_pts(r_i, th0, th1)]
        return S.pts_d(o + i[::-1]), o, i
    ring_face = view.nrm(nr if view.rot(nr)[2] > 0 else S.mul(nr, -1))
    face_lit = lam(ring_face)
    # the stand: stem from the ring's lowest point, a turned foot
    low = view.proj((0.0, -r_o, 0.0))
    fc = S.Faces()
    sv = S.View(low[0], low[1], R, yaw=0, pitch=PITCH)
    gilt4 = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
    # a turned foot, a baluster stem and a knop taking the ring, bottom up
    foot = [(-0.46, -0.41, 0.46, 0.46), (-0.41, -0.37, 0.46, 0.37), (-0.37, -0.34, 0.31, 0.29),
            (-0.34, -0.22, 0.1, 0.075), (-0.22, -0.11, 0.075, 0.05), (-0.11, -0.065, 0.05, 0.088),
            (-0.065, -0.02, 0.088, 0.05), (-0.02, 0.03, 0.042, 0.042)]
    for y0, y1, r0, r1 in foot:
        n = 24 if small else 40
        for k in range(n):
            p0, p1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            pm = (p0 + p1) / 2
            nv = sv.nrm((math.cos(pm), (r0 - r1) / max(0.01, y1 - y0), math.sin(pm)))
            if nv[2] <= 0:
                continue
            q = [sv.proj((r0 * math.cos(p0), y0, r0 * math.sin(p0))), sv.proj((r0 * math.cos(p1), y0, r0 * math.sin(p1))),
                 sv.proj((r1 * math.cos(p1), y1, r1 * math.sin(p1))), sv.proj((r1 * math.cos(p0), y1, r1 * math.sin(p0)))]
            fc.add([(a, b) for a, b, _ in q], sum(z for _, _, z in q) / 4, facet(lam(nv), gilt4, [0.18, 0.45, 0.7, 0.9]))
        top = [sv.proj((r1 * math.cos(2 * math.pi * k / n), y1, r1 * math.sin(2 * math.pi * k / n))) for k in range(n)]
        fc.add([(a, b) for a, b, _ in top], sum(z for _, _, z in top) / n - 0.5,
               facet(lam(sv.nrm((0, 1, 0))), gilt4, [0.18, 0.45, 0.7, 0.9]))
    base = [sv.proj((0.46 * math.cos(2 * math.pi * k / 40), -0.46, 0.46 * math.sin(2 * math.pi * k / 40)))[:2]
            for k in range(40)]
    m.add(shadow(poly_d(base), 1.0, 1.0, 0.45))
    m.add(fc.svg(seam=0.12))
    # the ring's far half, behind the globe
    back, _, _ = ring_half(False)
    m.add('<path d="%s" fill="%s"/>' % (back, GILT[1]))
    # -- the globe --------------------------------------------------------------
    m.add(shadow(disc, 1.4, 2.0, 0.45))
    m.add(planes(m, 'sea', disc, light, box, SEA, DAY, step))
    shapes = []
    for name, pts in LAND.items():
        if len(pts) < 3:
            continue
        xyz = [globe_world(lo, la, fr) for lo, la in pts]
        scr = [globe_screen(p, fr) for p in xyz]
        if max(z for _, _, z in scr) <= 0:
            continue
        shapes.append(S.pts_d(S.rdp([(x, y) for x, y, _ in scr], 0.3 if small else 0.15)))
    land_d = ' '.join(shapes)
    lclip = m.clip('land', '<path d="%s"/>' % land_d)
    dclip = m.clip('disc', '<path d="%s"/>' % disc)
    m.add('<g clip-path="%s"><g clip-path="%s">%s</g></g>' % (dclip, lclip, planes(m, 'landp', disc, light, box, LANDC, DAY, step)))
    lakes = [poly_d([globe_screen(globe_world(lo, la, fr), fr)[:2] for lo, la in pts]) for pts in LAKES.values()]
    if not small:
        m.add(planes(m, 'lake', ' '.join(lakes), light, box, SEA, DAY, step))
    # the graticule, engraved: meridians every thirty degrees, the tropics
    # and the polar circles (the equator carries the staff)
    if not small:
        lines = []
        for lon in range(0, 360, 30):
            cur = []
            for k in range(0, 181, 4):
                p = globe_screen(globe_world(lon, -90 + k, fr), fr, clamp=False)
                if p[2] > 0:
                    cur.append(p[:2])
                elif cur:
                    lines.append(cur)
                    cur = []
            if cur:
                lines.append(cur)
        for lat in (-66.5, -23.4, 23.4, 66.5):
            cur = []
            for k in range(0, 361, 4):
                p = globe_screen(globe_world(k, lat, fr), fr, clamp=False)
                if p[2] > 0:
                    cur.append(p[:2])
                elif cur:
                    lines.append(cur)
                    cur = []
            if cur:
                lines.append(cur)
        gd = ' '.join('M' + ' L'.join('%s %s' % (f(x), f(y)) for x, y in ln_) for ln_ in lines if len(ln_) > 1)
        m.add('<path d="%s" stroke="#0c1c12" stroke-width=".42" stroke-opacity=".3" fill="none"/>' % gd)
    # -- the staff round the equator ------------------------------------------
    half = 3.4

    def lat_at(x, y):
        n = _unview(view, nview(x, y))
        return math.degrees(math.asin(max(-1.0, min(1.0, S.dot(n, axis)))))

    def band_fn(x, y):
        if (x - cx) ** 2 + (y - cy) ** 2 > (R - 0.05) ** 2:
            return 1.0
        return abs(lat_at(x, y)) - half
    band = S.region_d(band_fn, box, step, 0.1)
    if band:
        m.add(planes(m, 'staff', band, light, box, BONE, DAY, step))
        if not small:
            ink = []
            rule = []
            for k in range(0, 361, 3):
                p = globe_screen(globe_world(k, 0.9, fr), fr, clamp=False)
                rule.append(p)
            seg, segs = [], []
            for p in rule:
                if p[2] > 0.05:
                    seg.append(p[:2])
                elif seg:
                    segs.append(seg)
                    seg = []
            if seg:
                segs.append(seg)
            ink.append('<path d="%s" stroke="#1a170c" stroke-width=".42" stroke-opacity=".75" fill="none"/>'
                       % ' '.join('M' + ' L'.join('%s %s' % (f(x), f(y)) for x, y in s_) for s_ in segs if len(s_) > 1))
            dash, dots = [], []
            for lon in range(0, 360, 12):
                a = globe_screen(globe_world(lon, 2.3, fr), fr, clamp=False)
                b = globe_screen(globe_world(lon, -0.5, fr), fr, clamp=False)
                if min(a[2], b[2]) > 0.12:
                    dash.append((a[0], a[1], b[0], b[1]))
                for dl, dt in ((5.2, -1.3), (6.8, -1.3), (6.0, -2.5)):
                    q = globe_screen(globe_world(lon + dl, dt, fr), fr, clamp=False)
                    if q[2] > 0.12:
                        dots.append('M%s %sh.01' % (S.fmt(q[0]), S.fmt(q[1])))
            ink.append('<path d="%s" stroke="#1a170c" stroke-width=".4" stroke-opacity=".75"/>' % lines_path(dash))
            ink.append('<path d="%s" stroke="#1a170c" stroke-opacity=".7" stroke-width=".52" stroke-linecap="round"/>' % ''.join(dots))
            m.add('<g clip-path="%s">%s</g>' % (m.clip('staffink', '<path d="%s"/>' % band), ''.join(ink)))
    # -- the ring's near half and its pivots -----------------------------------
    near, o, i = ring_half(True)
    m.add(shadow(near, 0.6, 0.9, 0.45))
    m.add('<path d="%s" fill="%s"/>' % (near, facet(face_lit, gilt4, [0.18, 0.45, 0.7, 0.9])))
    # its outer edge: the ring's thickness, lit where it faces up and left
    edge = []
    for k in range(len(o) - 1):
        (x0, y0), (x1, y1) = o[k], o[k + 1]
        nx, ny = (y1 - y0), -(x1 - x0)
        mx, my = (x0 + x1) / 2 - cx, (y0 + y1) / 2 - cy
        if nx * mx + ny * my < 0:
            nx, ny = -nx, -ny
        ln = math.hypot(nx, ny) or 1
        edge.append((x0, y0, x1, y1, lam((nx / ln, -ny / ln, 0.35))))
    for tone in sorted(set(facet(e[4], gilt4, [0.18, 0.45, 0.7, 0.9]) for e in edge)):
        segs = [(a, b, c, d) for a, b, c, d, l in edge if facet(l, gilt4, [0.18, 0.45, 0.7, 0.9]) == tone]
        m.add('<path d="%s" stroke="%s" stroke-width=".7" stroke-linecap="round"/>' % (lines_path(segs), tone))
    if not small:
        ticks = []
        th0 = 0 if front_sign > 0 else math.pi
        for k in range(1, 18):
            th = th0 + math.pi * k / 18
            p = S.add(S.mul(axis, math.cos(th)), S.mul(side, math.sin(th)))
            a, b = view.proj(S.mul(p, r_o - 0.005)), view.proj(S.mul(p, r_i + (0.035 if k % 3 else 0.005)))
            ticks.append((a[0], a[1], b[0], b[1]))
        m.add('<path d="%s" stroke="%s" stroke-width=".35"/>' % (lines_path(ticks), GILT[1]))
    for sgn in (1, -1):
        p = view.proj(S.mul(axis, sgn * (r_i - 0.01)))
        q = view.proj(S.mul(axis, sgn * 1.0))
        if p[2] > -0.2:
            m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width="1.1" stroke-linecap="round"/>'
                  % (f(p[0]), f(p[1]), f(q[0]), f(q[1]), GILT[2]))
            m.add(relief(circle_d(p[0], p[1], 1.25), GILT[4], dx=0.35, dy=0.5))


# --------------------------------------------------------------------------
# Ground Station: the earth station's antenna, turned up to the sky it listens to
# --------------------------------------------------------------------------
# Drawn from photographs of Goonhilly's Antenna 1 and GHY-3 and of the OTC
# antenna at Carnarvon: a broad, shallow reflector of white-painted panels on
# a dark backing truss, its subreflector held out at the focus on four legs.
# The reflector turns about an elevation axle at the front of a level box
# beam that carries the drive and, in its tail, the counterweight; the beam
# rides an azimuth turret on a railed gallery at the head of an octagonal
# concrete tower. World units are mark units: y up, the tower's axis at x = 0,
# the reader toward +z. Every tone set runs dark, shade, body, lit.
DISH = {
    'x': 43.5, 'base': 81.5, 'scale': 1.1,   # where the tower's axis meets the ground, on the mark; size
    'R': 25.5, 'FD': 0.36,                   # reflector radius; focal length over diameter
    'el': 38.0, 'head': 30.0,                # elevation; heading, degrees from +x toward the reader
    'truss': 8.0, 'hub': 5.2,                # the backing truss's depth behind the vertex; hub radius
    'tower': [(0.0, 1.6, 12.4, 12.4), (1.6, 19.4, 11.4, 6.9)],   # octagonal frustums: y0, y1, r0, r1
    'gallery': (19.4, 20.9, 9.8),            # the railed platform: y0, y1, radius
    'turret': (20.9, 26.2, 6.2),             # the azimuth turret: y0, y1, radius
    'beam': (-15.0, 6.0, 4.4, 5.8),          # the head beam: from, to along the heading; half width; height
    'paint': ['#8c877b', '#bdb6a5', '#e1dac8', '#f9f5ea'],     # white-painted panels and steel
    'face_cuts': [0.08, 0.32, 0.6],
    'truss_tones': ['#23211d', '#39352f', '#57524a', '#7d766a'],
    'gallery_tones': ['#2e2b26', '#48433b', '#6a6458', '#8f887a'],
    'concrete': ['#5e5649', '#8e8371', '#bcb098', '#ddd3ba'],
    'cuts': [0.22, 0.5, 0.8],
}


def groundstation_normal(poly):
    """Newell's normal of a planar polygon (world points)."""
    nx = ny = nz = 0.0
    for i in range(len(poly)):
        x0, y0, z0 = poly[i]
        x1, y1, z1 = poly[(i + 1) % len(poly)]
        nx += (y0 - y1) * (z0 + z1)
        ny += (z0 - z1) * (x0 + x1)
        nz += (x0 - x1) * (y0 + y1)
    return S.norm((nx, ny, nz))


def groundstation_mean(pts):
    n = float(len(pts))
    return (sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n, sum(p[2] for p in pts) / n)


def groundstation_solid(fc, vw, polys, centre, tones, cuts, lift=0.0, sky=0.14):
    """Lay a convex solid into the painter's list: every face that turns to
    the reader, one flat tone by how squarely it meets the key light, and a
    little more where it looks up at the open sky."""
    for poly in polys:
        n = groundstation_normal(poly)
        if S.dot(n, S.add(groundstation_mean(poly), S.mul(centre, -1))) < 0:
            n = S.mul(n, -1)
        nv = vw.nrm(n)
        if nv[2] <= 1e-4:
            continue
        q = [vw.proj(p) for p in poly]
        fc.add([(x, y) for x, y, _ in q], sum(z for _, _, z in q) / len(q),
               facet(lam(nv) + lift + sky * max(0.0, n[1]), tones, cuts))


def groundstation_ring(o, X, Y, Z, y, r, n, turn=0.0):
    """n points round a circle of radius r at height y on the axis (o, Y)."""
    return [S.add(S.add(o, S.mul(Y, y)), S.add(S.mul(X, r * math.cos(turn + 2 * math.pi * k / n)),
                                                 S.mul(Z, r * math.sin(turn + 2 * math.pi * k / n))))
            for k in range(n)]


def groundstation_frustum(o, X, Y, Z, y0, y1, r0, r1, n, turn=0.0, caps=True):
    """A turned or faceted frustum on the axis (o, Y): its side faces and caps,
    and its centre."""
    lo = groundstation_ring(o, X, Y, Z, y0, r0, n, turn)
    hi = groundstation_ring(o, X, Y, Z, y1, r1, n, turn)
    polys = [[lo[k], lo[(k + 1) % n], hi[(k + 1) % n], hi[k]] for k in range(n)]
    if caps:
        polys += [hi, lo[::-1]]
    return polys, S.add(o, S.mul(Y, (y0 + y1) / 2))


def groundstation_box(o, X, Y, Z, hx, hy, hz):
    """A box about o on the axes X, Y, Z: its six faces and its centre."""
    c = [S.add(o, S.add(S.mul(X, sx * hx), S.add(S.mul(Y, sy * hy), S.mul(Z, sz * hz))))
         for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    quads = [(0, 1, 3, 2), (4, 5, 7, 6), (0, 1, 5, 4), (2, 3, 7, 6), (0, 2, 6, 4), (1, 3, 7, 5)]
    return [[c[i] for i in q] for q in quads], o


def groundstation_hull(pts):
    """The convex hull of screen points (for a part's cast shadow)."""
    pts = sorted(set((round(x, 2), round(y, 2)) for x, y in pts))
    if len(pts) < 3:
        return pts

    def half(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and ((out[-1][0] - out[-2][0]) * (p[1] - out[-2][1])
                                     - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0])) <= 0:
                out.pop()
            out.append(p)
        return out
    lower, upper = half(pts), half(pts[::-1])
    return lower[:-1] + upper[:-1]


def groundstation_beam(p0, p1, w, lit, shade):
    """A square steel member between two screen points: a shaded half and,
    toward the key light, a lit half."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    ln = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / ln, dx / ln
    if nx * LX + ny * LY < 0:
        nx, ny = -nx, -ny
    hw = w / 2.0
    full = [(p0[0] - nx * hw, p0[1] - ny * hw), (p1[0] - nx * hw, p1[1] - ny * hw),
            (p1[0] + nx * hw, p1[1] + ny * hw), (p0[0] + nx * hw, p0[1] + ny * hw)]
    half = [p0, p1, (p1[0] + nx * hw, p1[1] + ny * hw), (p0[0] + nx * hw, p0[1] + ny * hw)]
    return '<path d="%s" fill="%s"/><path d="%s" fill="%s"/>' % (poly_d(full), shade, poly_d(half), lit)


def subject_groundstation(m, h, small=False):
    """An earth station's antenna, the object the app is named for, drawn
    from Goonhilly and Carnarvon. The reflector is a true paraboloid (focal
    length 0.36 of its diameter) turned up and to the right and seen three
    quarters on. The key light rakes across its white panels: the wall on the
    lamp's side turns its face away and falls into pale grey shade, and the
    far wall faces the lamp and takes the light. Those planes are what tell a
    bowl from a plate. Behind it the backing truss is a dark faceted cone down
    to the hub, and four legs hold the subreflector at the focus. The hub
    turns at the front of the head beam, whose tail carries the
    counterweight. The beam rides the azimuth turret on a railed gallery at
    the head of an octagonal concrete tower. Nothing in the sky and nothing
    lit: the antenna is listening. The small cut is the same geometry with
    coarser planes, heavier legs, a larger subreflector and no handrail."""
    d = DISH
    paint, steel, concrete, cuts = d['paint'], d['truss_tones'], d['concrete'], d['cuts']
    k = d['scale']
    vw = S.View(d['x'], d['base'], k, yaw=0, pitch=PITCH)
    el, hd = math.radians(d['el']), math.radians(d['head'])
    hdir = (math.cos(hd), 0.0, math.sin(hd))                  # level, the way the reflector looks
    axle = (-hdir[2], 0.0, hdir[0])                           # level, square to the heading
    a = (math.cos(el) * hdir[0], math.sin(el), math.cos(el) * hdir[2])   # the boresight
    up = (0.0, 1.0, 0.0)
    ua = S.norm(S.cross(axle, a))                             # square to the boresight, up and back
    R, F = d['R'], d['FD'] * 2 * d['R']
    zr = R * R / (4 * F)                                      # the rim's depth above the vertex
    t0, t1, tr = d['turret']
    b0, b1, bw, bh = d['beam']
    P = S.add(S.mul(hdir, b1 - 2.6), (0.0, t1 + bh - 1.4, 0.0))   # the elevation axle
    V = S.add(P, S.mul(a, d['truss'] + 1.6))                  # the reflector's vertex
    step = 0.7 if small else 0.4
    fc = S.Faces()

    # -- the tower, its gallery, the turret and the head beam ------------------
    X, Y, Z = (1.0, 0.0, 0.0), up, (0.0, 0.0, 1.0)
    turn = math.radians(22.5)                                 # a flat of the octagon to the reader
    for y0, y1, r0, r1 in d['tower']:
        polys, c = groundstation_frustum((0, 0, 0), X, Y, Z, y0, y1, r0, r1, 8, turn)
        groundstation_solid(fc, vw, polys, c, concrete, cuts)
    g0, g1, gr = d['gallery']
    polys, c = groundstation_frustum((0, 0, 0), X, Y, Z, g0, g1, gr, gr, 8, turn)
    groundstation_solid(fc, vw, polys, c, d['gallery_tones'], cuts)
    polys, c = groundstation_frustum((0, 0, 0), X, Y, Z, t0, t1, tr, tr * 0.94, 8 if small else 16, turn)
    groundstation_solid(fc, vw, polys, c, paint, cuts, lift=-0.1)
    bo = S.add(S.mul(hdir, (b0 + b1) / 2), (0.0, t1 + bh / 2, 0.0))
    polys, c = groundstation_box(bo, hdir, up, axle, (b1 - b0) / 2, bh / 2, bw)
    groundstation_solid(fc, vw, polys, c, paint, cuts, lift=-0.14, sky=0.3)

    # -- the hub and the backing truss behind the reflector --------------------
    U, W = axle, ua
    polys, c = groundstation_frustum(V, U, a, W, -d['truss'] - 3.2, -d['truss'], d['hub'] * 0.86, d['hub'] * 0.86, 20)
    groundstation_solid(fc, vw, polys, c, steel, cuts)
    n_back = 48                                               # the rim stays round in both cuts
    polys, c = groundstation_frustum(V, U, a, W, -d['truss'], zr - 0.4, d['hub'], R - 0.2, n_back, caps=False)
    groundstation_solid(fc, vw, polys, S.add(V, S.mul(a, zr + 6.0)), steel, cuts, lift=0.06)
    # the rim: a shallow skirt round the reflector's edge, white-painted
    polys, c = groundstation_frustum(V, U, a, W, zr - 1.2, zr, R, R, n_back, caps=False)
    groundstation_solid(fc, vw, polys, S.add(V, S.mul(a, zr - 0.6)), paint, cuts)

    # the charge's shadow on the enamel, cast down and to the right
    base = [vw.proj(p)[:2] for y0, y1, r0, r1 in d['tower'] for p in groundstation_ring((0, 0, 0), X, Y, Z, y0, r0, 8, turn)]
    base += [vw.proj(p)[:2] for p in groundstation_ring((0, 0, 0), X, Y, Z, t1, tr, 8, turn)]
    m.add(shadow(poly_d(groundstation_hull(base)), 1.3, 1.1, 0.42))
    head = [vw.proj(S.add(S.mul(hdir, sx), S.add((0.0, t1 + sy, 0.0), S.mul(axle, sz))))[:2]
            for sx in (b0, b1) for sy in (0.0, bh) for sz in (-bw, bw)]
    m.add(shadow(poly_d(groundstation_hull(head)), 1.2, 1.4, 0.4))
    rimv = [vw.proj(p) for p in groundstation_ring(V, U, a, W, zr, R, 96)]
    hub = [vw.proj(p)[:2] for p in groundstation_ring(V, U, a, W, -d['truss'], d['hub'], 24)]
    m.add(shadow(poly_d(groundstation_hull([p[:2] for p in rimv] + hub)), 1.6, 2.0, 0.45))
    m.add(fc.svg(seam=0.12))

    # -- the reflector's face ---------------------------------------------------
    Av, Uv, Wv = S.norm(vw.nrm(a)), S.norm(vw.nrm(U)), S.norm(vw.nrm(W))
    Vv = vw.rot(V)

    def face_light(x, y):
        """How squarely the bowl's inside meets the key light under screen
        point (x, y), at the nearest surface point along the reader's ray."""
        D0 = ((x - d['x']) / k - Vv[0], (d['base'] - y) / k - Vv[1], -Vv[2])
        du, dw, da = S.dot(D0, Uv), S.dot(D0, Wv), S.dot(D0, Av)
        a2 = Uv[2] ** 2 + Wv[2] ** 2
        b = 2 * (du * Uv[2] + dw * Wv[2] - 2 * F * Av[2])
        cc = du * du + dw * dw - 4 * F * da
        disc = b * b - 4 * a2 * cc
        if disc < 0:
            return 0.0
        # the nearest point on the reflector; past the rim, the surface
        # carried on, so the planes run out under the rim's own outline
        hits = []
        for t in ((-b + math.sqrt(disc)) / (2 * a2), (-b - math.sqrt(disc)) / (2 * a2)):
            qu, qw = du + t * Uv[2], dw + t * Wv[2]
            hits.append((qu * qu + qw * qw > R * R, -t, qu, qw))
        _, _, qu, qw = min(hits)
        return lam(S.add(S.add(S.mul(Uv, -qu / (2 * F)), S.mul(Wv, -qw / (2 * F))), Av))

    rim2 = [(x, y) for x, y, _ in rimv]
    rim_d = smooth_d(rim2[::2] if small else rim2)
    xs, ys = [p[0] for p in rim2], [p[1] for p in rim2]
    box = (min(xs) - 2, min(ys) - 2, max(xs) + 2, max(ys) + 2)
    m.add(planes(m, 'reflector', rim_d, face_light, box, paint, d['face_cuts'], step))

    # -- the quadripod and the subreflector --------------------------------------
    apex = S.add(V, S.mul(a, 0.86 * F))
    ap = vw.proj(apex)[:2]
    for deg in (40, 140, 220, 320):
        t = math.radians(deg)
        foot = S.add(V, S.add(S.mul(a, zr - 0.2), S.add(S.mul(U, (R - 0.8) * math.cos(t)), S.mul(W, (R - 0.8) * math.sin(t)))))
        m.add(groundstation_beam(vw.proj(foot)[:2], ap, 1.9 if small else 1.05, paint[3], paint[1]))
    # the subreflector's housing: a shallow drum, its back to the sky
    sr = 3.9 if small else 3.1
    polys, c = groundstation_frustum(apex, U, a, W, -0.6, 1.0, sr, sr * 0.72, 12 if small else 24)
    sf = S.Faces()
    groundstation_solid(sf, vw, polys, c, paint, cuts)
    m.add(shadow(poly_d(groundstation_hull([vw.proj(p)[:2] for poly in polys for p in poly])), 0.7, 0.9, 0.35))
    m.add(sf.svg(seam=0.1))

    # the gallery's handrail, a thread of steel round the front of the platform
    if not small:
        rail = groundstation_ring((0, 0, 0), X, Y, Z, g1 + 1.3, gr - 0.3, 8, turn)
        segs = []
        for k in range(8):
            p0, p1 = rail[k], rail[(k + 1) % 8]
            if vw.rot(S.mul(S.add(p0, p1), 0.5))[2] > -1.0:
                q0, q1 = vw.proj(p0), vw.proj(p1)
                segs.append((q0[0], q0[1], q1[0], q1[1]))
        m.add('<path d="%s" stroke="%s" stroke-width=".4" stroke-linecap="round"/>' % (lines_path(segs), steel[2]))


# --------------------------------------------------------------------------
# Anime Autopilot: the season's shelf, bound volumes standing on a plank
# --------------------------------------------------------------------------
# The shelf is modelled, not drawn: each volume is a real binding (two boards
# that overhang the page block by their squares, a back rounded in a shallow
# arc between the joints, raised bands lying across that round, a head where
# the page block sits down between the boards) and the row is turned a little
# so its near end comes toward the reader. From the hall's eye, a few degrees
# above, the spines face the key light, the covers that stand clear of a
# shorter neighbour turn into shade, and the heads lie open to the light.
# Every face takes one of its cloth's four planes by how squarely it meets
# the key light; nothing is graded inside a plane.
AUTOPILOT_YAW = 20.0            # degrees the row is turned, its right end nearer
AUTOPILOT_CLOTH = {             # dark, shade, body, lit: the cloth as the eye remembers it
    'calf':    ['#2c170a', '#5e3a1c', '#946434', '#c4925a'],     # tan calf
    'morocco': ['#3a0c0a', '#7a2218', '#b0372a', '#da6446'],     # red morocco, the lead volume
    'vellum':  ['#5c4e36', '#a08c64', '#d6c49c', '#f2e5c2'],     # vellum over boards
    'green':   ['#0a1c13', '#193e2b', '#2a6143', '#4c8a62'],     # bottle-green morocco
    'brown':   ['#1e0f07', '#432615', '#6a3f24', '#93603c'],     # chocolate calf
}
AUTOPILOT_LABEL = {             # leather onlays, in the same four planes
    'black': ['#0e0a09', '#1a1311', '#2a211d', '#443631'],
    'red':   ['#3c0f0a', '#62190f', '#8a2a1e', '#aa4430'],
    'olive': ['#1b1d0b', '#333714', '#4e5420', '#6b7330'],
}
AUTOPILOT_CUTS = [-0.25, 0.5, 0.7]
AUTOPILOT_CUTS_S = [-0.25, 0.56, 9.0]      # the small cut: the lit plane folds into the body
AUTOPILOT_GILT = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
AUTOPILOT_GILT_CUTS = [-0.4, 0.3, 0.55, 0.75]
AUTOPILOT_LEAVES = ['#6e6046', '#b8a880', '#dccfae', '#f0e6cc']    # the page block's head
AUTOPILOT_PLANK = ['#1e0d06', '#4a2211', '#76391c', '#a0562c']     # mahogany
# The row, left to right: x along the shelf, thickness, height and depth of
# each volume (depth follows height, as a quarto is deeper than an octavo),
# its cloth, its raised bands and gilt rules (fractions of its height), its
# labels, whether its bands and head are gilt, and the one volume that leans
# (its cover, turned to the reader, carries a gilt frame).
# The small cut keeps each volume's size and cloth and only its boldest
# furniture: the keys ending in _s.
AUTOPILOT_ROW = [
    {'x': 0.0, 't': 8.2, 'h': 36.5, 'd': 23.0, 'cloth': 'calf',
     'bands': (0.17, 0.37, 0.57, 0.77), 'labels': ((0.595, 0.745, 'red'),)},
    {'x': 8.2, 't': 10.4, 'h': 50.0, 'd': 30.0, 'cloth': 'morocco', 'gilt': True,
     'bands': (0.15, 0.315, 0.48, 0.645, 0.81), 'labels': ((0.665, 0.79, 'black'),),
     'bands_s': (0.16, 0.42, 0.85), 'labels_s': ((0.6, 0.76, 'black'),)},
    {'x': 18.6, 't': 8.0, 'h': 43.5, 'd': 27.0, 'cloth': 'green',
     'rules': (0.1, 0.32, 0.54, 0.76, 0.9), 'rules_s': (0.22, 0.52, 0.82)},
    {'x': 26.6, 't': 8.2, 'h': 40.0, 'd': 25.0, 'cloth': 'brown', 'fillets': True,
     'bands': (0.2, 0.41, 0.62, 0.83), 'labels': ((0.645, 0.795, 'olive'),)},
    {'lean': 13.0, 't': 8.6, 'h': 38.5, 'd': 25.5, 'cloth': 'vellum', 'frame': True,
     'labels': ((0.68, 0.82, 'red'),), 'labels_s': ((0.66, 0.84, 'red'),)},
]
AUTOPILOT_PLACE = (19.0, 67.4)  # where the row's front left foot stands, in the mark
AUTOPILOT_SCALE = 1.075        # mark units to a world unit: the charge fills its circle


def autopilot_view(ox, oy, k=1.0):
    """The hall's eye on the shelf: the row turned by AUTOPILOT_YAW, seen
    from PITCH degrees above. World x runs along the shelf, y up, z out of
    the shelf toward the reader. Returns project(p) -> (x, y, depth) and
    light(normal) -> the signed cosine with the key light."""
    cy_, sy_ = math.cos(math.radians(AUTOPILOT_YAW)), math.sin(math.radians(AUTOPILOT_YAW))
    cp, sp = math.cos(math.radians(PITCH)), math.sin(math.radians(PITCH))

    def rot(v):
        x, y, z = v
        x1, z1 = x * cy_ - z * sy_, x * sy_ + z * cy_
        return (x1, y * cp - z1 * sp, y * sp + z1 * cp)

    def project(p):
        x1, y2, z2 = rot(p)
        return (ox + k * x1, oy - k * y2, z2)

    def light(n):
        return S.dot(S.norm(rot(n)), S.KEY)

    def world(v):
        """A view-space direction back in the world."""
        x1, y2, z2 = v
        y, z1 = y2 * cp + z2 * sp, -y2 * sp + z2 * cp
        return (x1 * cy_ + z1 * sy_, y, -x1 * sy_ + z1 * cy_)
    return project, light, world


def autopilot_volume(v, project, light, small=False):
    """One bound volume, spine out, as painted faces back to front: the
    cover on its right (seen where it stands clear of a shorter neighbour),
    the head (the two boards' top edges, the page block set down between
    them by the square, the inside of the far board above it), the rounded
    back in its planes, its labels, its raised bands and their fillets. Its
    local frame: x across the spine, y up, z out of the spine; the back
    bulges forward in a shallow arc to 0.18 of its width, the way a backed
    and rounded text block does."""
    T = AUTOPILOT_CLOTH[v['cloth']]
    t, H, D = v['t'], v['h'], v['d']
    sq, bd = 0.9, 0.75                      # the squares, and the boards' thickness
    B = math.radians(40.0)                  # the round turns 40 degrees each way to the joints
    R = (t / 2) / math.sin(B)
    lean = math.radians(v.get('lean', 0.0))
    cl, sl = math.cos(lean), math.sin(lean)
    x0 = v['x']

    def place(p):                           # lean about the foot of the left board, then set down
        x, y, z = p
        return (x0 + x * cl - y * sl, x * sl + y * cl, z)

    def turn(n):
        x, y, z = n
        return (x * cl - y * sl, x * sl + y * cl, z)

    def P(p):
        q = project(place(p))
        return (q[0], q[1])

    def arc(b, y, e=0.0):
        """A point on the back at angle b (radians), height y, e proud of it."""
        return (t / 2 + (R + e) * math.sin(b), y, R * (math.cos(b) - math.cos(B)) + e * math.cos(b))

    CUTS = AUTOPILOT_CUTS_S if small else AUTOPILOT_CUTS

    def get(key):
        return v.get(key + '_s', ()) if small else v.get(key, ())

    def tone(n, pal=T, cuts=CUTS):
        return facet(light(turn(n)), pal, cuts)

    def runs(fn, n=24):
        """Split the round into runs of one tone: fn(b) -> colour."""
        out, cur, start = [], None, -B
        for k in range(n):
            b0, b1 = -B + 2 * B * k / n, -B + 2 * B * (k + 1) / n
            c = fn((b0 + b1) / 2)
            if c != cur:
                if cur is not None:
                    out.append((start, b0, cur))
                cur, start = c, b0
        out.append((start, B, cur))
        return out

    def strip(b0, b1, y0, y1, e0=0.0, e1=0.0, n=6):
        lo = [P(arc(b0 + (b1 - b0) * k / n, y0, e0)) for k in range(n + 1)]
        hi = [P(arc(b1 - (b1 - b0) * k / n, y1, e1)) for k in range(n + 1)]
        return lo + hi

    faces = []

    def face(pts, col):
        faces.append('<path d="%s" fill="%s"/>' % (S.pts_d(pts), col))

    # the cover on the right: the outer face of the near board
    cov = [(t, 0, 0), (t, H, 0), (t, H, -D), (t, 0, -D)]
    face([P(p) for p in cov], tone((1, 0, 0)))
    if v.get('frame') and not small:
        # a gilt fillet tooled round the board, dull in the cover's shade
        g = facet(light(turn((1, 0, 0))), AUTOPILOT_GILT, AUTOPILOT_GILT_CUTS)
        i, w = 1.7, 0.32
        for a, b in (((i, -D + i), (H - i, -D + i)), ((H - i, -D + i), (H - i, -2.2)),
                     ((H - i, -2.2), (i, -2.2)), ((i, -2.2), (i, -D + i))):
            (ya, za), (yb, zb) = a, b
            dy, dz = yb - ya, zb - za
            ln = math.hypot(dy, dz)
            ny, nz = -dz / ln * w / 2, dy / ln * w / 2
            face([P((t + 0.01, ya + ny, za + nz)), P((t + 0.01, yb + ny, zb + nz)),
                  P((t + 0.01, yb - ny, zb - nz)), P((t + 0.01, ya - ny, za - nz))], g)
    # the head: the boards' top edges, the page block between them
    top = tone((0, 1, 0))
    face([P(p) for p in ((0, H, 0), (bd, H, 0), (bd, H, -D), (0, H, -D))], top)
    leaves = AUTOPILOT_GILT if v.get('gilt') else AUTOPILOT_LEAVES
    lcuts = AUTOPILOT_GILT_CUTS if v.get('gilt') else CUTS
    front = [arc(math.asin(max(-1.0, min(1.0, (x - t / 2) / R))), H - sq, -1.0)
             for x in (bd + (t - 2 * bd) * k / 6 for k in range(7))]
    block = [(x, H - sq, max(z, -D + sq)) for x, _, z in front] + [(t - bd, H - sq, -D + sq), (bd, H - sq, -D + sq)]
    face([P(p) for p in block], facet(light(turn((0, 1, 0))), leaves, lcuts))
    # the inside of the far board, standing a square above the leaves
    face([P(p) for p in ((bd, H - sq, -0.6), (bd, H, -0.6), (bd, H, -D), (bd, H - sq, -D + sq))], T[1])
    face([P(p) for p in ((t - bd, H, 0), (t, H, 0), (t, H, -D), (t - bd, H, -D))], top)
    # the back, in its planes
    for b0, b1, c in runs(lambda b: tone((math.sin(b), 0, math.cos(b)))):
        face(strip(b0, b1, 0.0, H), c)
    # the headcap: the leather turned over the headband, facing up
    bs = [-B + 2 * B * k / 8 for k in range(9)]
    cap = [arc(b, H) for b in bs]
    face([P(p) for p in cap] + [P((x, y, z - 0.9)) for x, y, z in cap[::-1]], top)
    # labels: leather onlays, flush with the back
    for y0, y1, name in get('labels'):
        pal = AUTOPILOT_LABEL[name]
        for b0, b1, col in runs(lambda b: tone((math.sin(b), 0, math.cos(b)), pal)):
            face(strip(b0, b1, H * y0, H * y1, 0.03, 0.03), col)
    # raised bands: a cord under the leather, its upper slope to the light
    gilt = v.get('gilt')
    gfn = lambda b: facet(light(turn((math.sin(b), 0, math.cos(b)))), AUTOPILOT_GILT, AUTOPILOT_GILT_CUTS)
    wb, eb = (1.4, 0.9) if small else (0.75, 0.55)
    for fy in get('bands'):
        yb = H * fy
        for sgn, ya, yb2, ea, eb2 in ((+1, yb, yb + wb, eb, 0.0), (-1, yb - wb, yb, 0.0, eb)):
            eta = math.radians(52.0) * sgn
            pal = AUTOPILOT_GILT if gilt else T
            cuts = AUTOPILOT_GILT_CUTS if gilt else CUTS
            fn = (lambda b, eta=eta, pal=pal, cuts=cuts:
                  facet(light(turn((math.sin(b) * math.cos(eta), math.sin(eta), math.cos(b) * math.cos(eta)))), pal, cuts))
            for b0, b1, col in runs(fn):
                face(strip(b0, b1, ya, yb2, ea, eb2), col)
        if v.get('fillets') and not small:
            for yy in (yb + wb + 0.45, yb - wb - 0.75):
                for b0, b1, col in runs(gfn):
                    face(strip(b0, b1, yy, yy + 0.3, 0.02, 0.02), col)
    # gilt rules tooled across a flat back, in pairs
    for fy in get('rules'):
        for yy in ((H * fy - 0.55, H * fy + 0.25) if not small else (H * fy - 0.6,)):
            for b0, b1, col in runs(gfn):
                face(strip(b0, b1, yy, yy + (0.32 if not small else 1.1), 0.02, 0.02), col)
    # the outline of the whole volume, for its shadow on the enamel
    pts = [P(p) for p in ((0, 0, 0), (t, 0, 0), (t, 0, -D), (0, H, -D), (t, H, -D), (0, H, 0), (t, H, 0))]
    pts += [P(arc(-B + 2 * B * k / 6, y)) for k in range(7) for y in (0.0, H)]
    return ''.join(faces), autopilot_hull(pts)


def autopilot_hull(pts):
    """The convex hull of a volume's projected corners: its silhouette."""
    pts = sorted(set((round(x, 3), round(y, 3)) for x, y in pts))

    def half(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and ((out[-1][0] - out[-2][0]) * (p[1] - out[-2][1])
                                     - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0])) <= 0:
                out.pop()
            out.append(p)
        return out[:-1]
    return half(pts) + half(pts[::-1])


def autopilot_plank(x0, x1, project, light, small=False):
    """The mahogany plank the row stands on: its top, the bullnose front in
    an upper and a lower plane, and the end grain at its near end."""
    th, dp, zf, r = 4.2, 29.0, 9.0, 1.6       # the volumes stand back from its edge

    def P(p):
        q = project(p)
        return (q[0], q[1])
    faces = []

    def face(pts, n):
        faces.append('<path d="%s" fill="%s"/>' % (S.pts_d([P(p) for p in pts]), facet(light(n), AUTOPILOT_PLANK, AUTOPILOT_CUTS_S if small else AUTOPILOT_CUTS)))
    face([(x0, 0, zf - r), (x1, 0, zf - r), (x1, 0, -dp), (x0, 0, -dp)], (0, 1, 0))
    face([(x0, 0, zf - r), (x1, 0, zf - r), (x1, -th * 0.42, zf), (x0, -th * 0.42, zf)], (0, 0.75, 0.66))
    face([(x0, -th * 0.42, zf), (x1, -th * 0.42, zf), (x1, -th, zf - r * 0.6), (x0, -th, zf - r * 0.6)], (0, -0.5, 0.87))
    face([(x1, 0, zf - r), (x1, 0, -dp), (x1, -th, -dp), (x1, -th, zf - r * 0.6), (x1, -th * 0.42, zf)], (1, 0, 0))
    hull = [P(p) for p in ((x0, 0, -dp), (x1, 0, -dp), (x1, -th, -dp), (x1, -th, zf - r * 0.6),
                           (x0, -th, zf - r * 0.6), (x0, -th * 0.42, zf), (x1, -th * 0.42, zf))]
    return ''.join(faces), autopilot_hull(hull)


def subject_autopilot(m, h, small=False):
    """The season's shelf, the way the app shelves a season while the owner
    sleeps: five bound volumes on a mahogany plank. Tan calf with a red
    label, a tall red morocco lead with gilt bands and a gilt head,
    bottle-green morocco ruled in gilt, chocolate calf with an olive label,
    and at the end a vellum volume that has slipped and leans on its
    neighbour, its cover turned to the reader. Each is a real binding
    modelled whole and cut into its cloth's planes by the key light
    (autopilot_volume)."""
    ox, oy = AUTOPILOT_PLACE
    project, light, world = autopilot_view(ox, oy, AUTOPILOT_SCALE)
    row = [dict(v) for v in AUTOPILOT_ROW]
    # the leaning volume rests on the foot of its left board, far enough out
    # that its head meets its neighbour's cover
    last, prev = row[-1], row[-2]
    last['x'] = prev['x'] + prev['t'] + last['h'] * math.sin(math.radians(last['lean'])) + 0.2
    end = last['x'] + last['t'] * math.cos(math.radians(last['lean']))
    plank, plank_hull = autopilot_plank(-2.6, end + 1.6, project, light, small)
    books, hulls = [], [plank_hull]
    for v in row:
        body, hull = autopilot_volume(v, project, light, small)
        books.append(body)
        hulls.append(hull)
    # a taller volume shades the head of the shorter one to its right
    shade = {}
    L = S.norm(world(S.KEY))
    for i, (a, b) in enumerate(zip(row, row[1:])):
        if b.get('lean') or a['h'] <= b['h']:
            continue
        reach = (a['h'] - b['h']) * (-L[0]) / L[1]
        w = min(b['t'], reach)
        dz = w * L[2] / (-L[0])
        x0, y = b['x'], b['h']
        pts = [(x0, y, 0.0), (x0 + w, y, -dz), (x0 + w, y, -b['d']), (x0, y, -b['d'])]
        shade[i + 1] = '<path d="%s" fill="#000" fill-opacity=".38"/>' % S.pts_d([project(p)[:2] for p in pts])
    m.add('<g opacity=".5" transform="translate(1 1.4)">%s</g>'
          % ''.join('<path d="%s"/>' % S.pts_d(hl) for hl in hulls))
    m.add(plank)
    for i, body in enumerate(books):
        m.add(body)
        if i in shade and not small:
            m.add(shade[i])


# --------------------------------------------------------------------------
# Outreach Desk: an introduction held out by hand
# --------------------------------------------------------------------------
# The desk briefs each introduction overnight, but it never sends one: the
# owner opens the profile and delivers every note himself. The charge is
# that act, one calling card held out between the thumb and the first two
# fingers, from a white double cuff and the black sleeve of a dress coat.
# Traced from photographs (a hand holding out a card, a double cuff and its
# link); the units below are the photograph's pixels, y down, and
# OUTREACH_POSE lays them on the badge, turned eight degrees so the forearm
# comes up from the lower right. The card, the hand and the cuff keep to the
# circle of about 39 units the other charges keep to; the sleeve runs on out
# through the rim, as an arm issues from the edge of a heraldic field.
#
# The hand is cut as three layers of relief, back to front: the second
# finger, the hand with the first finger, and the thumb, which lies in
# front of the card it holds. Each layer is its outline inflated, so every
# edge turns away from the reader over `round` pixels, and a broad part
# swells under a low `dome` (centre, long axis, half length, half width,
# rise), so it turns from the light across its width.
OUTREACH_PARTS = {
    'finger': {'round': 11.0, 'dome': None, 'outline': [
        (355, 157, 1), (357, 166), (361, 177), (370, 184), (386, 186), (446, 187), (460, 199), (476, 209),
        (496, 229, 1), (500, 196), (486, 176), (470, 167), (446, 165), (412, 166), (374, 160)]},
    'hand': {'round': 15.0, 'dome': ((560, 250), (0.62, 0.78), 150.0, 85.0, 30.0), 'outline': [
        (376, 125), (362, 129), (353, 136), (351, 146), (355, 157, 1), (374, 162), (412, 168), (446, 167),
        (474, 170), (487, 184), (496, 229, 1), (512, 252), (517, 265), (513, 284),
        (505, 296), (486, 301), (466, 298), (440, 286), (420, 281), (398, 280), (383, 285), (373, 295),
        (369, 308), (371, 321), (380, 329), (405, 333), (432, 338), (464, 348), (500, 364), (536, 382),
        (584, 397), (612, 406), (632, 414), (655, 432, 1),
        (722, 352, 1), (700, 328), (680, 321), (660, 314), (640, 294), (627, 277), (608, 246), (585, 211),
        (566, 194), (544, 181), (512, 159), (490, 145), (470, 137), (440, 134), (402, 132)]},
    'thumb': {'round': 13.0, 'dome': ((520, 352), (0.93, 0.36), 160.0, 42.0, 10.0), 'outline': [
        (505, 296), (486, 301), (466, 298), (440, 286), (420, 281), (398, 280), (383, 285), (373, 295),
        (369, 308), (371, 321), (380, 329), (405, 333), (432, 338), (464, 348), (500, 364), (536, 382),
        (584, 397), (612, 406), (632, 414), (655, 432, 1), (648, 392), (615, 372), (575, 350), (540, 326),
        (514, 303)]},
}
# the thumbnail, seen on its back at the thumb's tip, and its free edge
OUTREACH_NAIL = [(380, 300), (392, 297), (402, 299, 1), (405, 312), (402, 325, 1), (392, 328), (380, 326), (376, 313)]
OUTREACH_NAIL_LIT = [(380, 300), (392, 297), (402, 299, 1), (404, 306), (396, 309), (386, 310), (377, 309)]
OUTREACH_NAIL_EDGE = [(380, 300), (376, 313), (380, 326), (384, 325), (381, 313), (384, 301)]
OUTREACH_NAILC = ['#e3b19c', '#f8dccd', '#fbefe5']                  # its body, where it takes the light, its free edge
OUTREACH_CARD = [(225, 190), (421, 186), (430, 281), (230, 301)]
# the cuff and the sleeve round the forearm's axis: where the cuff's rim
# stands, the axis' direction, the cuff's radius and length, the sleeve's
OUTREACH_ARM = {'at': (664.0, 369.0), 'to': (768.2, 456.4), 'cuff_r': 55.0, 'cuff_l': 40.0,
                'sleeve_r': 67.0, 'sleeve_l': 320.0, 'bulge': 0.17}
OUTREACH_POSE = {'ox': 481.0, 'oy': 260.5, 'rot': 8.0, 's': 0.1488, 'cx': 47.5, 'cy': 49.5}
OUTREACH_FLESH = ['#6e3b33', '#b8705a', '#e2a88a', '#f6d8c0']      # dark, shade, body, lit: warm, ruddy in shade
OUTREACH_FLESH_CUTS = [0.15, 0.48, 0.74]
OUTREACH_LINEN = ['#8e99a1', '#c3c9cb', '#e9e6de', '#fbfaf5']      # a starched white cuff
OUTREACH_CLOTH = ['#07080b', '#12141a', '#1f222b', '#363b48']      # a black dress coat
OUTREACH_STOCK = ['#f4f1ea', '#d9d0bb']                              # the page's own paper; its edge in shade


def outreach_at(p):
    """A point of the photograph, laid on the badge."""
    P = OUTREACH_POSE
    a = math.radians(P['rot'])
    x, y = (p[0] - P['ox']) * P['s'], (p[1] - P['oy']) * P['s']
    return (P['cx'] + x * math.cos(a) - y * math.sin(a), P['cy'] + x * math.sin(a) + y * math.cos(a))


def outreach_from(x, y):
    P = OUTREACH_POSE
    a = math.radians(P['rot'])
    dx, dy = x - P['cx'], y - P['cy']
    return (P['ox'] + (dx * math.cos(a) + dy * math.sin(a)) / P['s'],
            P['oy'] + (-dx * math.sin(a) + dy * math.cos(a)) / P['s'])


def outreach_path(pts):
    return smooth_d([outreach_at(p) + tuple(p[2:]) for p in pts])


def outreach_curve(pts, per=8):
    """Sample an outline's spline (as smooth_d draws it) into a polygon."""
    n = len(pts)
    P = [(p[0], p[1]) for p in pts]
    corner = [len(p) > 2 and p[2] for p in pts]
    out = []
    for i in range(n):
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]
        c1 = p1 if corner[i] else (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = p2 if corner[(i + 1) % n] else (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        for k in range(per):
            t, mt = k / per, 1 - k / per
            out.append((mt ** 3 * p1[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t ** 3 * p2[0],
                        mt ** 3 * p1[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t ** 3 * p2[1]))
    return out


def outreach_seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / ((dx * dx + dy * dy) or 1e-9)))
    return math.hypot(px - ax - dx * t, py - ay - dy * t)


def outreach_dome(dome, x, y):
    if not dome:
        return 0.0
    (cx, cy), (ux, uy), a, b, rise = dome
    p, q = ((x - cx) * ux + (y - cy) * uy) / a, (-(x - cx) * uy + (y - cy) * ux) / b
    return rise * max(0.0, 1 - p * p - q * q)


_OUTREACH_GRIDS = {}


def outreach_grid(name):
    """A layer's relief on a two-pixel grid, computed once: a scanline fill
    for what is inside its outline, and for each point inside, its distance
    to the outline (bucketed, so only nearby edges are measured)."""
    if name in _OUTREACH_GRIDS:
        return _OUTREACH_GRIDS[name]
    part = OUTREACH_PARTS[name]
    poly = outreach_curve(part['outline'])
    R, g = part['round'], 2.0
    x0, y0 = min(p[0] for p in poly) - 4, min(p[1] for p in poly) - 4
    nx = int((max(p[0] for p in poly) + 4 - x0) / g) + 2
    ny = int((max(p[1] for p in poly) + 4 - y0) / g) + 2
    segs = [(poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly))]
    cell, buckets = 16.0, {}
    for (ax, ay), (bx, by) in segs:
        for cx in range(int((min(ax, bx) - R - x0) // cell), int((max(ax, bx) + R - x0) // cell) + 1):
            for cy in range(int((min(ay, by) - R - y0) // cell), int((max(ay, by) + R - y0) // cell) + 1):
                buckets.setdefault((cx, cy), []).append((ax, ay, bx, by))
    H = [[0.0] * nx for _ in range(ny)]
    for j in range(ny):
        y = y0 + j * g
        xs = sorted(ax + (y - ay) * (bx - ax) / (by - ay)
                    for (ax, ay), (bx, by) in segs if (ay <= y < by) or (by <= y < ay))
        for k in range(0, len(xs) - 1, 2):
            for i in range(max(0, int((xs[k] - x0) / g) + 1), min(nx, int((xs[k + 1] - x0) / g) + 1)):
                x = x0 + i * g
                d = R
                for s4 in buckets.get((int((x - x0) // cell), int((y - y0) // cell)), ()):
                    d = min(d, outreach_seg_dist(x, y, *s4))
                H[j][i] = math.sqrt(max(0.0, R * R - (R - d) ** 2)) + outreach_dome(part['dome'], x, y)
    # two passes of a box blur: the distance field is kinked wherever the
    # nearest edge changes, and a plane's border would carry every kink
    for _ in range(2):
        B = [row[:] for row in H]
        for j in range(1, ny - 1):
            for i in range(1, nx - 1):
                B[j][i] = (H[j - 1][i - 1] + H[j - 1][i] + H[j - 1][i + 1] + H[j][i - 1] + H[j][i] + H[j][i + 1]
                           + H[j + 1][i - 1] + H[j + 1][i] + H[j + 1][i + 1]) / 9.0
        H = B
    G = {'H': H, 'x0': x0, 'y0': y0, 'g': g, 'nx': nx, 'ny': ny}
    _OUTREACH_GRIDS[name] = G
    return G


def outreach_height(name, x, y):
    G = outreach_grid(name)
    fx, fy = (x - G['x0']) / G['g'], (y - G['y0']) / G['g']
    i, j = int(fx), int(fy)
    if not (0 <= i < G['nx'] - 1 and 0 <= j < G['ny'] - 1):
        return 0.0
    tx, ty = fx - i, fy - j
    H = G['H']
    return (H[j][i] * (1 - tx) + H[j][i + 1] * tx) * (1 - ty) + (H[j + 1][i] * (1 - tx) + H[j + 1][i + 1] * tx) * ty


def outreach_light(name):
    """How squarely the layer's skin under a badge point faces the key light.
    Each plane is traced over the same lattice, so each point is lit once."""
    e, s, seen = 0.45, OUTREACH_POSE['s'], {}

    def lit(sx, sy):
        key = (round(sx, 4), round(sy, 4))
        if key not in seen:
            hx = outreach_height(name, *outreach_from(sx + e, sy)) - outreach_height(name, *outreach_from(sx - e, sy))
            hy = outreach_height(name, *outreach_from(sx, sy + e)) - outreach_height(name, *outreach_from(sx, sy - e))
            seen[key] = lam((-hx * s / (2 * e), hy * s / (2 * e), 1.0))
        return seen[key]
    return lit


def outreach_layer(m, name, small=False):
    """One layer of the hand, cut into its planes."""
    pts = OUTREACH_PARTS[name]['outline']
    sil = outreach_path(pts)
    xs = [outreach_at(p)[0] for p in pts]
    ys = [outreach_at(p)[1] for p in pts]
    box = (min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1)
    if small:
        return sil, planes(m, name, sil, outreach_light(name), box, OUTREACH_FLESH[1:], OUTREACH_FLESH_CUTS[1:], 0.6, 0.2)
    return sil, planes(m, name, sil, outreach_light(name), box, OUTREACH_FLESH, OUTREACH_FLESH_CUTS, 0.25, 0.14)


def outreach_arm_frame():
    A = OUTREACH_ARM
    (x0, y0), (x1, y1) = outreach_at(A['at']), outreach_at(A['to'])
    ln = math.hypot(x1 - x0, y1 - y0)
    u = ((x1 - x0) / ln, (y1 - y0) / ln)
    v = (-u[1], u[0])
    if v[1] < 0:
        v = (-v[0], -v[1])                     # across the arm, downward on the badge
    return (x0, y0), u, v, OUTREACH_POSE['s']


def outreach_tube(t0, t1, r, tones, cuts, rim=None):
    """A length of cloth round the forearm, t0 to t1 along it: seen from the
    side, its near rim bows toward the hand, and it is cut into bands along
    its length by the key light, the way cloth round a limb takes it."""
    (x0, y0), u, v, s = outreach_arm_frame()
    R = r * s
    bulge = OUTREACH_ARM['bulge'] * R

    def at(t, w):
        tt = t * s - bulge * math.sqrt(max(0.0, 1 - w * w))
        return (x0 + u[0] * tt + v[0] * w * R, y0 + u[1] * tt + v[1] * w * R)

    def tone(w):
        return facet(lam((v[0] * w, -v[1] * w, math.sqrt(max(0.0, 1 - w * w)))), tones, cuts)
    n = 24
    ws = [-1 + 2 * k / n for k in range(n + 1)]
    sil = poly_d([at(t0, w) for w in ws] + [at(t1, w) for w in reversed(ws)])
    out, k0 = [], 0
    bands = [tone((ws[k] + ws[k + 1]) / 2) for k in range(n)]
    for k in range(1, n + 1):
        if k == n or bands[k] != bands[k0]:
            strip = [at(t0, w) for w in ws[k0:k + 1]] + [at(t1, w) for w in reversed(ws[k0:k + 1])]
            out.append('<path d="%s" fill="%s"/>' % (poly_d(strip), bands[k0]))
            k0 = k
    if rim:
        # the rim itself, a rolled edge: it turns toward the hand, so it
        # catches the light a band's width ahead of the cloth behind it
        for k in range(n):
            wm = (ws[k] + ws[k + 1]) / 2
            nv = (v[0] * wm - u[0] * 0.6, -(v[1] * wm - u[1] * 0.6), math.sqrt(max(0.0, 1 - wm * wm)))
            q = [at(t0, ws[k]), at(t0, ws[k + 1]), at(t0 + rim, ws[k + 1]), at(t0 + rim, ws[k])]
            col = facet(lam(nv), tones, cuts)
            out.append('<path d="%s" fill="%s" stroke="%s" stroke-width=".12"/>' % (poly_d(q), col, col))
    return sil, ''.join(out)


def outreach_link(small=False):
    """The cufflink on the cuff's near side: an oval of the badge's own
    enamel in a gilt rim."""
    A = OUTREACH_ARM
    (x0, y0), u, v, s = outreach_arm_frame()
    t, w = A['cuff_l'] * 0.5, 0.34
    R = A['cuff_r'] * s
    cx, cy = x0 + u[0] * t * s + v[0] * w * R, y0 + u[1] * t * s + v[1] * w * R
    ang = math.degrees(math.atan2(u[1], u[0]))

    def oval(dx, dy, rx, ry, fill, extra=''):
        return ('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" transform="rotate(%s %s %s)"%s/>'
                % (f(cx + dx), f(cy + dy), f(rx), f(ry), fill, f(ang), f(cx), f(cy), extra))
    rx, ry = (1.6, 2.1) if not small else (1.9, 2.4)
    out = [oval(0.4, 0.55, rx, ry, '#000', ' fill-opacity=".35"'), oval(0, 0, rx, ry, GILT[4])]
    if not small:
        out.append(oval(-0.2, -0.25, rx * 0.7, ry * 0.72, GILT[3]))
        out.append(oval(0.1, 0.1, rx * 0.55, ry * 0.58, HUE['outreach']['field']))
    return ''.join(out)


def subject_outreach(m, h, small=False):
    """An introduction held out by hand: one calling card, blank and
    gilt-edged, between the thumb and the first two fingers, the hand
    reaching from a starched double cuff and a dress coat's black sleeve.
    The desk briefs every card overnight; the owner delivers each himself."""
    A = OUTREACH_ARM
    card = poly_d([outreach_at(p) for p in OUTREACH_CARD])
    # the sleeve runs on out through the badge's rim; the cuff runs on
    # under the sleeve's hem
    sleeve_sil, sleeve = outreach_tube(A['cuff_l'], A['cuff_l'] + A['sleeve_l'], A['sleeve_r'],
                                       OUTREACH_CLOTH, [0.2, 0.45, 0.72], rim=None if small else 3.0)
    cuff_sil, cuff = outreach_tube(0, A['cuff_l'] + 16, A['cuff_r'], OUTREACH_LINEN, [0.2, 0.45, 0.72],
                                   rim=None if small else 4.0)
    finger_sil, finger = outreach_layer(m, 'finger', small)
    hand_sil, hand = outreach_layer(m, 'hand', small)
    thumb_sil, thumb = outreach_layer(m, 'thumb', small)
    # one shadow for the whole charge, cast down and right on the enamel
    m.add('<g opacity=".5" transform="translate(1 1.4)">%s</g>'
          % ''.join('<path d="%s"/>' % d for d in (finger_sil, hand_sil, card, sleeve_sil, cuff_sil)))
    m.add(finger)
    m.add(hand)
    # the card: its gilt edge, a hair below and right of its face
    m.add('<path d="%s" fill="%s" transform="translate(.35 .45)"/>' % (card, GILT[4] if not small else OUTREACH_STOCK[1]))
    m.add('<path d="%s" fill="%s"/>' % (card, OUTREACH_STOCK[0]))
    m.add(thumb)
    if not small:
        m.add('<path d="%s" fill="%s"/>' % (outreach_path(OUTREACH_NAIL), OUTREACH_NAILC[0]))
        m.add('<path d="%s" fill="%s"/>' % (outreach_path(OUTREACH_NAIL_LIT), OUTREACH_NAILC[1]))
        m.add('<path d="%s" fill="%s"/>' % (outreach_path(OUTREACH_NAIL_EDGE), OUTREACH_NAILC[2]))
    m.add(cuff)
    m.add(outreach_link(small))
    m.add(sleeve)


# --------------------------------------------------------------------------
# Arsenal: the gunner's quadrant, laid at an elevation
# --------------------------------------------------------------------------
QUAD = {'vx': 60.0, 'vy': 24.5, 'elev': 36.0, 'long': 56.0, 'r0': 22.0, 'r1': 31.0, 'bar': 6.6}
BRASS4 = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
BRASS_CUTS = [0.18, 0.45, 0.7, 0.9]
LACQUER = ['#3a0c08', '#7a1e16', '#b03a2e', '#e0705a']     # the bob's signal-red lacquer


def bevelled(outer, inner, face):
    """A flat cast plate facing the reader: its face, and a chamfer round it
    whose every facet takes the tone its outward normal turns to the key."""
    out = ['<path d="%s" fill="%s"/>' % (poly_d(outer), face)]
    n = len(outer)
    cx = sum(p[0] for p in outer) / n
    cy = sum(p[1] for p in outer) / n
    for i in range(n):
        a, b = outer[i], outer[(i + 1) % n]
        c, d = inner[(i + 1) % n], inner[i]
        ex, ey = b[0] - a[0], b[1] - a[1]
        nx, ny = ey, -ex
        if nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0:
            nx, ny = -nx, -ny
        ln = math.hypot(nx, ny) or 1
        t = facet(lam((nx / ln, -ny / ln, 0.7)), BRASS4, BRASS_CUTS)
        out.append('<path d="%s" fill="%s"/>' % (poly_d([a, b, c, d]), t))
    out.append('<path d="%s" fill="%s"/>' % (poly_d(inner), face))
    return ''.join(out)


def subject_arsenal(m, h, small=False):
    """The gunner's quadrant, the instrument that first turned a gun's
    elevation into a number (Tartaglia, 1537): a long arm laid in the bore,
    a short arm square to it, and between them a limb graduated in the
    gunner's twelve points. A plumb bob on its cord hangs from the corner and
    reads the elevation where it crosses the limb, as Arsenal's Ballistic
    Computer reads one off the range. Cast brass, the bob lacquered in the
    tool's signal red."""
    q = QUAD
    vx, vy = q['vx'], q['vy']
    e = math.radians(q['elev'])
    long_dir = (math.cos(math.pi + e), -math.sin(math.pi + e))            # screen, down and left
    short_dir = (math.cos(1.5 * math.pi + e), -math.sin(1.5 * math.pi + e))  # down and a little right
    bw = q['bar']
    r0, r1 = q['r0'], q['r1']
    ch = 0.0 if small else 0.9                                            # chamfer

    def along(d, t, s):
        # a point t along direction d, s to its side (the side toward the limb is +)
        px, py = -d[1], d[0]
        return (vx + d[0] * t + px * s, vy + d[1] * t + py * s)

    # the limb: an annular band between the arms
    a0 = math.pi + e                    # the long arm's angle (math, y up)
    a1 = 1.5 * math.pi + e              # the short arm's
    n = 36

    def arc(r, a_from, a_to):
        return [(vx + r * math.cos(a_from + (a_to - a_from) * k / n), vy - r * math.sin(a_from + (a_to - a_from) * k / n))
                for k in range(n + 1)]
    limb_o, limb_i = arc(r1, a0, a1), arc(r0, a0, a1)
    limb = limb_o + limb_i[::-1]
    # the arms, as bars from the corner
    lo = [along(long_dir, -bw / 2, -bw / 2), along(long_dir, q['long'], -bw / 2),
          along(long_dir, q['long'], bw / 2), along(long_dir, -bw / 2, bw / 2)]
    so = [along(short_dir, -bw / 2, bw / 2), along(short_dir, r1 + 1.2, bw / 2),
          along(short_dir, r1 + 1.2, -bw / 2), along(short_dir, -bw / 2, -bw / 2)]
    body = [lo, so]
    sil = ' '.join(poly_d(p) for p in body) + ' ' + poly_d(limb)
    m.add(shadow(sil, 1.3, 1.8, 0.55))

    def inset(poly, k):
        cx = sum(p[0] for p in poly) / len(poly)
        cy = sum(p[1] for p in poly) / len(poly)
        out = []
        n_ = len(poly)
        for i in range(n_):
            p0, p1, p2 = poly[i - 1], poly[i], poly[(i + 1) % n_]
            # offset each vertex inward along the bisector of its two edges
            e1 = (p1[0] - p0[0], p1[1] - p0[1])
            e2 = (p2[0] - p1[0], p2[1] - p1[1])
            n1 = (-e1[1], e1[0])
            n2 = (-e2[1], e2[0])
            l1, l2 = math.hypot(*n1) or 1, math.hypot(*n2) or 1
            n1, n2 = (n1[0] / l1, n1[1] / l1), (n2[0] / l2, n2[1] / l2)
            bx, by = n1[0] + n2[0], n1[1] + n2[1]
            bl = math.hypot(bx, by) or 1
            bx, by = bx / bl, by / bl
            cosh = max(0.3, bx * n1[0] + by * n1[1])
            # inward is toward the centroid
            if bx * (cx - p1[0]) + by * (cy - p1[1]) < 0:
                bx, by = -bx, -by
            out.append((p1[0] + bx * k / cosh, p1[1] + by * k / cosh))
        return out
    face = BRASS4[2]
    # the web between the arms: a thinner plate set down inside the limb,
    # engraved with the gunner's points run in to the corner
    web = [(vx, vy)] + arc(r0 + 0.6, a0, a1)
    m.add('<path d="%s" fill="%s"/>' % (poly_d(web), BRASS4[1]))
    if not small:
        rays = []
        for k in range(1, 12):
            a = a0 + (a1 - a0) * k / 12
            rays.append((vx + 6.0 * math.cos(a), vy - 6.0 * math.sin(a), vx + (r0 - 0.6) * math.cos(a), vy - (r0 - 0.6) * math.sin(a)))
        m.add('<path d="%s" stroke="%s" stroke-width=".35" stroke-opacity=".8"/>' % (lines_path(rays), BRASS4[0]))
        m.add('<path d="M%s" stroke="%s" stroke-width=".6" fill="none"/>'
              % (' L'.join('%s %s' % (f(x), f(y)) for x, y in arc(r0 - 0.3, a0, a1)), BRASS4[3]))
    if small:
        m.add('<path d="%s" fill="%s"/>' % (poly_d(limb), BRASS4[2]))
        m.add('<path d="%s" fill="%s"/>' % (' '.join(poly_d(p) for p in body), BRASS4[3]))
    else:
        m.add(bevelled(limb, inset_arc(vx, vy, r0, r1, a0, a1, n, ch), face))
        for p in body:
            m.add(bevelled(p, inset(p, ch), face))
        # the limb's graduation: twelve points, the third ones long
        ticks = []
        for k in range(13):
            a = a0 + (a1 - a0) * k / 12
            r_in = r0 + (2.8 if k % 3 else 1.2)
            ticks.append((vx + r_in * math.cos(a), vy - r_in * math.sin(a), vx + (r1 - 1.3) * math.cos(a), vy - (r1 - 1.3) * math.sin(a)))
        for k in range(48):
            a = a0 + (a1 - a0) * k / 48
            ticks.append((vx + (r1 - 2.6) * math.cos(a), vy - (r1 - 2.6) * math.sin(a), vx + (r1 - 1.3) * math.cos(a), vy - (r1 - 1.3) * math.sin(a)))
        m.add('<path d="%s" stroke="%s" stroke-width=".42"/>' % (lines_path(ticks), BRASS4[0]))
        arcl = arc(r1 - 1.3, a0, a1)
        m.add('<path d="M%s" stroke="%s" stroke-width=".4" fill="none"/>' % (' L'.join('%s %s' % (f(x), f(y)) for x, y in arcl), BRASS4[0]))
        # the lines engraved down the long arm, where it lies in the bore
        m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".4"/>'
              % tuple([f(c) for c in along(long_dir, r1 + 3, 0)] + [f(c) for c in along(long_dir, q['long'] - 3, 0)] + [BRASS4[0]]))
    # the plumb line and its bob
    bob_y = vy + r1 + 11.5
    m.add('<path d="M%s %s V%s" stroke="#1c1410" stroke-width="%s"/>' % (f(vx), f(vy), f(bob_y - 3.6), '1.1' if small else '.5'))
    m.add(plumb_bob(vx, bob_y, small))
    # the pivot boss at the corner
    m.add(shadow(circle_d(vx, vy, 3.4), 0.6, 0.9, 0.5))
    m.add(faceted_ring(vx, vy, 2.1, 3.4, +1, n=24))
    m.add('<circle cx="%s" cy="%s" r="2.1" fill="%s"/>' % (f(vx), f(vy), BRASS4[2]))
    if not small:
        m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".55"/>' % (f(vx - 1.5), f(vy + 0.9), f(vx + 1.5), f(vy - 0.9), BRASS4[0]))


def inset_arc(cx, cy, r0, r1, a0, a1, n, k):
    """The face of an annular band, set in from its edges by k."""
    da = k / ((r0 + r1) / 2)
    o = [(cx + (r1 - k) * math.cos(a0 + da + (a1 - a0 - 2 * da) * i / n), cy - (r1 - k) * math.sin(a0 + da + (a1 - a0 - 2 * da) * i / n))
         for i in range(n + 1)]
    ii = [(cx + (r0 + k) * math.cos(a0 + da + (a1 - a0 - 2 * da) * i / n), cy - (r0 + k) * math.sin(a0 + da + (a1 - a0 - 2 * da) * i / n))
          for i in range(n + 1)]
    return o + ii[::-1]


def plumb_bob(x, y, small=False):
    """A turned plumb bob: a brass cap and a pear of red lacquer, its planes
    running down it as a lathe leaves them."""
    prof = [(-3.6, 1.0), (-2.6, 1.25), (-2.2, 2.5), (-0.6, 3.3), (1.2, 3.1), (3.0, 2.2), (4.6, 1.0), (5.8, 0.0)]
    fc = S.Faces()
    v = S.View(x, y, 1.0, yaw=0, pitch=PITCH)
    n = 18 if small else 32
    for j in range(len(prof) - 1):
        (y0, r0), (y1, r1) = prof[j], prof[j + 1]
        pal = BRASS4[:4] if j < 1 else LACQUER
        for k in range(n):
            p0, p1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            pm = (p0 + p1) / 2
            nv = v.nrm((math.cos(pm), (r1 - r0) / max(0.01, y1 - y0), math.sin(pm)))
            if nv[2] <= 0:
                continue
            pts = [v.proj((r0 * math.cos(p0), -y0, r0 * math.sin(p0))), v.proj((r0 * math.cos(p1), -y0, r0 * math.sin(p1))),
                   v.proj((r1 * math.cos(p1), -y1, r1 * math.sin(p1))), v.proj((r1 * math.cos(p0), -y1, r1 * math.sin(p0)))]
            fc.add([(a, b) for a, b, _ in pts], sum(z for _, _, z in pts) / 4, facet(lam(nv), pal, [0.2, 0.45, 0.72]))
    return shadow(poly_d([(x - 3.3, y - 1), (x + 3.3, y - 1), (x, y + 5.8)]), 0.7, 1.0, 0.45) + fc.svg(seam=0.1)


# --------------------------------------------------------------------------
# Bourse: the canary the desk keeps on watch, on its perch in a gilt cage
# --------------------------------------------------------------------------
# The bird, from the living canary, facing the key light: a short conical
# bill, a round head on a short neck with a soft dip at the nape, the breast
# carried full and forward, the body sitting up at about fifty-five degrees,
# the wing folded along the side with its primaries reaching over the base
# of the tail, and a long tail with a shallow notch. Bird units, the feet on
# the perch at the origin, y down; a point (x, y, 1) is a corner.
CANARY = {
    'outline': [(-17.4, -26.7, 1), (-14.3, -29.1, 1), (-13.6, -31.4), (-11.8, -33.3), (-9.3, -34.2), (-6.7, -33.4),
                (-5.0, -31.5), (-4.1, -29.4), (-2.7, -27.6), (-0.4, -25.4), (2.8, -21.6), (5.9, -17.0), (8.3, -13.2),
                (10.2, -10.3), (14.4, -3.4), (18.8, 3.4, 1), (17.6, 3.1, 1), (16.9, 4.9, 1), (15.2, 2.7), (10.8, -2.4),
                (7.2, -4.2), (4.6, -3.6), (1.8, -2.8), (-1.4, -3.3), (-4.8, -5.4), (-8.0, -8.9), (-10.4, -13.2),
                (-12.3, -18.0), (-13.5, -21.8), (-14.4, -25.0, 1)],
    'head': ((-9.4, -28.2), 5.9),
    'body': ((-2.6, -14.6), 58.0, 14.2, 9.4),        # centre, axis angle (deg, toward the head), half length, half depth
    'wing': [(-6.9, -22.6, 1), (-4.6, -25.2), (-1.0, -23.4), (3.0, -18.8), (6.4, -13.9), (9.4, -9.4), (12.6, -5.2, 1),
             (9.8, -4.6), (6.4, -4.3), (2.8, -5.3), (-0.6, -7.8), (-3.4, -11.4), (-5.4, -15.6), (-6.6, -19.4)],
    # the greater coverts' scalloped edge, and the tertials' stepped tips
    'coverts': [(-6.9, -22.6, 1), (-4.6, -25.2), (-1.0, -23.4), (2.4, -19.6), (1.6, -17.1), (0.0, -16.4), (-1.0, -14.9),
                (-2.8, -14.3), (-3.8, -12.7), (-5.2, -12.9)],
    'tertials': [(1.6, -20.8), (4.6, -17.0), (7.8, -12.6), (6.6, -10.9), (5.0, -11.4), (4.4, -9.8), (2.6, -10.4),
                 (1.8, -8.7), (0.0, -9.9), (-1.2, -12.2), (0.2, -14.0), (0.4, -16.8)],
    'shoulder': [(-6.9, -22.6, 1), (-4.8, -24.6), (-2.6, -24.2), (-2.4, -21.8), (-3.8, -20.0), (-5.6, -19.2)],
    'tail_far': [(9.8, -8.2), (14.6, -2.2), (18.8, 3.4, 1), (17.6, 3.1, 1), (16.9, 4.9, 1), (14.4, 1.8), (9.6, -3.8)],
    'bill_upper': [(-17.4, -26.7, 1), (-15.8, -28.2), (-14.3, -29.1, 1), (-13.9, -27.4, 1), (-13.7, -26.5, 1)],
    'bill_lower': [(-17.4, -26.7, 1), (-13.7, -26.5, 1), (-14.4, -25.0, 1), (-15.9, -25.6)],
    'eye': (-10.4, -28.9, 0.95),
    'legs': [(-1.2, -3.4, -1.0, 0.0), (1.4, -3.0, 1.6, 0.0)],
}
YELLOW = ['#b57f12', '#dea724', '#f3ca38', '#fde670']       # dark, shade, body, lit
YELLOW_CUTS = [0.2, 0.46, 0.72]
WINGC = ['#a8780e', '#cf9d1e', '#ecc234', '#fbe06a']        # primaries, tertials, coverts, shoulder
HORN = ['#caa184', '#ecd2b8', '#8a6452']                    # lower, upper, gape
CAGE = {'cx': 48.0, 'r': 23.0, 'base': 72.5, 'spring': 41.0, 'top': 20.5, 'wires': 3}


def smax(a, b, k):
    hh = max(k - abs(a - b), 0.0) / k
    return max(a, b) + hh * hh * k * 0.25


def canary(m, x, y, s, small=False):
    """Lay the bird with its feet at (x, y), scaled by s. Its volume is a
    head and a body blended at the neck; the planes are cut from that
    volume along the key light and clipped to the drawn outline, so the
    silhouette stays the bird's and the tone follows its form."""
    C = CANARY
    (hx, hy), hr = C['head']
    (bx, by), bang, ba, bb = C['body']
    ux, uy = -math.cos(math.radians(bang)), -math.sin(math.radians(bang))
    vx_, vy_ = -uy, ux
    nx_, ny_ = -10.6, -22.4

    def height(px, py):
        d2 = (px - hx) ** 2 + (py - hy) ** 2
        h1 = 0.9 * math.sqrt(max(0.0, hr * hr - d2))
        du = (px - bx) * ux + (py - by) * uy
        dv = (px - bx) * vx_ + (py - by) * vy_
        q = 1 - (du / ba) ** 2 - (dv / bb) ** 2
        h2 = bb * math.sqrt(max(0.0, q))
        # the throat, carrying the head down into the breast
        d3 = ((px - nx_) / 5.2) ** 2 + ((py - ny_) / 6.4) ** 2
        h3 = 5.6 * math.sqrt(max(0.0, 1 - d3))
        return smax(smax(h1, h3, 3.0), h2, 4.0)

    def light(sx, sy):
        px, py = (sx - x) / s, (sy - y) / s
        e = 0.12
        gx = (height(px + e, py) - height(px - e, py)) / (2 * e)
        gy = (height(px, py + e) - height(px, py - e)) / (2 * e)
        return lam((-gx, gy, 1.0))

    def T(pts):
        return [(x + p[0] * s, y + p[1] * s) + tuple(p[2:]) for p in pts]
    outline = smooth_d(T(C['outline']))
    xs = [x + p[0] * s for p in C['outline']]
    ys = [y + p[1] * s for p in C['outline']]
    box = (min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1)
    out = [shadow(outline, 1.0, 1.4, 0.5)]
    # the far side of the tail, seen below the near one
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['tail_far'])), YELLOW[0]))
    if small:
        out.append(planes(m, 'bird', outline, light, box, YELLOW[1:], YELLOW_CUTS[1:], 0.7, 0.2))
    else:
        out.append(planes(m, 'bird', outline, light, box, YELLOW, YELLOW_CUTS, 0.3, 0.1))
    # the folded wing: primaries darkest, the tertials' stepped tips, the
    # greater coverts' scalloped edge, the lit shoulder
    out.append('<path d="%s" fill="#6a4a08" fill-opacity=".35" transform="translate(.35 .5)"/>' % smooth_d(T(C['wing'])))
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['wing'])), WINGC[0]))
    if not small:
        out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['tertials'])), WINGC[1]))
        out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['coverts'])), WINGC[2]))
        out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['shoulder'])), WINGC[3]))
        # the primaries' tips, each feather edged paler
        tips = []
        for k, (a, b) in enumerate(((0.36, 0.0), (0.56, 0.6), (0.76, 1.1))):
            p0 = (x + (4.5 + 7.6 * a) * s, y + (-9.0 + 4.6 * a) * s)
            p1 = (x + (5.8 + 6.4 * a + b) * s, y + (-5.4 + 0.6 * a) * s)
            tips.append((p0[0], p0[1], p1[0], p1[1]))
        out.append('<path d="%s" stroke="%s" stroke-width=".4" stroke-linecap="round"/>' % (lines_path(tips), WINGC[2]))
        # the tail's feathers: the edges between them, running to the notch
        tail = [(10.8, -7.6, 17.9, 2.6), (11.6, -5.4, 16.6, 1.9)]
        out.append('<path d="%s" stroke="%s" stroke-width=".35" stroke-linecap="round"/>'
                   % (lines_path([(x + a * s, y + b * s, x + c * s, y + d * s) for a, b, c, d in tail]), YELLOW[0]))
    else:
        out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['coverts'])), WINGC[2]))
    # the bill: horn, the upper mandible lit, the lower in shade, the gape between
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['bill_lower'])), HORN[0]))
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(C['bill_upper'])), HORN[1]))
    ex, ey, er = C['eye']
    out.append('<circle cx="%s" cy="%s" r="%s" fill="#1c1208"/>' % (f(x + ex * s), f(y + ey * s), f(er * s * (1.25 if small else 1))))
    return ''.join(out)


def subject_bourse(m, h, small=False):
    """The canary the desk keeps on watch (its Watchtower watches two, and
    the desk speaks only when the air turns), sitting calm on a turned perch
    in a gilt dome cage. The cage is open to the reader, its wires behind the
    bird; it stands on a turned tray banded in the curtain's own olive gold,
    and hangs from a ring of its own."""
    c = CAGE
    v = S.View(c['cx'], 0, 1.0, yaw=0, pitch=PITCH)
    R, yb, ys, yt = c['r'], -c['base'], -c['spring'], -c['top']
    wire_t = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
    ww = 3.0 if small else 2.5

    def dome_pt(ph, t):
        # t 0..1 up the dome from the spring line to the top
        a = t * math.pi / 2
        r = R * math.cos(a)
        return (r * math.cos(ph), ys + (yt - ys) * math.sin(a), r * math.sin(ph))
    band = [c['cx'], 0]
    # the wires behind the bird: the back half of the drum and the dome
    n = c['wires']
    back = []
    for k in range(n):
        ph = math.pi + math.pi * (k + 0.5) / n                   # the back half (z < 0)
        pts = [(R * math.cos(ph), yb + (ys - yb) * j / 6, R * math.sin(ph)) for j in range(7)]
        pts += [dome_pt(ph, j / 10) for j in range(1, 11)]
        back.append([v.proj(p)[:2] for p in pts])
    hoops = []
    for yy in (ys, yb + 0.6, (yb + ys) / 2):
        hoops.append([v.proj((R * math.cos(math.pi + math.pi * j / 32), yy, R * math.sin(math.pi + math.pi * j / 32)))[:2]
                      for j in range(33)])
    # the side wires, where the drum turns edge-on to the reader, carry the silhouette
    sides = []
    for ph in (math.pi * 0.985, math.pi * 0.015):
        pts = [(R * math.cos(ph), yb + (ys - yb) * j / 6, R * math.sin(ph)) for j in range(7)]
        pts += [dome_pt(ph, j / 12) for j in range(1, 13)]
        sides.append([v.proj(p)[:2] for p in pts])

    def wire(pts, col, wd):
        return '<path d="M%s" stroke="%s" stroke-width="%s" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' % (
            ' L'.join('%s %s' % (f(px), f(py)) for px, py in pts), col, f(wd))
    # the tray: a turned base banded in olive gold
    fc = S.Faces()
    tray = [(yb - 6.4, yb - 5.0, R + 2.0, R + 2.0), (yb - 5.0, yb - 1.3, R + 1.6, R + 1.6), (yb - 1.3, yb, R + 1.6, R + 0.8)]
    # the band is fired in the curtain's own dye (HUE's velvet), so the mark
    # carries its cloth
    vo, vi = h['velvet']['onyx'], h['velvet']['ivory']
    tones = {0: wire_t, 1: [darken(vo, 0.45), vo, vi, lighten(vi, 0.3)], 2: wire_t}
    for i, (y0, y1, r0, r1) in enumerate(tray):
        nn = 24 if small else 48
        for k in range(nn):
            p0, p1 = 2 * math.pi * k / nn, 2 * math.pi * (k + 1) / nn
            pm = (p0 + p1) / 2
            nv = v.nrm((math.cos(pm), (r0 - r1) / max(0.01, y1 - y0), math.sin(pm)))
            if nv[2] <= 0:
                continue
            q = [v.proj((r0 * math.cos(p0), y0, r0 * math.sin(p0))), v.proj((r0 * math.cos(p1), y0, r0 * math.sin(p1))),
                 v.proj((r1 * math.cos(p1), y1, r1 * math.sin(p1))), v.proj((r1 * math.cos(p0), y1, r1 * math.sin(p0)))]
            fc.add([(a, b) for a, b, _ in q], sum(z for _, _, z in q) / 4,
                   facet(lam(nv), tones[i], [0.2, 0.46, 0.72, 0.92] if i != 1 else [0.3, 0.6, 2, 2]))
    top = [v.proj(((R + 1.0) * math.cos(2 * math.pi * k / 48), yb, (R + 1.0) * math.sin(2 * math.pi * k / 48))) for k in range(48)]
    fc.add([(a, b) for a, b, _ in top], sum(z for _, _, z in top) / 48 - 0.5, GILT[1])
    base_sil = [v.proj(((R + 2.0) * math.cos(2 * math.pi * k / 48), yb - 6.4, (R + 2.0) * math.sin(2 * math.pi * k / 48)))[:2] for k in range(48)]
    m.add(shadow(poly_d(base_sil), 0.9, 0.9, 0.45))
    # the back wires and hoops, then the tray over their feet
    for pts in back:
        m.add(wire(pts, '#000', ww + 0.5).replace('stroke="#000"', 'stroke="#000" stroke-opacity=".35"'))
        m.add(wire(pts, wire_t[1], ww))
        if not small:
            m.add(wire([(px - 0.45, py) for px, py in pts], wire_t[3], ww * 0.35))
    for pts in hoops:
        m.add(wire(pts, wire_t[1], 1.6 if not small else 2))
    m.add(fc.svg(seam=0.12))
    # the perch, a turned bar across the cage
    py_ = 61.5
    px0, px1 = c['cx'] - R + 1.5, c['cx'] + R - 1.5
    m.add(shadow('M%s %s H%s V%s H%s Z' % (f(px0), f(py_ - 1.1), f(px1), f(py_ + 1.1), f(px0)), 0.4, 0.9, 0.4))
    m.add('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(px0), f(py_ - 1.1), f(px1), f(py_ + 1.1), f(px0), GILT[2]))
    m.add('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(px0), f(py_ - 1.1), f(px1), f(py_ - 0.2), f(px0), GILT[5]))
    # the bird
    bxy = (c['cx'] + 1.5, py_ - 1.0)
    s = 1.12
    legs = []
    for x0, y0, x1, y1 in CANARY['legs']:
        legs.append((bxy[0] + x0 * s, bxy[1] + y0 * s, bxy[0] + x1 * s, bxy[1] + y1 * s))
    m.add('<path d="%s" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (lines_path(legs), '#b88a7a', '1.2' if small else '.8'))
    m.add(canary(m, bxy[0], bxy[1], s, small))
    if not small:
        toes = []
        for x0, y0, x1, y1 in CANARY['legs']:
            fx, fy = bxy[0] + x1 * s, bxy[1] + y1 * s
            toes.append('M%s %s q%s %s %s %s' % (f(fx), f(fy), f(-1.4), f(0.2), f(-1.8), f(1.6)))
            toes.append('M%s %s q%s %s %s %s' % (f(fx), f(fy), f(1.2), f(0.3), f(1.4), f(1.5)))
        m.add('<path d="%s" stroke="#b88a7a" stroke-width=".7" fill="none" stroke-linecap="round"/>' % ' '.join(toes))
    # the side wires in front of everything at the cage's edges, the finial and its ring
    for pts in sides:
        m.add(wire(pts, '#000', ww + 0.5).replace('stroke="#000"', 'stroke="#000" stroke-opacity=".35"'))
        m.add(wire(pts, wire_t[2], ww))
        if not small:
            m.add(wire([(px - 0.5, py) for px, py in pts], wire_t[4], ww * 0.4))
    tx, ty = v.proj((0, yt, 0))[:2]
    m.add(relief('M%s %s C%s %s %s %s %s %s C%s %s %s %s %s %s Z'
                 % (f(tx - 3.2), f(ty + 1.2), f(tx - 3.0), f(ty - 1.6), f(tx - 1.0), f(ty - 3.4), f(tx), f(ty - 3.6),
                    f(tx + 1.0), f(ty - 3.4), f(tx + 3.0), f(ty - 1.6), f(tx + 3.2), f(ty + 1.2)), GILT[4], dx=0.4, dy=0.6))
    m.add('<circle cx="%s" cy="%s" r="2.1" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="1.3" transform="translate(.4 .6)"/>'
          '<circle cx="%s" cy="%s" r="2.1" fill="none" stroke="%s" stroke-width="1.3"/>'
          % (f(tx), f(ty - 5.6), f(tx), f(ty - 5.6), GILT[4]))


# --------------------------------------------------------------------------
# The enamel: each app's colour fired over its own engine turning
# --------------------------------------------------------------------------
def enamel_glaze(m, h):
    """The fired colour: HUE's lit, field and deep, thinnest (lightest) up
    and to the left where the turning lies nearest the surface."""
    grad = m.rad('enamel', [(0, h['lit']), (0.55, h['field']), (1, h['deep'])], 42, 36, 50, 38, 30)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), grad))


def turning(m, w, hh, tile, transform='translate(48 48)'):
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), m.pattern('turn', w, hh, tile, transform)))


def ground_barleycorn(m, h):
    """Autopilot: a barleycorn turning, two sets of fine lines crossing."""
    enamel_glaze(m, h)
    line = '<rect width=".34" height="10" fill="%s" fill-opacity=".2"/>' % h['lit']
    for k, turn in enumerate((-60, 60)):
        m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>'
              % (f(R_FIELD), m.pattern('turn%d' % k, 1.3, 10, line, 'rotate(%d 48 48)' % turn)))


def ground_lined(m, h):
    """Ground Station: straight-line engine turning, level, like the lines
    of a machined instrument plate."""
    enamel_glaze(m, h)
    turning(m, 8, 1.3, '<rect width="8" height=".34" fill="%s" fill-opacity=".2"/>' % h['lit'])


def ground_basket(m, h):
    """Outreach: a basket-weave turning, the ground of a silver card case."""
    enamel_glaze(m, h)
    segs, s = [], 4.4
    for i in range(2):
        for j in range(2):
            x0, y0 = i * s, j * s
            for t in (0.9, 2.2, 3.5):
                if (i + j) % 2 == 0:
                    segs.append((x0 + 0.4, y0 + t, x0 + s - 0.4, y0 + t))
                else:
                    segs.append((x0 + t, y0 + 0.4, x0 + t, y0 + s - 0.4))
    turning(m, 8.8, 8.8, '<path d="%s" stroke="%s" stroke-width=".42" stroke-opacity=".3"/>' % (lines_path(segs), h['lit']))


def ground_halftone(m, h):
    """The Press Room: a halftone screen, the way a paper prints its
    pictures."""
    enamel_glaze(m, h)
    turning(m, 2.7, 2.7, '<circle cx="1.35" cy="1.35" r=".42" fill="%s" fill-opacity=".3"/>' % h['lit'], 'rotate(45 48 48)')


def ground_perlage(m, h):
    """Arsenal: perlage, the overlapping circles a machinist spots on a
    plate."""
    enamel_glaze(m, h)
    d, p, rh = [], 4.2, 4.2 * 0.86
    for j in range(-1, 4):
        for i in range(-1, 3):
            x = i * p + (p / 2 if j % 2 else 0)
            y = j * rh
            if -3 < x < p + 3 and -3 < y < 2 * rh + 3:
                d.append(circle_d(x, y, 2.9))
    turning(m, p, 2 * rh, '<path d="%s" stroke="%s" stroke-width=".34" stroke-opacity=".24" fill="none"/>'
            % (' '.join(d), h['lit']))


def ground_lattice(m, h):
    """Bourse: the lozenge lattice of its own page, a diamond in a diamond."""
    enamel_glaze(m, h)
    q = 1.2
    dia = ' '.join(poly_d([(cx, cy - q), (cx + q, cy), (cx, cy + q), (cx - q, cy)])
                   for cx, cy in ((3, 0), (0, 3), (6, 3), (3, 6)))
    turning(m, 6, 6, '<path d="M0 0 L6 6 M6 0 L0 6" stroke="%s" stroke-width=".4" stroke-opacity=".24"/>'
            '<path d="%s" stroke="%s" stroke-width=".3" stroke-opacity=".3" fill="none"/>' % (h['lit'], dia, h['lit']),
            'translate(48 51)')


SUBJECTS = {
    'autopilot': (ground_barleycorn, subject_autopilot, 'round'),
    'groundstation': (ground_lined, subject_groundstation, 'round'),
    'outreach': (ground_basket, subject_outreach, 'round'),
    'pressroom': (ground_halftone, subject_pressroom, 'kite'),
    'arsenal': (ground_perlage, subject_arsenal, 'round'),
    'bourse': (ground_lattice, subject_bourse, 'round'),
}
# Each charge sits inside a circle of about 39 units, so the enamel shows
# all round it and nothing is cropped by the fillet: (scale, centre).
FIT = {'autopilot': (0.92, 48.0, 40.0), 'outreach': (0.98, 48.0, 48.0)}


def lay_subject(m, app, h, small=False):
    k = FIT.get(app)
    if k:
        s, cx, cy = k
        m.add('<g transform="translate(%s %s) scale(%s) translate(%s %s)">' % (f(cx), f(cy), f(s), f(-cx), f(-cy)))
    SUBJECTS[app][1](m, h, small=small)
    if k:
        m.add('</g>')


def emblem(app):
    """The full mark, as SVG body markup on a 0 0 96 96 viewBox."""
    if app == 'atrium':
        return atrium_emblem()
    h = dict(HUE[app])
    m = Mark(app)
    paint, subject, stone = SUBJECTS[app]
    die_back(m, h)
    enamel_open(m, h, paint)
    lay_subject(m, app, h)
    enamel_close(m)
    crown(m, h['pop'], stone)
    return m.markup()


def emblem_small(app):
    """The small cut: the Ledger's sigil (20 to 35 px), the gate's cartouche
    on a laptop (under 40 px) and the 16/32/48 favicon. The same die and
    enamel and the same subject from the same geometry, cut to its biggest
    planes: fewer tones, no engraving, thin members drawn heavier."""
    h = HUE[app]
    m = Mark(app, '-s')
    lip = m.lin('lip', [(0, GILT[3]), (0.35, GILT[5]), (0.7, GILT[2]), (1, GILT[1])], 14, 12, 84, 86)
    m.add('<circle cx="48.9" cy="49.3" r="47.4" fill="#000" fill-opacity=".55"/>')
    m.add('<circle cx="48" cy="48" r="47.4" fill="%s"/>' % lip)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD + 1.2), GILT[0]))
    clip = m.clip('field', '<circle cx="48" cy="48" r="%s"/>' % f(R_FIELD))
    m.add('<g clip-path="%s">' % clip)
    enamel_glaze(m, h)
    lay_subject(m, app, h, small=True)
    m.add('<circle cx="48" cy="48" r="%s" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2.4"/>' % f(R_FIELD))
    m.add('</g>')
    m.add('<circle cx="48.5" cy="6.1" r="5.6" fill="#000" fill-opacity=".55"/><circle cx="48" cy="5.6" r="5.4" fill="%s"/>'
          '<circle cx="48" cy="5.6" r="3.6" fill="%s"/>' % (GILT[4], h['pop']))
    return m.markup()



# --------------------------------------------------------------------------
# The hall's own mark, unchanged from July: a keystone on gold.
# --------------------------------------------------------------------------
KEYSTONE = '<path d="M4 94 V44 A44 44 0 0 1 92 44 V94 Z"/>'


def atrium_emblem():
    h = ATRIUM
    scale = lambda s, fl: ('<g transform="translate(48,48) scale(%s) translate(-48,-48)" '
                           'fill="%s">%s</g>' % (s, fl, KEYSTONE))
    hair = lambda s, op: ('<g transform="translate(48,48) scale(%s) translate(-48,-48)" '
                          'fill="none" stroke="%s" stroke-opacity="%s" '
                          'stroke-width="1.4">%s</g>' % (s, h['ink'], op, KEYSTONE))
    gu = ''.join('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="0.7" stroke-opacity=".26"/>'
                 % (48 + 17 * math.cos(math.radians(i * 10)), 48 + 17 * math.sin(math.radians(i * 10)),
                    48 + 37 * math.cos(math.radians(i * 10)), 48 + 37 * math.sin(math.radians(i * 10)), h['ink'])
                 for i in range(36))
    ch = ''.join('<g transform="rotate(%d 48 48)" fill="none" stroke="%s" stroke-opacity=".5" stroke-width="1.4">'
                 '<path d="M41 12.5 L48 7 L55 12.5"/><path d="M43 17.5 L48 13.5 L53 17.5"/></g>' % (i * 90 + 45, h['ink'])
                 for i in range(4))
    glyph = ('<g fill="%s"><rect x="22" y="66" width="52" height="6"/>'
             '<path d="M28 66 L28 47 A20 20 0 0 1 68 47 L68 66 L59 66 L59 47 A11 11 0 0 0 37 47 L37 66 Z"/>'
             '<polygon points="48,16 58,26 48,36 38,26" fill="%s"/></g>' % (h['ink'], h['pop']))
    subject = '<g transform="translate(48,48) scale(0.86) translate(-48,-48)">%s</g>' % glyph
    return scale(1, h['deep']) + scale(0.855, h['field']) + hair(0.80, '.55') + hair(0.755, '.3') + gu + ch + subject


def svg_doc(body, pad=0, bg=None, size=96):
    if pad:
        k = 1 - 2 * pad / 96.0
        body = '<g transform="translate(48,48) scale(%.4f) translate(-48,-48)">%s</g>' % (k, body)
    ground = ('<rect width="96" height="96" fill="%s"/>' % bg) if bg else ''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="%d" height="%d">%s%s</svg>'
            % (size, size, ground, body))


# --------------------------------------------------------------------------
# Writing into the hall
# --------------------------------------------------------------------------
BEGIN = '  <!-- BEGIN generated marks (icons/gen.py) -->'
END = '  <!-- END generated marks -->'
CSS_BEGIN = '/* BEGIN generated velvets (icons/gen.py) */'
CSS_END = '/* END generated velvets */'


def defs_block():
    """The marks for the page's <defs>. Each full mark carries the ink its
    gate's day card is printed in (HUE's ink), which app.js reads from it."""
    rows = []
    for app in MARKS:
        rows.append('  <g id="mark-%s" data-ink="%s">%s</g>' % (app, HUE[app]['ink'], emblem(app)))
        rows.append('  <g id="mark-%s-s">%s</g>' % (app, emblem_small(app)))
    rows.append('  <g id="mark-atrium">%s</g>' % atrium_emblem())
    return BEGIN + '\n' + '\n'.join(rows) + '\n' + END


def velvet_block():
    lines = [CSS_BEGIN,
             '/* Each gate hangs its mark\'s own cloth, keyed on the service. The dyes',
             '   live beside the enamel in icons/gen.py HUE and are written here by it;',
             '   edit them there. A service with no mark hangs the house claret. */']
    for theme in ('onyx', 'ivory'):
        for app in MARKS:
            v = HUE[app]['velvet']
            lines.append(':root[data-theme="%s"] .gate[data-velvet="%s"] { --velvet: %s; }  /* %s */'
                         % (theme, app, v[theme], v['name']))
        lines.append(':root[data-theme="%s"] .gate[data-velvet="house"] { --velvet: %s; }  /* %s */'
                     % (theme, HOUSE_VELVET[theme], HOUSE_VELVET['name']))
    lines.append(CSS_END)
    return '\n'.join(lines)


def replace_between(src, begin, end, block, path):
    if begin not in src or end not in src:
        raise SystemExit('%s has no %r ... %r sentinels to write between' % (path, begin, end))
    head, rest = src.split(begin, 1)
    return head + block + rest.split(end, 1)[1]


def inside_repo(p):
    try:
        Path(p).resolve().relative_to(ROOT)
        return True
    except ValueError:
        return False


def guard(path, allow_outside=False):
    """Every file this script writes passes here: nothing lands outside this
    repository unless the caller says so in as many words."""
    if not allow_outside and not inside_repo(path):
        raise SystemExit('refusing to write outside %s: %s' % (ROOT, path))
    return path


def write_text(path, text, allow_outside=False, newline=None):
    """Write in text mode so a CRLF checkout round-trips, and never outside
    this repository."""
    with io.open(guard(path, allow_outside), 'w', encoding='utf-8', newline=newline) as fh:
        fh.write(text)


def write_atrium_defs():
    src = io.open(ATRIUM_INDEX, encoding='utf-8').read()
    write_text(ATRIUM_INDEX, replace_between(src, BEGIN, END, defs_block(), ATRIUM_INDEX))
    print('  hall defs    -> %s' % ATRIUM_INDEX)


def write_velvets():
    src = io.open(VELVET_CSS, encoding='utf-8').read()
    write_text(VELVET_CSS, replace_between(src, CSS_BEGIN, CSS_END, velvet_block(), VELVET_CSS))
    print('  velvet dyes  -> %s' % VELVET_CSS)


# --------------------------------------------------------------------------
# Brand directories (opt-in; see the module docstring)
# --------------------------------------------------------------------------
RASTER = [16, 24, 32, 48, 64, 128, 180, 192, 256, 512]


def shim_ready():
    return 'atrium-wt/_kit/shim' in os.environ.get('NODE_PATH', '').replace('\\', '/')


def rasterise(jobs):
    """jobs: [(svg_text, size, out_png)]. One browser for the whole batch,
    launched by icons/raster.js through the kit's shim."""
    if not shim_ready():
        raise SystemExit('rasterising needs NODE_PATH=/x/Github/atrium-wt/_kit/shim (a seeded browser profile)')
    with tempfile.TemporaryDirectory() as tmp:
        spec = []
        for i, (svg, size, out) in enumerate(jobs):
            src = os.path.join(tmp, '%d.svg' % i)
            io.open(src, 'w', encoding='utf-8').write(svg)
            spec.append({'svg': src, 'size': size, 'out': str(out)})
        manifest = os.path.join(tmp, 'jobs.json')
        io.open(manifest, 'w', encoding='utf-8').write(json.dumps(spec))
        subprocess.run(['node', str(RASTER_JS), manifest], check=True)


def build(app, outdir, allow_outside=False):
    from PIL import Image
    guard(outdir, allow_outside)
    os.makedirs(outdir, exist_ok=True)
    body = emblem_small(app) if app != 'atrium' else atrium_emblem()
    full = emblem(app) if app != 'atrium' else body
    deep = HUE[app]['deep'] if app in HUE else ATRIUM['deep']
    write_text(os.path.join(outdir, 'icon.svg'), svg_doc(full), allow_outside)
    jobs = [(svg_doc(full if s >= 64 else body, size=s), s, os.path.join(outdir, '_r%d.png' % s)) for s in RASTER]
    jobs.append((svg_doc(full, pad=18, bg=deep, size=512), 512, os.path.join(outdir, '_mask.png')))
    rasterise(jobs)
    pngs = {s: Image.open(os.path.join(outdir, '_r%d.png' % s)).convert('RGBA') for s in RASTER}
    flat = Image.new('RGB', (180, 180), deep)
    flat.paste(pngs[180], (0, 0), pngs[180])
    flat.save(os.path.join(outdir, 'apple-touch-icon.png'))
    pngs[192].save(os.path.join(outdir, 'icon-192.png'))
    pngs[512].save(os.path.join(outdir, 'icon-512.png'))
    Image.open(os.path.join(outdir, '_mask.png')).convert('RGB').save(os.path.join(outdir, 'icon-mask.png'))
    ico = [pngs[s] for s in (256, 128, 64, 48, 32, 24, 16)]
    ico[0].save(os.path.join(outdir, 'favicon.ico'), format='ICO',
                sizes=[(s, s) for s in (256, 128, 64, 48, 32, 24, 16)], append_images=ico[1:])
    for s in RASTER:
        os.remove(os.path.join(outdir, '_r%d.png' % s))
    os.remove(os.path.join(outdir, '_mask.png'))
    names = HUE.get(app, {'name': 'Atrium', 'short': 'Atrium'})
    chrome_bg = CHROME_BG.get(app, deep)
    with io.open(guard(os.path.join(outdir, 'manifest.webmanifest'), allow_outside), 'w', encoding='utf-8') as fh:
        json.dump({
            'name': names['name'], 'short_name': names['short'], 'start_url': '/', 'display': 'standalone',
            'background_color': SPLASH_BG.get(app, chrome_bg), 'theme_color': chrome_bg,
            'icons': [
                {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
                {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                {'src': 'icon-mask.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
            ],
        }, fh, indent=2)
        fh.write('\n')
    print('  %-14s -> %s' % (app, outdir))


SYM_BEGIN = '    <!-- BEGIN generated app mark (icons/gen.py) -->'
SYM_END = '    <!-- END generated app mark -->'


def write_app_symbol(app, allow_outside=False):
    """Rewrite the inline <symbol id="applogo"> in the app's own page (in
    another repository, so only with allow_outside)."""
    path = SYMBOL_TARGETS.get(app)
    if not path:
        return
    guard(path, allow_outside)
    block = '%s\n    <symbol id="applogo" viewBox="0 0 96 96">%s</symbol>\n%s' % (SYM_BEGIN, emblem(app), SYM_END)
    src = io.open(path, encoding='utf-8').read()
    src = replace_between(src, SYM_BEGIN, SYM_END, block, path)
    write_text(path, src, allow_outside, newline='\n')
    print('  %-14s -> %s (inline mark)' % (app, path))


def main(argv):
    ap = argparse.ArgumentParser(description='Draw the app marks into the hall; optionally build brand directories.')
    ap.add_argument('--brand', nargs='+', metavar='APP', help='also build these apps\' brand directories')
    ap.add_argument('--out', help='with one --brand app: build into this directory instead of the app\'s own')
    ap.add_argument('--allow-outside-repo', action='store_true',
                    help='let --brand write outside this repository (the apps\' own checkouts)')
    args = ap.parse_args(argv)
    if args.brand:
        unknown = [a for a in args.brand if a not in TARGETS]
        if unknown:
            ap.error('unknown app(s): %s (known: %s)' % (', '.join(unknown), ', '.join(TARGETS)))
        if args.out and len(args.brand) != 1:
            ap.error('--out takes exactly one --brand app')
        if not shim_ready():
            ap.error('--brand rasterises through the kit: set NODE_PATH=/x/Github/atrium-wt/_kit/shim')
        for app in args.brand:
            out = Path(args.out).resolve() if args.out else Path(TARGETS[app])
            if not inside_repo(out) and not args.allow_outside_repo:
                ap.error('%s is outside %s; pass --allow-outside-repo to write there' % (out, ROOT))
        for app in args.brand:
            out = Path(args.out).resolve() if args.out else Path(TARGETS[app])
            build(app, str(out), args.allow_outside_repo)
            if args.allow_outside_repo and not args.out:
                write_app_symbol(app, allow_outside=True)
    write_atrium_defs()
    write_velvets()
    print('done')


if __name__ == '__main__':
    main(sys.argv[1:])
