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
# livery (CIELAB hue angle, degrees). A neutral livery (chroma under 12, a
# steel) takes a neutral cloth instead.
VELVET_HUE_TOLERANCE = 30.0
NEUTRAL_CHROMA = 12.0
# Two gates of one wing must not read as the same cloth (CIEDE2000).
WING_MIN_DE = 15.0


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
    """The owner's rule: whatever colour a mark takes, its curtain matches."""
    bad = []
    for app, h in _literal("HUE").items():
        _, lc, lh = _lch(h["livery"])
        for theme in ("onyx", "ivory"):
            _, vc, vh = _lch(h["velvet"][theme])
            if lc < NEUTRAL_CHROMA:
                if vc > 20:
                    bad.append(f"{app} {theme}: a neutral mark under a coloured cloth (chroma {vc:.0f})")
                continue
            dh = abs((vh - lh + 180) % 360 - 180)
            if vc < NEUTRAL_CHROMA or dh > VELVET_HUE_TOLERANCE:
                bad.append(f"{app} {theme}: velvet {h['velvet'][theme]} is {dh:.0f} degrees off its mark {h['livery']}")
    assert not bad, "; ".join(bad)


def test_the_gates_of_one_wing_hang_different_cloth():
    hue, wings = _literal("HUE"), _wings()
    bad = []
    for theme in ("onyx", "ivory"):
        for wing in set(wings.values()):
            apps = [a for a in hue if wings.get(a) == wing]
            for i, a in enumerate(apps):
                for b in apps[i + 1:]:
                    de = _de2000(hue[a]["velvet"][theme], hue[b]["velvet"][theme])
                    if de < WING_MIN_DE:
                        bad.append(f"{theme} {wing}: {a} and {b} differ by only {de:.1f}")
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
        for key in ("field", "lit", "livery", "pop"):
            _, c, hh = _lch(h[key])
            if 225 <= hh <= 315 and c > 30:
                loud.append(f"{app}.{key} {h[key]} (chroma {c:.0f})")
        for theme in ("onyx", "ivory"):
            _, c, hh = _lch(h["velvet"][theme])
            if 225 <= hh <= 315 and c > 30:
                loud.append(f"{app} velvet {theme} (chroma {c:.0f})")
    assert not loud, "saturated blues on marks or curtains: " + "; ".join(loud)


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
