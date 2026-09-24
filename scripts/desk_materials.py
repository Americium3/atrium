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
    brushing runs vertically (the faces were dressed top to bottom), the
    patina lies unevenly in slow clouds, and the casting shows a few pits."""
    from scipy.ndimage import gaussian_filter
    brush = fbm(n, 201, 1.15, (1.0, 38.0)) * 0.65 + fbm(n, 202, 0.8, (1.0, 70.0)) * 0.35
    # high-pass across the grain: the brushing is fine lines, not broad bands
    brush = brush - gaussian_filter(brush, (0, 10), mode="wrap")
    brush = brush / (np.abs(brush).max() + 1e-9)
    cloud = fbm(n, 203, 2.6) - 0.5
    blotch = np.clip((fbm(n, 204, 2.2) - 0.62) * 3.0, 0, 1)      # darker patina islands
    rub = np.clip((fbm(n, 205, 2.8) - 0.58) * 2.6, 0, 1)         # hand-worn, lighter
    rng = np.random.default_rng(206)
    pits = np.zeros((n, n))
    for _ in range(36):
        y, x = rng.integers(0, n, 2)
        r = rng.uniform(0.6, 1.6)
        yy, xx = np.ogrid[-3:4, -3:4]
        spot = np.exp(-(xx * xx + yy * yy) / (2 * r * r))
        ys, xs = (np.arange(y - 3, y + 4) % n), (np.arange(x - 3, x + 4) % n)
        pits[np.ix_(ys, xs)] = np.maximum(pits[np.ix_(ys, xs)], spot)
    g = 0.5 + brush * 0.13 + cloud * 0.18 - blotch * 0.12 + rub * 0.07 - pits * 0.18
    g = np.clip(g, 0, 1)
    d = g - 0.5
    light = np.array([255, 226, 188], dtype=np.float64)
    dark = np.array([8, 4, 2], dtype=np.float64)
    rgb = np.where(d[..., None] > 0, light[None, None, :], dark[None, None, :])
    a = np.clip(np.abs(d) * 1.9, 0, 0.85)
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
