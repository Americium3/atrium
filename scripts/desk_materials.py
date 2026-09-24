"""Bake the signal desk's and the entrance's material tiles.

Kept apart from materials.py so the desk can be re-baked without touching
the room's tiles. Same rules: periodic FFT noise, fixed seeds, byte-stable.

- patina-statuary.webp: statuary bronze, as a signed relighting tile. Every
  pixel is either near-black or warm-white, with alpha for how far it pushes.
  Laid over a bronze ramp with plain alpha it darkens the brushing troughs and
  lifts the rubbed patches the way `overlay` would, with no blend mode on a
  layer that belongs to a machine that moves.
- house-curtain.webp: the house curtain for the entrance, claret velvet folds
  baked straight to colour at screen scale (the gates' fold map, larger and
  with more folds), so the full-screen drop needs no blend either.

Usage:  python scripts/desk_materials.py
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import OUT, fbm, ramp, save, velvet_folds  # noqa: E402


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


def house_curtain(w=640, h=1280):
    """The house curtain at screen scale: the gates' fold map, cut wider with
    more folds, coloured claret. Valleys stay deep and saturated; the crests
    take the grazing sheen that turns velvet pink at the edge of a fold."""
    lum = velvet_folds(w, h, seed=221, folds=11)
    lum = (lum - 0.5) * 1.15 + 0.5
    return ramp(lum, [
        (0.00, (10, 1, 3)),
        (0.22, (34, 4, 9)),
        (0.45, (72, 12, 21)),
        (0.62, (96, 18, 28)),
        (0.80, (122, 30, 38)),
        (1.00, (168, 66, 66)),
    ])


def main():
    rgb, a = patina_statuary()
    p = save_rgba("patina-statuary", rgb, a)
    print("%-24s %6.1f KB" % ("patina-statuary", os.path.getsize(p) / 1024))
    p = save("house-curtain", house_curtain(), q=82)
    print("%-24s %6.1f KB" % ("house-curtain", os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
