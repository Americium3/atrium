"""Bake the cabinetry's textures: the two case woods, shagreen, slate and card.

The Statistics case is macassar ebony and the Almanac figured walnut, both
quarter-cut with the grain standing up the stiles. The Preferences panel's
wells are shagreen (ray skin: a field of small round denticles), the knife
switch stands on slate, and the Ledger's programme cards are laid paper.

Same method as scripts/materials.py, whose helpers this reuses: periodic FFT
noise, fixed seeds, so a re-run writes the committed files byte for byte.

Usage:  python scripts/cabinetry_tex.py
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import fbm, ramp, save, save_gray  # noqa: E402


def stripes(n, seed, count, wander, sharp):
    """Growth lines running DOWN the tile (grain vertical). count is an
    integer so the field wraps; the phase is pushed by noise that changes
    slowly along the grain and faster across it."""
    x = np.mgrid[0:n, 0:n][1] / n
    w = fbm(n, seed, 2.6, (1.0, 8.0)) - 0.5
    k = fbm(n, seed + 1, 1.3, (1.0, 24.0)) - 0.5
    thick = fbm(n, seed + 2, 1.8, (1.0, 20.0))
    ph = 2 * np.pi * (x * count + w * wander * 6 + k * count * 0.09)
    return np.power(np.abs(np.sin(ph)), sharp * (0.4 + 1.4 * thick))


def macassar_q(n=1024):
    """Quartered macassar ebony: near-black ground with honey stripes that
    swell, pinch and run out, pore scratches along the grain, and a faint
    across-grain ribbon so the stripes do not read as ruled."""
    bold = stripes(n, 301, 9, 1.1, 0.9)
    mid = stripes(n, 305, 23, 0.7, 2.2)
    streak = fbm(n, 309, 2.0, (1.0, 16.0))
    t = bold * 0.55 + mid * 0.22 + streak * 0.35
    t = np.clip((t - 0.30) * 1.8, 0, 1)
    base = ramp(t, [(0, (14, 9, 6)), (0.28, (30, 19, 11)), (0.55, (74, 47, 26)),
                    (0.8, (128, 86, 48)), (1, (170, 122, 72))])
    lines = stripes(n, 311, 90, 0.5, 9.0)
    pores = fbm(n, 313, 0.5, (1.0, 40.0))
    ribbon = fbm(n, 317, 2.8, (6.0, 1.0))
    shade = (1.0 - (1.0 - lines) * 0.32) * (0.9 + (pores - 0.5) * 0.18) * (0.92 + (ribbon - 0.5) * 0.3)
    return base * shade[..., None]


def walnut_fig(n=1024):
    """Figured American walnut: warm brown with dark flame streaks that
    wander and pinch, fine growth lines, and a fiddleback, the rippling
    across the grain that turns light and dark as the eye moves and is what
    makes a figured board look alive."""
    streak = fbm(n, 321, 2.2, (1.0, 14.0))
    flame = stripes(n, 322, 7, 1.4, 1.6)
    lines = stripes(n, 323, 46, 0.6, 5.0)
    y = np.mgrid[0:n, 0:n][0] / n
    wob = fbm(n, 325, 2.4, (3.0, 1.0)) - 0.5
    fiddle = np.sin(2 * np.pi * (y * 48 + wob * 4.0))
    fiddle = np.sign(fiddle) * np.power(np.abs(fiddle), 0.6)
    fmask = np.clip(fbm(n, 327, 2.6) * 1.8 - 0.35, 0, 1)
    t = streak * 0.6 + (1 - flame) * 0.2 + (fbm(n, 329, 0.6, (1.0, 30.0)) - 0.5) * 0.12
    t = np.clip((t - 0.15) * 1.2, 0, 1)
    base = ramp(t, [(0, (58, 36, 20)), (0.35, (92, 62, 38)), (0.65, (124, 88, 56)),
                    (0.88, (156, 114, 74)), (1, (182, 138, 92))])
    shade = (1.0 - (1.0 - lines) * 0.30) * (1.0 + fiddle * 0.22 * fmask)
    return base * shade[..., None]


def shagreen(n=512, seed=331):
    """Galuchat, ray skin as Dunand and Ruhlmann used it: small round
    denticles packed edge to edge and ground flat on top, so each one is a
    polished plateau with a rounded rim, and the dye lies in the gaps
    between them. Grey, for soft-light over the well colour."""
    rng = np.random.default_rng(seed)
    h = np.zeros((n, n))
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64)
    cell = 8
    gy0, gx0 = np.mgrid[0:n // cell, 0:n // cell]
    # a jittered grid, every other row offset half a cell, is how the skin
    # packs: near-hexagonal, never clumped and never bare
    pts = np.stack([(gy0 + 0.5) * cell, (gx0 + 0.5 + (gy0 % 2) * 0.5) * cell], -1).reshape(-1, 2)
    pts += rng.uniform(-1.6, 1.6, pts.shape)
    rad = rng.uniform(3.0, 4.6, len(pts))
    for (py, px), r in zip(pts, rad):
        y0, y1 = int(py - r - 1), int(py + r + 2)
        x0, x1 = int(px - r - 1), int(px + r + 2)
        for oy in (0, n, -n):
            for ox in (0, n, -n):
                ya, yb = max(0, y0 + oy), min(n, y1 + oy)
                xa, xb = max(0, x0 + ox), min(n, x1 + ox)
                if ya >= yb or xa >= xb:
                    continue
                dy = yy[ya:yb, xa:xb] - (py + oy)
                dx = xx[ya:yb, xa:xb] - (px + ox)
                d = np.sqrt(dx * dx + dy * dy) / r
                dome = np.sqrt(np.clip(1 - d * d, 0, 1)) * r
                h[ya:yb, xa:xb] = np.maximum(h[ya:yb, xa:xb], dome)
    cap = np.minimum(h, 2.2)                      # ground flat on top
    gy, gx = np.gradient(cap)
    light = -(gx * 0.7 + gy * 0.7)
    gap = (h < 0.4).astype(np.float64)
    g = 0.56 + light * 0.16 - gap * 0.22 + (cap / 2.2 - 0.5) * 0.10
    g += (fbm(n, seed + 1, 1.0) - 0.5) * 0.10
    return np.clip(g, 0, 1)


def slate(n=512):
    """Slate: blue-black, a fine cleavage running one way, faint sheen."""
    cleave = fbm(n, 341, 1.1, (18.0, 1.0))
    body = fbm(n, 343, 2.2)
    grit = fbm(n, 345, 0.4)
    t = cleave * 0.45 + body * 0.4 + grit * 0.15
    return ramp(t, [(0, (22, 25, 28)), (0.5, (40, 44, 48)), (1, (66, 70, 74))])


def laid_card(n=512):
    """Laid card stock: fine laid lines across, a chain line every so often,
    and felted fibre. Grey, for multiply/soft-light over the card tint."""
    y, x = np.mgrid[0:n, 0:n] / n
    laid = np.sin(2 * np.pi * y * 128) * 0.5 + 0.5
    chain = np.exp(-np.square(((x * 8) % 1.0) - 0.5) * 900)
    fibre = fbm(n, 351, 0.9) * 0.6 + fbm(n, 352, 1.8, (3.0, 1.0)) * 0.4
    g = 0.55 + (laid - 0.5) * 0.05 - chain * 0.05 + (fibre - 0.5) * 0.22
    return np.clip(g, 0, 1)


BAKES = [
    ("veneer-macassar-q", macassar_q, "rgb"),
    ("veneer-walnut-fig", walnut_fig, "rgb"),
    ("grain-shagreen", shagreen, "gray"),
    ("stone-slate", slate, "rgb"),
    ("grain-card", laid_card, "gray"),
]


def main():
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    for name, fn, kind in BAKES:
        if only and name not in only:
            continue
        data = fn()
        path = save(name, data) if kind == "rgb" else save_gray(name, data)
        print("%-24s %6.1f KB" % (name, os.path.getsize(path) / 1024))


if __name__ == "__main__":
    main()
