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
from scipy.ndimage import gaussian_filter, map_coordinates

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import (OUT, ROOT, fbm, ramp, band_veins, flow_veins, ridges,  # noqa: E402
                       _height_to_rgb)


def save(name, rgb, q=86, alpha=None):
    os.makedirs(OUT, exist_ok=True)
    arr = np.clip(rgb, 0, 255).astype(np.uint8)
    if alpha is not None:
        a = np.clip(alpha * 255, 0, 255).astype(np.uint8)
        img = Image.fromarray(np.dstack([arr, a]), "RGBA")
    else:
        img = Image.fromarray(arr, "RGB")
    path = os.path.join(OUT, name + ".webp")
    img.save(path, "WEBP", quality=q, method=6)
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

def _layers(n, seed, mean=9.0):
    """A 1-D stack of onyx laminae: layer thickness and translucency drawn
    at random, periodic over n. Returns translucency per depth pixel and a
    fine lamination term."""
    rng = np.random.default_rng(seed)
    t = np.zeros(n)
    pos = 0
    while pos < n:
        th = int(max(2, rng.gamma(1.6, mean / 1.6)))
        v = rng.beta(1.3, 1.1)
        if rng.random() < 0.08:          # a milky calcite band: opaque, pale
            v = -1.0
        t[pos:pos + th] = v
        pos += th
    t = t[:n]
    milky = (t < 0).astype(np.float64)
    t = np.where(t < 0, 0.25, t)
    # soften the layer edges a touch, wrapping, so bands are crisp not stepped
    k = np.concatenate([t[-6:], t, t[:6]])
    k = np.convolve(k, np.ones(3) / 3, mode="same")[6:-6]
    m = np.concatenate([milky[-6:], milky, milky[:6]])
    m = np.convolve(m, np.ones(5) / 5, mode="same")[6:-6]
    fine = 0.5 + 0.5 * np.sin(np.arange(n) * 2 * np.pi * 61 / n + rng.uniform(0, 6.28))
    return k, m, fine


def onyx(n=1024, seed=231, lit=True):
    """Mexican onyx (banded calcite), the Chrysler practicals: laminae that
    run across the slab in long gentle waves, never the closed rings of a
    wood figure. Lit, the thin clear layers pass the lamp and the thick or
    milky ones hold it back; by day it is honey stone with a waxy face."""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64)
    # depth coordinate: the layers run along x, undulating in y
    w1 = fbm(n, seed + 1, 3.4) - 0.5
    w2 = fbm(n, seed + 2, 2.6) - 0.5
    depth = (yy + w1 * n * 0.22 + w2 * n * 0.035) % n
    trans, milky, fine = _layers(n, seed)
    tr = map_coordinates(trans, [depth.ravel()], order=1, mode="grid-wrap").reshape(n, n)
    mk = map_coordinates(milky, [depth.ravel()], order=1, mode="grid-wrap").reshape(n, n)
    fn = map_coordinates(fine, [depth.ravel()], order=1, mode="grid-wrap").reshape(n, n)
    cloud = fbm(n, seed + 3, 1.9)
    t = np.clip(tr * 0.78 + (fn - 0.5) * 0.10 + (cloud - 0.5) * 0.22, 0, 1)
    if lit:
        rgb = ramp(t, [(0.0, (70, 28, 8)), (0.25, (142, 64, 18)), (0.5, (206, 118, 40)),
                       (0.75, (242, 176, 92)), (1.0, (255, 226, 170))])
        milk = np.array([252, 214, 160], dtype=np.float64)
        rgb = rgb * (1 - mk[..., None] * 0.55) + milk * (mk[..., None] * 0.55)
    else:
        rgb = ramp(t, [(0.0, (120, 84, 46)), (0.35, (166, 124, 76)), (0.7, (206, 172, 124)),
                       (1.0, (230, 208, 170))])
        milk = np.array([240, 230, 210], dtype=np.float64)
        rgb = rgb * (1 - mk[..., None] * 0.7) + milk * (mk[..., None] * 0.7)
        # a polished face: the lamination shows as a faint change of gloss
        rgb *= (0.97 + 0.06 * fn)[..., None]
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


def mast_frieze_height(w=192, h=72):
    """The masthead's panel: the Paramount canopy's vocabulary in cast
    gilt. A zig-zag ribbon above and below, and between them a stepped
    lozenge on a boss alternating with a trio of reeds. Periodic in x, one
    lozenge and one reed trio per tile."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float64) + 0.5
    H = np.zeros((h, w))
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
    return gaussian_filter(H, 0.7, mode="wrap")


def mast_frieze(day=False):
    H = mast_frieze_height()
    if day:
        # skylight from above: cream plaster ground, the ornament in gilt
        rgb = _height_to_rgb(H, (-0.3, -0.8, 0.6), (226, 212, 182), (226, 186, 104),
                             0.22, 0.64, 0.50, spec=0.45)
    else:
        # lit from below by the marquee's bulbs, a hand's breadth under it
        rgb = _height_to_rgb(H, (-0.2, 0.85, 0.45), (38, 26, 12), (206, 158, 76),
                             0.72, 0.14, 1.08, spec=0.65)
        yy = np.mgrid[0:H.shape[0], 0:H.shape[1]][0] / H.shape[0]
        rgb *= (0.62 + 0.62 * np.power(yy, 1.2))[..., None]
    return rgb


def vein_gray(n=512, seed=301):
    """Grey marble figure (mean 0.5) for soft-light over the floor's cut
    stones: a cloud and a few flowing veins, so every slab of the medallion
    reads as quarried stone, whatever colour it is cut from."""
    cloud = fbm(n, seed, 1.8)
    v = (flow_veins(n, seed + 1, 2.4, (1.6, 1.0), 0.10, 30, 0.8) * 0.8
         + ridges(n, seed + 2, 2.2, 140) * 0.4)
    lum = 0.5 + (cloud - 0.5) * 0.40 + np.clip(v, 0, 1) * 0.46
    g = np.clip(lum, 0, 1) * 255
    return np.dstack([g, g, g])


BAKES = [
    ("room-portoro", lambda: portoro_calm(), None),
    ("room-onyx-lit", lambda: onyx(lit=True), None),
    ("room-onyx-day", lambda: onyx(lit=False), None),
    ("room-dentil-night", lambda: dentils(False), None),
    ("room-dentil-day", lambda: dentils(True), None),
    ("room-mfrieze-night", lambda: mast_frieze(False), None),
    ("room-mfrieze-day", lambda: mast_frieze(True), None),
    ("room-veins", lambda: vein_gray(), None),
]


def main():
    written = []
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    for name, fn, _ in BAKES:
        if only and name not in only:
            continue
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
