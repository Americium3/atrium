"""What the hall's own files have to be true before they are served.

Run: python tests/test_web_assets.py

The front end is vanilla JavaScript with no build step, which is why it is
quick to change and why a bad edit reaches the browser intact. A duplicated
block that redeclares a `let`, or a `const` read above its own line, is
invisible to the eye and blanks the whole hall at runtime. A parse would
have caught either, so the parse is a test. `node --check` runs when node is
on the PATH; every other check is plain Python and always runs.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import traceback
from pathlib import Path

STATIC = Path(__file__).resolve().parents[1] / "static"
PAGE = STATIC / "index.html"


def scripts() -> list[Path]:
    return sorted((STATIC / "js").glob("*.js"))


def sheets() -> list[Path]:
    return sorted((STATIC / "css").glob("*.css"))


def css_sources() -> list[tuple[str, str]]:
    """Every place the hall's CSS can come from, as (name, text): each sheet,
    each <style> block in the page, and each style="" attribute in it (as a
    rule on its element, so a selector test sees what it styles)."""
    out = [(f.name, f.read_text(encoding="utf-8")) for f in sheets()]
    page = PAGE.read_text(encoding="utf-8")
    for k, m in enumerate(re.finditer(r"<style[^>]*>(.*?)</style>", page, flags=re.S | re.I)):
        out.append((f"index.html <style> #{k + 1}", m.group(1)))
    for m in re.finditer(r"<([a-zA-Z][\w-]*)([^>]*?)\sstyle=\"([^\"]*)\"", page):
        attrs = m.group(2)
        cls = re.search(r'class="([^"]*)"', attrs)
        ident = re.search(r'id="([^"]*)"', attrs)
        sel = m.group(1) + ("#" + ident.group(1) if ident else "") + \
            "".join("." + c for c in (cls.group(1).split() if cls else []))
        out.append((f"index.html style attribute on {sel}", f"{sel} {{ {m.group(3)} }}"))
    return out


def test_every_script_parses():
    """A syntax error in any script is a blank hall, not a broken feature."""
    node = shutil.which("node")
    if not node:
        print("  (node is not on the PATH; parse check skipped)")
        return
    for js in scripts():
        proc = subprocess.run([node, "--check", str(js)], capture_output=True, text=True)
        assert proc.returncode == 0, f"{js.name} does not parse:\n{proc.stderr}"


def test_no_line_is_written_twice_in_a_row():
    """A patch applied twice leaves its lines doubled. Adjacent identical
    lines of real length are never intentional in these files."""
    for f in scripts() + sheets():
        lines = f.read_text(encoding="utf-8").split("\n")
        doubled = [
            (i + 2, a.strip()[:60])
            for i, (a, b) in enumerate(zip(lines, lines[1:]))
            if a == b and len(a.strip()) > 14
            and not a.strip().startswith(("//", "*", "/*", "<"))
        ]
        assert not doubled, f"{f.name} repeats a line: {doubled[:4]}"


def test_no_merge_marker_is_left_in():
    """A stray `=======` from a hand-resolved merge is valid enough CSS to
    parse on, and silently drops the next rule: the whole night theme's room
    tokens went missing that way once. A marker is a line of exactly seven
    signs, so a long ==== rule inside a comment does not count."""
    marker = re.compile(r"^(<{7}|={7}|>{7})( |$)")
    for f in scripts() + sheets() + [PAGE]:
        hits = [i + 1 for i, line in enumerate(f.read_text(encoding="utf-8").split("\n"))
                if marker.match(line.rstrip("\r"))]
        assert not hits, f"{f.name} has merge markers on lines {hits[:4]}"


# Ids the scripts create at runtime rather than finding in the markup.
DYNAMIC_IDS: set[str] = set()


def test_every_id_a_script_reaches_for_exists():
    """`$('#missing')` returns null and the next line throws. The ids live in
    two places, the markup and the scripts, and nothing but this keeps them
    in step when one side is rewritten."""
    markup = PAGE.read_text(encoding="utf-8")
    for js in scripts():
        source = js.read_text(encoding="utf-8")
        wanted = set(re.findall(r"""\$\(['"]#([\w-]+)['"]""", source))
        wanted |= set(re.findall(r"""getElementById\(['"]([\w-]+)['"]\)""", source))
        created = set(re.findall(r"""\.id\s*=\s*['"]([\w-]+)['"]""", source))
        missing = sorted(i for i in wanted - DYNAMIC_IDS - created
                         if f'id="{i}"' not in markup)
        assert not missing, f"{js.name} looks for ids the page never defines: {missing}"


def test_no_rule_declares_a_custom_property_twice():
    """The duplicate-line check only sees adjacent repeats. A token block
    pasted in twice with its comment between reads as deliberate and is
    not. Ordinary properties are exempt (a second `background` is a real
    fallback); a custom property is never declared twice on purpose."""
    for f in sheets():
        source = re.sub(r"/\*.*?\*/", "", f.read_text(encoding="utf-8"), flags=re.S)
        offenders = []
        for rule in re.finditer(r"([^{}]*)\{([^{}]*)\}", source):
            seen: dict[str, int] = {}
            for decl in re.finditer(r"(?:^|[;\n])\s*(--[\w-]+)\s*:", rule.group(2)):
                seen[decl.group(1)] = seen.get(decl.group(1), 0) + 1
            sel = rule.group(1).strip().splitlines()[-1].strip() if rule.group(1).strip() else "?"
            offenders += [(sel[:48], p) for p, n in seen.items() if n > 1]
        assert not offenders, f"{f.name} declares a custom property twice in one rule: {offenders[:4]}"


def test_every_static_file_the_page_links_exists():
    """A stylesheet or script the page links but the tree lacks is a 404
    the hall renders straight past, half dressed."""
    markup = PAGE.read_text(encoding="utf-8")
    refs = set(re.findall(r'(?:href|src)="/static/([^"?#]+)"', markup))
    missing = sorted(r for r in refs if not (STATIC / r).is_file())
    assert not missing, f"index.html links files that do not exist: {missing}"


def test_every_texture_a_sheet_asks_for_exists():
    """Same, for url() inside the stylesheets: a missing texture is not an
    error anywhere, just a bare surface."""
    missing = []
    for f in sheets():
        for ref in re.findall(r"url\(['\"]?/static/([^'\")?#]+)", f.read_text(encoding="utf-8")):
            if not (STATIC / ref).is_file():
                missing.append(f"{f.name}: {ref}")
    assert not missing, f"stylesheets reference files that do not exist: {missing}"


def test_the_page_loads_the_faces_it_sets_type_in():
    """A preload for a face no stylesheet declares is a wasted round trip,
    and a preload whose URL differs from the @font-face URL downloads twice."""
    css = "\n".join(f.read_text(encoding="utf-8") for f in sheets())
    declared = set(re.findall(r"url\(['\"]?/static/fonts/([\w.-]+)", css))
    preloaded = set(re.findall(r'rel="preload" href="/static/fonts/([\w.-]+)"',
                               PAGE.read_text(encoding="utf-8")))
    assert preloaded <= declared, f"index.html preloads faces no sheet declares: {preloaded - declared}"


# --------------------------------------------------------------------------
# The marks and their curtains. icons/gen.py HUE is the one source: each app's
# enamel and the velvet its gate hangs, per theme. These read HUE with ast, so
# they need neither PIL nor a browser.
# --------------------------------------------------------------------------
ROOT = STATIC.parent
GEN = ROOT / "icons" / "gen.py"


def _literal(name: str):
    import ast
    tree = ast.parse(GEN.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError(f"icons/gen.py has no literal {name}")


def _rgb(hex_: str) -> list[float]:
    h = hex_.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def _linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _luminance(hex_: str) -> float:
    r, g, b = (_linear(c) for c in _rgb(hex_))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _lab(hex_: str) -> tuple[float, float, float]:
    r, g, b = (_linear(c) for c in _rgb(hex_))
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def _lch(hex_: str) -> tuple[float, float, float]:
    import math
    l, a, b = _lab(hex_)
    return l, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def _de2000(c1: str, c2: str) -> float:
    """CIEDE2000 between two sRGB colours."""
    import math
    L1, a1, b1 = _lab(c1)
    L2, a2, b2 = _lab(c2)
    cb = (math.hypot(a1, b1) + math.hypot(a2, b2)) / 2
    g = 0.5 * (1 - math.sqrt(cb ** 7 / (cb ** 7 + 25 ** 7)))
    a1, a2 = (1 + g) * a1, (1 + g) * a2
    c1p, c2p = math.hypot(a1, b1), math.hypot(a2, b2)
    h1 = math.degrees(math.atan2(b1, a1)) % 360
    h2 = math.degrees(math.atan2(b2, a2)) % 360
    dh = 0.0 if c1p * c2p == 0 else ((h2 - h1 + 180) % 360) - 180
    dH = 2 * math.sqrt(c1p * c2p) * math.sin(math.radians(dh / 2))
    lb, cbp = (L1 + L2) / 2, (c1p + c2p) / 2
    if c1p * c2p == 0:
        hb = h1 + h2
    elif abs(h1 - h2) <= 180:
        hb = (h1 + h2) / 2
    else:
        hb = (h1 + h2 + 360) / 2 if h1 + h2 < 360 else (h1 + h2 - 360) / 2
    t = (1 - 0.17 * math.cos(math.radians(hb - 30)) + 0.24 * math.cos(math.radians(2 * hb))
         + 0.32 * math.cos(math.radians(3 * hb + 6)) - 0.20 * math.cos(math.radians(4 * hb - 63)))
    sl = 1 + 0.015 * (lb - 50) ** 2 / math.sqrt(20 + (lb - 50) ** 2)
    sc, sh = 1 + 0.045 * cbp, 1 + 0.015 * cbp * t
    rt = (-math.sin(math.radians(60 * math.exp(-((hb - 275) / 25) ** 2)))
          * 2 * math.sqrt(cbp ** 7 / (cbp ** 7 + 25 ** 7)))
    dl, dc = (L2 - L1) / sl, (c2p - c1p) / sc
    return math.sqrt(dl ** 2 + dc ** 2 + (dH / sh) ** 2 + rt * dc * (dH / sh))


def _leaf_body() -> dict[str, str]:
    css = (STATIC / "css" / "atrium.css").read_text(encoding="utf-8")
    out = {}
    for theme, block in re.findall(r':root\[data-theme="(onyx|ivory)"\]\s*\{([^}]*)\}', css):
        m = re.search(r"--au-2:\s*(#[0-9a-fA-F]{6})", block)
        if m:
            out[theme] = m.group(1)
    assert set(out) == {"onyx", "ivory"}, f"--au-2 not found for both themes: {out}"
    return out


def _wings() -> dict[str, str]:
    src = (ROOT / "server.py").read_text(encoding="utf-8")
    return dict(re.findall(r'"id":\s*"([\w-]+)",.*?"wing":\s*"(\w+)"', src, flags=re.S))


# A curtain belongs to its mark when its hue sits within this of the mark's
# ground as the page draws it (CIELAB hue angle, degrees), and nearer to it
# than to any other mark's ground (the largest real offset is under 14
# degrees; at 30 an amber mark could hang an olive cloth). A neutral ground
# (chroma under 12, a steel) takes a neutral cloth instead: chroma 10 at most,
# and where the cloth shows any colour at all (chroma over 6) it is the
# ground's own hue.
VELVET_HUE_TOLERANCE = 20.0
NEUTRAL_CHROMA = 12.0
NEUTRAL_VELVET_CHROMA = 10.0
# Two gates of one wing must not read as the same cloth (CIEDE2000), open or
# with the house dark (the shade mixes in palace-gates.css), measured as the
# cloth renders: the dye multiplied by the fold map, whose mean is FOLD (the
# mean of static/assets/tex/fab-velvet-pile.webp; the pile's grain is laid
# in soft light at its neutral grey and moves nothing). Measured on the dyes
# alone the dark houses passed at 15 and rendered at 5 to 7.
WING_MIN_DE = 15.0
WING_MIN_DE_DARK = 10.0
FOLD = 0.431
DARK_MIX = {"onyx": (0.55, "#0f0d0f"), "ivory": (0.48, "#110e0c")}


def _page_marks() -> dict[str, str]:
    """Each mark's markup as the page carries it: {'autopilot': ...,
    'autopilot-s': ...}, one line of the generated block each."""
    page = PAGE.read_text(encoding="utf-8").replace("\r\n", "\n")
    return {m.group(1): m.group(2) for m in re.finditer(r'^  <g id="mark-([\w-]+)"[^>]*>(.*)</g>$', page, flags=re.M)}


def _shipped_velvets() -> dict[tuple[str, str], str]:
    """The dye each gate's cloth is given in the stylesheets as served:
    {(theme, key): '#rrggbb'} for every `.gate[data-velvet=key]` rule."""
    out = {}
    for sheet in sheets():
        css = re.sub(r"/\*.*?\*/", "", sheet.read_text(encoding="utf-8"), flags=re.S)
        for theme, key, hex_ in re.findall(
                r':root\[data-theme="(\w+)"\] \.gate\[data-velvet="([\w-]+)"\] \{ --velvet: (#[0-9a-fA-F]{6}); \}', css):
            out[(theme, key)] = hex_.lower()
    return out


def _gradient(markup: str, gid: str):
    """A gradient in the mark's defs, as a function of (x, y) giving
    (r, g, b, alpha) in 0..1, the way SVG spreads it (pad)."""
    import math
    m = re.search(r'<(radialGradient|linearGradient) id="%s"([^>]*)>(.*?)</\1>' % re.escape(gid), markup)
    if not m:
        return None
    kind, attrs, body = m.groups()
    at = dict(re.findall(r'([\w-]+)="([^"]*)"', attrs))
    stops = []
    for s in re.findall(r"<stop([^>]*)/>", body):
        sa = dict(re.findall(r'([\w-]+)="([^"]*)"', s))
        stops.append((float(sa["offset"]), _rgb(sa["stop-color"]), float(sa.get("stop-opacity", 1))))

    def colour(t):
        t = max(0.0, min(1.0, t))
        if t <= stops[0][0]:
            return (*stops[0][1], stops[0][2])
        for (o0, c0, a0), (o1, c1, a1) in zip(stops, stops[1:]):
            if t <= o1:
                k = 0.0 if o1 == o0 else (t - o0) / (o1 - o0)
                return (*[x + (y - x) * k for x, y in zip(c0, c1)], a0 + (a1 - a0) * k)
        return (*stops[-1][1], stops[-1][2])
    if kind == "linearGradient":
        x1, y1, x2, y2 = (float(at.get(k, d)) for k, d in (("x1", 0), ("y1", 0), ("x2", 1), ("y2", 0)))
        dx, dy = x2 - x1, y2 - y1
        n = dx * dx + dy * dy or 1.0
        return lambda x, y: colour(((x - x1) * dx + (y - y1) * dy) / n)
    cx, cy, r = float(at["cx"]), float(at["cy"]), float(at["r"])
    fx, fy = float(at.get("fx", cx)), float(at.get("fy", cy))

    def radial(x, y):
        # where the ray from the focus through (x, y) meets the circle
        dx, dy = x - fx, y - fy
        if dx == 0 and dy == 0:
            return colour(0.0)
        a = dx * dx + dy * dy
        b = 2 * (dx * (fx - cx) + dy * (fy - cy))
        c = (fx - cx) ** 2 + (fy - cy) ** 2 - r * r
        s = (-b + math.sqrt(max(0.0, b * b - 4 * a * c))) / (2 * a)
        return colour(1.0 / s if s > 0 else 1.0)
    return radial


def _ground_as_drawn(markup: str) -> str:
    """The colour of a mark's ground as the page draws it: every layer the
    die lays across the whole enamel field (a circle the size of the field's
    clip, filled flat or with a gradient), composited in order and averaged
    over the field. The charge and the engine turning's hairlines are left
    out; the turning is the enamel's own lit colour at a fifth of its
    strength."""
    clip = re.search(r'<clipPath id="[\w-]+-field"><circle cx="48" cy="48" r="([\d.]+)"/></clipPath>', markup)
    assert clip, "a mark with no enamel field"
    R = float(clip.group(1))
    layers = []
    for m in re.finditer(r'<circle cx="48" cy="48" r="([\d.]+)" fill="([^"]+)"( fill-opacity="([\d.]+)")?/>', markup):
        if float(m.group(1)) < R:
            continue
        paint, op = m.group(2), float(m.group(4) or 1)
        if paint.startswith("#"):
            flat = (*_rgb(paint), 1.0)
            layers.append((lambda x, y, c=flat: c, op))
        else:
            fn = _gradient(markup, paint[5:-1])
            if fn:
                layers.append((fn, op))
    assert layers, "no layer fills the enamel field"
    acc, n = [0.0, 0.0, 0.0], 0
    for j in range(-40, 41):
        for i in range(-40, 41):
            x, y = 48 + i * R / 40, 48 + j * R / 40
            if (x - 48) ** 2 + (y - 48) ** 2 > R * R:
                continue
            px = [0.0, 0.0, 0.0]
            for fn, op in layers:
                r, g, b, a = fn(x, y)
                a *= op
                px = [p * (1 - a) + q * a for p, q in zip(px, (r, g, b))]
            acc = [s + p for s, p in zip(acc, px)]
            n += 1
    return "#%02x%02x%02x" % tuple(round(s / n * 255) for s in acc)


def test_every_velvet_stays_a_quarter_under_the_leaf():
    """The cloth has to stand against the gilt round it: its brightest crest
    at most three quarters of the leaf's body tone, in both themes."""
    hue, house, leaf = _literal("HUE"), _literal("HOUSE_VELVET"), _leaf_body()
    bad = []
    for app, v in [(a, h["velvet"]) for a, h in hue.items()] + [("house", house)]:
        for theme in ("onyx", "ivory"):
            ratio = _luminance(v[theme]) / _luminance(leaf[theme])
            if ratio > 0.75:
                bad.append(f"{app} {theme} {v[theme]} is {ratio:.2f} of --au-2")
    assert not bad, "velvets too light for the leaf: " + "; ".join(bad)


def test_every_velvet_is_its_marks_colour_family():
    """The owner's rule: whatever colour a mark takes, its curtain matches.
    Both sides are read from what the hall serves, not from a number typed
    in beside them: the ground each cut of the mark is drawn on in the page
    (both cuts show in the cartouche, at their own sizes), and the dye the
    stylesheets give that gate's cloth."""
    marks, velvets = _page_marks(), _shipped_velvets()
    apps = [k for k in marks if not k.endswith("-s") and k != "atrium"]
    assert len(apps) == 6, f"expected the six marks in the page, found {apps}"
    bad = []
    for app in apps:
        for cut in (app, app + "-s"):
            ground = _ground_as_drawn(marks[cut])
            _, lc, lh = _lch(ground)
            for theme in ("onyx", "ivory"):
                v = velvets.get((theme, app))
                if not v:
                    bad.append(f"{app} {theme}: the gate is given no cloth of its own")
                    continue
                _, vc, vh = _lch(v)
                dh = abs((vh - lh + 180) % 360 - 180)
                if lc < NEUTRAL_CHROMA:
                    if vc > NEUTRAL_VELVET_CHROMA:
                        bad.append(f"{cut} {theme}: a steel ground {ground} under a coloured cloth {v} (chroma {vc:.0f})")
                    elif vc > 6 and dh > VELVET_HUE_TOLERANCE:
                        bad.append(f"{cut} {theme}: a steel ground {ground} under a {dh:.0f} degree tinted cloth {v}")
                    continue
                if vc < NEUTRAL_CHROMA or dh > VELVET_HUE_TOLERANCE:
                    bad.append(f"{cut} {theme}: cloth {v} is {dh:.0f} degrees off the ground drawn, {ground}")
                for other in apps:
                    if other == app:
                        continue
                    _, oc, oh = _lch(_ground_as_drawn(marks[other]))
                    if oc >= NEUTRAL_CHROMA and abs((vh - oh + 180) % 360 - 180) < dh:
                        bad.append(f"{cut} {theme}: cloth {v} sits nearer {other}'s ground than its own")
    assert not bad, "; ".join(bad)


def test_every_mark_is_fired_in_its_own_enamel():
    """HUE is the one source, so the drawing has to be fired in it: every
    cut of every mark lays its enamel as HUE's lit, field and deep, and
    nothing is painted over it by hand the way a sky once was. (The colour
    test above measures the ground the page draws; this keeps HUE honest
    about it.)"""
    sys.path.insert(0, str(ROOT / "icons"))
    import gen
    bad = []
    for app_id, h in gen.HUE.items():
        for suffix, body in (("", gen.emblem(app_id)), ("-s", gen.emblem_small(app_id))):
            grad = re.search(r'<radialGradient id="mk-%s%s-enamel"[^>]*>(.*?)</radialGradient>' % (app_id, suffix), body)
            if not grad:
                bad.append(f"{app_id}{suffix}: no enamel")
                continue
            stops = re.findall(r'stop-color="(#[0-9a-fA-F]{6})"', grad.group(1))
            if [c.lower() for c in stops] != [h["lit"], h["field"], h["deep"]]:
                bad.append(f"{app_id}{suffix}: enamel fired in {stops}, not HUE's")
            if 'fill="url(#mk-%s%s-enamel)"' % (app_id, suffix) not in body:
                bad.append(f"{app_id}{suffix}: the enamel is defined but never laid")
            for fn in ("paint", "sky", "dusk", "cone"):
                if f'id="mk-{app_id}{suffix}-{fn}' in body:
                    bad.append(f"{app_id}{suffix}: a painted ground ({fn}) over the enamel")
            bad += _field_layers(gen, app_id + suffix, body, h)
    assert not bad, "; ".join(bad)


def _field_layers(gen, name, body, h):
    """Inside the enamel's clip, any shape broad enough to be a ground (it
    reaches 80% of the field's radius from the centre in every direction)
    has to be the enamel itself: HUE's lit, field or deep, a gradient or a
    turning of only those, the pool or a shadow no darker than .35 black."""
    R = gen.R_FIELD
    m = re.search(r'<g clip-path="url\(#mk-%s-field\)">' % re.escape(name), body)
    if not m:
        return [f"{name}: no enamel field group"]
    inner = body[m.end():]
    allowed = {h["lit"].lower(), h["field"].lower(), h["deep"].lower(), "none"}
    ok_urls = {f"url(#mk-{name}-{k})" for k in ("enamel", "pool")}
    ok_urls |= set(re.findall(r'url\(#mk-%s-turn\d*\)' % re.escape(name), inner))
    out = []
    for el in re.finditer(r"<(path|circle|rect|ellipse|polygon)\b([^>]*)/?>", inner):
        tag, attrs = el.group(1), el.group(2)
        a = dict(re.findall(r'([\w-]+)="([^"]*)"', attrs))
        fill = a.get("fill", "#000").lower()
        if fill == "none":
            continue
        pts = []
        if tag == "circle":
            cx, cy, r = float(a["cx"]), float(a["cy"]), float(a["r"])
            pts = [(cx - r, cy - r), (cx + r, cy + r)]
        elif tag == "rect":
            x, y = float(a.get("x", 0)), float(a.get("y", 0))
            pts = [(x, y), (x + float(a.get("width", 0)), y + float(a.get("height", 0)))]
        elif tag == "path" and "d" in a:
            for _, v in gen.path_segments(a["d"]):
                pts += list(zip(v[-2::-2][::-1], v[-1::-2][::-1])) if v else []
        elif "points" in a:
            nums = [float(x) for x in re.findall(r"-?[\d.]+", a["points"])]
            pts = list(zip(nums[0::2], nums[1::2]))
        if not pts:
            continue
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        k = 0.8 * R
        if not (min(xs) <= 48 - k and max(xs) >= 48 + k and min(ys) <= 48 - k and max(ys) >= 48 + k):
            continue
        op = float(a.get("fill-opacity", a.get("opacity", 1)))
        if fill in allowed or fill in ok_urls or (fill in ("#000", "#000000") and op <= 0.35):
            continue
        if fill.startswith("url(#mk-%s-" % name):
            gid = fill[5:-1]
            g = re.search(r'<(?:radialGradient|linearGradient) id="%s"[^>]*>(.*?)</' % re.escape(gid), body)
            if g and set(c.lower() for c in re.findall(r'stop-color="(#[0-9a-fA-F]{6})"', g.group(1))) <= allowed:
                continue
        out.append(f"{name}: a {tag} the size of the field painted {fill} over the enamel")
    return out


def _mix(c: str, k: float, base: str) -> str:
    """CSS color-mix(in srgb, c k, base): the encoded components, blended."""
    a, b = _rgb(c), _rgb(base)
    return "#%02x%02x%02x" % tuple(round((x * k + y * (1 - k)) * 255) for x, y in zip(a, b))


def test_the_gates_of_one_wing_hang_different_cloth():
    """Two gates side by side must not hang what reads as one cloth, with
    the house open or dark (the dark shade is each dye mixed toward black,
    as palace-gates.css mixes it), as the cloth renders under its fold map.
    And a dark house has to read as dark: every DARK house in a theme stays
    under the darkest open one. Read from the stylesheets as served."""
    hue, wings, velvets = _literal("HUE"), _wings(), _shipped_velvets()

    def folded(c):
        return _mix(c, FOLD, "#000000")
    bad = []
    for theme in ("onyx", "ivory"):
        k, base = DARK_MIX[theme]
        for wing in set(wings.values()):
            apps = [a for a in hue if wings.get(a) == wing]
            for i, a in enumerate(apps):
                for b in apps[i + 1:]:
                    va, vb = velvets[(theme, a)], velvets[(theme, b)]
                    de = _de2000(folded(va), folded(vb))
                    if de < WING_MIN_DE:
                        bad.append(f"{theme} {wing}: {a} and {b} differ by only {de:.1f}")
                    dd = _de2000(folded(_mix(va, k, base)), folded(_mix(vb, k, base)))
                    if dd < WING_MIN_DE_DARK:
                        bad.append(f"{theme} {wing}: dark {a} and {b} differ by only {dd:.1f}")
        darkest_open = min(_luminance(folded(velvets[(theme, a)])) for a in hue)
        for a in hue:
            lum = _luminance(folded(_mix(velvets[(theme, a)], k, base)))
            if lum >= darkest_open:
                bad.append(f"{theme}: dark {a} is as light as an open house")
    assert not bad, "; ".join(bad)


def test_every_fanlight_takes_its_marks_glass():
    """By night the fanlight's glass is the biggest colour in a gate's crown,
    so it comes from the mark (HUE's glass, carried on the mark's group) and
    not from a hash that hung aqua between an oxblood badge and a mulberry
    cloth. Each glass is one palace.js has, and no two gates of a wing share
    one."""
    hue, wings = _literal("HUE"), _wings()
    palace = (STATIC / "js" / "palace.js").read_text(encoding="utf-8")
    kinds = set(re.findall(r"'(\w+)'", re.search(r"var GLASS = \[([^\]]*)\]", palace).group(1)))
    page = PAGE.read_text(encoding="utf-8")
    for app_id, h in hue.items():
        assert h.get("glass") in kinds, f"{app_id}'s glass {h.get('glass')!r} is not one of palace.js's {sorted(kinds)}"
        assert re.search(r'<g id="mark-%s" data-ink="\w+" data-glass="%s">' % (app_id, h["glass"]), page), \
            f"#mark-{app_id} does not carry its glass"
    for wing in set(wings.values()):
        used = [hue[a]["glass"] for a in hue if wings.get(a) == wing]
        assert len(used) == len(set(used)), f"{wing} glazes two fanlights alike: {used}"
    app = (STATIC / "js" / "app.js").read_text(encoding="utf-8")
    assert "if (!svc.vacant) id.glass = glassFor(svc, id);" in app, "the gate no longer takes its glass from its mark"


def test_the_dark_mix_is_the_one_the_sheet_uses():
    css = (STATIC / "css" / "palace-gates.css").read_text(encoding="utf-8")
    for theme, (k, base) in DARK_MIX.items():
        want = f"color-mix(in srgb, var(--velvet) {round(k * 100)}%, {base})"
        pat = r':root\[data-theme="%s"\] \.gate\[data-state="dark"\] \{ --velvet-shade: %s;' % (theme, re.escape(want))
        assert re.search(pat, css), f"{theme}'s dark mix is not {want}"


def test_only_the_generator_dyes_a_velvet():
    """A hand-written --velvet anywhere else (a later rule, a later sheet)
    would re-hang a gate in the wrong cloth with every other test green. The
    generated block is the only place a dye is set, bar the reserved gate's
    iron; the dark shade is only ever the dye mixed toward black."""
    stray = []
    shade = {f':root[data-theme="{t}"] .gate[data-state="dark"]' for t in DARK_MIX}
    for name, css in css_sources():
        css = css.replace("\r\n", "\n")
        if name == "palace-gates.css":
            head, rest = css.split("/* BEGIN generated velvets (icons/gen.py) */", 1)
            css = head + rest.split("/* END generated velvets */", 1)[1]
        css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        for m in re.finditer(r"([^{};]*)\{[^{}]*--velvet\s*:", css):
            sel = " ".join(m.group(1).split())
            if sel != '.gate[data-velvet="iron"]':
                stray.append(f"{name}: {sel}")
        for m in re.finditer(r"([^{};]*)\{[^{}]*--velvet-shade\s*:", css):
            sel = " ".join(m.group(1).split())
            if sel not in shade:
                stray.append(f"{name}: {sel} (the dark shade)")
    assert not stray, "velvets dyed outside icons/gen.py's block: " + "; ".join(stray)


# The parts of a house that are its cloth (their ::before and ::after are
# the pile's light and the fringe, laid over the cloth, not the cloth).
CLOTH = ("g-tab", "g-tab-l", "g-tab-r", "g-valance", "mr-house")


def test_the_cloth_is_only_ever_painted_in_its_velvet():
    """The original fault could come back by another road: a rule that
    paints a gate's tabs or valance directly, in a later sheet or a later
    line, and never touches --velvet. Every paint laid on the cloth, in
    every sheet, is the velvet (or its dark shade, the day screen it opens
    on, or the reserved gate's iron)."""
    cloth = re.compile(r"\.(%s)(?![\w-])" % "|".join(CLOTH))
    ok = ("var(--velvet)", "var(--velvet-shade)", "var(--screen)", "var(--iron)")
    paint = r"(?:^|;)\s*(background|background-color|background-image|fill)\s*:\s*([^;]+)"
    # what may colour the cloth without being its paint: the pile's light
    # and shade (black or white at an alpha), the gilt of the fringe, and the
    # house's own lights; no blend that takes a hue from above
    neutral = re.compile(r"rgba\(\s*(0,\s*0,\s*0|255,\s*255,\s*255)\s*,|#000\b|#fff\b|transparent|"
                         r"var\(--(velvet|velvet-shade|lead-\d|tab-foot)\)|url\(")
    colour = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(red|blue|green|crimson|"
                        r"navy|purple|orange|gold|maroon)\b", re.I)
    bad = []
    for name, css in css_sources():
        css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        for m in re.finditer(r"([^{};]*)\{([^{}]*)\}", css):
            sels = [" ".join(x.split()) for x in m.group(1).split(",")]
            hit = [x for x in sels if cloth.search(x)]
            if not hit:
                continue
            body = m.group(2)
            for d in re.finditer(r"(?:^|;)\s*(filter|backdrop-filter|-webkit-backdrop-filter)\s*:\s*([^;]+)", body):
                if d.group(2).strip() != "none":
                    bad.append(f"{name}: {hit[0]} {{ {d.group(1)}: {d.group(2).strip()[:40]} }}")
            for d in re.finditer(r"(?:^|;)\s*mix-blend-mode\s*:\s*([^;]+)", body):
                if d.group(1).strip() in ("color", "hue", "saturation", "luminosity", "difference", "exclusion"):
                    bad.append(f"{name}: {hit[0]} {{ mix-blend-mode: {d.group(1).strip()} }}")
            plain = [x for x in hit if ":before" not in x and ":after" not in x]
            for d in re.finditer(paint, body):
                val = " ".join(d.group(2).split())
                if plain and not any(v in val for v in ok):
                    bad.append(f"{name}: {plain[0]} {{ {d.group(1)}: {val[:60]} }}")
                elif not plain:
                    # a pseudo-element over the cloth may shade it and carry
                    # the gilt fringe, but never lay a colour of its own
                    rest = neutral.sub("", val)
                    if colour.search(rest):
                        bad.append(f"{name}: {hit[0]} {{ {d.group(1)}: {val[:60]} }} lays a colour on the cloth")
    assert not bad, "cloth painted in something other than its velvet: " + "; ".join(bad)


def test_no_gate_is_lit_on_its_own():
    """The footlights and the projector's spot are the house's lights, the
    same on every gate of a theme. Dyed for one gate they would wash its
    cloth another colour with the velvet untouched."""
    lights = ("--footlight", "--spot", "--spot-edge", "--tab-foot")
    one_gate = re.compile(r"\[data-(service|velvet|glass|ink)=|#gate-")
    bad = []
    for name, css in css_sources():
        css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        for m in re.finditer(r"([^{};]*)\{([^{}]*)\}", css):
            sel = " ".join(m.group(1).split())
            if one_gate.search(sel) and any(re.search(r"(?:^|;)\s*%s\s*:" % re.escape(v), m.group(2)) for v in lights):
                bad.append(f"{name}: {sel}")
    for js in scripts():
        for n, line in enumerate(js.read_text(encoding="utf-8").split("\n"), 1):
            if re.search(r"setProperty\(\s*['\"`](%s)['\"`]" % "|".join(lights), line):
                bad.append(f"{js.name}:{n}: {line.strip()[:80]}")
    assert not bad, "a gate's lights are set on their own: " + "; ".join(bad)


def test_the_cloth_keeps_its_dye_under_forced_colours():
    """Forced colours repaint backgrounds as Canvas, and every house went
    black while its mark kept its paint. The cloth carries no text, so it
    keeps its own dye there, as the niche does."""
    css = (STATIC / "css" / "palace-gates.css").read_text(encoding="utf-8").replace("\r\n", "\n")
    blocks = re.findall(r"@media \(forced-colors: active\) \{(.*?)\n\}", css, flags=re.S)
    assert any(re.search(r"\.g-tab, \.g-valance, \.mirror-art \.mr-house \{ forced-color-adjust: none; \}", b)
               for b in blocks), "the house's cloth is forced to Canvas under forced colours"


def test_only_velvetfor_chooses_a_cloth():
    """The key a gate's cloth is dyed by is set in one place, from the mark
    (velvetFor). No script sets it again later, writes the attribute by
    hand or dyes a gate's --velvet inline."""
    bad = []
    writes = re.compile(r"dataset\s*(?:\.velvet|\[\s*['\"`]velvet['\"`]\s*\])\s*=(?!=)|"
                        r"setAttribute(?:NS)?\(\s*(?:[^,]*,\s*)?['\"`]data-(?:velvet)?['\"`]\s*[,+]|"
                        r"setAttribute(?:NS)?\(\s*(?:[^,]*,\s*)?['\"`]data-velvet|"
                        r"Object\.assign\([^)]*dataset|"
                        r"setProperty\(\s*['\"`]--velvet|--velvet\s*:|data-velvet=|"
                        r"velvetFor\s*=(?!=)")
    decls = 0
    for js in scripts():
        text = js.read_text(encoding="utf-8").replace("\r\n", "\n")
        decls += len(re.findall(r"function\s+velvetFor\b", text))
        for n, line in enumerate(text.split("\n"), 1):
            if writes.search(line) and line.strip() != "a.dataset.velvet = velvetFor(svc);":
                bad.append(f"{js.name}:{n}: {line.strip()[:80]}")
    if decls != 1:
        bad.append(f"velvetFor is declared {decls} times across static/js (a second one wins by hoisting)")
    assert not bad, "a gate's cloth is chosen outside velvetFor: " + "; ".join(bad)


def test_a_gate_hangs_its_own_marks_cloth():
    """The binding itself: app.js's velvetFor, run under node, gives each
    marked service its own id (the key the generated dyes use), the house
    claret to a service with no mark and the iron to the reserved gate. And
    every service in the registry with a mark is its own sigil."""
    app = (STATIC / "js" / "app.js").read_text(encoding="utf-8").replace("\r\n", "\n")
    assert "a.dataset.velvet = velvetFor(svc);" in app, "the gate no longer takes its velvet from velvetFor"
    wings = _wings()
    src = (ROOT / "server.py").read_text(encoding="utf-8")
    sigils = dict(re.findall(r'"id":\s*"([\w-]+)",.*?"sigil":\s*"([\w-]+)"', src, flags=re.S))
    hue = _literal("HUE")
    for app_id in hue:
        assert app_id in wings, f"{app_id} is not in server.py's registry"
        assert sigils.get(app_id) == app_id, f"{app_id}'s sigil is {sigils.get(app_id)!r}, not its own id"
    node = shutil.which("node")
    if not node:
        print("  (node is not on the PATH; velvetFor not run)")
        return
    known = re.search(r"var KNOWN_SIGILS = \{[^}]*\};", app).group(0)
    # the last declaration is the one that runs, should there ever be two
    fn = re.findall(r"function velvetFor\(svc\) \{.*?\n\}", app, flags=re.S)[-1]
    cases = [{"sigil": a} for a in hue] + [{"sigil": "somethingnew"}, {"sigil": "autopilot", "vacant": True}]
    script = known + "\n" + fn + "\nconsole.log(JSON.stringify(%s.map(velvetFor)));" % json.dumps(cases)
    out = subprocess.run([node, "-e", script], capture_output=True, text=True, check=True).stdout
    assert json.loads(out) == list(hue) + ["house", "iron"], out


def test_every_day_card_takes_its_marks_ink():
    """By day the title card is the largest coloured shape in a house, so
    its ink comes from the mark (HUE's ink, carried on the mark's group in
    the page) instead of a hash that put an oxblood card in a green house.
    No two gates of a wing share one."""
    hue, wings = _literal("HUE"), _wings()
    inks = _literal("INKS")
    css = (STATIC / "css" / "palace-gates.css").read_text(encoding="utf-8")
    for name, hex_ in inks.items():
        assert re.search(r'\.gate\[data-ink="%s"\]\s*\{ --card-ink: %s;' % (name, hex_), css), f"no {name} card ink {hex_}"
    for wing in set(wings.values()):
        used = [hue[a]["ink"] for a in hue if wings.get(a) == wing]
        assert len(used) == len(set(used)), f"{wing} prints two cards in one ink: {used}"
    page = PAGE.read_text(encoding="utf-8")
    for app_id, h in hue.items():
        assert f'<g id="mark-{app_id}" data-ink="{h["ink"]}" ' in page, f"#mark-{app_id} does not carry its ink"
    app = (STATIC / "js" / "app.js").read_text(encoding="utf-8")
    assert "a.dataset.ink = inkFor(svc, id);" in app and "getAttribute('data-ink')" in app


def test_the_gate_picks_its_cut_in_screen_pixels():
    """The cartouche holds the mark at 32px on a laptop and 49px at 1920,
    the sizes the small cut is drawn for. The gate mounts one cut, and
    app.js's markCut picks it from the cartouche's width times the screen's
    density: the small cut under 56 screen pixels, the full cut from 56 up,
    so a 125% laptop, a 2560 screen at 125% and a double-density one each
    get the cut their pixels can hold. Run under node on the sizes the hall
    has."""
    app = (STATIC / "js" / "app.js").read_text(encoding="utf-8").replace("\r\n", "\n")
    assert "var CUT_FULL_FROM = 56;" in app, "the cut's threshold has moved"
    assert "svgUse('sigil mark', '0 0 96 96', '#mark-' + sig + '-s')" in app, "the gate no longer mounts one cut"
    assert "if (cutRO) cutRO.observe(sigil);" in app, "the gate's mark is not watched for its size"
    css = "".join(text for _, text in css_sources())
    assert "cut-small" not in css and "cut-full" not in css, "a sheet still switches the cut"
    node = shutil.which("node")
    if not node:
        print("  (node is not on the PATH; markCut not run)")
        return
    fn = re.search(r"var CUT_FULL_FROM = 56;\nfunction markCut\(sigil, cssWidth\) \{.*?\n\}", app, flags=re.S).group(0)
    # (css width of the mark, device pixel ratio) -> the cut it should show
    cases = [(32.4, 1, "-s"), (40.4, 1, "-s"), (48.5, 1, "-s"), (55.9, 1, "-s"), (56.0, 1, ""), (63.4, 1, ""),
             (52.1, 1.25, ""), (40.4, 1.25, "-s"), (44.0, 1.25, "-s"), (32.4, 1.5, "-s"), (40.4, 1.5, ""),
             (27.0, 2, "-s"), (32.4, 2, ""), (24.7, 2, "-s")]
    script = fn + """
var out = %s.map(function (c) {
  var use = { h: '#mark-x-s', getAttribute: function () { return this.h; }, setAttribute: function (k, v) { this.h = v; } };
  var sg = { firstChild: use, getAttribute: function () { return 'x'; } };
  global.window = { devicePixelRatio: c[1] };
  markCut(sg, c[0]);
  return use.h;
});
console.log(JSON.stringify(out));""" % json.dumps([[w, d] for w, d, _ in cases])
    out = json.loads(subprocess.run([node, "-e", script], capture_output=True, text=True, check=True).stdout)
    want = ["#mark-x" + c for _, _, c in cases]
    assert out == want, [f"{w}px at {d}x shows {o}" for (w, d, _), o, x in zip(cases, out, want) if o != x]


def test_the_die_carries_no_bead_ring():
    """A ring of beads a unit across round the enamel is under a pixel at
    every gate size and shimmers on the gate's parallax; the die has a plain
    turned lip and one groove. No cut of any mark draws a run of small
    circles, as elements or as circular paths."""
    sys.path.insert(0, str(ROOT / "icons"))
    import gen
    bad = []
    for app_id in gen.HUE:
        for suffix, body in (("", gen.emblem(app_id)), ("-s", gen.emblem_small(app_id))):
            radii = [float(r) for r in re.findall(r'<circle [^>]*\br="([\d.]+)"', body)]
            radii += [float(r) for r in re.findall(r"[aA]([\d.]+) \1 0 1 [01] ", body)]
            small = [r for r in radii if r < 1.6]
            for r in sorted(set(small)):
                if small.count(r) >= 6:
                    bad.append(f"{app_id}{suffix}: {small.count(r)} beads of radius {r}")
    assert not bad, "; ".join(bad)


def test_no_mark_or_curtain_is_a_sapphire():
    """The name Sapphire and a sapphire blue belong to the hall's clock. No
    velvet or palette is called sapphire, and any blue a mark or a curtain
    wears stays quiet (an ink or Prussian blue, never a saturated royal to
    cornflower)."""
    hue = _literal("HUE")
    assert "sapphire" not in GEN.read_text(encoding="utf-8").lower(), "icons/gen.py names a sapphire"
    css = (STATIC / "css" / "palace-gates.css").read_text(encoding="utf-8").lower()
    assert "sapphire" not in css, "palace-gates.css names a sapphire"
    loud = []
    for app, h in hue.items():
        for key in ("field", "lit", "pop"):
            _, c, hh = _lch(h[key])
            if 225 <= hh <= 315 and c > 30:
                loud.append(f"{app}.{key} {h[key]} (chroma {c:.0f})")
        for theme in ("onyx", "ivory"):
            _, c, hh = _lch(h["velvet"][theme])
            if 225 <= hh <= 315 and c > 30:
                loud.append(f"{app} velvet {theme} (chroma {c:.0f})")
    # and every colour any cut of any mark actually paints, fill, stroke or
    # gradient stop: no blue in the clock's band (a hue of 255 to 320 with any
    # chroma to speak of), and none a near neighbour of the clock's own blues
    sys.path.insert(0, str(ROOT / "icons"))
    import gen
    clock = re.findall(r"\.ck-moon(?:well|shade) \{ fill: (#[0-9a-fA-F]{6}); \}",
                       (STATIC / "css" / "atrium.css").read_text(encoding="utf-8"))
    assert clock, "the clock's moon blues are not where this test looks for them"
    for app in hue:
        for body in (gen.emblem(app), gen.emblem_small(app)):
            for c in set(re.findall(r'(?:fill|stroke|stop-color)="(#[0-9a-fA-F]{6})"', body)):
                _, ch, hh = _lch(c)
                if 255 <= hh <= 320 and ch > 20:
                    loud.append(f"{app} paints {c} (hue {hh:.0f}, chroma {ch:.0f})")
                near = min(_de2000(c, k) for k in clock)
                if near < 10 and ch > 15:
                    loud.append(f"{app} paints {c}, {near:.1f} from the clock's blue")
    assert not loud, "saturated blues on marks or curtains: " + "; ".join(sorted(set(loud)))


def test_the_hall_carries_what_the_generator_draws():
    """The defs block and the velvet CSS are written by icons/gen.py from
    HUE; an edit by hand to either, or a HUE change not run through the
    script, shows up here as drift."""
    sys.path.insert(0, str(ROOT / "icons"))
    import gen   # importing draws nothing and writes nothing
    assert gen.ATRIUM_INDEX.resolve().is_relative_to(ROOT), gen.ATRIUM_INDEX
    assert gen.VELVET_CSS.resolve().is_relative_to(ROOT), gen.VELVET_CSS
    page = PAGE.read_text(encoding="utf-8").replace("\r\n", "\n")
    assert gen.defs_block() in page, "static/index.html's marks are not what icons/gen.py draws; run python icons/gen.py"
    css = (STATIC / "css" / "palace-gates.css").read_text(encoding="utf-8").replace("\r\n", "\n")
    assert gen.velvet_block() in css, "palace-gates.css's velvets are not HUE's; run python icons/gen.py"
    app = (STATIC / "js" / "app.js").read_text(encoding="utf-8")
    known = set(re.findall(r"(\w+): 1", re.search(r"KNOWN_SIGILS = \{([^}]*)\}", app).group(1)))
    assert known == set(gen.HUE), f"KNOWN_SIGILS {sorted(known)} and HUE {sorted(gen.HUE)} differ"
    for app_id in gen.HUE:
        for suffix in ("", "-s"):
            assert page.count(f'id="mark-{app_id}{suffix}"') == 1, f"#mark-{app_id}{suffix} is not in the page once"


def test_the_small_cut_draws_no_hairline():
    """The small cut is seen at 22 to 55 screen pixels. A stroke under three
    units is under a pixel on the 32px gate, and a plumb line or a leg drawn
    that fine vanishes and leaves its bob or its bird floating. Seam strokes
    (the same colour as the fill they close) and the field's shade ring are
    not lines anyone reads."""
    sys.path.insert(0, str(ROOT / "icons"))
    import gen
    bad = []
    for app_id in gen.HUE:
        for el in re.finditer(r"<(path|circle|ellipse|line|polyline|rect)\b([^>]*)/?>", gen.emblem_small(app_id)):
            a = dict(re.findall(r'([\w-]+)="([^"]*)"', el.group(2)))
            if "stroke-width" not in a or a.get("stroke", "none") == "none":
                continue
            if a.get("stroke") == a.get("fill"):
                continue
            if el.group(1) == "circle" and a.get("fill") == "none" and a.get("stroke") == "#000":
                continue
            if float(a["stroke-width"]) < 3.0:
                bad.append(f"{app_id}-s: a {a['stroke-width']}-unit {a['stroke']} stroke")
    assert not bad, "; ".join(bad)


def test_the_marks_carry_no_lettering_and_no_filters():
    """The owner's rule: no text of any kind inside a mark (the name is on
    the gate's sign). A filter would re-rasterise on every frame of the
    gate's parallax, and currentColor would let forced colours repaint the
    enamel."""
    sys.path.insert(0, str(ROOT / "icons"))
    import gen
    bad = []
    for app_id in gen.HUE:
        for body in (gen.emblem(app_id), gen.emblem_small(app_id)):
            for needle in ("<text", "<tspan", "<filter", "currentcolor", "<fe"):
                if needle in body.lower():
                    bad.append(f"{app_id}: {needle}")
    assert not bad, "marks must carry no lettering or filters: " + "; ".join(sorted(set(bad)))


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  ok  {name}")
            except Exception as exc:   # any exception is a FAIL, not an abort
                failures += 1
                print(f"FAIL  {name}: {exc!r}")
                traceback.print_exc()
    sys.exit(1 if failures else 0)
