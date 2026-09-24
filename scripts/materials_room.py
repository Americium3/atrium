"""Bake the room's own textures: the masthead, the cornice, the pier lights
and the stone the wall stands on.

Kept apart from materials.py so the room can be re-baked without touching the
gates' tiles. It borrows that module's noise, ramps and relighting, so every
tile here is periodic and reproducible byte for byte the same way.

Usage:  python scripts/materials_room.py            # write static/assets/tex/room-*.webp
        python scripts/materials_room.py --sheet    # also write a contact sheet
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, gaussian_filter1d, map_coordinates

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import (OUT, ROOT, fbm, ramp, band_veins, flow_veins, ridges,  # noqa: E402
                       _height_to_rgb)


def save(name, rgb, q=86, alpha=None, alpha_q=100):
    os.makedirs(OUT, exist_ok=True)
    arr = np.clip(rgb, 0, 255).astype(np.uint8)
    if alpha is not None:
        a = np.clip(alpha * 255, 0, 255).astype(np.uint8)
        img = Image.fromarray(np.dstack([arr, a]), "RGBA")
    else:
        img = Image.fromarray(arr, "RGB")
    path = os.path.join(OUT, name + ".webp")
    img.save(path, "WEBP", quality=q, method=6, alpha_quality=alpha_q)
    return path


# ---------------------------------------------------------------- stone

def portoro_calm(n=1024):
    """Portoro for the fascia and the dado, quieter than the gates' bake:
    the gold runs thin and broken, most of the slab is warm black, and the
    veins lie along the slab instead of slashing across it."""
    base = fbm(n, 211, 2.5)
    cloud = fbm(n, 212, 1.7)
    ground = ramp(base * 0.65 + cloud * 0.35, [
        (0.0, (9, 8, 7)), (0.5, (19, 16, 13)), (1.0, (33, 28, 22))])
    major = band_veins(n, 213, 2.6, (2.6, 1.0), 0.09, 0.001, 0.028, shear=0)
    # the gold is not continuous: it pinches out along the run
    gate = np.clip(fbm(n, 219, 2.2) * 1.8 - 0.55, 0, 1)
    major *= gate
    feather = flow_veins(n, 216, 2.4, (2.2, 1.0), 0.10, 26, 0.9) * 0.40
    minor = flow_veins(n, 214, 2.2, (1.2, 1.8), 0.06, 110) * 0.35
    hair = ridges(n, 215, 2.1, 190) * 0.22
    gold = np.array([168, 132, 64], dtype=np.float64)
    pale = np.array([196, 180, 142], dtype=np.float64)
    grey = np.array([96, 88, 74], dtype=np.float64)
    rgb = ground.copy()
    for v, col, k in ((hair, grey, 0.6), (minor, pale, 0.55), (feather, gold, 0.7), (major, gold, 0.9)):
        rgb = rgb * (1 - v[..., None] * k) + col[None, None, :] * (v[..., None] * k)
    return rgb


# ---------------------------------------------------------------- onyx

def _strata(n, seed, mean=12.0):
    """A 1-D stack of onyx laminae, periodic over n: each layer its own
    thickness and clarity, and the fine growth lines inside them."""
    rng = np.random.default_rng(seed)
    t = np.zeros(n)
    pos = 0
    while pos < n:
        th = int(max(2, rng.gamma(1.3, mean / 1.3)))
        t[pos:pos + th] = rng.beta(0.9, 0.9)
        pos += th
    t = gaussian_filter1d(t[:n], 1.2, mode="wrap")
    g = 0.5 + 0.5 * np.sin(np.arange(n) * 2 * np.pi * 131 / n + rng.uniform(0, 6.28))
    return t, g


def _along(arr, depth):
    return map_coordinates(arr, [depth.ravel()], order=1, mode="grid-wrap").reshape(depth.shape)


def _warped(f, n, seed, amt):
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64)
    a = fbm(n, seed, 3.0) - 0.5
    b = fbm(n, seed + 1, 3.0) - 0.5
    return map_coordinates(f, [yy + a * n * amt, xx + b * n * amt], order=1, mode="grid-wrap")


def _smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def onyx(n=1024, seed=451, lit=True):
    """Honey onyx for the pier lights, as a practical is glazed with it.

    What the eye takes for onyx rather than wood or agate is the light in
    it: a cloudy body the lamp gets through in pools, strata that bunch in
    some places and die out in others, milky calcite wisps, and a few dark
    veins wandering across the run. Lit, the clear runs burn white-gold and
    the thick ones go amber to rust. Unlit (by day) the same stone reverses:
    the clear runs look into dark depth and the milk is the palest thing in
    it, all of it muted and waxy. The two bakes share every field, so a pier
    is the same slab night and day."""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64)
    w1 = fbm(n, seed + 1, 3.4) - 0.5
    w2 = fbm(n, seed + 2, 2.4) - 0.5
    depth = (yy + w1 * n * 0.13 + w2 * n * 0.03) % n
    tr, gl = _strata(n, seed)
    B = _along(tr, depth)
    G = _along(gl, depth)
    bunch = _smooth(0.35, 0.75, fbm(n, seed + 3, 2.6))
    body = _warped(fbm(n, seed + 4, 2.0, (1.7, 1.0)), n, seed + 5, 0.16)
    body = (body - body.min()) / (body.max() - body.min())
    mw = _warped(fbm(n, seed + 7, 2.2, (2.6, 1.0)), n, seed + 8, 0.14)
    milk = _smooth(0.66, 0.9, (mw - mw.min()) / (mw.max() - mw.min())) * 0.9
    dv = flow_veins(n, seed + 9, 2.3, (1.0, 1.4), 0.12, 30, 0.9) * 0.8
    trans = body * (1 - 0.55 * bunch * (1 - B)) + 0.10 * bunch * (B - 0.5) + (G - 0.5) * 0.02
    trans = np.clip(trans, 0, 1)
    if lit:
        T = np.clip((trans - 0.06) / 0.86, 0, 1)
        rgb = ramp(T, [(0.0, (70, 22, 6)), (0.15, (130, 46, 10)), (0.33, (196, 92, 22)),
                       (0.52, (242, 150, 50)), (0.72, (255, 200, 112)), (0.88, (255, 228, 170)),
                       (1.0, (255, 246, 222))])
        # the milk scatters the lamp: pale cream, a shade under the clearest glass
        milkc = np.array([255, 222, 164.0]) * (0.90 + 0.10 * T[..., None])
        rgb = rgb * (1 - milk[..., None] * 0.55) + milkc * milk[..., None] * 0.55
        rgb = rgb * (1 - dv[..., None] * 0.45) + np.array([120, 38, 8.0]) * (dv[..., None] * 0.45)
    else:
        L = np.clip(0.24 + 0.36 * (1 - trans) + 0.46 * milk + (B - 0.5) * 0.22 * bunch
                    + (G - 0.5) * 0.04, 0, 1)
        rgb = ramp(L, [(0.0, (92, 66, 40)), (0.28, (138, 104, 66)), (0.52, (184, 150, 104)),
                       (0.76, (220, 198, 160)), (1.0, (244, 236, 218))])
        rgb = rgb * (1 - dv[..., None] * 0.35) + np.array([96, 68, 42.0]) * (dv[..., None] * 0.35)
    return rgb


# ---------------------------------------------------------------- relief

def _box(x, y, x0, x1, y0, y1, soft=1.2):
    """A raised block with slightly rounded arrises (height 0..1)."""
    fx = np.clip(np.minimum(x - x0, x1 - x) / soft, 0, 1)
    fy = np.clip(np.minimum(y - y0, y1 - y) / soft, 0, 1)
    return np.sqrt(np.clip(fx, 0, 1) * np.clip(fy, 0, 1))


def dentil_height(p=48, h=40):
    """One bay of the dentil course: a block and its gap, with a fillet over
    them and a bead under. Periodic in x at the dentil pitch."""
    y, x = np.mgrid[0:h, 0:p].astype(np.float64) + 0.5
    H = np.zeros((h, p))
    # the fillet the dentils hang from
    H = np.maximum(H, _box(x, y, -2, p + 2, 0, 5.5, 0.8) * 0.72)
    # the block: flat face, eased arrises, stands proud of everything
    H = np.maximum(H, _box(x, y, p * 0.18, p * 0.82, 5.5, h * 0.80, 1.6) * 1.0)
    # the gap is deep: the soffit behind sits well back
    H = np.maximum(H, ((y > 5.5) & (y < h * 0.80)) * 0.05)
    # a bead under the course
    by = h * 0.89
    bead = np.sqrt(np.clip(1 - ((y - by) / 3.6) ** 2, 0, 1))
    H = np.maximum(H, bead * 0.55)
    return gaussian_filter(H, 0.6, mode="wrap")


def dentils(day=False):
    H = dentil_height()
    if day:
        rgb = _height_to_rgb(H, (-0.35, -0.85, 0.55), (150, 118, 62), (226, 192, 120),
                             0.55, 0.40, 0.75, spec=0.45)
    else:
        # the marquee's bulbs hang just above: tops lit, faces falling to glaze
        rgb = _height_to_rgb(H, (-0.30, -0.90, 0.35), (40, 26, 12), (188, 142, 66),
                             0.85, 0.12, 1.05, spec=0.6)
    # the gap is a hole, not a surface: nearly black at night, deep umber by day
    y, x = np.mgrid[0:H.shape[0], 0:H.shape[1]].astype(np.float64) + 0.5
    gap = (H < 0.1) & (y > 5.5) & (y < H.shape[0] * 0.8)
    # cast shadow of each block to the right along the gap floor
    p = H.shape[1]
    sh = np.clip(1 - (x - p * 0.82) / (p * 0.14), 0, 1) * (x > p * 0.82)
    dark = np.array([20, 12, 6]) if not day else np.array([96, 70, 34])
    rgb[gap] = rgb[gap] * 0.25 + dark * 0.75
    rgb *= (1 - 0.35 * sh * gap)[..., None]
    return rgb


def mast_frieze_height(w=192, h=72, px=1):
    """The masthead's panel: the Paramount canopy's vocabulary in cast
    gilt. A zig-zag ribbon above and below, and between them a stepped
    lozenge on a boss alternating with a trio of reeds. Periodic in x, one
    lozenge and one reed trio per tile. Drawn in 1x design units and baked
    at `px` pixels to the unit: at 1x the panel drew it 1.1x up at dpr 2
    and it went soft (AR-37)."""
    y, x = (np.mgrid[0:h * px, 0:w * px].astype(np.float64) + 0.5) / px
    H = np.zeros((h * px, w * px))
    # fillets top and bottom
    H = np.maximum(H, _box(x, y, -4, w + 4, 1.5, 5.5, 0.8) * 0.8)
    H = np.maximum(H, _box(x, y, -4, w + 4, h - 5.5, h - 1.5, 0.8) * 0.8)
    # zig-zag ribbons: a raised rounded rib, 4 teeth per tile
    for yc, amp, sgn in ((13.5, 5.0, 1), (h - 13.5, 5.0, -1)):
        per = w / 4
        tri = np.abs(((x / per) % 1) - 0.5) * 2          # 1 at the joints, 0 mid
        zy = yc + sgn * (tri - 0.5) * 2 * amp
        d = np.abs(y - zy)
        rib = np.sqrt(np.clip(1 - (d / 2.4) ** 2, 0, 1))
        H = np.maximum(H, rib * 0.78)
    # the field's ground sits back; the ornament stands on it
    cy = h / 2
    # stepped lozenge centred in the tile
    cx = w * 0.25
    for k, (rx, lvl) in enumerate(((21.0, 0.42), (15.0, 0.66), (9.0, 0.9))):
        ry = rx * 0.78
        dd = np.abs(x - cx) / rx + np.abs(y - cy) / ry
        H = np.maximum(H, (dd < 1) * (lvl + (1 - dd) * 0.06))
    boss = np.sqrt(np.clip(1 - ((x - cx) ** 2 + (y - cy) ** 2) / 4.2 ** 2, 0, 1))
    H = np.maximum(H, (boss > 0) * (0.9 + boss * 0.12))
    # chevron wings either side of the lozenge, pointing at it
    for sgn in (-1, 1):
        for j in range(2):
            off = 27 + j * 7
            ax = cx + sgn * off
            dx = (x - ax) * sgn
            arm = np.abs(dx + np.abs(y - cy) * 0.62)       # a > opening outward
            m = (np.abs(y - cy) < 13) & (arm < 1.9)
            H = np.maximum(H, m * (0.62 - j * 0.1) * np.sqrt(np.clip(1 - (arm / 1.9) ** 2, 0, 1)))
    # the reed trio between lozenges
    rx0 = w * 0.75
    for j in (-1, 0, 1):
        fx = x - (rx0 + j * 6.5)
        reed = (np.abs(fx) < 2.4) & (np.abs(y - cy) < 12)
        prof = np.sqrt(np.clip(1 - (fx / 2.4) ** 2, 0, 1))
        cap = np.sqrt(np.clip(1 - (fx ** 2 + (np.abs(y - cy) - 12) ** 2) / 2.4 ** 2, 0, 1))
        H = np.maximum(H, reed * prof * (0.7 - abs(j) * 0.08))
        H = np.maximum(H, cap * (0.7 - abs(j) * 0.08))
    # small beads flanking the reeds
    for sgn in (-1, 1):
        bx = rx0 + sgn * 17
        for yy_ in (cy - 7, cy, cy + 7):
            b = np.sqrt(np.clip(1 - ((x - bx) ** 2 + (y - yy_) ** 2) / 2.3 ** 2, 0, 1))
            H = np.maximum(H, b * 0.6)
    return gaussian_filter(H, 0.7 * px, mode="wrap")


def mast_frieze(day=False, px=2):
    H = mast_frieze_height(px=px)
    if day:
        # skylight from above: cream plaster ground, the ornament in gilt
        rgb = _height_to_rgb(H, (-0.3, -0.8, 0.6), (226, 212, 182), (226, 186, 104),
                             0.22, 0.64, 0.50, spec=0.45, px=px)
    else:
        # lit from below by the marquee's bulbs, a hand's breadth under it
        rgb = _height_to_rgb(H, (-0.2, 0.85, 0.45), (38, 26, 12), (206, 158, 76),
                             0.72, 0.14, 1.08, spec=0.65, px=px)
        yy = np.mgrid[0:H.shape[0], 0:H.shape[1]][0] / H.shape[0]
        rgb *= (0.62 + 0.62 * np.power(yy, 1.2))[..., None]
    return rgb


def _chips(n, seed, count, rmin, rmax):
    """Terrazzo aggregate as grey shards on mid-grey (mean near 0.5): each
    chip an irregular polygon, light marble or dark, drawn wrapped so the
    tile repeats without a seam."""
    from PIL import ImageDraw
    rng = np.random.default_rng(seed)
    img = Image.new("L", (n, n), 128)
    dr = ImageDraw.Draw(img)
    for _ in range(count):
        cx, cy = rng.uniform(0, n, 2)
        r = rng.uniform(rmin, rmax) * (0.6 + 0.8 * rng.random() ** 2)
        k = int(rng.integers(5, 8))
        a0 = rng.uniform(0, 6.28)
        sq = rng.uniform(0.55, 1.0)
        pts = []
        for j in range(k):
            a = a0 + j / k * 6.2832 + rng.uniform(-0.3, 0.3)
            rr = r * rng.uniform(0.65, 1.0)
            pts.append((np.cos(a) * rr, np.sin(a) * rr * sq))
        v = int(rng.choice([40, 62, 84, 176, 204, 226], p=[0.18, 0.16, 0.14, 0.2, 0.18, 0.14]))
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                dr.polygon([(cx + x + ox, cy + y + oy) for x, y in pts], fill=v)
    return np.asarray(img, dtype=np.float64) / 255.0


def vein_gray(n=512, seed=301):
    """Grey figure (mean 0.5) for soft-light over the floor's inlaid stones.
    The medallion and roundels are poured terrazzo like the floor round
    them: each field carries its own aggregate (light marble and dark
    shards of several sizes) under a cloud and a few flowing veins, so a
    field reads as poured and ground stone whatever colour it is, rather
    than as a flat fill."""
    cloud = fbm(n, seed, 1.8)
    v = (flow_veins(n, seed + 1, 2.4, (1.6, 1.0), 0.10, 30, 0.8) * 0.8
         + ridges(n, seed + 2, 2.2, 140) * 0.4)
    lum = 0.5 + (cloud - 0.5) * 0.40 + np.clip(v, 0, 1) * 0.34
    big = _chips(n, seed + 3, 300, 3.0, 8.0)
    fine = _chips(n, seed + 4, 2600, 1.0, 2.6)
    chips = np.where(np.abs(big - 0.5) > 0.01, big, fine)
    lum = np.where(np.abs(chips - 0.5) > 0.01, lum * 0.35 + chips * 0.65, lum)
    g = np.clip(gaussian_filter(lum, 0.45, mode="wrap"), 0, 1) * 255
    return np.dstack([g, g, g])


def case_patina(n=512, seed=361):
    """The clock case's cast bronze, as a signed relighting tile like the
    desk's patina-statuary: every pixel is near-black or warm-white, with
    alpha for how far it pushes, so it lies over the case's bronze ramp in
    plain alpha. A cast face was never dressed with a brush, so nothing here
    runs one way: the chemical patina lies in clouds at two scales with
    darker islands, the wax is rubbed through to lighter metal in patches,
    the sand cast leaves a fine tooth, and pits with a lit lip are scattered
    through it, with a few short cleaning scratches in any direction. Laid
    at 380 units to the tile, the clouds span 60 to 120px of the case on a
    wide screen."""
    rng = np.random.default_rng(seed)
    clouds = fbm(n, seed, 2.3) - 0.5
    mid = fbm(n, seed + 1, 1.6) - 0.5
    tooth = fbm(n, seed + 2, 0.3) - 0.5
    islands = np.clip((fbm(n, seed + 3, 2.1) - 0.62) * 3.2, 0, 1)
    rub = np.clip((fbm(n, seed + 4, 2.5) - 0.57) * 2.8, 0, 1)
    pits = np.zeros((n, n))
    lips = np.zeros((n, n))
    yy, xx = np.ogrid[-5:6, -5:6]
    for _ in range(140):
        y, x = rng.integers(0, n, 2)
        r = rng.uniform(0.6, 1.8)
        spot = np.exp(-(xx * xx + yy * yy) / (2 * r * r))
        # the pit's far wall catches the key light: up and to the left
        lip = np.exp(-((xx + 1.1 * r) ** 2 + (yy + 1.3 * r) ** 2) / (2 * (r * 0.8) ** 2))
        ys, xs = (np.arange(y - 5, y + 6) % n), (np.arange(x - 5, x + 6) % n)
        pits[np.ix_(ys, xs)] = np.maximum(pits[np.ix_(ys, xs)], spot)
        lips[np.ix_(ys, xs)] = np.maximum(lips[np.ix_(ys, xs)], lip * 0.6)
    scr = np.zeros((n, n))
    for _ in range(18):
        x0, y0 = rng.uniform(0, n, 2)
        a = rng.uniform(0, np.pi)
        ln = rng.uniform(n * 0.04, n * 0.16)
        t = np.linspace(0, 1, int(ln * 2))
        xs = (x0 + np.cos(a) * ln * t).astype(int) % n
        ys = (y0 + np.sin(a) * ln * t).astype(int) % n
        scr[ys, xs] = np.maximum(scr[ys, xs], np.sin(t * np.pi) ** 0.7)
    scr = gaussian_filter(scr, 0.5, mode="wrap")
    scr = scr / (scr.max() + 1e-9)
    # centred a little under half: the glaze darkens more of the face than
    # the rubbing lifts
    g = (0.46 + clouds * 0.32 + mid * 0.22 + tooth * 0.22 - islands * 0.18 + rub * 0.15
         - pits * 0.30 + lips * 0.14 + scr * 0.12)
    d = np.clip(g, 0, 1) - 0.5
    # the lift is rubbed metal, warm and a little dull, never a white haze
    light = np.array([222, 176, 120], dtype=np.float64)
    dark = np.array([10, 5, 2], dtype=np.float64)
    rgb = np.where(d[..., None] > 0, light[None, None, :], dark[None, None, :])
    return rgb, np.clip(np.abs(d) * 2.0, 0, 0.85)


BAKES = [
    ("room-portoro", lambda: portoro_calm(), None),
    ("room-onyx-glow-lit", lambda: onyx(lit=True), None),
    ("room-onyx-glow-day", lambda: onyx(lit=False), None),
    ("room-dentil-night", lambda: dentils(False), None),
    ("room-dentil-day", lambda: dentils(True), None),
    ("room-mfrieze-night", lambda: mast_frieze(False), None),
    ("room-mfrieze-day", lambda: mast_frieze(True), None),
    ("room-inlay-figure", lambda: vein_gray(), None),
    ("room-case-patina", lambda: case_patina(), "rgba"),
]


def main():
    written = []
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    for name, fn, kind in BAKES:
        if only and name not in only:
            continue
        if kind == "rgba":
            rgb, a = fn()
            # a signed tile's alpha is noise too; lossless it doubles the file
            path = save(name, rgb, q=80, alpha=a, alpha_q=60)
        else:
            path = save(name, fn())
        written.append(path)
        print("%-22s %6.1f KB" % (name, os.path.getsize(path) / 1024))
    if "--sheet" in sys.argv:
        out = os.path.join(ROOT, "..", "_integ", "room", "work", "room-tex.png")
        tiles = []
        for p in written:
            im = Image.open(p).convert("RGB")
            s = 360 / max(im.size)
            tiles.append(im.resize((max(1, int(im.size[0] * s)), max(1, int(im.size[1] * s))), Image.NEAREST))
        sheet = Image.new("RGB", (4 * 370, ((len(tiles) + 3) // 4) * 370), (70, 70, 70))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % 4) * 370 + 5, (i // 4) * 370 + 5))
        sheet.save(os.path.abspath(out))
        print(os.path.abspath(out))


if __name__ == "__main__":
    main()
