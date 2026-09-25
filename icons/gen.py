"""The six app marks and their house curtains, from one source.

Each mark is a 1930s enamelled badge cut from one die: a cast gilt lip, a
ring of beads sunk in a groove, translucent enamel fired over an
engine-turned ground, and a stone in a collet at the crown. The die is
shared; the enamel, the turning under it and the stone are each app's own.

Inside the die each app keeps a subject drawn from the real object, never
pieced together from circles and rectangles, and never lettered: a dish, a
globe, a cage, a salver, a shelf of bound volumes, a forged spanner. The
round forms come from icons/solid.py, which projects the object's true
geometry and shades each plane by its angle to the hall's key light (up and
to the left); forged outlines are traced from distance fields; the canary
runs on a spline through landmarks taken from the living bird. Colour is
laid in as the eye remembers the thing. Nothing on a mark glows and nothing
carries a gloss band: the domed crystal the gate's bezel holds over it
supplies the one reflection glass is allowed.

HUE below is the one source of truth. Each entry carries the mark's enamel
and the dye of the velvet its gate hangs, per theme, so the curtain follows
the mark in code and not by eye. The script writes both into the hall:

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
#   enamel   deep / field / lit: the translucent enamel at its rim, its body
#            and where it lies thinnest over the turning
#   livery   the colour a reader matches the curtain against (the field for
#            most; Bourse's field is black, so its livery is the canary)
#   pop      the crown stone
#   velvet   the gate's house curtain: an honest name and the dye at its
#            brightest crest, per theme. Every crest stays a quarter darker
#            than the leaf's body (--au-2) and inside the livery's family;
#            tests/test_web_assets.py holds both.
#   beads    the rim's bead count
# --------------------------------------------------------------------------
HUE = {
    'autopilot': {
        'name': 'Anime Autopilot', 'short': 'Autopilot',
        'deep': '#24060d', 'field': '#621925', 'lit': '#983446',
        'livery': '#621925', 'pop': '#fff4d2', 'beads': 36,
        'velvet': {'name': 'mulberry', 'onyx': '#92304c', 'ivory': '#9c4660'},
    },
    'groundstation': {
        'name': 'Ground Station', 'short': 'Ground Stn',
        'deep': '#5a2f08', 'field': '#c8781f', 'lit': '#eea24c',
        'livery': '#c8781f', 'pop': '#ffb454', 'beads': 32,
        'velvet': {'name': 'cognac', 'onyx': '#8a4f22', 'ivory': '#a0622a'},
    },
    'outreach': {
        'name': 'Outreach Desk', 'short': 'Outreach',
        'deep': '#0a2230', 'field': '#1c4a5f', 'lit': '#3a6e86',
        'livery': '#1c4a5f', 'pop': '#e8c968', 'beads': 20,
        'velvet': {'name': 'prussian', 'onyx': '#1f5066', 'ivory': '#2d5d74'},
    },
    'pressroom': {
        'name': 'The Press Room', 'short': 'Press Room',
        'deep': '#0b2616', 'field': '#1e6a40', 'lit': '#3f9463',
        'livery': '#1e6a40', 'pop': '#5a8040', 'beads': 30,
        'velvet': {'name': 'emerald', 'onyx': '#24754b', 'ivory': '#36906a'},
    },
    'arsenal': {
        'name': 'Arsenal', 'short': 'Arsenal',
        'deep': '#161c22', 'field': '#46535e', 'lit': '#72808b',
        'livery': '#46535e', 'pop': '#b03a2e', 'beads': 24,
        'velvet': {'name': 'gunmetal', 'onyx': '#44545f', 'ivory': '#5a6a74'},
    },
    'bourse': {
        'name': 'Bourse', 'short': 'Bourse',
        'deep': '#0f0e05', 'field': '#35320f', 'lit': '#5e5a22',
        'livery': '#6b6526', 'pop': '#e6a817', 'beads': 36,
        'velvet': {'name': 'olive gold', 'onyx': '#6b692c', 'ivory': '#8e8c4a'},
    },
}

# The house cloth for a gate whose service has no mark of its own yet: the
# claret of the entrance curtain.
HOUSE_VELVET = {'name': 'claret', 'onyx': '#c22b3b', 'ivory': '#c83a4a'}

# The hall's own mark keeps its July drawing (a keystone on gold); it is not
# one of the six and is not hung over any gate.
ATRIUM = {'field': '#c9a227', 'deep': '#8a6c12', 'ink': '#1a1409', 'pop': '#fff8e1'}

MARKS = list(HUE)                       # registry order
APPS = MARKS + ['atrium']

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
STEEL = ['#111518', '#2b3238', '#5a646b', '#e4e9ec', '#88939a', '#b7c0c6']
BLUED = ['#0d1114', '#22292f', '#475159', '#b3bdc3', '#6b767e', '#909ba2']
BRONZE = ['#1e1206', '#4a2c10', '#83552a', '#e9b98a', '#a8703c', '#cf9864']
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
    top, lit a little toward the lamp. One path per tone."""
    paths = {}
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        nx, ny = math.cos(a), math.sin(a)
        if facing == 0:
            lit = 0.55 * (nx * LX + ny * LY) + 0.35 + bias
        else:
            lit = facing * (nx * LX + ny * LY) + bias
        col = tone(lit, pal)
        a0, a1 = 2 * math.pi * k / n - 0.004, 2 * math.pi * (k + 1) / n + 0.004
        paths.setdefault(col, []).append(wedge_d(cx, cy, r0, r1, a0, a1))
    return ''.join('<path d="%s" fill="%s"/>' % (' '.join(v), c) for c, v in paths.items())


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


def ngon(cx, cy, r, n, start):
    return [pt(cx, cy, r, start + 2 * math.pi * k / n) for k in range(n)]


# --------------------------------------------------------------------------
# The die: shared by all six
# --------------------------------------------------------------------------
R_LIP, R_GROOVE, R_FIELD = 47.4, 44.2, 40.4
C = 48.0


def die_back(m, h):
    """Everything under the field: the badge's cast shadow, the lip, the
    groove and its beads, the fillet round the enamel."""
    m.add('<circle cx="%s" cy="%s" r="%s" fill="#000" fill-opacity=".55"/>' % (f(C + 0.9), f(C + 1.3), f(R_LIP)))
    m.add(faceted_ring(C, C, 46.0, R_LIP, +1, n=48))      # outer bevel of the lip
    m.add(faceted_ring(C, C, 45.2, 46.0, 0, n=48))        # its crown, turned flat
    m.add(faceted_ring(C, C, R_GROOVE, 45.2, -1, n=48))   # the inner bevel, down into the groove
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_GROOVE), GILT[0]))
    beads(m, h)
    m.add(faceted_ring(C, C, R_FIELD, 41.2, -1, n=48))    # the fillet the enamel is poured to


def beads(m, h):
    n, r = h['beads'], 42.75
    sh, bd, lt = [], [], []
    br = 1.2
    for k in range(n):
        a = -math.pi / 2 + 2 * math.pi * (k + 0.5) / n
        x, y = pt(C, C, r, a)
        sh.append(circle_d(x + 0.35, y + 0.5, br))
        bd.append(circle_d(x, y, br))
        lt.append(circle_d(x - 0.42, y - 0.46, br * 0.42))
    m.add('<path d="%s" fill="#000" fill-opacity=".6"/>' % ' '.join(sh))
    m.add('<path d="%s" fill="%s"/>' % (' '.join(bd), GILT[4]))
    m.add('<path d="%s" fill="%s"/>' % (' '.join(lt), GILT[3]))


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
# Shared drawing helpers for the subjects
# --------------------------------------------------------------------------
def lines_path(segs):
    return ' '.join('M%s %sL%s %s' % (f(a), f(b), f(c), f(d)) for a, b, c, d in segs)


def cyl_grad(m, name, x0, y0, x1, y1, cols, n=9, amb=0.2, shine=0.0):
    """A linear gradient across a cylinder's width, from edge (x0,y0) to edge
    (x1,y1): every stop is the colour of the strip whose normal turns from
    one edge to the other, lit by the key light."""
    dx, dy = x1 - x0, y1 - y0
    ln = math.hypot(dx, dy) or 1
    ax, ay = dx / ln, -dy / ln          # the across direction, y up
    stops = []
    for k in range(n):
        t = k / (n - 1)
        th = math.pi * (t - 0.5)          # -90 .. 90 degrees round the barrel
        nv = (ax * math.sin(th), ay * math.sin(th), math.cos(th))
        val = S.lambert(nv, amb)
        if shine:
            val = min(1.0, val + shine * S.spec(nv, 14))
        stops.append((t, S.ramp(cols, val)))
    return m.lin(name, stops, x0, y0, x1, y1)


def shadow(d, dx=0.8, dy=1.2, op=0.55, extra=''):
    return ('<path d="%s" fill="#000" fill-opacity="%s" transform="translate(%s %s)"%s/>'
            % (d, f(op), f(dx), f(dy), extra))


def solid_cylinder(fc, v, c0, c1, r0, r1, n, cols, back=0.0, amb=0.2, cap=True):
    """A vertical (world y) turned solid from c0 up to c1, its visible
    facets shaded by the key light."""
    for k in range(n):
        p0, p1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        pm = (p0 + p1) / 2
        nv = v.nrm((math.cos(pm), (r0 - r1) / max(0.01, abs(c1[1] - c0[1])), math.sin(pm)))
        if nv[2] <= 0:
            continue
        q = [v.proj((c0[0] + r0 * math.cos(p0), c0[1], c0[2] + r0 * math.sin(p0))),
             v.proj((c0[0] + r0 * math.cos(p1), c0[1], c0[2] + r0 * math.sin(p1))),
             v.proj((c1[0] + r1 * math.cos(p1), c1[1], c1[2] + r1 * math.sin(p1))),
             v.proj((c1[0] + r1 * math.cos(p0), c1[1], c1[2] + r1 * math.sin(p0)))]
        fc.add([(x, y) for x, y, _ in q], sum(z for _, _, z in q) / 4 - back, S.ramp(cols, S.lambert(nv, amb)))
    if cap:
        top = [v.proj((c1[0] + r1 * math.cos(2 * math.pi * k / n), c1[1], c1[2] + r1 * math.sin(2 * math.pi * k / n)))
               for k in range(n)]
        fc.add([(x, y) for x, y, _ in top], sum(z for _, _, z in top) / n - back - 0.5,
               S.ramp(cols, S.lambert(v.nrm((0, 1, 0)), amb)))


# --------------------------------------------------------------------------
# Ground Station: the earth station at dusk
# --------------------------------------------------------------------------
GS_AXIS = S.norm((0.66, 0.54, 0.52))      # where the dish looks: up, right, out


def ground_dusk(m, h):
    """The station's sky: amber enamel fired thin at the horizon and deep
    overhead, over a lined engine turning."""
    sky = m.lin('sky', [(0, '#0e1218'), (0.22, '#1c1e24'), (0.42, '#4a2c16'), (0.6, '#96501a'), (0.76, '#d98832'),
                        (0.86, '#f2b65a'), (0.9, '#f8cf88')], 0, 8, 0, 71)
    m.add('<rect x="0" y="0" width="96" height="96" fill="%s"/>' % sky)
    lined = m.pattern('turn', 8, 1.25, '<rect width="8" height=".32" fill="#ffd79a" fill-opacity=".16"/>')
    m.add('<rect x="0" y="7" width="96" height="65" fill="%s"/>' % lined)
    stars = [(30, 18, .55), (38, 13, .4), (22, 30, .45), (57, 12, .5), (64, 19, .35), (27, 23, .3), (47, 10, .35)]
    m.add('<path d="%s" fill="#fbe6c0" fill-opacity=".8"/>' % ' '.join(circle_d(x, y, r) for x, y, r in stars))


def subject_groundstation(m, h):
    """A parabolic dish on its mount, cut against the dusk the way a 1930s
    poster would cut an earth station: the bowl turned up toward the one
    star it is tracking. Every panel of the bowl takes its own angle to the
    key light."""
    v = S.View(0, 0, 21.0, yaw=0, pitch=-5)
    a = GS_AXIS
    u, w, _ = S.basis(a)
    F = 0.62
    depth = 1.0 / (4 * F)
    rc = v.proj(S.mul(a, depth))
    v.cx, v.cy = 43 - rc[0], 42 - rc[1]
    # the ground: a low rise, dark, catching the afterglow on its crest
    hz = 70.4
    ridge = 'M0 %s C20 %s 70 %s 96 %s' % (f(hz + 1.2), f(hz - 1.6), f(hz - 1.2), f(hz + 1.4))
    m.add('<path d="%s V96 H0 Z" fill="%s"/>'
          % (ridge, m.lin('earth', [(0, '#3a1c08'), (0.25, '#1e0e05'), (1, '#0e0703')], 0, hz - 2, 0, 90)))
    m.add('<path d="%s" stroke="#e8a050" stroke-opacity=".55" stroke-width=".5" fill="none"/>' % ridge)
    fc = S.Faces()
    tower = ['#140903', '#3a1c0a', '#6e3a16', '#a8662e', '#d89a58']
    gy = -1.72
    # a turned tower on a stepped round plinth, reeded near its head, a
    # turntable on top and the king post rising to the dish's back
    solid_cylinder(fc, v, (0.1, gy, -0.5), (0.1, gy + 0.1, -0.5), 0.7, 0.68, 32, tower, back=2)
    solid_cylinder(fc, v, (0.1, gy + 0.1, -0.5), (0.1, gy + 0.2, -0.5), 0.52, 0.5, 32, tower, back=2)
    solid_cylinder(fc, v, (0.1, gy + 0.2, -0.5), (0.1, -0.98, -0.5), 0.34, 0.27, 28, tower, back=2)
    for yb in (-0.98, -0.9):
        solid_cylinder(fc, v, (0.1, yb, -0.5), (0.1, yb + 0.05, -0.5), 0.31, 0.31, 28, tower, back=2)
    solid_cylinder(fc, v, (0.1, -0.85, -0.5), (0.1, -0.8, -0.5), 0.28, 0.28, 28, tower, back=2)
    solid_cylinder(fc, v, (0.1, -0.8, -0.5), (0.1, -0.7, -0.5), 0.46, 0.46, 32, tower, back=2)
    solid_cylinder(fc, v, (0.05, -0.7, -0.45), (0.0, -0.1, -0.3), 0.2, 0.13, 20, tower, back=2.5, cap=False)
    rings = [0.0, 0.18, 0.36, 0.54, 0.72, 0.88, 1.0]
    NP = 32
    inner = ['#2e1606', '#6a3410', '#b0621e', '#e2994a', '#f6c888', '#fff0d6']
    backc = ['#120803', '#2c1507', '#51290e', '#7c4418']

    def P(r, ph):
        return S.add(S.add(S.mul(u, r * math.cos(ph)), S.mul(w, r * math.sin(ph))), S.mul(a, r * r / (4 * F)))

    def n_in(r, ph):
        radial = S.add(S.mul(u, math.cos(ph)), S.mul(w, math.sin(ph)))
        return S.norm(S.sub(a, S.mul(radial, r / (2 * F))))
    for i in range(len(rings) - 1):
        r0, r1 = rings[i], rings[i + 1]
        for k in range(NP):
            p0, p1 = 2 * math.pi * k / NP, 2 * math.pi * (k + 1) / NP
            q = [v.proj(p) for p in (P(r0, p0), P(r0, p1), P(r1, p1), P(r1, p0))]
            nin = v.nrm(n_in((r0 + r1) / 2, (p0 + p1) / 2))
            if nin[2] > 0:
                t = S.lambert(nin, 0.16, wrap=0.15)
                t = min(1.0, t + 0.12 * max(0.0, nin[1]))
                col = S.ramp(inner, t)
            else:
                col = S.ramp(backc, S.lambert(S.mul(nin, -1), 0.2))
            fc.add([(x, y) for x, y, _ in q], sum(z for _, _, z in q) / 4, col)
    NR = 64
    lipc = ['#1a0c04', '#5a2e10', '#b06a2c', '#f2c080', '#fff4dc']
    for k in range(NR):
        p0, p1 = 2 * math.pi * k / NR, 2 * math.pi * (k + 1) / NR
        pm = (p0 + p1) / 2
        radial = S.add(S.mul(u, math.cos(pm)), S.mul(w, math.sin(pm)))
        quad = [P(1.0, p0), P(1.0, p1), S.add(P(1.0, p1), S.mul(a, -0.07)), S.add(P(1.0, p0), S.mul(a, -0.07))]
        q = [v.proj(p) for p in quad]
        nv = v.nrm(radial)
        if nv[2] > -0.2:
            fc.add([(x, y) for x, y, _ in q], sum(z for _, _, z in q) / 4 + 0.01,
                   S.ramp(lipc, S.lambert(nv, 0.15) + 0.4 * S.spec(nv, 10)))
    rim_pts = [v.proj(P(1.0, 2 * math.pi * k / 96)) for k in range(96)]
    m.add(shadow(S.pts_d([(x, y) for x, y, _ in rim_pts]), 1.0, 1.4, 0.35))
    m.add(fc.svg())
    # the feed: four struts from the rim to the focus, and the horn
    focus = S.mul(a, 0.98)
    fp = v.proj(focus)
    struts = [(v.proj(P(1.0, math.radians(d))), fp) for d in (40, 130, 220, 310)]
    for (x0, y0, _), (x1, y1, _) in struts:
        m.add('<path d="M%s %s L%s %s" stroke="#1a0c04" stroke-width="1.05" stroke-linecap="round"/>'
              % (f(x0 + .25), f(y0 + .35), f(x1 + .25), f(y1 + .35)))
    for (x0, y0, _), (x1, y1, _) in struts:
        m.add('<path d="M%s %s L%s %s" stroke="#6a3814" stroke-width=".8" stroke-linecap="round"/>' % (f(x0), f(y0), f(x1), f(y1)))
        m.add('<path d="M%s %s L%s %s" stroke="#e8a860" stroke-width=".32" stroke-linecap="round" transform="translate(-.22 -.22)"/>'
              % (f(x0), f(y0), f(x1), f(y1)))
    hc = S.Faces()
    hornc = ['#1a0c04', '#6a3814', '#c07a38', '#f8d49a']

    def ring(ph, r, t):
        return S.add(S.add(focus, S.mul(a, t)), S.add(S.mul(u, r * math.cos(ph)), S.mul(w, r * math.sin(ph))))
    for k in range(20):
        p0, p1 = 2 * math.pi * k / 20, 2 * math.pi * (k + 1) / 20
        pm = (p0 + p1) / 2
        nv = v.nrm(S.add(S.mul(u, math.cos(pm)), S.mul(w, math.sin(pm))))
        if nv[2] <= 0:
            continue
        q = [v.proj(p) for p in (ring(p0, 0.075, -0.1), ring(p1, 0.075, -0.1), ring(p1, 0.1, 0.1), ring(p0, 0.1, 0.1))]
        hc.add([(x, y) for x, y, _ in q], sum(z for _, _, z in q) / 4, S.ramp(hornc, S.lambert(nv, 0.2)))
    cap = [v.proj(ring(2 * math.pi * k / 20, 0.1, 0.1)) for k in range(20)]
    hc.add([(x, y) for x, y, _ in cap], 99, S.ramp(hornc, S.lambert(v.nrm(a), 0.2)))
    m.add(hc.svg(0.12))
    # the star it is tracking, on the dish's own line of sight
    k = 1.2
    while math.hypot(v.proj(S.mul(a, k))[0] - 48, v.proj(S.mul(a, k))[1] - 48) < 31 and k < 6:
        k += 0.05
    sx, sy = v.proj(S.mul(a, k))[:2]
    star = [(sx, sy - 3.4), (sx + .55, sy - .55), (sx + 3.4, sy), (sx + .55, sy + .55),
            (sx, sy + 3.4), (sx - .55, sy + .55), (sx - 3.4, sy), (sx - .55, sy - .55)]
    m.add('<path d="%s" fill="#fff4d8"/>' % poly_d(star))
    m.add('<circle cx="%s" cy="%s" r="1" fill="%s"/>' % (f(sx), f(sy), h['pop']))


# --------------------------------------------------------------------------
# Bourse: the canary on watch in its cage
# --------------------------------------------------------------------------
def ground_lattice(m, h):
    """Olive-gold enamel, deepest at the rim, over the lozenge lattice of
    Bourse's own page (a diamond in a diamond on a fine repeat)."""
    grad = m.rad('enamel', [(0, h['lit']), (0.6, h['field']), (1, h['deep'])], 44, 40, 46, 40, 34)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), grad))
    q = 1.2
    dia = ' '.join(poly_d([(cx, cy - q), (cx + q, cy), (cx, cy + q), (cx - q, cy)])
                   for cx, cy in ((3, 0), (0, 3), (6, 3), (3, 6)))
    tile = ('<path d="M0 0 L6 6 M6 0 L0 6" stroke="#d8c060" stroke-width=".4" stroke-opacity=".22"/>'
            '<path d="%s" stroke="#d8c060" stroke-width=".3" stroke-opacity=".3" fill="none"/>' % dia)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), m.pattern('turn', 6, 6, tile, 'translate(48 51)')))


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


# The canary, drawn from the living bird: a short conical bill, a round
# crown running without a break into the nape, the breast carried full and
# forward, the folded wing lying along the back with its primaries reaching
# over the base of the tail, the tail long, straight and notched, the whole
# bird sitting up at about fifty degrees on its perch. Coordinates are the
# bird's own, its feet on the perch at the origin, facing the key light.
CANARY = {
    'body': [(-10.5, -17.95, 1), (-8.3, -19.3, 1), (-7.3, -20.5), (-4.8, -21.7), (-2.0, -21.4), (-0.1, -19.9),
             (1.5, -17.6), (3.1, -14.4), (4.3, -10.6), (5.2, -6.8), (5.9, -3.6), (6.6, -1.0), (8.4, 3.9),
             (10.3, 8.8, 1), (9.2, 8.3, 1), (8.1, 9.2, 1), (6.1, 4.6), (4.0, 0.6), (2.3, -0.9), (-0.2, -1.4),
             (-3.4, -2.2), (-6.6, -4.8), (-8.6, -8.8), (-8.9, -12.6), (-8.25, -15.3), (-8.3, -16.75, 1)],
    'shade': [(-8.9, -11.5), (-8.6, -8.8), (-6.6, -4.8), (-3.4, -2.2), (-0.2, -1.4), (2.3, -0.9), (4.0, 0.6),
              (6.1, 4.6), (8.1, 9.2, 1), (9.2, 8.3, 1), (10.3, 8.8, 1), (8.4, 3.9), (6.6, -1.0), (4.8, -2.0),
              (1.4, -3.4), (-2.4, -5.0), (-5.6, -7.4), (-7.6, -10.0)],
    'wing': [(-4.6, -14.9, 1), (-1.9, -16.7), (1.1, -16.4), (3.0, -13.2), (4.4, -8.6), (5.7, -3.4),
             (7.2, 1.2, 1), (4.3, -1.6), (0.9, -4.0), (-2.3, -7.2), (-4.3, -10.9)],
    'coverts': [(-4.6, -14.9, 1), (-1.9, -16.7), (1.1, -16.4), (3.0, -13.2), (3.7, -11.0, 1), (1.8, -10.5),
                (-0.8, -10.7), (-3.0, -11.6), (-4.4, -12.8)],
    'primaries': [(3.4, -11.0), (4.4, -8.6), (5.7, -3.4), (7.2, 1.2, 1), (4.3, -1.6), (2.3, -3.0, 1),
                  (2.6, -6.6)],
    'bill': [(-8.2, -19.35, 1), (-9.5, -18.9), (-10.6, -17.95, 1), (-9.5, -17.1), (-8.2, -16.7, 1)],
    'gape': [(-10.3, -17.95), (-9.2, -17.85), (-8.1, -18.0)],
    'eye': (-6.1, -19.0),
    'feet': ('M-1.6 -1.7 L-1.3 0 M-1.3 0 C-1.9 0.1 -2.4 0.5 -2.5 1.0 M-1.3 0 C-0.9 0.4 -1.0 0.9 -1.3 1.2 '
             'M0.8 -1.5 L1.0 0 M1.0 0 C0.5 0.2 0.3 0.7 0.4 1.1 M1.0 0 C1.6 0.1 1.9 0.6 1.8 1.0'),
}


def canary(m, x, y, s, rot=0.0):
    """Lay the bird with its feet at (x, y), scale s, turned rot degrees.
    Colour by impression: the lemon of a clear canary, lit on the crown and
    breast, ochre on its shadow side, the wing in planes of deeper gold, a
    horn bill and a dark eye."""
    g = 'translate(%s %s) rotate(%s) scale(%s)' % (f(x), f(y), f(rot), f(s))
    body = m.rad('cn-body', [(0, '#fff6c2'), (0.2, '#fbe46a'), (0.5, '#f2c936'), (0.8, '#dca722'), (1, '#b07c12')],
                 -6.0, -18.5, 26, -7.2, -19.4)
    shade = m.lin('cn-shade', [(0, '#c28e16', 0), (0.3, '#b27e12', 0.7), (1, '#6e4a0c', 0.95)], -6, -12, 6, 8)
    wing = m.lin('cn-wing', [(0, '#ecc43c'), (0.5, '#d6a426'), (1, '#9c6e14')], -4, -16, 7, 2)
    cov = m.lin('cn-cov', [(0, '#fbe37a'), (1, '#e8bf3a')], -4, -16, 2, -10)
    prim = m.lin('cn-prim', [(0, '#c08c1c'), (1, '#80580e')], 3, -8, 7, 2)
    bill = m.lin('cn-bill', [(0, '#f6dcc6'), (1, '#c8927a')], -10.5, -19, -8.5, -16.8)
    bd = smooth_d(CANARY['body'])
    out = ['<g transform="%s">' % g]
    out.append('<path d="%s" fill="#000" fill-opacity=".45" transform="translate(.6 .8)"/>' % bd)
    out.append('<path d="%s" fill="%s"/>' % (bd, body))
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(CANARY['shade']), shade))
    wd = smooth_d(CANARY['wing'])
    out.append('<path d="%s" fill="#5a3c08" fill-opacity=".3" transform="translate(.25 .35)"/>' % wd)
    out.append('<path d="%s" fill="%s"/>' % (wd, wing))
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(CANARY['coverts']), cov))
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(CANARY['primaries']), prim))
    out.append('<path d="%s" stroke="#a8705a" stroke-width=".45" fill="none" stroke-linecap="round"/>' % CANARY['feet'])
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(CANARY['bill']), bill))
    out.append('<path d="%s" stroke="#8a5440" stroke-width=".18" fill="none" stroke-linecap="round"/>'
               % smooth_d(CANARY['gape'], closed=False))
    ex, ey = CANARY['eye']
    out.append('<circle cx="%s" cy="%s" r=".62" fill="#1c1108"/><circle cx="%s" cy="%s" r=".15" fill="#fff2d0"/>'
               % (f(ex), f(ey), f(ex - .2), f(ey - .2)))
    out.append('</g>')
    return ''.join(out)


def subject_bourse(m, h):
    """The canary the desk keeps on watch, calm on its perch in a gilded
    dome cage whose door stands open: it could go, and it stays. The wires
    are computed round a real drum and dome, the far ones passing behind the
    bird and the near ones in front."""
    v = S.View(48, 0, 1.0, yaw=0, pitch=9)
    R, yb, ys, H = 17.5, -68.0, -32.0, 18.5      # radius; base, spring, dome height (y up)
    NW = 14
    door = (math.radians(90 - 30), math.radians(90 + 30))   # the opening, front and centre
    wire_col = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]

    def drum(ph, y0, y1, n=10):
        return [(R * math.cos(ph), y0 + (y1 - y0) * k / n, R * math.sin(ph)) for k in range(n + 1)]

    def dome(ph):
        pts = []
        for k in range(0, 15):
            t = (math.pi / 2) * k / 14
            r = R * math.cos(t)
            pts.append((r * math.cos(ph), ys + H * math.sin(t) ** 0.85, r * math.sin(ph)))
        return pts

    def hoop(y, a0=0.0, a1=2 * math.pi, n=72):
        return [(R * math.cos(a0 + (a1 - a0) * k / n), y, R * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]

    def line(pts, col, wdt, extra=''):
        d = 'M' + ' L'.join('%s %s' % (f(p[0]), f(p[1])) for p in [v.proj(q) for q in pts])
        return ('<path d="%s" stroke="%s" stroke-width="%s" fill="none" stroke-linecap="round" '
                'stroke-linejoin="round"%s/>' % (d, col, f(wdt), extra))

    def wire(pts, lit, wdt=0.9):
        return (line(pts, '#000', wdt + 0.15, ' stroke-opacity=".45" transform="translate(.35 .5)"')
                + line(pts, S.ramp(wire_col, lit), wdt))
    back, front = [], []
    for k in range(NW):
        ph = 2 * math.pi * (k + 0.5) / NW
        lit = S.lambert(v.nrm((math.cos(ph), 0, math.sin(ph))), 0.25)
        if math.sin(ph) < 0:
            back.append(line(drum(ph, yb, ys) + dome(ph)[1:], S.ramp([GILT[0], GILT[1], GILT[2]], lit), 0.7))
        elif door[0] < ph < door[1]:
            front.append(wire(dome(ph), lit))                      # over the door, only the dome
        else:
            front.append(wire(drum(ph, yb, ys) + dome(ph)[1:], lit))
    # the base: a turned tray, its drum banded in the curtain's own olive gold
    fc = S.Faces()
    tray = [GILT[0], GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
    band = ['#1c1a08', '#3e3c16', '#6b692c', '#8e8c4a', '#b8b470']
    solid_cylinder(fc, v, (0, yb - 6.6, 0), (0, yb - 5.4, 0), R + 3.8, R + 3.8, 48, tray)
    solid_cylinder(fc, v, (0, yb - 5.4, 0), (0, yb - 1.2, 0), R + 2.3, R + 2.3, 48, band)
    solid_cylinder(fc, v, (0, yb - 1.2, 0), (0, yb, 0), R + 2.9, R + 2.6, 48, tray)
    foot = [v.proj(((R + 3.8) * math.cos(t), yb - 6.6, (R + 3.8) * math.sin(t)))[:2] for t in
            [2 * math.pi * k / 48 for k in range(48)]]
    m.add(shadow(S.pts_d(foot), 1.0, 1.4, 0.5))
    m.add(fc.svg())
    m.add(''.join(back))
    for y, wdt in ((yb + 0.4, 1.4), (ys, 1.4)):
        m.add(line(hoop(y, math.pi, 2 * math.pi), GILT[1], wdt * 0.7))
    # the perch across the cage, a turned dowel
    py = v.proj((0, -58.6, 0))[1]
    m.add('<rect x="31.4" y="%s" width="33.2" height="1.9" fill="%s"/>'
          % (f(py - 0.95), cyl_grad(m, 'perch', 0, py - 0.95, 0, py + 0.95, BRONZE)))
    m.add(canary(m, 47.6, py - 0.5, 1.04, rot=0))
    # near halves of the hoops: the base ring whole, the spring ring over the
    # door, the waist ring broken by the opening
    m.add(wire(hoop(yb + 0.4, 0, math.pi), 0.8, 1.4))
    m.add(wire(hoop(ys, 0, math.pi), 0.8, 1.4))
    for a0, a1 in ((0, door[0]), (door[1], math.pi)):
        m.add(wire(hoop(-50.0, a0, a1, 24), 0.7, 0.8))
    m.add(''.join(front))
    # the door, hinged on the left of the opening and swung wide
    hx, hz = R * math.cos(door[1]), R * math.sin(door[1])
    wdt = 2 * R * math.sin((door[1] - door[0]) / 2)
    sw = math.radians(142)
    dx, dz = math.cos(sw), math.sin(sw)
    y0, y1 = yb + 1.2, ys - 1.6

    def dp(t, y):
        return (hx + dx * wdt * t, y, hz + dz * wdt * t)
    for t in (0.0, 1 / 3.0, 2 / 3.0, 1.0):
        m.add(wire([dp(t, y0), dp(t, y1)], 0.55 if t else 0.8, 0.75))
    for y in (y0, (y0 + y1) / 2, y1):
        m.add(wire([dp(0, y), dp(1, y)], 0.7, 0.75))
    # the crown of the dome: a turned finial and the ring it hangs by
    ax, ay = v.proj((0, ys + H, 0))[:2]
    fin = ('M%s %s C%s %s %s %s %s %s C%s %s %s %s %s %s Z'
           % (f(ax - 3.2), f(ay + 1.2), f(ax - 2.6), f(ay - 1.6), f(ax - 0.8), f(ay - 2.6), f(ax), f(ay - 3.4),
              f(ax + 0.8), f(ay - 2.6), f(ax + 2.6), f(ay - 1.6), f(ax + 3.2), f(ay + 1.2)))
    m.add(relief(fin, cyl_grad(m, 'finial', ax - 3.2, 0, ax + 3.2, 0, GILT)))
    m.add(relief(circle_d(ax, ay - 4.2, 1.2), GILT[4]))
    m.add('<ellipse cx="%s" cy="%s" rx="2.6" ry="2.3" fill="none" stroke="#000" stroke-opacity=".5" '
          'stroke-width="1.1" transform="translate(.35 .5)"/>'
          '<ellipse cx="%s" cy="%s" rx="2.6" ry="2.3" fill="none" stroke="%s" stroke-width="1"/>'
          '<path d="M%s %s A2.6 2.3 0 0 1 %s %s" stroke="%s" stroke-width=".45" fill="none"/>'
          % (f(ax), f(ay - 7.4), f(ax), f(ay - 7.4), GILT[4], f(ax - 2.6), f(ay - 7.4), f(ax + 0.4), f(ay - 9.7), GILT[3]))


# --------------------------------------------------------------------------
# Anime Autopilot: the season shelf under the lamp
# --------------------------------------------------------------------------
PITCH_AP = math.radians(16)                 # the shelf seen a little from above

CLOTH = {
    'morocco': ['#260607', '#561313', '#8a2a22', '#b64638', '#e07c64'],
    'bottle':  ['#07170e', '#143522', '#28583a', '#468458', '#86b48c'],
    'vellum':  ['#4e4430', '#8e7e5c', '#cbbc96', '#e9dec2', '#fdf6e2'],
    'navy':    ['#060d16', '#0f263a', '#1e4560', '#386a86', '#76a4c0'],
    'calf':    ['#281505', '#58320f', '#95622c', '#c49052', '#ebc488'],
}
PAGES = ['#6e6250', '#b8aa88', '#e6dcc0', '#f6efdc']
MAHOGANY = ['#140703', '#361709', '#643017', '#9c5429', '#d28a55']


def ground_lamp(m, h):
    """Oxblood enamel under the reading lamp: the crown's opal is the lamp,
    and its light falls in a soft cone onto the shelf, over a fine
    barleycorn turning."""
    base = m.rad('enamel', [(0, h['lit']), (0.5, h['field']), (1, h['deep'])], 48, 30, 50, 48, 14)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), base))
    cone = m.rad('cone', [(0, '#f6b69a', 0.42), (0.35, '#c2584e', 0.22), (1, h['field'], 0)], 48, 8, 58, 48, 6)
    m.add('<path d="M40 6 L14 70 Q48 80 82 70 L56 6 Z" fill="%s"/>' % cone)
    line = '<rect width=".3" height="10" fill="%s" fill-opacity=".22"/>' % h['lit']
    for k, turn in enumerate((-60, 60)):
        m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>'
              % (f(R_FIELD), m.pattern('turn%d' % k, 1.2, 10, line, 'rotate(%d 48 48)' % turn)))


def volume(m, name, x0, w, h, cloth, bands=(), label=None, gilt_head=False, lean=0.0, pivot=None,
           floor=64.0, depth=None, headband='#b5362c'):
    """One bound volume standing on the shelf, drawn as the real object:
    the rounded back lit across its barrel, raised cords that catch the
    lamp on their upper slope, a leather label onlay, and the head seen
    from a little above (the boards' edges, the page block between them,
    the leather turned over the cap). `bands` and `label` are measured up
    from the shelf."""
    ramp = CLOTH[cloth]
    D = depth or h * 0.7
    hd = D * math.sin(PITCH_AP)                # how much of the head shows
    top = floor - h * math.cos(PITCH_AP)
    x1 = x0 + w
    out = []
    # the head: boards' edges either side, the page block between them,
    # the cap's crescent at the front
    head = [(x0, top), (x1, top), (x1, top - hd), (x0, top - hd)]
    out.append('<path d="%s" fill="%s"/>' % (poly_d(head), ramp[3]))
    bt = min(0.7, w * 0.09)
    blk = [(x0 + bt, top - 0.5), (x1 - bt, top - 0.5), (x1 - bt, top - hd + 0.25), (x0 + bt, top - hd + 0.25)]
    pages = [GILT[2], GILT[4], GILT[5]] if gilt_head else PAGES[1:]
    out.append('<path d="%s" fill="%s"/>' % (poly_d(blk), m.lin(name + '-blk', [(0, pages[-1]), (1, pages[0])],
                                                                  x0, top - hd, x0, top)))
    out.append('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".25"/>'
               % (f(x0 + bt), f(top - hd + 0.3), f(x1 - bt), f(top - hd + 0.3), ramp[1]))
    cap = 'M%s %s Q%s %s %s %s L%s %s Q%s %s %s %s Z' % (
        f(x0), f(top), f((x0 + x1) / 2), f(top + 0.9), f(x1), f(top), f(x1), f(top - 1.0),
        f((x0 + x1) / 2), f(top - 0.3), f(x0), f(top - 1.0))
    out.append('<path d="%s" fill="%s"/>' % (cap, m.lin(name + '-cap', [(0, ramp[4]), (0.5, ramp[3]), (1, ramp[1])], x0, 0, x1, 0)))
    if headband:
        out.append('<path d="M%s %s Q%s %s %s %s" stroke="%s" stroke-width=".55" fill="none"/>'
                   % (f(x0 + 0.8), f(top - 0.55), f((x0 + x1) / 2), f(top - 0.1), f(x1 - 0.8), f(top - 0.55), headband))
    # the back: a barrel, lit on the lamp's side
    back = 'M%s %s Q%s %s %s %s L%s %s L%s %s Z' % (
        f(x0), f(top), f((x0 + x1) / 2), f(top + 0.9), f(x1), f(top), f(x1), f(floor), f(x0), f(floor))
    g = cyl_grad(m, name, x0, 0, x1, 0, ramp, n=11, amb=0.22, shine=0.35)
    out.append('<path d="%s" fill="%s"/>' % (back, g))
    # the joints: the boards' hinges either side of the back, in shade
    out.append('<path d="M%s %s V%s M%s %s V%s" stroke="%s" stroke-width=".35" stroke-opacity=".7"/>'
               % (f(x0 + 0.35), f(top + 0.6), f(floor), f(x1 - 0.35), f(top + 0.6), f(floor), ramp[0]))
    # raised cords, each a small ridge: lit upper slope, shaded under
    for yb in bands:
        y = floor - yb * math.cos(PITCH_AP)
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(x0), f(y - 0.75), f(x1), f(y), f(x0), ramp[4]))
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(x0), f(y), f(x1), f(y + 0.75), f(x0), ramp[0]))
        out.append('<path d="M%s %s H%s" stroke="%s" stroke-width=".28" stroke-opacity=".8"/>' % (f(x0), f(y - 1.25), f(x1), GILT[5]))
    if label:
        y0, y1, col = label
        ly0, ly1 = floor - y1 * math.cos(PITCH_AP), floor - y0 * math.cos(PITCH_AP)
        lg = cyl_grad(m, name + '-lab', x0 + 0.6, 0, x1 - 0.6, 0, col, n=7, amb=0.25, shine=0.3)
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="%s"/>' % (f(x0 + 0.6), f(ly0), f(x1 - 0.6), f(ly1), f(x0 + 0.6), lg))
        out.append('<path d="M%s %s H%s V%s H%s Z" fill="none" stroke="%s" stroke-width=".32"/>'
                   % (f(x0 + 1.1), f(ly0 + 0.5), f(x1 - 1.1), f(ly1 - 0.5), f(x0 + 1.1), GILT[5]))
    # the rounding carried over the cords and the label: shade the far edge
    shade = m.lin(name + '-rnd', [(0, '#000', 0), (0.55, '#000', 0), (1, '#000', 0.45)], x0, 0, x1, 0)
    out.append('<path d="%s" fill="%s"/>' % (back, shade))
    body = ''.join(out)
    sil = 'M%s %s L%s %s L%s %s L%s %s Z' % (f(x0), f(top - hd), f(x1), f(top - hd), f(x1), f(floor), f(x0), f(floor))
    if lean:
        px, py = pivot
        t = ' transform="rotate(%s %s %s)"' % (f(-lean), f(px), f(py))
        return '<g%s>%s%s</g>' % (t, shadow(sil, 0.9, 0.3, 0.5), body)
    return shadow(sil, 0.9, 0.3, 0.5) + body


def subject_autopilot(m, h):
    """The season shelf, the page's 開架: a cast bookend and five volumes of
    uneven height and cloth, standing as a real shelf stands, the last one
    tipped against its neighbour where tonight's volume will go. The lamp
    over it is the crown's opal."""
    floor = 63.6
    pl, pr = 17.0, 79.0
    pd = 4.2 * math.sin(PITCH_AP) * 3.2      # the plank's top as seen
    # brackets: cast brass, a drop and a brace scrolled under the plank
    for bx, s_ in ((27.0, 1), (69.0, -1)):
        d = ('M%s %s H%s V%s C%s %s %s %s %s %s H%s Z'
             % (f(bx - s_ * 1.4), f(floor + 3.4), f(bx + s_ * 7.2), f(floor + 4.6),
                f(bx + s_ * 3.4), f(floor + 5.4), f(bx + s_ * 1.6), f(floor + 8.2), f(bx + s_ * 1.4), f(floor + 12.4),
                f(bx - s_ * 1.4)))
        m.add(relief(d, cyl_grad(m, 'brk%d' % s_, bx - 1.4, 0, bx + 1.4, 0, [GILT[0], GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]])))
    # the plank: its top in the lamp's pool, a bullnose on the front
    m.add('<path d="M%s %s H%s L%s %s H%s Z" fill="%s"/>'
          % (f(pl + 1.2), f(floor - pd), f(pr - 1.2), f(pr), f(floor), f(pl),
             m.lin('plank-top', [(0, MAHOGANY[2]), (0.5, MAHOGANY[4]), (1, MAHOGANY[2])], pl, 0, pr, 0)))
    m.add('<rect x="%s" y="%s" width="%s" height="3.6" fill="#000" fill-opacity=".5" transform="translate(.6 .9)"/>'
          % (f(pl), f(floor), f(pr - pl)))
    m.add('<rect x="%s" y="%s" width="%s" height="3.6" fill="%s"/>'
          % (f(pl), f(floor), f(pr - pl), cyl_grad(m, 'bull', 0, floor, 0, floor + 3.6, MAHOGANY, amb=0.25)))
    m.add('<path d="M%s %s h1.2 v3.6 h-1.2 Z" fill="%s"/>' % (f(pl), f(floor), MAHOGANY[1]))
    # at the left end, two volumes lying flat, the way a real shelf ends:
    # the spine toward us with its cords standing up, the upper board seen
    # from a little above, the page block showing at head and tail
    bx = 31.0

    def lying(name, x0, x1, y1, th, cloth, cords):
        ramp = CLOTH[cloth]
        y0 = y1 - th
        bd = th * 1.2 * math.sin(PITCH_AP) * 2.2           # the upper board, foreshortened
        board = [(x0 + 0.6, y0 - bd), (x1 - 0.6, y0 - bd), (x1, y0), (x0, y0)]
        m.add(shadow(poly_d([(x0, y0 - bd), (x1, y0 - bd), (x1, y1), (x0, y1)]), 0.8, 0.5, 0.5))
        m.add('<path d="%s" fill="%s"/>' % (poly_d(board), m.lin(name + '-bd', [(0, ramp[3]), (1, ramp[2])], x0, y0 - bd, x0, y0)))
        # the page block at the tail end, between the boards
        m.add('<path d="%s" fill="%s"/>' % (poly_d([(x1 - 0.55, y0 - bd + 0.5), (x1 - 0.1, y0 - 0.2), (x1 - 0.1, y1 - 0.5),
                                                    (x1 - 0.55, y1 - 0.5)]), PAGES[2]))
        back = 'M%s %s Q%s %s %s %s L%s %s Q%s %s %s %s Z' % (
            f(x0), f(y0), f(x0 - 0.8), f((y0 + y1) / 2), f(x0), f(y1), f(x1), f(y1), f(x1 + 0.8), f((y0 + y1) / 2), f(x1), f(y0))
        m.add('<path d="%s" fill="%s"/>' % (back, cyl_grad(m, name, 0, y0, 0, y1, ramp, n=9, amb=0.22, shine=0.3)))
        for cx_ in cords:
            m.add('<path d="M%s %s V%s H%s V%s Z" fill="%s"/>' % (f(cx_ - 0.7), f(y0), f(y1), f(cx_), f(y0), ramp[4]))
            m.add('<path d="M%s %s V%s H%s V%s Z" fill="%s"/>' % (f(cx_), f(y0), f(y1), f(cx_ + 0.7), f(y0), ramp[0]))
            m.add('<path d="M%s %s V%s" stroke="%s" stroke-width=".26" stroke-opacity=".8"/>' % (f(cx_ - 1.2), f(y0 + 0.2), f(y1 - 0.2), GILT[5]))
        rnd = m.lin(name + '-rnd', [(0, '#000', 0), (0.6, '#000', 0), (1, '#000', 0.4)], 0, y0, 0, y1)
        m.add('<path d="%s" fill="%s"/>' % (back, rnd))
    lying('l1', 17.0, 30.6, floor, 5.6, 'bottle', (20.4, 27.0))
    lying('l2', 18.4, 29.4, floor - 5.6 - 1.0, 4.6, 'calf', (21.4, 26.4))
    x = bx
    m.add(volume(m, 'v1', x, 7.0, 25.5, 'vellum', bands=(4.5, 19.0), label=(13.0, 17.4, CLOTH['bottle'])))
    x += 7.0
    m.add(volume(m, 'v2', x, 6.2, 22.0, 'bottle', bands=(3.8, 6.0, 16.8)))
    x += 6.2
    m.add(volume(m, 'v3', x, 9.6, 31.0, 'morocco', bands=(4.6, 10.6, 19.8, 25.6), label=(12.4, 18.2, ['#0a0605', '#1d1410', '#3a2a22', '#5e483c', '#8a7060']),
                 gilt_head=True))
    x += 9.6
    m.add(volume(m, 'v4', x, 5.6, 20.6, 'navy', bands=(3.6, 16.4), headband='#3a7a4b'))
    x += 5.6
    # the last volume tipped against its neighbour: its left foot is the
    # pivot, its face rests on the neighbour's shoulder
    g = 4.8
    theta = math.degrees(math.atan2(g, 20.6))
    m.add(volume(m, 'v5', x + g, 8.0, 25.0, 'calf', bands=(4.2, 9.2, 18.8), label=(11.4, 16.6, ['#200806', '#46120c', '#6e2016', '#9a3a28', '#c46048']),
                 lean=theta, pivot=(x + g, floor)))


# --------------------------------------------------------------------------
# Outreach Desk: a calling card presented on a salver
# --------------------------------------------------------------------------
SILVER = ['#06111a', '#142838', '#304a5a', '#688494', '#a8bcc6', '#dde7ec', '#f8fbfc']


def ground_basket(m, h):
    """Prussian blue enamel over a basket-weave turning, the ground of a
    silver card case."""
    grad = m.rad('enamel', [(0, h['lit']), (0.55, h['field']), (1, h['deep'])], 42, 34, 50, 40, 30)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), grad))
    segs, s = [], 4.4
    for i in range(2):
        for j in range(2):
            x0, y0 = i * s, j * s
            for t in (0.9, 2.2, 3.5):
                if (i + j) % 2 == 0:
                    segs.append((x0 + 0.4, y0 + t, x0 + s - 0.4, y0 + t))
                else:
                    segs.append((x0 + t, y0 + 0.4, x0 + t, y0 + s - 0.4))
    tile = '<path d="%s" stroke="%s" stroke-width=".42" stroke-opacity=".38"/>' % (lines_path(segs), h['lit'])
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), m.pattern('turn', 8.8, 8.8, tile, 'translate(48 48)')))


def subject_outreach(m, h):
    """A calling card on a silver salver, the way a 1930s foyer sent a
    caller's name in: the salver's well, its cavetto and its rolled rim
    computed as the turned and chased object they are, the card laid on it
    with one corner turned up, which said it was left by hand."""
    v = S.View(48, 53, 33.0, yaw=0, pitch=40)
    WELL, CAV = 0.76, 0.86

    def height(r, ph):
        if r <= WELL:
            return 0.0
        if r <= CAV:
            t = (r - WELL) / (CAV - WELL)
            return 0.07 * (1 - math.cos(math.pi * t)) / 2
        t = (r - CAV) / (1 - CAV)
        return 0.07 + 0.05 * math.sin(math.pi * t) ** 0.8

    def P(r, ph):
        return (r * math.cos(ph), height(r, ph), r * math.sin(ph))

    def normal(r, ph):
        e = 0.004
        hr = (height(r + e, ph) - height(r - e, ph)) / (2 * e)
        hp = (height(r, ph + e) - height(r, ph - e)) / (2 * e) / max(r, 0.05)
        radial = (math.cos(ph), 0, math.sin(ph))
        tang = (-math.sin(ph), 0, math.cos(ph))
        return S.norm(S.sub((0, 1, 0), S.add(S.mul(radial, hr), S.mul(tang, hp))))

    def silver(nv, k=1.0):
        return S.ramp(SILVER, min(1.0, S.lambert(nv, 0.1) * 0.72 * k + 0.42 * S.spec(nv, 14)))
    fc = S.Faces()
    # the rim's outer wall, down to the foot ring, seen on the near side
    NS = 64
    for k in range(NS):
        p0, p1 = 2 * math.pi * k / NS, 2 * math.pi * (k + 1) / NS
        pm = (p0 + p1) / 2
        nv = v.nrm((math.cos(pm), -0.25, math.sin(pm)))
        if nv[2] <= 0:
            continue
        q = [v.proj(p) for p in ((math.cos(p0), 0.07, math.sin(p0)), (math.cos(p1), 0.07, math.sin(p1)),
                                 (0.95 * math.cos(p1), -0.06, 0.95 * math.sin(p1)),
                                 (0.95 * math.cos(p0), -0.06, 0.95 * math.sin(p0)))]
        fc.add([(x, y) for x, y, _ in q], sum(z for _, _, z in q) / 4 - 0.3,
               S.ramp(SILVER, S.lambert(nv, 0.1) * 0.62))
    # the cavetto rising from the well, and the rolled border, turned smooth
    border = [CAV + (1 - CAV) * k / 4 for k in range(5)]
    for r0, r1, flat in [(WELL, (WELL + CAV) / 2, False), ((WELL + CAV) / 2, CAV, False)] +             [(border[i], border[i + 1], False) for i in range(4)]:
        for k in range(NS):
            p0, p1 = 2 * math.pi * k / NS, 2 * math.pi * (k + 1) / NS
            if flat:
                q = [v.proj(p) for p in ((r0 * math.cos(p0), 0.075, r0 * math.sin(p0)), (r0 * math.cos(p1), 0.075, r0 * math.sin(p1)),
                                         (r1 * math.cos(p1), 0.075, r1 * math.sin(p1)), (r1 * math.cos(p0), 0.075, r1 * math.sin(p0)))]
                col = SILVER[1]
            else:
                q = [v.proj(p) for p in (P(r0, p0), P(r0, p1), P(r1, p1), P(r1, p0))]
                nv = v.nrm(normal((r0 + r1) / 2, (p0 + p1) / 2))
                col = S.ramp(SILVER, min(1.0, S.lambert(nv, 0.1) * 0.78 + 0.5 * S.spec(nv, 16)))
            fc.add([(x, y) for x, y, _ in q], sum(z for _, _, z in q) / 4, col)
    outer = [v.proj((math.cos(2 * math.pi * k / 96), -0.06, math.sin(2 * math.pi * k / 96)))[:2] for k in range(96)]
    m.add(shadow(S.pts_d(outer), 1.3, 2.0, 0.6))
    m.add(fc.svg(0.16))
    # the well: flat and polished, giving back the room: pale toward the lamp,
    # darkening to the blue of the enamel it stands over
    well = [v.proj((WELL * math.cos(2 * math.pi * k / 96), 0, WELL * math.sin(2 * math.pi * k / 96)))[:2] for k in range(96)]
    wx0, wy0 = well[48]
    wx1, wy1 = well[0]
    wl = m.lin('well', [(0, '#c6d6de'), (0.3, '#7e98a6'), (0.62, '#2e4a5a'), (1, '#10202c')], wx0, wy0 - 10, wx1, wy1 + 10)
    m.add('<path d="%s" fill="%s"/>' % (S.pts_d(well), wl))
    # a band of bright-cut engraving round the well: short facets cut into
    # the silver, each one throwing the light back or not as it faces
    lit_cuts, dark_cuts = [], []
    for k in range(72):
        t = 2 * math.pi * (k + 0.5) / 72
        a0 = v.proj((0.66 * math.cos(t), 0, 0.66 * math.sin(t)))
        a1 = v.proj((0.715 * math.cos(t + 0.03), 0, 0.715 * math.sin(t + 0.03)))
        (lit_cuts if math.cos(t + 2.3) > 0 else dark_cuts).append((a0[0], a0[1], a1[0], a1[1]))
    m.add('<path d="%s" stroke="#e8f0f4" stroke-width=".32" stroke-opacity=".75"/>' % lines_path(lit_cuts))
    m.add('<path d="%s" stroke="#0a1620" stroke-width=".32" stroke-opacity=".6"/>' % lines_path(dark_cuts))
    ring = [v.proj((0.64 * math.cos(2 * math.pi * k / 72), 0, 0.64 * math.sin(2 * math.pi * k / 72)))[:2] for k in range(72)]
    m.add('<path d="%s" fill="none" stroke="#dfe8ec" stroke-width=".25" stroke-opacity=".55"/>' % S.pts_d(ring))
    # the day's cards, fanned on the well from one corner the way they are
    # dealt, the top one with its corner turned up: left by hand
    W, Hc, T = 0.47, 0.29, 0.014

    def card(k, ang_deg, px, pz, lift_y, fold, faces):
        ang = math.radians(ang_deg)

        def cp(x, z, y=0.0):
            # pivot at the card's lower left corner
            x, z = x + W, z - Hc
            return (px + x * math.cos(ang) - z * math.sin(ang), T + lift_y + y, pz + x * math.sin(ang) + z * math.cos(ang))
        if fold:
            corners = [(-W, -Hc), (W, -Hc), (W, Hc - fold), (W - fold, Hc), (-W, Hc)]
        else:
            corners = [(-W, -Hc), (W, -Hc), (W, Hc), (-W, Hc)]
        c2 = [v.proj(cp(x, z))[:2] for x, z in corners]
        m.add(shadow(S.pts_d(c2), 0.7, 1.0, 0.45))
        edge = [v.proj(cp(x, z, -T))[:2] for x, z in corners]
        m.add('<path d="%s" fill="%s"/>' % (S.pts_d(edge), GILT[1]))
        m.add('<path d="%s" fill="%s"/>' % (S.pts_d(c2), m.lin('card%d' % k, faces, c2[0][0], c2[0][1], c2[2][0], c2[2][1])))
        m.add('<path d="%s" fill="none" stroke="%s" stroke-width=".55"/>' % (S.pts_d(c2), GILT[4]))
        ins = 0.04
        if fold:
            rim_ = [(-W + ins, -Hc + ins), (W - ins, -Hc + ins), (W - ins, Hc - fold - ins * 0.6),
                    (W - fold - ins * 0.6, Hc - ins), (-W + ins, Hc - ins)]
        else:
            rim_ = [(-W + ins, -Hc + ins), (W - ins, -Hc + ins), (W - ins, Hc - ins), (-W + ins, Hc - ins)]
        m.add('<path d="%s" fill="none" stroke="%s" stroke-width=".22" stroke-opacity=".7"/>'
              % (S.pts_d([v.proj(cp(x, z))[:2] for x, z in rim_]), GILT[2]))
        return cp
    px, pz = -0.24, 0.46
    card(0, -46, px, pz, 0.0, 0, [(0, '#efe6d0'), (1, '#b8ac92')])
    card(1, -28, px, pz, 0.014, 0, [(0, '#f6efdc'), (1, '#c6bba2')])
    fold = 0.15
    cp = card(2, -10, px, pz, 0.028, fold, [(0, '#fffdf6'), (0.5, '#f4efe2'), (1, '#d6ccb4')])
    # the turned corner: the flap stands up off its fold
    a0, b0 = cp(W, Hc - fold), cp(W - fold, Hc)
    corner = cp(W, Hc)
    mid = ((a0[0] + b0[0]) / 2, a0[1], (a0[2] + b0[2]) / 2)
    out_ = S.sub(corner, mid)
    lift = math.radians(115)
    tip = S.add(mid, S.add(S.mul(out_, math.cos(lift)), (0, S.dot(out_, out_) ** 0.5 * math.sin(lift), 0)))
    flap = [v.proj(p)[:2] for p in (a0, b0, tip)]
    fn = S.norm(S.cross(S.sub(b0, a0), S.sub(tip, a0)))
    fv = v.nrm(fn)
    if fv[2] < 0:
        fv = S.mul(fv, -1)
    m.add('<path d="%s" fill="#000" fill-opacity=".3" transform="translate(.6 .5)"/>' % S.pts_d(flap))
    m.add('<path d="%s" fill="%s"/>' % (S.pts_d(flap), S.ramp(['#7e725a', '#c8bca2', '#ece4d0', '#fffcf2'], S.lambert(fv, 0.3))))
    m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".5"/>'
          % (f(flap[0][0]), f(flap[0][1]), f(flap[1][0]), f(flap[1][1]), GILT[2]))


# --------------------------------------------------------------------------
# The Press Room: the world, half in night and half in morning
# --------------------------------------------------------------------------
# Coastlines, coarse, in (longitude, latitude): the hemisphere the globe
# turns toward the reader, Europe to the Pacific.
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
GLOBE = {'lon0': 88.0, 'lat0': 22.0, 'tilt': 23.4, 'cx': 48.0, 'cy': 41.5, 'r': 24.0,
         'sun': S.norm((-0.8, 0.58, 0.12))}


def globe_xyz(lon, lat):
    g = GLOBE
    lo, la = math.radians(lon - g['lon0']), math.radians(lat)
    x, y, z = math.cos(la) * math.sin(lo), math.sin(la), math.cos(la) * math.cos(lo)
    c, s = math.cos(math.radians(g['lat0'])), math.sin(math.radians(g['lat0']))
    y, z = y * c - z * s, y * s + z * c
    t = math.radians(-g['tilt'])                  # the axis leans, north to the right
    x, y = x * math.cos(t) - y * math.sin(t), x * math.sin(t) + y * math.cos(t)
    return (x, y, z)


def globe_pt(p, clamp=True):
    g = GLOBE
    x, y, z = p
    if z < 0 and clamp:
        ln = math.hypot(x, y) or 1
        x, y = x / ln, y / ln
    return (g['cx'] + g['r'] * x, g['cy'] - g['r'] * y)


def ground_halftone(m, h):
    """Green enamel over a halftone screen, the way a paper prints its
    pictures: the dots swell toward the light."""
    grad = m.rad('enamel', [(0, h['lit']), (0.55, h['field']), (1, h['deep'])], 40, 34, 50, 36, 28)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), grad))
    fine = m.pattern('dots', 2.7, 2.7, '<circle cx="1.35" cy="1.35" r=".3" fill="%s" fill-opacity=".38"/>' % h['lit'],
                     'rotate(45 48 48)')
    bold = m.pattern('dots2', 2.7, 2.7, '<circle cx="1.35" cy="1.35" r=".62" fill="%s" fill-opacity=".38"/>' % h['lit'],
                     'rotate(45 48 48)')
    fade = m.lin('dotfade', [(0, '#fff'), (0.55, '#fff', 0.35), (1, '#fff', 0)], 20, 20, 70, 70)
    m.defs.append('<mask id="%s" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">'
                  '<rect width="96" height="96" fill="%s"/></mask>' % (m.id('dotmask'), fade))
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), fine))
    m.add('<circle cx="48" cy="48" r="%s" fill="%s" mask="%s"/>' % (f(R_FIELD), bold, m.url('dotmask')))


def subject_pressroom(m, h):
    """The world as a cast desk globe, turned to the hemisphere the paper
    reads, lit from one side so half of it lies in night and half in the
    morning: 'the world overnight, set in type by morning'. Its coasts are
    projected from real longitudes and latitudes; a gilt meridian ring goes
    round it and it stands on a turned foot."""
    g = GLOBE
    cx, cy, R = g['cx'], g['cy'], g['r']
    sun = g['sun']
    # the light's direction across the disc, for the shading gradients
    dx, dy = sun[0], -sun[1]
    ln = math.hypot(dx, dy)
    dx, dy = dx / ln, dy / ln
    x1, y1, x2, y2 = cx + R * dx, cy + R * dy, cx - R * dx, cy - R * dy
    term = 0.5 + 0.5 * sun[2] / math.hypot(sun[0], sun[1]) * 0.9     # where night falls, along the gradient
    sea = m.lin('sea', [(0, '#b6e2b4'), (0.18, '#6cb884'), (term - 0.16, '#2c7a4e'), (term - 0.03, '#17482c'),
                        (term + 0.03, '#0c2a1a'), (1, '#04110a')], x1, y1, x2, y2)
    land = m.lin('land', [(0, '#fff6d6'), (0.2, '#eadcaa'), (term - 0.16, '#b6a46a'), (term - 0.03, '#6a6238'),
                          (term + 0.03, '#26361e'), (1, '#0e1c10')], x1, y1, x2, y2)
    # the meridian ring: a gilt band round the globe through its poles,
    # turned so that it cuts across the disc
    turn = math.radians(58)

    def ring_pt(a, rr):
        # in the globe's own frame: a circle through the poles, turned about the axis
        x, y, z = rr * math.cos(a) * math.sin(turn), rr * math.sin(a), rr * math.cos(a) * math.cos(turn)
        t = math.radians(-g['tilt'])
        x, y = x * math.cos(t) - y * math.sin(t), x * math.sin(t) + y * math.cos(t)
        return (x, y, z)
    ring_o = [ring_pt(2 * math.pi * k / 120, 1.16) for k in range(121)]
    ring_i = [ring_pt(2 * math.pi * k / 120, 1.09) for k in range(121)]

    def ring_half(front):
        segs, cur = [], []
        for po, pi in zip(ring_o, ring_i):
            if (po[2] > 0) == front:
                cur.append((po, pi))
            elif cur:
                segs.append(cur)
                cur = []
        if cur:
            segs.append(cur)
        out = []
        for seg in segs:
            outer = [(cx + R * p[0], cy - R * p[1]) for p, _ in seg]
            inner = [(cx + R * q[0], cy - R * q[1]) for _, q in seg]
            out.append(poly_d(outer + inner[::-1]))
        return ' '.join(out)
    # the stand: a stem from the ring's foot to a stepped, turned foot
    low = max(ring_o, key=lambda p: -p[1])
    sx, sy = cx + R * low[0], cy - R * low[1]
    fc = S.Faces()
    v = S.View(sx, 0, 1.0, yaw=0, pitch=18)
    foot = [GILT[0], GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
    fy = -84.0
    solid_cylinder(fc, v, (0, fy, 0), (0, fy + 1.6, 0), 11.5, 11.0, 48, foot)
    solid_cylinder(fc, v, (0, fy + 1.6, 0), (0, fy + 3.0, 0), 8.2, 7.6, 40, foot)
    solid_cylinder(fc, v, (0, fy + 3.0, 0), (0, fy + 4.2, 0), 4.2, 3.4, 32, foot)
    m.add(shadow(S.pts_d([v.proj((11.5 * math.cos(t), fy, 11.5 * math.sin(t)))[:2]
                          for t in [2 * math.pi * k / 48 for k in range(48)]]), 1.2, 1.2, 0.5))
    m.add(fc.svg())
    top_y = v.proj((0, fy + 4.2, 0))[1]
    m.add(relief('M%s %s L%s %s L%s %s L%s %s Z' % (f(sx - 1.3), f(top_y + 0.4), f(sx - 0.8), f(sy - 0.5),
                                                     f(sx + 0.8), f(sy - 0.5), f(sx + 1.3), f(top_y + 0.4)),
                 cyl_grad(m, 'stem', sx - 1.3, 0, sx + 1.3, 0, foot)))
    # the ring's far half, behind the globe
    m.add('<path d="%s" fill="%s"/>' % (ring_half(False), GILT[1]))
    # the globe's shadow on the enamel, then the globe
    m.add(shadow(circle_d(cx, cy, R), 1.6, 2.2, 0.5))
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(cx), f(cy), f(R), sea))
    clipg = m.clip('globe', '<circle cx="%s" cy="%s" r="%s"/>' % (f(cx), f(cy), f(R)))
    m.add('<g clip-path="%s">' % clipg)
    shapes = []
    for name, pts in LAND.items():
        if not pts:
            continue
        xyz = [globe_xyz(lo, la) for lo, la in pts]
        if max(p[2] for p in xyz) <= 0:
            continue
        shapes.append(poly_d([globe_pt(p) for p in xyz]))
    m.add('<path d="%s" fill="%s"/>' % (' '.join(shapes), land))
    lakes = [poly_d([globe_pt(globe_xyz(lo, la)) for lo, la in pts]) for pts in LAKES.values()]
    m.add('<path d="%s" fill="%s"/>' % (' '.join(lakes), sea))
    # the graticule, engraved: meridians every thirty degrees, the tropics,
    # the equator and the polar circles
    lines = []
    for lon in range(0, 360, 30):
        cur = []
        for k in range(0, 181, 4):
            p = globe_xyz(lon, -90 + k)
            if p[2] > 0:
                cur.append(globe_pt(p))
            elif cur:
                lines.append(cur)
                cur = []
        if cur:
            lines.append(cur)
    for lat in (-66.5, -23.4, 0, 23.4, 66.5):
        cur = []
        for k in range(0, 361, 4):
            p = globe_xyz(k, lat)
            if p[2] > 0:
                cur.append(globe_pt(p))
            elif cur:
                lines.append(cur)
                cur = []
        if cur:
            lines.append(cur)
    gd = ' '.join('M' + ' L'.join('%s %s' % (f(x), f(y)) for x, y in ln_) for ln_ in lines if len(ln_) > 1)
    m.add('<path d="%s" stroke="%s" stroke-width=".32" stroke-opacity=".55" fill="none"/>' % (gd, GILT[5]))
    # the limb: the sphere turning away at its edge
    limb = m.rad('limb', [(0.7, '#000', 0), (0.93, '#000', 0.18), (1, '#000', 0.42)], cx, cy, R)
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(cx), f(cy), f(R), limb))
    m.add('</g>')
    # the lit rim where the key light rakes the edge of the day side
    m.add('<path d="%s" stroke="#fff8dc" stroke-width=".5" stroke-opacity=".7" fill="none"/>'
          % ('M%s %s A%s %s 0 0 1 %s %s' % (f(cx - R * 0.94), f(cy + R * 0.34), f(R), f(R), f(cx + R * 0.34), f(cy - R * 0.94))))
    # the ring's near half, over the globe
    near = ring_half(True)
    m.add('<path d="%s" fill="#000" fill-opacity=".45" transform="translate(.5 .7)"/>' % near)
    m.add('<path d="%s" fill="%s"/>' % (near, m.lin('ring', [(0, GILT[3]), (0.3, GILT[5]), (0.65, GILT[4]), (1, GILT[1])],
                                                    cx - R, cy - R, cx + R, cy + R)))
    # the knop where the stem takes the ring
    m.add(relief('M%s %s C%s %s %s %s %s %s C%s %s %s %s %s %s Z'
                 % (f(sx - 2.2), f(sy + 2.4), f(sx - 2.4), f(sy + 0.4), f(sx - 1.2), f(sy - 1.0), f(sx), f(sy - 1.0),
                    f(sx + 1.2), f(sy - 1.0), f(sx + 2.4), f(sy + 0.4), f(sx + 2.2), f(sy + 2.4)),
                 cyl_grad(m, 'knop', sx - 2.4, 0, sx + 2.4, 0, [GILT[0], GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]])))
    # the pivots at the poles
    for lat in (90, -90):
        p = globe_xyz(0, lat)
        px, py = globe_pt(p, clamp=False)
        if p[2] > -0.3:
            m.add(relief(circle_d(px, py, 1.3), GILT[4], dx=0.4, dy=0.55))


# --------------------------------------------------------------------------
# Arsenal: the armourer's trophy, a spanner and a rammer lashed crosswise
# --------------------------------------------------------------------------
POLISH = ['#10161b', '#2a343c', '#52616c', '#8a9ba6', '#c6d3da', '#eef4f6']
ASH = ['#24160a', '#50331a', '#8a6034', '#bb8e56', '#e2bc84']
CORD = ['#2a0806', '#5e1610', '#9a2c20', '#c8483a', '#ee8a70']


def ground_perlage(m, h):
    """Gunmetal enamel over perlage, the overlapping circles a machinist
    spots on a plate."""
    grad = m.rad('enamel', [(0, h['lit']), (0.55, h['field']), (1, h['deep'])], 40, 36, 50, 38, 30)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), grad))
    d, p, rh = [], 4.2, 4.2 * 0.86
    for j in range(-1, 4):
        for i in range(-1, 3):
            x = i * p + (p / 2 if j % 2 else 0)
            y = j * rh
            if -3 < x < p + 3 and -3 < y < 2 * rh + 3:
                d.append(circle_d(x, y, 2.9))
    tile = '<path d="%s" stroke="#b8c6d0" stroke-width=".32" stroke-opacity=".22" fill="none"/>' % ' '.join(d)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), m.pattern('turn', p, 2 * rh, tile, 'translate(48 48)')))


def rot2(x, y, deg):
    a = math.radians(deg)
    return (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a))


def forged(m, name, sdf, box, pal, bevel=0.9):
    """A flat forged part in relief: its outline traced from a distance
    field, the chamfer round its edge lit on the lamp side and shaded on the
    far side, the flat face inside it."""
    outer = S.contours(sdf, *box, 0.16)
    inner = S.contours(sdf, *box, 0.16, level=-bevel)
    od = ' '.join(S.pts_d(lp) for lp in outer)
    idd = ' '.join(S.pts_d(lp) for lp in inner)
    x0, y0, x1, y1 = box
    out = [shadow(od, 0.9, 1.3, 0.6, ' fill-rule="evenodd"'),
           '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (od, pal[1]),
           '<path d="%s" fill="%s" fill-rule="evenodd" transform="translate(-.55 -.55)"/>' % (od, pal[4]),
           '<path d="%s" fill="%s" fill-rule="evenodd" transform="translate(-.2 -.2)"/>' % (od, pal[3]),
           '<path d="%s" fill="%s" fill-rule="evenodd"/>' % (idd, m.lin(name, [(0, pal[4]), (0.3, pal[3]), (0.7, pal[2]), (1, pal[1])],
                                                                         x0, y0, x1, y1))]
    return ''.join(out), outer


def subject_arsenal(m, h):
    """The armourer's trophy of Arsenal's own masthead, drawn as the tools
    are: a drop-forged double-ended spanner, its larger jaw closed on a hex
    nut, crossed over a gun rammer of turned ash with a brass-bound head,
    the two lashed at the cross with red cord."""
    ang = -45.0                                   # the spanner runs up to the right
    ux, uy = rot2(1, 0, ang)
    cx, cy = 48.0, 49.0
    A = (cx - 21.5 * ux, cy - 21.5 * uy)          # big head, lower left
    B = (cx + 22.0 * ux, cy + 22.0 * uy)          # small head, upper right
    ra, rb, sa, sb = 7.6, 6.2, 3.3, 2.6
    da = rot2(-ux, -uy, 15)                       # each jaw opens 15 degrees off the shank
    db = rot2(ux, uy, 15)
    ta = (A[0] - da[0] * 1.0, A[1] - da[1] * 1.0)
    tb = (B[0] - db[0] * 0.8, B[1] - db[1] * 0.8)

    def spanner(x, y):
        d = S.smin(S.sd_circle(x, y, A[0], A[1], ra), S.sd_circle(x, y, B[0], B[1], rb), 0.1)
        shank = S.sd_capsule(x, y, A[0] + ux * 5, A[1] + uy * 5, B[0] - ux * 4, B[1] - uy * 4, 2.35, 1.85)
        d = S.smin(d, shank, 3.2)
        slot_a = S.sd_capsule(x, y, ta[0], ta[1], ta[0] + da[0] * 30, ta[1] + da[1] * 30, sa)
        slot_b = S.sd_capsule(x, y, tb[0], tb[1], tb[0] + db[0] * 30, tb[1] + db[1] * 30, sb)
        return max(d, -slot_a, -slot_b)
    # the plate behind the trophy: a bolt head of blued steel, bevelled on
    # its six flats, screwed down at each corner, its slots turned every way
    oh = ngon(48, 48, 33.5, 6, 0)
    ih = ngon(48, 48, 29.6, 6, 0)
    m.add(shadow(poly_d(oh), 0.9, 1.3, 0.6))
    m.add(facet_poly(oh, ih, BLUED, shade_all=0.2))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(ih), m.lin('plate', [(0, '#56636e'), (0.5, '#333d46'), (1, '#171d22')], 26, 22, 70, 76)))
    for k, a in enumerate(range(0, 360, 60)):
        x, y = pt(48, 48, 26.2, math.radians(a))
        m.add('<circle cx="%s" cy="%s" r="1.75" fill="#000" fill-opacity=".6"/>' % (f(x + .35), f(y + .5)))
        m.add('<circle cx="%s" cy="%s" r="1.6" fill="%s"/>'
              % (f(x), f(y), m.rad('scr%d' % k, [(0, BLUED[3]), (0.6, BLUED[4]), (1, BLUED[1])], x - .6, y - .6, 2.2)))
        sa = math.radians(17 + k * 53)
        ddx, ddy = 1.25 * math.cos(sa), 1.25 * math.sin(sa)
        m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".5"/>' % (f(x - ddx), f(y - ddy), f(x + ddx), f(y + ddy), BLUED[0]))
    # the rammer: an ash staff, a turned head bound in brass at the lower right
    ra_ang = 42.0
    vx, vy = rot2(1, 0, ra_ang)
    P0 = (cx - 30 * vx, cy - 30 * vy - 1.0)
    P1 = (cx + 27 * vx, cy + 27 * vy - 1.0)
    nx_, ny_ = -vy, vx

    def bar(t0, t1, r, pal, name, cap=False):
        a = (P0[0] + vx * t0, P0[1] + vy * t0)
        b = (P0[0] + vx * t1, P0[1] + vy * t1)
        pts = [(a[0] + nx_ * r, a[1] + ny_ * r), (b[0] + nx_ * r, b[1] + ny_ * r),
               (b[0] - nx_ * r, b[1] - ny_ * r), (a[0] - nx_ * r, a[1] - ny_ * r)]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        g = cyl_grad(m, name, mx + nx_ * r, my + ny_ * r, mx - nx_ * r, my - ny_ * r, pal, n=9, amb=0.22, shine=0.3)
        return '<path d="%s" fill="%s"/>' % (poly_d(pts), g), pts
    L = math.hypot(P1[0] - P0[0], P1[1] - P0[1])
    staff, sp = bar(1.4, L - 11.5, 2.3, ASH, 'staff')
    head, hp = bar(L - 10.6, L - 1.0, 4.7, ASH, 'rhead')
    fer, fp_ = bar(L - 12.3, L - 10.4, 5.0, GILT, 'ferrule')
    cap_, cp_ = bar(L - 1.3, L, 4.2, GILT, 'rcap')
    butt, bp = bar(0, 1.8, 2.65, GILT, 'butt')
    for pts in (sp, hp, fp_, cp_, bp):
        m.add(shadow(poly_d(pts), 0.9, 1.3, 0.55))
    m.add(staff + butt + head + fer + cap_)
    # the grain of the ash, running the length of the staff and the head
    grain = []
    for off, t0, t1 in ((0.9, 3, L - 13), (-0.5, 6, L - 16), (-1.3, 2.5, L - 20), (2.2, L - 10, L - 2),
                        (0.6, L - 9.6, L - 1.6), (-1.6, L - 10, L - 3), (-3.1, L - 9, L - 2.4)):
        a = (P0[0] + vx * t0 + nx_ * off, P0[1] + vy * t0 + ny_ * off)
        b = (P0[0] + vx * t1 + nx_ * off, P0[1] + vy * t1 + ny_ * off)
        grain.append((a[0], a[1], b[0], b[1]))
    m.add('<path d="%s" stroke="%s" stroke-width=".22" stroke-opacity=".55"/>' % (lines_path(grain), ASH[1]))
    # the spanner over it
    box = (min(A[0], B[0]) - 10, min(A[1], B[1]) - 10, max(A[0], B[0]) + 10, max(A[1], B[1]) + 10)
    body, _ = forged(m, 'spanner', spanner, box, POLISH, bevel=0.85)
    m.add(body)
    # the raised web down the shank, catching the light along its crest
    wa = (A[0] + ux * 9.5, A[1] + uy * 9.5)
    wb = (B[0] - ux * 8.5, B[1] - uy * 8.5)
    m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width="1.5" stroke-linecap="round"/>'
          % (f(wa[0]), f(wa[1]), f(wb[0]), f(wb[1]), POLISH[2]))
    m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".55" stroke-linecap="round" transform="translate(-.35 -.35)"/>'
          % (f(wa[0]), f(wa[1]), f(wb[0]), f(wb[1]), POLISH[5]))
    # the nut in the big jaw, seen from above: a hexagon chamfered to a
    # circle at its corners, the bolt's end standing in its bore
    af = sa
    N = (ta[0] + da[0] * (af * 1.1547 - 0.25), ta[1] + da[1] * (af * 1.1547 - 0.25))
    base_ang = math.degrees(math.atan2(da[1], da[0]))
    hexo = [(N[0] + af * 1.1547 * math.cos(math.radians(base_ang + 60 * k)),
             N[1] + af * 1.1547 * math.sin(math.radians(base_ang + 60 * k))) for k in range(6)]
    m.add(shadow(poly_d(hexo), 0.7, 1.0, 0.6))
    for k in range(6):
        a0, a1 = hexo[k], hexo[(k + 1) % 6]
        mx, my = (a0[0] + a1[0]) / 2 - N[0], (a0[1] + a1[1]) / 2 - N[1]
        ln = math.hypot(mx, my) or 1
        lit = (mx / ln) * LX + (my / ln) * LY
        m.add('<path d="%s" fill="%s"/>' % (poly_d([N, a0, a1]), tone(lit, POLISH)))
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>'
          % (f(N[0]), f(N[1]), f(af * 0.98), m.lin('nutface', [(0, POLISH[4]), (0.5, POLISH[3]), (1, POLISH[2])],
                                                   N[0] - af, N[1] - af, N[0] + af, N[1] + af)))
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(N[0]), f(N[1]), f(af * 0.56), POLISH[0]))
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>'
          % (f(N[0] - 0.12), f(N[1] - 0.12), f(af * 0.46), m.lin('bolt', [(0, POLISH[3]), (1, POLISH[1])],
                                                              N[0] - af * .5, N[1] - af * .5, N[0] + af * .5, N[1] + af * .5)))
    m.add('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width=".3"/>'
          % (f(N[0] - 0.12), f(N[1] - 0.12), f(af * 0.3), POLISH[1]))
    # the lashing at the cross: three turns of red cord laid over the
    # spanner's shank along the rammer, and three over the rammer along the
    # spanner, each a twisted strand bellied round what it binds
    X = (cx + 0.2, cy - 0.6)

    def turns(dirx, diry, across, span, name):
        px_, py_ = -diry, dirx
        for k in (-1, 0, 1):
            c0 = (X[0] + dirx * k * 1.9, X[1] + diry * k * 1.9)
            a = (c0[0] - px_ * span, c0[1] - py_ * span)
            b = (c0[0] + px_ * span, c0[1] + py_ * span)
            r = 0.8
            bel = 0.55                                 # the belly of the turn
            d = ('M%s %s Q%s %s %s %s L%s %s Q%s %s %s %s Z'
                 % (f(a[0] + dirx * r), f(a[1] + diry * r), f(c0[0] + dirx * (r + bel)), f(c0[1] + diry * (r + bel)),
                    f(b[0] + dirx * r), f(b[1] + diry * r), f(b[0] - dirx * r), f(b[1] - diry * r),
                    f(c0[0] - dirx * (r - bel)), f(c0[1] - diry * (r - bel)), f(a[0] - dirx * r), f(a[1] - diry * r)))
            g = cyl_grad(m, '%s%d' % (name, k + 1), c0[0] + dirx * r, c0[1] + diry * r, c0[0] - dirx * r,
                         c0[1] - diry * r, CORD, n=7, amb=0.25, shine=0.2)
            m.add(shadow(d, 0.35, 0.5, 0.55))
            m.add('<path d="%s" fill="%s"/>' % (d, g))
            tw = []
            steps = int(span * 2 / 0.9)
            for t in range(steps + 1):
                tt = -span + 2 * span * t / steps
                q = (c0[0] + px_ * tt, c0[1] + py_ * tt)
                tw.append((q[0] + dirx * r * 0.85 - px_ * 0.3, q[1] + diry * r * 0.85 - py_ * 0.3,
                           q[0] - dirx * r * 0.85 + px_ * 0.3, q[1] - diry * r * 0.85 + py_ * 0.3))
            m.add('<path d="%s" stroke="%s" stroke-width=".2" stroke-opacity=".75"/>' % (lines_path(tw), CORD[0]))
    turns(vx, vy, 1, 3.4, 'cordA')          # over the spanner
    turns(ux, uy, 1, 3.0, 'cordB')          # over the rammer


SUBJECTS = {
    'groundstation': (ground_dusk, subject_groundstation, 'round'),
    'bourse': (ground_lattice, subject_bourse, 'round'),
    'autopilot': (ground_lamp, subject_autopilot, 'round'),
    'outreach': (ground_basket, subject_outreach, 'round'),
    'pressroom': (ground_halftone, subject_pressroom, 'kite'),
    'arsenal': (ground_perlage, subject_arsenal, 'round'),
}


def emblem(app):
    """The full mark, as SVG body markup on a 0 0 96 96 viewBox."""
    if app == 'atrium':
        return atrium_emblem()
    h = dict(HUE[app])
    m = Mark(app)
    paint, subject, stone = SUBJECTS[app]
    die_back(m, h)
    enamel_open(m, h, paint)
    subject(m, h)
    enamel_close(m)
    crown(m, h['pop'], stone)
    return m.markup()


def emblem_small(app):
    """The small cut: the Ledger's sigil (20 to 35 px) and the 16/32/48
    favicon. The same die and enamel, the subject cut to its biggest masses
    and set a little larger in the field."""
    h = HUE[app]
    m = Mark(app, '-s')
    lip = m.lin('lip', [(0, GILT[3]), (0.35, GILT[5]), (0.7, GILT[2]), (1, GILT[1])], 14, 12, 84, 86)
    m.add('<circle cx="48.9" cy="49.3" r="47.4" fill="#000" fill-opacity=".55"/>')
    m.add('<circle cx="48" cy="48" r="47.4" fill="%s"/>' % lip)
    m.add('<circle cx="48" cy="48" r="41.8" fill="%s"/>' % GILT[0])
    clip = m.clip('field', '<circle cx="48" cy="48" r="40"/>')
    m.add('<g clip-path="%s">' % clip)
    SMALL[app](m, h)
    m.add('<circle cx="48" cy="48" r="40" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2.4"/>')
    m.add('</g>')
    m.add('<circle cx="48.5" cy="7.4" r="6.2" fill="#000" fill-opacity=".55"/><circle cx="48" cy="6.8" r="6" fill="%s"/>'
          '<circle cx="48" cy="6.8" r="4" fill="%s"/>' % (GILT[4], h['pop']))
    return m.markup()


def small_enamel(m, h, cy=40):
    g = m.rad('enamel', [(0, h['lit']), (0.6, h['field']), (1, h['deep'])], 44, cy, 46)
    m.add('<rect width="96" height="96" fill="%s"/>' % g)


def small_groundstation(m, h):
    """The same dish and sky, the bowl filled in one sweep of its lit
    colour, the struts and the tower as single masses."""
    sky = m.lin('sky', [(0, '#141820'), (0.4, '#6a3812'), (0.72, '#e08c34'), (0.86, '#f8cc84')], 0, 8, 0, 72)
    m.add('<rect width="96" height="96" fill="%s"/>' % sky)
    m.add('<path d="M0 71 C20 68 70 68.5 96 71 V96 H0 Z" fill="#170b04"/>')
    v = S.View(0, 0, 25.0, yaw=0, pitch=-5)
    a = GS_AXIS
    u, w, _ = S.basis(a)
    F = 0.62
    rc = v.proj(S.mul(a, 1.0 / (4 * F)))
    v.cx, v.cy = 44 - rc[0], 40 - rc[1]
    base = v.proj((0.1, -1.72, -0.5))
    top = v.proj((0.1, -0.7, -0.5))
    m.add('<path d="M%s %s L%s %s H%s L%s %s Z" fill="#6e3a16"/>'
          % (f(base[0] - 7), f(base[1] + 4), f(top[0] - 3.2), f(top[1]), f(top[0] + 3.2), f(base[0] + 7), f(base[1] + 4)))
    m.add('<path d="M%s %s L%s %s H%s L%s %s Z" fill="#b06a2c"/>'
          % (f(base[0] - 7), f(base[1] + 4), f(top[0] - 3.2), f(top[1]), f(top[0] - 0.6), f(base[0] - 2), f(base[1] + 4)))
    rim = [v.proj(S.add(S.add(S.mul(u, math.cos(t)), S.mul(w, math.sin(t))), S.mul(a, 1.0 / (4 * F))))[:2]
           for t in [2 * math.pi * k / 48 for k in range(48)]]
    m.add(shadow(S.pts_d(rim), 1.6, 2.2, 0.5))
    bowl = m.lin('bowl', [(0, '#6a3410'), (0.45, '#e2994a'), (1, '#fff0d6')], rim[24][0], rim[24][1], rim[0][0], rim[0][1])
    m.add('<path d="%s" fill="%s" stroke="#fff4dc" stroke-width="2"/>' % (S.pts_d(rim), bowl))
    fp = v.proj(S.mul(a, 0.98))
    for d in (40, 130, 220, 310):
        t = math.radians(d)
        rp = v.proj(S.add(S.add(S.mul(u, math.cos(t)), S.mul(w, math.sin(t))), S.mul(a, 1.0 / (4 * F))))
        m.add('<path d="M%s %s L%s %s" stroke="#3a1c0a" stroke-width="2" stroke-linecap="round"/>'
              % (f(rp[0]), f(rp[1]), f(fp[0]), f(fp[1])))
    m.add('<path d="M74 10 L75.8 17.2 L83 19 L75.8 20.8 L74 28 L72.2 20.8 L65 19 L72.2 17.2 Z" fill="#fff4d8"/>')


def small_bourse(m, h):
    small_enamel(m, h)
    g = GILT[4]
    m.add('<path d="M24 76 H72 L69 83 H27 Z" fill="%s"/><rect x="27" y="69" width="42" height="7" fill="#6b692c"/>' % g)
    m.add('<path d="M29 70 V40 C29 22 67 22 67 40 V70" stroke="%s" stroke-width="3.2" fill="none"/>' % g)
    m.add('<path d="M48 18 V26 M38.5 26 C35 32 34 36 34 40 V70 M57.5 26 C61 32 62 36 62 40 V70" stroke="%s" '
          'stroke-width="2" fill="none"/>' % GILT[2])
    m.add('<circle cx="48" cy="14" r="3.4" fill="none" stroke="%s" stroke-width="2.4"/>' % g)
    m.add('<g transform="translate(49 66) scale(1.55)"><path d="%s" fill="#f2c936"/><path d="%s" fill="#b88614"/>'
          '<path d="%s" fill="#c99618"/><circle cx="%s" cy="%s" r=".9" fill="#1c1108"/></g>'
          % (smooth_d(CANARY['body']), smooth_d(CANARY['shade']), smooth_d(CANARY['primaries']),
             CANARY['eye'][0], CANARY['eye'][1]))


def small_autopilot(m, h):
    small_enamel(m, h, cy=30)
    m.add('<path d="M16 64 H80 V71 H16 Z" fill="#9c5429"/><path d="M16 64 H80 V66.5 H16 Z" fill="#d28a55"/>')
    m.add('<path d="M22 71 H30 Q24 73 24 82 H22 Z M74 71 H66 Q72 73 72 82 H74 Z" fill="%s"/>' % GILT[4])
    books = [(20, 10, 36, '#e9dec2', '#fdf6e2'), (30.5, 8.6, 30, '#28583a', '#468458'),
             (39.6, 13, 46, '#b64638', '#e07c64'), (53.1, 8, 28, '#1e4560', '#386a86')]
    for x, w, ht, c, lt in books:
        m.add('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/><rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>'
              % (f(x), f(64 - ht), f(w), f(ht), c, f(x), f(64 - ht), f(w * 0.35), f(ht), lt))
        m.add('<rect x="%s" y="%s" width="%s" height="3" fill="%s"/>' % (f(x), f(64 - ht + ht * 0.2), f(w), GILT[5]))
    m.add('<g transform="rotate(-13 67 64)"><rect x="67" y="29" width="11" height="35" fill="#95622c"/>'
          '<rect x="67" y="29" width="4" height="35" fill="#c49052"/><rect x="67" y="36" width="11" height="3" fill="%s"/></g>'
          % GILT[5])


def small_outreach(m, h):
    small_enamel(m, h)
    m.add('<ellipse cx="49.5" cy="55" rx="37" ry="23" fill="#000" fill-opacity=".5"/>')
    m.add('<ellipse cx="48" cy="52.5" rx="37" ry="23" fill="%s"/>'
          % m.lin('rim', [(0, '#f6fafb'), (0.5, '#94abb8'), (1, '#203645')], 20, 34, 76, 74))
    m.add('<ellipse cx="48" cy="52.5" rx="28" ry="16.5" fill="%s"/>'
          % m.lin('well', [(0, '#dfe8ec'), (0.6, '#4e6878'), (1, '#1a2e3a')], 26, 38, 70, 70))
    for k, (d, c0, c1) in enumerate((('M18 50 L50 30 L64 44 L32 64 Z', '#efe6d0', '#b8ac92'),
                                     ('M20 54 L56 38 L67 53 L32 68 Z', '#f6efdc', '#c6bba2'),
                                     ('M24 58 L63 48 L70 60 L67 65 L32 72 Z', '#fffdf6', '#d6ccb4'))):
        m.add('<path d="%s" fill="#000" fill-opacity=".35" transform="translate(1 1.4)"/>' % d)
        m.add('<path d="%s" fill="%s"/><path d="%s" fill="none" stroke="%s" stroke-width="1.5"/>'
              % (d, m.lin('card%d' % k, [(0, c0), (1, c1)], 22, 40, 70, 64), d, GILT[4]))


def small_pressroom(m, h):
    small_enamel(m, h)
    g = GLOBE
    cx, cy, R = 48, 44, 27
    m.add('<ellipse cx="48" cy="85" rx="13" ry="4.4" fill="%s"/><path d="M46 85 L47 68 H49 L50 85 Z" fill="%s"/>'
          % (GILT[4], GILT[4]))
    sea = m.lin('sea', [(0, '#b6e2b4'), (0.3, '#4c9a68'), (0.52, '#1a4e30'), (0.6, '#0a2416'), (1, '#04110a')], 28, 30, 68, 60)
    land = m.lin('land', [(0, '#fff6d6'), (0.3, '#d6c690'), (0.52, '#6a6238'), (0.6, '#1e3018'), (1, '#0e1c10')], 28, 30, 68, 60)
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (cx, cy, R, sea))
    k = R / g['r']
    shapes = []
    for name in ('eurasia', 'africa', 'australia'):
        pts = [globe_pt(globe_xyz(lo, la)) for lo, la in LAND[name]]
        pts = [(cx + (x - g['cx']) * k, cy + (y - g['cy']) * k) for x, y in pts]
        shapes.append(poly_d(S.rdp(pts, 0.8)))
    clipg = m.clip('globe', '<circle cx="%s" cy="%s" r="%s"/>' % (cx, cy, R))
    m.add('<path d="%s" fill="%s" clip-path="%s"/>' % (' '.join(shapes), land, clipg))
    m.add('<path d="M%s %s A%s %s 0 0 1 %s %s" stroke="%s" stroke-width="3" fill="none"/>'
          % (cx + 6, cy - R - 1.5, R + 2, R + 2, cx + 3, cy + R + 1.5, GILT[4]))


def small_arsenal(m, h):
    small_enamel(m, h)
    ux, uy = rot2(1, 0, -45)
    cx, cy = 48, 49
    A = (cx - 21 * ux, cy - 21 * uy)
    B = (cx + 21 * ux, cy + 21 * uy)
    vx, vy = rot2(1, 0, 42)
    P0 = (cx - 29 * vx, cy - 29 * vy)
    P1 = (cx + 27 * vx, cy + 27 * vy)
    m.add('<path d="M%s %s L%s %s" stroke="#8a6034" stroke-width="5" stroke-linecap="round"/>'
          % (f(P0[0]), f(P0[1]), f(P1[0]), f(P1[1])))
    hx, hy = P1[0] - vx * 5, P1[1] - vy * 5
    m.add('<path d="M%s %s L%s %s" stroke="#bb8e56" stroke-width="10" stroke-linecap="round"/>'
          % (f(hx), f(hy), f(P1[0]), f(P1[1])))
    da = rot2(-ux, -uy, 15)
    db = rot2(ux, uy, 15)

    def sp(x, y):
        d = S.smin(S.sd_circle(x, y, A[0], A[1], 9), S.sd_circle(x, y, B[0], B[1], 7.5), 0.1)
        d = S.smin(d, S.sd_capsule(x, y, A[0], A[1], B[0], B[1], 3.4, 2.9), 3)
        ta = (A[0] - da[0], A[1] - da[1])
        tb = (B[0] - db[0], B[1] - db[1])
        d = max(d, -S.sd_capsule(x, y, ta[0], ta[1], ta[0] + da[0] * 30, ta[1] + da[1] * 30, 4))
        return max(d, -S.sd_capsule(x, y, tb[0], tb[1], tb[0] + db[0] * 30, tb[1] + db[1] * 30, 3.2))
    loops = S.contours(sp, 10, 10, 86, 86, 0.6)
    d = ' '.join(S.pts_d(lp) for lp in loops)
    m.add(shadow(d, 1.4, 2, 0.6, ' fill-rule="evenodd"'))
    m.add('<path d="%s" fill="%s" fill-rule="evenodd"/>'
          % (d, m.lin('sp', [(0, POLISH[5]), (0.5, POLISH[3]), (1, POLISH[1])], 26, 26, 70, 70)))
    m.add('<circle cx="%s" cy="%s" r="4.4" fill="#c8483a"/>' % (f(cx), f(cy - 0.6)))


SMALL = {'autopilot': small_autopilot, 'groundstation': small_groundstation, 'outreach': small_outreach,
         'pressroom': small_pressroom, 'arsenal': small_arsenal, 'bourse': small_bourse}


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
    rows = []
    for app in MARKS:
        rows.append('  <g id="mark-%s">%s</g>' % (app, emblem(app)))
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


def write_text(path, text):
    """Write in text mode so a CRLF checkout round-trips, and never outside
    this repository."""
    if not inside_repo(path):
        raise SystemExit('refusing to write outside %s: %s' % (ROOT, path))
    with io.open(path, 'w', encoding='utf-8') as fh:
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


def build(app, outdir):
    from PIL import Image
    os.makedirs(outdir, exist_ok=True)
    body = emblem_small(app) if app != 'atrium' else atrium_emblem()
    full = emblem(app) if app != 'atrium' else body
    deep = HUE[app]['deep'] if app in HUE else ATRIUM['deep']
    io.open(os.path.join(outdir, 'icon.svg'), 'w', encoding='utf-8').write(svg_doc(full))
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
    with io.open(os.path.join(outdir, 'manifest.webmanifest'), 'w', encoding='utf-8') as fh:
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


def write_app_symbol(app):
    """Rewrite the inline <symbol id="applogo"> in the app's own page."""
    path = SYMBOL_TARGETS.get(app)
    if not path:
        return
    block = '%s\n    <symbol id="applogo" viewBox="0 0 96 96">%s</symbol>\n%s' % (SYM_BEGIN, emblem(app), SYM_END)
    src = io.open(path, encoding='utf-8').read()
    src = replace_between(src, SYM_BEGIN, SYM_END, block, path)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(src)
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
            build(app, str(out))
            if args.allow_outside_repo and not args.out:
                write_app_symbol(app)
    write_atrium_defs()
    write_velvets()
    print('done')


if __name__ == '__main__':
    main(sys.argv[1:])
