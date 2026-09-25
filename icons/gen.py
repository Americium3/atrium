"""The six app marks and their house curtains, from one source.

Each mark is a 1930s enamelled badge cut from one die: a plain turned gilt
lip with one groove, translucent enamel fired over an engine-turned ground,
and a stone in a collet at the crown. The die is shared; the enamel, the
turning under it and the stone are each app's own.

Inside the die each app carries one charge, seen from the same place (level
with it or a few degrees above) and lit by the one key light, up and to the
left: a globe at dawn with the morning's paper round it, an earth station's
dish, a shelf of bound volumes, a card held up in the hand, a gunner's
quadrant, a canary on its perch. The globe's night and dawn are printed on
it; its roundness takes the same lamp as the rest. Each is drawn from the real object, its geometry and
proportions taken from photographs, never pieced together from circles and
rectangles, and never lettered. Its form is then cut into three or four flat
planes of tone along the key light, the way a woodcut or a Deco poster cuts
it: no gradient inside a plane and no outline round it (icons/solid.py
projects the solids and traces the planes). Colour is laid in as the eye
remembers the thing. Nothing on a mark glows and nothing carries a gloss
band: the domed crystal the gate's bezel holds over it supplies the one
reflection glass is allowed.

Every mark also has a small cut (#mark-<id>-s), drawn from the same
geometry with fewer planes, no fine engraving (Arsenal keeps its points as
coarse blocks), and its struts and legs drawn heavier, no stroke finer
than three units, for the Ledger, the gate wherever its mark is under 56
screen pixels, and a future favicon.

HUE below is the one source of truth. Each entry carries the mark's enamel,
the dye of the velvet its gate hangs (per theme), the ink its gate's day
card is printed in and the glass of its fanlight, so the house follows the
mark in code and not by eye.
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
import re
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
#            it lies thinnest over the turning. Every mark draws its ground
#            in these, and the curtain is matched against that ground as
#            the page draws it (tests/test_web_assets.py measures it).
#   pop      the crown stone
#   velvet   the gate's house curtain: an honest name and the dye at its
#            brightest crest, per theme. Every crest stays a quarter darker
#            than the leaf's body (--au-2) and inside the field's family;
#            tests/test_web_assets.py holds both. The rim of Bourse's perch
#            foot is fired in this same dye, read from here.
#   ink      the day screen's title card is printed in this ink (one of
#            INKS; no two alike in a wing), the one nearest the house
#   glass    the fanlight's glass over the gate (one of palace.js GLASS;
#            no two alike in a wing): by night it is the biggest colour in
#            the crown, so it keeps to the mark's family or stays quiet
# --------------------------------------------------------------------------
HUE = {
    'autopilot': {
        'name': 'Anime Autopilot', 'short': 'Autopilot',
        'deep': '#24060d', 'field': '#621925', 'lit': '#983446', 'pop': '#fff4d2',
        'velvet': {'name': 'mulberry', 'onyx': '#92304c', 'ivory': '#9c4660'},
        'ink': 'oxblood', 'glass': 'rose',
    },
    'groundstation': {
        'name': 'Ground Station', 'short': 'Ground Stn',
        'deep': '#5a2f08', 'field': '#c8781f', 'lit': '#eea24c', 'pop': '#ffb454',
        'velvet': {'name': 'cognac', 'onyx': '#885020', 'ivory': '#9f6322'},
        'ink': 'sepia', 'glass': 'amber',
    },
    'outreach': {
        'name': 'Outreach Desk', 'short': 'Outreach',
        'deep': '#0a2230', 'field': '#1c4a5f', 'lit': '#3a6e86', 'pop': '#e8c968',
        'velvet': {'name': 'prussian', 'onyx': '#1f5066', 'ivory': '#33576b'},
        'ink': 'navy', 'glass': 'opal',
    },
    'pressroom': {
        'name': 'The Press Room', 'short': 'Press Room',
        'deep': '#0b2616', 'field': '#1e6a40', 'lit': '#3f9463', 'pop': '#5a8040',
        'velvet': {'name': 'emerald', 'onyx': '#24754b', 'ivory': '#37905f'},
        'ink': 'bottle', 'glass': 'celadon',
    },
    'arsenal': {
        'name': 'Arsenal', 'short': 'Arsenal',
        'deep': '#222a32', 'field': '#62717d', 'lit': '#93a1ac', 'pop': '#b03a2e',
        'velvet': {'name': 'gunmetal', 'onyx': '#44545f', 'ivory': '#5a6a74'},
        'ink': 'navy', 'glass': 'opal',
    },
    'bourse': {
        'name': 'Bourse', 'short': 'Bourse',
        'deep': '#141305', 'field': '#4a4616', 'lit': '#7a742c', 'pop': '#e6a817',
        'velvet': {'name': 'olive gold', 'onyx': '#73662b', 'ivory': '#9b8848'},
        'ink': 'sepia', 'glass': 'honey',
    },
}
# The inks a day card can be printed in, as palace-gates.css draws them.
INKS = {'oxblood': '#6a1d19', 'bottle': '#1d4633', 'navy': '#1c2b4c', 'sepia': '#4e3413'}

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
        return compact_markup(('<defs>%s</defs>' % ''.join(self.defs) if self.defs else '') + ''.join(self.body))


# --------------------------------------------------------------------------
# Path data, written small. The drawing works in absolute coordinates to a
# hundredth of a unit; the page carries each path to a tenth (a twentieth of
# a pixel on a 63px gate, a fifth of one on the sheet's 400px marks), in
# relative steps where they are shorter, with the points of a straight run
# that lie on it dropped. The shapes are the same; the hall's page is about
# a third lighter.
# --------------------------------------------------------------------------
_PATH_TOKEN = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')
_PATH_ARGS = {'M': 2, 'L': 2, 'H': 1, 'V': 1, 'C': 6, 'S': 4, 'Q': 4, 'T': 2, 'A': 7}


def path_segments(d):
    """Path data as absolute segments: M, L, C, Q, A and Z."""
    toks = _PATH_TOKEN.findall(d)
    out, i, cmd = [], 0, None
    cx = cy = sx = sy = 0.0
    ctl = None                                  # the last control point, for S and T
    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]
            i += 1
            if cmd in 'Zz':
                out.append(('Z', []))
                cx, cy, ctl = sx, sy, None
                continue
        up, rel = cmd.upper(), cmd.islower()
        v = [float(x) for x in toks[i:i + _PATH_ARGS[up]]]
        i += _PATH_ARGS[up]
        if up in 'HV':
            v = [v[0], 0.0 if rel else cy] if up == 'H' else [0.0 if rel else cx, v[0]]
        if up == 'A':
            p = v[:5] + ([cx + v[5], cy + v[6]] if rel else v[5:])
        else:
            p = [x + (cx if k % 2 == 0 else cy) if rel else x for k, x in enumerate(v)]
        if up in 'ST':
            refl = (2 * cx - ctl[1], 2 * cy - ctl[2]) if ctl and ctl[0] == ('C' if up == 'S' else 'Q') else (cx, cy)
            p = list(refl) + p
            up = 'C' if up == 'S' else 'Q'
        if up in 'HV':
            up = 'L'
        out.append((up, p))
        cx, cy = p[-2], p[-1]
        ctl = (up, p[-4], p[-3]) if up in 'CQ' else None
        if up == 'M':
            sx, sy = cx, cy
            cmd = 'l' if rel else 'L'
    return out


def _straight(pts, eps):
    """The points of a straight run worth keeping (a Douglas-Peucker pass
    that also drops repeats)."""
    q = [pts[0]]
    for p in pts[1:]:
        if abs(p[0] - q[-1][0]) > 1e-9 or abs(p[1] - q[-1][1]) > 1e-9:
            q.append(p)
    if len(q) < 3:
        return q

    def keep(a, b):
        (ax, ay), (bx, by) = q[a], q[b]
        dx, dy = bx - ax, by - ay
        ln2 = dx * dx + dy * dy
        best, idx = -1.0, None
        for k in range(a + 1, b):
            px, py = q[k]
            t = ((px - ax) * dx + (py - ay) * dy) / ln2 if ln2 > 1e-18 else 0.0
            t = max(0.0, min(1.0, t))
            dd = math.hypot(px - ax - dx * t, py - ay - dy * t)
            if dd > best:
                best, idx = dd, k
        if idx is None or best <= eps:
            return [a, b]
        return keep(a, idx)[:-1] + keep(idx, b)
    return [q[k] for k in keep(0, len(q) - 1)]


def _num(x):
    s = '%.1f' % x
    s = s[:-2] if s.endswith('.0') else s
    if s == '-0':
        return '0'
    if s.startswith('0.'):
        return s[1:]
    return '-' + s[2:] if s.startswith('-0.') else s


def _numbers(nums):
    out, prev = [], ''
    for s in nums:
        if prev and not (s[0] == '-' or (s[0] == '.' and '.' in prev)):
            out.append(' ')
        out.append(s)
        prev = s
    return ''.join(out)


def compact_d(d, eps=0.03):
    """The same path in fewer bytes (see above)."""
    segs, cx, cy, sx, sy = [], 0.0, 0.0, 0.0, 0.0
    src = [(c, v[:5] + [round(x * 10) / 10.0 for x in v[5:]]) if c == 'A' else (c, [round(x * 10) / 10.0 for x in v])
           for c, v in path_segments(d)]
    i = 0
    while i < len(src):                         # drop points that lie on a straight run
        c, v = src[i]
        if c == 'L':
            j = i
            while j < len(src) and src[j][0] == 'L':
                j += 1
            run = [tuple(s[1]) for s in src[i:j]]
            segs += [('L', list(p)) for p in _straight([(cx, cy)] + run, eps)[1:]]
            cx, cy = run[-1]
            i = j
            continue
        segs.append((c, v))
        if c == 'M':
            cx, cy = sx, sy = v
        elif c == 'Z':
            cx, cy = sx, sy
        else:
            cx, cy = v[-2], v[-1]
        i += 1
    out, last, lastnum = [], None, ''
    cx = cy = sx = sy = 0.0
    for c, v in segs:
        if c == 'Z':
            out.append('z')
            last, lastnum, cx, cy = 'z', '', sx, sy
            continue
        head, tail = (v[:5], v[5:]) if c == 'A' else ([], v)
        tail = [round(x * 10) / 10.0 for x in tail]
        head = [_num(x) for x in head[:3]] + ['%d' % x for x in head[3:]]
        ab = head + [_num(x) for x in tail]
        rl = head + [_num(x - (cx if k % 2 == 0 else cy)) for k, x in enumerate(tail)]
        letter = c
        if c == 'L' and tail[1] == cy:
            ab, rl, letter = [_num(tail[0])], [_num(tail[0] - cx)], 'H'
        elif c == 'L' and tail[0] == cx:
            ab, rl, letter = [_num(tail[1])], [_num(tail[1] - cy)], 'V'
        nums = rl if len(_numbers(rl)) < len(_numbers(ab)) else ab
        letter = letter.lower() if nums is rl else letter
        s = _numbers(nums)
        if c != 'M' and (last == letter or (last, letter) in (('M', 'L'), ('m', 'l'))):
            if not (s[0] == '-' or (s[0] == '.' and '.' in lastnum)):
                out.append(' ')
            out.append(s)
        else:
            out.append(letter + s)
        last, lastnum = letter, nums[-1]
        cx, cy = tail[-2], tail[-1]
        if c == 'M':
            sx, sy = cx, cy
    return ''.join(out)


def compact_markup(s):
    return re.sub(r' d="([^"]*)"', lambda mo: ' d="%s"' % compact_d(mo.group(1)), s)


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
    """The crown stone in its collet, riding the top of the rim: a round
    cabochon on every mark."""
    cx, cy = 48.0, 5.4
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
# The Press Room: the world at dawn
# --------------------------------------------------------------------------
# "The world overnight, set in type by morning." The Earth as it stands at
# sunrise on an equinox, seen from the family's eye a little above the
# equator, with nothing round it. Drawn from the geostationary pictures of an
# equinox (GOES-East for CIRA, 2024-09-22; Meteosat for NASA, 2010-11), where
# the sun stands square to the axis and the dawn line runs from pole to pole
# almost straight: here it runs down the Atlantic and just over Africa's
# western bulge, so Europe and Africa are in morning and the Americas still
# lie in night.
#
# The light is cut as a woodcut cuts it. The night is one field of dark sea
# with the land showing through it in olive. The day begins at a hard dawn
# line, and the first light lies past it in one warm plane, rose copper on
# the sea and apricot on the land, so the coasts break it and it reads as
# light falling on the world and not as a strap painted on a ball. That
# plane is narrow up where the hall's lamp already reaches and widens
# below, where the lamp falls away. The morning beyond it takes the lamp in
# three planes, up and to the left like every other charge. The sea is the
# green of the Daily News globe (Raymond Hood's lobby, 1930) and the land
# the bone of the morning's paper. There is no graticule, no ring and no
# band: seams on a sphere make a ball of it, and a ring makes a planet.
PRESSROOM_GLOBE = {'cx': 48.0, 'cy': 48.6, 'r': 32.6, 'lean': -23.4, 'tip': PITCH,
                   'dawn': -8.0, 'front': 0.16}
#                 night      dawn       morning: shade, body, lit
PRESSROOM_SEA = ['#132119', '#a66a52', '#46705a', '#628c6d', '#86a986']
PRESSROOM_LAND = ['#45412a', '#d68f50', '#b5a172', '#d6c594', '#efe4bf']
# The dawn's width in n . sun, [lo, hi, reach]: where the lamp already
# reaches (n . key light at `reach` and above) it is `lo` wide, and it widens
# to `hi` where the lamp falls away, so the first light tapers up the globe
# and never reads as a ribbon of one width.
PRESSROOM_DAWN = [0.08, 0.22, 0.7]
PRESSROOM_DAWN_S = [0.12, 0.34, 0.7]     # the small cut's, wide enough to see
PRESSROOM_KEY = [0.1, 0.6]               # where the morning's body and its lit plane begin (n . key light)
PRESSROOM_KEY_S = [0.2]                  # the small cut's: the morning in two planes
PRESSROOM_LIMB = '#6f8a5c'               # the night's limb, drawn so the round closes
# Natural Earth 1:50m land (public domain), the loops that face the reader,
# simplified to 0.4 degrees (a pixel on the sheet's 400px mark), with the
# stretches well round the back thinned, since they only steer the limb;
# (longitude, latitude).
PRESSROOM_COAST = [
    [(18, 59.3), (16.2, 58.6), (16.9, 58.5), (16, 56.2), (12.9, 55.4), (12.5, 56.3), (12.9, 56.6),
     (10.6, 59.8), (8.2, 58.1), (5.6, 58.6), (6.4, 59.5), (5.2, 59.2), (5.2, 59.6), (7, 60.5), (5.1, 59.6),
     (5.6, 60.7), (5, 61), (7.6, 61.2), (5.3, 61.1), (4.9, 61.9), (6.7, 61.9), (5.1, 62.2), (8.1, 62.7),
     (6.7, 62.7), (7.6, 63.1), (8.6, 62.8), (8.2, 63.2), (8.6, 63.6), (11.4, 63.8), (9.6, 63.8), (12.7, 65.2),
     (12.1, 65.4), (12.8, 66.1), (14, 66.3), (13.1, 66.2), (13.2, 66.6), (15.4, 67.2), (14.4, 67.3),
     (15.6, 67.3), (14.8, 67.8), (17.6, 68.4), (16.5, 68.5), (18.3, 69.5), (20.3, 69.9), (20.1, 69.3),
     (22.7, 70.4), (23.4, 70), (24.7, 71), (25.8, 70.9), (25, 70.1), (28.1, 71), (28.2, 70.2), (28.8, 70.9),
     (30.9, 70.4), (28.8, 70.1), (29.7, 69.7), (32, 70), (33.5, 69.4), (33.1, 69.1), (35.9, 69.2), (41, 67.7),
     (41.2, 66.8), (38.7, 66.1), (31.9, 67.2), (34.7, 66), (34.4, 65.4), (35, 64.4), (37.4, 63.8),
     (38.1, 64.1), (36.6, 64.8), (36.9, 65.2), (39.8, 64.6), (40.4, 64.8), (39.8, 65.6), (42.2, 66.5),
     (44.1, 66), (44.2, 68.3), (43.3, 68.7), (45.9, 68.5), (46.7, 67.8), (44.9, 67.4), (46.5, 66.8),
     (53.8, 69), (54.5, 69), (53.3, 68.3), (59.1, 69), (59.7, 68.4), (60.9, 69), (60.2, 69.6), (60.9, 69.8),
     (68.5, 68.3), (69.1, 69), (66.9, 69.6), (67.3, 70.7), (66.6, 71.1), (68.3, 71.7), (69.4, 73),
     (71.5, 72.9), (72.8, 72.7), (71.9, 71.5), (72.7, 71), (72.6, 69), (73.6, 68.5), (71.5, 66.7), (69, 66.8),
     (72.1, 66.3), (74.8, 67.8), (74.4, 68.4), (75.1, 68.9), (76.5, 69), (77.2, 68.5), (77.2, 67.8),
     (78.9, 67.6), (77.6, 67.8), (77.7, 68.9), (73.8, 69.2), (73.6, 69.8), (74.3, 70.6), (73.1, 71.4),
     (75, 72.1), (74.8, 72.8), (75.6, 72.6), (75.3, 71.4), (75.7, 71.3), (79, 71), (76, 71.9), (78.2, 71.9),
     (77.4, 72.2), (78.5, 72.4), (83.1, 71.7), (82.2, 70.6), (83, 70.9), (83.1, 70.1), (83.7, 70.5),
     (83.2, 71.1), (83.5, 71.7), (80.8, 72.5), (80.6, 73.6), (86.9, 73.9), (85.8, 73.4), (86.7, 73.1),
     (85.9, 73.5), (87.6, 73.8), (85.8, 74.6), (87, 75.2), (93.3, 76.1), (98.7, 76.2), (99.5, 75.8),
     (99.8, 76.1), (98.9, 76.5), (101.6, 76.4), (101, 77), (104, 77.7), (106.1, 77.4), (104.2, 77.1),
     (107.4, 76.9), (106.4, 76.5), (111.1, 76.7), (113.9, 75.9), (112.5, 75.8), (113.7, 75.5), (112.9, 75),
     (105.1, 72.8), (110.8, 73.7), (109.7, 73.7), (110.3, 74), (113, 73.9), (113.7, 72.6), (113.2, 72.8),
     (114.1, 73.6), (122.5, 72.9), (124.5, 73.8), (129.1, 73.1), (128.6, 72.9), (129.2, 72.7), (128.4, 72.5),
     (129.3, 72.1), (127.7, 72.4), (131, 70.7), (132.7, 71.9), (137.9, 71.1), (138.2, 71.6), (140, 71.5),
     (139.4, 72), (140.2, 72.2), (139.1, 72.3), (140.8, 72.9), (146.8, 72.3), (145.2, 71.7), (147.3, 72.3),
     (149.5, 72.2), (150, 71.9), (149, 71.7), (152.5, 70.8), (158.7, 70.9), (159.9, 70.5), (159.8, 69.8),
     (160.9, 69.6), (161.3, 68.9), (160.9, 68.5), (161.5, 69.4), (163.2, 69.7), (167.9, 69.7), (170.5, 68.8),
     (180, 65.1), (172.9, 61.5), (162, 58.1), (160.1, 54.2), (156, 56.7), (163.3, 62.6), (157.1, 61.7),
     (148.7, 59.3), (137.3, 53.5), (140.1, 48.4), (127.6, 39.8), (126.2, 36.8), (124.3, 40), (117.7, 38.4),
     (119.2, 34.8), (122.1, 29.9), (116.5, 22.9), (110.3, 20.3), (109.7, 20.9), (109.9, 21.5), (108.6, 21.9),
     (106.7, 21), (105.6, 19), (108.8, 15.4), (109.4, 12.6), (109, 11.3), (106.6, 10.5), (106.6, 9.9),
     (106.1, 10.2), (106.6, 9.6), (105.8, 10), (106.2, 9.4), (105.1, 8.6), (105, 10.1), (103.2, 10.9),
     (102.6, 12.2), (100.9, 12.7), (101, 13.4), (100, 13.4), (99.3, 9.3), (99.8, 9.3), (100.4, 7.2),
     (103.2, 5.3), (104.2, 1.4), (101.3, 2.9), (100.1, 6.4), (98.3, 8.2), (98.9, 11.7), (97.7, 16.6),
     (96.9, 17.4), (95.4, 15.7), (94.7, 15.9), (94.7, 16.5), (94.2, 16), (94.6, 17.6), (94, 19.3),
     (93.5, 19.4), (94, 19.4), (92.3, 20.8), (91.9, 22.4), (91.5, 22.9), (90.9, 22.6), (90.6, 23.6),
     (90.2, 21.8), (90, 22.5), (89.6, 21.8), (89.5, 22.3), (89.4, 21.7), (89.1, 22.1), (88.7, 21.6),
     (88.6, 22.1), (88.1, 21.6), (87.9, 22.4), (86.8, 20.3), (85.2, 19.8), (82.3, 16.6), (80.3, 15.7),
     (79.8, 10.3), (78.9, 9.6), (79.4, 9.2), (78.4, 9.1), (77.5, 8.1), (76.6, 8.9), (73.3, 16.5), (72.8, 22.2),
     (72.2, 22.3), (72, 21.2), (70.5, 20.8), (69, 22.3), (70.5, 23.1), (68.8, 23.1), (68.8, 23.9),
     (67.6, 23.9), (66.4, 25.6), (61.4, 25.1), (57.8, 25.7), (56.7, 27.1), (54.6, 26.5), (51.6, 27.9),
     (50.1, 30.2), (49, 30.5), (48, 30), (47.7, 29.4), (50.1, 26.7), (50.7, 24.9), (51, 26), (51.5, 25.9),
     (51.3, 24.3), (54.1, 24.2), (56.4, 26.4), (56.6, 24.5), (58.8, 23.5), (59.8, 22.3), (57.9, 20.2),
     (57.8, 19), (55.5, 17.8), (55.1, 17), (52.6, 16.5), (52.2, 15.7), (48.7, 14.1), (43.9, 12.6),
     (43.2, 13.3), (42.3, 17.4), (39.3, 21), (38.5, 23.7), (34.6, 28.1), (35, 29.6), (34.2, 27.8),
     (32.5, 29.9), (35.8, 23.9), (35.7, 22.9), (36.8, 22.1), (37.5, 18.8), (38.6, 18.1), (39.5, 15.5),
     (43.4, 12.4), (42.5, 11.5), (44.9, 10.4), (50.8, 12), (51.4, 10.4), (48, 4.5), (40.2, -2.7), (39.2, -4.7),
     (38.8, -6.1), (39.5, -7), (39.7, -10), (40.6, -10.7), (40.8, -14.8), (39.8, -16.4), (34.6, -19.7),
     (35.5, -22.3), (35.4, -24.2), (32.8, -25.6), (32.4, -28.5), (27.9, -33.1), (25.6, -34), (22.6, -34),
     (20, -34.8), (18.4, -34.2), (17.9, -32.8), (18.2, -31.7), (15, -26.3), (14.5, -22.4), (11.8, -18),
     (11.8, -15.8), (13.8, -11.1), (12.3, -6.1), (13.1, -5.9), (12.2, -5.8), (8.7, -0.6), (9.4, 0.3),
     (10, 0.2), (9.3, 0.6), (9.7, 4.1), (8.3, 4.9), (6.1, 4.3), (5.5, 5.6), (3.7, 6.6), (-2, 4.8), (-3.2, 5.4),
     (-8.3, 4.6), (-12.5, 7.4), (-13.7, 9.9), (-15.4, 11.2), (-15.1, 12), (-15.9, 11.8), (-16.8, 12.5),
     (-16.8, 13.4), (-15.4, 13.5), (-16.4, 13.4), (-17.5, 14.8), (-16.6, 15.7), (-16.1, 17.5), (-16.2, 20.2),
     (-17.1, 20.9), (-15.9, 23.8), (-12.9, 27.9), (-10.2, 29.4), (-9.2, 32.6), (-6.9, 34), (-5.9, 35.8),
     (-1.9, 35.1), (1.3, 36.5), (9.7, 37.3), (11.1, 36.9), (10.5, 36.3), (11.1, 35.2), (10.1, 34.2),
     (10.3, 33.7), (15.2, 32.4), (15.7, 31.4), (18.9, 30.3), (20, 30.8), (20.1, 32.2), (21.6, 32.9),
     (29.1, 30.8), (31.1, 31.6), (32.6, 31.1), (34.5, 31.6), (36, 34.5), (36.2, 36.8), (32.8, 36),
     (31.2, 36.8), (29.7, 36.2), (27.5, 36.7), (28.2, 37), (27.3, 37), (27.2, 38), (26.3, 38.3), (27.1, 38.5),
     (26.2, 40), (33.4, 42), (38.4, 40.9), (41.4, 41.4), (41.4, 42.7), (36.6, 45.2), (37.6, 45.4),
     (38.5, 46.1), (37.8, 46.6), (39.2, 47.3), (35.2, 46.4), (35, 45.7), (36.4, 45.1), (33.9, 44.4),
     (32.5, 45.4), (33.6, 46.1), (31.8, 46.3), (32.6, 46.6), (31.8, 47.2), (31.9, 46.6), (30.8, 46.6),
     (29.6, 45.7), (29.6, 44.8), (28.9, 45), (28.6, 43.5), (27.5, 42.5), (29, 41), (27.5, 41), (26.2, 40.1),
     (26.8, 40.6), (25.1, 41), (23.8, 40.7), (24.3, 40.1), (23.7, 40.3), (23.9, 40), (22.6, 40.5),
     (23.3, 39.2), (22.6, 38.9), (24, 38.1), (24, 37.7), (23.5, 38), (23, 37.9), (23.5, 37.4), (22.7, 37.5),
     (23.2, 36.4), (21.9, 36.7), (21.1, 37.9), (23.1, 38.2), (21.1, 38.4), (21.1, 39), (19.4, 40.3),
     (19.6, 41.8), (16, 43.5), (14.6, 45.3), (13.9, 44.8), (13.6, 45.8), (12.3, 45.4), (12.4, 44.2),
     (14.5, 42.2), (16.2, 41.9), (15.9, 41.5), (18.5, 40.2), (18.3, 39.8), (16.9, 40.5), (16.5, 39.7),
     (17.2, 39), (16.1, 37.9), (15.7, 40), (11.1, 42.4), (10.2, 43.9), (8.8, 44.4), (6.1, 43.1), (4.1, 43.6),
     (3.3, 43.2), (3.2, 41.9), (0.7, 40.8), (-0.3, 39.5), (0.2, 38.8), (-2.2, 36.7), (-4.4, 36.7), (-5.6, 36),
     (-6.9, 37.3), (-9, 37), (-8.7, 38.4), (-9.2, 38.7), (-8.8, 39.1), (-9.5, 38.8), (-8.7, 42.3),
     (-9.2, 43.2), (-7.7, 43.8), (-2, 43.3), (-1.1, 45.5), (-0.5, 45), (-2.1, 46.9), (-1.7, 47.2),
     (-4.3, 47.8), (-4.7, 48.5), (-1.4, 48.7), (-1.9, 49.7), (0.4, 49.4), (1.8, 50.9), (4.2, 51.4),
     (3.4, 51.5), (4.3, 51.5), (4, 51.9), (5.5, 53.3), (9.8, 53.6), (8.6, 54.3), (8.1, 55.6), (8.2, 56.6),
     (9.2, 56.7), (8.3, 56.8), (8.6, 57.1), (10.6, 57.7), (10.3, 56.6), (10.9, 56.4), (9.6, 55.5), (9.9, 54.5),
     (11.4, 53.9), (13, 54.4), (14.6, 53.6), (13.8, 54.1), (18.1, 54.8), (19.4, 54.4), (21.1, 55.6),
     (20.6, 55), (21.2, 54.9), (21, 56.6), (21.7, 57.6), (24.4, 57.2), (24.5, 58.4), (23.8, 58.4),
     (23.5, 59.2), (30.1, 59.9), (28.5, 60.7), (23, 59.8), (21.4, 60.6), (21.1, 62.6), (21.5, 63.2),
     (25.4, 65), (24.6, 65.9), (22.4, 65.9), (21.4, 65.3), (21.5, 64.5), (20.8, 63.9), (17.4, 62.5),
     (17.3, 60.7), (19, 59.8)],
    [(-94.3, 71.8), (-91.6, 70.2), (-92.9, 69.7), (-90.4, 69.5), (-91.2, 69.3), (-90.2, 68.3), (-89.3, 69.3),
     (-88, 68.8), (-88.3, 68), (-87.4, 67.2), (-84.9, 68.8), (-85.5, 69.8), (-82.4, 69.6), (-81.3, 68.7),
     (-82.6, 68.4), (-81.3, 67.5), (-81.5, 67.1), (-83.4, 66.4), (-85.1, 66.9), (-83.9, 66.2), (-86.7, 66.5),
     (-86, 66.1), (-87.5, 65.3), (-91.4, 66), (-87, 65.2), (-88.1, 64.2), (-90.8, 63.6), (-93.7, 64.1),
     (-90.7, 63.3), (-92.4, 62.8), (-91.9, 62.6), (-92.5, 62.2), (-93.2, 62.4), (-94.8, 60.5), (-95, 59.1),
     (-94.3, 58.3), (-93.2, 58.7), (-92.4, 57.3), (-92.8, 56.9), (-90.6, 57.2), (-85.4, 55.1), (-82.4, 55.1),
     (-81.8, 52.2), (-80.7, 51.8), (-80.9, 51.1), (-79.3, 50.8), (-79.7, 51.3), (-78.9, 51.2), (-78.4, 52.3),
     (-79.7, 54.7), (-77.8, 55.3), (-76.5, 56.5), (-76.9, 57.8), (-78.5, 58.6), (-77.3, 60), (-78.2, 60.8),
     (-77.5, 61.6), (-78.1, 62.3), (-73.7, 62.5), (-71.4, 61.2), (-69.5, 61), (-69.7, 60.1), (-70.7, 60),
     (-69.3, 59.3), (-70.2, 58.8), (-68.4, 58.7), (-69, 57.9), (-66.4, 58.8), (-66, 58.4), (-65, 59.4),
     (-65.4, 59.8), (-64.5, 60.3), (-63.4, 59.2), (-64, 59.1), (-62.9, 58.7), (-63.5, 58.3), (-62.6, 58.5),
     (-63.3, 58), (-62, 57.9), (-62.5, 57.5), (-61.3, 57), (-62.5, 56.8), (-60.3, 55.8), (-60.6, 55.1),
     (-57.4, 54.6), (-60.3, 53.3), (-57.4, 54.2), (-57.3, 53.5), (-56, 53.5), (-55.8, 52.6), (-56.3, 52.5),
     (-55.7, 52.2), (-60.1, 50.3), (-66.5, 50.2), (-69.7, 48.2), (-71, 48.5), (-69.9, 48.2), (-70, 47.7),
     (-74.3, 45.5), (-74.7, 45), (-73.6, 45.4), (-68.2, 48.6), (-65.5, 49.3), (-64.3, 48.9), (-64.3, 48.4),
     (-66.7, 48), (-64.7, 47.7), (-65.3, 47.1), (-64.5, 46.2), (-61, 45.3), (-64.3, 44.5), (-65.5, 43.5),
     (-66.1, 44.5), (-63.4, 45.4), (-64.9, 45.4), (-64.6, 45.9), (-68.1, 44.4), (-68.8, 44.6), (-70.2, 43.8),
     (-71, 42.3), (-69.9, 41.7), (-71.4, 41.8), (-74, 40.8), (-74, 41.2), (-74.1, 39.8), (-74.9, 38.9),
     (-75.5, 39.5), (-75.1, 40), (-75.5, 39.8), (-75, 38.4), (-75.9, 37.2), (-75.7, 38), (-76.3, 38.7),
     (-75.9, 39.5), (-76.6, 39.3), (-76.3, 38.1), (-77.2, 38.4), (-77, 38.9), (-77.3, 38.4), (-76.3, 37.9),
     (-77.1, 38.2), (-76.3, 37.1), (-77.3, 37.3), (-76, 36.9), (-75.5, 35.8), (-75.9, 36.7), (-75.8, 36.1),
     (-76.7, 36.2), (-75.8, 35.8), (-77, 35.5), (-76.4, 34.8), (-80.8, 32.4), (-81.4, 31.2), (-80, 26.8),
     (-80.5, 25.2), (-81.1, 25.1), (-82.7, 27.5), (-82.7, 28.9), (-84, 30.1), (-85.3, 29.7), (-85.6, 30.3),
     (-88, 30.2), (-88, 30.7), (-90.3, 30.3), (-89.4, 30), (-89.7, 29.6), (-89.2, 29), (-93.8, 30),
     (-96.6, 28.7), (-97.8, 27.5), (-97.1, 26), (-97.9, 22.6), (-95.9, 18.8), (-94.5, 18.2), (-91.5, 18.5),
     (-90.4, 21), (-87, 21.6), (-88.9, 15.9), (-85, 16), (-83.4, 15.2), (-83.9, 11.3), (-82.1, 8.9),
     (-79.1, 9.5), (-76.8, 7.9), (-76.9, 8.6), (-75.6, 9.4), (-75.2, 10.8), (-71.6, 12.4), (-71.1, 12),
     (-72, 11.6), (-71.6, 10.7), (-72.1, 9.8), (-71.6, 9), (-71.1, 9.7), (-71.5, 11), (-69.8, 11.5),
     (-70, 12.2), (-68.1, 10.5), (-66.2, 10.6), (-65.1, 10.1), (-61.9, 10.7), (-62.9, 10.5), (-62.7, 10.1),
     (-60.8, 9.4), (-61.3, 8.4), (-60.2, 8.6), (-58.8, 7.7), (-58.7, 6.4), (-58, 6.8), (-57.2, 5.5), (-57, 6),
     (-54.4, 5.9), (-54.2, 5.4), (-53.8, 5.8), (-51.2, 4.1), (-49.9, 1.2), (-52.7, -1.6), (-50.9, -0.9),
     (-50.4, -2), (-49.3, -1.7), (-49.6, -2.7), (-47.4, -0.6), (-44.7, -1.7), (-44.7, -3.2), (-43.4, -2.4),
     (-40, -2.9), (-37.2, -4.9), (-35.5, -5.2), (-34.8, -7), (-35.3, -9.2), (-38.2, -12.8), (-38.9, -12.8),
     (-39.2, -17.7), (-41, -22), (-42, -22.9), (-44.6, -23.1), (-48.7, -25.4), (-48.8, -28.6), (-52, -32.1),
     (-50.6, -30.4), (-51.3, -30), (-52.7, -33.1), (-54.2, -34.7), (-57.8, -34.5), (-58.4, -33.7),
     (-58.2, -32.5), (-58.5, -34.3), (-57.2, -35.4), (-56.7, -37), (-58.2, -38.4), (-62.3, -38.8),
     (-62.4, -40.9), (-65.1, -40.8), (-65, -42.1), (-63.8, -42.1), (-63.6, -42.7), (-65, -42.7), (-64.3, -43),
     (-65.3, -43.6), (-65.6, -45), (-67.6, -46.1), (-65.9, -47.2), (-66.2, -47.8), (-65.8, -47.9),
     (-67.5, -49), (-67.9, -50), (-69, -50), (-68.4, -50.2), (-69.5, -51.6), (-68.4, -52.3), (-70.8, -52.8),
     (-71.3, -53.9), (-72.4, -53.4), (-71.2, -52.8), (-73.1, -53.2), (-71.5, -52.6), (-72.7, -52.5),
     (-73.1, -53.1), (-73.6, -52.8), (-73.1, -52.5), (-74, -52.6), (-74.3, -52.1), (-72.5, -52.3),
     (-72.5, -51.7), (-73.2, -51.5), (-72.6, -51.8), (-73.5, -52), (-75.1, -50.7), (-74.6, -50.4),
     (-73.8, -50.9), (-73.7, -50.5), (-74, -50.8), (-74.6, -50.2), (-73.8, -49.6), (-74.6, -48),
     (-73.4, -48.1), (-74.7, -47.7), (-74.1, -47.6), (-74.3, -46.8), (-75.7, -46.8), (-74, -45.4),
     (-74.4, -46.2), (-73.7, -45.8), (-73.8, -46.6), (-73.7, -45.5), (-72.9, -45.5), (-73.4, -45.1),
     (-72.7, -44.6), (-73.3, -44.2), (-72.3, -41.5), (-73.7, -41.7), (-74, -41), (-73.2, -39.2),
     (-73.7, -37.3), (-71.5, -32.7), (-71.5, -28.9), (-70.1, -21.5), (-70.4, -18.4), (-75.9, -14.6),
     (-78.8, -8.6), (-81.1, -6.1), (-81.3, -4.7), (-79.7, -2.6), (-79.8, -2.1), (-80.3, -2.7), (-81, -2.2),
     (-80.1, 0.8), (-78.9, 1.2), (-77.1, 3.9), (-77.5, 4.2), (-77.4, 6.6), (-78.4, 8.1), (-77.8, 8.1),
     (-79.4, 9), (-80.5, 8.2), (-80, 7.5), (-80.8, 7.2), (-81.1, 7.9), (-83.6, 8.5), (-85.2, 10.2),
     (-85.1, 9.6), (-85.6, 9.9), (-85.7, 11.1), (-87.7, 12.9), (-87.5, 13.4), (-91.4, 14), (-94.4, 16.3),
     (-96.5, 15.7), (-103.4, 18.3), (-105.5, 20), (-113.8, 31.6), (-110, 22.9), (-115.7, 29.8), (-123.7, 38.9),
     (-124.7, 48.4), (-122.9, 49.4), (-127.7, 51.2), (-128.1, 51.8), (-130.3, 53.7), (-130.5, 54.7),
     (-134, 58.1), (-137, 59), (-144.1, 60), (-148.6, 60.8), (-151.4, 60.7), (-154.2, 59.2), (-158.2, 58.6),
     (-162.4, 60.3), (-164.4, 63.2), (-166.2, 65.3), (-162.4, 66.9), (-159.9, 70.3), (-159.7, 70.8),
     (-156.5, 71.4), (-155.6, 71.1), (-156, 70.8), (-143.2, 70.1), (-135.3, 68.7), (-135.9, 69.1),
     (-134.4, 69.7), (-134.2, 69.3), (-129.6, 70.2), (-133.1, 68.7), (-128.9, 69.8), (-127.7, 70.3),
     (-128, 70.6), (-125.5, 69.4), (-124.6, 70.2), (-124.3, 69.4), (-121.7, 69.8), (-115, 68.8), (-114, 68.4),
     (-115.1, 67.8), (-110.1, 68), (-107.3, 66.4), (-108, 67.8), (-105.8, 68.6), (-108.3, 68.2),
     (-108.7, 68.3), (-108.3, 68.6), (-106.2, 68.9), (-102.3, 67.7), (-98.6, 68.1), (-97.5, 67.6),
     (-98.7, 68.4), (-97.8, 68.5), (-96, 68.2), (-96.4, 67.5), (-95.4, 67), (-96.4, 67.1), (-95.8, 66.6),
     (-95.5, 68), (-93.4, 68.6), (-94.6, 68.8), (-93.4, 69.4), (-96, 69.8), (-96.5, 70.3), (-95.9, 70.7),
     (-96.5, 71.1)],
    [(-30, 83.6), (-25.8, 83.3), (-32, 83), (-21.7, 82.7), (-29.9, 82.1), (-21.3, 82.1), (-21.2, 81.6),
     (-23.1, 80.8), (-19.6, 81.6), (-11.4, 81.5), (-20.1, 80), (-19, 79.2), (-21.1, 78.7), (-21.7, 77.7),
     (-19.5, 77.7), (-20.5, 77.4), (-18.3, 76.9), (-22.6, 76.7), (-19.9, 76.1), (-19.5, 75.2), (-22.2, 75.1),
     (-20, 75), (-19.3, 74.3), (-22, 74.6), (-22.3, 74.1), (-20.4, 73.8), (-20.6, 73.5), (-25.5, 73.9),
     (-24.8, 73.5), (-27.6, 73.1), (-24.1, 73.4), (-22, 72.9), (-22.3, 72.1), (-24.6, 73), (-26.7, 72.7),
     (-24.8, 72.9), (-25.1, 72.3), (-22, 71.7), (-22.5, 71.4), (-21.8, 71.5), (-21.5, 70.5), (-23.3, 70.5),
     (-27.1, 71.6), (-25.7, 71.2), (-29.1, 70.4), (-22.3, 70), (-26.5, 68.7), (-31, 68.1), (-32.3, 68.4),
     (-32.2, 68), (-34.6, 66.4), (-37.8, 65.6), (-37.3, 66.3), (-38.2, 66.4), (-37.8, 66.3), (-38.5, 66),
     (-38.2, 65.7), (-40.2, 65.6), (-39.7, 65.3), (-41.1, 65), (-40.2, 64.5), (-41.6, 64.3), (-40.5, 63.7),
     (-42.9, 62.7), (-42.2, 62.6), (-42.1, 61.9), (-43, 60.5), (-43.9, 60.6), (-43.1, 60.1), (-43.9, 59.8),
     (-45.4, 60.2), (-44.8, 60.7), (-46, 60.6), (-45.9, 61.2), (-48.2, 60.8), (-47.8, 61), (-49.3, 61.6),
     (-48.8, 62.1), (-50.3, 62.5), (-49.8, 63), (-50.4, 62.8), (-51.5, 64), (-50.3, 64.2), (-51.7, 64.2),
     (-50.1, 64.7), (-51, 65.2), (-50.7, 64.8), (-51.9, 64.2), (-52.5, 65.3), (-51.1, 65.8), (-52.6, 65.5),
     (-53.4, 66), (-51.2, 66.9), (-53.6, 66.2), (-52.4, 66.9), (-53.8, 67.4), (-50.6, 67.5), (-53.7, 67.5),
     (-53.2, 68.2), (-51.2, 68.3), (-53, 68.6), (-50.3, 69.2), (-51.1, 69.2), (-50.3, 70), (-54.5, 70.7),
     (-50.7, 70.4), (-51.8, 71), (-51, 71), (-53, 71.2), (-51.8, 71.7), (-53.4, 71.6), (-53.7, 72.4),
     (-54, 71.5), (-55.6, 71.6), (-54.8, 72.4), (-55.6, 72.5), (-54.7, 72.9), (-55.7, 73), (-55.3, 73.3),
     (-56.2, 74.1), (-57.2, 74.1), (-56.3, 74.5), (-58.5, 75.7), (-63.3, 76.4), (-68.3, 76.1), (-69.5, 76.4),
     (-68.1, 76.7), (-71.2, 77.1), (-66.3, 77.6), (-72.8, 78.2), (-65.8, 79.2), (-64.2, 80.1), (-67, 80.4),
     (-61.4, 81.1), (-60.4, 81.9), (-56.6, 81.4), (-59.3, 82), (-54.5, 82.4), (-53.6, 81.7), (-53, 82.3),
     (-49.5, 81.9), (-50.9, 82.4), (-50, 82.5), (-44.7, 81.8), (-44.3, 82.5), (-45.6, 82.7), (-41.4, 82.8),
     (-46.2, 83.1)],
    [(49.5, -12.4), (50.4, -15.6), (49.7, -15.5), (49.4, -18.3), (47.2, -24.8), (45.1, -25.5), (44, -25),
     (43.3, -22.4), (44.4, -19.9), (44, -17.4), (44.5, -16.2), (46.4, -15.9), (48, -14.7), (47.9, -13.7),
     (48.8, -13.3), (49.2, -12.1)],
    [(-57, -63.4), (-58.8, -64.5), (-61.7, -65), (-62.3, -65.9), (-60.6, -65.9), (-61, -66.3), (-62.7, -66.2),
     (-62.6, -66.7), (-63.8, -66.3), (-63.8, -66.9), (-65.5, -67.4), (-65.6, -68.1), (-64.8, -68.1),
     (-65.5, -68.3), (-65.2, -68.6), (-62.9, -68.4), (-63.7, -68.7), (-62, -70.1), (-62.4, -70.4),
     (-61.5, -70.5), (-62, -70.9), (-61, -71.2), (-62, -71.7), (-61, -71.8), (-62.3, -72), (-60.7, -72.1),
     (-61.3, -72.6), (-60, -73), (-62, -73.1), (-60.8, -73.7), (-61.8, -74), (-61, -74.5), (-63.2, -74.7),
     (-64.3, -75.3), (-63.4, -75.5), (-70.2, -76.7), (-77.2, -76.6), (-76.2, -77.3), (-72.9, -77.7),
     (-74.8, -78.2), (-81.6, -77.8), (-77.4, -78.4), (-77.9, -78.7), (-83.8, -78), (-83.2, -78.4),
     (-83.6, -78.6), (-80.9, -79.5), (-76.2, -79.4), (-76.6, -79.9), (-79.7, -80), (-76.4, -80.1),
     (-75.1, -80.9), (-70.7, -80.6), (-62.4, -81.6), (-66.1, -82), (-60.5, -82.2), (-62.7, -82.5),
     (-61.2, -83), (-61.4, -83.4), (-50.7, -82), (-45, -82.4), (-38.8, -80.9), (-23.6, -80), (-34.2, -79.1),
     (-36.2, -78.5), (-34.1, -77.4), (-28.9, -76.4), (-18.3, -75.4), (-18.7, -75.2), (-17.4, -74.4),
     (-14.6, -73.9), (-16.2, -73.9), (-16.4, -73.4), (-11.5, -72.4), (-11, -71.8), (-12.4, -71.4),
     (-10.8, -71.6), (-10.3, -70.9), (-8.6, -71.7), (-7.7, -71.5), (-7.8, -70.8), (-5.9, -70.7), (-6.1, -71.3),
     (-1.1, -71.3), (-0.5, -71.7), (9.1, -70.2), (11.7, -70.8), (13.1, -70.1), (19, -70.2), (19.4, -70.9),
     (21.7, -70.3), (23, -70.8), (24, -70.4), (26.5, -71), (32.6, -70), (32.6, -68.9), (33.5, -68.7),
     (35.4, -69.7), (38.9, -70.2), (40.2, -68.8), (46.6, -67.3), (48.4, -68), (49.2, -67.2), (48.5, -67),
     (50.6, -67.2), (50.3, -66.4), (53.7, -65.9), (57, -66.5), (56.1, -66.6), (56.2, -67.3), (69.6, -67.8),
     (70, -68.5), (68.9, -69.4), (69.1, -69.9), (67.3, -70.3), (69.2, -70.4), (66.5, -73.1), (67.3, -73.3),
     (71.3, -71.6), (73.3, -69.8), (75.6, -69.8), (79, -68.2), (84.5, -67.1), (99.4, -66.6), (102.7, -65.9),
     (109.5, -66.9), (113.1, -65.8), (130.6, -66.2), (147.1, -68.4), (162.7, -70.3), (169.8, -72.7),
     (165.4, -74.6), (164.4, -77.9), (160.6, -80), (164.7, -82.4), (180, -84.4), (180, -90), (-180, -90),
     (-180, -84.4), (-156.5, -85.2), (-150.6, -80.4), (-149.7, -77.8), (-145.4, -76.4), (-114.6, -73.9),
     (-110.2, -74.5), (-111.4, -75.2), (-98.8, -75.3), (-102.9, -73.8), (-98.9, -73.6), (-102.9, -73.3),
     (-103.1, -72.7), (-90.9, -73.3), (-88.8, -72.7), (-88.2, -72.8), (-88.4, -73.2), (-82.2, -73.9),
     (-80.3, -73.4), (-80.4, -72.9), (-76.8, -73.5), (-77, -73.8), (-69.3, -73.2), (-66.8, -72.1),
     (-68.7, -69.4), (-67, -69.2), (-67.4, -68.9), (-66.7, -67.6), (-67.5, -67.1), (-66.5, -67.3),
     (-66.5, -66.7), (-64.5, -66), (-63.8, -65)],
    [(-3.1, 58.5), (-4.1, 57.6), (-1.8, 57.5), (-3.3, 56.4), (-2.7, 56.3), (-3.8, 56.1), (-1.7, 55.6),
     (-0.1, 54.1), (0.1, 53.6), (-0.7, 53.7), (0.3, 53.3), (0, 52.9), (1.7, 52.8), (0.4, 51.5), (1.4, 51.2),
     (-5.6, 50.1), (-2.4, 51.7), (-5.2, 51.7), (-4, 52.5), (-4.7, 52.8), (-4.3, 53.1), (-2.8, 53.3),
     (-2.8, 54.1), (-3.6, 54.6), (-3, 55), (-5, 54.8), (-4.6, 55.9), (-5.1, 56.2), (-5.7, 55.3), (-5.2, 56.8),
     (-6.1, 56.7), (-5, 58.6)],
    [(-86.6, 71), (-84.8, 71), (-84.7, 71.6), (-85.9, 72), (-84.3, 72), (-85.7, 72.7), (-84.3, 72.8),
     (-85.5, 73.1), (-81.6, 73.7), (-80.3, 72.8), (-81.2, 72.3), (-80.6, 72.5), (-80.9, 71.9), (-79.8, 72.4),
     (-78.6, 71.9), (-78.7, 72.4), (-77.5, 72.2), (-78.4, 72.6), (-76.9, 72.7), (-75.1, 72.4), (-75.9, 71.7),
     (-74.3, 72), (-75.2, 71.7), (-74.7, 71.7), (-75, 71.2), (-73.9, 71.8), (-74.2, 71.4), (-73.2, 71.3),
     (-71.6, 71.5), (-71.2, 71.2), (-72.6, 70.8), (-70.7, 71.1), (-71.9, 70.4), (-71.4, 70.1), (-69.2, 70.8),
     (-68.4, 70.5), (-70.1, 70), (-68.1, 70.3), (-67.2, 69.8), (-69.3, 69.5), (-66.7, 69.3), (-69.3, 68.9),
     (-66.2, 68.3), (-66.4, 67.8), (-64.9, 68), (-63.9, 67.6), (-64.7, 67.4), (-63, 67.2), (-63.7, 66.8),
     (-61.3, 66.6), (-62.6, 66.4), (-62, 66), (-62.7, 65.6), (-63.5, 65.9), (-63.6, 64.9), (-65.4, 65.8),
     (-64.4, 66.3), (-68.7, 66.2), (-64.4, 63.7), (-64.7, 63.2), (-65.2, 63.8), (-64.7, 62.9), (-65.1, 62.6),
     (-68.9, 63.7), (-66, 62.2), (-66.3, 61.9), (-71.5, 63.1), (-72, 63.4), (-71.4, 63.6), (-73.3, 64.6),
     (-78, 64.5), (-77.3, 65.5), (-75.5, 64.8), (-75.8, 65.3), (-73.6, 65.5), (-74.4, 66.2), (-72.2, 67.3),
     (-74.7, 69), (-76.6, 68.7), (-75.6, 69.2), (-76.2, 69.7), (-79.1, 70.6), (-78.8, 70), (-81.6, 70.1),
     (-80.9, 69.7), (-88.8, 70.5), (-89.5, 71.1), (-87.1, 71), (-89.8, 71.5), (-89.2, 73.1), (-85, 73.8),
     (-86.7, 72.8), (-85, 71.4)],
    [(-7.2, 55.1), (-6.1, 55.2), (-5.5, 54.5), (-6.3, 54), (-6.3, 52.2), (-9.3, 51.5), (-10.3, 51.8),
     (-8.8, 52.7), (-9.9, 52.6), (-8.9, 53.2), (-10.1, 53.4), (-9.6, 53.8), (-10.1, 54.3), (-8.5, 54.2),
     (-8.3, 55.1)],
    [(-15.5, 66.2), (-14.6, 66.4), (-15.1, 66.1), (-13.6, 65), (-18.7, 63.4), (-22.7, 63.8), (-21.6, 64.6),
     (-24, 64.9), (-21.8, 65.4), (-24.5, 65.5), (-23.3, 65.8), (-23.8, 65.8), (-23.5, 66.2), (-22.4, 65.9),
     (-22.9, 66.4), (-21.4, 66), (-21.1, 65.3), (-20.2, 66.1), (-18.1, 65.7), (-18.3, 66.2)],
    [(-55.5, 51.5), (-56.8, 49.6), (-56.2, 50.1), (-55.5, 50), (-56.1, 49.6), (-55.2, 49.5), (-55.4, 49.1),
     (-53.6, 49.3), (-54.1, 48.4), (-53, 48.6), (-53.9, 48), (-52.9, 48.1), (-53.1, 46.7), (-54.2, 46.9),
     (-54.2, 47.9), (-55.8, 46.9), (-54.8, 47.7), (-59.3, 47.6), (-58.3, 48.5), (-59.2, 48.6), (-58, 49),
     (-57, 51)],
    [(-69.5, 83), (-61.3, 82.3), (-68.7, 81.3), (-64.8, 81.4), (-70.7, 80.5), (-70.3, 80.2), (-72.1, 80.1),
     (-70.6, 80.1), (-71.4, 79.8), (-76.9, 79.5), (-74.5, 79.1), (-78.6, 79.1), (-74.4, 78.7), (-76.4, 78.5),
     (-75.2, 78.3), (-78, 77.9), (-78.5, 77.4), (-81.7, 77.5), (-78, 76.9), (-80.7, 76.2), (-82.5, 76.7),
     (-85.1, 76.3), (-89.5, 76.8), (-86.8, 77.2), (-87.8, 77.8), (-84.7, 77.4), (-82.7, 77.9), (-84.9, 77.5),
     (-85.5, 77.9), (-84.2, 78.2), (-84.8, 78.5), (-87.6, 78.2), (-86.8, 78.8), (-81.8, 79), (-84.4, 79),
     (-83.6, 79.1), (-86.5, 80.3), (-80.5, 79.6), (-83, 80.3), (-76.9, 80.9), (-78.7, 81), (-76.9, 81.4),
     (-85.1, 80.5), (-86.4, 80.7), (-83.3, 81.1), (-87.7, 80.7), (-89.2, 80.9), (-84.9, 81.3), (-89.6, 81),
     (-87.6, 81.5), (-91.7, 81.6), (-85, 82), (-86.6, 82.2), (-84.9, 82.4), (-79.4, 81.9), (-82.4, 82.4),
     (-78.7, 82.7), (-79.9, 82.9), (-76, 82.5), (-77.1, 83)],
    [(-49.6, -0.2), (-48.4, -0.3), (-48.8, -1.4), (-50.5, -1.8), (-50.6, -0.3)],
    [(-72, 19.7), (-70, 19.7), (-68.4, 18.5), (-71, 18.3), (-71.4, 17.6), (-72.1, 18.2), (-73.9, 18),
     (-74.4, 18.6), (-72.3, 18.6), (-73.4, 19.8)],
    [(9.6, 40.9), (9.6, 39.2), (8.6, 38.9), (8.2, 40.9)],
    [(80, 9.8), (81.9, 7.3), (80.7, 6), (79.9, 6.8), (79.7, 8.2), (80.4, 9.5)],
    [(-81.8, 23.2), (-79.8, 22.9), (-74.2, 20.2), (-77.7, 19.9), (-77.2, 20.6), (-78.7, 21.6), (-81.8, 22.2),
     (-81.8, 22.7), (-84.8, 21.8), (-84, 22.7)],
    [(67.8, 76.2), (61.4, 75.3), (56.6, 73.3), (53.8, 73.8), (56.1, 74.5), (55.6, 74.6), (56.5, 75),
     (55.9, 75.2), (61.2, 76.3), (67.7, 77), (68.9, 76.7)],
    [(16.8, 79.9), (21.4, 78.7), (19.1, 78.4), (16.7, 76.6), (14, 77.5), (16.9, 77.9), (13.7, 78),
     (16.8, 78.7), (13.2, 78.2), (10.7, 79.8), (13.7, 79.9), (12.6, 79.6), (14, 79.3), (14.6, 79.8),
     (16.3, 79), (15.8, 79.7)],
    [(55.3, 73.3), (56.4, 73.2), (55.3, 71.9), (57.6, 70.7), (53.7, 70.8), (54.2, 71.1), (53.4, 71.5),
     (51.4, 71.8), (53.3, 73.2)],
    [(-94.3, 76.9), (-89.3, 76.3), (-91.4, 76.2), (-88.9, 75.5), (-82.2, 75.8), (-79.7, 75.5), (-80.4, 75),
     (-79.4, 74.9), (-91.5, 74.7), (-93.1, 76.4), (-96.9, 76.7)],
    [(-84.9, 65.3), (-80.3, 63.8), (-81, 63.5), (-83.3, 64.1), (-85.4, 63.1), (-85.8, 63.7), (-87.2, 63.6),
     (-86.3, 64.1), (-85.8, 65.8)],
    [(-91.9, 81.1), (-85, 79.3), (-88, 79), (-88.8, 78.2), (-92.7, 78.4), (-91.9, 78.5), (-94.2, 79),
     (-91.3, 79.4), (-95.1, 79.3), (-95.7, 79.5), (-94.4, 79.7), (-96.8, 80.1), (-94.3, 80.2), (-96.4, 80.3),
     (-93.9, 80.6), (-95.5, 80.8), (-93.3, 81.1), (-94.2, 81.3)],
    [(20.9, 80.2), (27.2, 79.9), (22.9, 79.2), (18.3, 79.9), (18.9, 80), (17.9, 80.1), (19.6, 80.5)],
    [(-61.1, 45.9), (-59.8, 46), (-61.5, 45.7), (-60.5, 47)],
]
# The small cut fills the Mediterranean and the Black Sea, so Europe and
# Africa join as one land and no sliver of sea turns to two light dashes
PRESSROOM_SMALL_SEAS = [
    [(-7, 35.2), (-2, 34.4), (10, 32.6), (20, 29.6), (33, 30.4), (36.5, 35), (42, 40.5), (41.8, 47.6),
     (33, 47.4), (27, 45.6), (19, 44), (12, 46.4), (4, 44.4), (-2, 38.8), (-8, 38.2)],
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


def subject_pressroom(m, h, small=False):
    """The world at dawn, and nothing else. The night is one field with the
    land showing through it; the day begins at a hard dawn line, where the
    first light lies in one narrow warm plane across sea and land alike, and
    the morning beyond it takes the hall's key light in three planes. Sea
    and land each take their own colour through every plane. The small cut
    keeps the night, a wider dawn, the morning in two planes and one land
    (the Mediterranean filled, so Europe and Africa hold together)."""
    g = PRESSROOM_GLOBE
    fr = pressroom_frame()
    cx, cy, R, sun = g['cx'], g['cy'], g['r'], fr['sun']

    def normal(x, y):
        X, Y = (x - cx) / R, -(y - cy) / R
        q = X * X + Y * Y
        if q >= 0.998:
            k = math.sqrt(0.998 / q)
            X, Y, q = X * k, Y * k, 0.998
        return (X, Y, math.sqrt(1 - q))

    def light(x, y):                 # where the sun stands: night or day
        return S.dot(normal(x, y), sun)

    def key(x, y):                   # the hall's lamp on the globe's roundness
        return S.dot(normal(x, y), S.KEY)

    disc = circle_d(cx, cy, R)
    box = (cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1)
    step = 0.5 if small else 0.3
    sea, land = PRESSROOM_SEA, PRESSROOM_LAND
    dawn = PRESSROOM_DAWN_S if small else PRESSROOM_DAWN
    # each plane from the night up, as the region it covers (f < 0 inside):
    # the day from the dawn line, the morning past the dawn's width, and
    # the morning's body and lit plane where the lamp reaches
    lo, hi, reach = dawn

    def morning(x, y):               # past the dawn: narrow where the lamp reaches, wide below
        return lo + (hi - lo) * min(1.0, max(0.0, (reach - key(x, y)) / (reach + 0.5))) - light(x, y)
    fns = [lambda x, y: -light(x, y), morning]
    fns += [lambda x, y, t=t: max(morning(x, y), t - key(x, y))
            for t in (PRESSROOM_KEY_S if small else PRESSROOM_KEY)]
    if small:
        sea, land = sea[:len(fns) + 1], land[:len(fns) + 1]
    regions = [S.region_d(fn, box, step, 0.12) for fn in fns]

    def cut(name, tones):
        body = ''.join('<path d="%s" fill="%s" fill-rule="evenodd"/>' % (d, col)
                       for d, col in zip(regions, tones[1:]) if d)
        return '<path d="%s" fill="%s"/><g clip-path="%s">%s</g>' % (
            disc, tones[0], m.clip(name, '<path d="%s"/>' % disc), body)
    m.add(shadow(disc, 1.4, 2.0, 0.5))
    m.add(cut('sea', sea))
    # the land
    eps = 0.45 if small else 0.1
    loops = []
    for coast in PRESSROOM_COAST + (PRESSROOM_SMALL_SEAS if small else []):
        face = pressroom_face(coast, fr)
        if face and abs(S.area(face)) > (4.0 if small else 0.3):
            if S.area(face) < 0:
                face = face[::-1]            # one winding, so the filled seas join the land
            loops.append(S.pts_d(S.rdp(face, eps)))
    lclip = m.clip('land', '<path d="%s"/>' % ' '.join(loops))
    m.add('<g clip-path="%s">%s</g>' % (lclip, cut('landp', land)))
    if not small:
        lakes = [pressroom_face(lake, fr) for lake in PRESSROOM_LAKES]
        lake_d = ' '.join(S.pts_d(lk) for lk in lakes if lk)
        if lake_d:
            m.add('<g clip-path="%s">%s</g>' % (m.clip('lake', '<path d="%s"/>' % lake_d), cut('lakep', sea)))
    # the night's limb, a line of the page's olive round the dark half, so
    # the globe reads as a whole round against the enamel at every size
    night = S.region_d(lambda x, y: light(x, y), box, step, 0.1)
    lw = 1.8 if small else 0.7
    m.add('<g clip-path="%s"><g clip-path="%s"><circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" '
          'stroke-width="%s"/></g></g>' % (m.clip('disc', '<path d="%s"/>' % disc), m.clip('nlimb', '<path d="%s"/>' % night),
                                            f(cx), f(cy), f(R), PRESSROOM_LIMB, f(2 * lw)))


# --------------------------------------------------------------------------
# Ground Station: the earth station's antenna, turned up to the sky it listens to
# --------------------------------------------------------------------------
# Drawn from photographs of Goonhilly's GHY-3 and of the OTC antenna at
# Carnarvon: a broad, shallow reflector of white-painted panels, twice as
# wide as its tower is tall, ringed at its edge by the dark lattice of its
# rim truss and backed by a dark truss down to the hub; its subreflector is
# held out at the focus on three legs, as at Carnarvon. The reflector turns
# about an elevation axle at the front of a long box beam that carries the
# drive, and under the beam's tail hangs the counterweight. The beam rides an
# azimuth turret on a railed gallery at the head of a squat concrete cone
# that flares to the ground. World units are mark units: y up, the tower's
# axis at x = 0, the reader toward +z. Every tone set runs dark, shade, body,
# lit.
DISH = {
    'x': 40.5, 'base': 83.0, 'scale': 1.0,   # where the tower's axis meets the ground, on the mark; size
    'R': 29.0, 'FD': 0.52,                   # reflector radius; focal length over diameter
    'el': 40.0, 'head': 22.0,                # elevation; heading, degrees from +x toward the reader
    'truss': 6.0, 'hub': 5.0,                # the backing truss's depth behind the vertex; hub radius
    'rim_truss': 6.5,                        # the depth of the lattice ring behind the rim
    'tower': [(0.0, 1.4, 15.5, 15.5), (1.4, 14.5, 14.2, 7.6)],   # the concrete cone: y0, y1, r0, r1
    'gallery': (14.5, 16.0, 10.4),           # the railed platform: y0, y1, radius
    'turret': (16.0, 20.4, 6.6),             # the azimuth turret: y0, y1, radius
    'beam': (-17.5, 6.5, 5.0, 7.2),          # the head beam: from, to along the heading; half width; height
    'counter': (-17.5, -10.5, 4.6, 9.5),     # the counterweight under its tail: from, to; half width; drop
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
    length about half its diameter, as shallow as the earth stations' are)
    turned up and to the right and seen three quarters on. The key light rakes across its white panels: the wall on the
    lamp's side turns its face away and falls into pale grey shade, and the
    far wall faces the lamp and takes the light. Those planes are what tell a
    bowl from a plate. Its edge is ringed by the dark lattice of the rim
    truss, behind it the backing truss is a dark faceted cone down to the
    hub, and three legs hold the subreflector at the focus. The hub turns at
    the front of the head beam, under whose tail hangs the counterweight. The
    beam rides the azimuth turret on a railed gallery at the head of a squat
    concrete cone. Nothing in the sky and nothing
    lit: the antenna is listening. The small cut is the same geometry with
    coarser planes, heavier legs, a larger subreflector, the rim truss as a
    plain dark band and no handrail."""
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
    nt = 10 if small else 20                                   # the cone's cast facets
    turn = math.pi / nt                                       # a flat of it to the reader
    for y0, y1, r0, r1 in d['tower']:
        polys, c = groundstation_frustum((0, 0, 0), X, Y, Z, y0, y1, r0, r1, nt, turn)
        groundstation_solid(fc, vw, polys, c, concrete, cuts)
    g0, g1, gr = d['gallery']
    polys, c = groundstation_frustum((0, 0, 0), X, Y, Z, g0, g1, gr, gr, nt, turn)
    groundstation_solid(fc, vw, polys, c, d['gallery_tones'], cuts)
    polys, c = groundstation_frustum((0, 0, 0), X, Y, Z, t0, t1, tr, tr * 0.94, 8 if small else 16, turn)
    groundstation_solid(fc, vw, polys, c, paint, cuts, lift=-0.1)
    bo = S.add(S.mul(hdir, (b0 + b1) / 2), (0.0, t1 + bh / 2, 0.0))
    polys, c = groundstation_box(bo, hdir, up, axle, (b1 - b0) / 2, bh / 2, bw)
    groundstation_solid(fc, vw, polys, c, paint, cuts, lift=-0.14, sky=0.3)
    c0, c1, cw, cd = d['counter']
    co = S.add(S.mul(hdir, (c0 + c1) / 2), (0.0, t1 + 0.4 - cd / 2, 0.0))
    polys, c = groundstation_box(co, hdir, up, axle, (c1 - c0) / 2, cd / 2, cw)
    groundstation_solid(fc, vw, polys, c, d['gallery_tones'], cuts, lift=0.04)

    # -- the hub and the backing truss behind the reflector --------------------
    U, W = axle, ua
    polys, c = groundstation_frustum(V, U, a, W, -d['truss'] - 3.2, -d['truss'], d['hub'] * 0.86, d['hub'] * 0.86, 20)
    groundstation_solid(fc, vw, polys, c, steel, cuts)
    n_back = 48                                               # the rim stays round in both cuts
    polys, c = groundstation_frustum(V, U, a, W, -d['truss'], zr - 0.4, d['hub'], R - 0.2, n_back, caps=False)
    groundstation_solid(fc, vw, polys, S.add(V, S.mul(a, zr + 6.0)), steel, cuts, lift=0.06)
    # the rim truss: a ring of dark lattice round the reflector's edge,
    # sloping in behind it, and the thin white-painted lip of the rim
    rt = d['rim_truss']
    ring, _ = groundstation_frustum(V, U, a, W, zr - rt, zr - 0.35, R * 0.9, R + 0.15, n_back, caps=False)
    groundstation_solid(fc, vw, ring, S.add(V, S.mul(a, zr + 6.0)), steel, cuts, lift=-0.04)
    polys, c = groundstation_frustum(V, U, a, W, zr - 0.35, zr, R + 0.15, R, n_back, caps=False)
    groundstation_solid(fc, vw, polys, S.add(V, S.mul(a, zr - 0.2)), paint, cuts)

    # the charge's shadow on the enamel, cast down and to the right
    base = [vw.proj(p)[:2] for y0, y1, r0, r1 in d['tower'] for p in groundstation_ring((0, 0, 0), X, Y, Z, y0, r0, nt, turn)]
    base += [vw.proj(p)[:2] for p in groundstation_ring((0, 0, 0), X, Y, Z, t1, tr, nt, turn)]
    m.add(shadow(poly_d(groundstation_hull(base)), 1.3, 1.1, 0.42))
    head = [vw.proj(S.add(S.mul(hdir, sx), S.add((0.0, t1 + sy, 0.0), S.mul(axle, sz))))[:2]
            for sx in (b0, b1) for sy in (0.0, bh) for sz in (-bw, bw)]
    m.add(shadow(poly_d(groundstation_hull(head)), 1.2, 1.4, 0.4))
    rimv = [vw.proj(p) for p in groundstation_ring(V, U, a, W, zr, R, 96)]
    hub = [vw.proj(p)[:2] for p in groundstation_ring(V, U, a, W, -d['truss'], d['hub'], 24)]
    m.add(shadow(poly_d(groundstation_hull([p[:2] for p in rimv] + hub)), 1.6, 2.0, 0.45))
    m.add(fc.svg(seam=0.12))
    if not small:
        # the lattice of the rim truss: its diagonals, pale steel on the dark
        # ring wherever the ring turns to the reader
        struts = []
        for kk in range(n_back):
            t0_, t1_ = 2 * math.pi * kk / n_back, 2 * math.pi * (kk + 1) / n_back
            f0 = S.add(V, S.add(S.mul(a, zr - 0.35), S.add(S.mul(U, (R + 0.15) * math.cos(t0_)),
                                                           S.mul(W, (R + 0.15) * math.sin(t0_)))))
            b1_ = S.add(V, S.add(S.mul(a, zr - rt), S.add(S.mul(U, R * 0.9 * math.cos(t1_)),
                                                         S.mul(W, R * 0.9 * math.sin(t1_)))))
            b0_ = S.add(V, S.add(S.mul(a, zr - rt), S.add(S.mul(U, R * 0.9 * math.cos(t0_)),
                                                         S.mul(W, R * 0.9 * math.sin(t0_)))))
            n_ = groundstation_normal([f0, b0_, b1_])
            if S.dot(n_, S.add(groundstation_mean([f0, b0_, b1_]), S.mul(S.add(V, S.mul(a, zr + 6.0)), -1))) < 0:
                n_ = S.mul(n_, -1)
            if vw.nrm(n_)[2] <= 0.02:
                continue
            p0, p1 = vw.proj(f0), vw.proj(b1_ if kk % 2 == 0 else b0_)
            if kk % 2:
                p0 = vw.proj(S.add(V, S.add(S.mul(a, zr - 0.35), S.add(S.mul(U, (R + 0.15) * math.cos(t1_)),
                                                                     S.mul(W, (R + 0.15) * math.sin(t1_))))))
            struts.append((p0[0], p0[1], p1[0], p1[1]))
        if struts:
            m.add('<path d="%s" stroke="%s" stroke-width=".38" stroke-opacity=".85"/>' % (lines_path(struts), steel[3]))

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

    # -- the tripod and the subreflector -----------------------------------------
    apex = S.add(V, S.mul(a, 0.86 * F))
    ap = vw.proj(apex)[:2]
    for deg in (90, 210, 330):
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
        rail = groundstation_ring((0, 0, 0), X, Y, Z, g1 + 1.3, gr - 0.3, nt, turn)
        segs = []
        for k in range(nt):
            p0, p1 = rail[k], rail[(k + 1) % nt]
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
AUTOPILOT_PLACE = (19.0, 71.2)  # where the row's front left foot stands, in the mark
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
    # the headcap: the leather turned over the headband and set, a rolled
    # bead standing a little proud of the back and rising in a shallow arch
    # over the round, above the boards at the head: its upper half turns to
    # the lamp, its lower half to the reader
    bs = [-B + 2 * B * k / 10 for k in range(11)]
    rise = 0.0 if small else 0.55

    def cap_y(b):
        return H + rise * math.cos(b / B * math.pi / 2)
    if not small:
        roll = [(arc(b, H - 0.7, 0.05), arc(b, cap_y(b) - 0.35, 0.28), arc(b, cap_y(b), 0.1)) for b in bs]
        lower = [P(a) for a, _, _ in roll] + [P(m_) for _, m_, _ in roll[::-1]]
        face(lower, tone((0, 0.2, 1)))
        upper = [P(m_) for _, m_, _ in roll] + [P(c) for _, _, c in roll[::-1]]
        face(upper, tone((0, 0.85, 0.5)))
    cap = [arc(b, cap_y(b), 0.1 if not small else 0.0) for b in bs]
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
# Outreach Desk: the day's introduction, held up in the hand
# --------------------------------------------------------------------------
# The desk briefs each introduction overnight and never sends one: the owner
# opens the profile and delivers every note himself. The charge is that act
# drawn as a heraldic cubit arm erect, the hand holding up one calling card
# to be seen: the palm toward the reader, the four fingers standing behind
# the card with their tips over its top edge, and the thumb opposed across
# its foot, pinching it, its nail to the reader. The arm is vested or and
# cuffed argent, as a crest's arm is (a gold sleeve on the Prussian enamel,
# metal on colour, and the page's own gold), and couped square.
#
# The pose is traced from a photograph of a man holding up a blank card
# (Pexels 326576): the card as wide as the four fingers, the middle finger
# standing highest, the little finger's tip no higher than the others'
# last joints. The anatomy is read off "A Hand.jpg" (Wikimedia Commons), a
# right palm with the thumb opposed across it: each finger's palmar side is
# a run of pads split at its creases, the thenar is the big round mass
# under the thumb and the hypothenar a long flatter one down the other
# edge, and they close in to the wrist. Where the card hides the middle of
# the hand the drawing takes the license heraldry takes: the palm is
# foreshortened, as if tipped back a little behind the card.
#
# Each finger, the palm with its wrist, and the thumb are each one traced
# outline, inflated the way Bourse's canary is (the Poisson equation), so
# each is one continuous skin. On that skin the pads, the thenar and the
# hypothenar swell (outreach_swell) and the creases run in as shallow
# grooves, so a finger turns from the lamp pad by pad and is never one long
# tube, and the thumb rises out of the thenar it grows from. The planes are
# cut from that surface along the key light. Units are millimetres of a
# real hand, y down, the card's centre at the origin; OUTREACH_PLACE lays
# them on the badge.
OUTREACH_PLACE = {'s': 0.42, 'lean': -5.0, 'at': (3.0, 9.0), 'cx': 48.0, 'cy': 48.0}
OUTREACH_CARD = {'w': 89.0, 'h': 52.0, 'turn': -6.0, 'fold': 9.0, 'bevel': 1.5}
# Each finger's palmar side: its tip, its lean (degrees; the tip toward the
# thumb for a positive lean), the distance from the tip to its last and its
# middle crease and on to where the card hides it, and its width over the
# tip pad, the middle pad and the base.
OUTREACH_FINGERS = [
    ('little', (-25.4, -45.0), 5.0, (18.5, 38.0, 55.0), (13.0, 14.2, 15.4)),
    ('ring', (-9.6, -61.5), 2.0, (22.5, 47.0, 68.0), (14.8, 16.0, 17.2)),
    ('middle', (6.4, -66.0), 0.0, (24.0, 50.0, 72.0), (15.6, 16.8, 18.0)),
    ('index', (22.2, -57.0), -4.0, (22.0, 45.0, 63.0), (15.2, 16.4, 17.6)),
]
# The palm below the card, closing in to the wrist, traced off "A Hand.jpg"
# and scaled to the card; it runs on under the card and under the cuff.
OUTREACH_PALM_LINE = [(-34.0, 10.0), (-18.0, 8.0), (0.0, 8.0), (16.0, 9.0), (27.0, 13.0), (35.5, 23.0), (41.0, 34.0),
                      (42.5, 43.0), (40.0, 50.0), (34.5, 55.5), (28.5, 59.5), (27.5, 64.0), (27.0, 68.5), (1.0, 70.0), (-25.0, 68.5),
                      (-25.5, 64.0), (-26.5, 59.0), (-29.5, 49.0), (-32.5, 36.0), (-34.2, 22.0)]
# Its swelling, the thenar or ball of the thumb, along the thumb's
# metacarpal: centre, long axis, half length, half width, rise (mm). The
# hypothenar needs none; the palm's own edge turns it.
OUTREACH_PALM_SWELL = [
    ((25.0, 38.0), (0.45, 0.89), 20.0, 14.5, 7.0),        # the thenar, the ball of the thumb
]
# Its crease, a run of points with its depth and width (mm): the thenar
# crease, curving round the ball of the thumb toward the wrist.
OUTREACH_PALM_CREASE = [([(12.5, 27.0), (10.0, 37.0), (8.8, 47.0), (6.5, 56.0)], 1.3, 1.7)]
# The thumb, opposed across the card, from its base in the thenar through
# its last joint to its tip, and its widths there; it stands forward of the
# palm by OUTREACH_THUMB_LIFT at the joint and beyond.
OUTREACH_THUMB = {'base': (30.0, 43.0), 'joint': (22.5, 12.0), 'tip': (14.5, -7.5),
                  'w': (20.5, 15.8, 16.8), 'lift': 11.0}
# The arm is vested and cuffed as a heraldic arm is: a sleeve of gold
# cloth, couped square, and at the wrist a white cuff turned back over it,
# broader than the sleeve and flaring to its rolled edge. (top, foot, half width at the top,
# half width at the foot) about the arm's axis at x = 1.
OUTREACH_CUFF = (58.0, 71.0, 34.0, 32.0)
OUTREACH_SLEEVE = (68.0, 93.0, 29.0, 31.0)
# Colour as the eye keeps a hand: the fingertips rosier than the palm, the
# back of the thumb a little browner; four planes each (dark, shade, body,
# lit), cut at OUTREACH_CUTS.
OUTREACH_FINGER = ['#65312b', '#a95c4a', '#db9b82', '#f4d1bb']
OUTREACH_PALM = ['#6a3a30', '#b06b53', '#e0a689', '#f6dac4']
OUTREACH_BACK = ['#5f2f27', '#a15743', '#d49379', '#f0c8b0']
OUTREACH_CUTS = [0.22, 0.4, 0.7]
OUTREACH_NAIL = ['#c48e80', '#eccdc1', '#fbefe6']          # its plate, where it takes the light, its free edge
OUTREACH_LINEN = ['#8e99a1', '#c3c9cb', '#e9e6de', '#fbfaf5']
OUTREACH_SLEEVE_CLOTH = ['#3f2c0c', '#7f5d1e', '#b38c3c', '#dcbf73']   # vested or: the page's gold, as cloth
OUTREACH_STOCK = ['#f4f1ea', '#d9d0bb', '#b9ae95']           # the card: its face, its turned corner, its shade
OUTREACH_FACE = 0.32                                         # how flat a form's face is: 0.5 is round
_OUTREACH = {}
OUTREACH_OFF = -1e9                                          # no skin here


def outreach_at(p):
    """A point of the hand (mm) on the badge."""
    P = OUTREACH_PLACE
    a = math.radians(P['lean'])
    x, y = (p[0] - P['at'][0]) * P['s'], (p[1] - P['at'][1]) * P['s']
    return (P['cx'] + x * math.cos(a) - y * math.sin(a), P['cy'] + x * math.sin(a) + y * math.cos(a))


def outreach_from(x, y):
    P = OUTREACH_PLACE
    a = math.radians(P['lean'])
    dx, dy = x - P['cx'], y - P['cy']
    return (P['at'][0] + (dx * math.cos(a) + dy * math.sin(a)) / P['s'],
            P['at'][1] + (-dx * math.sin(a) + dy * math.cos(a)) / P['s'])


def outreach_limb(stations, tip=True):
    """A limb's outline through its axis points: `stations` run from the tip
    (point, width) toward the base, and the tip is closed by a round arch
    as long as the first width is wide."""
    pts = [p for p, _ in stations]
    n = len(pts)
    left, right = [], []
    for k, (p, w) in enumerate(stations):
        a, b = pts[max(k - 1, 0)], pts[min(k + 1, n - 1)]
        ln = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
        u = ((b[0] - a[0]) / ln, (b[1] - a[1]) / ln)         # toward the base
        v = (-u[1], u[0])
        left.append((p[0] + v[0] * w / 2, p[1] + v[1] * w / 2))
        right.append((p[0] - v[0] * w / 2, p[1] - v[1] * w / 2))
    (p0, w0), (p1, _) = stations[0], stations[1]
    ln = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    u = ((p1[0] - p0[0]) / ln, (p1[1] - p0[1]) / ln)
    v = (-u[1], u[0])
    r, d = w0 / 2, w0 / 2 * 0.95
    arch = [(p0[0] + v[0] * r * math.cos(th) - u[0] * d * math.sin(th),
             p0[1] + v[1] * r * math.cos(th) - u[1] * d * math.sin(th))
            for th in (math.pi * k / 8 for k in range(7, 0, -1))]
    return list(reversed(right)) + arch + left


def outreach_along(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def outreach_forms():
    """The forms the hand is modelled from: {name: (group, outline (mm),
    thickness (mm), swellings, grooves, lift(x, y))}."""
    if 'forms' in _OUTREACH:
        return _OUTREACH['forms']
    forms = {}
    for name, tip, lean, (dip, pip, end), (wd, wm, wb) in OUTREACH_FINGERS:
        a = math.radians(lean)
        u = (-math.sin(a), math.cos(a))                 # from the tip toward the palm
        at = lambda t: (tip[0] + u[0] * t, tip[1] + u[1] * t)
        # the tip pad is fullest a third of the way down, and the finger
        # draws in a little at each crease, as a palm's fingers do
        st = [(at(wd * 0.46), wd * 0.95), (at(dip * 0.42), wd), (at(dip * 0.78), wd * 0.96), (at(dip), wd * 0.9),
              (at(dip + (pip - dip) * 0.45), wm), (at(pip), wm * 0.92), (at(end), wb)]
        sw = [(at(dip * 0.5), u, dip * 0.5, wd * 0.6, 0.7),
              (at((dip + pip) / 2), u, (pip - dip) * 0.5, wm * 0.6, 0.5)]
        v = (-u[1], u[0])
        gr = [([(at(c)[0] - v[0] * w, at(c)[1] - v[1] * w), (at(c)[0] + v[0] * w, at(c)[1] + v[1] * w)], dp, 1.4)
              for c, w, dp in ((dip, wd, 0.6), (pip, wm, 0.5))]
        forms[name] = ('finger', outreach_limb(st), 5.0, sw, gr, None)
    forms['palm'] = ('palm', OUTREACH_PALM_LINE, 10.0, OUTREACH_PALM_SWELL, OUTREACH_PALM_CREASE, None)
    T = OUTREACH_THUMB
    b, j, t = T['base'], T['joint'], T['tip']
    wb, wj, wt = T['w']
    st = [(outreach_along(t, j, 0.46), wt * 0.97), (outreach_along(t, j, 0.72), wt), (j, wj),
          (outreach_along(j, b, 0.45), (wj + wb) / 2 + 0.8), (b, wb)]
    ln = math.hypot(j[0] - b[0], j[1] - b[1])
    ua = ((j[0] - b[0]) / ln, (j[1] - b[1]) / ln)

    def lift(x, y):
        # the thumb stands as high as the ball it grows from, all its length
        return T['lift']
    ut = (t[0] - j[0], t[1] - j[1])
    lt = math.hypot(*ut)
    ut = (ut[0] / lt, ut[1] / lt)
    sw = [(outreach_along(j, t, 0.5), ut, lt * 0.55, wt * 0.55, 0.9)]     # the tip's pad under the nail
    forms['thumb'] = ('thumb', outreach_limb(st), 6.0, sw, [], lift)
    _OUTREACH['forms'] = forms
    return forms


def outreach_swell(swells, grooves, x, y):
    """The swellings and grooves on a form's skin under (x, y), mm."""
    h = 0.0
    for (cx, cy), (ux, uy), a, b, rise in swells:
        p, q = ((x - cx) * ux + (y - cy) * uy) / a, (-(x - cx) * uy + (y - cy) * ux) / b
        h += rise * max(0.0, 1 - p * p - q * q) ** 1.5
    for run, depth, w in grooves:
        d = 1e9
        for (ax, ay), (bx, by) in zip(run, run[1:]):
            dx, dy = bx - ax, by - ay
            t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / ((dx * dx + dy * dy) or 1e-9)))
            d = min(d, math.hypot(x - ax - dx * t, y - ay - dy * t))
        h -= depth * math.exp(-(d / w) ** 2)
    return h


def outreach_form():
    """The hand's skin, as heights over one millimetre grid: each form
    inflated from its outline alone and flattened on its face (a finger or
    a palm is broad across and turns quickly at its sides, not round like a
    rod), with its swellings and grooves on it.
    'hand' holds the fingers and the palm; 'thumb' the thumb, joined to the
    palm it grows from by a soft maximum, so its base is the thenar's own
    skin and it stands clear only where it leaves it."""
    if 'form' in _OUTREACH:
        return _OUTREACH['form']
    g = 0.8
    forms = outreach_forms()
    dense = {k: bourse_curve(v[1], 6) for k, v in forms.items()}
    allp = [p for pl in dense.values() for p in pl]
    x0, y0 = min(p[0] for p in allp) - 3 * g, min(p[1] for p in allp) - 3 * g
    nx = int((max(p[0] for p in allp) - x0) / g) + 4
    ny = int((max(p[1] for p in allp) - y0) / g) + 4
    Z = {}
    for name, (grp, _, rnd, sw, gr, lift) in forms.items():
        pl = dense[name]
        i0 = max(0, int((min(p[0] for p in pl) - x0) / g) - 2)
        j0 = max(0, int((min(p[1] for p in pl) - y0) / g) - 2)
        i1 = min(nx, int((max(p[0] for p in pl) - x0) / g) + 3)
        j1 = min(ny, int((max(p[1] for p in pl) - y0) / g) + 3)
        sx, sy = x0 + i0 * g, y0 + j0 * g
        w_, h_ = i1 - i0, j1 - j0
        ins = bourse_fill(pl, sx, sy, g, w_, h_)
        u = [[0.0] * w_ for _ in range(h_)]
        cells = [(j, i) for j in range(1, h_ - 1) for i in range(1, w_ - 1) if ins[j][i]]
        h2 = g * g
        for _ in range(400):
            for j, i in cells:
                r = u[j]
                r[i] += 1.9 * ((r[i - 1] + r[i + 1] + u[j - 1][i] + u[j + 1][i] + h2) * 0.25 - r[i])
        z, top = {}, max(u[j][i] for j, i in cells)
        for j, i in cells:
            x, y = sx + (i + 0.5) * g, sy + (j + 0.5) * g
            z[(j0 + j, i0 + i)] = (rnd * (max(0.0, u[j][i]) / top) ** OUTREACH_FACE + outreach_swell(sw, gr, x, y)
                                   + (lift(x, y) if lift else 0.0))
        Z[name] = z
    hand = [[OUTREACH_OFF] * nx for _ in range(ny)]
    thumb = [[OUTREACH_OFF] * nx for _ in range(ny)]
    for name, z in Z.items():
        if name == 'thumb':
            continue
        for (j, i), v in z.items():
            hand[j][i] = max(hand[j][i], v)
    k = 3.0
    for (j, i), v in Z['thumb'].items():
        p = hand[j][i]
        thumb[j][i] = v if p == OUTREACH_OFF else max(p, v) + k * math.log1p(math.exp(-abs(p - v) / k))
    _OUTREACH['form'] = (x0, y0, g, nx, ny, hand, thumb)
    return _OUTREACH['form']


def outreach_light(which):
    """How squarely the skin under a badge point faces the key light:
    `which` is 'hand' (the palm and fingers) or 'thumb'. The slope is held
    under sixty degrees so a form turns away at its edge as a broad plane,
    and the normal is turned with the arm's lean and the family's eye."""
    key = ('light', which)
    if key in _OUTREACH:
        return _OUTREACH[key]
    x0, y0, g, nx, ny, hand, thumb = outreach_form()
    Z = thumb if which == 'thumb' else hand
    a = math.radians(OUTREACH_PLACE['lean'])
    ca, sa = math.cos(a), math.sin(a)
    cp, sp = math.cos(math.radians(PITCH)), math.sin(math.radians(PITCH))
    gmax = math.tan(math.radians(60))
    flat = lam((0.0, -sp, cp))
    L = [[flat] * nx for _ in range(ny)]
    for j in range(1, ny - 1):
        for i in range(1, nx - 1):
            z = Z[j][i]
            if z == OUTREACH_OFF:
                continue
            zl, zr, zu, zd = (q if q != OUTREACH_OFF else z for q in (Z[j][i - 1], Z[j][i + 1], Z[j - 1][i], Z[j + 1][i]))
            gx, gy = (zr - zl) / (2 * g), (zd - zu) / (2 * g)
            gg = math.hypot(gx, gy)
            if gg > gmax:
                gx, gy = gx * gmax / gg, gy * gmax / gg
            nx_, ny_ = -gx, gy                     # x right, y up
            # the arm's lean turns the charge clockwise on the badge, and
            # the family's eye stands PITCH degrees above
            rx, ry = nx_ * ca + ny_ * sa, -nx_ * sa + ny_ * ca
            L[j][i] = lam((rx, ry * cp - sp, ry * sp + cp))
    # two passes of a 3x3 box, so no plane's edge carries the grid's step
    B = L
    for _ in range(2):
        L, B = B, [row[:] for row in B]
        for j in range(1, ny - 1):
            for i in range(1, nx - 1):
                B[j][i] = sum(L[j + dj][i + di] for dj in (-1, 0, 1) for di in (-1, 0, 1)) / 9.0

    def light(x, y):
        u, v = outreach_from(x, y)
        fx, fy = (u - x0) / g - 0.5, (v - y0) / g - 0.5
        i, j = int(math.floor(fx)), int(math.floor(fy))
        if i < 0 or j < 0 or i >= nx - 1 or j >= ny - 1:
            return flat
        tx, ty = fx - i, fy - j
        return ((B[j][i] * (1 - tx) + B[j][i + 1] * tx) * (1 - ty) + (B[j + 1][i] * (1 - tx) + B[j + 1][i + 1] * tx) * ty)
    _OUTREACH[key] = light
    return light


def outreach_path(pts):
    """An outline in mm, drawn on the badge, wound one way so outlines laid
    in one path add up and never cut holes in each other. A point written
    (x, y, 1) is a corner."""
    q = [outreach_at(p) + tuple(p[2:]) for p in pts]
    if S.area(q) < 0:
        q = q[::-1]
    return smooth_d(q)


def outreach_planes(m, name, outlines, light, tones, cuts, small=False):
    """A group of forms cut into its planes: every outline laid in the
    darkest tone, and each lighter plane over them, clipped to them all."""
    sil = ' '.join(outreach_path(p) for p in outlines)
    pts = [outreach_at(p) for pl in outlines for p in pl]
    box = (min(p[0] for p in pts) - 1, min(p[1] for p in pts) - 1, max(p[0] for p in pts) + 1, max(p[1] for p in pts) + 1)
    step, eps = (0.5, 0.18) if small else (0.26, 0.1)
    out = ['<path d="%s" fill="%s"/>' % (sil, tones[0])]
    body = []
    for t, col in zip(cuts, tones[1:]):
        d = S.region_d(lambda x, y, t=t: t - light(x, y), box, step, eps)
        if d:
            body.append('<path d="%s" fill="%s" fill-rule="evenodd"/>' % (d, col))
    if body:
        clip = m.clip(name, ''.join('<path d="%s"/>' % outreach_path(p) for p in outlines))
        out.append('<g clip-path="%s">%s</g>' % (clip, ''.join(body)))
    return ''.join(out)


def outreach_creases():
    """Each finger's last crease, where it shows above the card: a short
    run across the pad, bowed toward the tip (mm)."""
    out = []
    for name, tip, lean, (dip, pip, end), (wd, wm, wb) in OUTREACH_FINGERS:
        a = math.radians(lean)
        u = (-math.sin(a), math.cos(a))
        v = (-u[1], u[0])
        c = (tip[0] + u[0] * dip, tip[1] + u[1] * dip)
        run = []
        for k in range(7):
            w = -0.62 + 1.24 * k / 6
            bow = -1.2 * (1 - (w / 0.62) ** 2)
            run.append((c[0] + v[0] * w * wd / 2 + u[0] * bow, c[1] + v[1] * w * wd / 2 + u[1] * bow))
        out.append(run)
    return out


def outreach_card():
    """The card's outline (mm): its lower left corner turned down toward
    the reader, as a card left by hand was; and the turned flap."""
    C = OUTREACH_CARD
    w, h, fd = C['w'] / 2, C['h'] / 2, C['fold']
    face = [(-w, -h), (w, -h), (w, h), (-w + fd, h), (-w, h - fd)]
    flap = [(-w + fd, h), (-w, h - fd), (-w + fd, h - fd)]
    return [[p + (1,) for p in rot(pl, 0.0, 0.0, C['turn'])] for pl in (face, flap)]


def outreach_inset(pts, d):
    """A convex outline drawn in by d on every side (mm)."""
    n = len(pts)
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    sgn = 1.0 if area > 0 else -1.0
    lines = []
    for i in range(n):
        (ax, ay), (bx, by) = pts[i][:2], pts[(i + 1) % n][:2]
        ln = math.hypot(bx - ax, by - ay)
        nx_, ny_ = -(by - ay) / ln * sgn, (bx - ax) / ln * sgn          # inward
        lines.append(((ax + nx_ * d, ay + ny_ * d), (bx - ax, by - ay)))
    out = []
    for i in range(n):
        (p, r), (q, s_) = lines[i - 1], lines[i]
        den = r[0] * s_[1] - r[1] * s_[0]
        t = ((q[0] - p[0]) * s_[1] - (q[1] - p[1]) * s_[0]) / den
        out.append((p[0] + r[0] * t, p[1] + r[1] * t))
    return out


def outreach_band(y0, y1, hw0, hw1, tones, cuts, lip=0.0):
    """A length of cloth round the forearm (the arm's axis at x = 1), hw0
    wide at its top and hw1 at its foot: its rims bow toward the reader as
    the family's eye sees a circle from a little above, and it is cut into
    bands along its length by the key light, as cloth round a limb takes
    it; a band that flares faces a little up. Returns (outline, body)."""
    a = math.radians(OUTREACH_PLACE['lean'])
    cp, sp = math.cos(math.radians(PITCH)), math.sin(math.radians(PITCH))
    flare = (hw0 - hw1) / (y1 - y0)

    def at(y, w):
        hw = hw0 + (hw1 - hw0) * (y - y0) / (y1 - y0)
        return (1.0 + w * hw, y + hw * math.sin(math.radians(PITCH)) * math.sqrt(max(0.0, 1 - w * w)))

    def tone(w, up=0.0):
        nz = math.sqrt(max(0.0, 1 - w * w))
        up += flare
        rx, ry = w * math.cos(a) + up * math.sin(a), -w * math.sin(a) + up * math.cos(a)
        return facet(lam((rx, ry * cp - nz * sp, ry * sp + nz * cp)), tones, cuts)
    n = 28
    ws = [-1 + 2 * k / n for k in range(n + 1)]
    outline = [at(y0, w) for w in ws] + [at(y1, w) for w in reversed(ws)]
    out, k0 = [], 0
    bands = [tone((ws[k] + ws[k + 1]) / 2) for k in range(n)]
    for k in range(1, n + 1):
        if k == n or bands[k] != bands[k0]:
            strip = [at(y0, w) for w in ws[k0:k + 1]] + [at(y1, w) for w in reversed(ws[k0:k + 1])]
            q = [outreach_at(p) for p in strip]
            out.append('<path d="%s" fill="%s" stroke="%s" stroke-width=".1"/>' % (poly_d(q), bands[k0], bands[k0]))
            k0 = k
    if lip:
        # the rolled edge at the top: it faces up toward the lamp, so it
        # catches the light a band ahead of the cloth under it
        for k in range(n):
            col = tone((ws[k] + ws[k + 1]) / 2, 0.6)
            q = [outreach_at(p) for p in (at(y0, ws[k]), at(y0, ws[k + 1]), at(y0 + lip, ws[k + 1]), at(y0 + lip, ws[k]))]
            out.append('<path d="%s" fill="%s" stroke="%s" stroke-width=".1"/>' % (poly_d(q), col, col))
    return outline, ''.join(out)


def outreach_mouth(y0, hw):
    """The inside of the cuff's mouth behind the wrist: the far half of the
    rim, seen from a little above, down to the near half (mm)."""
    e = hw * math.sin(math.radians(PITCH))
    ws = [-1 + 2 * k / 24 for k in range(25)]
    return ([(1.0 + w * hw, y0 - e * math.sqrt(max(0.0, 1 - w * w))) for w in ws]
            + [(1.0 + w * hw, y0 + e * math.sqrt(max(0.0, 1 - w * w))) for w in reversed(ws)])


def outreach_nail():
    """The thumb's nail, to the reader: its plate, the sliver of it that
    turns to the lamp, and its free edge at the tip (mm)."""
    T = OUTREACH_THUMB
    j, t = T['joint'], T['tip']
    ln = math.hypot(t[0] - j[0], t[1] - j[1])
    u = ((t[0] - j[0]) / ln, (t[1] - j[1]) / ln)       # toward the tip
    v = (-u[1], u[0])
    c = (t[0] - u[0] * 6.6, t[1] - u[1] * 6.6)
    L, W = 13.0, 11.4

    def P(tt, w):
        return (c[0] + u[0] * tt * L / 2 + v[0] * w * W / 2, c[1] + u[1] * tt * L / 2 + v[1] * w * W / 2)
    plate = [P(-1.0, -0.72), P(-0.86, -0.97), P(0.3, -1.0), P(0.8, -0.92), P(1.0, -0.55), P(1.07, 0.0),
             P(1.0, 0.55), P(0.8, 0.92), P(0.3, 1.0), P(-0.86, 0.97), P(-1.0, 0.72)]
    # the lamp is up and to the left: the plate's sliver on that side
    side = -1.0 if (v[0] * -0.7 + v[1] * -0.7) < 0 else 1.0
    lit = [P(-0.82, side * 0.95), P(0.3, side * 1.0), P(0.8, side * 0.9), P(0.6, side * 0.45), P(-0.2, side * 0.4),
           P(-0.75, side * 0.55)]
    edge = [P(0.72, -0.94), P(1.0, -0.55), P(1.07, 0.0), P(1.0, 0.55), P(0.72, 0.94), P(0.84, 0.45), P(0.9, 0.0),
            P(0.84, -0.45)]
    return plate, lit, edge


def subject_outreach(m, h, small=False):
    """The day's introduction, held up in the hand: a cubit arm erect,
    vested or and cuffed argent, the hand holding one
    calling card up to be seen, the fingers standing behind it and the
    thumb opposed across its foot. The desk briefs every card overnight;
    the owner delivers each himself."""
    forms = outreach_forms()
    fingers = [v[1] for k, v in forms.items() if v[0] == 'finger']
    palm = [forms['palm'][1]]
    thumb = [forms['thumb'][1]]
    face, flap = outreach_card()
    cy0, cy1, cw0, cw1 = OUTREACH_CUFF
    sy0, sy1, sw0, sw1 = OUTREACH_SLEEVE
    sleeve_sil, sleeve = outreach_band(sy0, sy1, sw0, sw1, OUTREACH_SLEEVE_CLOTH, [0.25, 0.5, 0.74])
    cuff_sil, cuff = outreach_band(cy0, cy1, cw0, cw1, OUTREACH_LINEN, [0.22, 0.46, 0.72], lip=0 if small else 1.8)
    cuts = OUTREACH_CUTS
    hand_light, thumb_light = outreach_light('hand'), outreach_light('thumb')

    def lay(tones):
        return (tones[1:], cuts[1:]) if small else (tones, cuts)
    # one shadow for the whole charge, cast down and right on the enamel
    m.add('<g opacity=".5" transform="translate(1 1.4)">%s</g>'
          % ''.join('<path d="%s"/>' % outreach_path(p) for p in fingers + palm + thumb + [face, cuff_sil, sleeve_sil]))
    m.add(outreach_planes(m, 'fingers', fingers, hand_light, *lay(OUTREACH_FINGER), small=small))
    if not small:
        # the creases across each finger's pads, where the skin folds at a
        # joint: a short line bowed toward the tip, in the skin's darkest
        m.add('<path d="%s" stroke="%s" stroke-width=".3" stroke-opacity=".5" stroke-linecap="round" fill="none"/>'
              % (' '.join(smooth_d([outreach_at(p) for p in run], closed=False) for run in outreach_creases()),
                 OUTREACH_FINGER[0]))
    m.add(sleeve)
    # the cuff's mouth behind the wrist, then the hand issuing from it
    m.add('<path d="%s" fill="%s"/>' % (outreach_path(outreach_mouth(cy0, cw0 - 0.8)), OUTREACH_LINEN[0]))
    m.add(outreach_planes(m, 'palm', palm, hand_light, *lay(OUTREACH_PALM), small=small))
    # the turned cuff lies over the sleeve and shades it along its foot
    m.add('<path d="%s" fill="#000" fill-opacity=".35" transform="translate(.5 .9)"/>' % outreach_path(cuff_sil))
    m.add(cuff)
    # the card stands a finger's breadth in front of the palm, so it throws
    # a band of shade down and right across the heel of the hand
    heel = m.clip('heel', '<path d="%s"/>' % outreach_path(palm[0]))
    card = outreach_path(face)
    m.add('<g clip-path="%s"><path d="%s" fill="%s" fill-opacity=".6" transform="translate(1.3 1.6)"/></g>'
          % (heel, card, OUTREACH_PALM[0]))
    # the card's edge is bevelled and gilt, as an engraved card's was: each
    # of its faces takes the gilt's tone by the way it turns to the lamp
    outer = [outreach_at(p) for p in face]
    inner = [outreach_at(p) for p in outreach_inset(face, OUTREACH_CARD['bevel'] * (1.6 if small else 1.0))]
    if S.area(outer) < 0:
        outer, inner = outer[::-1], inner[::-1]
    m.add('<path d="%s" fill="#000" fill-opacity=".35" transform="translate(.3 .4)"/>' % card)
    m.add(facet_poly(outer, inner))
    m.add('<path d="%s" fill="%s"/>' % (poly_d(inner), OUTREACH_STOCK[0]))
    # the turned corner, its back to the reader, laid on the face
    m.add('<path d="%s" fill="#000" fill-opacity=".18" transform="translate(.35 .45)"/>' % outreach_path(flap))
    m.add('<path d="%s" fill="%s"/>' % (outreach_path(flap), OUTREACH_STOCK[1]))
    # the thumb over the card: its shade on the card, then the thumb
    on_card = m.clip('oncard', '<path d="%s"/>' % card)
    m.add('<g clip-path="%s"><path d="%s" fill="#3a2a20" fill-opacity=".3" transform="translate(1.1 1.3)"/></g>'
          % (on_card, outreach_path(thumb[0])))
    m.add(outreach_planes(m, 'thumb', thumb, thumb_light, *lay(OUTREACH_BACK), small=small))
    plate, lit, edge = outreach_nail()
    m.add('<path d="%s" fill="%s"/>' % (outreach_path(plate), OUTREACH_NAIL[0]))
    if not small:
        m.add('<path d="%s" fill="%s"/>' % (outreach_path(lit), OUTREACH_NAIL[1]))
    m.add('<path d="%s" fill="%s"/>' % (outreach_path(edge), OUTREACH_NAIL[2]))


# --------------------------------------------------------------------------
# Arsenal: the gun laid for range, the gunner's square in its muzzle
# --------------------------------------------------------------------------
# A gunner's quadrant reads only when it is seen doing its job, so the charge
# is the gun and the instrument together, the way Tartaglia drew them in Nova
# Scientia (1537; the Library of Congress print of the page headed "Pezzo
# elevato alli 45 gradi sopra a l'orizonte") and the Encyclopaedia Britannica
# redrew them in 1911: the square's long arm laid on the bottom of the bore,
# its short arm hanging square to the gun beyond the muzzle, and a plumb line
# from the inner corner crossing the quarter arc between them at the gun's
# elevation. The gun is laid at Tartaglia's forty-five degrees, so the plumb
# cuts the arc at its sixth point, halfway.
#
# The gun is a muzzle-loading iron gun of the Blomefield pattern, from the
# twenty-four pounder on Martello Tower No. 24 and the side elevation of one
# with its parts named: the lip and mouldings, the swell of the muzzle, the
# neck, the muzzle astragal, the chase tapering back to its girdle, the
# second and first reinforces each a step heavier, the trunnions a little
# under the bore's axis, the base ring, the rounded base of the breech, and
# the cascabel's neck and knob. Its radii are drawn fuller than the long
# gun's, about the proportion of the short guns of the same pattern, so the
# barrel reads as a gun and not a rod at the size of a gate. It is drawn
# without its carriage, the way heraldry carries a cannon barrel, and turned
# a little so its muzzle and the dark of the bore come toward the reader. It
# is coloured as the eye remembers an iron gun: black, its lit back taking a
# cold blue sheen, on the enamel a shade paler than the gun so the whole
# barrel stands dark against it. The square is flat cast brass, its arc cut
# in the gunner's twelve points and filled alternately, as in Tartaglia's
# woodcut; the plumb is a turned brass bob on a hemp cord. World units: the
# gun is 100 long from its knob to its muzzle face, y up, and the whole
# charge is fitted to the badge afterwards.
ARSENAL = {
    'elev': 45.0,                    # the gun's elevation, degrees
    'yaw': -16.0,                    # turned so the muzzle comes toward the reader
    'girth': 1.8,                    # the profile's radii, fuller than the real gun's so it reads
    'girth_s': 1.3,                  # and the small cut's gun, heavier again
    'bore': 0.03,                    # the bore's radius, over the length
    'trunnion': (0.555, 0.0605, 0.03, 0.28),   # where (from the muzzle), the barrel's radius there,
                                               # the trunnion's radius, its drop under the axis
    'out': 26.0,                     # the square: its corner, this far beyond the muzzle
    'arc': 24.0, 'band': 4.8,        # the arc's radius about the corner, and the band the points are cut in
    'arm': 4.2, 'short': 31.0,       # the arms' width, and the short arm's length
    'thick': 1.6,                    # the brass plate
    'cord': 26.0, 'bob': 3.1,        # the plumb line, and the bob's scale
    'fill': 0.26,                    # how much light the enamel throws back into the gun's belly
    'shade': (1.2, 1.6, 0.42),       # the gun's cast shadow: its offset and opacity
    'fit': 39.2, 'centre': (48.0, 49.0),
}
# Iron, black, its lit planes taking the sky's blue: dark, shade, body, lit, crest.
ARSENAL_IRON = ['#0a0d10', '#161d23', '#2a353e', '#52636f', '#9aadba']
ARSENAL_IRON_CUTS = [0.12, 0.3, 0.62, 0.88]
ARSENAL_IRON_CUTS_S = [0.12, 0.3, 0.6, 0.8]       # the small cut: the crest kept broad, it draws the gun's back
# The square's brass, from Arsenal's own page (--brass-lo, --brass,
# --brass-hi) with a shade under and a crest over: every face, wall and
# chamfer takes one of these by how squarely it meets the key light.
ARSENAL_BRASS = ['#3a2c0f', '#6f571f', '#a3843a', '#c9a64e', '#e7c976', '#f9ebb4']
ARSENAL_BRASS_CUTS = [0.12, 0.32, 0.55, 0.78, 0.92]
ARSENAL_INK = '#2a2109'              # what the graver cuts, filled with black wax
ARSENAL_HEMP = '#b39c70'             # the plumb's cord
ARSENAL_BORE = '#07090b'
ARSENAL_FILL = S.norm((0.55, -0.8, -0.2))  # the light the enamel throws back, from below and to the right
# The bob, turned: (from, to, radius, radius) down its axis, in bob units.
ARSENAL_BOB = [(0.0, 0.5, 0.35, 0.35), (0.5, 0.5, 0.35, 0.6), (0.5, 1.0, 0.6, 0.6), (1.0, 1.0, 0.6, 0.4),
               (1.0, 1.7, 0.4, 0.75), (1.7, 2.3, 0.75, 0.98), (2.3, 2.9, 0.98, 1.0), (2.9, 3.6, 1.0, 0.82),
               (3.6, 4.6, 0.82, 0.42), (4.6, 5.3, 0.42, 0.0)]


def arsenal_profile(small=False):
    """The gun's turned profile, knob to muzzle: bands (f0, f1, r0, r1), f the
    distance from the muzzle face and r the radius, both over the length. A
    band with f0 == f1 is a step (a ring's face). The small cut keeps each
    ring as one plain band and drops the fillets."""
    P = []
    # the knob, a ball, and its neck
    kc, kr = 0.978, 0.03
    n = 8 if small else 20
    ball = [(kc + kr * math.cos(math.pi * k / n), kr * math.sin(math.pi * k / n)) for k in range(n + 1)]
    P += [(a[0], b[0], a[1], b[1]) for a, b in zip(ball, ball[1:])]
    P += [(kc - kr, 0.952, 0.015, 0.015), (0.952, 0.952, 0.015, 0.024), (0.952, 0.946, 0.024, 0.024)]
    # the base of the breech, rounding out to the base ring
    n = 6 if small else 14
    for k in range(n):
        a0, a1 = math.pi / 2 * k / n, math.pi / 2 * (k + 1) / n
        P.append((0.946 - 0.034 * math.sin(a0), 0.946 - 0.034 * math.sin(a1),
                  0.024 + 0.05 * (1 - math.cos(a0)) ** 0.7, 0.024 + 0.05 * (1 - math.cos(a1)) ** 0.7))
    # the base ring and the vent field
    P += [(0.912, 0.912, 0.074, 0.077), (0.912, 0.896, 0.077, 0.077), (0.896, 0.896, 0.077, 0.070),
          (0.896, 0.884, 0.070, 0.070)]
    # the first reinforce's astragal and fillets, and the first reinforce
    if small:
        P += [(0.884, 0.64, 0.069, 0.065)]
    else:
        P += [(0.884, 0.884, 0.070, 0.072), (0.884, 0.879, 0.072, 0.072), (0.879, 0.879, 0.072, 0.075),
              (0.879, 0.866, 0.075, 0.075), (0.866, 0.866, 0.075, 0.072), (0.866, 0.861, 0.072, 0.072),
              (0.861, 0.861, 0.072, 0.069), (0.861, 0.64, 0.069, 0.065)]
    # the second reinforce ring, and the second reinforce
    P += [(0.64, 0.64, 0.065, 0.068), (0.64, 0.626, 0.068, 0.066), (0.626, 0.626, 0.066, 0.061),
          (0.626, 0.44, 0.061, 0.058)]
    # the chase girdle, and the chase tapering to the neck
    if small:
        P += [(0.44, 0.44, 0.058, 0.061), (0.44, 0.415, 0.061, 0.061), (0.415, 0.415, 0.061, 0.056)]
    else:
        P += [(0.44, 0.44, 0.058, 0.060), (0.44, 0.434, 0.060, 0.060), (0.434, 0.434, 0.060, 0.063),
              (0.434, 0.42, 0.063, 0.063), (0.42, 0.42, 0.063, 0.060), (0.42, 0.414, 0.060, 0.060),
              (0.414, 0.414, 0.060, 0.056)]
    P += [(0.414, 0.15, 0.056, 0.047)]
    # the muzzle astragal and fillets
    if small:
        P += [(0.15, 0.15, 0.047, 0.051), (0.15, 0.13, 0.051, 0.051), (0.13, 0.13, 0.051, 0.046)]
    else:
        P += [(0.15, 0.15, 0.047, 0.049), (0.15, 0.145, 0.049, 0.049), (0.145, 0.145, 0.049, 0.052),
              (0.145, 0.133, 0.052, 0.052), (0.133, 0.133, 0.052, 0.049), (0.133, 0.128, 0.049, 0.049),
              (0.128, 0.128, 0.049, 0.046)]
    # the neck, and the swell of the muzzle rising to its mouldings and lip
    n = 4 if small else 7
    for k in range(n):
        a0, a1 = k / float(n), (k + 1) / float(n)
        P.append((0.128 - 0.1 * a0, 0.128 - 0.1 * a1, 0.046 + 0.018 * a0 ** 1.8, 0.046 + 0.018 * a1 ** 1.8))
    P += [(0.028, 0.028, 0.064, 0.067), (0.028, 0.012, 0.067, 0.067), (0.012, 0.012, 0.067, 0.061),
          (0.012, 0.0, 0.061, 0.061)]
    return P


def arsenal_frame():
    """The bore (toward the muzzle), square to it upward, and toward the
    reader: the gun lies in the world's x-y plane."""
    e = math.radians(ARSENAL['elev'])
    return (math.cos(e), math.sin(e), 0.0), (-math.sin(e), math.cos(e), 0.0), (0.0, 0.0, 1.0)


def arsenal_runs(cls, n=180, iters=16):
    """Where a ring's class changes: cls(angle) -> a tone, or None where the
    surface turns from the reader. Returns [(a0, a1, tone)] covering the turn,
    each edge found by bisection, so a plane's edge falls where the light puts
    it and not on a facet boundary (neighbouring bands then share their edges
    and a plane runs smoothly down the gun)."""
    step = 2 * math.pi / n
    cs = [cls(step * k) for k in range(n)]
    edges = []
    for k in range(n):
        lo, clo, target = step * k, cs[k], cs[(k + 1) % n]
        hi = step * (k + 1)
        guard_ = 0
        while clo != target and guard_ < 6:
            a, b = lo, hi
            for _ in range(iters):
                mid = (a + b) / 2
                if cls(mid) == clo:
                    a = mid
                else:
                    b = mid
            lo, clo = b, cls(b)
            edges.append((b, clo))
            guard_ += 1
    if not edges:
        return [(0.0, 2 * math.pi, cs[0])]
    out = []
    for i, (a, c) in enumerate(edges):
        b = edges[(i + 1) % len(edges)][0]
        if b <= a:
            b += 2 * math.pi
        out.append((a, b, c))
    return out


def arsenal_half(poly, a, d, side):
    """The part of a polygon on one side of the line through a along d
    (side +1: to the left of d, -1: to the right)."""
    def s(p):
        return side * (d[0] * (p[1] - a[1]) - d[1] * (p[0] - a[0]))
    out = []
    for i in range(len(poly)):
        p, q = poly[i], poly[(i + 1) % len(poly)]
        sp, sq = s(p), s(q)
        if sp >= 0:
            out.append(p)
        if (sp >= 0) != (sq >= 0):
            k = sp / (sp - sq)
            out.append((p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k))
    return out


def arsenal_wrap(x):
    """An angle difference brought into (-pi, pi]."""
    return (x + math.pi) % (2 * math.pi) - math.pi


def arsenal_lathe(v, O, A, U, W, bands, tones, cuts, small=False, bevel=1.6, fill=0.0):
    """A turned solid about the axis through O along A: bands (t0, t1, r0, r1)
    in order, far to near, laid one after another so a nearer band covers a
    farther one. Each band is laid as runs of one tone, a run's edges where
    the key light crosses a cut; what turns from the reader is left out.
    Where two bands meet in one smooth stretch of the profile, the edge
    between two tones is set on their shared rim halfway between where each
    band alone would put it, so a plane's edge runs down the swell of the
    muzzle as one line and not as a stair. Under the runs of a turned band
    lies its whole outline (the hull of its two rims), each side of the axis
    in the tone of the run at that side's edge, so the silhouette runs as one
    smooth line down the gun. A step (t0 == t1) is a ring's face, lit as if
    its edge were rounded over, unless a fifth value gives it another bevel
    (0 for a flat face). Consecutive pieces of one tone share a path, all
    wound the same way so none cuts a hole in another. Returns SVG."""
    seq = []

    def put(tone, poly):
        if S.area(poly) < 0:
            poly = poly[::-1]
        if seq and seq[-1][0] == tone:
            seq[-1][1].append(S.pts_d(poly))
        else:
            seq.append((tone, [S.pts_d(poly)]))

    def P(t, r, a):
        return v.proj(S.add(S.add(O, S.mul(A, t)), S.add(S.mul(U, r * math.cos(a)), S.mul(W, r * math.sin(a)))))[:2]
    # first each band alone: its runs, and the angle of each change of tone
    laid = []
    for band in bands:
        t0, t1, r0, r1 = band[:4]
        bev = band[4] if len(band) > 4 else bevel
        dt, dr = t1 - t0, r1 - r0
        if abs(dt) < 1e-9 and abs(dr) < 1e-9:
            continue
        step = abs(dt) < 1e-9

        def cls(a, dt=dt, dr=dr, step=step, bev=bev):
            rad = S.add(S.mul(U, math.cos(a)), S.mul(W, math.sin(a)))
            nv = v.nrm(S.norm(S.add(S.mul(rad, dt), S.mul(A, -dr))))
            if nv[2] <= 0:
                return None
            if step and bev:
                # a ring's face is not a flat washer: its edge is rounded
                # over, so it takes the light the way a bevel would, and the
                # part of it under the gun goes into the gun's shade
                nv = v.nrm(S.norm(S.add(S.mul(A, -1.0 if dr > 0 else 1.0), S.mul(rad, bev))))
            # the enamel under the gun throws a little light back up into its belly
            return S.quant(facet(max(lam(nv), fill * max(0.0, S.dot(S.norm(nv), ARSENAL_FILL))), tones, cuts))
        rings = arsenal_runs(cls, 90 if small else 180)
        edges = {}
        for (a0, a1, tn), (b0, b1, nx) in zip(rings, rings[1:] + rings[:1]):
            key = (tn, nx)
            edges[key] = None if key in edges else b0       # a change met twice is left alone
        ln = math.hypot(dt, dr)
        laid.append({'band': (t0, t1, r0, r1), 'step': step, 'rings': rings, 'edges': edges,
                     'n': (dt / ln, -dr / ln), 'rim0': dict(edges), 'rim1': dict(edges)})
    # then the rims two bands of one smooth stretch share
    for p, q in zip(laid, laid[1:]):
        if p['step'] or q['step']:
            continue
        if abs(p['band'][1] - q['band'][0]) > 1e-6 or abs(p['band'][3] - q['band'][2]) > 1e-6:
            continue
        if p['n'][0] * q['n'][0] + p['n'][1] * q['n'][1] < math.cos(math.radians(30)):
            continue                                         # a crease, not a smooth turn
        for key, ang in p['edges'].items():
            other = q['edges'].get(key)
            if ang is None or other is None:
                continue
            mid = ang + arsenal_wrap(other - ang) / 2
            p['rim1'][key] = q['rim0'][key] = mid
    for lb in laid:
        t0, t1, r0, r1 = lb['band']
        rings = lb['rings']
        if not lb['step'] and any(tn is None for _, _, tn in rings):
            ax0, ax1 = P(t0, 0.0, 0.0), P(t1, 0.0, 0.0)
            d = (ax1[0] - ax0[0], ax1[1] - ax0[1])
            if math.hypot(*d) > 1e-6:
                hull = groundstation_hull([P(t, r, 2 * math.pi * j / 40) for t, r in ((t0, r0), (t1, r1)) for j in range(40)])
                for (a0, a1, tn), (b0, b1, nx) in zip(rings, rings[1:] + rings[:1]):
                    edge = None
                    if tn is not None and nx is None:
                        edge, tone = a1 - 1e-3, tn
                    elif tn is None and nx is not None:
                        edge, tone = b0 + 1e-3, nx
                    if edge is None:
                        continue
                    p = P(t0, max(r0, r1), edge)
                    side = 1 if d[0] * (p[1] - ax0[1]) - d[1] * (p[0] - ax0[0]) > 0 else -1
                    half = arsenal_half(hull, ax0, d, side)
                    if len(half) > 2:
                        put(tone, half)
        # the angle between points on a rim: its chord strays under a twentieth of a unit
        arc = min(0.5, 2 * math.sqrt(0.1 / max(0.05, v.s * max(r0, r1))))
        k = len(rings)
        for i, (a0, a1, tone) in enumerate(rings):
            if tone is None:
                continue
            if k == 1:
                s0, e0, s1, e1 = a0, a1, a0, a1
            else:
                prev, nxt = rings[i - 1][2], rings[(i + 1) % k][2]

                def at(rim, key, own):
                    x = lb[rim].get(key)
                    return own if x is None else own + arsenal_wrap(x - own)
                s0, e0 = at('rim0', (prev, tone), a0), at('rim0', (tone, nxt), a1)
                s1, e1 = at('rim1', (prev, tone), a0), at('rim1', (tone, nxt), a1)
                e0, e1 = max(e0, s0), max(e1, s1)
            m_ = max(2, int(max(e0 - s0, e1 - s1) / arc) + 1)
            poly = ([P(t0, r0, s0 + (e0 - s0) * j / m_) for j in range(m_ + 1)]
                    + [P(t1, r1, s1 + (e1 - s1) * j / m_) for j in range(m_, -1, -1)])
            put(tone, S.rdp(poly, 0.05 if small else 0.03))
    return ''.join('<path d="%s" fill="%s" stroke="%s" stroke-width=".1"/>' % (' '.join(ds), tone, tone) for tone, ds in seq)


def arsenal_square(rb, small=False):
    """The square in the bore's plane, (t, s) about the centre of the muzzle
    face: t along the bore, s square to it and up. Returns its outline, the
    opening between the arms and the arc, and the inner corner the cord
    hangs from."""
    q = ARSENAL
    k = 1.3 if small else 1.0
    wa, wb = q['arm'] * k, q['band'] * k
    d, Ra, Ls = q['out'], q['arc'], q['short']
    s0 = -rb                                   # the long arm lies on the bottom of the bore
    n = 24
    outer = [(0.0, s0 + wa), (d + wa, s0 + wa), (d + wa, s0 - Ls), (d, s0 - Ls)]
    outer += [(d + Ra * math.cos(a), s0 + Ra * math.sin(a)) for a in [-math.pi / 2 - math.pi / 2 * j / n for j in range(n + 1)]]
    outer += [(0.0, s0)]
    ri = Ra - wb
    hole = [(d, s0)] + [(d + ri * math.cos(a), s0 + ri * math.sin(a)) for a in [math.pi + math.pi / 2 * j / n for j in range(n + 1)]]
    return outer, hole, (d, s0)


def arsenal_girth(small=False):
    return ARSENAL['girth'] * (ARSENAL['girth_s'] if small else 1.0)


def arsenal_bands(small=False):
    """The profile as bands along the bore in world units, t from the knob
    (0) to the muzzle face (100), and the face itself round the bore."""
    g, L = arsenal_girth(small), 100.0
    bands = [(L * (1 - f0), L * (1 - f1), L * r0 * g, L * r1 * g) for f0, f1, r0, r1 in arsenal_profile(small)]
    bands.append((L, L, 0.061 * L * g, ARSENAL['bore'] * L * g, 0.0))      # the muzzle face, turned flat
    return bands


def arsenal_ring_pts(v, O, A, U, W, bands, step=15):
    pts = []
    for t0, t1, r0, r1 in (b[:4] for b in bands):
        for deg in range(0, 360, step):
            a = math.radians(deg)
            for t, r in ((t0, r0), (t1, r1)):
                pts.append(v.proj(S.add(S.add(O, S.mul(A, t)), S.add(S.mul(U, r * math.cos(a)), S.mul(W, r * math.sin(a)))))[:2])
    return pts


def arsenal_boss(m, v, c, n, e1, e2, r, cuts, small=False, dome=0.55):
    """A round flat end of radius r about c, facing n, whose arris is turned
    over so it reads as a boss: cut into planes along the light a shallow
    dome would take (its normal leaning out by `dome` at the rim)."""
    c2 = v.proj(c)[:2]
    u1 = [a - b for a, b in zip(v.proj(S.add(c, e1))[:2], c2)]
    u2 = [a - b for a, b in zip(v.proj(S.add(c, e2))[:2], c2)]
    det = u1[0] * u2[1] - u1[1] * u2[0]
    disc = [v.proj(S.add(c, S.add(S.mul(e1, r * math.cos(2 * math.pi * j / 48)), S.mul(e2, r * math.sin(2 * math.pi * j / 48)))))[:2]
            for j in range(48)]

    def lit(x, y):
        dx, dy = x - c2[0], y - c2[1]
        a, b = (dx * u2[1] - dy * u2[0]) / det, (u1[0] * dy - u1[1] * dx) / det
        return lam(v.nrm(S.norm(S.add(n, S.mul(S.add(S.mul(e1, a), S.mul(e2, b)), dome / r)))))
    xs, ys = [p[0] for p in disc], [p[1] for p in disc]
    box = (min(xs) - 0.5, min(ys) - 0.5, max(xs) + 0.5, max(ys) + 0.5)
    return planes(m, 'boss', S.pts_d(disc), lit, box, ARSENAL_IRON, cuts, step=0.3 if small else 0.15, eps=0.04)


def subject_arsenal(m, h, small=False):
    """The gun laid for range with the gunner's square in its muzzle, the
    plumb line crossing the arc at the gun's elevation: the number Arsenal's
    Ballistic Computer gives, read the way gunners first read it. Black iron
    and the square's brass, the Ballistic Computer's own fittings, on the
    gunmetal enamel. The small cut keeps the gun's big rings and draws the
    barrel heavier, the square's arms heavier and its points as six blocks,
    and the cord as a line three units wide."""
    q = ARSENAL
    L = 100.0
    A, U, W = arsenal_frame()
    O = (0.0, 0.0, 0.0)
    M = S.mul(A, L)                               # the centre of the muzzle face
    g = arsenal_girth(small)
    rb = q['bore'] * L * g
    bands = arsenal_bands(small)
    outer, hole, corner = arsenal_square(rb, small)
    thick = q['thick'] * (1.3 if small else 1.0)

    def sq(p, z=0.0):
        """A point of the square's plane in the world."""
        w = S.add(M, S.add(S.mul(A, p[0]), S.mul(U, p[1])))
        return (w[0], w[1], z)
    outer_w = [sq(p)[:2] for p in outer]
    hole_w = [sq(p)[:2] for p in hole]
    pin = sq(corner, thick / 2 + 0.2)
    bob_top = (pin[0], pin[1] - q['cord'], pin[2])
    bs = q['bob'] * (1.25 if small else 1.0)
    # fit: the whole charge at unit scale, then the circle round it onto the badge
    v0 = S.View(0.0, 0.0, 1.0, yaw=q['yaw'], pitch=PITCH)
    pts = arsenal_ring_pts(v0, O, A, U, W, bands)
    pts += [v0.proj((x, y, z))[:2] for x, y in outer_w for z in (-thick / 2, thick / 2)]
    pts += [v0.proj((bob_top[0] + dx, bob_top[1] - dy, bob_top[2]))[:2] for dx in (-bs, bs) for dy in (0.0, 5.3 * bs)]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    c = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    k = q['fit'] / max(math.hypot(p[0] - c[0], p[1] - c[1]) for p in pts)
    X, Y = q['centre']
    v = S.View(X - k * c[0], Y - k * c[1], k, yaw=q['yaw'], pitch=PITCH)
    # the charge's shadows on the enamel, cast down and to the right
    m.add(shadow(poly_d(groundstation_hull(arsenal_ring_pts(v, O, A, U, W, bands, 20))), *q['shade']))
    m.add(shadow(S.pts_d([v.proj((x, y, -thick / 2))[:2] for x, y in outer_w]) + ' '
                 + S.pts_d([v.proj((x, y, -thick / 2))[:2] for x, y in hole_w]), 1.4, 2.0, 0.42, ' fill-rule="evenodd"'))
    # the gun, knob to muzzle, and the bore
    cuts = ARSENAL_IRON_CUTS_S if small else ARSENAL_IRON_CUTS
    m.add(arsenal_lathe(v, O, A, U, W, bands, ARSENAL_IRON, cuts, small, fill=q['fill']))
    bore = [v.proj(S.add(M, S.add(S.mul(U, rb * math.cos(2 * math.pi * j / 48)), S.mul(W, rb * math.sin(2 * math.pi * j / 48)))))[:2]
            for j in range(48)]
    m.add('<path d="%s" fill="%s"/>' % (S.pts_d(bore), ARSENAL_BORE))
    # the near trunnion, a short turned stub a little under the bore's axis,
    # its end turned very slightly domed so it stands off the gun as a boss
    ft, rl, rt, drop = q['trunnion']
    rl, rt = rl * L * g, rt * L * g
    To = S.add(S.mul(A, L * (1 - ft)), S.mul(U, -drop * rl))
    reach = rl + rt * 1.4
    m.add(arsenal_lathe(v, To, W, A, U, [(rl * 0.7, reach, rt, rt)], ARSENAL_IRON, cuts, small))
    m.add(arsenal_boss(m, v, S.add(To, S.mul(W, reach)), W, A, U, rt, cuts, small))
    # the square, its twelve points, the cord and the bob
    m.add(arsenal_plate(v, [(outer_w, False), (hole_w, True)], thick, 0.0 if small else 0.35, zb=-thick / 2))
    m.add(arsenal_points(v, sq, rb, thick, small))
    c0, c1 = v.proj(pin)[:2], v.proj(bob_top)[:2]
    line = 'M%s %s L%s %s' % (f(c0[0]), f(c0[1]), f(c1[0]), f(c1[1]))
    cw = 3.0 if small else 0.5
    m.add('<path d="%s" stroke="#000" stroke-opacity=".4" stroke-width="%s" transform="translate(1.2 1.6)"/>' % (line, f(cw)))
    m.add('<path d="%s" stroke="%s" stroke-width="%s" stroke-linecap="round"/>' % (line, ARSENAL_HEMP, f(cw)))
    bob = [(a * bs, b * bs, r0 * bs, r1 * bs) for a, b, r0, r1 in ARSENAL_BOB]
    m.add(arsenal_lathe(v, bob_top, (0.0, -1.0, 0.0), (1.0, 0.0, 0.0), (0.0, 0.0, 1.0), bob,
                        ARSENAL_BRASS, ARSENAL_BRASS_CUTS, small))
    # the pin the cord hangs from, a turned head
    rp = 1.6 if small else 1.1
    m.add(faceted_ring(c0[0], c0[1], rp * 0.5, rp, +1, n=24))
    m.add('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(c0[0]), f(c0[1]), f(rp * 0.5), ARSENAL_BRASS[2]))


def arsenal_points(v, sq, rb, thick, small=False):
    """The gunner's twelve points on the arc, from the short arm (level) to
    the long arm, cut alternately as Tartaglia's woodcut shows them and filled
    with black wax between two ruled edges. The small cut keeps them as six
    blocks, two points to a block."""
    q = ARSENAL
    k = 1.3 if small else 1.0
    d, Ra, s0 = q['out'], q['arc'], -rb
    ri = Ra - q['band'] * k
    r_in, r_out = ri + 0.5 * k, Ra - 0.5 * k
    z = thick / 2

    def T(t, s):
        return v.proj(sq((t, s), z))[:2]

    def pol(r, a):
        return T(d + r * math.cos(a), s0 + r * math.sin(a))
    n = 6 if small else 12
    blocks = []
    for j in range(0, n, 2):
        a0, a1 = math.pi * 1.5 - math.pi / 2 * j / n, math.pi * 1.5 - math.pi / 2 * (j + 1) / n
        blocks.append(poly_d([pol(r_out, a0 + (a1 - a0) * i / 5) for i in range(6)]
                             + [pol(r_in, a1 - (a1 - a0) * i / 5) for i in range(6)]))
    out = '<path d="%s" fill="%s" fill-opacity=".84"/>' % (' '.join(blocks), ARSENAL_INK)
    if not small:
        rules = []
        for r in (r_in, r_out):
            rules.append('M' + ' L'.join('%s %s' % (f(x), f(y)) for x, y in
                                         (pol(r, math.pi + math.pi / 2 * i / 40) for i in range(41))))
        out += '<path d="%s" stroke="%s" stroke-width=".26" stroke-opacity=".7" fill="none"/>' % (' '.join(rules), ARSENAL_INK)
    return out


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


def arsenal_plate(v, loops, t, ch, zb=None):
    """A cast plate t thick whose back lies at zb (by default it is centred
    on z = 0): its walls where they turn to the reader, each in the tone its
    normal takes from the key light, a chamfer round the face, and the flat
    face over them."""
    fc = S.Faces()
    face_loops = []
    zb = -t / 2 if zb is None else zb
    zf = zb + t
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


# --------------------------------------------------------------------------
# Bourse: the canary the desk keeps on watch, on a turned perch
# --------------------------------------------------------------------------
# The bird is traced from a photograph of a living domestic canary perched
# side-on (Wikimedia Commons, "Phaeo gelb intensiv.jpg"), mirrored to face
# the key light: the rounded crown, the short conical bill as deep as it is
# long, the nape, the mantle running down into the folded wing, the full
# breast swelling forward of the throat (checked against "Domestic canary
# 2.jpg" and the 2015 Macedonian canary stamp), the long tail with its
# shallow notch, and the body at about forty degrees. The wing's feather masses are read against
# "Domestic Canary - Serinus canaria.jpg", the show perch against "Mehringer
# gelb lipochrom.jpg". Bird units: the feet on the perch at the origin, y
# down, one unit ten of the photograph's pixels (at 960 wide); a point
# (x, y, 1) is a corner.
BOURSE_BIRD = {
    'outline': [(-32.8, -50.0, 1), (-30.9, -50.9), (-28.1, -51.4), (-25.9, -53.1), (-23.2, -53.9), (-18.7, -53.5),
                (-14.4, -51.3), (-11.9, -48.4), (-9.6, -43.6), (-6.8, -39.6), (-2.9, -36.1), (2.0, -33.2), (6.4, -30.3),
                (10.6, -26.8), (15.2, -24.3), (19.4, -21.9), (22.8, -18.9), (27.9, -15.9, 1), (33.5, -12.8), (39.5, -9.4),
                (45.5, -6.0), (48.8, -4.4, 1), (46.6, -3.4, 1), (48.2, -1.6, 1), (43.0, -3.4), (37.0, -6.0), (31.8, -8.4),
                (27.4, -9.9), (21.8, -10.4), (16.2, -10.2), (10.4, -8.9), (5.2, -7.4), (0.5, -7.0),
                (-4.2, -7.6), (-8.2, -9.5), (-12.6, -11.8), (-17.0, -14.2), (-21.4, -17.6), (-25.0, -21.8), (-27.6, -26.6),
                (-29.0, -31.4), (-29.4, -35.6), (-29.0, -39.4), (-28.6, -43.0), (-28.5, -46.0, 1)],
    # the volume the light is cut from: head and body only (the tail and the
    # bill are flat and drawn over it)
    'form': [(-28.1, -46.5), (-28.1, -51.4), (-25.9, -53.1), (-23.2, -53.9), (-18.7, -53.5), (-14.4, -51.3),
             (-11.9, -48.4), (-9.6, -43.6), (-6.8, -39.6), (-2.9, -36.1), (2.0, -33.2), (6.4, -30.3), (10.6, -26.8),
             (15.2, -24.3), (19.4, -21.9), (22.8, -18.9), (26.4, -15.6), (27.8, -12.6), (25.4, -10.4), (21.8, -10.4),
             (16.2, -10.2), (10.4, -8.9), (5.2, -7.4), (0.5, -7.0), (-4.2, -7.6), (-8.2, -9.5), (-12.6, -11.8),
             (-17.0, -14.2), (-21.4, -17.6), (-25.0, -21.8), (-27.6, -26.6), (-29.0, -31.4), (-29.4, -35.6),
             (-29.0, -39.4), (-28.6, -43.0)],
    # the folded wing: the flight feathers' mass, its primaries stepping to
    # the point over the tail
    'wing': [(-10.8, -34.6), (-5.4, -35.0), (0.2, -33.2), (5.6, -30.1), (10.4, -26.7), (15.2, -24.2), (19.4, -21.8),
             (22.8, -18.9), (27.9, -15.9, 1), (26.1, -15.5, 1), (25.4, -16.2, 1), (23.4, -15.9, 1), (22.7, -16.6, 1),
             (19.8, -16.6), (14.0, -17.1), (7.0, -17.8), (0.6, -18.9), (-4.4, -20.4), (-8.4, -22.6), (-10.9, -25.8),
             (-11.6, -29.6)],
    # the tertials lying over the flight feathers, their tips stepped
    'tertials': [(1.6, -31.5), (6.2, -29.4), (10.6, -26.6), (14.6, -23.9), (18.2, -21.3), (20.6, -18.4, 1),
                 (18.4, -17.7, 1), (17.6, -18.9, 1), (15.2, -18.3, 1), (14.4, -19.7, 1), (11.6, -19.4), (7.2, -21.2),
                 (3.4, -24.4), (1.2, -28.0)],
    # the coverts over the shoulder, the greater coverts' tips scalloped
    'coverts': [(-10.8, -34.6), (-5.4, -35.0), (0.2, -33.2), (4.8, -30.5), (7.4, -28.2), (5.6, -26.9, 1),
                (4.6, -25.4), (2.4, -25.2, 1), (1.2, -23.8), (-1.2, -23.9, 1), (-2.6, -22.6), (-5.0, -23.0, 1),
                (-6.6, -22.2), (-8.4, -22.6), (-10.9, -25.8), (-11.6, -29.6)],
    # the tail: its near half, and the far outer feather below it
    'tail': [(22.8, -18.9), (27.9, -15.9, 1), (33.5, -12.8), (39.5, -9.4), (45.5, -6.0), (48.8, -4.4, 1),
             (46.6, -3.4, 1), (40.8, -5.8), (34.4, -8.8), (28.6, -11.4), (24.6, -12.4)],
    'tail_far': [(27.4, -9.9), (31.8, -8.4), (37.0, -6.0), (43.0, -3.4), (48.2, -1.6, 1), (46.6, -3.4, 1),
                 (40.8, -5.8), (34.4, -8.8), (28.6, -11.4)],
    'bill_upper': [(-28.1, -51.4, 1), (-30.9, -50.9), (-32.8, -50.0, 1), (-30.6, -49.0), (-28.3, -48.3, 1)],
    'bill_lower': [(-28.3, -48.3, 1), (-30.6, -49.0), (-32.5, -49.8, 1), (-30.4, -47.9), (-28.5, -46.0, 1)],
    'eye': (-21.9, -47.6, 1.2),
    # tarsi from the heel under the flank feathers to the perch, near then far
    'legs': [((3.4, -8.2), (4.4, 0.0)), ((-1.0, -8.0), (-3.2, 0.0))],
}
# Canary yellow as the eye keeps it: cool lemon where the light falls, the
# warm deep yellow of the breast and flank in shade.
BOURSE_PLUMAGE = ['#a47014', '#d99c20', '#f3c52c', '#fde25e']       # deep, shade, body, lit
BOURSE_COVERTS = ['#977812', '#cfa526', '#ecc934', '#f9e373']       # the shoulder, a shade cooler
BOURSE_TERTIALS = ['#78631a', '#b3922a', '#d8b83c', '#eed86e']      # the olive in a canary's wing
BOURSE_FLIGHT = ['#625216', '#98802a', '#c3a73c', '#e2cd66']        # the long flight feathers
BOURSE_CUTS = [0.24, 0.44, 0.7]
BOURSE_WING_CUTS = [0.26, 0.5, 0.8]
BOURSE_HORN = ['#ecd8b8', '#c3a07e']                                 # the upper mandible, the lower
BOURSE_SHANK = ['#d9a58e', '#a9735f']                                # the near leg, the far one
BOURSE_FORM = {}                                                      # the traced volume, solved once a placing


def bourse_fill(poly, x0, y0, step, nx, ny):
    """Which cells of a grid lie inside a polygon (even-odd, by scanline)."""
    inside = [[False] * nx for _ in range(ny)]
    n = len(poly)
    for j in range(ny):
        y = y0 + (j + 0.5) * step
        xs = []
        for i in range(n):
            (ax, ay), (bx, by) = poly[i], poly[(i + 1) % n]
            if (ay <= y < by) or (by <= y < ay):
                xs.append(ax + (y - ay) * (bx - ax) / (by - ay))
        xs.sort()
        for a, b in zip(xs[0::2], xs[1::2]):
            i0 = max(0, int(math.ceil((a - x0) / step - 0.5)))
            i1 = min(nx - 1, int(math.floor((b - x0) / step - 0.5)))
            for i in range(i0, i1 + 1):
                inside[j][i] = True
    return inside


def bourse_curve(pts, n=6):
    """The traced outline as a dense polygon, along the same spline
    smooth_d draws, so the volume and the drawn edge agree."""
    P = [(p[0], p[1]) for p in pts]
    corner = [len(p) > 2 and p[2] for p in pts]
    k, out, m_ = 1 / 6.0, [], len(P)
    for i in range(m_):
        p0, p1, p2, p3 = P[(i - 1) % m_], P[i], P[(i + 1) % m_], P[(i + 2) % m_]
        c1 = p1 if corner[i] else (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k)
        c2 = p2 if corner[(i + 1) % m_] else (p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k)
        for s in range(n):
            t = s / float(n)
            a, b, c, d = (1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3
            out.append((a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]))
    return out


def bourse_form(poly):
    """The bird's volume from its traced outline alone (`poly`, as laid on
    the mark). The outline is inflated the way a membrane is under even
    pressure (the Poisson equation, solved by over-relaxation) and the
    height is the square root of that: a disc comes out a true sphere, and
    the head, the throat and the breast take whatever roundness their
    outline gives them, with no ellipse laid in by hand. The slope is held
    under sixty-two degrees, so the form turns away at its edge as a broad
    plane and never as a hairline rim. Returns light(x, y)."""
    key = tuple((round(p[0], 2), round(p[1], 2)) for p in poly)
    if key in BOURSE_FORM:
        return BOURSE_FORM[key]
    step = 0.5
    x0, y0 = min(p[0] for p in poly) - 2 * step, min(p[1] for p in poly) - 2 * step
    nx = int((max(p[0] for p in poly) - x0) / step) + 3
    ny = int((max(p[1] for p in poly) - y0) / step) + 3
    ins = bourse_fill(poly, x0, y0, step, nx, ny)
    u = [[0.0] * nx for _ in range(ny)]
    cells = [(j, i) for j in range(1, ny - 1) for i in range(1, nx - 1) if ins[j][i]]
    w, h2 = 1.93, step * step
    for _ in range(260):
        for j, i in cells:
            r = u[j]
            g = (r[i - 1] + r[i + 1] + u[j - 1][i] + u[j + 1][i] + h2) * 0.25
            r[i] += w * (g - r[i])
    z = [[2.0 * math.sqrt(max(0.0, v)) for v in row] for row in u]
    g_max = math.tan(math.radians(60))
    raw = [[lam((0, 0, 1))] * nx for _ in range(ny)]
    for j in range(1, ny - 1):
        for i in range(1, nx - 1):
            gx = (z[j][i + 1] - z[j][i - 1]) / (2 * step)
            gy = (z[j + 1][i] - z[j - 1][i]) / (2 * step)
            g = math.hypot(gx, gy)
            if g > g_max:
                gx, gy = gx * g_max / g, gy * g_max / g
            raw[j][i] = lam((-gx, gy, 1.0))
    # one pass of a 3x3 box, so no plane's edge carries the grid's step
    lam_ = [row[:] for row in raw]
    for j in range(1, ny - 1):
        for i in range(1, nx - 1):
            lam_[j][i] = sum(raw[j + a][i + b] for a in (-1, 0, 1) for b in (-1, 0, 1)) / 9.0

    def light(x, y):
        fx, fy = (x - x0) / step - 0.5, (y - y0) / step - 0.5
        i, j = int(math.floor(fx)), int(math.floor(fy))
        if i < 0 or j < 0 or i >= nx - 1 or j >= ny - 1:
            return lam((0, 0, 1))
        tx, ty = fx - i, fy - j
        return ((lam_[j][i] * (1 - tx) + lam_[j][i + 1] * tx) * (1 - ty)
                + (lam_[j + 1][i] * (1 - tx) + lam_[j + 1][i + 1] * tx) * ty)
    BOURSE_FORM[key] = light
    return light


def bourse_turn(v, axis, profile, tones, cuts, cap=True, small=False):
    """A turned part for the perch: a solid of revolution about the view's
    x or y axis through the origin of `v`, from a profile of (t0, t1, r0,
    r1) bands, bottom up (or left to right). Each band is cut only where
    its tone changes along the key light, and each run of one tone is laid
    as one strip; a band's top face follows it, under the band above."""
    def P(t, r, a):
        if axis == 'y':
            return v.proj((r * math.cos(a), t, r * math.sin(a)))[:2]
        return v.proj((t, r * math.sin(a), r * math.cos(a)))[:2]

    def N(dr, a):
        if axis == 'y':
            return v.nrm((math.cos(a), dr, math.sin(a)))
        return v.nrm((dr, math.sin(a), math.cos(a)))
    out, n = [], 96

    def lay(polys, tone):
        d = ' '.join(S.pts_d(S.rdp(p, 0.12 if small else 0.05)) for p in polys)
        out.append('<path d="%s" fill="%s" stroke="%s" stroke-width=".1"/>' % (d, tone, tone))
    for i, (t0, t1, r0, r1) in enumerate(profile):
        dr = (r0 - r1) / max(0.01, abs(t1 - t0)) * (1 if t1 > t0 else -1)
        seq = []
        for k in range(n):
            nv = N(dr, 2 * math.pi * (k + 0.5) / n)
            seq.append(S.quant(facet(lam(nv), tones, cuts)) if nv[2] > 0 else None)
        start = next((k for k in range(n) if seq[k] != seq[k - 1]), 0)
        runs, k0 = {}, start
        for step_ in range(1, n + 1):
            k = (start + step_) % n
            if step_ == n or seq[k] != seq[k0]:
                if seq[k0] is not None:
                    span = (k - k0) % n or n
                    a0, a1 = 2 * math.pi * k0 / n, 2 * math.pi * (k0 + span) / n
                    m_ = max(2, int(span / (12 if small else 6)) + 1)
                    angs = [a0 + (a1 - a0) * j / m_ for j in range(m_ + 1)]
                    runs.setdefault(seq[k0], []).append([P(t0, r0, a) for a in angs] + [P(t1, r1, a) for a in reversed(angs)])
                k0 = k
        for tone, polys in runs.items():
            lay(polys, tone)
        above = profile[i + 1][2] if i + 1 < len(profile) else 0.0
        if cap and axis == 'y' and r1 > above + 0.05:
            lay([[P(t1, r1, 2 * math.pi * k / 24) for k in range(24)]], S.quant(facet(lam(v.nrm((0, 1, 0))), tones, cuts)))
    return ''.join(out)


def bourse_sphere(m, name, cx, cy, r, tones, cuts, step=0.25):
    """A turned ball seen square on: a disc cut into the planes of a
    sphere under the key light."""
    def light(x, y):
        X, Y = (x - cx) / r, -(y - cy) / r
        q = min(0.995, X * X + Y * Y)
        return lam((X, Y, math.sqrt(1 - q)))
    disc = circle_d(cx, cy, r)
    return planes(m, name, disc, light, (cx - r - 0.5, cy - r - 0.5, cx + r + 0.5, cy + r + 0.5), tones, cuts, step, 0.05)


def bourse_perch(m, h, fx, fy, small=False):
    """The show perch the bird grips: a turned gilt bar with a ball at each
    end, on a baluster stem and a spreading foot whose rim is fired in the
    curtain's own olive gold (HUE's velvet), so the mark carries its cloth.
    Returns the height of the bar's axis."""
    gilt = [GILT[1], GILT[2], GILT[4], GILT[5], GILT[3]]
    gc = [0.18, 0.45, 0.7, 0.9]
    vo, vi = h['velvet']['onyx'], h['velvet']['ivory']
    band = [darken(vo, 0.45), darken(vo, 0.1), vo, vi, lighten(vi, 0.3)]
    rb = 2.1 if small else 1.8                            # the bar's radius
    cx = fx + 0.6                                         # the stem stands under the feet
    bar_y = fy + rb
    foot_y = 83.4
    # the stem and foot, bottom up, about a vertical axis (heights up from the foot)
    vs = S.View(cx, foot_y, 1.0, yaw=0, pitch=PITCH)
    top = foot_y - bar_y
    ws = 1.8 if small else 1.35                           # the stem's waist
    rim = [(0.0, 1.4, 7.2, 7.2)]
    stem = [(1.4, 2.0, 7.2, 6.4), (2.0, 2.9, 6.4, 4.0), (2.9, 3.8, 4.0, 2.2), (3.8, 4.6, 2.2, 1.5),
            (4.6, top - 3.6, ws, ws * 0.92)]
    collar = [(top - 1.3, top - 0.7, 1.4, 2.2), (top - 0.7, top, 2.2, 1.6)]
    # the bar, about a horizontal axis, a collar and a ball at each end
    vb = S.View(cx, bar_y, 1.0, yaw=0, pitch=PITCH)
    x_l, x_r = fx - 13.0, fx + 9.5
    prof = ([(x_l - 0.4, x_l + 0.5, 1.1, 2.2), (x_l + 0.5, x_l + 1.1, 2.2, rb)] + [(x_l + 1.1, x_r - 1.1, rb, rb)] +
            [(x_r - 1.1, x_r - 0.5, rb, 2.2), (x_r - 0.5, x_r + 0.4, 2.2, 1.1)])
    prof = [(a - cx, b - cx, r0, r1) for a, b, r0, r1 in prof]
    # the shadows the foot and the bar cast on the enamel, under everything
    base = [vs.proj((7.2 * math.cos(2 * math.pi * k / 48), 0.0, 7.2 * math.sin(2 * math.pi * k / 48)))[:2] for k in range(48)]
    m.add(shadow(poly_d(base), 1.0, 1.0, 0.45))
    r = 1.8
    m.add(shadow('M%s %s H%s A%s %s 0 0 1 %s %s H%s A%s %s 0 0 1 %s %s Z'
                 % (f(x_l - 1.7), f(bar_y - r), f(x_r + 1.7), f(r), f(r), f(x_r + 1.7), f(bar_y + r),
                    f(x_l - 1.7), f(r), f(r), f(x_l - 1.7), f(bar_y - r)), 0.8, 1.2, 0.42))
    m.add(bourse_turn(vs, 'y', rim, band, [0.25, 0.5, 0.72, 0.9], cap=False, small=small))
    m.add(bourse_turn(vs, 'y', stem, gilt, gc, small=small))
    kx, ky, _ = vs.proj((0.0, top - 3.2, 0.0))
    m.add(bourse_sphere(m, 'knop', kx, ky, 1.9, gilt, gc, 0.5 if small else 0.2))
    m.add(bourse_turn(vs, 'y', collar, gilt, gc, small=small))
    m.add(bourse_turn(vb, 'x', prof, gilt, gc, cap=False, small=small))
    for k, bx_ in enumerate((x_l - 1.7, x_r + 1.7)):
        m.add(bourse_sphere(m, 'ball%d' % k, bx_, bar_y, 1.9, gilt, gc, 0.5 if small else 0.2))
    return bar_y


def bourse_place(x, y, s, turn):
    """Bird units to the mark: feet at (x, y), s mark units to a bird unit,
    the bird turned `turn` degrees head-up about its feet."""
    c, sn = math.cos(math.radians(turn)), math.sin(math.radians(turn))

    def T(pts):
        return [(x + s * (p[0] * c - p[1] * sn), y + s * (p[0] * sn + p[1] * c)) + tuple(p[2:]) for p in pts]
    return T


def bourse_bird(m, T, s, small=False):
    """Lay the canary through T (bourse_place). The plumage's planes are cut
    from the traced volume along the key light and clipped to the traced
    outline; the wing's feather masses take the same light in their own
    colours, so the planes run on across them."""
    B = BOURSE_BIRD
    light = bourse_form(bourse_curve(T(B['form'])))
    out_pts = T(B['outline'])
    outline = smooth_d(out_pts)
    box = (min(p[0] for p in out_pts) - 1, min(p[1] for p in out_pts) - 1,
           max(p[0] for p in out_pts) + 1, max(p[1] for p in out_pts) + 1)
    step, eps = (0.6, 0.22) if small else (0.34, 0.14)

    def cut(p, cuts):
        return (p[1:], cuts[1:]) if small else (p, cuts)

    def bx(pts):
        q = T(pts)
        return (min(p[0] for p in q) - 0.6, min(p[1] for p in q) - 0.6, max(p[0] for p in q) + 0.6, max(p[1] for p in q) + 0.6)
    out = [shadow(outline, 1.0, 1.4, 0.5)]
    out.append(planes(m, 'bird', outline, light, box, *cut(BOURSE_PLUMAGE, BOURSE_CUTS), step=step, eps=eps))
    # the tail: the far outer feather in shade under the near half
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(B['tail_far'])), BOURSE_FLIGHT[1]))
    out.append(planes(m, 'tail', smooth_d(T(B['tail'])), light, bx(B['tail']), *cut(BOURSE_FLIGHT, BOURSE_WING_CUTS),
                      step=step, eps=eps))
    # the folded wing: flight feathers, tertials, coverts, each lit alike
    wing = smooth_d(T(B['wing']))
    out.append(shadow(wing, 0.35, 0.5, 0.3))
    out.append(planes(m, 'flight', wing, light, bx(B['wing']), *cut(BOURSE_FLIGHT, BOURSE_WING_CUTS), step=step, eps=eps))
    if not small:
        ter = smooth_d(T(B['tertials']))
        out.append(shadow(ter, 0.3, 0.45, 0.3))
        out.append(planes(m, 'tert', ter, light, bx(B['tertials']), BOURSE_TERTIALS, BOURSE_WING_CUTS, step=step, eps=eps))
    cov = smooth_d(T(B['coverts']))
    out.append(shadow(cov, 0.3, 0.45, 0.28))
    out.append(planes(m, 'cov', cov, light, bx(B['coverts']), *cut(BOURSE_COVERTS, BOURSE_WING_CUTS), step=step, eps=eps))
    # the bill: horn, the upper mandible lit, the lower in shade
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(B['bill_lower'])), BOURSE_HORN[1]))
    out.append('<path d="%s" fill="%s"/>' % (smooth_d(T(B['bill_upper'])), BOURSE_HORN[0]))
    (ex, ey), = T([B['eye'][:2]])
    out.append('<circle cx="%s" cy="%s" r="%s" fill="#1d1309"/>' % (f(ex), f(ey), f(B['eye'][2] * s * (1.3 if small else 1))))
    return ''.join(out)


def bourse_taper(pts, w0, w1):
    """A filled limb along a polyline: w0 wide at its first point, w1 at its
    last, its end rounded."""
    n = len(pts)
    left, right = [], []
    for k, (x, y) in enumerate(pts):
        a = pts[max(k - 1, 0)]
        b = pts[min(k + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / ln, dx / ln
        hw = (w0 + (w1 - w0) * k / max(1, n - 1)) / 2
        left.append((x + nx * hw, y + ny * hw))
        right.append((x - nx * hw, y - ny * hw))
    (ex, ey), (px, py) = pts[-1], pts[-2]
    dx, dy = ex - px, ey - py
    ln = math.hypot(dx, dy) or 1.0
    tip = (ex + dx / ln * w1 * 0.45, ey + dy / ln * w1 * 0.45)
    return poly_d(left + [tip] + right[::-1])


def bourse_legs(T, bar, small=False, front=False):
    """The legs, or with front the feet. A tarsus is a slim filled taper from
    the heel, hidden under the flank feathers, down to the bar. The feet stand
    on the bar and grip it: three toes run forward over the top of the bar
    and curl down its near face, the hind toe back and down the same way,
    each with its dark claw where it turns under. The far foot's toes are
    shorter, most of them round the far side of the bar and out of sight."""
    cx_bar, bar_y, rb = bar
    out = []
    w = (2.8, 2.4) if small else (1.35, 0.95)
    for k, (heel, foot) in enumerate(BOURSE_BIRD['legs']):
        col = BOURSE_SHANK[k]
        (ax, ay), (bx, by) = T([heel, foot])
        by = bar_y - rb * 0.92
        if not front:
            out.append('<path d="%s" fill="%s"/>' % (bourse_taper([(ax, ay), (bx, by)], w[0], w[1]), col))
            if not small:
                # the lamp's side of the near tarsus
                out.append('<path d="%s" fill="%s" fill-opacity=".5"/>'
                           % (bourse_taper([(ax - w[0] * 0.28, ay), (bx - w[1] * 0.28, by)], w[0] * 0.35, w[1] * 0.3),
                              lighten(col, 0.35)))
            continue
        far = k == 1
        reach = 0.55 if far else 1.0
        tw = (2.0, 1.5) if small else (0.78, 0.5)
        toes = []
        fans = [(-2.9, 0.95)] if small else [(-1.8, 0.7), (-2.6, 0.95), (-3.2, 0.8)]
        for dx, down in fans:
            toes.append([(bx, by), (bx + dx * 0.45 * reach, by - 0.15), (bx + dx * 0.85 * reach, by + rb * 0.35),
                         (bx + dx * reach, by + rb * (0.9 + down * 0.5) * reach)])
        toes.append([(bx, by), (bx + 0.9 * reach, by - 0.05), (bx + 1.5 * reach, by + rb * 0.5),
                     (bx + 1.7 * reach, by + rb * 1.05 * reach)])
        for t in toes:
            out.append('<path d="%s" fill="%s"/>' % (bourse_taper(t, tw[0], tw[1]), col))
            if not small:
                # the claw, hooked under where the toe turns beneath the bar
                (px, py), (ex, ey) = t[-2], t[-1]
                dx, dy = ex - px, ey - py
                ln = math.hypot(dx, dy) or 1.0
                ux, uy = dx / ln, dy / ln
                c0 = (ex - uy * tw[1] * 0.45, ey + ux * tw[1] * 0.45)
                c1 = (ex + uy * tw[1] * 0.45, ey - ux * tw[1] * 0.45)
                tip = (ex + ux * 0.75 - uy * 0.2, ey + uy * 0.75 + ux * 0.2)
                out.append('<path d="%s" fill="#3a2716"/>' % poly_d([c0, tip, c1]))
    return ''.join(out)


def subject_bourse(m, h, small=False):
    """The canary the desk keeps on watch (its Watchtower watches two, and
    the desk speaks only when the air turns), alert on a turned gilt show
    perch: head up, the bill closed, the tail carried in line with the back.
    One charge on the enamel, filling it."""
    fx, fy, s, turn = 43.0, 67.0, 0.77, 7.0
    T = bourse_place(fx, fy, s, turn)
    bar_y = bourse_perch(m, h, fx, fy, small)
    bar = (fx + 0.6, bar_y, 2.1 if small else 1.8)
    m.add(bourse_legs(T, bar, small))
    m.add(bourse_bird(m, T, s, small))
    m.add(bourse_legs(T, bar, small, front=True))


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
    'pressroom': (ground_halftone, subject_pressroom, 'round'),
    'arsenal': (ground_perlage, subject_arsenal, 'round'),
    'bourse': (ground_lattice, subject_bourse, 'round'),
}
# Each charge sits inside a circle of about 39 units, so the enamel shows
# all round it and nothing is cropped by the fillet. A charge can be laid by
# a scale about a centre here: (scale, centre).
FIT = {'autopilot': (0.88, 48.0, 46.0)}


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
    gate's day card is printed in and the glass of its fanlight (HUE's ink
    and glass), which app.js reads from it."""
    rows = []
    for app in MARKS:
        rows.append('  <g id="mark-%s" data-ink="%s" data-glass="%s">%s</g>'
                    % (app, HUE[app]['ink'], HUE[app]['glass'], emblem(app)))
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
