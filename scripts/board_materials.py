"""Bake the house-lights board's stone.

Kept apart from desk_materials.py (the bronze patina and the house curtain)
so the board can be re-baked alone. Same rules as materials.py: periodic FFT
noise, fixed seeds, byte-stable output.

- stone-bardiglio.webp: the switchboard slab. Bardiglio is the blue-grey
  Carrara marble that electrical panels were cut from before the war: an
  insulator that took a polish and did not show the dust. A cool grey ground
  in slow clouds, a lineated run of darker streaks, a few crisp veins and
  hairline fissures between them. Laid at the same value in both themes; the
  hour is put on it with light in palace-desk.css, never by changing stone.

Usage:  python scripts/board_materials.py
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import OUT, band_veins, fbm, flow_veins, ramp, ridges, save  # noqa: E402


def bardiglio(n=512):
    base = fbm(n, 301, 2.3)
    cloud = fbm(n, 302, 1.5)
    ground = ramp(base * 0.55 + cloud * 0.45, [
        (0.00, (118, 126, 134)),
        (0.45, (146, 153, 160)),
        (0.80, (170, 176, 181)),
        (1.00, (186, 190, 193))])
    # Bardiglio is lineated: its darker grey lies in long soft streaks that
    # run with the bed, broken and wavering, not in a net.
    streak = flow_veins(n, 303, 2.6, (3.6, 1.0), 0.08, 6, 0.7)
    major = band_veins(n, 305, 2.4, (2.4, 1.0), 0.10, 0.002, 0.035, shear=1)
    minor = flow_veins(n, 306, 2.2, (1.8, 1.0), 0.07, 70) * 0.55
    hair = ridges(n, 307, 2.1, 170) * 0.35
    dark = np.array([72, 78, 86], dtype=np.float64)
    rgb = ground * (1 - streak[..., None] * 0.42) + dark * (streak[..., None] * 0.42)
    v = np.clip(major * 0.85 + minor + hair, 0, 1)
    vein = ramp(cloud, [(0.0, (44, 48, 56)), (1.0, (78, 84, 94))])
    rgb = rgb * (1 - v[..., None] * 0.8) + vein * (v[..., None] * 0.8)
    # a few calcite flecks: the white of the Carrara bed coming through
    fleck = np.power(fbm(n, 308, 0.6), 18.0)
    fleck = fleck / (fleck.max() + 1e-9)
    rgb = rgb + (np.array([226, 229, 231]) - rgb) * np.clip(fleck * 1.8, 0, 0.7)[..., None]
    return rgb


def main():
    p = save("stone-bardiglio", bardiglio(), q=84)
    print("%-24s %6.1f KB" % ("stone-bardiglio", os.path.getsize(p) / 1024))


if __name__ == "__main__":
    main()
