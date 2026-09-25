"""True forms for the app marks: a small orthographic modeller.

The marks draw their subjects from the real object's geometry (a paraboloid
dish, a sphere and its graticule, a cage of wires, a salver's well) and shade
each plane by its angle to the hall's one key light, up and to the left and a
little in front. Everything here is pure geometry; icons/gen.py decides the
colours and writes the SVG.
"""
import math


def norm(v):
    ln = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / ln for c in v)


# The hall's key light in view space (x right, y up, z toward the viewer).
KEY = norm((-0.55, 0.62, 0.58))


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def mul(a, k):
    return (a[0] * k, a[1] * k, a[2] * k)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def basis(axis):
    """Two unit vectors perpendicular to `axis` and to each other."""
    a = norm(axis)
    ref = (0.0, 1.0, 0.0) if abs(a[1]) < 0.9 else (1.0, 0.0, 0.0)
    u = norm(cross(ref, a))
    v = cross(a, u)
    return u, v, a


class View:
    """Orthographic camera: world y is up; yaw turns about y, pitch tips the
    world toward the viewer (positive pitch = seen from above)."""

    def __init__(self, cx, cy, s, yaw=0.0, pitch=0.0):
        self.cx, self.cy, self.s = cx, cy, s
        self.cy_, self.sy_ = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
        self.cp_, self.sp_ = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))

    def rot(self, p):
        x, y, z = p
        x, z = x * self.cy_ + z * self.sy_, -x * self.sy_ + z * self.cy_
        y, z = y * self.cp_ - z * self.sp_, y * self.sp_ + z * self.cp_
        return (x, y, z)

    def proj(self, p):
        x, y, z = self.rot(p)
        return (self.cx + self.s * x, self.cy - self.s * y, z)

    def nrm(self, n):
        return self.rot(n)


def lambert(n_view, amb=0.18, wrap=0.0):
    d = dot(norm(n_view), KEY)
    d = (d + wrap) / (1 + wrap)
    return amb + (1 - amb) * max(0.0, d)


def spec(n_view, power=18):
    """Blinn highlight toward the viewer."""
    h = norm(add(KEY, (0, 0, 1)))
    return max(0.0, dot(norm(n_view), h)) ** power


def hexrgb(c):
    c = c.lstrip('#')
    return [int(c[i:i + 2], 16) for i in (0, 2, 4)]


def rgbhex(v):
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(round(x)))) for x in v)


def ramp(cols, t):
    """Interpolate along a list of hex colours, t in 0..1."""
    t = max(0.0, min(1.0, t))
    k = t * (len(cols) - 1)
    i = min(int(k), len(cols) - 2)
    a, b = hexrgb(cols[i]), hexrgb(cols[i + 1])
    u = k - i
    return rgbhex([x + (y - x) * u for x, y in zip(a, b)])


def fmt(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def pts_d(pts, close=True):
    d = 'M' + ' L'.join('%s %s' % (fmt(x), fmt(y)) for x, y in pts)
    return d + (' Z' if close else '')


class Faces:
    """Painter's list of projected polygons."""

    def __init__(self):
        self.items = []

    def add(self, pts2, depth, fill, extra=''):
        self.items.append((depth, pts2, fill, extra))

    def svg(self, seam=0.18):
        """Back to front. Consecutive faces of one colour share a path, so a
        turned surface costs a handful of elements, not one per facet."""
        out, run, run_fill = [], [], None

        def flush():
            if run:
                sw = (' stroke="%s" stroke-width="%s"' % (run_fill, fmt(seam))) if seam else ''
                out.append('<path d="%s" fill="%s"%s/>' % (' '.join(run), run_fill, sw))
        for depth, pts2, fill, extra in sorted(self.items, key=lambda it: it[0]):
            fill = quant(fill)
            if extra:
                flush()
                run, run_fill = [], None
                sw = (' stroke="%s" stroke-width="%s"' % (fill, fmt(seam))) if seam else ''
                out.append('<path d="%s" fill="%s"%s%s/>' % (pts_d(pts2), fill, sw, extra))
                continue
            if fill != run_fill:
                flush()
                run, run_fill = [], fill
            run.append(pts_d(pts2))
        flush()
        return ''.join(out)


def quant(c, step=6):
    """Round a colour to a coarse grid, so neighbouring facets that differ
    by less than the eye can see share a fill."""
    v = hexrgb(c)
    return rgbhex([min(255, round(x / step) * step) for x in v])


# --------------------------------------------------------------------------
# Signed distance outlines: forged and turned profiles (a spanner's jaws,
# a fillet where the shank meets the head) traced as real contours.
# --------------------------------------------------------------------------
def sd_circle(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r


def sd_capsule(px, py, ax, ay, bx, by, ra, rb=None):
    """Distance to a segment whose radius runs from ra at a to rb at b."""
    rb = ra if rb is None else rb
    dx, dy = bx - ax, by - ay
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy or 1)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - ax - dx * t, py - ay - dy * t) - (ra + (rb - ra) * t)


def smin(a, b, k):
    h = max(k - abs(a - b), 0.0) / k
    return min(a, b) - h * h * k * 0.25


def contours(sdf, x0, y0, x1, y1, step, level=0.0):
    """Marching squares over sdf(x, y); returns closed loops of points."""
    nx, ny = int((x1 - x0) / step) + 2, int((y1 - y0) / step) + 2
    g = [[sdf(x0 + i * step, y0 + j * step) - level for i in range(nx)] for j in range(ny)]
    segs = []

    def interp(i0, j0, i1, j1):
        a, b = g[j0][i0], g[j1][i1]
        t = a / (a - b) if a != b else 0.5
        return (x0 + (i0 + (i1 - i0) * t) * step, y0 + (j0 + (j1 - j0) * t) * step)
    for j in range(ny - 1):
        for i in range(nx - 1):
            c = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            inside = [g[b][a] < 0 for a, b in c]
            edges = []
            for k in range(4):
                a, b = c[k], c[(k + 1) % 4]
                if inside[k] != inside[(k + 1) % 4]:
                    edges.append(interp(a[0], a[1], b[0], b[1]))
            if len(edges) == 2:
                segs.append((edges[0], edges[1]))
            elif len(edges) == 4:
                segs.append((edges[0], edges[1]))
                segs.append((edges[2], edges[3]))
    key = lambda p: (round(p[0], 5), round(p[1], 5))
    nbr = {}
    for a, b in segs:
        nbr.setdefault(key(a), []).append(b)
        nbr.setdefault(key(b), []).append(a)
    used, loops = set(), []
    for a, b in segs:
        if (key(a), key(b)) in used:
            continue
        loop = [a]
        prev, cur = a, b
        used.add((key(a), key(b)))
        used.add((key(b), key(a)))
        while key(cur) != key(a) and len(loop) < 100000:
            loop.append(cur)
            nxt = [q for q in nbr.get(key(cur), []) if key(q) != key(prev) and (key(cur), key(q)) not in used]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            used.add((key(prev), key(cur)))
            used.add((key(cur), key(prev)))
        if len(loop) > 2:
            loops.append(loop)
    return [rdp(lp, step * 0.18) for lp in loops]


def rdp(pts, eps):
    """Ramer-Douglas-Peucker simplification of a closed loop."""
    if len(pts) < 4:
        return pts

    def _rdp(seq):
        if len(seq) < 3:
            return seq
        (ax, ay), (bx, by) = seq[0], seq[-1]
        dx, dy = bx - ax, by - ay
        ln = math.hypot(dx, dy) or 1e-9
        best, idx = -1, 0
        for i in range(1, len(seq) - 1):
            px, py = seq[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / ln
            if d > best:
                best, idx = d, i
        if best > eps:
            return _rdp(seq[:idx + 1])[:-1] + _rdp(seq[idx:])
        return [seq[0], seq[-1]]
    half = len(pts) // 2
    return _rdp(pts[:half + 1])[:-1] + _rdp(pts[half:] + [pts[0]])[:-1]
