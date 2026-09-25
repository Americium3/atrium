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
        'velvet': {'name': 'emerald', 'onyx': '#24754b', 'ivory': '#37905f'},
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


# --------------------------------------------------------------------------
# The Press Room: the world at dawn, printed in the paper's own colours
# --------------------------------------------------------------------------
# The Earth as it stands at sunrise on an equinox, seen from a little above
# the equator. The sun comes up out of the east, on the right, so the dawn
# line runs from pole to pole down the Atlantic: Europe and Africa are in
# morning and the Americas still lie in night. The sun is set against the
# hall's key light on purpose. A dark half on the lamp's side cannot pass for
# ordinary shading; it can only be night. The globe is printed the way the
# paper is (bone paper, the page's olive, ink for the night), with one
# narrow band of dawn along the line. The coasts are Natural Earth's 1:110m
# land, simplified to a degree and a bit: the true shapes with the small wiggles
# left out, as an engraver cuts them for a masthead globe.
PRESSROOM_GLOBE = {'cx': 48.0, 'cy': 49.0, 'r': 31.0, 'lean': -23.4, 'tip': 12.0,
                   'dawn': -30.0, 'front': 0.3}
#                  night      dawn       shade      body       lit
PRESSROOM_SEA = ['#15130d', '#b0703f', '#d8c58e', '#e9ddac', '#f7f0c9']
PRESSROOM_LAND = ['#534c2e', '#6a4524', '#66702f', '#768d43', '#97ac5b']
PRESSROOM_LIGHT = [-0.1, 0.03, 0.34, 0.7]          # where each plane begins (n . sun)
# Natural Earth 1:110m land (public domain), the loops that face the
# Atlantic, simplified to 1.2 degrees; (longitude, latitude).
PRESSROOM_COAST = [
    [(107, 77), (114.1, 75.8), (109.4, 74.2), (127, 73.6), (131.3, 70.8), (140.5, 72.8), (160.9, 69.4),
     (178.6, 69.4), (180, 69), (180, 65), (177.4, 64.6), (179.5, 62.6), (163.5, 59.9), (162.1, 54.9),
     (156.8, 51), (155.9, 56.8), (164.5, 62.6), (160.1, 60.5), (156.7, 61.4), (155, 59.1), (142.2, 59),
     (135.1, 54.7), (139.9, 54.2), (141.4, 52.2), (138.2, 46.3), (127.5, 39.8), (129.1, 35.1), (126.5, 34.4),
     (125.3, 39.6), (121.1, 38.9), (121.6, 40.9), (118, 39.2), (118.9, 37.4), (122.4, 37.5), (119.2, 34.9),
     (121.9, 31.7), (121.7, 28.2), (115.9, 22.8), (105.9, 19.8), (109.3, 13.4), (105.2, 8.6), (100.1, 13.4),
     (99.2, 9.2), (104.2, 1.3), (98.3, 7.8), (97.2, 16.9), (94.2, 16), (91.4, 22.8), (87, 21.5), (80.3, 15.9),
     (79.9, 10.4), (77.5, 8), (72.6, 21.4), (70.5, 20.9), (66.4, 25.4), (57.4, 25.7), (48, 30), (51.8, 24),
     (56.4, 26.4), (59.8, 22.3), (55.3, 17.2), (43.5, 12.6), (34.9, 29.5), (33.9, 27.6), (32.4, 29.9),
     (42.7, 11.7), (44.6, 10.4), (51.1, 12), (50.6, 9.2), (40.3, -2.6), (38.7, -5.9), (40.8, -14.7),
     (34.8, -19.8), (35.5, -24.1), (28.2, -32.8), (18.4, -34.1), (13.9, -21.7), (11.6, -16.7), (13.7, -10.7),
     (8.8, -1.1), (9.4, 3.7), (4.3, 6.3), (-9, 4.8), (-16.6, 12.2), (-17, 21.9), (-5.9, 35.8), (9.5, 37.4),
     (11.1, 36.9), (10.3, 33.8), (19.1, 30.3), (21.5, 32.8), (33.8, 31), (36.2, 36.7), (27.6, 36.7),
     (26.2, 39.5), (33.5, 42), (41.7, 42), (36.7, 45.2), (39.1, 47.3), (33.9, 44.4), (30.7, 46.6), (27.7, 42.6),
     (28.8, 41.1), (22.6, 40.3), (24, 37.7), (22.5, 36.4), (19.5, 41.7), (13.1, 45.7), (12.6, 44.1),
     (18.5, 40.2), (16.9, 40.4), (16.1, 38), (8.9, 44.4), (3.1, 43.1), (-2.1, 36.7), (-8.9, 36.9), (-9.4, 43),
     (-1.4, 44), (-1.2, 46), (-4.6, 48.7), (8.1, 53.5), (8.5, 57.1), (10.6, 57.7), (10.9, 54), (19.7, 54.4),
     (21.6, 57.4), (24.1, 57), (23.3, 59.2), (29.1, 60), (21.3, 60.7), (21.5, 63.2), (25.4, 65.1), (22.2, 65.7),
     (17.8, 62.7), (18.8, 60.1), (15.9, 56.1), (12.9, 55.4), (10.4, 59.5), (5.7, 58.6), (5, 62), (24.5, 71),
     (40.3, 67.9), (40, 66.3), (33.2, 66.6), (37, 63.8), (43.9, 66.1), (43.5, 68.6), (46.3, 68.3), (46.3, 66.7),
     (53.7, 68.9), (59.9, 68.3), (60.6, 69.9), (68.5, 68.1), (66.7, 71), (72.6, 72.8), (72.4, 66.2),
     (75.1, 67.8), (73.1, 71.4), (74.7, 72.8), (76.4, 71.2), (81.5, 71.8), (80.5, 73.6), (87.2, 75.1)],
    [(-90.5, 69.5), (-87.4, 67.2), (-85.5, 69.9), (-82.6, 69.7), (-81.3, 67.6), (-93.2, 62), (-94.7, 58.9),
     (-92.3, 57.1), (-82.3, 55.1), (-79.9, 51.2), (-78.6, 52.6), (-79.8, 54.7), (-76.5, 56.5), (-78.5, 58.8),
     (-78.1, 62.3), (-73.8, 62.4), (-69.6, 61.1), (-67.6, 58.2), (-64.6, 60.3), (-55.7, 52.1), (-66.4, 50.2),
     (-71.1, 46.8), (-65.1, 49.2), (-64.5, 46.2), (-59.8, 45.9), (-65.4, 43.5), (-64.4, 45.3), (-67.1, 45.1),
     (-70.7, 43), (-70, 41.6), (-75.5, 39.5), (-75.9, 37.2), (-76.3, 39.2), (-75.7, 35.6), (-81.3, 31.4),
     (-80.4, 25.2), (-84.1, 30.1), (-96.6, 28.3), (-97.9, 22.4), (-96.3, 19.3), (-92, 18.7), (-87.1, 21.5),
     (-88.9, 15.9), (-83.4, 15.3), (-83.8, 11.1), (-81.4, 8.8), (-76.8, 8.6), (-71.8, 12.4), (-71.7, 9.1),
     (-69.9, 12.2), (-68.2, 10.6), (-61.9, 10.7), (-57.1, 6), (-51.3, 4.2), (-50.4, -0.1), (-40, -2.9),
     (-34.7, -7.3), (-38.7, -13.1), (-40.9, -21.9), (-47.6, -24.9), (-53.8, -34.4), (-58.4, -33.9),
     (-56.8, -36.9), (-62.3, -38.8), (-62.1, -40.7), (-65.1, -41.1), (-63.8, -42), (-67.3, -45.6),
     (-65.6, -47.2), (-69.1, -50.7), (-68.2, -52.3), (-71.4, -53.9), (-75.3, -51.6), (-70.2, -19.8),
     (-76, -14.6), (-81.2, -6.1), (-79.8, -2.7), (-80.9, -1.1), (-77.1, 3.8), (-78.2, 8.3), (-80.9, 7.2),
     (-85.7, 9.9), (-87.5, 13.3), (-103.5, 18.3), (-113.9, 31.6), (-114.7, 30.2), (-109.4, 23.4),
     (-112.2, 24.7), (-124.4, 40.3), (-124.7, 48.2), (-122.6, 47.1), (-122.8, 49), (-127.4, 50.8),
     (-134.1, 58.1), (-147.1, 60.9), (-151.7, 59.2), (-150.6, 61.3), (-158.4, 56), (-164.8, 54.4), (-157, 58.9),
     (-162, 58.7), (-166.1, 61.5), (-160.8, 64.8), (-168.1, 65.7), (-161.7, 66.1), (-166.8, 68.4),
     (-156.6, 71.4), (-136.5, 68.9), (-128.1, 70.5), (-108.9, 67.4), (-106.2, 68.8), (-96.1, 67.3),
     (-94.2, 69.1), (-96.5, 70.1), (-95.2, 71.9)],
    [(143.6, -13.8), (153.1, -26.1), (152.9, -31.6), (149.4, -37.8), (140.6, -38), (138.2, -34.4),
     (136.8, -35.3), (137.8, -32.9), (136, -34.9), (131.3, -31.5), (116.6, -35), (115, -34.2), (114.6, -28.8),
     (114.1, -21.8), (120.9, -19.7), (125.7, -14.2), (129.6, -15), (132.4, -11.1), (136.5, -11.9), (135.5, -15),
     (140.2, -17.7), (142.1, -11)],
    [(-27.1, 83.5), (-20.8, 82.7), (-31.4, 82), (-12.2, 81.3), (-20, 80.2), (-17.7, 80.1), (-19.7, 78.8),
     (-18.5, 77), (-21.7, 76.6), (-19.4, 74.3), (-24.8, 72.3), (-21.8, 70.7), (-26.4, 70.2), (-22.3, 70.1),
     (-39.8, 65.5), (-44.8, 60), (-51.6, 63.6), (-54, 67.2), (-50.9, 69.9), (-54.7, 69.6), (-51.4, 70.6),
     (-55.8, 71.7), (-54.7, 72.6), (-57.3, 74.7), (-68.5, 76.1), (-71.4, 77), (-66.8, 77.4), (-73.2, 78.4),
     (-60.3, 82)],
    [(117.9, 1.8), (119, 0.9), (114.9, -4.1), (110.2, -2.9), (109.7, 2), (117.1, 6.9), (119.2, 5.4)],
    [(50.1, -13.6), (47.1, -24.9), (44, -25), (43.4, -21.3), (44.4, -16.2), (49.2, -12)],
    [(-86.6, 73.2), (-72.2, 71.6), (-61.9, 66.9), (-63.9, 65), (-68, 66.3), (-64.7, 63.4), (-68.8, 63.7),
     (-66.2, 61.9), (-78.6, 64.6), (-74, 65.5), (-72.9, 67.7), (-79, 70.2), (-88.7, 70.4), (-90.2, 72.2)],
    [(105.8, -5.9), (95.4, 5), (97.5, 5.2), (103.8, 0.1)],
    [(-3, 58.6), (-3.1, 56), (1.4, 51.3), (-5.2, 50), (-2.9, 54), (-6.1, 56.8)],
    [(-114.2, 73.1), (-105.4, 72.7), (-101.1, 69.6), (-107.1, 69.1), (-116.1, 69.2), (-112.4, 70.4),
     (-119.4, 71.6)],
    [(-68.5, 83.1), (-61.9, 82.4), (-76.9, 79.3), (-75.4, 78.5), (-79.8, 77.2), (-77.9, 76.8), (-89.5, 76.5),
     (-88.3, 77.9), (-85, 77.5), (-88, 78.4), (-85.1, 79.3), (-86.9, 80.3), (-81.8, 80.5), (-91.6, 81.9)],
    [(125.2, 1.4), (120.2, 0.2), (120.9, -1.4), (123.3, -0.6), (121.5, -1.9), (123.2, -5.3), (121.5, -4.6),
     (121, -2.6), (119.4, -5.4), (120, 0.6)],
    [(108.6, -6.8), (115.7, -8.4), (110.6, -8.1), (105.4, -6.9)],
    [(-56.1, 50.7), (-53.1, 48.7), (-53.1, 46.7), (-54.2, 47.8), (-59.3, 47.6)],
    [(-79.7, 22.8), (-74.2, 20.3), (-77.8, 19.9), (-78.7, 21.6), (-85, 21.9)],
    [(-14.5, 66.5), (-13.6, 65.1), (-18.7, 63.5), (-24, 64.9), (-22.2, 65.1), (-23.7, 66.3)],
    [(-67.8, -53.9), (-65, -54.7), (-68.1, -55.6), (-72.3, -54.5), (-74.7, -52.8)],
    [(57.5, 70.7), (51.5, 72), (57.9, 75.6), (68.9, 76.5), (58.5, 74.3), (55.4, 72.4)],
    [(-72.6, 19.9), (-69.2, 19.3), (-68.7, 18.2), (-70.7, 18.4), (-74.5, 18.3)],
]
# The Caspian, which the 1:110m land leaves filled
PRESSROOM_LAKES = [
    [(47, 45), (49.5, 46.6), (51.4, 47), (53.2, 45.4), (51.3, 44.5), (52.9, 41), (54, 37.4), (50.8, 37),
     (49, 38.2), (49.6, 40.6), (47.8, 42.8)],
]


def pressroom_frame():
    """The globe's axes in view space (x right, y up, z toward the reader):
    the axis leans the globe-maker's 23.4 degrees and tips a little toward
    the reader; the sun stands square to the axis, as it does at an equinox,
    so the dawn line passes through both poles."""
    g = PRESSROOM_GLOBE
    le, ti = math.radians(g['lean']), math.radians(g['tip'])
    axis = S.norm((math.sin(le), math.cos(le) * math.cos(ti), math.cos(le) * math.sin(ti)))
    s0 = (1.0, 0.0, g['front'])
    sun = S.norm(S.add(s0, S.mul(axis, -S.dot(s0, axis))))
    return {'axis': axis, 'sun': sun, 'east': S.cross(axis, sun), 'sub': g['dawn'] + 90.0}


def pressroom_xyz(lon, lat, fr):
    """A point on the globe, in view space. The sun stands over `sub`; the
    dawn line lies ninety degrees west of it."""
    a, b = math.radians(lon - fr['sub']), math.radians(lat)
    return S.add(S.mul(S.add(S.mul(fr['sun'], math.cos(a)), S.mul(fr['east'], math.sin(a))), math.cos(b)),
                 S.mul(fr['axis'], math.sin(b)))


def pressroom_screen(p):
    g = PRESSROOM_GLOBE
    return (g['cx'] + g['r'] * p[0], g['cy'] - g['r'] * p[1])


def pressroom_face(loop, fr, step=2.0):
    """One coast on the face of the globe the reader sees, as screen points.
    Each edge is walked along its great circle; where the coast runs round
    the back, the limb that hides it stands in, swept the way the hidden
    stretch went. None when the whole coast is out of sight."""
    pts = []
    n = len(loop)
    for i in range(n):
        a, b = pressroom_xyz(*loop[i], fr), pressroom_xyz(*loop[(i + 1) % n], fr)
        ang = math.degrees(math.acos(max(-1.0, min(1.0, S.dot(a, b)))))
        k = max(1, int(math.ceil(ang / step)))
        for j in range(k):
            pts.append(S.norm(S.add(S.mul(a, 1 - j / k), S.mul(b, j / k))))
    vis = [p[2] > 0 for p in pts]
    if not any(vis):
        return None
    if all(vis):
        return [pressroom_screen(p) for p in pts]
    start = next(i for i in range(len(pts)) if vis[i] and not vis[i - 1])
    pts, vis = pts[start:] + pts[:start], vis[start:] + vis[:start]

    def cross(p, q):
        t = p[2] / (p[2] - q[2])
        return math.atan2(p[1] + (q[1] - p[1]) * t, p[0] + (q[0] - p[0]) * t)
    out, sweep, last = [], 0.0, None
    for i, p in enumerate(pts):
        q = pts[(i + 1) % len(pts)]
        if vis[i]:
            out.append(pressroom_screen(p))
            if not vis[(i + 1) % len(pts)]:
                last = cross(p, q)              # the coast goes over the limb
                sweep = 0.0
        else:
            ang = math.atan2(q[1], q[0]) if not vis[(i + 1) % len(pts)] else cross(p, q)
            d = (ang - last + math.pi) % (2 * math.pi) - math.pi
            sweep += d
            if vis[(i + 1) % len(pts)]:
                # it comes back: lay the limb from where it left, the way it went
                a0 = ang - sweep
                k = max(1, int(abs(math.degrees(sweep)) / 3))
                for j in range(k + 1):
                    t = a0 + sweep * j / k
                    out.append(pressroom_screen((math.cos(t), math.sin(t), 0.0)))
            last = ang
    return out


def pressroom_line(pts, fr):
    """A graticule line: the runs of it the reader can see, in screen points."""
    runs, cur = [], []
    for lon, lat in pts:
        p = pressroom_xyz(lon, lat, fr)
        if p[2] > 0.01:
            cur.append(pressroom_screen(p))
        elif cur:
            runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    return ' '.join('M' + ' L'.join('%s %s' % (S.fmt(x), S.fmt(y)) for x, y in r) for r in runs if len(r) > 1)


def subject_pressroom(m, h, small=False):
    """The world at dawn: the globe cut into the planes the sun lays on it
    (full morning, morning, the low sun, the band of dawn, night), sea and
    land each in its own colour, with the graticule engraved as a printed
    globe carries it, in ink by day and in pale lines across the night."""
    g = PRESSROOM_GLOBE
    fr = pressroom_frame()
    cx, cy, R, sun = g['cx'], g['cy'], g['r'], fr['sun']

    def light(x, y):
        X, Y = (x - cx) / R, -(y - cy) / R
        q = X * X + Y * Y
        if q >= 0.998:
            k = math.sqrt(0.998 / q)
            X, Y, q = X * k, Y * k, 0.998
        return S.dot((X, Y, math.sqrt(1 - q)), sun)

    disc = circle_d(cx, cy, R)
    box = (cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1)
    step = 0.6 if small else 0.35
    cuts = PRESSROOM_LIGHT
    sea, land = PRESSROOM_SEA, PRESSROOM_LAND
    if small:
        # the small cut keeps night, dawn and one morning
        cuts = cuts[:2]
        sea, land = sea[:2] + [sea[3]], land[:2] + [land[3]]
    m.add(shadow(disc, 1.3, 1.9, 0.5))
    m.add(planes(m, 'sea', disc, light, box, sea, cuts, step))
    # the land
    eps = 0.45 if small else 0.12
    loops = []
    for coast in PRESSROOM_COAST:
        face = pressroom_face(coast, fr)
        if face and abs(S.area(face)) > (4.0 if small else 0.4):
            loops.append(S.pts_d(S.rdp(face, eps)))
    land_d = ' '.join(loops)
    lclip = m.clip('land', '<path d="%s"/>' % land_d)
    m.add('<g clip-path="%s">%s</g>' % (lclip, planes(m, 'landp', disc, light, box, land, cuts, step)))
    if not small:
        lakes = [pressroom_face(lake, fr) for lake in PRESSROOM_LAKES]
        lake_d = ' '.join(S.pts_d(lk) for lk in lakes if lk)
        if lake_d:
            m.add('<g clip-path="%s">%s</g>' % (m.clip('lake', '<path d="%s"/>' % lake_d),
                                                 planes(m, 'lakep', disc, light, box, sea, cuts, step)))
        # the graticule every thirty degrees, the equator a shade heavier
        grat = [pressroom_line([(lon, lat) for lat in range(-90, 91, 3)], fr) for lon in range(0, 360, 30)]
        grat += [pressroom_line([(lon, lat) for lon in range(0, 361, 3)], fr) for lat in (-60, -30, 30, 60)]
        equator = pressroom_line([(lon, 0) for lon in range(0, 361, 3)], fr)
        day = S.region_d(lambda x, y: PRESSROOM_LIGHT[0] - light(x, y), box, step, 0.1)
        night = S.region_d(lambda x, y: light(x, y) - PRESSROOM_LIGHT[0], box, step, 0.1)
        dclip = m.clip('disc', '<path d="%s"/>' % disc)
        m.add('<g clip-path="%s"><g clip-path="%s">'
              '<path d="%s" stroke="#1a170c" stroke-width=".25" stroke-opacity=".14" fill="none"/>'
              '<path d="%s" stroke="#1a170c" stroke-width=".4" stroke-opacity=".3" fill="none"/></g></g>'
              % (dclip, m.clip('day', '<path d="%s"/>' % day), ' '.join(grat), equator))
        m.add('<g clip-path="%s"><g clip-path="%s">'
              '<path d="%s" stroke="#f6efc8" stroke-width=".25" stroke-opacity=".1" fill="none"/>'
              '<path d="%s" stroke="#f6efc8" stroke-width=".4" stroke-opacity=".16" fill="none"/></g></g>'
              % (dclip, m.clip('night', '<path d="%s"/>' % night), ' '.join(grat), equator))
        # the airglow: the thin green line the upper air gives off round the
        # night side's limb, the one thing on the globe that shines
        glow = []
        for k in range(0, 361, 2):
            a = math.radians(k)
            if S.dot((math.cos(a), math.sin(a), 0.0), sun) < PRESSROOM_LIGHT[0] - 0.04:
                glow.append((cx + (R + 0.35) * math.cos(a), cy - (R + 0.35) * math.sin(a)))
            elif glow:
                break
        if len(glow) > 1:
            m.add('<path d="%s" stroke="#7ab870" stroke-width=".6" stroke-opacity=".75" stroke-linecap="round" fill="none"/>'
                  % S.pts_d(glow, close=False))


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
