"""Dump the live DOM of the hall for structural checks.

Usage:  python scripts/dumpdom.py [WxH] [query]
Writes shots/dom.html and prints a short summary of the desk machinery.
"""
import os
import re
import subprocess
import sys
import tempfile

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

size = sys.argv[1] if len(sys.argv) > 1 else "3440x1330"
query = sys.argv[2] if len(sys.argv) > 2 else ""
w, h = size.split("x")

args = [CHROME, "--headless=new", "--disable-gpu",
        "--window-size=%s,%s" % (w, h),
        "--dump-dom", "--virtual-time-budget=5000",
        "--force-prefers-reduced-motion",
        "--user-data-dir=" + tempfile.mkdtemp(prefix="atr-dom-"),
        "http://127.0.0.1:8769/" + (("?" + query) if query else "")]
dom = subprocess.run(args, capture_output=True, timeout=180).stdout.decode("utf-8", "replace")

out = os.path.join(ROOT, "shots", "dom.html")
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write(dom)
print("wrote", out, len(dom), "chars")

for cls in ("quadrant", "gearA-svg", "gearB-svg", "lever-svg"):
    m = re.search(r'<svg class="%s"[^>]*>(.*?)</svg>' % re.escape(cls), dom, re.S)
    if not m:
        print("%-12s MISSING" % cls)
        continue
    body = m.group(1)
    tags = re.findall(r"<(\w+)", body)
    print("%-12s %5d chars, %3d nodes" % (cls, len(body), len(tags)))
