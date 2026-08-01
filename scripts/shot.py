"""Headless screenshot helper for visual checks.

Usage:  python scripts/shot.py <name> [WxH] [query] [dpr]
Writes shots/space/<name>.png. A dpr above 1 renders the same layout at
higher pixel density, which is the only way to read small hardware — the
machinery is drawn at 1-2px stroke widths and a 1x crop of it is mush.
"""
import os
import subprocess
import sys
import tempfile

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "shots", "space")


def shot(name, size="3440,1330", query="", scrollbars=False, dpr=1):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    url = "http://127.0.0.1:8769/" + (("?" + query) if query else "")
    args = [CHROME, "--headless=new", "--disable-gpu",
            "--window-size=" + size,
            "--screenshot=" + path,
            "--virtual-time-budget=3500",
            "--user-data-dir=" + tempfile.mkdtemp(prefix="atr-shot-"),
            "--force-device-scale-factor=" + str(dpr)]
    if not scrollbars:
        args.append("--hide-scrollbars")
    args.append(url)
    subprocess.run(args, capture_output=True, timeout=120)
    return path


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "shot"
    size = sys.argv[2] if len(sys.argv) > 2 else "3440,1330"
    query = sys.argv[3] if len(sys.argv) > 3 else ""
    dpr = sys.argv[4] if len(sys.argv) > 4 else "1"
    print(shot(name, size, query, dpr=dpr))
