"""Bake the house-lights board's stone.

Kept apart from desk_materials.py (the bronze patina and the house curtain)
so the board can be re-baked alone. Same rules as materials.py: periodic FFT
noise, fixed seeds, byte-stable output.

- stone-bardiglio.webp: the switchboard's panel. Bardiglio is the blue-grey
  Carrara marble that electrical panels were cut from before the war: an
  insulator that took a polish and did not show the dust. What gives the
  stone away is its bedding: the grey lies in long wavering bands that run
  with the bed (Bardiglio nuvolato, "clouded"), darker streaks gather along
  some of them, a few crisp slate veins cut across, and white calcite heals
  the fissures in thin bright threads. Laid at the same value in both
  themes; the hour is put on it with light in palace-desk.css, never by
  changing stone.
- patina-board.webp: the board's cast bronze. The hall's statuary patina
  (desk_materials.py) is a dressed face, brushed top to bottom in broad
  passes, and on the board's narrow rails and stiles those passes read as
  the grain of wood. A casting is finished differently: the patina lies in
  a fine mottle with darker islands where it took deeper, the hands have
  rubbed some of it back and the metal shows a few pits. It has no strokes
  at all: the first bake filed short ones along each member, and on the
  frame they still read as grain. Signed alpha, as the statuary tile:
  light where the patina is thin, dark where it is thick, so it relights
  any bronze with no blend mode. The light is a pale brass, not the warm
  one of the niche, so the board's bronze stays cool.
- brush-copper.webp: the draw marks on rolled copper and brass: fine
  streaks along the bar, a few heavier ones, in signed alpha. The swing's
  poses lay it along each blade, so the grain turns with the blade.

Usage:  python scripts/board_materials.py
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import OUT, fbm, flow_veins, ramp, save  # noqa: E402


def _smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def bardiglio(n=1024):
    y, x = np.mgrid[0:n, 0:n] / n
    # Perlin's marble: the bed as a stack of sine bands pushed about by
    # turbulence. The turbulence is rough (beta under 2) and stretched along
    # the bed, so the bands fray into cloudy streaks instead of rippling
    # (a smooth warp gave a topographic map, contour lines gave wood, and
    # the level sets of noise gave a coastline). Integer wave numbers keep
    # the tile periodic.
    t1 = fbm(n, 391, 1.75, (3.0, 1.0)) - 0.5
    t2 = fbm(n, 392, 2.4, (2.0, 1.0)) - 0.5
    t3 = fbm(n, 393, 3.0, (1.0, 1.0)) - 0.5
    ph = 2 * np.pi * (1 * x + 7 * y) + t1 * 14.0 + t2 * 7.0 + t3 * 6.0
    b = 0.5 + 0.5 * np.sin(ph)
    ph2 = 2 * np.pi * (2 * x + 19 * y) + t1 * 20.0 + (fbm(n, 394, 1.9, (3.0, 1.0)) - 0.5) * 9.0 + t3 * 8
    b2 = 0.5 + 0.5 * np.sin(ph2)
    cloud = fbm(n, 395, 2.2, (2.5, 1.0))
    # The ground is a pale dove grey and the clouds a bluer slate. The first
    # bake kept every value between 110 and 198 and the veil took half of
    # that away, so on the board the stone read as a flat grey field: the
    # streaks now go down to slate and the calcite up to near white.
    body = 0.45 * b + 0.2 * b2 + 0.35 * cloud
    body = (body - body.min()) / (body.max() - body.min())
    ground = ramp(body, [
        (0.00, (98, 108, 122)), (0.25, (120, 129, 141)), (0.5, (146, 154, 164)),
        (0.72, (170, 177, 185)), (0.9, (190, 195, 201)), (1.00, (202, 206, 211))])
    dark = np.array([46, 54, 68], dtype=np.float64)
    # The bedding streaks lie in the troughs of the bands, crisp and broken
    # along their run, with a few hairlines where the bed laminates.
    s1 = np.power(1 - b, 9.0) * _smoothstep(0.34, 0.62, fbm(n, 396, 2.0, (5.0, 1.0)))
    s2 = np.power(1 - b2, 16.0) * _smoothstep(0.42, 0.7, fbm(n, 397, 2.0, (5.0, 1.0)))
    ph3 = ph2 * 2.0 + t2 * 6.0
    s3 = (np.power(0.5 + 0.5 * np.sin(ph3), 40.0) * _smoothstep(0.45, 0.75, fbm(n, 398, 2.1, (4.0, 1.0)))
          * (1 - body) * 1.4)
    s = np.clip(s1 * 0.85 + s2 * 0.8 + s3 * 0.3, 0, 1)
    rgb = ground * (1 - s[..., None] * 0.62) + dark * (s[..., None] * 0.62)
    # Slate veins cross the bed, few, wavering and crisp.
    sv = flow_veins(n, 399, 2.6, (1.0, 1.3), 0.08, 150, 0.9) * _smoothstep(0.48, 0.8, fbm(n, 400, 2.2))
    rgb = rgb * (1 - sv[..., None] * 0.66) + dark * (sv[..., None] * 0.66)
    # White calcite heals the fissures: along a few crests, and a thread or
    # two across the bed.
    c1 = np.power(b, 70.0) * _smoothstep(0.5, 0.8, fbm(n, 401, 2.2, (3.0, 1.0)))
    c2 = flow_veins(n, 405, 2.7, (1.0, 1.8), 0.06, 280, 0.9) * _smoothstep(0.6, 0.85, fbm(n, 403, 2.3))
    white = np.array([232, 236, 239], dtype=np.float64)
    c = np.clip(c1 * 0.8 + c2 * 0.9, 0, 1)
    rgb = rgb * (1 - c[..., None] * 0.8) + white * (c[..., None] * 0.8)
    # the fine sparkle of a polished saccharoidal marble
    grain = (fbm(n, 404, 0.3) - 0.5) * 7.0
    return rgb + grain[..., None]


def patina_board(n=384):
    rng = np.random.default_rng(411)
    mottle = fbm(n, 412, 2.1) - 0.5
    fine = fbm(n, 413, 1.4) - 0.5
    speck = fbm(n, 418, 0.8) - 0.5
    islands = np.clip((fbm(n, 414, 2.4) - 0.58) * 3.2, 0, 1)
    rub = np.clip((fbm(n, 415, 2.6) - 0.55) * 2.8, 0, 1)
    pits = np.zeros((n, n))
    for _ in range(60):
        y, x = rng.integers(0, n, 2)
        r = rng.uniform(0.6, 1.5)
        yy, xx = np.ogrid[-4:5, -4:5]
        spot = np.exp(-(xx * xx + yy * yy) / (2 * r * r))
        ys, xs = (np.arange(y - 4, y + 5) % n), (np.arange(x - 4, x + 5) % n)
        pits[np.ix_(ys, xs)] = np.maximum(pits[np.ix_(ys, xs)], spot)
    g = 0.5 + mottle * 0.34 + fine * 0.18 + speck * 0.1 - islands * 0.18 + rub * 0.12 - pits * 0.3
    d = np.clip(g, 0, 1) - 0.5
    light = np.array([236, 224, 194], dtype=np.float64)
    dark = np.array([6, 6, 3], dtype=np.float64)
    rgb = np.where(d[..., None] > 0, light[None, None, :], dark[None, None, :])
    a = np.clip(np.abs(d) * 2.1, 0, 0.9)
    arr = np.concatenate([rgb, a[..., None] * 255], axis=-1)
    path = os.path.join(OUT, "patina-board.webp")
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(path, "WEBP", quality=86, method=6)
    return path


def _signed(name, g, gain, cap):
    d = np.clip(g, 0, 1) - 0.5
    light = np.array([255, 236, 214], dtype=np.float64)
    dark = np.array([10, 5, 2], dtype=np.float64)
    rgb = np.where(d[..., None] > 0, light[None, None, :], dark[None, None, :])
    a = np.clip(np.abs(d) * gain, 0, cap)
    arr = np.concatenate([rgb, a[..., None] * 255], axis=-1)
    path = os.path.join(OUT, name + ".webp")
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(path, "WEBP", quality=86, method=6)
    return path


def brush_copper(n=256):
    from scipy.ndimage import gaussian_filter
    fine = fbm(n, 421, 1.7, (1.0, 40.0))
    fine = fine - gaussian_filter(fine, (8, 0), mode="wrap")
    fine = fine / (np.abs(fine).max() + 1e-9)
    heavy = fbm(n, 422, 2.0, (1.0, 16.0))
    heavy = heavy - gaussian_filter(heavy, (14, 0), mode="wrap")
    heavy = heavy / (np.abs(heavy).max() + 1e-9)
    # the grain runs along x: stretch the streaks that way
    g = 0.5 + (fine * 0.3 + heavy * 0.22).T
    return _signed("brush-copper", g, 2.2, 0.7)


def main():
    p = save("stone-bardiglio", bardiglio(), q=86)
    print("%-24s %6.1f KB" % ("stone-bardiglio", os.path.getsize(p) / 1024))
    p = patina_board()
    print("%-24s %6.1f KB" % ("patina-board", os.path.getsize(p) / 1024))
    p = brush_copper()
    print("%-24s %6.1f KB" % ("brush-copper", os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
