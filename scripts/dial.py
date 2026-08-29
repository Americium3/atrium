"""Check the almanac's dial against the sun it claims to be drawing.

A screenshot of this plate looks right in almost every wrong state: an hour
ring on the wrong pitch, or a horizon cut through the centre of the ellipse
instead of across it as a chord, both produce a perfectly pretty dial that
disagrees with the times engraved on its own crossings. The first version
shipped with both faults — a day arc of 180 degrees under a tape reading
DAYLIGHT 13:13, and hour marks 8.8 degrees out of place at their worst.

So this reads the SVG the browser actually drew and measures it:

  * the arc above the horizon, against daylight/24 of the full ring
  * the pitch of the hour ring, against 15 degrees an hour
  * each tick against the ellipse's own normal (the radius from the centre
    is a different direction on anything but a circle, and the marks read as
    though they had come loose from the curve)

Usage:  python scripts/dial.py [WxH]
Exit code is 1 if anything is out of tolerance, so it can gate a change.
"""
import math
import re
import subprocess
import sys
import tempfile

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
URL = "http://127.0.0.1:8769/?entrance=0"

# The plate is drawn to 2dp in a 300-unit box, so a tenth of a degree is the
# floor of what the numbers can even express.
TOL_ARC = 0.25      # degrees, day arc against the engraved times
TOL_PITCH = 0.05    # degrees, hour-to-hour
TOL_NORMAL = 0.5    # degrees off perpendicular


def dump(size):
    return subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu",
         "--window-size=" + size.replace("x", ","), "--hide-scrollbars",
         "--dump-dom", "--virtual-time-budget=5000",
         "--user-data-dir=" + tempfile.mkdtemp(prefix="atr-dial-"), URL],
        capture_output=True, timeout=180).stdout.decode("utf-8", "replace")


def check(size="2400x1200"):
    dom = dump(size)
    hit = re.search(r'<svg viewBox="0 0 \d+ \d+"[^>]*class="al-arc">.*?</svg>',
                    dom, re.S)
    if not hit:
        print("no dial in the DOM — is the hub up, and is the aisle open at "
              + size + "?")
        return 1
    svg = hit.group(0)
    height = int(re.search(r'viewBox="0 0 \d+ (\d+)"', svg).group(1))
    cx, cy, rx = 150, height / 2, 112
    ry = max(40, min(124, height / 2 - 20))

    horizon = float(re.search(r'<line x1="6" y1="([\d.]+)"', svg).group(1))
    ticks = re.findall(
        r'<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"'
        r'[^>]*class="a-h-(\w+)"', svg)
    times = re.findall(r'class="a-time">(\d\d:\d\d)<', svg)
    if len(times) != 2 or not ticks:
        print("the plate is drawn but not engraved — polar day, or no place yet")
        return 0

    def hours(s):
        h, m = s.split(":")
        return int(h) + int(m) / 60

    daylight = hours(times[1]) - hours(times[0])

    def angle(x, y):
        """Parametric angle on the ring, degrees from the apex."""
        return math.degrees(math.atan2((x - cx) / rx, (cy - y) / ry))

    drawn = 2 * math.degrees(math.acos((cy - horizon) / ry))
    wanted = daylight * 15
    angles = sorted(angle(float(t[0]), float(t[1])) for t in ticks)
    gaps = [angles[i + 1] - angles[i] for i in range(len(angles) - 1)]

    worst = 0.0
    for x1, y1, x2, y2, _kind in ticks:
        x1, y1, x2, y2 = map(float, (x1, y1, x2, y2))
        d = math.radians(angle(x1, y1))
        tangent = (rx * math.cos(d), ry * math.sin(d))
        v = (x2 - x1, y2 - y1)
        cos = abs(tangent[0] * v[0] + tangent[1] * v[1]) / (
            math.hypot(*tangent) * math.hypot(*v))
        worst = max(worst, math.degrees(math.asin(min(1.0, cos))))

    lit = sum(1 for t in ticks if t[4] == "day")
    bad = []
    if abs(drawn - wanted) > TOL_ARC:
        bad.append("day arc %.2f deg drawn against %.2f the sun runs" % (drawn, wanted))
    if abs(min(gaps) - 15) > TOL_PITCH or abs(max(gaps) - 15) > TOL_PITCH:
        bad.append("hour pitch %.3f..%.3f deg, want 15" % (min(gaps), max(gaps)))
    if worst > TOL_NORMAL:
        bad.append("ticks up to %.2f deg off the curve normal" % worst)
    if len(ticks) != 24:
        bad.append("%d hour ticks, want 24" % len(ticks))

    print("%s  rise %s  set %s  daylight %.2f h" % (size, times[0], times[1], daylight))
    print("  day arc     %8.2f deg   (sun: %.2f)" % (drawn, wanted))
    print("  hour pitch  %8.3f deg   (want 15, %d ticks, %d lit)"
          % (sum(gaps) / len(gaps), len(ticks), lit))
    print("  normals     %8.3f deg   off perpendicular, worst" % worst)
    for line in bad:
        print("  FAIL " + line)
    return 1 if bad else 0


if __name__ == "__main__":
    sizes = sys.argv[1:] or ["2400x1200", "3440x1330"]
    raise SystemExit(max(check(s) for s in sizes))
