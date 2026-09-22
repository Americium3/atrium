"""Bake the hall's material textures.

Every surface that has to read as a photographed object rather than a drawing
(stone, veneer, brushed metal, pile) gets a small seamless tile from here.
They are baked, not live: an feTurbulence filter re-rasterises on every
transform and resize, and the hall is full of both. A tile is decoded once
and composited for free.

Everything is FFT noise, which is periodic by construction, so every tile
repeats without a seam in both directions. The seed is fixed: re-running the
script reproduces the committed files byte for byte (Pillow's WebP encoder is
deterministic for a given input and quality).

Usage:  python scripts/materials.py            # write static/assets/tex/*.webp
        python scripts/materials.py --sheet    # also write shots/space/tex-sheet.png
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "static", "assets", "tex")


def spectrum_noise(n, beta, seed, aniso=(1.0, 1.0)):
    """Periodic 1/f^beta noise in [0,1]. aniso stretches the spectrum so the
    grain runs one way (veneer, brushed metal)."""
    rng = np.random.default_rng(seed)
    fy = np.fft.fftfreq(n)[:, None] * aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * aniso[0]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    amp = 1.0 / np.power(f, beta)
    amp[0, 0] = 0.0
    phase = rng.uniform(0, 2 * np.pi, (n, n))
    field = np.real(np.fft.ifft2(amp * np.exp(1j * phase)))
    field -= field.min()
    field /= field.max()
    return field


def fbm(n, seed, beta=2.0, aniso=(1.0, 1.0)):
    return spectrum_noise(n, beta, seed, aniso)


def ramp(t, stops):
    """Map t in [0,1] through colour stops [(pos, (r,g,b)), ...]."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), dtype=np.float64)
    pos = np.array([p for p, _ in stops])
    cols = np.array([c for _, c in stops], dtype=np.float64)
    for ch in range(3):
        out[..., ch] = np.interp(t, pos, cols[:, ch])
    return out


def veins(n, seed, kx, ky, warp, sharp, wobble=0.35):
    """Marble veining: a periodic sine band pushed around by a SMOOTH fBm
    (domain warp), then sharpened so most of the slab is ground and the veins
    are thin. kx/ky are integers so the band wraps. The warp must stay
    smooth (beta >= 3): high frequencies in it curl the zero crossings into
    the fungal loops that give procedural marble away."""
    y, x = np.mgrid[0:n, 0:n] / n
    w1 = fbm(n, seed, 3.2) - 0.5
    w2 = fbm(n, seed + 1, 2.6) - 0.5
    width = fbm(n, seed + 2, 3.0)
    phase = 2 * np.pi * (kx * x + ky * y)
    s = np.sin(phase + warp * (w1 * 7.0 + w2 * 2.0 * wobble))
    v = 1.0 - np.abs(s)
    # veins swell and pinch along their length
    return np.power(v, sharp * (0.45 + 1.1 * width))


def band_veins(n, seed, beta, aniso, warp, wmin, wmax, shear=0):
    """Opaque veins of varying width with a crisp edge: a smoothstep across
    the ridge of a domain-warped field rather than a power curve (which
    always reads as a glow)."""
    from scipy.ndimage import map_coordinates
    f = fbm(n, seed, beta, aniso)
    wy = fbm(n, seed + 7, 3.1) - 0.5
    wx = fbm(n, seed + 8, 3.1) - 0.5
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64)
    # an integer shear keeps the tile periodic while tipping the run
    g = map_coordinates(f, [yy + xx * shear + wy * warp * n, xx + wx * warp * n],
                        order=1, mode="grid-wrap")
    d = np.abs(2.0 * g - 1.0)                     # 0 on the vein's spine
    wmod = fbm(n, seed + 9, 2.2)
    width = wmin + (wmax - wmin) * np.power(wmod, 1.6)
    edge = width * 0.35
    t = np.clip((width + edge - d) / edge, 0, 1)
    return t * t * (3 - 2 * t)


def ridges(n, seed, beta, sharp):
    """Level-set network of one smooth field: thin branching fissures, the
    secondary veining real slabs have between the main runs."""
    f = fbm(n, seed, beta)
    r = 1.0 - np.abs(2.0 * f - 1.0)
    return np.power(r, sharp)


def flow_veins(n, seed, beta=2.5, aniso=(1.0, 2.5), warp=0.10, sharp=40, fade=0.6):
    """Veins as the 0.5 level set of a domain-warped field. Unlike a sine
    band, the level set of noise is irregularly spaced, branches and
    dies out, which is what stone does; the anisotropy gives the slab its
    run and the smooth warp makes the runs flow instead of zig-zagging.
    `fade` lets some veins thin to nothing along their length."""
    from scipy.ndimage import map_coordinates
    f = fbm(n, seed, beta, aniso)
    wy = fbm(n, seed + 7, 3.1) - 0.5
    wx = fbm(n, seed + 8, 3.1) - 0.5
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float64)
    g = map_coordinates(f, [yy + wy * warp * n, xx + wx * warp * n], order=1, mode="grid-wrap")
    r = 1.0 - np.abs(2.0 * g - 1.0)
    width = fbm(n, seed + 9, 2.8)
    v = np.power(r, sharp * (0.5 + 1.2 * width))
    mask = np.clip(fbm(n, seed + 10, 2.6) * (1 + fade) - fade * 0.5, 0, 1)
    return v * (0.35 + 0.65 * mask)


def save(name, rgb, q=84):
    os.makedirs(OUT, exist_ok=True)
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    path = os.path.join(OUT, name + ".webp")
    img.save(path, "WEBP", quality=q, method=6)
    return path


def save_gray(name, g, q=84):
    os.makedirs(OUT, exist_ok=True)
    img = Image.fromarray(np.clip(g * 255, 0, 255).astype(np.uint8), "L").convert("RGB")
    path = os.path.join(OUT, name + ".webp")
    img.save(path, "WEBP", quality=q, method=6)
    return path


# ---------------------------------------------------------------- stones

def portoro(n=1024):
    """Night wall: Portoro, a black marble with gold-yellow veins, the Deco
    stone that is already the Onyx theme's two colours."""
    base = fbm(n, 11, 2.4)
    cloud = fbm(n, 12, 1.6)
    ground = ramp(base * 0.7 + cloud * 0.3, [
        (0.0, (8, 7, 6)), (0.5, (17, 15, 12)), (1.0, (30, 26, 20))])
    # Portoro's main veins are opaque bands with a crisp edge, not glows:
    # a band is a smoothstep on the ridge, its width swelling along the run.
    major = band_veins(n, 13, 2.5, (2.0, 1.0), 0.13, 0.002, 0.07, shear=1)
    feather = flow_veins(n, 16, 2.4, (1.6, 1.0), 0.12, 22, 0.8) * 0.5
    minor = flow_veins(n, 14, 2.2, (1.0, 1.6), 0.07, 90) * 0.55
    hair = ridges(n, 15, 2.1, 160) * 0.35
    v = np.clip(major + feather + minor + hair, 0, 1)
    gold = np.array([176, 138, 62], dtype=np.float64)
    pale = np.array([214, 196, 150], dtype=np.float64)
    tint = gold[None, None, :] * (1 - cloud[..., None]) + pale[None, None, :] * cloud[..., None]
    rgb = ground * (1 - v[..., None] * 0.92) + tint * (v[..., None] * 0.92)
    return rgb


def calacatta(n=1024):
    """Day wall: warm white Calacatta, broad grey-gold veins, soft cloud."""
    base = fbm(n, 21, 2.3)
    cloud = fbm(n, 22, 1.5)
    ground = ramp(base * 0.5 + cloud * 0.5, [
        (0.0, (226, 219, 204)), (0.55, (238, 233, 222)), (1.0, (247, 244, 237))])
    major = flow_veins(n, 23, 2.8, (2.4, 1.0), 0.12, 16, 0.9)
    minor = flow_veins(n, 24, 2.3, (1.8, 1.0), 0.08, 60) * 0.45
    hair = ridges(n, 25, 2.2, 150) * 0.28
    v = np.clip(major + minor + hair, 0, 1)
    vein = ramp(cloud, [(0.0, (120, 112, 98)), (1.0, (168, 150, 112))])
    return ground * (1 - v[..., None] * 0.55) + vein * (v[..., None] * 0.55)


def rouge(n=1024):
    """Rouge Flamme, the Chrysler lobby's wall stone: oxblood with cream
    flame veins. Used on the pilasters at night."""
    base = fbm(n, 31, 2.2)
    cloud = fbm(n, 32, 1.4)
    ground = ramp(base * 0.6 + cloud * 0.4, [
        (0.0, (46, 16, 12)), (0.5, (78, 30, 22)), (1.0, (112, 52, 38))])
    v = np.clip(flow_veins(n, 33, 2.5, (2.0, 1.0), 0.14, 24, 0.8)
                + flow_veins(n, 35, 2.2, (1.4, 1.0), 0.08, 80) * 0.5
                + ridges(n, 34, 2.2, 150) * 0.3, 0, 1)
    cream = np.array([206, 170, 132], dtype=np.float64)
    return ground * (1 - v[..., None] * 0.7) + cream * (v[..., None] * 0.7)


def travertine(n=1024):
    """Siena travertine, the Chrysler floor: honey stone laid in bands, with
    the small voids that give it away."""
    y = np.mgrid[0:n, 0:n][0] / n
    band = fbm(n, 41, 2.2, (6.0, 1.0))
    ground = ramp(band, [(0.0, (176, 146, 98)), (0.5, (205, 178, 128)), (1.0, (226, 204, 158))])
    pores = fbm(n, 42, 1.1, (5.0, 1.0))
    holes = np.clip((pores - 0.78) * 8, 0, 1) * 0.45
    return ground * (1 - holes[..., None])


def terrazzo(n=1024, dark=True):
    """Terrazzo: a cement matrix with crushed marble at three sizes. Chips
    are angular (crushed stone has faces, not petals), drawn at 2x and
    downsampled for clean edges, and every chip near an edge is drawn again
    one tile over so the tile wraps."""
    from PIL import ImageDraw
    rng = np.random.default_rng(51 if dark else 52)
    matrix = fbm(n, 53, 2.0) * 0.7 + fbm(n, 54, 0.7) * 0.3
    if dark:
        base = ramp(matrix, [(0, (18, 16, 13)), (1, (36, 32, 27))])
        palette = [(70, 62, 50), (112, 98, 74), (44, 40, 35), (150, 128, 86),
                   (88, 80, 68), (128, 118, 104), (60, 50, 40)]
    else:
        base = ramp(matrix, [(0, (210, 203, 188)), (1, (232, 226, 214))])
        palette = [(172, 162, 142), (146, 134, 112), (194, 186, 168), (124, 110, 88),
                   (206, 194, 168), (160, 156, 148), (184, 170, 140)]
    S = 2
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").resize((n * S, n * S))
    d = ImageDraw.Draw(img)
    for cell, rmin, rmax, skip in ((72, 7, 15, 0.30), (30, 2.8, 6.0, 0.15), (12, 0.9, 2.2, 0.10)):
        for gy in range(0, n, cell):
            for gx in range(0, n, cell):
                if rng.random() < skip:
                    continue
                cx = gx + rng.uniform(0, cell)
                cy = gy + rng.uniform(0, cell)
                r = rng.uniform(rmin, rmax)
                k = int(rng.integers(5, 9))
                angs = np.sort(rng.uniform(0, 2 * np.pi, k))
                rad = r * rng.uniform(0.55, 1.15, k)
                col = np.array(palette[rng.integers(len(palette))], dtype=np.float64)
                col = tuple(int(c) for c in np.clip(col * rng.uniform(0.82, 1.15), 0, 255))
                for ox in (-n, 0, n):
                    for oy in (-n, 0, n):
                        px = cx + ox
                        py = cy + oy
                        if px + r < -2 or px - r > n + 2 or py + r < -2 or py - r > n + 2:
                            continue
                        pts = [((px + rr * np.cos(t)) * S, (py + rr * np.sin(t)) * S)
                               for rr, t in zip(rad, angs)]
                        d.polygon(pts, fill=col)
    img = img.resize((n, n), Image.LANCZOS)
    return np.asarray(img, dtype=np.float64)


# ---------------------------------------------------------------- veneers

def grain_lines(n, seed, count, wander=0.6, sharp=6.0):
    """Crisp growth lines running along x. The line field is a sine across
    y (count must be an integer so it wraps) whose phase is pushed by a
    field that varies slowly along the grain and faster across it, so lines
    wander, converge and part the way quarter-cut wood does."""
    y = np.mgrid[0:n, 0:n][0] / n
    w = fbm(n, seed, 2.6, (8.0, 1.0)) - 0.5
    # across-grain irregularity: growth years are not equally wide
    k = fbm(n, seed + 1, 1.3, (24.0, 1.0)) - 0.5
    thick = fbm(n, seed + 2, 1.8, (20.0, 1.0))
    ph = 2 * np.pi * (y * count + w * wander * 6 + k * count * 0.09)
    return np.power(np.abs(np.sin(ph)), sharp * (0.4 + 1.4 * thick))


def veneer(n, seed, stops, figure=0.5, count=46, line_weight=0.45):
    """Quarter-cut veneer: grain runs along x. Broad colour streaks (the
    flitch), crisp growth lines, pore scratches, and `figure`, a slow
    cross-grain ribbon. Laid horizontal; CSS rotates it for marquetry."""
    streak = fbm(n, seed + 2, 2.2, (14.0, 1.0))
    lines = grain_lines(n, seed + 3, count)
    pores = fbm(n, seed + 4, 0.5, (30.0, 1.0))
    ribbon = fbm(n, seed + 5, 2.8, (1.0, 6.0))
    t = streak * 0.62 + (ribbon - 0.5) * 0.45 * figure + (pores - 0.5) * 0.12
    base = ramp(np.clip(t, 0, 1), stops)
    dark = 1.0 - (1.0 - lines) * line_weight
    return base * dark[..., None]


def macassar(n=1024):
    # Macassar ebony: near-black with honey stripes, the boldest of them.
    # bold stripes are growth lines at a coarse count, softened
    bands = grain_lines(n, 61, 11, 0.9, 1.2)
    t = bands * 0.75 + fbm(n, 65, 1.2, (26.0, 1.0)) * 0.25
    stripes = np.clip((t - 0.25) * 1.9, 0, 1)
    base = ramp(stripes, [(0, (18, 12, 8)), (0.35, (38, 24, 14)), (0.7, (110, 72, 40)), (1, (160, 112, 64))])
    lines = grain_lines(n, 66, 70, 0.5, 8.0)
    return base * (1.0 - (1.0 - lines) * 0.35)[..., None]


def walnut(n=1024):
    return veneer(n, 62, [(0, (60, 38, 22)), (0.5, (98, 64, 40)), (1, (146, 100, 62))], 0.5, 40, 0.4)


def ash(n=1024):
    return veneer(n, 63, [(0, (168, 136, 94)), (0.5, (202, 172, 126)), (1, (230, 208, 166))], 0.6, 34, 0.3)


def harewood(n=1024):
    """Sycamore dyed grey, the silver wood in Deco marquetry."""
    return veneer(n, 64, [(0, (104, 104, 100)), (0.5, (142, 142, 136)), (1, (182, 182, 174))], 0.9, 52, 0.3)


# ---------------------------------------------------------------- metal, pile

def brushed(n=1024):
    """Grey brushing streaks for overlay on any metal tone."""
    g = fbm(n, 71, 1.2, (40.0, 1.0)) * 0.7 + fbm(n, 72, 0.8, (60.0, 1.0)) * 0.3
    g = (g - g.mean()) * 1.6 + 0.5
    return np.clip(g, 0, 1)


def pile(n=512):
    """Carpet pile: fine isotropic grain, grey, for overlay."""
    g = fbm(n, 81, 0.5) * 0.6 + fbm(n, 82, 1.4) * 0.4
    return np.clip((g - g.mean()) * 1.4 + 0.5, 0, 1)


def plaster(n=512):
    """Wall plaster / paper tooth, grey, for overlay."""
    g = fbm(n, 91, 1.1) * 0.5 + fbm(n, 92, 2.0) * 0.5
    return np.clip((g - g.mean()) * 1.2 + 0.5, 0, 1)


def gilt_leaf(n=512, leaves=8):
    """Gold leaf is laid in squares, and every square takes the light a
    little differently; the overlaps leave a faint lattice. This is a grey
    luminance map meant to be multiplied (or soft-lit) over a gold ramp,
    which is where gilding stops looking like a gradient."""
    rng = np.random.default_rng(101)
    cell = n // leaves
    g = np.zeros((n, n))
    for j in range(leaves):
        for i in range(leaves):
            # each leaf is offset a few px so the lattice is not ruled
            g[j * cell:(j + 1) * cell, i * cell:(i + 1) * cell] = rng.normal(0, 0.06)
    g = np.roll(g, (int(rng.integers(0, cell)), int(rng.integers(0, cell))), (0, 1))
    y, x = np.mgrid[0:n, 0:n]
    seam = ((x % cell) < 2) | ((y % cell) < 2)
    g -= seam * 0.08
    wrinkle = fbm(n, 102, 1.6) - 0.5
    g += wrinkle * 0.10 + (fbm(n, 103, 0.6) - 0.5) * 0.05
    return np.clip(0.5 + g, 0, 1)


def frost(n=512):
    """Sand-blasted glass: fine isotropic tooth, grey, for overlay."""
    g = fbm(n, 111, 0.35) * 0.8 + fbm(n, 112, 1.2) * 0.2
    return np.clip((g - g.mean()) * 1.8 + 0.5, 0, 1)


BAKES = [
    ("stone-portoro", portoro, "rgb"),
    ("stone-calacatta", calacatta, "rgb"),
    ("stone-rouge", rouge, "rgb"),
    ("stone-travertine", travertine, "rgb"),
    ("terrazzo-onyx", lambda: terrazzo(1024, True), "rgb"),
    ("terrazzo-ivory", lambda: terrazzo(1024, False), "rgb"),
    ("veneer-macassar", macassar, "rgb"),
    ("veneer-walnut", walnut, "rgb"),
    ("veneer-ash", ash, "rgb"),
    ("veneer-harewood", harewood, "rgb"),
    ("grain-brushed", brushed, "gray"),
    ("grain-pile", pile, "gray"),
    ("grain-plaster", plaster, "gray"),
    ("grain-gilt", gilt_leaf, "gray"),
    ("grain-frost", frost, "gray"),
]


def main():
    written = []
    for name, fn, kind in BAKES:
        data = fn()
        path = save(name, data) if kind == "rgb" else save_gray(name, data)
        written.append(path)
        print("%-24s %6.1f KB" % (name, os.path.getsize(path) / 1024))
    if "--sheet" in sys.argv:
        tiles = [Image.open(p).convert("RGB").resize((384, 384)) for p in written]
        cols = 5
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 392, rows * 392), (60, 60, 60))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % cols) * 392 + 4, (i // cols) * 392 + 4))
        out = os.path.join(ROOT, "shots", "space", "tex-sheet.png")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        sheet.save(out)
        print(out)


if __name__ == "__main__":
    main()
