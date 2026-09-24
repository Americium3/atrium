"""Bake the signal desk's and the entrance's material tiles.

Kept apart from materials.py so the desk can be re-baked without touching
the room's tiles. Same rules: periodic FFT noise, fixed seeds, byte-stable.

- patina-statuary.webp: statuary bronze, as a signed relighting tile. Every
  pixel is either near-black or warm-white, with alpha for how far it pushes.
  Laid over a bronze ramp with plain alpha it darkens the brushing troughs and
  lifts the rubbed patches the way `overlay` would, with no blend mode on a
  layer that belongs to a machine that moves.
- house-curtain.webp: the house curtain for the entrance, one claret velvet
  drop three screens wide at the screen's height, baked straight to colour
  (pinch-pleated heading, folds of wandering pitch and depth, the pile), so
  the full-screen drop needs no blend either.

Usage:  python scripts/desk_materials.py
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import OUT, _smooth, fbm, ramp, save  # noqa: E402
from materials_gates import _velvet  # noqa: E402


def save_rgba(name, rgb, a, q=86):
    os.makedirs(OUT, exist_ok=True)
    arr = np.dstack([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8)
    img = Image.fromarray(arr, "RGBA")
    path = os.path.join(OUT, name + ".webp")
    img.save(path, "WEBP", quality=q, method=6)
    return path


def patina_statuary(n=512):
    """Statuary bronze: a chemical patina worn back by hands and cloths. The
    brushing runs vertically (the faces were dressed top to bottom) at two
    widths, heavier in some passes than others, with a few long scratches;
    the patina lies unevenly in slow clouds, and the casting shows pits.

    The tile is laid at about two texels to a screen pixel at 1x, so the
    brushing has to live in streaks two to six texels wide to survive the
    downsampling: the first bake's one-texel lines all but vanished."""
    from scipy.ndimage import gaussian_filter
    fine = fbm(n, 201, 1.1, (1.0, 40.0))
    fine = fine - gaussian_filter(fine, (0, 5), mode="wrap")
    fine = fine / (np.abs(fine).max() + 1e-9)
    broad = fbm(n, 202, 1.5, (1.0, 22.0))
    broad = broad - gaussian_filter(broad, (0, 22), mode="wrap")
    broad = broad / (np.abs(broad).max() + 1e-9)
    # the dresser's passes: some strips were worked harder than others
    passes = 0.55 + 0.9 * fbm(n, 207, 2.4, (1.0, 6.0))
    brush = (fine * 0.5 + broad * 0.5) * passes
    # a few long scratches, a texel or two wide, bright in their bed
    rng = np.random.default_rng(208)
    scr = np.zeros((n, n))
    for _ in range(14):
        x = rng.integers(0, n)
        y0 = rng.integers(0, n)
        ln = rng.integers(n // 6, n // 2)
        w = rng.uniform(0.6, 1.3)
        ys = np.arange(y0, y0 + ln) % n
        prof = np.sin(np.linspace(0, np.pi, ln)) ** 0.6
        for dx in (-1, 0, 1):
            scr[ys, (x + dx) % n] = np.maximum(scr[ys, (x + dx) % n], prof * np.exp(-(dx * dx) / (2 * w * w)))
    cloud = fbm(n, 203, 2.6) - 0.5
    blotch = np.clip((fbm(n, 204, 2.2) - 0.6) * 3.0, 0, 1)       # darker patina islands
    rub = np.clip((fbm(n, 205, 2.8) - 0.56) * 2.6, 0, 1)          # hand-worn, lighter
    pits = np.zeros((n, n))
    for _ in range(60):
        y, x = rng.integers(0, n, 2)
        r = rng.uniform(0.7, 1.9)
        yy, xx = np.ogrid[-4:5, -4:5]
        spot = np.exp(-(xx * xx + yy * yy) / (2 * r * r))
        ys, xs = (np.arange(y - 4, y + 5) % n), (np.arange(x - 4, x + 5) % n)
        pits[np.ix_(ys, xs)] = np.maximum(pits[np.ix_(ys, xs)], spot)
    g = 0.5 + brush * 0.24 + cloud * 0.30 - blotch * 0.17 + rub * 0.11 + scr * 0.16 - pits * 0.26
    g = np.clip(g, 0, 1)
    d = g - 0.5
    light = np.array([255, 226, 188], dtype=np.float64)
    dark = np.array([8, 4, 2], dtype=np.float64)
    rgb = np.where(d[..., None] > 0, light[None, None, :], dark[None, None, :])
    a = np.clip(np.abs(d) * 2.1, 0, 0.9)
    return rgb, a


def house_curtain(w=3000, h=1000, seed=241, folds=38, k=20.0):
    """The house curtain, one drop across the whole screen: wider than any
    screen's aspect (3:1), so at the height of the screen it never repeats.
    The first bake was the gates' fold map cut into a 640px tile, and at
    1920 the same folds came round every 540px, all dead vertical at one
    pitch and depth, a strip of corduroy (AR-31).

    Hung as a grand drape is. A heading tape across the top gathers the
    cloth into pinch pleats at even spacing; under it each pleat opens into
    its fold within a hand's breadth, and the folds relax from the pleats'
    even pitch into their own: widths wander +-34%, a few broad ones, a few
    deep ones, each boundary on its own slow path down the drop, and some
    folds split low where the drop hangs free. Under the folds the whole
    drop swells in a few broad bays. Shaded as velvet (materials_gates'
    _velvet: dark cores where the pile is seen end-on, a rim of sheen down
    every flank), lit from the footlights, so it brightens toward the hem.
    The pile is baked in at screen scale, a fine crushed grain."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    t = y / (h - 1)
    HEAD0, HEAD1 = 0.074, 0.098          # the heading tape (the drop's top 6% is off screen)
    tt = np.clip((t - HEAD1) / (1 - HEAD1), 0, 1)
    mean = w / folds
    even = (np.arange(folds) + 0.5) * mean
    widths = rng.uniform(0.66, 1.34, folds)
    widths[rng.choice(folds, 5, replace=False)] *= 1.7
    widths = widths / widths.sum() * w
    free = np.concatenate([[0.0], np.cumsum(widths)[:-1]]) + widths * 0.5
    free += even[0] - free[0] + rng.uniform(-0.3, 0.3) * mean
    relax = _smooth(np.clip(tt / 0.32, 0, 1))[:, 0]
    starts = np.zeros((h, folds))
    for i in range(folds):
        path = (fbm(h, seed + 10 + i, 4.2)[:, 0] - 0.5) * mean * 0.3
        starts[:, i] = even[i] * (1 - relax) + free[i] * relax + path * (0.15 + 0.85 * relax)
    u = np.zeros((h, w))
    idx = np.zeros((h, w), dtype=int)
    for i in range(folds):
        a = starts[:, i:i + 1]
        b = starts[:, (i + 1) % folds:(i + 1) % folds + 1] + (w if i == folds - 1 else 0)
        width = np.maximum(b - a, 6)
        uu = ((x - a) % w) / width
        inside = (uu >= 0) & (uu < 1)
        u = np.where(inside, uu, u)
        idx = np.where(inside, i, idx)
    amps = rng.uniform(0.55, 1.25, folds)
    amps[rng.choice(folds, 6, replace=False)] *= 1.55
    amp = amps[idx]
    skew = rng.uniform(0.75, 1.33, folds)[idx]
    us = np.power(np.clip(u, 0, 1), skew)
    # under the tape each fold is pinched to a narrow crest, and opens out
    pinch = 1 - _smooth(np.clip((t - HEAD1) / 0.07, 0, 1))
    expo = 0.8 + 2.4 * pinch
    depth = amp * (0.62 + 0.55 * tt) * (0.55 + 0.45 * (1 - pinch))
    z = np.power(np.sin(np.pi * us), expo) * depth
    split = rng.uniform(0, 1, folds)[idx] < 0.4
    at = rng.uniform(0.35, 0.7, folds)[idx]
    grow = _smooth(np.clip((tt - at) / 0.3, 0, 1))
    cpos = rng.uniform(0.4, 0.6, folds)[idx]
    crease = np.exp(-((us - cpos) / 0.1) ** 2) * 0.34
    z = z - np.where(split, crease * grow * depth, 0)
    zn = z / (depth + 1e-6)
    # the broad bays, periodic across the drop, deeper where it hangs free
    xr = x / w * 2 * np.pi
    big = (np.cos(xr * 2 + 0.7) * 0.9 + np.cos(xr * 3 + 2.1) * 0.7 + np.cos(xr * 5 + 4.0) * 0.45
           + np.cos(xr * 7 + 1.3) * 0.25)
    big = big * (0.5 + 0.9 * tt)
    zt = np.where(t < HEAD1, 0.25 + big * 0.2, z + big * 2.2)
    ao = 0.28 + 0.72 * _smooth(np.clip(zn * 1.25, 0, 1))
    ao = np.where(t < HEAD1, 0.8, ao)
    lum = _velvet(zt, k, (-0.22, 0.42, 0.88), ao)
    lum *= 0.62 + 0.38 * _smooth(tt)
    crush = fbm(1024, seed + 3, 2.0) - 0.5
    crush = np.tile(crush, (h // 1024 + 1, w // 1024 + 1))[:h, :w]
    lum *= 1 + crush * 0.16
    # the tape's two edges, in the shadow of the cloth gathered under them
    edge = np.exp(-((t - HEAD1) / 0.004) ** 2) * 0.55 + np.exp(-((t - HEAD0) / 0.003) ** 2) * 0.4
    lum *= 1 - edge
    lum = lum / np.percentile(lum, 99.3)
    rgb = ramp(lum, [
        (0.00, (8, 1, 3)),
        (0.18, (30, 4, 9)),
        (0.40, (70, 11, 20)),
        (0.58, (100, 18, 29)),
        (0.76, (132, 32, 42)),
        (0.90, (170, 62, 64)),
        (1.00, (206, 112, 104)),
    ])
    # the pile itself, a fine crushed grain at screen scale
    pile = fbm(256, seed + 4, 0.8) - 0.5
    pile = pile / np.abs(pile).max()
    pile = np.tile(pile, (h // 256 + 1, w // 256 + 1))[:h, :w]
    return rgb * (1 + 0.14 * pile)[..., None]


def main():
    rgb, a = patina_statuary()
    p = save_rgba("patina-statuary", rgb, a)
    print("%-24s %6.1f KB" % ("patina-statuary", os.path.getsize(p) / 1024))
    p = save("house-curtain", house_curtain(), q=82)
    print("%-24s %6.1f KB" % ("house-curtain", os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
