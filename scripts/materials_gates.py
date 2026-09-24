"""Bake the gates' own textures: the house curtain's velvet.

The shared bakes live in materials.py; this file adds the map the gate tabs
are relit with, and reuses its noise helpers so the look stays one family.
It is grey, tiles across x and is one drop tall (top = the heading under the
valance, bottom = the hem):

  fab-velvet-fold   laid in `multiply` over the gate's velvet colour. Broad
                    rounded crests and deep soft valleys, so a fold reads as
                    cloth hanging in its own weight, not as a sine ripple;
                    each crest carries a soft highlight on the side the
                    footlights find, stronger toward the hem they stand at.

Six primary folds per tile, of irregular width, gathered at the heading and
relaxing into broader folds lower down, with shallow secondary folds riding
the lower half. Fixed seeds, so a re-run reproduces the files.

Usage:  python scripts/materials_gates.py
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import fbm, save_gray, _smooth, OUT  # noqa: E402


def velvet_maps(w=512, h=1024, seed=211, folds=6):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    t = y / (h - 1)                                   # 0 heading .. 1 hem

    # Fold edges: even pleats at the heading, irregular widths at the hem.
    even = np.linspace(0, w, folds + 1)[:-1]
    widths = rng.uniform(0.5, 1.6, folds)
    widths = widths / widths.sum() * w
    hem = np.concatenate([[0.0], np.cumsum(widths)[:-1]]) + rng.uniform(-10, 10)
    relax = _smooth(np.clip(t * 1.25, 0, 1))
    # a slow sway down the drop (periodic in x by construction)
    sway = (np.sin(2 * np.pi * (t * 0.7 + rng.uniform())) * 2.2
            + (fbm(h, seed + 1, 3.4)[:, :1] - 0.5) * 4.0)
    starts = even[None, :] * (1 - relax[:, :1]) + hem[None, :] * relax[:, :1]   # (h, folds)
    starts = starts + sway[:, :1]
    xs = x.copy()
    u = np.zeros_like(x)
    amp = np.zeros_like(x)
    amps = rng.uniform(0.55, 1.35, folds)
    for i in range(folds):
        a = starts[:, i:i + 1]
        b = starts[:, (i + 1) % folds:(i + 1) % folds + 1] + (w if i == folds - 1 else 0)
        width = b - a
        uu = ((xs - a) % w) / width
        inside = (uu >= 0) & (uu < 1)
        u = np.where(inside, uu, u)
        amp = np.where(inside, amps[i], amp)
    # height: broad crests, creased valleys; folds deepen as the drop hangs
    depth = amp * (0.55 + 0.6 * t)
    z = np.power(np.sin(np.pi * u), 1.0) * depth
    # secondary folds, shallow, only in the lower drop
    sec = np.sin(2 * np.pi * (x / w * folds * 2.0 + fbm(w, seed + 2, 2.5)[0][None, :] * 1.6))
    z = z + sec * 0.12 * _smooth(np.clip((t - 0.35) / 0.5, 0, 1)) * depth

    # normals from the height field (x slope dominates; a little y)
    k = 42.0
    dzdx = (np.roll(z, -1, 1) - np.roll(z, 1, 1)) * 0.5 * k
    dzdy = (np.roll(z, -1, 0) - np.roll(z, 1, 0)) * 0.5 * k * 0.35
    dzdy[0] = dzdy[1]; dzdy[-1] = dzdy[-2]
    n = np.stack([-dzdx, -dzdy, np.ones_like(z)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)

    # footlights: low, in front and a little to the left
    L = np.array([-0.5, -0.3, 0.81]); L /= np.linalg.norm(L)
    ndl = np.clip((n * L).sum(-1), 0, 1)
    zn = z / (depth + 1e-6)
    ao = 0.12 + 0.88 * _smooth(np.clip(zn * 1.6, 0, 1))       # deep, narrow valleys
    shade = ao * (0.2 + 0.8 * np.power(ndl, 1.15))
    # the drop is lit from below: brighter toward the hem, dim under the heading
    shade *= 0.66 + 0.34 * _smooth(t)

    # A soft crest highlight on the lamp side of each fold, stronger toward
    # the hem. It is folded into the same map: velvet's highlights keep the
    # cloth's own hue (a screened grey sheen turned every colour to pastel),
    # so the gate's --velvet is the colour at the brightest crest and the
    # map only ever takes it down.
    crest = np.power(ndl, 16) * (0.3 + 0.7 * _smooth(t))
    lum = shade * 0.74 + crest * 0.34 * ao

    # pile: crushed mottle and a faint vertical nap
    crush = fbm(w, seed + 3, 1.7) - 0.5
    crush = np.tile(crush, (h // w + 1, 1))[:h]
    nap = fbm(w, seed + 4, 0.6, (1.0, 5.0)) - 0.5
    nap = np.tile(nap, (h // w + 1, 1))[:h]
    lum = lum * (1 + crush * 0.16 + nap * 0.07)
    return np.clip(lum / np.percentile(lum, 99.6), 0, 1)


def main():
    path = save_gray("fab-velvet-fold", velvet_maps())
    print("%-20s %6.1f KB" % ("fab-velvet-fold", os.path.getsize(path) / 1024))


if __name__ == "__main__":
    main()
