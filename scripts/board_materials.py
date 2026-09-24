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
  rubbed some of it back, the file has left short strokes along each
  member, and the metal shows a few pits. Signed alpha, as the statuary
  tile: light where the patina is thin, dark where it is thick, so it
  relights any bronze with no blend mode.

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
    # (a smooth warp gave a topographic map; contour lines gave wood).
    # Integer wave numbers keep the tile periodic.
    t1 = fbm(n, 391, 1.75, (3.0, 1.0)) - 0.5
    t2 = fbm(n, 392, 2.4, (2.0, 1.0)) - 0.5
    ph = 2 * np.pi * (1 * x + 9 * y) + t1 * 16.0 + t2 * 8.0
    b = 0.5 + 0.5 * np.sin(ph)
    ph2 = 2 * np.pi * (2 * x + 23 * y) + t1 * 22.0 + (fbm(n, 393, 1.9, (3.0, 1.0)) - 0.5) * 10.0
    b2 = 0.5 + 0.5 * np.sin(ph2)
    cloud = fbm(n, 394, 2.0, (2.0, 1.0))
    body = 0.4 * b + 0.35 * b2 + 0.25 * cloud
    body = (body - body.min()) / (body.max() - body.min())
    ground = ramp(body, [
        (0.00, (110, 119, 130)), (0.2, (124, 132, 143)), (0.45, (142, 150, 159)),
        (0.7, (160, 167, 175)), (0.88, (176, 182, 188)), (1.00, (188, 193, 198))])
    dark = np.array([60, 68, 81], dtype=np.float64)
    # The darkest streaks lie in the troughs of the bands, sharpened and
    # broken along their run.
    s1 = np.power(1 - b, 7.0) * _smoothstep(0.3, 0.72, fbm(n, 395, 2.1, (4.0, 1.0)))
    s2 = np.power(1 - b2, 12.0) * _smoothstep(0.4, 0.8, fbm(n, 396, 2.1, (4.0, 1.0))) * 0.8
    s = np.clip(s1 * 0.7 + s2 * 0.6, 0, 1)
    rgb = ground * (1 - s[..., None] * 0.45) + dark * (s[..., None] * 0.45)
    # Slate veins cross the bed, few and wavering.
    sv = flow_veins(n, 397, 2.6, (1.0, 1.4), 0.08, 180, 0.9) * _smoothstep(0.52, 0.84, fbm(n, 398, 2.2))
    rgb = rgb * (1 - sv[..., None] * 0.5) + dark * (sv[..., None] * 0.5)
    # White calcite runs with the bed along a few of the crests.
    c1 = np.power(b, 60.0) * _smoothstep(0.55, 0.85, fbm(n, 399, 2.2, (3.0, 1.0)))
    white = np.array([226, 231, 234], dtype=np.float64)
    rgb = rgb * (1 - c1[..., None] * 0.55) + white * (c1[..., None] * 0.55)
    # the fine sparkle of a polished saccharoidal marble
    grain = (fbm(n, 400, 0.3) - 0.5) * 6.0
    return rgb + grain[..., None]


def patina_board(n=384):
    from scipy.ndimage import gaussian_filter
    rng = np.random.default_rng(411)
    mottle = fbm(n, 412, 2.1) - 0.5
    fine = fbm(n, 413, 1.4) - 0.5
    islands = np.clip((fbm(n, 414, 2.4) - 0.58) * 3.2, 0, 1)
    rub = np.clip((fbm(n, 415, 2.6) - 0.55) * 2.8, 0, 1)
    # the file's short strokes along the member, broken
    st = fbm(n, 416, 1.2, (1.0, 14.0))
    st = st - gaussian_filter(st, (0, 4), mode="wrap")
    st = st / (np.abs(st).max() + 1e-9) * np.clip(fbm(n, 417, 2.0) * 1.6 - 0.3, 0, 1)
    pits = np.zeros((n, n))
    for _ in range(50):
        y, x = rng.integers(0, n, 2)
        r = rng.uniform(0.6, 1.6)
        yy, xx = np.ogrid[-4:5, -4:5]
        spot = np.exp(-(xx * xx + yy * yy) / (2 * r * r))
        ys, xs = (np.arange(y - 4, y + 5) % n), (np.arange(x - 4, x + 5) % n)
        pits[np.ix_(ys, xs)] = np.maximum(pits[np.ix_(ys, xs)], spot)
    g = 0.5 + mottle * 0.34 + fine * 0.16 - islands * 0.16 + rub * 0.12 + st * 0.07 - pits * 0.3
    d = np.clip(g, 0, 1) - 0.5
    light = np.array([255, 226, 188], dtype=np.float64)
    dark = np.array([8, 4, 2], dtype=np.float64)
    rgb = np.where(d[..., None] > 0, light[None, None, :], dark[None, None, :])
    a = np.clip(np.abs(d) * 2.1, 0, 0.9)
    arr = np.concatenate([rgb, a[..., None] * 255], axis=-1)
    path = os.path.join(OUT, "patina-board.webp")
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(path, "WEBP", quality=86, method=6)
    return path


def main():
    p = save("stone-bardiglio", bardiglio(), q=86)
    print("%-24s %6.1f KB" % ("stone-bardiglio", os.path.getsize(p) / 1024))
    p = patina_board()
    print("%-24s %6.1f KB" % ("patina-board", os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
