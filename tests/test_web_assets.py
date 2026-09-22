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
