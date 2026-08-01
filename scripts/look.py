"""Screenshot a named part of the hall, framed by its own measured box.

Why this exists: headless Chrome reports `innerHeight` as ~99px SHORTER
than the surface it actually composites the screenshot onto. Layout in the
document flow is unaffected (the masthead lands where getBoundingClientRect
says it does), but anything position:fixed to the BOTTOM of the screen — in
this hall, the entire signal desk — is painted 99px lower than it measures.
Crops taken from raw probe numbers therefore land on the floor tiles just
below the machine, which reads as "the part isn't rendering" and sends you
debugging drawing code that was correct all along.

FIXED_OFFSET below re-applies that delta, and only to the bottom-anchored
parts. Verify with ?probe=3, which paints the boxes and outlines the
hardware from inside the page, where numbers and pixels cannot disagree.

Usage:  python scripts/look.py <out-name> <selector> [pad] [WxH] [dpr] [query]
        python scripts/look.py desk .assembly 40 3440x1330 2 theme=ivory
        python scripts/look.py board '#works' 10 3440x1330 2 entrance=0

Selector must be one the ?probe=2 block in index.html reports.

Pass `entrance=0` when shooting anything the entrance animates in. The
aisle boards finish rising later than the desk does, and a shot taken
mid-entrance catches them at opacity 0 — an empty frame that looks exactly
like a board that failed to render, while the DOM has every dial in it.
"""
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "shots", "space")

# Everything that hangs off #signal-desk (position:fixed; bottom: …).
FIXED_TO_BOTTOM = {"#signal-desk", ".assembly", ".quadrant", ".gear-well",
                   ".lever-svg", ".gearA-svg", ".gearB-svg", ".l-salon",
                   ".l-bureau", "#lever"}


def render(size, dpr, query):
    """One Chrome run: writes the PNG, returns the live box table."""
    os.makedirs(OUT, exist_ok=True)
    raw = os.path.join(OUT, "_look_raw.png")
    w, h = size.split("x")
    url = "http://127.0.0.1:8769/?probe=1&probe=2" + ("&" + query if query else "")
    args = [CHROME, "--headless=new", "--disable-gpu",
            "--window-size=%s,%s" % (w, h),
            "--hide-scrollbars",
            "--screenshot=" + raw,
            "--dump-dom",
            "--virtual-time-budget=4500",
            "--force-device-scale-factor=" + str(dpr),
            "--user-data-dir=" + tempfile.mkdtemp(prefix="atr-look-")]
    args.append(url)
    dom = subprocess.run(args, capture_output=True, timeout=180).stdout.decode(
        "utf-8", "replace")
    hit = re.search(r"<title>(.*?)</title>", dom, re.S)
    boxes, vp_h = {}, None
    if hit:
        for part in hit.group(1).split("|"):
            if "=" not in part:
                continue
            k, v = part.strip().split("=", 1)
            if k == "vp":
                vp_h = int(v.split("x")[1])
            nums = v.split(",")
            if len(nums) == 4 and all(n.strip().lstrip("-").isdigit() for n in nums):
                boxes[k] = [int(n) for n in nums]
    return raw, boxes, vp_h


def main():
    name = sys.argv[1]
    sel = sys.argv[2]
    pad = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    size = sys.argv[4] if len(sys.argv) > 4 else "3440x1330"
    dpr = int(sys.argv[5]) if len(sys.argv) > 5 else 2
    query = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != "none" else ""

    raw, boxes, vp_h = render(size, dpr, query)
    if sel not in boxes or vp_h is None:
        print("no box for %s; have: %s" % (sel, ", ".join(sorted(boxes))))
        return 1

    x, y, w, h = boxes[sel]
    im = Image.open(raw).convert("RGB")
    off_y = 0
    if sel in FIXED_TO_BOTTOM:
        off_y = (im.height // dpr - vp_h) * dpr
    box = (max(0, int((x - pad) * dpr)),
           max(0, int((y - pad) * dpr) + off_y),
           min(im.width, int((x + w + pad) * dpr)),
           min(im.height, int((y + h + pad) * dpr) + off_y))
    out = os.path.join(OUT, name + ".png")
    im.crop(box).save(out)
    print("%s  %s=[%d,%d,%d,%d]  fixed_off=%d  crop=%s  canvas=%s"
          % (out, sel, x, y, w, h, off_y, box, im.size))
    return 0


if __name__ == "__main__":
    sys.exit(main())
