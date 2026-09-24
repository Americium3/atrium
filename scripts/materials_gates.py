"""Bake the gates' own textures: the house curtain, its swags and the niche's
bronze.

The shared bakes live in materials.py; this file adds the maps the gates and
the clock niche are relit with, and reuses its noise helpers so the look
stays one family. All maps are grey and meant for `multiply` over a colour
token, so the token is the colour of the material at its brightest and the
map only takes it down: highlights keep the material's own hue.

  fab-velvet-pile   the house curtain. Tiles across x, one drop tall (top =
                    the heading under the valance, bottom = the hem). Folds
                    of uneven width that wander, gather under the heading and
                    split low in the drop. Shaded as velvet, not satin: where
                    a fold faces the house the pile is seen end-on and
                    swallows the light, so the crest's core is the darkest
                    cloth; where it turns away the fibres are seen edge-on
                    and catch it, so each fold is rimmed in light down its
                    flanks. The valleys sit in their own occlusion, the pile
                    is crushed in a fine mottle, and the whole drop is lit
                    from the footlights, so it brightens toward the hem.
                    (The first bake lit the crests Lambert-bright with a
                    gloss down the middle: satin.)
  fab-velvet-festoon  the valance: four different festoon swags side by side,
                    each gathered at its two top corners, the folds sagging
                    in curves that follow the swag's own hem. A gate shows
                    three of the four, so no two valances hang alike.
  metal-bronze      cast statuary bronze for the clock case: the chemical
                    patina lies in clouds, darker in the hollows where the
                    wax has not been rubbed, lighter on worn high spots,
                    over a fine casting pit and a faint file grain.

Fixed seeds, so a re-run reproduces the files.

Usage:  python scripts/materials_gates.py [preview_dir]
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from materials import fbm, save_gray, _smooth, OUT  # noqa: E402


def _periodic_row(n, seed, beta):
    """A smooth periodic 1-D noise of length n in [-0.5, 0.5]."""
    return fbm(n, seed, beta)[0] - 0.5


def _velvet(z, k, light, ao, rim_w=0.75, rim_p=2.8, core=0.55, body=(0.26, 0.3)):
    """Velvet shading of a height field under ambient occlusion `ao`. A dim
    Lambert body from `light`, darkened where the surface faces the viewer
    squarely (the pile seen end-on: the crest's dark core), plus a broad rim
    where it turns away (the pile seen edge-on), stronger on the side that
    faces the light."""
    dzdx = (np.roll(z, -1, 1) - np.roll(z, 1, 1)) * 0.5 * k
    dzdy = (np.roll(z, -1, 0) - np.roll(z, 1, 0)) * 0.5 * k
    dzdy[0] = dzdy[1]
    dzdy[-1] = dzdy[-2]
    n = np.stack([-dzdx, -dzdy, np.ones_like(z)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.asarray(light, dtype=np.float64)
    L /= np.linalg.norm(L)
    ndl = np.clip((n * L).sum(-1), 0, 1)
    nz = n[..., 2]
    rim = np.power(np.clip(1 - nz, 0, 1), 1.0 / rim_p)
    lean = (n[..., 0] * L[0] + n[..., 1] * L[1]) / (np.hypot(n[..., 0], n[..., 1]) + 1e-6)
    side = np.clip(0.35 + 0.65 * (lean * 0.5 + 0.5), 0, 1)
    face = np.power(nz, 6)
    lit = (body[0] + body[1] * ndl) * (1 - core * face)
    return ao * (lit + rim_w * rim * side * (0.35 + 0.65 * ndl))


def velvet_maps(w=512, h=448, seed=311, folds=6):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    t = y / (h - 1)                                   # 0 heading .. 1 hem

    # Fold boundaries: even pleats at the heading, irregular at the hem, and
    # every boundary wanders on its own slow path down the drop, so two folds
    # swell and narrow against each other instead of running as rails.
    even = np.linspace(0, w, folds + 1)[:-1] + w / folds * 0.5
    widths = rng.uniform(0.55, 1.6, folds)
    widths = widths / widths.sum() * w
    hem = np.concatenate([[0.0], np.cumsum(widths)[:-1]]) + rng.uniform(0, w / folds)
    relax = _smooth(np.clip(t * 1.4, 0, 1))[:, 0]
    starts = np.zeros((h, folds))
    for i in range(folds):
        path = (fbm(h, seed + 10 + i, 3.8)[:, 0] - 0.5) * (w / folds) * 0.3
        starts[:, i] = even[i] * (1 - relax) + hem[i] * relax + path * (0.3 + 0.7 * relax)
    order = np.argsort(starts[-1])
    starts = starts[:, order]
    u = np.zeros((h, w))
    idx = np.zeros((h, w), dtype=int)
    for i in range(folds):
        a = starts[:, i:i + 1]
        b = starts[:, (i + 1) % folds:(i + 1) % folds + 1] + (w if i == folds - 1 else 0)
        width = np.maximum(b - a, 8)
        uu = ((x - a) % w) / width
        inside = (uu >= 0) & (uu < 1)
        u = np.where(inside, uu, u)
        idx = np.where(inside, i, idx)
    amps = rng.uniform(0.6, 1.3, folds)[idx]
    skew = rng.uniform(0.75, 1.35, folds)[idx]
    # Profile: a broad rounded crest, a creased valley, leaning one way or
    # the other; the folds deepen as the drop hangs free.
    us = np.power(np.clip(u, 0, 1), skew)
    depth = amps * (0.5 + 0.7 * t)
    z = np.power(np.sin(np.pi * us), 0.62) * depth
    # Some folds split low in the drop: a shallow crease grows up from the hem
    # down the middle of the fold.
    split = rng.uniform(0, 1, folds)[idx] < 0.45
    grow = _smooth(np.clip((t - rng.uniform(0.35, 0.65)) / 0.35, 0, 1))
    crease = np.exp(-((us - rng.uniform(0.4, 0.6)) / 0.11) ** 2) * 0.32
    z = z - np.where(split, crease * grow * depth, 0)
    zn = z / (depth + 1e-6)
    ao = 0.1 + 0.9 * _smooth(np.clip(zn * 1.5, 0, 1))
    lum = _velvet(z, 14.0, (-0.45, 0.25, 0.86), ao)
    # footlights: brighter toward the hem, dim under the heading
    lum *= 0.55 + 0.45 * _smooth(t)
    # pile: crushed mottle at two scales and a faint vertical nap, tiled
    # down the drop
    crush = fbm(w, seed + 3, 1.7) - 0.5
    crush = np.tile(crush, (h // w + 1, 1))[:h]
    fine = fbm(w, seed + 5, 0.45) - 0.5
    fine = np.tile(fine, (h // w + 1, 1))[:h]
    nap = fbm(w, seed + 4, 0.6, (1.0, 5.0)) - 0.5
    nap = np.tile(nap, (h // w + 1, 1))[:h]
    lum = lum * (1 + crush * 0.22 + fine * 0.2 + nap * 0.1)
    # the rims clip: the body of the cloth is what the token's colour sets
    return np.clip(lum / np.percentile(lum, 98), 0, 1)


def swag_strip(sw=384, sh=160, n=4, seed=331):
    """Four festoon swags side by side. The swag's own outline is the gate's
    CSS mask (an ellipse 52% x 100% of the swag, centred on its top edge);
    this map only lights the cloth inside it, so it follows the same
    ellipse: every fold is that hem scaled toward the heading, which gathers
    the folds into the two top corners exactly as a swag is gathered."""
    rng = np.random.default_rng(seed)
    out = np.zeros((sh, sw * n))
    y, x = np.mgrid[0:sh, 0:sw].astype(np.float64)
    uu = x / (sw - 1)
    v = (y + 0.5) / sh
    for k in range(n):
        ax = rng.uniform(-0.035, 0.035)                    # the swag hangs a little off true
        edge = np.sqrt(np.clip(1 - ((uu - 0.5 - ax) / 0.52) ** 2, 1e-4, 1))
        s = np.clip(v / edge, 0, 1.2)                      # 0 heading .. 1 hem
        nf = rng.integers(4, 6)
        bend = rng.uniform(0.75, 1.15)
        ph = rng.uniform(0, 1)
        wob = (fbm(sw, seed + 20 + k, 3.0)[0] - 0.5)[None, :] * rng.uniform(0.25, 0.5)
        sp = np.power(np.clip(s, 0, 1), bend)
        z = 0.5 - 0.5 * np.cos(2 * np.pi * (sp * nf + ph + wob))
        # the whole swag bellies out toward the hem, deepest at the middle
        belly = np.sin(np.pi * np.clip(s, 0, 1)) * 0.9
        zz = z * (0.35 + 0.65 * s) + belly
        ao = 0.3 + 0.7 * _smooth(np.clip(z * 1.25, 0, 1))
        lum = _velvet(zz * 4.5, 0.7, (-0.35, 0.45, 0.82), ao)
        # the heading board shades the top of the swag; the hem is nearest
        # the footlights
        lum *= 0.45 + 0.55 * _smooth(np.clip(s * 1.2, 0, 1))
        crush = fbm(sw, seed + 40 + k, 1.7)[:sh] - 0.5
        fine = fbm(sw, seed + 50 + k, 0.45)[:sh] - 0.5
        lum *= 1 + crush * 0.18 + fine * 0.16
        out[:, k * sw:(k + 1) * sw] = lum
    return np.clip(out / np.percentile(out, 98.5), 0, 1)


def bronze_patina(n=512, seed=351):
    """Statuary bronze, cast and patinated, as a grey map for `multiply`
    over the bronze ramp: the patina in clouds at two scales, lighter where
    the wax has been rubbed through on the high spots, over the sand-cast
    tooth of the metal, a scatter of casting pits and a faint file grain."""
    clouds = fbm(n, seed, 2.2) - 0.5
    mid = fbm(n, seed + 1, 1.5) - 0.5
    tooth = fbm(n, seed + 5, 0.35) - 0.5
    rub = _smooth(np.clip((fbm(n, seed + 2, 1.9) - 0.58) * 3.5, 0, 1))
    pits = fbm(n, seed + 3, 0.1)
    pits = _smooth(np.clip((pits - 0.8) * 7, 0, 1))
    grain = fbm(n, seed + 4, 0.8, (1.0, 9.0)) - 0.5
    g = (0.66 + clouds * 0.36 + mid * 0.26 + tooth * 0.16 + rub * 0.22
         - pits * 0.34 + grain * 0.08)
    return np.clip(g / np.percentile(g, 99.6), 0, 1)


def main():
    maps = [("fab-velvet-pile", velvet_maps()), ("fab-velvet-festoon", swag_strip()),
            ("metal-bronze", bronze_patina())]
    for name, m in maps:
        path = save_gray(name, m)
        print("%-20s %6.1f KB" % (name, os.path.getsize(path) / 1024))
    if len(sys.argv) > 1:
        # previews over a few of the velvet tokens and the bronze body
        from PIL import Image
        d = sys.argv[1]
        os.makedirs(d, exist_ok=True)
        for hexs in ("c22b3b", "24754b", "8c4a2c", "3f5d6e"):
            c = np.array([int(hexs[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)
            for name, m in maps[:2]:
                rgb = m[..., None] * c[None, None, :]
                Image.fromarray(rgb.astype(np.uint8)).save(os.path.join(d, "%s-%s.png" % (name, hexs)))
        c = np.array([0x6a, 0x4c, 0x30], dtype=np.float64)
        Image.fromarray((maps[2][1][..., None] * c).astype(np.uint8)).save(os.path.join(d, "bronze.png"))


if __name__ == "__main__":
    main()
