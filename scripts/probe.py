"""Reads live layout boxes out of the hall at a list of viewport sizes.

CSS cannot report what it resolved to, and a screenshot only shows where a
box ended up, not how wide it was allowed to be. This drives headless Chrome
with ?probe=1, which writes the boxes into document.title, and reads them
back out of --dump-dom.

Usage:  python scripts/probe.py [WxH ...]
"""
import re
import subprocess
import sys
import tempfile

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SIZES = ["3440x1330", "2560x1440", "2200x1300", "1920x1080",
         "1600x900", "1440x900", "1280x800", "1100x800"]


def probe(size, query="probe=1"):
    w, h = size.split("x")
    args = [CHROME, "--headless=new", "--disable-gpu",
            "--window-size=%s,%s" % (w, h),
            "--dump-dom", "--virtual-time-budget=4000",
            "--force-prefers-reduced-motion",
            "--user-data-dir=" + tempfile.mkdtemp(prefix="atr-probe-"),
            "http://127.0.0.1:8769/?" + query]
    dom = subprocess.run(args, capture_output=True, timeout=120).stdout.decode(
        "utf-8", "replace")
    hit = re.search(r"<title>(.*?)</title>", dom, re.S)
    return hit.group(1).strip() if hit else "(no title)"


if __name__ == "__main__":
    for s in sys.argv[1:] or SIZES:
        print(s, "->", probe(s))
