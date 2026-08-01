"""Headless screenshot helper for visual checks.

Usage:  python scripts/shot.py <name> [WxH] [query]
Writes shots/space/<name>.png plus a half-scale <name>-s.png.
"""
import os
import subprocess
import sys
import tempfile

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "shots", "space")


def shot(name, size="3440,1330", query="", scrollbars=False):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".png")
    url = "http://127.0.0.1:8769/" + (("?" + query) if query else "")
    args = [CHROME, "--headless=new", "--disable-gpu",
            "--window-size=" + size,
            "--screenshot=" + path,
            "--virtual-time-budget=3500",
            "--user-data-dir=" + tempfile.mkdtemp(prefix="atr-shot-"),
            "--force-device-scale-factor=1"]
    if not scrollbars:
        args.append("--hide-scrollbars")
    args.append(url)
    subprocess.run(args, capture_output=True, timeout=120)
    return path


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "shot"
    size = sys.argv[2] if len(sys.argv) > 2 else "3440,1330"
    query = sys.argv[3] if len(sys.argv) > 3 else ""
    print(shot(name, size, query))
