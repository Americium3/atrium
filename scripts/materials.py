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


def save_rgba(name, arr, q=84):
    os.makedirs(OUT, exist_ok=True)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
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
    """Terrazzo as it is poured, ground and waxed: mostly aggregate. Chips of
    marble in several stones and four sizes cover about half the face, cut
    flat by the grinding so each shows its own colour and figure, with a few
    glassy chips (mother-of-pearl, amber glass) that catch a pin of light.
    The cement shows only between them. Sizes run from fines to chips a
    fiftieth of the tile, drawn smallest first so the big chips lie over
    the small ones as a cut section does. It was about 7% scattered flecks
    on a flat ground and read as a speckled laminate (AR-30). Drawn at 2x
    and downsampled for clean edges, and wrapped so the tile repeats. Sizes
    are given for a 1024 tile and scale with n; the floor lays it at 0.9 of
    its own height, so 512 is already finer than the screen shows."""
    from PIL import ImageDraw
    rng = np.random.default_rng(51 if dark else 52)
    matrix = fbm(n, 53, 2.0) * 0.7 + fbm(n, 54, 0.7) * 0.3
    if dark:
        base = ramp(matrix, [(0, (22, 20, 17)), (1, (38, 34, 29))])
        # nero, bardiglio grey, travertine, giallo siena, statuary white, levanto red
        stones = [((10, 9, 8), 0.24), ((50, 46, 41), 0.22), ((88, 78, 62), 0.18),
                  ((132, 110, 70), 0.12), ((150, 144, 132), 0.12), ((70, 32, 28), 0.12)]
        glass = [(196, 186, 160), (170, 120, 60)]
    else:
        base = ramp(matrix, [(0, (204, 197, 182)), (1, (222, 216, 203))])
        # carrara white, bardiglio grey, siena, verona rose, dark grey, cream
        stones = [((238, 235, 226), 0.26), ((170, 164, 152), 0.2), ((200, 172, 128), 0.16),
                  ((196, 150, 132), 0.14), ((126, 120, 110), 0.12), ((226, 210, 174), 0.12)]
        glass = [(236, 232, 222), (200, 150, 84)]
    cols = np.array([c for c, _ in stones], dtype=np.float64)
    wts = np.array([w for _, w in stones])
    wts = wts / wts.sum()
    S = 2
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").resize((n * S, n * S))
    d = ImageDraw.Draw(img)
    glints = []
    # (count, rmin, rmax): fines, small, medium, large; about half the face
    for count, rmin, rmax in ((26000, 0.9, 1.9), (11000, 2.2, 4.5), (3800, 5.0, 10.0), (950, 11.0, 21.0)):
        for _ in range(count):
            cx, cy = rng.uniform(0, n, 2)
            r = rng.uniform(rmin, rmax) * n / 1024
            k = int(rng.integers(5, 9))
            angs = np.sort(rng.uniform(0, 2 * np.pi, k))
            rad = r * rng.uniform(0.55, 1.1, k)
            sq = rng.uniform(0.6, 1.0)
            if rng.random() < 0.025:
                col = np.array(glass[rng.integers(len(glass))], dtype=np.float64)
                if r > 3:
                    glints.append((cx - r * 0.3, cy - r * 0.3, max(0.7, r * 0.18)))
            else:
                col = cols[rng.choice(len(cols), p=wts)]
            col = tuple(int(c) for c in np.clip(col * rng.uniform(0.88, 1.12), 0, 255))
            for ox in (-n, 0, n):
                for oy in (-n, 0, n):
                    px, py = cx + ox, cy + oy
                    if px + r < -2 or px - r > n + 2 or py + r < -2 or py - r > n + 2:
                        continue
                    d.polygon([((px + rr * np.cos(t)) * S, (py + rr * np.sin(t) * sq) * S)
                               for rr, t in zip(rad, angs)], fill=col)
    for gx, gy, gr in glints:
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                px, py = gx + ox, gy + oy
                if -2 < px < n + 2 and -2 < py < n + 2:
                    d.ellipse([(px - gr) * S, (py - gr) * S, (px + gr) * S, (py + gr) * S], fill=(255, 252, 240))
    img = img.resize((n, n), Image.LANCZOS)
    rgb = np.asarray(img, dtype=np.float64)
    # each stone has its own figure under the grinding: a fine mottle over
    # all of it, so no chip is a flat vector fill
    fig = fbm(n, 55, 0.9) - 0.5
    return rgb * (1 + fig * 0.10)[..., None]


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


# ---------------------------------------------------------------- picture palace
# Direction C: the hall as a 1930s picture-palace foyer. Velvet house
# curtains, a silk damask wall, gilt plaster relief on the cornice, mirrored
# pilasters, a gold mosaic niche and a patterned wool runner. Everything is
# still periodic FFT noise or wrapped geometry, so every tile repeats cleanly.

def _smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def velvet_folds(w=512, h=1024, seed=121, folds=9):
    """House-curtain velvet as a grey relighting map (mean ~0.5, meant for
    `overlay` over the gate's own velvet colour). Each fold is a cylinder of
    pile: facing the house it is dark and saturated, turning away it catches
    the grazing sheen that makes velvet read as velvet, and the valleys sit
    in their own occlusion. Fold widths are irregular and wander slowly down
    the drop; the tile wraps across x so a curtain of any width can be hung."""
    rng = np.random.default_rng(seed)
    widths = rng.uniform(0.55, 1.45, folds)
    widths = widths / widths.sum() * w
    edges = np.concatenate([[0.0], np.cumsum(widths)])
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    # slow meander of every fold down the drop (periodic in x by construction)
    mx = fbm(w, seed + 1, 3.0)[0]            # a smooth row, reused per y
    meander = (np.sin(2 * np.pi * (y / h) * 1.3 + mx[None, :] * 6.0) * 3.5
               + (fbm(h, seed + 2, 3.2)[:, :1] - 0.5) * 6.0)
    xs = (x + meander) % w
    idx = np.clip(np.searchsorted(edges, xs, side="right") - 1, 0, folds - 1)
    u = (xs - edges[idx]) / widths[idx]
    amp = 0.75 + 0.5 * rng.uniform(0, 1, folds)[idx]
    # fold depth grows toward the hem (the drop hangs free) and is gathered
    # tighter under the heading
    depth = amp * (0.72 + 0.4 * (y / h))
    z = -np.cos(2 * np.pi * u) * depth                     # valley 0/1, crest .5
    k = 2 * np.pi * depth * 1.25
    slope = np.sin(2 * np.pi * u) * k
    nz = 1.0 / np.sqrt(1 + slope * slope)
    nx = -slope * nz
    light = np.clip(nx * -0.38 + nz * 0.92, 0, 1)          # key from upper left
    graze = np.power(1 - nz, 1.4)                          # velvet sheen
    ao = 0.42 + 0.58 * _smooth((z / (depth + 1e-6) + 1) / 2 * 1.2)
    lum = ao * (0.30 + 0.55 * light) + 0.62 * graze * (0.55 + 0.45 * ao)
    crush = fbm(w, seed + 3, 1.6) - 0.5                    # crushed-pile mottle
    crush = np.tile(crush, (h // w + 1, 1))[:h]
    nap = fbm(w, seed + 4, 0.5, (1.0, 4.0)) - 0.5          # vertical nap
    nap = np.tile(nap, (h // w + 1, 1))[:h]
    lum = lum * (1 + crush * 0.22 + nap * 0.10)
    lum = (lum - lum.mean()) * 1.05 + 0.5
    return np.clip(lum, 0, 1)


def damask(w=256, h=384, seed=131):
    """Silk damask: the motif is woven in satin, the ground in twill, so the
    pattern shows only as a change of sheen. Deco fan-and-fountain on a
    half-drop repeat. Grey, mean ~0.5, for `soft-light` over the wall colour."""
    from PIL import ImageDraw
    S = 4
    img = Image.new("L", (w * S, h * S), 0)
    d = ImageDraw.Draw(img)

    def fan(cx, cy, r, up=True, rays=9):
        # a stepped fan: three concentric tiers of rays over a disc
        for tier, rr in enumerate((r, r * 0.74, r * 0.48)):
            for i in range(rays - tier * 2):
                n = rays - tier * 2
                a0 = np.pi + (i + 0.12) * np.pi / n
                a1 = np.pi + (i + 0.88) * np.pi / n
                if not up:
                    a0, a1 = a0 - np.pi, a1 - np.pi
                pts = [(cx * S, cy * S)]
                for a in np.linspace(a0, a1, 6):
                    pts.append(((cx + rr * np.cos(a)) * S, (cy + rr * np.sin(a)) * S))
                d.polygon(pts, fill=255 if tier % 2 == 0 else 150)
        rr = r * 0.2
        d.ellipse([(cx - rr) * S, (cy - rr) * S, (cx + rr) * S, (cy + rr) * S], fill=255)

    def fountain(cx, cy, s):
        # the frozen fountain: a stem and three pairs of falling jets
        d.rectangle([(cx - 1.4) * S, (cy - s) * S, (cx + 1.4) * S, (cy + s * 0.9) * S], fill=255)
        for k, f in enumerate((0.8, 0.45, 0.1)):
            yy = cy - s * f
            for sgn in (-1, 1):
                pts = []
                for t in np.linspace(0, 1, 14):
                    px = cx + sgn * s * 0.55 * np.sin(t * np.pi * 0.62) * (1 - k * 0.18)
                    py = yy + s * 0.5 * t * t
                    pts.append((px * S, py * S))
                d.line(pts, fill=210, width=int(2.2 * S))
    for (ox, oy) in ((0, 0), (w / 2, h / 2)):
        for dx in (-w, 0, w):
            for dy in (-h, 0, h):
                fan(ox + w / 4 + dx, oy + h * 0.30 + dy, w * 0.21, True)
                fan(ox + w / 4 + dx, oy + h * 0.30 + dy + 5, w * 0.10, False, 5)
                # stepped lozenge between the repeats
                cx, cy = ox + w * 0.75 + dx, oy + h * 0.25 + dy
                for s, f in ((14, 255), (9, 0), (5, 255)):
                    d.polygon([(cx * S, (cy - s) * S), ((cx + s) * S, cy * S),
                               (cx * S, (cy + s) * S), ((cx - s) * S, cy * S)], fill=f)
    # ogee lattice: the damask's cage, a thin satin line
    for k in range(-2, 5):
        pts = []
        for t in np.linspace(0, 1, 60):
            yy_ = t * h * 2 - h * 0.5
            xx_ = w * 0.5 * k + w * 0.23 * np.sin(t * 4 * np.pi)
            pts.append((xx_ * S, yy_ * S))
        d.line(pts, fill=190, width=int(1.6 * S))
        d.line([(w * S - px, py) for px, py in pts], fill=190, width=int(1.6 * S))
    m = np.asarray(img.resize((w, h), Image.LANCZOS), dtype=np.float64) / 255.0
    yy, xx = np.mgrid[0:h, 0:w]
    twill = ((xx + yy) % 4 < 2).astype(np.float64)          # ground weave
    satin = (xx % 3 == 0).astype(np.float64)                # satin float lines
    tooth = fbm(max(w, h), seed, 0.7)[:h, :w] - 0.5
    lum = 0.44 + m * 0.16 + (1 - m) * (twill - 0.5) * 0.05 + m * (satin - 0.5) * 0.025
    lum += tooth * 0.06
    return np.clip(lum, 0, 1)


def _height_to_rgb(hgt, light, albedo_lo, albedo_hi, glaze, ambient, gain, spec=0.0, px=1.0):
    """Relight a heightmap: lambert along `light` (x right, y DOWN, z out),
    occlusion from a blurred copy, gilt glazed dark in the recesses. `px` is
    the bake's pixels per design unit, so a tile baked at 2x lights the same
    as its 1x original."""
    from scipy.ndimage import gaussian_filter
    gy, gx = np.gradient(hgt, 1.0 / px)
    nx, ny, nz = -gx * 6, -gy * 6, np.ones_like(hgt)
    nn = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / nn, ny / nn, nz / nn
    L = np.array(light, dtype=np.float64)
    L /= np.linalg.norm(L)
    lam = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    occ = np.clip(1 - (gaussian_filter(hgt, 6 * px, mode="wrap") - hgt) * 3.0, 0.35, 1)
    # half vector with the viewer straight on: a tight highlight on the crests
    Hh = L + np.array([0, 0, 1.0])
    Hh /= np.linalg.norm(Hh)
    sp = np.power(np.clip(nx * Hh[0] + ny * Hh[1] + nz * Hh[2], 0, 1), 28) * spec
    t = np.clip(hgt, 0, 1)
    alb = (np.array(albedo_lo)[None, None, :] * (1 - t[..., None])
           + np.array(albedo_hi)[None, None, :] * t[..., None])
    gl = np.clip((1 - t) * glaze, 0, 1)[..., None]
    alb = alb * (1 - gl) + np.array([61, 42, 20])[None, None, :] * gl
    shade = (ambient + gain * lam) * occ
    return alb * shade[..., None] + sp[..., None] * 255


def frieze_height(w=512, h=128):
    """Gilt plaster frieze for the cornice: a bead course, then a run of
    fan palmettes alternating with stepped fountains, then reeds. Periodic in
    x (two motifs per tile)."""
    from scipy.ndimage import gaussian_filter
    y, x = np.mgrid[0:h, 0:w].astype(np.float64)
    H = np.zeros((h, w))
    # bead course (top), fillet, reeds (bottom)
    bead_y, bead_r, pitch = 11.0, 5.2, 16.0
    bx = (x % pitch) - pitch / 2
    bd = np.sqrt(bx * bx + (y - bead_y) ** 2)
    H = np.maximum(H, np.sqrt(np.clip(bead_r ** 2 - bd ** 2, 0, None)) / bead_r * 0.9)
    H = np.maximum(H, ((y > 19) & (y < 24)) * 0.75)
    H = np.maximum(H, ((y > 104) & (y < 108)) * 0.75)
    reed = (y > 110) & (y < 126)
    H = np.maximum(H, reed * (0.45 + 0.35 * np.abs(np.sin((y - 110) / 16 * np.pi * 3))))
    # field between y 26..102
    unit = w / 2
    for k in range(2):
        cx = unit * k + unit * 0.5
        cy = 100.0
        dx = x - cx
        dy = y - cy
        r = np.sqrt(dx * dx + dy * dy)
        a = np.arctan2(dy, dx)                         # -pi..0 above
        # fan palmette: 13 rays, each a raised ridge with a rounded profile
        n = 13
        ang = (a + np.pi) / np.pi * n                  # 0..n across the top half
        ridge = 1 - np.abs((ang % 1) - 0.5) * 2
        ray = (r < 70) & (r > 16) & (dy < 0)
        prof = np.power(np.clip(ridge, 0, 1), 0.6) * (0.55 + 0.45 * (1 - r / 70))
        H = np.maximum(H, ray * prof * 0.95)
        # scalloped rim of the fan
        rim = (np.abs(r - 72) < 3.2) & (dy < 0)
        H = np.maximum(H, rim * 0.8)
        # boss at the fan's hub
        boss = np.sqrt(np.clip(15 ** 2 - (dx ** 2 + (dy + 2) ** 2), 0, None)) / 15
        H = np.maximum(H, boss * (dy < 2))
        # stepped fountain between fans
        fx = x - (cx + unit / 2)
        steps = np.zeros_like(H)
        for s, (hw, top) in enumerate(((42, 94), (30, 76), (19, 58), (9, 40))):
            steps = np.maximum(steps, ((np.abs(fx) < hw) & (y > top) & (y < 102)) * (0.28 + s * 0.16))
        H = np.maximum(H, steps)
        # reeded drops either side of the ziggurat: three flutes that step
        # down toward the fans, the frieze's quiet beat between two loud ones
        for sgn in (-1, 1):
            for j in range(3):
                off = 52 + j * 7
                top = 40 + j * 12
                flute = (np.abs(fx - sgn * off) < 2.6) & (y > top) & (y < 100)
                prof = 1 - np.abs(fx - sgn * off) / 2.6
                H = np.maximum(H, flute * (0.35 + 0.35 * np.clip(prof, 0, 1)))
                cap = np.sqrt(np.clip(3.2 ** 2 - ((fx - sgn * off) ** 2 + (y - top) ** 2), 0, None)) / 3.2
                H = np.maximum(H, cap * 0.75)
    H = gaussian_filter(H, 0.9, mode="wrap")
    return H


def frieze(day=False):
    H = frieze_height()
    if day:
        # daylight from above: plaster cream on the ground, gilt on the relief
        rgb = _height_to_rgb(H, (-0.25, -0.75, 0.62), (206, 190, 160), (214, 176, 98),
                             0.35, 0.52, 0.62, spec=0.35)
    else:
        # the cove is hidden BELOW the cornice: light rakes up the relief
        rgb = _height_to_rgb(H, (-0.15, 0.8, 0.5), (46, 30, 16), (190, 142, 66),
                             0.65, 0.16, 0.95, spec=0.55)
        # the cove's own falloff: bright at the foot, dying toward the soffit
        yy = np.mgrid[0:H.shape[0], 0:H.shape[1]][0] / H.shape[0]
        rgb *= (0.35 + 0.8 * np.power(yy, 1.6))[..., None]
    return rgb


def mirror_antique(n=512, seed=141):
    """Antique mirror: silvering with foxing. Grey, for multiply/overlay over
    whatever the mirror is reflecting."""
    base = fbm(n, seed, 1.8)
    fox = np.clip((fbm(n, seed + 1, 2.4) - 0.58) * 3.2, 0, 1)
    speck = np.clip((fbm(n, seed + 2, 0.4) - 0.8) * 5, 0, 1)
    veil = fbm(n, seed + 3, 2.8, (6.0, 1.0))
    lum = 0.62 + (base - 0.5) * 0.10 - fox * 0.30 - speck * 0.25 + (veil - 0.5) * 0.08
    return np.clip(lum, 0, 1)


def mosaic_gold(n=512, cell=16, seed=151):
    """Gold smalti, set by hand: courses of uneven height, each tessera its
    own width (about a quarter either way), a hair out of square and turned
    a few degrees, its glass anywhere from pale gold to amber, and set at
    its own tilt so each takes the light differently; one in fifteen tilted
    toward the lamp throws a glint. Dark grout in the joints, a lit arris on
    the upper left of each. It was a machine grid at exactly 16px with every
    row offset 7.5px, and in the niche's corners it read as a tile sheet or
    a grate (AR-34). Drawn at 2x as an id map, coloured per tessera, and
    wrapped in both directions."""
    from PIL import ImageDraw
    from scipy.ndimage import gaussian_filter
    rng = np.random.default_rng(seed)
    S = 2
    N = n * S
    rows = np.maximum(rng.normal(cell, cell * 0.14, n // cell), cell * 0.7)
    rows = rows / rows.sum() * n
    ids = Image.new("I", (N, N), 0)
    d = ImageDraw.Draw(ids)
    cx_l, cy_l, sz_l = [], [], []
    y0 = 0.0
    for rh in rows:
        widths = np.maximum(rng.normal(cell, cell * 0.25, int(n / cell * 1.2)), cell * 0.55)
        k = int(np.searchsorted(np.cumsum(widths), n)) + 1
        widths = widths[:k] / widths[:k].sum() * n
        x0 = rng.uniform(0, n)
        for tw in widths:
            g = rng.uniform(1.4, 2.4)
            w2, h2 = (tw - g) / 2, (rh - g) / 2
            cx, cy = x0 + tw / 2, y0 + rh / 2 + rng.uniform(-0.6, 0.6)
            ang = np.radians(rng.normal(0, 3.2))
            ca, sa = np.cos(ang), np.sin(ang)
            corners = [(-w2, -h2), (w2, -h2), (w2, h2), (-w2, h2)]
            pts = []
            for px, py in corners:
                px += rng.uniform(-0.7, 0.7)
                py += rng.uniform(-0.7, 0.7)
                pts.append((px * ca - py * sa, px * sa + py * ca))
            tid = len(cx_l) + 1
            cx_l.append(cx % n)
            cy_l.append(cy % n)
            sz_l.append(max(tw, rh))
            for ox in (-n, 0, n):
                for oy in (-n, 0, n):
                    X, Y = cx + ox, cy + oy
                    if X + tw < 0 or X - tw > n or Y + rh < 0 or Y - rh > n:
                        continue
                    d.polygon([((X + px) * S, (Y + py) * S) for px, py in pts], fill=tid)
            x0 += tw
        y0 += rh
    idm = np.asarray(ids, dtype=np.int64)
    T = len(cx_l)
    cxa = np.array([0.0] + cx_l) * S
    cya = np.array([0.0] + cy_l) * S
    sza = np.array([1.0] + sz_l) * S
    hue = rng.uniform(0, 1, T + 1)                       # 0 pale gold .. 1 amber
    tone = rng.uniform(0.72, 1.12, T + 1)
    tilt = rng.normal(0, 1, (T + 1, 2))
    glint = rng.random(T + 1) < 1 / 15
    tone[glint] = rng.uniform(1.18, 1.32, glint.sum())
    tilt[glint] = [-0.9, -1.1]                            # toward the lamp, up and left
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float64)
    dx = (xx - cxa[idm] + N / 2) % N - N / 2
    dy = (yy - cya[idm] + N / 2) % N - N / 2
    face = 1 + (dx * tilt[idm, 0] + dy * tilt[idm, 1]) / sza[idm] * 0.32
    pale, gold, amber = np.array([222, 186, 112.0]), np.array([200, 152, 70.0]), np.array([176, 112, 42.0])
    h = hue[idm][..., None]
    glass = np.where(h < 0.5, pale + (gold - pale) * (h / 0.5), gold + (amber - gold) * ((h - 0.5) / 0.5))
    rgb = glass * (tone[idm] * face)[..., None]
    # a lit arris on the upper left of every tessera, where it meets grout
    edge = (idm > 0) & ((np.roll(idm, 3, 0) != idm) | (np.roll(idm, 3, 1) != idm))
    rgb = np.where(edge[..., None], rgb * 1.16, rgb)
    grout = np.array([38, 28, 16.0]) * (0.85 + 0.3 * gaussian_filter(rng.random((N, N)), 3, mode="wrap")[..., None] * 2)
    rgb = np.where((idm > 0)[..., None], rgb, grout)
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").resize((n, n), Image.LANCZOS)
    return np.asarray(img, dtype=np.float64)


def _pile(h, w, seed, pitch=8):
    """Cut pile seen from above, as a brightness map about 1. The tufts are
    set in woven rows, each row half a tuft along from the last (the weave),
    but no tuft stands exactly on its mark: each leans its own way, has its
    own height, and frays into its neighbours, so the rows show only as a
    faint grain and never as a grid (a grid shimmers when the floor's
    perspective shrinks it). The top of a tuft catches the light on the side
    the nap leans from, and the whole lies in slow patches where the pile was
    brushed one way or the other. Periodic when w and h are multiples of the
    pitch and the row count is even."""
    rng = np.random.default_rng(seed)
    rows, cols = h // pitch, w // pitch
    y, x = np.mgrid[0:h, 0:w].astype(np.float64) + 0.5
    row = np.floor(y / pitch)
    xo = x + (row % 2) * pitch / 2
    ri = row.astype(int) % rows
    ci = np.floor(xo / pitch).astype(int) % cols
    jx = rng.uniform(-0.22, 0.22, (rows, cols))[ri, ci]
    jy = rng.uniform(-0.18, 0.18, (rows, cols))[ri, ci]
    tall = rng.uniform(0.6, 1.4, (rows, cols))[ri, ci]
    fx = (xo % pitch) / pitch - 0.5 - jx
    fy = (y % pitch) / pitch - 0.5 - jy
    dome = np.clip(1 - (fx * fx + (fy + 0.08) ** 2) * 3.0, 0, 1)
    lit = np.clip(0.5 - fy * 1.4, 0, 1)
    tuft = 0.92 + 0.11 * dome * tall + 0.04 * lit * dome
    n = max(h, w)
    lay = fbm(n, seed + 1, 2.1, (1.0, 1.8))[:h, :w] - 0.5
    fuzz = fbm(n, seed + 2, 0.4)[:h, :w] - 0.5
    return tuft * (1 + lay * 0.16 + fuzz * 0.20)


def _wool(rgb, ground, seed, pitch=8, soft=1.3, wander=3.0):
    """Turn a drawn pattern into wool. A knotted pile cannot hold a vector
    edge: the motif's edges are wandered a tuft's width by noise and
    softened, its contrast against the ground is taken down by a third (a
    dyed yarn is never as far from its neighbour as a printed ink), and the
    pile is laid over all of it. pitch, soft and wander are in the tile's
    own pixels: a tile laid denser on the floor takes them larger, so its
    weave and its softness match the field's on screen."""
    from scipy.ndimage import gaussian_filter, map_coordinates
    h, w = rgb.shape[:2]
    n = max(h, w)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    wx = (fbm(n, seed + 3, 1.2)[:h, :w] - 0.5) * wander
    wy = (fbm(n, seed + 4, 1.2)[:h, :w] - 0.5) * wander
    out = np.empty_like(rgb)
    for c in range(3):
        out[..., c] = map_coordinates(rgb[..., c], [yy + wy, xx + wx], order=1, mode="grid-wrap")
    out = gaussian_filter(out, (soft, soft, 0), mode="wrap")
    g = np.array(ground, dtype=np.float64)[None, None, :]
    out = g + (out - g) * 0.68
    return out * _pile(h, w, seed + 5, pitch)[..., None]


def carpet_fringe(w=96, h=48, seed=181):
    """The knotted fringe at the runner's far end, as RGBA: the warp ends of
    the weave, knotted in bunches under the heading and hanging free below
    it in natural wool, each tassel its own length and a little crooked."""
    from PIL import ImageDraw
    S = 4
    rng = np.random.default_rng(seed)
    img = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    WOOL, SHADE, KNOT = (226, 206, 164, 255), (168, 142, 100, 255), (196, 170, 124, 255)
    # the heading: the last weft rows the warp is knotted through
    d.rectangle([0, 0, w * S, 6 * S], fill=(120, 34, 36, 255))
    d.rectangle([0, 6 * S, w * S, 8 * S], fill=(70, 18, 20, 255))
    pitch = 8
    for k in range(w // pitch):
        cx = k * pitch + pitch / 2
        ln = h - 12 - rng.uniform(0, 8)
        lean = rng.uniform(-1.4, 1.4)
        for j in range(-2, 3):
            x0 = cx + j * 1.1
            col = SHADE if j in (-2, 2) else WOOL
            d.line([(x0 * S, 11 * S), ((x0 + lean + j * 0.5) * S, (11 + ln) * S)], fill=col, width=int(1.2 * S))
        d.ellipse([(cx - 2.6) * S, 7.5 * S, (cx + 2.6) * S, 12.5 * S], fill=KNOT)
    arr = np.asarray(img.resize((w, h), Image.LANCZOS), dtype=np.float64)
    tuft = fbm(max(w, h), seed + 1, 0.4)[:h, :w] - 0.5
    arr[..., :3] *= (1 + tuft * 0.22)[..., None]
    return arr


def carpet(n=512, seed=161):
    """The runner: a picture-palace wool carpet, fans and stepped streamers on
    claret, gold and black, one teal accent. Drawn at 4x, then made wool
    (_wool): wandered, softened, taken down a third, and given a woven cut
    pile, so it reads as a carpet and not as a print (AR-11)."""
    from PIL import ImageDraw
    S = 4
    CLARET, DEEP, GOLD, OLDG, BLACK, TEAL, CREAM = (
        (112, 22, 30), (72, 12, 20), (196, 150, 70), (150, 104, 44),
        (22, 12, 12), (30, 96, 92), (220, 196, 150))
    img = Image.new("RGB", (n * S, n * S), CLARET)
    d = ImageDraw.Draw(img)

    def P(pts):
        return [(px * S, py * S) for px, py in pts]

    def fan(cx, cy, r, rot=0.0):
        for tier, (rr, col) in enumerate(((r, BLACK), (r * 0.92, GOLD), (r * 0.70, DEEP),
                                           (r * 0.62, OLDG), (r * 0.38, CLARET))):
            pts = [(cx, cy)]
            for a in np.linspace(np.pi, 2 * np.pi, 40):
                pts.append((cx + rr * np.cos(a + rot), cy + rr * np.sin(a + rot)))
            d.polygon(P(pts), fill=col)
        for i in range(9):
            a = np.pi + (i + 0.5) * np.pi / 9 + rot
            d.line(P([(cx + r * 0.40 * np.cos(a), cy + r * 0.40 * np.sin(a)),
                      (cx + r * 0.90 * np.cos(a), cy + r * 0.90 * np.sin(a))]),
                   fill=BLACK, width=int(2.6 * S))
        d.ellipse([(cx - r * 0.16) * S, (cy - r * 0.16) * S, (cx + r * 0.16) * S,
                   (cy + r * 0.16) * S], fill=GOLD)

    for ox in (-n, 0, n):
        for oy in (-n, 0, n):
            # two fans per tile on a half-drop, facing the walker
            fan(ox + n * 0.25, oy + n * 0.46, n * 0.23)
            fan(ox + n * 0.75, oy + n * 0.96, n * 0.23)
            # stepped streamers between them
            for sx in (0.5, 0.0):
                cx, cy = ox + n * sx, oy + n * (0.18 if sx else 0.68)
                for k, (hw, col) in enumerate(((34, BLACK), (26, GOLD), (18, CLARET), (8, TEAL))):
                    d.polygon(P([(cx, cy - hw * 1.3), (cx + hw, cy), (cx, cy + hw * 1.3), (cx - hw, cy)]),
                              fill=col)
                for sgn in (-1, 1):
                    xx = cx + sgn * 40
                    for j in range(3):
                        d.rectangle(P([(xx - 3 + sgn * j * 10, cy - 30 + j * 10),
                                       (xx + 3 + sgn * j * 10, cy + 30 - j * 10)]), fill=OLDG)
            # dots of cream in the ground
            for (px, py) in ((0.08, 0.1), (0.42, 0.72), (0.92, 0.36), (0.58, 0.22)):
                cx, cy = ox + n * px, oy + n * py
                d.ellipse([(cx - 3.2) * S, (cy - 3.2) * S, (cx + 3.2) * S, (cy + 3.2) * S], fill=CREAM)
    rgb = np.asarray(img.resize((n, n), Image.LANCZOS), dtype=np.float64)
    return _wool(rgb, CLARET, seed)


def carpet_border(w=384, h=768, seed=171):
    """The runner's border, running along y (the carpet's length): a claret
    guard at each selvedge, an old-gold stripe inside it, and on the black
    field a stepped chevron in gold, woven square to the weave, with a thin
    claret chevron between each pair. Three yarns and the black.
    It was 96px wide and drawn 2.1x up at 3440, soft next to the field, and
    its gold zigzag wandered like a scribble (AR-35). At 384 the border is
    laid about four texels to a plane pixel where the field is laid at about
    two and a quarter, so it is woven at twice the field's pile pitch and
    softened in proportion, to match the field's weave on screen."""
    BLACK, GOLD, OLD, CLARET = (22, 12, 12), (196, 150, 70), (150, 106, 46), (112, 22, 30)
    y, x = np.mgrid[0:h, 0:w].astype(np.float64) + 0.5
    rgb = np.empty((h, w, 3))
    rgb[:] = BLACK
    ax = np.abs(x - w / 2)                        # across the band from its middle
    rgb[ax > w * 0.406] = CLARET                  # the guards at the selvedges
    rgb[(ax > w * 0.344) & (ax <= w * 0.375)] = OLD
    field = ax <= w * 0.344
    P = h / 4                                     # four chevrons to the tile
    step = w * 0.0573                             # a stepped arm, square to the weave
    q = np.floor(ax / step) * step
    ph = (y - q * 0.9) % P
    rgb[field & (ph < P * 0.135)] = GOLD
    rgb[field & (np.abs(ph - P * 0.5) < P * 0.056)] = CLARET
    return _wool(rgb, BLACK, seed, pitch=16, soft=2.3, wander=5.2)


PALACE = [
    ("fab-velvet", velvet_folds, "gray"),
    ("fab-damask", damask, "gray"),
    ("relief-frieze-night", lambda: frieze(False), "rgb"),
    ("relief-frieze-day", lambda: frieze(True), "rgb"),
    ("glass-mirror", mirror_antique, "gray"),
    ("mosaic-gold", mosaic_gold, "rgb"),
    ("carpet-field", carpet, "rgb"),
    ("carpet-border", carpet_border, "rgb"),
    ("carpet-fringe", carpet_fringe, "rgba"),
]


BAKES = [
    ("stone-portoro", portoro, "rgb"),
    ("stone-calacatta", calacatta, "rgb"),
    ("stone-rouge", rouge, "rgb"),
    ("stone-travertine", travertine, "rgb"),
    ("terrazzo-onyx", lambda: terrazzo(512, True), "rgb"),
    ("terrazzo-ivory", lambda: terrazzo(512, False), "rgb"),
    ("veneer-macassar", macassar, "rgb"),
    ("veneer-walnut", walnut, "rgb"),
    ("veneer-ash", ash, "rgb"),
    ("veneer-harewood", harewood, "rgb"),
    ("grain-brushed", brushed, "gray"),
    ("grain-pile", pile, "gray"),
    ("grain-plaster", plaster, "gray"),
    ("grain-gilt", gilt_leaf, "gray"),
    ("grain-frost", frost, "gray"),
    # the same frost at half size, for the entrance, which inlines it into
    # every picture of etched glass it paints
    ("grain-frost-small", lambda: frost().reshape(256, 2, 256, 2).mean(axis=(1, 3)), "gray"),
]


def main():
    written = []
    bakes = BAKES + PALACE
    if "--palace" in sys.argv:
        bakes = PALACE
    for name, fn, kind in bakes:
        data = fn()
        if kind == "rgba":
            path = save_rgba(name, data)
        else:
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
