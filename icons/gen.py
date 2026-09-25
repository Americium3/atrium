"""The six app marks and their house curtains, from one source.

Each mark is a 1930s enamelled badge cut from one die: a cast gilt lip, a
ring of beads sunk in a groove, and translucent enamel fired over an
engine-turned ground, with the app's own subject cast and chased in gilt and
champleve enamel standing proud of it, and a stone in a collet at the crown.
The die is shared; the enamel, the turning under it, the bead count, the
subject and the crown stone are each app's own. Every relief is drawn three
times along the hall's one key light (up and to the left): a shadow copy down
and right, the body, a lit edge up and left. Nothing on a mark glows and
nothing carries a gloss band: the domed crystal the gate's bezel holds over
it supplies the one reflection glass is allowed.

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
#   beads    the rim's bead count (a gadroon count for Outreach's salver)
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
    if h.get('gadroon'):
        # The salver's gadrooned rim: n convex lobes laid round the groove,
        # each a long bead lit on its lamp side.
        for k in range(n):
            a = -math.pi / 2 + 2 * math.pi * (k + 0.5) / n
            x, y = pt(C, C, r, a)
            deg = math.degrees(a) + 90
            lobe = lambda cx, cy, rx, ry: ('M%s %s a%s %s 0 1 0 %s 0 a%s %s 0 1 0 %s 0 Z'
                                           % (f(cx - rx), f(cy), f(rx), f(ry), f(2 * rx), f(rx), f(ry), f(-2 * rx)))
            rot_ = ' transform="rotate(%s %s %s)"' % (f(deg), f(x), f(y))
            sh.append((lobe(x + 0.3, y + 0.45, 5.0, 1.35), rot_))
            bd.append((lobe(x, y, 5.0, 1.3), rot_))
            lx, ly = x - 0.4, y - 0.45
            lt.append((lobe(lx, ly, 3.0, 0.5), ' transform="rotate(%s %s %s)"' % (f(deg), f(lx), f(ly))))
        m.add(''.join('<path d="%s" fill="#000" fill-opacity=".6"%s/>' % d for d in sh))
        m.add(''.join('<path d="%s" fill="%s"%s/>' % (d[0], GILT[4], d[1]) for d in bd))
        m.add(''.join('<path d="%s" fill="%s"%s/>' % (d[0], GILT[3], d[1]) for d in lt))
        return
    else:
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


def enamel_open(m, h, ground):
    """Open the enamel field: the fired colour over its engine turning.
    Returns the closing markup to append after the subject's sunk parts."""
    clip = m.clip('field', '<circle cx="48" cy="48" r="%s"/>' % f(R_FIELD))
    grad = m.rad('enamel', [(0, h['lit']), (0.55, h['field']), (1, h['deep'])], 40, 38, 48, 44, 40)
    m.add('<g clip-path="%s">' % clip)
    m.add('<circle cx="48" cy="48" r="%s" fill="%s"/>' % (f(R_FIELD), grad))
    m.add(ground)
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


def mix(a, b, k):
    return rgbhex([x + (y - x) * k for x, y in zip(hexrgb(a), hexrgb(b))])


def gilt_face(m, name='gilt', x1=24, y1=18, x2=74, y2=80):
    return m.lin(name, [(0, GILT[5]), (0.38, GILT[4]), (0.75, GILT[2]), (1, GILT[1])], x1, y1, x2, y2)


# --------------------------------------------------------------------------
# Engine turning under the enamel, each app its own
# --------------------------------------------------------------------------
def lines_path(segs):
    return ' '.join('M%s %sL%s %s' % (f(a), f(b), f(c), f(d)) for a, b, c, d in segs)


def turn_lamp_fan(h):
    """Autopilot: rays fanning down from the crown stone, the lamp's cone
    falling on the shelf, cut in pairs."""
    segs = []
    for k in range(46):
        a = math.radians(38 + 104 * k / 45)
        segs.append((48 + 6 * math.cos(a), 5 + 6 * math.sin(a), 48 + 95 * math.cos(a), 5 + 95 * math.sin(a)))
    return ('<path d="%s" stroke="%s" stroke-width=".55" stroke-opacity=".5" fill="none"/>'
            % (lines_path(segs), h['lit']) +
            ''.join('<circle cx="48" cy="5" r="%s" stroke="%s" stroke-width=".4" stroke-opacity=".3" fill="none"/>'
                    % (f(r), h['lit']) for r in range(20, 96, 7)))


def turn_rings(h):
    """Ground Station: concentric turning with a fine radial cross cut."""
    rings = ''.join('<circle cx="48" cy="48" r="%s" fill="none"/>' % f(r) for r in [x * 1.6 for x in range(15, 25)])
    segs = []
    for k in range(96):
        a = 2 * math.pi * k / 96
        segs.append((48 + 25 * math.cos(a), 48 + 25 * math.sin(a), 48 + 39 * math.cos(a), 48 + 39 * math.sin(a)))
    return ('<g stroke="%s" stroke-width=".45" stroke-opacity=".45">%s<path d="%s"/></g>'
            % (h['lit'], rings, lines_path(segs)))


def turn_basket(h):
    """Outreach: a basket-weave engine turning, the ground of a silver card
    case, under the salver's ink enamel."""
    segs, s = [], 5.0
    for i in range(-9, 10):
        for j in range(-9, 10):
            x0, y0 = 48 + i * s, 48 + j * s
            if math.hypot(x0 + s / 2 - 48, y0 + s / 2 - 48) > 42:
                continue
            for t in (1.0, 2.5, 4.0):
                if (i + j) % 2 == 0:
                    segs.append((x0 + 0.5, y0 + t, x0 + s - 0.5, y0 + t))
                else:
                    segs.append((x0 + t, y0 + 0.5, x0 + t, y0 + s - 0.5))
    return ('<path d="%s" stroke="%s" stroke-width=".55" stroke-opacity=".55" fill="none"/>'
            % (lines_path(segs), h['lit']))


def turn_halftone(h):
    """The Press Room: a halftone screen at 45 degrees, the way a paper
    prints its pictures, the dots swelling toward the dawn at the top."""
    d, pitch = [], 3.3
    for i in range(-20, 21):
        for j in range(-20, 21):
            u, v = i * pitch, j * pitch
            x = 48 + (u - v) * 0.7071
            y = 48 + (u + v) * 0.7071
            if math.hypot(x - 48, y - 48) > 39.5:
                continue
            r = 0.35 + 0.75 * max(0.0, min(1.0, (70 - y) / 60.0))
            d.append(circle_d(x, y, r))
    return '<path d="%s" fill="%s" fill-opacity=".45"/>' % (' '.join(d), h['lit'])


def turn_perlage(h):
    """Arsenal: perlage, the overlapping circles a machinist spots on a
    plate."""
    d, p = [], 4.6
    for j in range(-10, 11):
        for i in range(-10, 11):
            x = 48 + i * p + (p / 2 if j % 2 else 0)
            y = 48 + j * p * 0.86
            if math.hypot(x - 48, y - 48) > 40:
                continue
            d.append(circle_d(x, y, 3.1))
    return d


def turn_lattice(h):
    """Bourse: the lozenge lattice of its own page, a diamond in a diamond
    on a fine repeat, engraved under black enamel."""
    segs, s = [], 7.0
    for k in range(-16, 17):
        c = k * s
        segs.append((48 + c - 60, 48 - 60, 48 + c + 60, 48 + 60))
        segs.append((48 + c + 60, 48 - 60, 48 + c - 60, 48 + 60))
    inner = []
    for i in range(-8, 9):
        for j in range(-8, 9):
            cx, cy = 48 + (i + j) * s / 2, 48 + (j - i) * s / 2 + s / 2
            if math.hypot(cx - 48, cy - 48) > 40:
                continue
            q = s * 0.22
            inner.append(poly_d([(cx, cy - q), (cx + q, cy), (cx, cy + q), (cx - q, cy)]))
    return ('<path d="%s" stroke="#8a6c2a" stroke-width=".45" stroke-opacity=".55" fill="none"/>'
            '<path d="%s" stroke="#6b5222" stroke-width=".35" stroke-opacity=".7" fill="none"/>'
            % (lines_path(segs), ' '.join(inner)))


# --------------------------------------------------------------------------
# The subjects
# --------------------------------------------------------------------------
def spine(m, name, x0, x1, top, bottom, cloth, bands, label=None, medallion=None, headband=None, lean=0.0):
    """One bound volume standing edge-on: a rounded back (lit on the lamp
    side), raised cords, a label onlay, head and tail caps."""
    lit, body, shade = cloth
    g = m.lin(name, [(0, lit), (0.3, body), (0.72, body), (1, shade)], x0, 0, x1, 0)
    w = x1 - x0
    out = []
    body_d = ('M%s %s L%s %s Q%s %s %s %s L%s %s Z'
              % (f(x0), f(bottom), f(x0), f(top + 1.2), f(x0 + w / 2), f(top - 1.0), f(x1), f(top + 1.2),
                 f(x1), f(bottom)))
    out.append('<path d="%s" fill="#000" fill-opacity=".55" transform="translate(.6 .5)"/>' % body_d)
    out.append('<path d="%s" fill="%s"/>' % (body_d, g))
    if headband:
        out.append('<rect x="%s" y="%s" width="%s" height="1.1" fill="%s"/>' % (f(x0 + 0.4), f(top + 0.35), f(w - 0.8), headband))
        for k in range(int(w / 1.4)):
            out.append('<rect x="%s" y="%s" width=".6" height="1.1" fill="%s"/>'
                       % (f(x0 + 0.6 + k * 1.4), f(top + 0.35), GILT[5]))
    for y in bands:
        out.append('<rect x="%s" y="%s" width="%s" height="1.5" fill="%s"/>' % (f(x0), f(y - 0.1), f(w), GILT[1]))
        out.append('<rect x="%s" y="%s" width="%s" height=".75" fill="%s"/>' % (f(x0), f(y - 0.5), f(w), GILT[3]))
        out.append('<rect x="%s" y="%s" width="%s" height=".7" fill="%s"/>' % (f(x0), f(y + 0.2), f(w), GILT[4]))
    if label:
        ly0, ly1, lc = label
        out.append('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (f(x0 + 0.9), f(ly0), f(w - 1.8), f(ly1 - ly0), lc))
        out.append('<rect x="%s" y="%s" width="%s" height="%s" fill="none" stroke="%s" stroke-width=".4"/>'
                   % (f(x0 + 1.4), f(ly0 + 0.5), f(w - 2.8), f(ly1 - ly0 - 1.0), GILT[5]))
        for k in range(1, 3):
            yy = ly0 + (ly1 - ly0) * k / 3
            out.append('<rect x="%s" y="%s" width="%s" height=".45" fill="%s"/>' % (f(x0 + 2.2), f(yy - 0.2), f(w - 4.4), GILT[4]))
    if medallion:
        out.append('<circle cx="%s" cy="%s" r="1.45" fill="%s"/><circle cx="%s" cy="%s" r=".6" fill="%s"/>'
                   % (f(x0 + w / 2), f(medallion), GILT[2], f(x0 + w / 2 - 0.35), f(medallion - 0.35), GILT[3]))
    # the tail cap and a hairline of gilt tooling at the foot
    out.append('<rect x="%s" y="%s" width="%s" height=".6" fill="%s"/>' % (f(x0), f(bottom - 1.6), f(w), GILT[5]))
    if lean:
        return '<g transform="rotate(%s %s %s)">%s</g>' % (f(lean), f(x0), f(bottom), ''.join(out))
    return ''.join(out)


def subject_autopilot(m, h):
    """The season shelf (the app's 開架): a bracketed plank, a Deco bookend,
    five volumes of uneven height and cloth, the last one leaning on its
    neighbour, and the gap where tonight's volume will stand."""
    gf = gilt_face(m)
    # the lamp's pull: a short ball chain hanging from the crown's lamp
    chain = ''.join(circle_d(68.2, 14.6 + k * 1.7, 0.62) for k in range(5))
    m.add('<path d="%s" fill="%s"/>' % (chain, GILT[4]))
    m.add(relief('M67.1 23.4 L69.3 23.4 L68.8 26.4 L67.6 26.4 Z', GILT[4]))
    m.add('<g transform="translate(48 51) scale(1.1) translate(-48 -51)">')
    # brackets under the plank
    for d in ('M20.5 66.2 H28.4 V67.4 Q23 68.6 22.1 76.2 H20.5 Z',
              'M75.5 66.2 H67.6 V67.4 Q73 68.6 73.9 76.2 H75.5 Z'):
        m.add(relief(d, gf))
    # the bookend: cast brass, a fan-swept back and three engraved ribs
    be = 'M27.2 33.6 C21.6 37.4 18.6 47 18.4 62.6 H27.2 Z'
    m.add(relief(be, m.lin('bookend', [(0, GILT[5]), (0.5, GILT[4]), (1, GILT[1])], 18, 34, 28, 62)))
    m.add('<path d="M27 61.8 L20.4 50.6 M27 61.8 L22.8 43 M27 61.8 L25.3 37.4" stroke="%s" stroke-width=".55" fill="none"/>' % GILT[1])
    m.add('<path d="M27 61.8 L20.9 50.4 M27 61.8 L23.3 42.8" stroke="%s" stroke-width=".3" fill="none" transform="translate(-.35 -.2)"/>' % GILT[3])
    m.add('<rect x="26.6" y="33.6" width=".6" height="29" fill="%s"/>' % GILT[3])
    vellum = ('#fffaf0', '#ece0c2', '#a8966e')
    bottle = ('#5e8a64', '#2f5a3a', '#122a18')
    crimson = ('#ee7458', '#bf3a2c', '#5a120c')
    cream = ('#f4e6c2', '#d2bf92', '#8a7650')
    tan = ('#e8c48a', '#bf924f', '#6e4a1e')
    m.add(spine(m, 'v1', 27.6, 35.3, 29.4, 62.6, vellum, [33.2, 57.4], label=(37.2, 45.2, '#1d1510'), medallion=51.2))
    m.add(spine(m, 'v2', 35.5, 41.7, 35.8, 62.6, bottle, [39.4, 41.6, 58.4], label=(45.2, 51.4, '#5a1a16')))
    m.add(spine(m, 'v3', 41.9, 51.4, 25.2, 62.6, crimson, [31.2, 36.8, 52.6, 58.2], label=(40.4, 48.8, '#16100c'),
                medallion=55.4, headband='#b5362c'))
    m.add(spine(m, 'v4', 51.6, 56.8, 38.2, 62.6, cream, [41.6, 58.8], medallion=50))
    m.add(spine(m, 'v5', 62.0, 68.8, 32.6, 62.6, tan, [36.4, 56.2, 58.4], label=(40.6, 47.4, '#2c1a10'), lean=-11))
    # the plank: a bullnose on the front, lit along its crest
    m.add('<rect x="16.4" y="62.3" width="63.2" height="4.6" fill="#000" fill-opacity=".6" transform="translate(.5 .8)"/>')
    m.add('<rect x="16.4" y="62.3" width="63.2" height="4.4" fill="%s"/>' % GILT[2])
    m.add('<rect x="16.4" y="62.3" width="63.2" height="1.1" fill="%s"/>' % GILT[3])
    m.add('<rect x="16.4" y="63.4" width="63.2" height="1.3" fill="%s"/>' % GILT[5])
    m.add('<rect x="16.4" y="65.9" width="63.2" height=".8" fill="%s"/>' % GILT[1])
    m.add('<rect x="16.4" y="62.3" width="1" height="4.4" fill="%s"/>' % GILT[1])
    # the cour label in its brass holder, ears either side
    m.add('<rect x="42.2" y="63.1" width="11.6" height="3.3" fill="%s"/>' % GILT[1])
    m.add('<rect x="43" y="63.5" width="10" height="2.5" fill="#3a130e"/>')
    m.add('<rect x="44.2" y="64.5" width="7.6" height=".5" fill="%s"/>' % GILT[4])
    m.add('<rect x="41.2" y="63.6" width="1.4" height="2.3" fill="%s"/><rect x="53.4" y="63.6" width="1.4" height="2.3" fill="%s"/>'
          % (GILT[5], GILT[2]))
    m.add('</g>')


def subject_groundstation(m, h):
    """The tracking scope on its octagonal plate: dark night glass with
    range rings and an azimuth scale, the amber sweep that goes round once
    per poll, quiet cream contacts, and one amber contact locked in the
    acquisition brackets, waiting for Steam to bring it down."""
    oc = ngon(48, 48, 38.4, 8, math.radians(22.5))
    ic = ngon(48, 48, 35.2, 8, math.radians(22.5))
    m.add('<path d="%s" fill="#000" fill-opacity=".5" transform="translate(.6 .9)"/>' % poly_d(oc))
    m.add(facet_poly(oc, ic, BRONZE))
    g = m.rad('plate', [(0, h['lit']), (0.6, h['field']), (1, mix(h['field'], h['deep'], 0.5))], 40, 38, 40)
    m.add('<path d="%s" fill="%s"/>' % (poly_d(ic), g))
    # the plate's own engine turning, radial
    segs = []
    for k in range(80):
        a = 2 * math.pi * k / 80
        segs.append((48 + 27.5 * math.cos(a), 48 + 27.5 * math.sin(a), 48 + 34.5 * math.cos(a), 48 + 34.5 * math.sin(a)))
    m.add('<path d="%s" stroke="%s" stroke-width=".5" stroke-opacity=".5" fill="none"/>' % (lines_path(segs), h['lit']))
    # eight bolts at the corners
    bs, bb, bl = [], [], []
    for k in range(8):
        x, y = pt(48, 48, 31.6, math.radians(22.5 + 45 * k))
        bs.append(circle_d(x + 0.35, y + 0.5, 1.6))
        bb.append(circle_d(x, y, 1.5))
        bl.append(circle_d(x - 0.45, y - 0.5, 0.6))
    m.add('<path d="%s" fill="#000" fill-opacity=".6"/><path d="%s" fill="%s"/><path d="%s" fill="%s"/>'
          % (' '.join(bs), ' '.join(bb), BRONZE[4], ' '.join(bl), BRONZE[3]))
    # the scope's turned bezel and its glass
    m.add('<circle cx="48.6" cy="48.9" r="27.4" fill="#000" fill-opacity=".55"/>')
    m.add(faceted_ring(48, 48, 25.2, 27.4, +1, n=60))
    glass = m.rad('glass', [(0, '#26303a'), (0.7, '#141a20'), (1, '#07090c')], 44, 44, 27)
    m.add('<circle cx="48" cy="48" r="25.2" fill="%s"/>' % glass)
    clip = m.clip('glass', '<circle cx="48" cy="48" r="25.2"/>')
    m.add('<g clip-path="%s">' % clip)
    # the blueprint grid in the glass
    grid = []
    for k in range(-6, 7):
        grid.append((48 + k * 4, 20, 48 + k * 4, 76))
        grid.append((20, 48 + k * 4, 76, 48 + k * 4))
    m.add('<path d="%s" stroke="#97adb7" stroke-width=".3" stroke-opacity=".16" fill="none"/>' % lines_path(grid))
    # the sweep: translucent amber, bright at its leading edge and fading
    # along its tail
    lead = math.radians(-38)
    n = 14
    for k in range(n):
        a1 = lead - math.radians(72) * k / n
        a0 = lead - math.radians(72) * (k + 1) / n
        op = 0.92 * (1 - k / n) ** 1.4
        m.add('<path d="%s" fill="#ffb454" fill-opacity="%s"/>' % (wedge_d(48, 48, 0, 25.4, a0, a1 + 0.003), f(op)))
    x1, y1 = pt(48, 48, 25, lead)
    m.add('<path d="M48 48 L%s %s" stroke="#ffe0a8" stroke-width=".9"/>' % (f(x1), f(y1)))
    m.add('</g>')
    # range rings and the azimuth scale, cast as gilt wire
    m.add('<circle cx="48" cy="48" r="9" fill="none" stroke="%s" stroke-width=".6" stroke-opacity=".85"/>'
          '<circle cx="48" cy="48" r="16.6" fill="none" stroke="%s" stroke-width=".6" stroke-opacity=".85"/>'
          % (GILT[4], GILT[4]))
    ticks = []
    for k in range(36):
        a = 2 * math.pi * k / 36
        r0 = 19.6 if k % 3 == 0 else 22.2
        ticks.append((48 + r0 * math.cos(a), 48 + r0 * math.sin(a), 48 + 25 * math.cos(a), 48 + 25 * math.sin(a)))
    m.add('<path d="%s" stroke="%s" stroke-width=".55" fill="none"/>' % (lines_path(ticks), GILT[5]))
    # contacts: quiet cream pearls, one fetched in green, one awaiting
    for r, a in ((12.4, 158), (20.4, 212), (6.4, 250), (19.6, 118)):
        x, y = pt(48, 48, r, math.radians(a))
        m.add('<circle cx="%s" cy="%s" r="1.15" fill="#0a0806"/><circle cx="%s" cy="%s" r="1.05" fill="#efe2c4"/>'
              '<circle cx="%s" cy="%s" r=".4" fill="#fffaf0"/>' % (f(x + .3), f(y + .4), f(x), f(y), f(x - .35), f(y - .35)))
    x, y = pt(48, 48, 14.2, math.radians(146))
    m.add('<circle cx="%s" cy="%s" r="1" fill="#55c186"/>' % (f(x), f(y)))
    ax, ay = pt(48, 48, 15.4, math.radians(-60))
    ag = m.rad('blip', [(0, '#ffe0a8'), (0.5, '#ffb454'), (1, '#9a5a10')], ax + 0.6, ay + 0.7, 2.6)
    m.add('<circle cx="%s" cy="%s" r="2.1" fill="#000" fill-opacity=".6"/><circle cx="%s" cy="%s" r="2" fill="%s"/>'
          % (f(ax + .4), f(ay + .5), f(ax), f(ay), ag))
    s, L = 4.3, 1.9
    br = []
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        cx, cy = ax + sx * s, ay + sy * s
        br.append('M%s %s L%s %s L%s %s' % (f(cx - sx * L), f(cy), f(cx), f(cy), f(cx), f(cy - sy * L)))
    m.add('<path d="%s" stroke="#ffc978" stroke-width=".85" fill="none" stroke-linecap="square"/>' % ' '.join(br))
    m.add(relief(circle_d(48, 48, 1.7), GILT[4]))


def subject_outreach(m, h):
    """A calling card presented on a salver. The desk prepares one
    introduction at a time and hands it over; the owner delivers it by
    hand, which is what a card with its corner turned down said."""
    # the salver's well: a gilt fillet stepping down into it
    m.add(faceted_ring(48, 48, 30.2, 31.2, -1, n=60))
    m.add('<circle cx="48" cy="48" r="30.2" fill="%s" fill-opacity=".35"/>' % h['deep'])
    # chevrons either side, the deck's arrows
    for sx in (-1, 1):
        x = 48 + sx * 35.2
        d = 'M%s 44.2 L%s 48 L%s 51.8' % (f(x - sx * 1.6), f(x + sx * 1.1), f(x - sx * 1.6))
        m.add('<path d="%s" stroke="#000" stroke-opacity=".5" stroke-width="1.4" fill="none" transform="translate(.4 .6)"/>'
              '<path d="%s" stroke="%s" stroke-width="1.3" fill="none"/>' % (d, d, GILT[5]))
    cx, cy, ang = 49.4, 49.6, -11
    W, H = 22.5, 14.2
    card = [(-W, -H), (W, -H), (W, H), (-W + 7.6, H), (-W, H - 7.6)]
    card_abs = [(cx + x, cy + y) for x, y in card]
    m.add('<g transform="rotate(%s %s %s)">' % (f(ang), f(cx), f(cy)))
    m.add('<path d="%s" fill="#000" fill-opacity=".55" transform="translate(1.1 1.9)"/>' % poly_d(card_abs))
    bevel = m.lin('bevel', [(0, GILT[3]), (0.4, GILT[5]), (1, GILT[1])], cx - W, cy - H, cx + W, cy + H)
    m.add('<path d="%s" fill="%s"/>' % (poly_d(card_abs), bevel))
    inset = [(-W + 1.15, -H + 1.15), (W - 1.15, -H + 1.15), (W - 1.15, H - 1.15), (-W + 8.1, H - 1.15), (-W + 1.15, H - 8.1)]
    paper = m.lin('paper', [(0, '#fdfbf6'), (0.6, '#f4f1ea'), (1, '#ddd5c2')], cx - W, cy - H, cx + W, cy + H)
    m.add('<path d="%s" fill="%s"/>' % (poly_d([(cx + x, cy + y) for x, y in inset]), paper))
    # the turned corner: the flap lies on the face, showing the card's back
    flap = [(cx - W, cy + H - 7.6), (cx - W + 7.6, cy + H), (cx - W + 7.6, cy + H - 7.6)]
    m.add('<path d="%s" fill="#000" fill-opacity=".25" transform="translate(.5 -.4)"/>' % poly_d(flap))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(flap), m.lin('flap', [(0, '#e9e1cd'), (1, '#c9bea5')], cx - W, cy + H, cx - W + 7.6, cy + H - 7.6)))
    m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".5"/>'
          % (f(cx - W), f(cy + H - 7.6), f(cx - W + 7.6), f(cy + H), GILT[4]))
    # the cameo: a white profile in relief on ink jasper, in a beaded frame
    ox, oy = cx - 11.6, cy - 0.6
    m.add('<ellipse cx="%s" cy="%s" rx="5.9" ry="7.4" fill="%s"/>' % (f(ox + .3), f(oy + .4), GILT[1]))
    m.add('<ellipse cx="%s" cy="%s" rx="5.7" ry="7.2" fill="%s"/>' % (f(ox), f(oy), GILT[4]))
    beads_d = []
    for k in range(22):
        a = 2 * math.pi * k / 22
        beads_d.append(circle_d(ox + 5.15 * math.cos(a), oy + 6.65 * math.sin(a), 0.42))
    m.add('<path d="%s" fill="%s"/>' % (' '.join(beads_d), GILT[3]))
    m.add('<ellipse cx="%s" cy="%s" rx="4.4" ry="5.9" fill="%s"/>'
          % (f(ox), f(oy), m.rad('jasper', [(0, '#5a7f98'), (1, '#2b4a60')], ox - 1, oy - 1.5, 6)))
    prof = ('M%s %s' % (f(ox + 1.9), f(oy + 5.2)) +
            ' C%s %s %s %s %s %s' % (f(ox + 1.2), f(oy + 3.2), f(ox + 0.6), f(oy + 2.4), f(ox + 0.9), f(oy + 1.2)) +
            ' C%s %s %s %s %s %s' % (f(ox - 0.2), f(oy + 1.4), f(ox - 1.1), f(oy + 1.0), f(ox - 1.3), f(oy + 0.3)) +
            ' L%s %s L%s %s' % (f(ox - 1.1), f(oy - 0.3), f(ox - 1.7), f(oy - 0.7)) +
            ' C%s %s %s %s %s %s' % (f(ox - 1.2), f(oy - 1.4), f(ox - 1.4), f(oy - 2.4), f(ox - 1.0), f(oy - 3.2)) +
            ' C%s %s %s %s %s %s' % (f(ox - 0.2), f(oy - 4.7), f(ox + 2.3), f(oy - 4.8), f(ox + 2.9), f(oy - 3.2)) +
            ' C%s %s %s %s %s %s' % (f(ox + 3.5), f(oy - 1.6), f(ox + 2.9), f(oy - 0.1), f(ox + 2.3), f(oy + 1.0)) +
            ' C%s %s %s %s %s %s Z' % (f(ox + 2.6), f(oy + 2.6), f(ox + 3.3), f(oy + 4.0), f(ox + 3.4), f(oy + 5.2)))
    m.add(relief(prof, '#f4f1ea', lit='#ffffff', shade='#12202c', dx=0.35, dy=0.45, lo=0.2))
    # copperplate lines, engraved, never legible
    for yy, x0, x1 in ((-5.2, -3.6, 18.2), (-0.6, -3.6, 16.4), (4.2, -3.6, 9.6)):
        pts = []
        steps = int((x1 - x0) / 1.2)
        for k in range(steps + 1):
            x = x0 + (x1 - x0) * k / steps
            pts.append((cx + x, cy + yy + 0.55 * math.sin(k * 1.9) - (0.5 if k % 4 == 1 else 0)))
        m.add('<path d="M%s" stroke="#2b3444" stroke-width=".62" fill="none" stroke-linejoin="round"/>'
              % ' L'.join('%s %s' % (f(x), f(y)) for x, y in pts))
    m.add('<rect x="%s" y="%s" width="16" height=".4" fill="%s"/>' % (f(cx - 3.6), f(cy + 8.4), GILT[4]))
    # the seal: one drop of gold wax, pressed
    sx, sy = cx + 14.6, cy + 7.8
    m.add(relief(circle_d(sx, sy, 3.1), m.rad('seal', [(0, '#f7e3a0'), (0.6, '#e0b84e'), (1, '#8a6a1c')], sx - 1, sy - 1, 3.6),
                 dx=0.4, dy=0.6))
    m.add('<circle cx="%s" cy="%s" r="1.9" fill="none" stroke="%s" stroke-width=".45"/>' % (f(sx), f(sy), '#8a6a1c'))
    m.add('<path d="%s" fill="%s"/>' % (poly_d([(sx, sy - 1.3), (sx + 0.45, sy - 0.2), (sx + 1.3, sy), (sx + 0.45, sy + 0.2),
                                               (sx, sy + 1.3), (sx - 0.45, sy + 0.2), (sx - 1.3, sy), (sx - 0.45, sy - 0.2)]), '#8a6a1c'))
    m.add('</g>')


# 晨, cut as a cast nameplate letter: uniform strokes, square terminals.
CHEN = [
    # 日
    'M35.6 16.6 H60.4 V33.8 H35.6 Z M39.1 20 V23.6 H56.9 V20 Z M39.1 26.8 V30.4 H56.9 V26.8 Z',
    # 辰: the roof
    'M29.4 35.6 H67.4 V39 H29.4 Z',
    # its left fall
    'M30.6 39 H34.1 V54.8 C34.1 59.6 32.6 63.4 29.4 66.6 L26.6 64.4 C29.4 61.4 30.6 58.4 30.6 54.4 Z',
    # 二
    'M38.8 41.8 H63.6 V44.9 H38.8 Z',
    'M37 48 H66.4 V51.2 H37 Z',
    # the stroke that rises
    'M38.8 53.8 H42.2 V61.2 L47.6 57.2 L49.4 59.6 L41.8 65.4 H38.8 Z',
    # the long sweep and its small fall
    'M48.2 53.4 H51.6 C54.4 58.2 60.4 62.4 68.4 63.6 L67.4 66.8 C58.4 65.2 51.6 60.6 48.2 53.4 Z',
    'M62.4 52.2 L65.2 53.8 L60.2 59.2 L57.8 57.4 Z',
]


def subject_pressroom(m, h):
    """The paper's nameplate: 晨 in bone enamel within gilt cloisons, its
    second impression sunk a hair down and to the right as the masthead
    prints it, over the staff and the register of the day's stories."""
    bone = m.lin('bone', [(0, '#fffbe4'), (0.5, '#f4ecc0'), (1, '#cfc496')], 30, 16, 68, 66)
    # double bars, the score's final barline, either side
    for x0, sgn in ((20.6, 1), (75.4, -1)):
        m.add('<rect x="%s" y="36" width="1.8" height="24" fill="%s"/>' % (f(x0 - (1.8 if sgn < 0 else 0)), GILT[2]))
        m.add('<rect x="%s" y="36" width=".7" height="24" fill="%s"/>' % (f(x0 + sgn * 2.8 - (0.7 if sgn < 0 else 0)), GILT[2]))
        m.add('<rect x="%s" y="36" width=".45" height="24" fill="%s"/>' % (f(x0 - (1.8 if sgn < 0 else 0)), GILT[5]))
    ghost = ' '.join(CHEN)
    m.add('<path d="%s" fill="%s" fill-opacity=".85" fill-rule="evenodd" transform="translate(1.5 1.4)"/>' % (ghost, '#08180d'))
    m.add('<path d="%s" fill="%s" fill-rule="evenodd" transform="translate(-.45 -.45)"/>' % (ghost, GILT[3]))
    m.add('<path d="%s" fill="%s" fill-rule="evenodd" stroke="%s" stroke-width=".7" stroke-linejoin="miter"/>'
          % (ghost, bone, GILT[2]))
    # the sun in the 日: its two cells fired dawn gold
    m.add('<path d="M39.1 20 V23.6 H56.9 V20 Z" fill="%s"/>' % m.lin('dawn', [(0, '#f6d27a'), (1, '#c98a2c')], 39, 20, 39, 24))
    m.add('<path d="M39.1 26.8 V30.4 H56.9 V26.8 Z" fill="%s"/>' % m.lin('dawn2', [(0, '#e6a84a'), (1, '#a8601c')], 39, 27, 39, 30.4))
    # the staff: a rule with square ends and blocks riding it, and the
    # three-dot clusters hung under it
    m.add('<rect x="19.4" y="70.2" width="57.2" height="1.8" fill="#000" fill-opacity=".55" transform="translate(.4 .6)"/>')
    m.add('<rect x="19.4" y="70.2" width="57.2" height="1.8" fill="%s"/>' % GILT[4])
    m.add('<rect x="19.4" y="70.2" width="57.2" height=".6" fill="%s"/>' % GILT[3])
    for x in (18.2, 75.4):
        m.add(relief('M%s 69 h2.6 v4.2 h-2.6 Z' % f(x), GILT[4]))
    blocks, dots = [], []
    for k in range(6):
        x = 25.2 + k * 9.2
        blocks.append('M%s 69.5 h2.4 v3.2 h-2.4 Z' % f(x))
        dots.append(circle_d(x - 0.5, 74.7, 0.62))
        dots.append(circle_d(x + 2.9, 74.7, 0.62))
        dots.append(circle_d(x + 1.2, 76.6, 0.62))
    m.add(relief(' '.join(blocks), GILT[5], dx=0.35, dy=0.5))
    m.add('<path d="%s" fill="%s"/>' % (' '.join(dots), '#e8dfb8'))
    # the register: one square per desk, three already read
    for k in range(5):
        x = 36.3 + k * 4.9
        if k < 3:
            m.add('<rect x="%s" y="80.2" width="3" height="3" fill="%s"/>' % (f(x), h['pop']))
        m.add('<rect x="%s" y="80.2" width="3" height="3" fill="none" stroke="%s" stroke-width=".6"/>' % (f(x), '#e8dfb8'))


def subject_arsenal(m, h):
    """A gunner's quadrant on a bolt-head plate: a brass quarter arc
    graduated 0 to 60 (every charge in the game tops out at 60 degrees),
    the pointer laid at 45 with a signal-red tip, a plumb bob on its chain,
    and six hex studs round it for the six powder charges, the least one
    jewelled."""
    oh = ngon(48, 48, 37.6, 6, 0)
    ih = ngon(48, 48, 33.2, 6, 0)
    m.add('<path d="%s" fill="#000" fill-opacity=".55" transform="translate(.7 1)"/>' % poly_d(oh))
    m.add(facet_poly(oh, ih, BLUED, shade_all=0.32))
    m.add('<path d="%s" fill="none" stroke="%s" stroke-width=".5"/>' % (poly_d(oh), BLUED[4]))
    face = m.lin('face', [(0, '#64707a'), (0.45, '#414c55'), (1, '#20272d')], 22, 20, 74, 78)
    m.add('<path d="%s" fill="%s"/>' % (poly_d(ih), face))
    clip = m.clip('face', '<path d="%s"/>' % poly_d(ih))
    m.add('<g clip-path="%s"><path d="%s" stroke="#a9b6bf" stroke-width=".38" stroke-opacity=".26" fill="none"/></g>'
          % (clip, ' '.join(turn_perlage(h))))
    # slotted screws at the six corners, each slot its own way
    for k, a in enumerate(range(0, 360, 60)):
        x, y = pt(48, 48, 35.4, math.radians(a))
        m.add('<circle cx="%s" cy="%s" r="1.45" fill="#000" fill-opacity=".6"/>' % (f(x + .3), f(y + .45)))
        m.add('<circle cx="%s" cy="%s" r="1.35" fill="%s"/>' % (f(x), f(y), STEEL[5]))
        sa = math.radians(17 + k * 53)
        dx, dy = 1.1 * math.cos(sa), 1.1 * math.sin(sa)
        m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width=".45"/>' % (f(x - dx), f(y - dy), f(x + dx), f(y + dy), STEEL[0]))
    px, py, R = 29.6, 64.4, 31.0
    # the quadrant: a brass quarter plate
    qd = wedge_d(px, py, 0, R, math.radians(-90), 0)
    m.add(relief(qd, m.lin('quad', [(0, GILT[5]), (0.45, GILT[4]), (1, GILT[1])], px, py - R, px + R, py)))
    # the scale: cream enamel on the arc from 0 to 60, brass beyond
    m.add('<path d="%s" fill="%s"/>' % (wedge_d(px, py, 21.8, 28.6, math.radians(-60), 0), '#e8dfc8'))
    m.add('<path d="%s" fill="%s"/>' % (wedge_d(px, py, 21.8, 22.4, math.radians(-60), 0), '#b3a88c'))
    ticks = []
    for e in range(0, 61, 5):
        a = math.radians(-e)
        r0 = 23.0 if e % 15 == 0 else 25.4
        ticks.append((px + r0 * math.cos(a), py + r0 * math.sin(a), px + 28.4 * math.cos(a), py + 28.4 * math.sin(a)))
    m.add('<path d="%s" stroke="#2a2109" stroke-width=".6" fill="none"/>' % lines_path(ticks))
    m.add('<path d="%s" stroke="%s" stroke-width=".5" fill="none"/>'
          % ('M%s %s A14 14 0 0 0 %s %s' % (f(px + 14), f(py), f(px), f(py - 14)), GILT[1]))
    m.add('<path d="%s" stroke="%s" stroke-width=".4" fill="none" transform="translate(-.3 -.3)"/>'
          % ('M%s %s A14 14 0 0 0 %s %s' % (f(px + 14), f(py), f(px), f(py - 14)), GILT[3]))
    # the stop at 60
    sx, sy = pt(px, py, 25.2, math.radians(-60))
    m.add(relief(circle_d(sx, sy, 1.3), GILT[2]))
    # six hex studs round the arc, the powder charges; the least one has
    # its green jewel
    for k in range(6):
        a = math.radians(-8 - k * 14.6)
        x, y = pt(px, py, 36.4, a)
        hx = ngon(x, y, 2.3, 6, 0)
        m.add('<path d="%s" fill="#000" fill-opacity=".6" transform="translate(.35 .5)"/>' % poly_d(hx))
        m.add('<path d="%s" fill="%s"/>' % (poly_d(hx), GILT[4]))
        m.add('<path d="%s" fill="%s"/>' % (poly_d(ngon(x, y, 1.55, 6, 0)), '#e8dfc8' if k != 2 else '#1f5a2a'))
        if k == 2:
            m.add('<circle cx="%s" cy="%s" r="1.05" fill="%s"/>'
                  % (f(x), f(y), m.rad('pilot', [(0, '#b8f0b0'), (0.55, '#4cbf5a'), (1, '#1d5a24')], x + .4, y + .45, 1.3)))
    # the plumb bob on its chain
    chain = ''.join(circle_d(px, py + 2.6 + k * 1.35, 0.42) for k in range(5))
    m.add('<path d="%s" fill="%s"/>' % (chain, GILT[5]))
    m.add(relief('M%s %s L%s %s L%s %s Q%s %s %s %s Z' % (f(px - 1.5), f(py + 9.4), f(px + 1.5), f(py + 9.4), f(px + 0.5), f(py + 13.6),
                                                          f(px), f(py + 14.6), f(px - 0.5), f(py + 13.6)), GILT[4]))
    # the pointer, laid at 45, steel with a red lacquered tip
    a = math.radians(-45)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    L1, L2 = 27.2, 33.4
    arm = [(px + nx * 1.3, py + ny * 1.3), (px + ux * L1 + nx * 0.9, py + uy * L1 + ny * 0.9),
           (px + ux * L1 - nx * 0.9, py + uy * L1 - ny * 0.9), (px - nx * 1.3, py - ny * 1.3)]
    tip = [(px + ux * L1 + nx * 0.9, py + uy * L1 + ny * 0.9), (px + ux * L2, py + uy * L2),
           (px + ux * L1 - nx * 0.9, py + uy * L1 - ny * 0.9)]
    m.add(relief(poly_d(arm), m.lin('arm', [(0, STEEL[5]), (1, STEEL[2])], px, py - 10, px + 20, py - 20), lit=STEEL[3]))
    m.add(relief(poly_d(tip), '#b03a2e', lit='#e0604a', dx=0.4, dy=0.55))
    m.add(relief(circle_d(px, py, 2.4), m.rad('hub', [(0, GILT[3]), (0.5, GILT[4]), (1, GILT[1])], px - .8, py - .8, 3)))
    m.add('<circle cx="%s" cy="%s" r=".7" fill="%s"/>' % (f(px), f(py), GILT[0]))


def subject_bourse(m, h):
    """The canary the desk keeps on watch, in a gilded dome cage: it sits
    calm on its perch most days, and speaks up only when the air turns.
    The cage stands on a band of the curtain's own olive gold, over a
    lozenge plinth, Bourse's own shape kept at its feet."""
    cage = m.lin('cage', [(0, GILT[3]), (0.3, GILT[5]), (0.7, GILT[4]), (1, GILT[2])], 28, 16, 68, 72)
    # plinth lozenge
    pl = [(48, 70.8), (56.4, 76.4), (48, 82), (39.6, 76.4)]
    pli = [(48, 72.9), (53.2, 76.4), (48, 79.9), (42.8, 76.4)]
    m.add('<path d="%s" fill="#000" fill-opacity=".6" transform="translate(.5 .8)"/>' % poly_d(pl))
    m.add(facet_poly(pl, pli))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(pli), '#7a5424'))
    m.add('<path d="%s" fill="%s"/>' % (poly_d([(48, 74.6), (50.6, 76.4), (48, 78.2), (45.4, 76.4)]), '#2a2109'))
    # the base: a gilt tray and the olive-gold enamel band
    m.add(relief('M26.4 68.6 H69.6 L67.8 72.2 H28.2 Z', cage))
    m.add('<rect x="29" y="62" width="38" height="6.8" fill="#000" fill-opacity=".55" transform="translate(.5 .8)"/>')
    m.add('<rect x="29" y="62" width="38" height="6.8" fill="%s"/>' % GILT[4])
    m.add('<rect x="30" y="63.1" width="36" height="4.6" fill="%s"/>'
          % m.lin('band', [(0, '#8e8c4a'), (0.5, '#6b692c'), (1, '#45431a')], 0, 63, 0, 67.7))
    for x in (33.6, 40.8, 48, 55.2, 62.4):
        m.add('<path d="%s" fill="%s"/>' % (poly_d([(x, 63.8), (x + 1.4, 65.4), (x, 67), (x - 1.4, 65.4)]), GILT[5]))
    m.add('<rect x="29" y="62" width="38" height=".6" fill="%s"/>' % GILT[3])
    # the bars, and the dome's meridians gathering at the crown
    sp, apex, half = 39.6, 19.4, 18.2
    bars = []
    for x in (48 - half, 48 - half / 2, 48, 48 + half / 2, 48 + half):
        bars.append('M%s %s V62' % (f(x), f(sp)))
        if abs(x - 48) < 0.1:
            bars.append('M48 %s V%s' % (f(apex), f(sp)))
        else:
            rx = abs(x - 48)
            sweep = 0 if x < 48 else 1
            bars.append('M48 %s A%s %s 0 0 %d %s %s' % (f(apex), f(rx), f(sp - apex), sweep, f(x), f(sp)))
    bd = ' '.join(bars)
    m.add('<path d="%s" stroke="#000" stroke-opacity=".6" stroke-width="1.9" fill="none" transform="translate(.5 .7)"/>' % bd)
    m.add('<path d="%s" stroke="%s" stroke-width="1.8" fill="none"/>' % (bd, cage))
    m.add('<path d="%s" stroke="%s" stroke-width=".55" fill="none" transform="translate(-.45 -.2)"/>' % (bd, GILT[3]))
    # hoops: the spring line and a waist
    for y, t in ((sp - 0.9, 1.9), (51.6, 1.2)):
        m.add('<rect x="%s" y="%s" width="%s" height="%s" fill="#000" fill-opacity=".55" transform="translate(.4 .6)"/>'
              % (f(48 - half - 1), f(y), f(2 * half + 2), f(t)))
        m.add('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (f(48 - half - 1), f(y), f(2 * half + 2), f(t), GILT[4]))
        m.add('<rect x="%s" y="%s" width="%s" height=".5" fill="%s"/>' % (f(48 - half - 1), f(y), f(2 * half + 2), GILT[3]))
    # the finial and its hanging ring
    m.add(relief('M44.6 20.6 Q48 15.4 51.4 20.6 Z', cage))
    m.add('<circle cx="48" cy="13.6" r="2.4" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="1.2" transform="translate(.4 .6)"/>'
          '<circle cx="48" cy="13.6" r="2.4" fill="none" stroke="%s" stroke-width="1.1"/>'
          '<path d="M45.9 12.4 A2.4 2.4 0 0 1 49.4 11.6" stroke="%s" stroke-width=".5" fill="none"/>' % (GILT[4], GILT[3]))
    m.add(relief(circle_d(48, 16.9, 1.25), GILT[4]))
    # the perch on its two wires
    m.add('<path d="M40.6 23.4 L39.6 56.6 M55.4 23.4 L56.4 56.6" stroke="%s" stroke-width=".55" fill="none"/>' % BRONZE[4])
    m.add(relief('M37.6 56 H58.4 V57.9 H37.6 Z', m.lin('perch', [(0, BRONZE[5]), (1, BRONZE[2])], 0, 56, 0, 58)))
    # the canary, perched side-on, facing the light
    body = 'M40.2 47.2 C41.6 43.8 46.8 42.6 51.6 44.8 C55.4 46.6 57.8 50 57.4 53.2 C56.9 56 53.6 57.2 49.4 56.9 C44.2 56.6 40.8 53.6 40.2 50.4 Z'
    tail = 'M55.2 51.2 L63.2 55.6 L62.2 57.8 L54.2 54.8 Z'
    head = circle_d(41.8, 42.4, 4.7)
    yel = m.rad('canary', [(0, '#fbe27a'), (0.55, '#e9bd22'), (1, '#9a6e10')], 44, 44, 15, 42, 41)
    m.add(relief(tail, m.lin('tail', [(0, '#d9a41c'), (1, '#8a620c')], 55, 51, 63, 57), lit='#f4d45a', dx=0.5, dy=0.7))
    m.add(relief(body + ' ' + head, yel, lit='#fff0a8', dx=0.6, dy=0.85))
    # the wing, shaded amber, with three feather lines
    wing = 'M45.4 48.4 C49.4 46.6 54.8 48 56.6 51.8 C53.4 54.2 48.2 54.2 45.4 48.4 Z'
    m.add('<path d="%s" fill="%s"/>' % (wing, m.lin('wing', [(0, '#e0a81e'), (1, '#a8740e')], 45, 47, 56, 54)))
    m.add('<path d="M48 50.6 C50.4 51.8 52.8 52 55 51.6 M47.2 49.2 C49.6 49.8 52.2 50 54.4 49.8" stroke="#8a5e0a" stroke-width=".45" fill="none"/>')
    # beak, eye, feet
    m.add('<path d="M37.4 42.8 L37.9 41.4 L40.2 41.2 L40.3 43.6 Z" fill="#d98a1c"/><path d="M37.4 42.8 L40.3 43.6 L40.2 42.6 Z" fill="#9a5a10"/>')
    m.add('<circle cx="41" cy="41.3" r=".95" fill="#16100a"/><circle cx="41" cy="41.3" r="1.35" fill="none" stroke="#b78a1c" stroke-width=".3"/>')
    m.add('<path d="M47.4 56.6 L46.8 58.4 M51 56.8 L50.6 58.4" stroke="#8a5e0a" stroke-width=".7"/>')


SUBJECTS = {
    'autopilot': (turn_lamp_fan, subject_autopilot, 'round'),
    'groundstation': (turn_rings, subject_groundstation, 'round'),
    'outreach': (turn_basket, subject_outreach, 'round'),
    'pressroom': (turn_halftone, subject_pressroom, 'kite'),
    'arsenal': (None, subject_arsenal, 'round'),
    'bourse': (turn_lattice, subject_bourse, 'round'),
}


def emblem(app):
    """The full mark, as SVG body markup on a 0 0 96 96 viewBox."""
    if app == 'atrium':
        return atrium_emblem()
    h = dict(HUE[app])
    h['gadroon'] = app == 'outreach'
    m = Mark(app)
    turning, subject, stone = SUBJECTS[app]
    die_back(m, h)
    if turning is turn_perlage or turning is None:
        ground = ''.join('<circle cx="48" cy="48" r="%s" fill="none" stroke="%s" stroke-width=".45" stroke-opacity=".5"/>'
                         % (f(r), h['lit']) for r in [x * 1.5 for x in range(1, 27)])
    else:
        ground = turning(h)
    enamel_open(m, h, ground)
    subject(m, h)
    enamel_close(m)
    crown(m, h['pop'], stone)
    return m.markup()


# --------------------------------------------------------------------------
# The small cut: the Ledger's sigil (20 to 35 px) and the 16/32/48 favicon.
# Same die, same enamel, the subject cut to its biggest shapes.
# --------------------------------------------------------------------------
def emblem_small(app):
    h = HUE[app]
    m = Mark(app, '-s')
    lip = m.lin('lip', [(0, GILT[3]), (0.35, GILT[5]), (0.7, GILT[2]), (1, GILT[1])], 14, 12, 84, 86)
    m.add('<circle cx="48.9" cy="49.3" r="47.4" fill="#000" fill-opacity=".55"/>')
    m.add('<circle cx="48" cy="48" r="47.4" fill="%s"/>' % lip)
    m.add('<circle cx="48" cy="48" r="41.6" fill="%s"/>' % GILT[0])
    en = m.rad('enamel', [(0, h['lit']), (0.6, h['field']), (1, h['deep'])], 42, 40, 44)
    m.add('<circle cx="48" cy="48" r="39.4" fill="%s"/>' % en)
    SMALL[app](m, h)
    # the crown stone as a set dot
    m.add('<circle cx="48.5" cy="7.4" r="6" fill="#000" fill-opacity=".55"/><circle cx="48" cy="6.8" r="5.8" fill="%s"/>'
          '<circle cx="48" cy="6.8" r="3.8" fill="%s"/>' % (GILT[4], h['pop']))
    return m.markup()


def small_autopilot(m, h):
    m.add('<path d="M26 30 C19.4 35 17.4 46 17.2 64 H26 Z" fill="%s"/>' % GILT[4])
    m.add('<rect x="27" y="27" width="10" height="37" fill="#ece0c2"/><rect x="27" y="27" width="3" height="37" fill="#fffaf0"/>')
    m.add('<rect x="38.2" y="21" width="12.4" height="43" fill="#b8352c"/><rect x="38.2" y="21" width="3.4" height="43" fill="#d65a4a"/>')
    m.add('<rect x="38.2" y="28" width="12.4" height="2.6" fill="%s"/><rect x="38.2" y="54" width="12.4" height="2.6" fill="%s"/>' % (GILT[5], GILT[5]))
    m.add('<rect x="51.8" y="36" width="7.6" height="28" fill="#d2bf92"/>')
    m.add('<g transform="rotate(-12 62.4 64)"><rect x="62.4" y="30" width="9.4" height="34" fill="#bf924f"/>'
          '<rect x="62.4" y="30" width="2.6" height="34" fill="#e8c48a"/></g>')
    m.add('<rect x="14.6" y="63.4" width="66.8" height="6.2" fill="%s"/><rect x="14.6" y="63.4" width="66.8" height="2" fill="%s"/>'
          % (GILT[2], GILT[3]))
    m.add('<path d="M20 69.6 H29 Q23 71 22.4 79 H20 Z M76 69.6 H67 Q73 71 73.6 79 H76 Z" fill="%s"/>' % GILT[4])


def small_groundstation(m, h):
    oc = ngon(48, 48, 38.6, 8, math.radians(22.5))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(oc), BRONZE[4]))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(ngon(48, 48, 35.2, 8, math.radians(22.5))), h['field']))
    m.add('<circle cx="48" cy="48" r="26" fill="%s"/>' % GILT[4])
    m.add('<circle cx="48" cy="48" r="23.2" fill="#131a20"/>')
    m.add('<path d="%s" fill="#ffb454" fill-opacity=".85"/>' % wedge_d(48, 48, 0, 23.2, math.radians(-80), math.radians(-38)))
    m.add('<path d="%s" fill="#ffb454" fill-opacity=".35"/>' % wedge_d(48, 48, 0, 23.2, math.radians(-118), math.radians(-80)))
    m.add('<circle cx="48" cy="48" r="13" fill="none" stroke="%s" stroke-width="1.6" stroke-opacity=".8"/>' % GILT[4])
    x, y = pt(48, 48, 14.5, math.radians(-62))
    m.add('<circle cx="%s" cy="%s" r="3.8" fill="#ffc978"/>' % (f(x), f(y)))
    x, y = pt(48, 48, 15, math.radians(160))
    m.add('<circle cx="%s" cy="%s" r="2.3" fill="#efe2c4"/>' % (f(x), f(y)))


def small_outreach(m, h):
    cx, cy = 49, 50
    W, H = 25, 16
    card = [(cx - W, cy - H), (cx + W, cy - H), (cx + W, cy + H), (cx - W + 9, cy + H), (cx - W, cy + H - 9)]
    m.add('<g transform="rotate(-11 %s %s)">' % (cx, cy))
    m.add('<path d="%s" fill="#000" fill-opacity=".5" transform="translate(1.5 2.4)"/>' % poly_d(card))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(card), GILT[4]))
    inset = [(cx - W + 2, cy - H + 2), (cx + W - 2, cy - H + 2), (cx + W - 2, cy + H - 2), (cx - W + 9.6, cy + H - 2), (cx - W + 2, cy + H - 9.6)]
    m.add('<path d="%s" fill="#f4f1ea"/>' % poly_d(inset))
    m.add('<path d="%s" fill="#c9bea5"/>' % poly_d([(cx - W, cy + H - 9), (cx - W + 9, cy + H), (cx - W + 9, cy + H - 9)]))
    m.add('<ellipse cx="%s" cy="%s" rx="6.2" ry="8" fill="%s"/><ellipse cx="%s" cy="%s" rx="4.4" ry="6.2" fill="#2f5470"/>'
          % (f(cx - 12.6), f(cy - 1), GILT[4], f(cx - 12.6), f(cy - 1)))
    m.add('<rect x="%s" y="%s" width="18" height="2.4" fill="#3a4250"/><rect x="%s" y="%s" width="14" height="2.4" fill="#3a4250"/>'
          % (f(cx - 3), f(cy - 6), f(cx - 3), f(cy + 0.4)))
    m.add('<circle cx="%s" cy="%s" r="3.6" fill="#e0b84e"/>' % (f(cx + 15), f(cy + 8)))
    m.add('</g>')


def small_pressroom(m, h):
    # 晨 with its strokes thickened: a stroke of the full cut, outlined wider
    m.add('<path d="%s" fill="#07170c" fill-rule="evenodd" transform="translate(1.6 1.6)" stroke="#07170c" stroke-width="1.6"/>' % ' '.join(CHEN))
    m.add('<path d="%s" fill="#f4ecc0" fill-rule="evenodd" stroke="#f4ecc0" stroke-width="1.5" stroke-linejoin="miter"/>' % ' '.join(CHEN))
    m.add('<path d="M39.9 20.8 V22.8 H56.1 V20.8 Z M39.9 27.6 V29.6 H56.1 V27.6 Z" fill="#d39a3a"/>')
    m.add('<rect x="18.4" y="70" width="59.2" height="3.4" fill="%s"/>' % GILT[4])
    m.add('<rect x="18.4" y="70" width="59.2" height="1.2" fill="%s"/>' % GILT[3])
    for k in range(3):
        m.add('<rect x="%s" y="77.4" width="4.6" height="4.6" fill="%s"/>' % (f(38.4 + k * 7), '#e8dfb8' if k < 2 else h['pop']))


def small_arsenal(m, h):
    m.add('<path d="%s" fill="%s"/>' % (poly_d(ngon(48, 48, 38.6, 6, 0)), STEEL[4]))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(ngon(48, 48, 34.2, 6, 0)), '#4c5964'))
    px, py = 29.4, 65
    m.add('<path d="%s" fill="%s"/>' % (wedge_d(px, py, 0, 32, math.radians(-90), 0), GILT[4]))
    m.add('<path d="%s" fill="%s"/>' % (wedge_d(px, py, 0, 32, math.radians(-90), math.radians(-60)), GILT[5]))
    m.add('<path d="%s" fill="#e8dfc8"/>' % wedge_d(px, py, 21, 28.4, math.radians(-60), 0))
    a = math.radians(-45)
    ex, ey = px + 34.6 * math.cos(a), py + 34.6 * math.sin(a)
    mx, my = px + 26 * math.cos(a), py + 26 * math.sin(a)
    m.add('<path d="M%s %s L%s %s" stroke="%s" stroke-width="3.4"/>' % (f(px), f(py), f(mx), f(my), STEEL[5]))
    m.add('<path d="M%s %s L%s %s" stroke="#c0402f" stroke-width="3.8" stroke-linecap="round"/>' % (f(mx), f(my), f(ex), f(ey)))
    m.add('<circle cx="%s" cy="%s" r="3.4" fill="%s"/>' % (f(px), f(py), GILT[5]))


def small_bourse(m, h):
    g = GILT[4]
    m.add('<path d="M27 64 H69 L67 70 H29 Z" fill="%s"/>' % g)
    m.add('<rect x="30" y="58.4" width="36" height="6" fill="#6b692c"/>')
    m.add('<path d="M31.4 58.4 V39 A16.6 20 0 0 1 64.6 39 V58.4" stroke="%s" stroke-width="3" fill="none"/>' % g)
    m.add('<path d="M48 19 V58.4" stroke="%s" stroke-width="2.6"/>' % g)
    m.add('<circle cx="48" cy="15.4" r="3" fill="none" stroke="%s" stroke-width="2"/>' % g)
    m.add('<path d="M39.8 44.8 C41.6 40.4 48 39.4 53.4 42 C58 44.2 60.2 48.4 59.4 51.6 C58.6 54.6 54 55.6 49.4 55.2 '
          'C43.6 54.8 40 51.6 39.8 48.2 Z" fill="#e9bd22"/>')
    m.add('<circle cx="41.4" cy="40.4" r="5.6" fill="#e9bd22"/><circle cx="40.2" cy="39.4" r="1.2" fill="#16100a"/>')
    m.add('<path d="M35.4 41.2 L39 39.4 L39 42.6 Z" fill="#d98a1c"/>')
    m.add('<path d="M56 49 L65 53.4 L63.4 56 L54.4 52.6 Z" fill="#c99a1a"/>')


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
