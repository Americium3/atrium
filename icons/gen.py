"""The six app marks and their house curtains, from one source.

Each mark is a 1930s enamelled badge cut from one die: a plain turned gilt
lip with one groove, translucent enamel fired over an engine-turned ground,
and a stone in a collet at the crown. The die is shared; the enamel, the
turning under it and the stone are each app's own.

Inside the die each app carries one charge, seen from the same place (level
with it or a few degrees above) and lit by the one key light, up and to the
left: a globe, a dish, a shelf of bound volumes, three calling cards, a
gunner's quadrant, a canary in its cage. Each is drawn from the real
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
# Ground Station: the earth station's dish, turned up to the sky it listens to
# --------------------------------------------------------------------------
DISH = {'vx': 41.0, 'vy': 41.5, 'r': 27.0, 'F': 0.6, 'el': 42.0, 'az': 28.0}
PAINT = ['#5d5f60', '#9d9a92', '#d6d0c2', '#f6f0e2']       # white-painted steel: dark, shade, body, lit
PAINT_CUTS = [0.22, 0.5, 0.8]


def dish_frame():
    d = DISH
    el, az = math.radians(d['el']), math.radians(d['az'])
    a = (math.cos(el) * math.cos(az), math.sin(el), math.cos(el) * math.sin(az))   # world, y up
    v = S.View(0, 0, 1.0, yaw=0, pitch=PITCH)
    A = S.norm(v.rot(a))                                    # view space, y up, z to the reader
    U, W, _ = S.basis(A)
    return A, U, W


def subject_groundstation(m, h, small=False):
    """An earth station's dish, the object the app is named for: a deep
    paraboloid of white-painted steel turned up and to the right, its bowl
    cut into planes by the key light (lit where it faces up and left, in
    shade where it turns away), four struts carrying the subreflector at the
    focus, and an elevation yoke on a turned pedestal. Nothing in the sky:
    the dish says it is listening."""
    d = DISH
    A, U, W = dish_frame()
    Rd, Fp = d['r'], d['F'] * d['r']
    V = (d['vx'], -d['vy'], 0.0)                           # the vertex, view space (y up)

    def hit(x, y):
        """The dish surface under screen point (x, y), nearest the reader:
        (lit, facing the reader with its inside, signed edge value). The
        edge value is negative on the dish and changes sign smoothly both at
        the rim and where the bowl's back turns away, so the outline traces
        clean."""
        D0 = (x - V[0], -y - V[1], -V[2])
        du, dw, da = S.dot(D0, U), S.dot(D0, W), S.dot(D0, A)
        a2 = U[2] ** 2 + W[2] ** 2
        b = 2 * (du * U[2] + dw * W[2] - 2 * Fp * A[2])
        c = du * du + dw * dw - 4 * Fp * da
        disc = b * b - 4 * a2 * c
        k = 1.0 / (4 * Fp * Rd)
        if disc < 0:
            return None, math.sqrt(-disc) * k
        best, edge = None, 1e9
        for t in ((-b + math.sqrt(disc)) / (2 * a2), (-b - math.sqrt(disc)) / (2 * a2)):
            qu, qw = du + t * U[2], dw + t * W[2]
            rho = (qu * qu + qw * qw) / (Rd * Rd)
            edge = min(edge, rho - 1.0)
            if rho <= 1.0 and (best is None or t > best[0]):
                best = (t, qu, qw)
        if best is None:
            return None, edge
        _, qu, qw = best
        n = S.norm(S.add(S.add(S.mul(U, -qu / (2 * Fp)), S.mul(W, -qw / (2 * Fp))), A))
        inside = n[2] > 0
        if not inside:
            n = S.mul(n, -1)
        return (lam(n), inside), max(edge, -math.sqrt(disc) * k)

    def sil(x, y):
        return hit(x, y)[1]

    def light(x, y):
        r = hit(x, y)[0]
        if r is None:
            return 0.0
        return r[0] if r[1] else r[0] * 0.55

    def proj(p):
        return (p[0], -p[1])

    def dish_pt(u, w, a_off=0.0):
        qa = (u * u + w * w) / (4 * Fp) + a_off
        return S.add(S.add(S.add(V, S.mul(U, u)), S.mul(W, w)), S.mul(A, qa))

    rim = [proj(dish_pt(Rd * math.cos(2 * math.pi * k / 72), Rd * math.sin(2 * math.pi * k / 72))) for k in range(72)]
    xs, ys = [p[0] for p in rim], [p[1] for p in rim]
    box = (min(xs) - 3, min(ys) - 3, max(xs) + 3, max(ys) + 3)
    step = 0.7 if small else 0.4
    # -- the mount: a turned pedestal, a turntable and the elevation yoke ------
    base_y = 81.5
    px = d['vx'] - 1.0
    fc = S.Faces()
    sv = S.View(px, base_y, 1.0, yaw=0, pitch=PITCH)
    prof = [(0.0, 2.0, 11.0, 11.0), (2.0, 3.3, 11.0, 8.8), (3.3, 4.6, 7.0, 7.0),
            (4.6, 23.0, 5.8, 4.4), (23.0, 25.4, 7.4, 7.4)]
    cuts = [0.22, 0.5, 0.8]
    for y0, y1, r0, r1 in prof:
        n = 20 if small else 36
        for k in range(n):
            p0, p1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            pm = (p0 + p1) / 2
            nv = sv.nrm((math.cos(pm), (r0 - r1) / max(0.01, y1 - y0), math.sin(pm)))
            if nv[2] <= 0:
                continue
            q = [sv.proj((r0 * math.cos(p0), y0, r0 * math.sin(p0))), sv.proj((r0 * math.cos(p1), y0, r0 * math.sin(p1))),
                 sv.proj((r1 * math.cos(p1), y1, r1 * math.sin(p1))), sv.proj((r1 * math.cos(p0), y1, r1 * math.sin(p0)))]
            fc.add([(a, b) for a, b, _ in q], sum(z for _, _, z in q) / 4, facet(lam(nv), PAINT, cuts))
        top = [sv.proj((r1 * math.cos(2 * math.pi * k / n), y1, r1 * math.sin(2 * math.pi * k / n))) for k in range(n)]
        fc.add([(a, b) for a, b, _ in top], sum(z for _, _, z in top) / n - 0.5, facet(lam(sv.nrm((0, 1, 0))), PAINT, cuts))
    foot = [sv.proj((11 * math.cos(2 * math.pi * k / 40), 0, 11 * math.sin(2 * math.pi * k / 40)))[:2] for k in range(40)]
    m.add(shadow(poly_d(foot), 1.2, 1.0, 0.45))
    m.add(fc.svg(seam=0.12))
    # the yoke: a cast block rising from the turntable to the elevation
    # axle behind the bowl, its lit face toward the key light
    ty = sv.proj((0, 25.4, 0))[1]
    axle = proj(S.add(V, S.mul(A, -1.5)))
    x0l, x0r, x1l, x1r = px - 6.2, px + 6.2, axle[0] - 4.2, axle[0] + 4.2
    mid0, mid1 = px - 1.2, axle[0] - 0.8
    block = 'M%s %s L%s %s L%s %s L%s %s Z' % (f(x0l), f(ty + 0.6), f(x1l), f(axle[1]), f(x1r), f(axle[1]), f(x0r), f(ty + 0.6))
    m.add(shadow(block, 0.8, 1.0, 0.45))
    m.add('<path d="%s" fill="%s"/>' % (block, PAINT[1]))
    m.add('<path d="M%s %s L%s %s L%s %s L%s %s Z" fill="%s"/>'
          % (f(x0l), f(ty + 0.6), f(x1l), f(axle[1]), f(mid1), f(axle[1]), f(mid0), f(ty + 0.6), PAINT[3]))
    # -- the bowl ----------------------------------------------------------------
    outline = S.region_d(sil, box, step, 0.1)
    m.add(shadow(outline, 1.6, 2.2, 0.5))
    m.add(planes(m, 'bowl', outline, light, box, PAINT, PAINT_CUTS, step))
    # the rim: a rolled lip, lit where its edge faces up and left
    lip = []
    for k in range(72):
        (x0, y0), (x1, y1) = rim[k], rim[(k + 1) % 72]
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        c = (sum(xs) / 72, sum(ys) / 72)
        nx, ny = mx - c[0], my - c[1]
        ln = math.hypot(nx, ny) or 1
        lip.append((x0, y0, x1, y1, facet(lam((nx / ln, -ny / ln, 0.45)), PAINT, PAINT_CUTS)))
    for tone in sorted(set(e[4] for e in lip)):
        m.add('<path d="%s" stroke="%s" stroke-width="%s" stroke-linecap="round" fill="none"/>'
              % (lines_path([e[:4] for e in lip if e[4] == tone]), tone, '1.6' if small else '1.1'))
    # the feed horn at the vertex and the subreflector at the focus on four struts
    foc = S.add(V, S.mul(A, Fp * 0.92))
    fp = proj(foc)
    if not small:
        horn0, horn1 = proj(S.add(V, S.mul(A, 0.8))), proj(S.add(V, S.mul(A, 4.2)))
        m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width="2.6" stroke-linecap="butt"/>'
              % (f(horn0[0]), f(horn0[1]), f(horn1[0]), f(horn1[1]), PAINT[1]))
    legs = []
    for deg in (45, 135, 225, 315):
        t = math.radians(deg)
        p = proj(dish_pt(Rd * 0.97 * math.cos(t), Rd * 0.97 * math.sin(t)))
        legs.append((p[0], p[1], fp[0], fp[1]))
    m.add('<path d="%s" stroke="#000" stroke-opacity=".35" stroke-width="%s" transform="translate(.5 .7)"/>'
          % (lines_path(legs), '2' if small else '1.1'))
    m.add('<path d="%s" stroke="%s" stroke-width="%s" stroke-linecap="round"/>'
          % (lines_path(legs), PAINT[2], '1.7' if small else '0.9'))
    # the subreflector: a small convex disc facing back into the bowl; we see its back
    sub = [proj(S.add(foc, S.add(S.mul(U, 3.4 * math.cos(2 * math.pi * k / 32)), S.mul(W, 3.4 * math.sin(2 * math.pi * k / 32)))))
           for k in range(32)]
    m.add(shadow(poly_d(sub), 0.6, 0.9, 0.45))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(sub), facet(lam(A), PAINT, PAINT_CUTS)))
    if not small:
        sub2 = [((x - fp[0]) * 0.55 + fp[0] - 0.4, (y - fp[1]) * 0.55 + fp[1] - 0.4) for x, y in sub]
        m.add('<path d="%s" fill="%s"/>' % (poly_d(sub2), PAINT[3]))


# --------------------------------------------------------------------------
# Anime Autopilot: the season's shelf, bound volumes on a mahogany plank
# --------------------------------------------------------------------------
# Book cloths as the eye remembers them, each in four planes: dark, shade,
# body and lit.
CLOTHS = {
    'vellum':  ['#6a5a40', '#a8966e', '#d8c8a0', '#f4e8c6'],
    'bottle':  ['#0c2016', '#1a4430', '#2c6a48', '#5a9a72'],
    'morocco': ['#3c0c0a', '#7c2218', '#b23c2c', '#e27a5c'],
    'navy':    ['#0a1622', '#16324a', '#27526e', '#4c7c9a'],
    'calf':    ['#3a2210', '#6e4420', '#a26c36', '#d69e62'],
}
LEAF = ['#8a7a5a', '#cfc2a0', '#efe4c6']                 # the page block's top: shade, body, lit
PLANK = ['#2c1107', '#5c2b12', '#8e4c24', '#c27a46']
SPINE_CUTS = [0.14, 0.44, 0.66]
SHELF = {'x0': 19.0, 'x1': 78.0, 'y': 72.5, 'face': 5.0, 'depth': 30.0, 'setback': 10.0}


def spine_columns(w, groove):
    """Where the rounded back turns from one plane to the next, left to
    right: (x0, x1, tone index). The back's normal swings from 65 degrees
    left to 65 degrees right across it."""
    inner0, inner1 = groove, w - groove
    cols, cur, start = [], None, inner0
    n = 60
    for k in range(n + 1):
        x = inner0 + (inner1 - inner0) * k / n
        s = (x - w / 2) / ((inner1 - inner0) / 2)
        ph = math.asin(max(-1.0, min(1.0, s * math.sin(math.radians(65)))))
        t = 0
        l_ = lam((math.sin(ph), 0.0, math.cos(ph)))
        for i, c in enumerate(SPINE_CUTS):
            if l_ >= c:
                t = i + 1
        if cur is None:
            cur = t
        elif t != cur:
            cols.append((start, x, cur))
            start, cur = x, t
    cols.append((start, inner1, cur))
    return cols


def volume(m, x0, yb, w, hgt, cloth, bands=(), label=None, rules=False, lean=0.0, small=False):
    """One bound volume standing on the shelf, spine out: the rounded back in
    its planes between the two joints, the board edges, raised cords with
    their lit upper and shaded lower faces, a leather label onlay, and the
    head seen a little from above (the boards' top edges, the page block set
    down between them, the headcap turned over at the front). Local frame:
    (x0, yb) is the bottom left of the spine; lean turns the volume about its
    bottom right corner, in degrees."""
    T = CLOTHS[cloth]
    depth = 18.0
    hp = depth * math.sin(math.radians(PITCH))          # the head, seen from a little above
    groove = 0.0 if small else min(0.95, w * 0.12)
    out = []
    # the head: boards' top edges, the page block set down between them
    out.append('<path d="M0 %s H%s V%s H0 Z" fill="%s"/>' % (f(-hgt), f(w), f(-hgt - hp), T[2]))
    if not small:
        tb = max(0.6, w * 0.1)
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(tb), f(-hgt - 0.1), f(w - tb), f(-hgt - hp + 0.5), f(tb), LEAF[2]))
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(w * 0.62), f(-hgt - 0.1), f(w - tb), f(-hgt - hp + 0.5), f(w * 0.62), LEAF[1]))
        out.append('<path d="M%s %s Q%s %s %s %s V%s Q%s %s %s %s Z" fill="%s"/>'
                   % (f(tb * 0.6), f(-hgt), f(w / 2), f(-hgt - 1.6), f(w - tb * 0.6), f(-hgt),
                      f(-hgt + 0.2), f(w / 2), f(-hgt - 0.9), f(tb * 0.6), f(-hgt + 0.2), T[3]))
    else:
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(w * 0.15), f(-hgt - 0.2), f(w * 0.85), f(-hgt - hp + 0.4), f(w * 0.15), LEAF[2]))
    # the spine: board edges, the joints, the rounded back in its planes
    out.append('<path d="M0 0 H%s V%s H0 Z" fill="%s"/>' % (f(w), f(-hgt), T[0]))
    cols = [(0.0, w, 2)] if small and w < 7 else spine_columns(w, groove)
    if small:
        cols = [(0.0, w * 0.4, 3), (w * 0.4, w * 0.78, 2), (w * 0.78, w, 1)]
    for a, b, t in cols:
        out.append('<path d="M%s 0 H%s V%s H%s Z" fill="%s"/>' % (f(a), f(b), f(-hgt), f(a), T[t]))
    if groove:
        out.append('<path d="M0 0 H%s V%s H0 Z" fill="%s"/>' % (f(groove * 0.55), f(-hgt), T[2]))
        out.append('<path d="M%s 0 H%s V%s H%s Z" fill="%s"/>' % (f(w - groove * 0.55), f(w), f(-hgt), f(w - groove * 0.55), T[1]))
    # raised cords: each a ridge, its upper face lit, its lower face in shade
    for y in bands:
        yy = -hgt * y
        if small:
            out.append('<path d="M0 %s H%s V%s H0 Z" fill="%s"/>' % (f(yy), f(w), f(yy - 2.2), T[3]))
            continue
        for a, b, t in cols:
            out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(a), f(yy - 0.75), f(b), f(yy - 1.5), f(a), T[min(3, t + 1)]))
            out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(a), f(yy), f(b), f(yy - 0.75), f(a), T[max(0, t - 2)]))
        out.append('<path d="M%s %s H%s M%s %s H%s" stroke="%s" stroke-width=".32" stroke-opacity=".85"/>'
                   % (f(groove), f(yy - 1.95), f(w - groove), f(groove), f(yy + 0.45), f(w - groove), GILT[5]))
    if label and not small:
        y0, y1, col = label
        ya, yb2 = -hgt * y0, -hgt * y1
        lc = [darken(col, 0.55), darken(col, 0.25), col]
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(groove + 0.3), f(ya), f(w - groove - 0.3), f(yb2), f(groove + 0.3), lc[1]))
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(groove + 0.3), f(ya), f(w * 0.45), f(yb2), f(groove + 0.3), lc[2]))
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(w * 0.8), f(ya), f(w - groove - 0.3), f(yb2), f(w * 0.8), lc[0]))
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="none" stroke="%s" stroke-width=".3" stroke-opacity=".9"/>'
                   % (f(groove + 0.9), f(ya - 0.6), f(w - groove - 0.9), f(yb2 + 0.6), f(groove + 0.9), GILT[5]))
    if rules and not small:
        for y in (0.08, 0.92):
            yy = -hgt * y
            out.append('<path d="M%s %s H%s M%s %s H%s" stroke="%s" stroke-width=".35" stroke-opacity=".8"/>'
                       % (f(groove), f(yy), f(w - groove), f(groove), f(yy - 0.9), f(w - groove), GILT[5]))
    body = ''.join(out)
    tf = 'translate(%s %s)' % (f(x0), f(yb))
    if lean:
        tf += ' rotate(%s %s 0)' % (f(lean), f(w))
    sil = 'M0 0 H%s V%s H0 Z' % (f(w), f(-hgt - hp))
    return ('<g transform="%s"><path d="%s" fill="#000" fill-opacity=".45" transform="translate(.7 .3)"/>%s</g>'
            % (tf, sil, body))


def lying(m, x0, yb, length, th, cloth, small=False):
    """A volume lying flat, spine out: its rounded back in horizontal planes
    (the upper half turned to the light), and its top board seen from a
    little above."""
    T = CLOTHS[cloth]
    hp = 18.0 * math.sin(math.radians(PITCH))
    out = ['<path d="M%s %s H%s V%s H%s Z" fill="#000" fill-opacity=".45" transform="translate(.7 .5)"/>'
           % (f(x0), f(yb), f(x0 + length), f(yb - th - hp), f(x0))]
    out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(x0), f(yb - th), f(x0 + length), f(yb - th - hp), f(x0), T[2]))
    bands = [(0.0, 0.3, 0), (0.3, 0.62, 1), (0.62, 0.86, 2), (0.86, 1.0, 3)] if not small else [(0, 0.45, 1), (0.45, 1, 3)]
    for a, b, t in bands:
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(x0), f(yb - th * a), f(x0 + length), f(yb - th * b), f(x0), T[t]))
    if not small:
        for fx in (0.16, 0.84):
            out.append('<path d="M%s %s V%s" stroke="%s" stroke-width=".35" stroke-opacity=".8"/>'
                       % (f(x0 + length * fx), f(yb - 0.5), f(yb - th + 0.5), GILT[5]))
    return ''.join(out)


def subject_autopilot(m, h, small=False):
    """The season's shelf: bound volumes standing on a mahogany plank, the
    way the app shelves a season while the owner sleeps. A tall red morocco
    volume leads, with its cords and label; vellum, bottle-green cloth and
    navy buckram stand beside it at their own heights; the last volume in
    calf leans on its neighbour, and two lie flat at the end. Each spine is
    a rounded back cut into planes by the key light, with its head seen from
    a little above."""
    sh = SHELF
    sb = sh['setback'] * math.sin(math.radians(PITCH))
    top_back = sh['y'] - sh['depth'] * math.sin(math.radians(PITCH))
    yb = sh['y'] - sb                                   # where the volumes stand
    x0, x1 = sh['x0'], sh['x1']
    # the plank: its top seen from a little above, a bullnose front
    m.add(shadow('M%s %s H%s V%s H%s Z' % (f(x0), f(top_back), f(x1), f(sh['y'] + sh['face']), f(x0)), 1.2, 1.6, 0.5))
    m.add('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(x0), f(top_back), f(x1), f(sh['y']), f(x0), PLANK[2]))
    m.add('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(x0), f(sh['y']), f(x1), f(sh['y'] + sh['face'] * 0.45), f(x0), PLANK[3]))
    m.add('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>'
          % (f(x0), f(sh['y'] + sh['face'] * 0.45), f(x1), f(sh['y'] + sh['face']), f(x0), PLANK[1]))
    if not small:
        m.add('<path d="M%s %s H%s" stroke="%s" stroke-width=".4"/>' % (f(x0), f(sh['y'] + sh['face'] - 0.2), f(x1), PLANK[0]))
    # the volumes, left to right
    lean = 12.0
    books = [  # x, width, height, cloth, cords, label, rules
        (29.4, 9.4, 42.0, 'vellum', (), (0.8, 0.9, '#6e2a20'), False),
        (38.8, 7.8, 35.5, 'bottle', (), None, True),
        (46.6, 12.2, 50.0, 'morocco', (0.18, 0.38, 0.58, 0.8), (0.62, 0.76, '#1c1410'), False),
        (58.8, 8.6, 39.0, 'navy', (), (0.72, 0.84, '#8a2a22'), True),
    ]
    lh, lw = 37.0, 8.2
    px = books[0][0] - lh * math.sin(math.radians(lean)) - 0.2
    m.add(volume(m, px - lw, yb, lw, lh, 'calf', (0.22, 0.46, 0.7), None, False, lean=lean, small=small))
    for x, w, hh, cloth, cords, label, rules in books:
        m.add(volume(m, x, yb, w, hh, cloth, cords, label, rules, small=small))
    m.add(bookend(m, 67.4, yb, 10.4, 24.0, small))


BRASS = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]


def bookend(m, x0, yb, w, hgt, small=False):
    """The brass bookend the app's opening sets down before any volume
    rises: a cast quarter fan, its flat back to the books and its sweep to
    the open shelf, fluted from the heel."""
    n = 28
    arc = [(x0 + w * math.sin(math.pi / 2 * k / n), yb - hgt * math.cos(math.pi / 2 * k / n)) for k in range(n + 1)]
    sil = 'M%s %s L%s Z' % (f(x0), f(yb), ' L'.join('%s %s' % (f(x), f(y)) for x, y in arc))
    out = [shadow(sil, 0.9, 0.6, 0.45), '<path d="%s" fill="%s"/>' % (sil, BRASS[2])]
    # the lip round the sweep, lit where it turns up to the key light
    inner = [(x0 + (x - x0) * 0.86, yb - (yb - y) * 0.86) for x, y in arc]
    for k in range(n):
        a = math.pi / 2 * (k + 0.5) / n
        nx, ny = math.sin(a) * hgt, -math.cos(a) * w
        ln = math.hypot(nx, ny)
        t = facet(lam((nx / ln, -ny / ln, 0.5)), BRASS, [0.18, 0.45, 0.7, 0.9])
        out.append('<path d="%s" fill="%s"/>' % (poly_d([arc[k], arc[k + 1], inner[k + 1], inner[k]]), t))
    if not small:
        # flutes from the heel, each a groove: its shaded wall and its lit wall
        for a in (18, 36, 54, 72):
            t = math.radians(a)
            ex, ey = x0 + w * 0.84 * math.sin(t), yb - hgt * 0.84 * math.cos(t)
            hx, hy = x0 + w * 0.22 * math.sin(t), yb - hgt * 0.22 * math.cos(t)
            out.append('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".8"/>' % (f(hx), f(hy), f(ex), f(ey), BRASS[0]))
            out.append('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".45"/>'
                       % (f(hx + 0.55), f(hy + 0.2), f(ex + 0.55), f(ey + 0.2), BRASS[4]))
        out.append('<path d="M%s %s H%s" stroke="%s" stroke-width=".9"/>' % (f(x0), f(yb - 0.45), f(x0 + w), BRASS[1]))
    return ''.join(out)


# --------------------------------------------------------------------------
# Outreach Desk: the day's introductions, three calling cards dealt in a fan
# --------------------------------------------------------------------------
# The page grades every person P1, P2 or P3, and prints the grades as a gold
# badge, a sky-blue badge and an outlined one. The cards take those stocks:
# each as face, shade (the turned flap, its underside) and the bevel's dark.
STOCKS = {  # face, a shade for the turned flap, the plate mark's shadow, its light
    'p1': ['#f8f3e6', '#d8ceb4', '#b8ab8c', '#ffffff'],     # the first call: ivory, gilt-edged
    'p2': ['#dcecf6', '#a8c8dc', '#8aaec6', '#f4fbff'],     # the second: sky
    'p3': ['#ece2c8', '#cdbf9c', '#b0a27e', '#fbf5e6'],     # the third: plain bone
}
FAN = {'px': 28.0, 'py': 71.5, 'w': 49.0, 'h': 28.5, 'angles': (-40.0, -23.0, -6.0)}


def card(m, name, stock, ang, gilt=0.0, fold=False, portrait=False, small=False):
    """One engraved calling card: square cornered, blank, its engraved plate
    pressed into the stock as a sunk panel (lit on its lower and right walls,
    shaded on its upper and left), and, on the finest, a gilt bevel round the
    edge. With fold, its lower right corner is turned up across a real
    crease: the flap shows the card's underside and throws a shadow on the
    face."""
    fa = FAN
    T = STOCKS[stock]
    w, hh = fa['w'], fa['h']
    x0, y0, x1, y1 = -4.0, -hh + 4.0, w - 4.0, 4.0        # local: pivot at the origin, y down
    c = 9.0                                            # the fold's leg
    if fold:
        face = [(x0, y0), (x1, y0), (x1, y1 - c), (x1 - c, y1), (x0, y1)]
    else:
        face = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    a = math.radians(ang)

    def lit_of(nx, ny, nz=0.6):
        rx, ry = nx * math.cos(a) - ny * math.sin(a), nx * math.sin(a) + ny * math.cos(a)
        return lam((rx, -ry, nz))
    out = [shadow(poly_d(face), 1.1, 1.5, 0.42)]
    # the stock's thickness, a hair below and right of the face
    out.append('<path d="%s" fill="%s" transform="translate(.35 .45)"/>' % (poly_d(face), T[2]))
    out.append('<path d="%s" fill="%s"/>' % (poly_d(face), T[0]))
    inner_parts = []
    if not small:
        if gilt:
            bw = gilt
            inner = [(x0 + bw, y0 + bw), (x1 - bw, y0 + bw), (x1 - bw, y1 - bw), (x0 + bw, y1 - bw)]
            outer = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
            normals = [(0, -1), (1, 0), (0, 1), (-1, 0)]
            gold = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
            for k in range(4):
                nx, ny = normals[k]
                t = facet(lit_of(nx, ny), gold, [0.18, 0.45, 0.7, 0.9])
                inner_parts.append('<path d="%s" fill="%s"/>' % (poly_d([outer[k], outer[(k + 1) % 4], inner[(k + 1) % 4], inner[k]]), t))
    elif gilt:
        inner_parts.append('<path d="%s" fill="none" stroke="%s" stroke-width="2.2"/>' % (poly_d([(x0, y0), (x1, y0), (x1, y1), (x0, y1)]), GILT[4]))
    if inner_parts:
        out.append('<g clip-path="%s">%s</g>' % (m.clip(name + '-face', '<path d="%s"/>' % poly_d(face)), ''.join(inner_parts)))
    if portrait:
        out.append(sitter(m, name, x0 + 3.6, y0 + 3.4, 19.5, small))
    if fold:
        # the flap: the corner turned up over the face, its underside showing
        flap = [(x1 - c, y1), (x1, y1 - c), (x1 - c, y1 - c)]
        out.append('<path d="%s" fill="#000" fill-opacity=".3" transform="translate(1 1.3)"/>' % poly_d(flap))
        out.append('<path d="%s" fill="%s"/>' % (poly_d(flap), T[1]))
        if gilt and not small:
            out.append('<path d="M%s %s L%s %s L%s %s" stroke="%s" stroke-width="%s" fill="none"/>'
                       % (f(x1 - c), f(y1), f(x1 - c), f(y1 - c), f(x1), f(y1 - c), GILT[2], f(gilt)))
        out.append('<path d="M%s %s L%s %s" stroke="%s" stroke-width="%s" stroke-linecap="round"/>'
                   % (f(x1 - c), f(y1), f(x1), f(y1 - c), T[2], '1' if small else '.45'))
    return '<g transform="translate(%s %s) rotate(%s)">%s</g>' % (f(fa['px']), f(fa['py']), f(ang), ''.join(out))


# A sitter in profile, cut as the old silhouette-cutters cut a likeness: the
# head, the brow and nose and lips and chin, the neck in its collar and the
# bust truncated in a curve. Local units, head facing right, crown at y 0.
SITTER = [(4.0, 0.0), (6.3, 0.6), (7.6, 1.9), (8.1, 3.3), (8.25, 4.25), (8.05, 4.8), (8.6, 5.7), (9.15, 6.55),
          (8.75, 6.88), (8.35, 6.97), (8.52, 7.42), (8.25, 7.76), (8.42, 8.06), (8.05, 8.52), (8.32, 9.2),
          (7.9, 9.85), (6.9, 10.12), (6.3, 10.6), (6.2, 11.6), (6.5, 12.6), (8.0, 13.6), (9.4, 15.2, 1),
          (4.0, 16.5), (-0.6, 15.9, 1), (-0.7, 14.6), (0.6, 13.0), (1.6, 11.8), (2.2, 10.2), (1.4, 8.8),
          (0.4, 7.0), (0.2, 5.0), (0.8, 2.8), (2.2, 0.9)]


def sitter(m, name, x, y, hgt, small=False):
    """An upright oval cameo set in the card: a sitter's likeness in white
    relief on jasper blue, the way a portrait medallion was cut. The
    introduction is a person."""
    rx, ry = hgt * 0.37, hgt * 0.5
    cx, cy = x + rx, y + ry
    out = ['<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(cx), f(cy), f(rx), f(ry), JASPER[1])]
    k = hgt / 19.0
    pts = [((px - 4.3) * k + cx, (py - 7.6) * k + cy) + tuple(p[2:]) for p in SITTER for px, py in [p[:2]]]
    d = smooth_d(pts)
    clip = m.clip(name + '-oval', '<ellipse cx="%s" cy="%s" rx="%s" ry="%s"/>' % (f(cx), f(cy), f(rx), f(ry)))
    body = ''
    if not small:
        # the jasper dished a little, in shade on the lamp side's rim
        body += '<path d="%s" fill="%s"/>' % (wedge_d(cx, cy, 0, max(rx, ry) * 1.2, math.radians(190), math.radians(280)), JASPER[0])
        body += '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (f(cx + 0.35), f(cy + 0.45), f(rx * 0.9), f(ry * 0.92), JASPER[1])
        body += relief(d, JASPER[3], lit='#ffffff', shade='#1c2c3a', dx=0.4, dy=0.5, sh_op=0.5, lo=0.2)
    else:
        body += '<path d="%s" fill="%s"/>' % (d, JASPER[3])
    out.append('<g clip-path="%s">%s</g>' % (clip, body))
    out.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="none" stroke="%s" stroke-width="%s"/>'
               % (f(cx), f(cy), f(rx), f(ry), GILT[4], '1.2' if small else '.7'))
    return ''.join(out)


JASPER = ['#5d7a92', '#7e9bb2', '#a9c0d0', '#f1ede4']      # the jasper's shade, its body, its light; the relief


def subject_outreach(m, h, small=False):
    """The day's queue as the desk deals it: three calling cards fanned from
    one hand, graded as the page grades them, gold for the first call, sky
    for the second, plain ivory with a gilt edge for the third. The front
    card has its corner turned up, the old sign of a card delivered in
    person, because the desk never sends: the owner does."""
    a0, a1, a2 = FAN['angles']
    m.add(card(m, 'c3', 'p3', a0, small=small))
    m.add(card(m, 'c2', 'p2', a1, small=small))
    m.add(card(m, 'c1', 'p1', a2, gilt=0.7, fold=True, portrait=True, small=small))


# --------------------------------------------------------------------------
# Arsenal: the gunner's quadrant, set in the bore at an elevation
# --------------------------------------------------------------------------
# Drawn from Tartaglia's squadra (Nova Scientia, 1537) and the brass
# quadrants of the sixteenth and seventeenth centuries in the Museo Galileo
# (inv. 659 and 1303): a long flat arm that goes into the bore, tapering to
# a foot with a toe; a short arm square to it; and between them the limb, a
# band of a quarter circle centred on the pin in the corner, joined to the
# long arm and run on through the short arm into a horn that reads a
# depression. The limb is open inside, as the real ones are. A gusset
# stiffens the inside corner, and the plumb line hangs from the pin across
# the limb to a turned bob. Local units with the pin at the origin, y up;
# the charge is fitted to the badge afterwards.
ARSENAL = {
    'elev': 30.0,                    # the elevation the plumb line reads, degrees
    'long': 62.0, 'short': 35.0,     # the arms, from the pin
    'r1': 28.5, 'r0': 20.5,          # the limb: outer and inner radius
    'w': 5.6, 'taper': 0.6,          # the arms' width at the corner; the long arm's at its foot, over w
    'horn': 16.0,                    # degrees the limb runs on past the short arm
    'gusset': 4.8,
    'drop': 5.0,                     # the bob hangs this far under the limb
    'bob': 1.45,                     # the bob's size, over the profile's
    'thick': 3.0,                    # the plate, drawn thicker than the real one so it reads
    'turn': 40.0,                    # degrees the plate is turned toward the lamp
    'fit': 38.6,                     # the radius of the circle the charge fills on the badge
    'centre': (48.0, 48.6),
}
# The instrument's brass, from Arsenal's own page (--brass-lo, --brass,
# --brass-hi) with a shade under and a crest over: every face, wall and
# chamfer takes one of these by how squarely it meets the key light.
ARSENAL_BRASS = ['#3a2c0f', '#6f571f', '#a3843a', '#c9a64e', '#e7c976', '#f9ebb4']
ARSENAL_BRASS_CUTS = [0.12, 0.32, 0.55, 0.78, 0.92]
ARSENAL_BOB = ['#4a3912', '#8c6e2c', '#c9a64e', '#eed48a']          # the turned bob's planes
ARSENAL_BOB_CUTS = [0.3, 0.6, 0.86]
ARSENAL_INK = '#2a2109'              # what the graver cuts, filled with black wax
ARSENAL_CORD = '#1b140c'             # the plumb line


def arsenal_arc(r, a0, a1, n):
    """Points on a circle about the pin from angle a0 to a1 (radians, y up)."""
    return [(r * math.cos(a0 + (a1 - a0) * k / n), r * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]


def arsenal_round(c, a, b, n=6):
    """A concave round cut into a corner: the short way about c from a to b."""
    a0 = math.atan2(a[1] - c[1], a[0] - c[0])
    a1 = math.atan2(b[1] - c[1], b[0] - c[0])
    d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
    r = (math.hypot(a[0] - c[0], a[1] - c[1]) + math.hypot(b[0] - c[0], b[1] - c[1])) / 2
    return [(c[0] + r * math.cos(a0 + d * k / n), c[1] + r * math.sin(a0 + d * k / n)) for k in range(n + 1)]


def arsenal_form(small=False):
    """The quadrant's plate in local units: its outer boundary and the open
    quarter inside the limb (lists of points, y up), and the frame the
    engraving and the plumb line are laid in."""
    q = ARSENAL
    e = math.radians(q['elev'])
    uL = (-math.cos(e), -math.sin(e))          # the long arm, into the bore
    uS = (math.sin(e), -math.cos(e))           # the short arm, square to it
    aL = math.atan2(uL[1], uL[0])
    aS = aL + math.pi / 2
    aH = aS + math.radians(q['horn'])
    L, Sh = q['long'], q['short']
    k = 1.32 if small else 1.0                 # the small cut's members, drawn heavier
    w = q['w'] * k
    r1 = q['r1'] + (w - q['w']) * 0.45
    r0 = q['r0'] - (w - q['w']) * 0.55
    g = q['gusset']

    def P(t, s):
        return (t * uL[0] + s * uS[0], t * uL[1] + s * uS[1])

    def wl(t):
        return w * (1 - (1 - q['taper']) * max(0.0, t) / L)

    def on_edge(r):
        # how far along the long arm its inner edge (s = +wl/2) lies r from the pin
        t = r
        for _ in range(6):
            t = math.sqrt(max(0.0, r * r - (wl(t) / 2) ** 2))
        return t

    def ang(p):
        a = math.atan2(p[1], p[0])
        while a < aL - 0.5:
            a += 2 * math.pi
        while a > aL + 2 * math.pi - 0.5:
            a -= 2 * math.pi
        return a
    n_arc = 44
    wf = wl(L)
    tj1, tj0 = on_edge(r1), on_edge(r0)
    J1, J0 = P(tj1, wl(tj1) / 2), P(tj0, wl(tj0) / 2)
    sk1, sk0 = math.sqrt(r1 * r1 - (w / 2) ** 2), math.sqrt(r0 * r0 - (w / 2) ** 2)
    K1, K2, K0, K3 = P(w / 2, sk1), P(-w / 2, sk1), P(w / 2, sk0), P(-w / 2, sk0)
    # the foot: a toe on the outer side, the inner corner cut back in a round
    rn = 0.56 * wf
    out = [P(-w / 2, -w / 2), P(L, -wf / 2)]
    out += arsenal_round(P(L, wf / 2), P(L, wf / 2 - rn), P(L - rn, wl(L - rn) / 2))
    # up the long arm's inner edge to the limb, round its outer edge to the
    # short arm and out along that to its end, cut the same way
    out += [J1] + arsenal_arc(r1, ang(J1), ang(K1), n_arc)[1:-1] + [K1]
    rs = 0.56 * w
    out += arsenal_round(P(w / 2, Sh), P(w / 2, Sh - rs), P(w / 2 - rs, Sh))
    out += [P(-w / 2, Sh), K2]
    # the horn, out past the short arm, with the same toe and round at its tip
    out += arsenal_arc(r1, ang(K2), aH, 12)[1:]
    rh = 0.56 * (r1 - r0)
    tip = (r0 * math.cos(aH), r0 * math.sin(aH))
    back = aH - rh / r0
    out += arsenal_round(tip, ((r0 + rh) * math.cos(aH), (r0 + rh) * math.sin(aH)),
                         (r0 * math.cos(back), r0 * math.sin(back)))
    out += arsenal_arc(r0, back, ang(K3), 12)[1:-1] + [K3]
    # the open quarter: the long arm's inner edge from the gusset to the
    # limb, the limb's inner edge, the short arm's inner edge back to the
    # gusset, and the gusset's free edge, straight and then rounded into the
    # short arm as on inv. 1303
    G1, G2 = P(w / 2 + g, wl(w / 2 + g) / 2), P(w / 2, w / 2 + g)
    hole = [G1, J0] + arsenal_arc(r0, ang(J0), ang(K0), n_arc)[1:-1] + [K0, G2]
    gm = (G2[0] + (G1[0] - G2[0]) * 0.42, G2[1] + (G1[1] - G2[1]) * 0.42)
    ic = P(w / 2, w / 2)
    ctrl = ((G2[0] + gm[0]) / 2 + (ic[0] - (G2[0] + gm[0]) / 2) * 0.55,
            (G2[1] + gm[1]) / 2 + (ic[1] - (G2[1] + gm[1]) / 2) * 0.55)
    for j in range(1, 6):
        t = j / 6.0
        hole.append(((1 - t) ** 2 * G2[0] + 2 * (1 - t) * t * ctrl[0] + t * t * gm[0],
                     (1 - t) ** 2 * G2[1] + 2 * (1 - t) * t * ctrl[1] + t * t * gm[1]))
    hole.append(gm)
    frame = {'aL': aL, 'aS': aS, 'aH': aH, 'r0': r0, 'r1': r1, 'w': w, 'wl': wl, 'tj1': tj1, 'P': P, 'L': L,
             'bob_top': r1 + q['drop']}
    return out, hole, frame


def arsenal_bob_profile(n=90):
    """A turned brass plumb bob, from the top of its cap down to the point:
    (distance down, radius). A short cap and a collar, then the body, full
    in the shoulder and drawn out to the point, smooth all the way so the
    lathe's planes run round it in even curves."""
    prof = [(0.0, 0.0), (0.0, 0.8), (0.8, 0.8), (0.8, 1.45), (1.35, 1.45), (1.35, 0.0)]
    for i in range(1, n + 1):
        u = i / float(n)
        prof.append((1.35 + 9.2 * u, 3.25 * (u ** 0.34) * ((1 - u) ** 1.05) / 0.4768))
    return prof


def arsenal_offset(loop, d, solid_left):
    """A loop of plate points (y up) moved d into the metal, each vertex along
    the bisector of its two edges. solid_left: the metal lies to the left of
    the loop's direction of travel."""
    sg = 1.0 if solid_left else -1.0
    n, out = len(loop), []
    for i in range(n):
        p0, p1, p2 = loop[i - 1], loop[i], loop[(i + 1) % n]
        e1 = (p1[0] - p0[0], p1[1] - p0[1])
        e2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*e1) or 1, math.hypot(*e2) or 1
        n1 = (-e1[1] / l1 * sg, e1[0] / l1 * sg)
        n2 = (-e2[1] / l2 * sg, e2[0] / l2 * sg)
        bx, by = n1[0] + n2[0], n1[1] + n2[1]
        bl = math.hypot(bx, by)
        if bl < 1e-6:
            bx, by, bl = n1[0], n1[1], 1.0
        bx, by = bx / bl, by / bl
        cosh = max(0.4, bx * n1[0] + by * n1[1])
        out.append((p1[0] + bx * d / cosh, p1[1] + by * d / cosh))
    return out


def arsenal_area(loop):
    return 0.5 * sum(loop[i][0] * loop[(i + 1) % len(loop)][1] - loop[(i + 1) % len(loop)][0] * loop[i][1]
                     for i in range(len(loop)))


def arsenal_view(small=False):
    """The quadrant stands upright on the badge, as it hangs at the muzzle,
    turned a little toward the lamp so its face takes the light and the
    thickness of the plate shows along the far edges. First the plate and
    everything hung from it is projected at unit scale about the pin; the
    circle round all of it is then fitted to the badge."""
    q = ARSENAL
    out, hole, fr = arsenal_form(small)
    t = q['thick'] * (1.15 if small else 1.0)
    v0 = S.View(0.0, 0.0, 1.0, yaw=-q['turn'], pitch=PITCH)
    pts = [v0.proj((x, y, z))[:2] for x, y in out for z in (t / 2, -t / 2)]
    bs = q['bob'] * (1.2 if small else 1.0)
    top = fr['bob_top']
    for d, r in arsenal_bob_profile():
        cx, cy, _ = v0.proj((0.0, -top, t / 2 + 1.0))
        pts += [(cx + r * bs, cy + d * bs), (cx - r * bs, cy + d * bs)]
    c = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
    for i in range(3000):                      # Badoiu-Clarkson: walk toward the farthest point
        far = max(pts, key=lambda p: (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2)
        c = (c[0] + (far[0] - c[0]) / (i + 2), c[1] + (far[1] - c[1]) / (i + 2))
    rad = max(math.hypot(p[0] - c[0], p[1] - c[1]) for p in pts)
    k = q['fit'] / rad
    X, Y = q['centre']
    v = S.View(X - k * c[0], Y - k * c[1], k, yaw=-q['turn'], pitch=PITCH)
    return v, k, out, hole, fr, t, bs


def arsenal_plate(v, loops, t, ch):
    """The cast plate: its walls where they turn to the reader, each in the
    tone its normal takes from the key light, a chamfer round the face, and
    the flat face over them."""
    fc = S.Faces()
    face_loops = []
    zf, zb = t / 2, -t / 2
    for loop, is_hole in loops:
        ccw = arsenal_area(loop) > 0
        solid_left = ccw != is_hole            # the metal's side of the loop
        inner = arsenal_offset(loop, ch, solid_left) if ch else loop
        face_loops.append(inner)
        n = len(loop)
        for i in range(n):
            a, b = loop[i], loop[(i + 1) % n]
            ex, ey = b[0] - a[0], b[1] - a[1]
            ln = math.hypot(ex, ey)
            if ln < 1e-6:
                continue
            # the outward normal, away from the metal
            nx, ny = (ey / ln, -ex / ln) if solid_left else (-ey / ln, ex / ln)
            nw = v.nrm((nx, ny, 0.0))
            if nw[2] > 0.02:
                quad = [v.proj((a[0], a[1], zf - ch)), v.proj((b[0], b[1], zf - ch)),
                        v.proj((b[0], b[1], zb)), v.proj((a[0], a[1], zb))]
                fc.add([(p[0], p[1]) for p in quad], sum(p[2] for p in quad) / 4 - 50,
                       facet(lam(nw), ARSENAL_BRASS, ARSENAL_BRASS_CUTS))
            if ch:
                c_, d_ = inner[(i + 1) % n], inner[i]
                nc = v.nrm(S.norm((nx, ny, 1.0)))
                quad = [v.proj((a[0], a[1], zf - ch)), v.proj((b[0], b[1], zf - ch)),
                        v.proj((c_[0], c_[1], zf)), v.proj((d_[0], d_[1], zf))]
                fc.add([(p[0], p[1]) for p in quad], sum(p[2] for p in quad) / 4,
                       facet(lam(nc), ARSENAL_BRASS, ARSENAL_BRASS_CUTS))
    face = ' '.join(S.pts_d([v.proj((x, y, zf))[:2] for x, y in lp]) for lp in face_loops)
    tone = facet(lam(v.nrm((0.0, 0.0, 1.0))), ARSENAL_BRASS, ARSENAL_BRASS_CUTS)
    return fc.svg(seam=0.12) + '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (face, tone)


def arsenal_bob(m, x, y, s, small=False):
    """The turned bob, hung by its cap at (x, y), s badge units to one local
    unit, cut into the planes a lathe leaves on it along the key light."""
    edge = arsenal_bob_profile(24)            # the outline, drawn
    prof = arsenal_bob_profile()              # the surface, lit
    right = [(x + r * s, y + d * s) for d, r in edge]
    left = [(x - r * s, y + d * s) for d, r in edge[::-1]]
    sil = S.pts_d(right + left[1:-1])
    v = S.View(0.0, 0.0, 1.0, pitch=PITCH)

    def light(px, py):
        d = (py - y) / s
        for j in range(len(prof) - 1):
            (d0, r0), (d1, r1) = prof[j], prof[j + 1]
            if d0 <= d <= d1:
                r = r0 + (r1 - r0) * (d - d0) / max(1e-6, d1 - d0)
                slope = (r1 - r0) / max(1e-6, d1 - d0)
                break
        else:
            return 0.0
        if r < 1e-3:
            return 0.0
        u = max(-1.0, min(1.0, (px - x) / (r * s)))
        return lam(v.nrm(S.norm((u, slope, math.sqrt(max(0.0, 1 - u * u))))))
    box = (x - 4 * s, y - 1, x + 4 * s, y + 11 * s)
    return shadow(sil, 0.8, 1.1, 0.5) + planes(m, 'bob', sil, light, box, ARSENAL_BOB, ARSENAL_BOB_CUTS,
                                               0.3 if small else 0.2, 0.08)


def subject_arsenal(m, h, small=False):
    """The gunner's quadrant, the instrument that first turned a gun's
    elevation into a number: a long arm laid in the bore, a short arm square
    to it, and between them the open limb cut in the gunner's twelve points.
    It stands as it does at the muzzle of a gun laid at thirty degrees, and
    the plumb line hangs from the pin in the corner and reads the elevation
    where it crosses the limb, as Arsenal's Ballistic Computer reads one off
    the range. Cast and filed brass, the colour of the Ballistic Computer's
    own fittings, on the gunmetal enamel. One casting: the flat face takes
    one tone, the chamfer round it and the walls that show along its far
    edges take theirs from the key light, and the bob is cut into the planes
    of the lathe."""
    v, k, out, hole, fr, t, bs = arsenal_view(small)
    zf = t / 2
    # the charge's shadow on the enamel: the plate's front and back outlines
    sil = ' '.join(S.pts_d([v.proj((x, y, z))[:2] for x, y in lp]) for lp in (out, hole) for z in (zf,))
    back = ' '.join(S.pts_d([v.proj((x, y, z))[:2] for x, y in lp]) for lp in (out, hole) for z in (-zf,))
    m.add(shadow(sil, 1.2, 1.7, 0.5, ' fill-rule="evenodd"'))
    m.add(shadow(back, 1.2, 1.7, 0.5, ' fill-rule="evenodd"'))
    m.add(arsenal_plate(v, [(out, False), (hole, True)], t, 0.0 if small else 0.8))
    m.add(arsenal_engraving(v, fr, zf, small))
    # the plumb line, hung from the pin in front of the face, straight down
    # across the limb to the bob
    zc = zf + 0.9
    px, py, _ = v.proj((0.0, 0.0, zc))
    bx, by, _ = v.proj((0.0, -fr['bob_top'], zc))
    lw = 1.3 if small else 0.55
    if not small:
        m.add('<path d="M%s %s V%s" stroke="#000" stroke-opacity=".32" stroke-width="%s" transform="translate(.6 .8)"/>'
              % (f(px), f(py), f(by + 0.6), f(lw)))
    m.add('<path d="M%s %s V%s" stroke="%s" stroke-width="%s"/>' % (f(px), f(py), f(by + 0.6), ARSENAL_CORD, f(lw)))
    m.add(arsenal_bob(m, bx, by, k * bs, small))
    # the pin the line hangs from, a turned head proud of the face
    rp = 1.9 if small else 1.5
    m.add(shadow(circle_d(px, py, rp), 0.4, 0.6, 0.45))
    m.add(faceted_ring(px, py, rp * 0.55, rp, +1, n=24))
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(px), f(py), f(rp * 0.55), ARSENAL_BRASS[2]))


def arsenal_engraving(v, fr, zf, small=False):
    """What the graver cut in the face, filled with black wax. The limb's
    twelve points are cut alternately, as Tartaglia's own woodcut of the
    squadra shows them, with the horn's points of depression beyond; down the
    long arm the scale of calibres, a division for each weight of shot at the
    cube root of the weight, cut alternately in the same way."""
    r0, r1, aL, aS, aH = fr['r0'], fr['r1'], fr['aL'], fr['aS'], fr['aH']

    def T(p):
        x, y, _ = v.proj((p[0], p[1], zf))
        return (x, y)

    def pol(r, a):
        return T((r * math.cos(a), r * math.sin(a)))
    m_ = 1.1 if small else 1.0
    rin, rout = r0 + m_, r1 - m_
    # the small cut keeps the alternation but cuts two points to a block, so
    # the blocks stay wider than a pixel at the Ledger's 25 px
    step = (aS - aL) / (6.0 if small else 12.0)
    blocks, segs = [], []
    rm = (rin + rout) / 2
    w = fr['w']
    lo_a, hi_a = aL + (w / 2 + 0.5) / rm, aH - 0.03
    # the short arm crosses the limb: the cuts stop at its edges
    gap = ((aS - (w / 2 + 0.5) / rm), (aS + (w / 2 + 0.5) / rm))
    for j in range(-6, 12):
        if j % 2 or (small and j >= 6):
            continue
        a0, a1 = aS - j * step, aS - (j + 1) * step
        a0, a1 = min(a0, hi_a), max(a1, lo_a)
        spans = []
        for u0, u1 in ((a1, min(a0, gap[0])), (max(a1, gap[1]), a0)):
            if u1 > u0 + 0.01:
                spans.append((u0, u1))
        for u0, u1 in spans:
            pts = [pol(rout, u0 + (u1 - u0) * i / 6) for i in range(7)] + [pol(rin, u1 + (u0 - u1) * i / 6) for i in range(7)]
            blocks.append(poly_d(pts))
    P, wl, L = fr['P'], fr['wl'], fr['L']
    t0, t1 = fr['tj1'] + (1.5 if small else 2.0), L - (4.0 if small else 3.4)
    tt = [t0 + (t1 - t0) * (wg ** (1 / 3.0) - 1) / (50 ** (1 / 3.0) - 1) for wg in (1, 2, 4, 8, 16, 25, 36, 50)]
    for j in range(0, len(tt) - 1, 2):
        e0, e1 = -wl(tt[j]) / 2 + m_, -wl(tt[j + 1]) / 2 + m_
        pts = [P(tt[j], e0), P(tt[j + 1], e1), P(tt[j + 1], e1 + wl(tt[j + 1]) * 0.42), P(tt[j], e0 + wl(tt[j]) * 0.42)]
        blocks.append(poly_d([T(p) for p in pts]))
    out = '<path d="%s" fill="%s" fill-opacity=".86"/>' % (' '.join(blocks), ARSENAL_INK)
    if small:
        return out
    # the fine work: the ruled edges of the scale, the half points, and a
    # tick for every weight of shot
    rings = []
    for r in (rin, rout):
        pts = [pol(r, lo_a + (hi_a - lo_a) * i / 60) for i in range(61)]
        rings.append('M' + ' L'.join('%s %s' % (f(x), f(y)) for x, y in pts))
    for j in range(-6, 12):
        a = aS - (j + 0.5) * step
        if lo_a < a < hi_a:
            p, q_ = pol(rout - 1.2, a), pol(rout, a)
            segs.append((p[0], p[1], q_[0], q_[1]))
    a_, b_ = T(P(t0, -wl(t0) / 2 + m_)), T(P(t1, -wl(t1) / 2 + m_))
    segs.append((a_[0], a_[1], b_[0], b_[1]))
    for wgt in (1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 25, 30, 36, 40, 50):
        t = t0 + (t1 - t0) * (wgt ** (1 / 3.0) - 1) / (50 ** (1 / 3.0) - 1)
        lo = -wl(t) / 2 + m_
        hi = lo + wl(t) * (0.62 if wgt in (1, 8, 25, 50) else 0.5)
        p, q_ = T(P(t, lo)), T(P(t, hi))
        segs.append((p[0], p[1], q_[0], q_[1]))
    return (out + '<path d="%s" stroke="%s" stroke-width=".3" stroke-opacity=".8"/>' % (lines_path(segs), ARSENAL_INK)
            + '<path d="%s" stroke="%s" stroke-width=".3" stroke-opacity=".8" fill="none"/>' % (' '.join(rings), ARSENAL_INK))


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
