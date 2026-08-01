"""Regenerates a gate sigil for the marks block in static/index.html.

The original generator that produced the existing marks was not kept, so this
is a reconstruction derived from the emitted SVG. It matches the established
anatomy exactly, which is what lets a new gate sit in the array without looking
bolted on:

  1. the silhouette, filled dark, at full size
  2. the same silhouette at 0.855, filled with the mid tone
  3. two hairline outlines of it at 0.800 and 0.755
  4. 36 rays every 10 degrees, from r=17 out to r=37
  5. four chevron pairs at 45/135/225/315
  6. the emblem, drawn on the 96-unit grid at 0.86
  7. a gem lozenge at the crown

Usage:
    python icons/gen.py pressroom > mark.svg

Then paste the output between the generated-marks comments in
static/index.html and add the id to KNOWN_SIGILS in static/js/app.js.
"""
from __future__ import annotations

import math
import sys

SIGILS = {
    # The press room is the only rectilinear silhouette in the array. Every
    # other gate is a circle or a polygon, so the plaque shape alone says
    # "this one is a document, not a service" before the emblem is even read.
    #
    # It must still be a BADGE. An untouched rectangle reads as a broken image
    # at gate size, and the rays and chevrons the template lays down at r=37
    # fall outside a narrow one entirely — the silhouette is full-bleed with
    # chamfered shoulders so the whole apparatus lands on brass.
    "pressroom": {
        "dark": "#1c2f10",
        "mid": "#2d6428",
        "light": "#eef4e6",
        "gem": "#7ab870",
        "shape": "M20 4 H76 L92 20 V92 H4 V20 Z",
        # A single broadsheet with its corner turned, over the base bar every
        # emblem in the array stands on. Four heavy rules, not nine hairlines:
        # at directory size a 1.6-unit rule is a third of a pixel.
        "emblem": """<g fill="{light}"><rect x="22" y="66" width="52" height="6"/>"""
                  """<path d="M28 21 H58 L70 33 V61 H28 Z"/></g>"""
                  """<g fill="{dark}"><path d="M58 21 L70 33 H58 Z"/>"""
                  """<rect x="33" y="27" width="18" height="5.5"/>"""
                  """<rect x="33" y="38" width="30" height="3.2"/>"""
                  """<rect x="33" y="44" width="30" height="3.2"/>"""
                  """<rect x="33" y="50" width="17" height="3.2"/></g>""",
    },
}

RAY_INNER, RAY_OUTER, RAY_STEP = 17.0, 37.0, 10
CENTRE = 48.0


def rays(colour: str) -> str:
    out = []
    for step in range(360 // RAY_STEP):
        rad = math.radians(step * RAY_STEP)
        cos, sin = math.cos(rad), math.sin(rad)
        out.append(
            f'<line x1="{CENTRE + RAY_INNER * cos:.2f}" y1="{CENTRE + RAY_INNER * sin:.2f}"'
            f' x2="{CENTRE + RAY_OUTER * cos:.2f}" y2="{CENTRE + RAY_OUTER * sin:.2f}"'
            f' stroke="{colour}" stroke-width="0.7" stroke-opacity=".26"/>'
        )
    return "".join(out)


def chevrons(colour: str) -> str:
    one = ('<path d="M41 12.5 L48 7 L55 12.5"/><path d="M43 17.5 L48 13.5 L53 17.5"/>')
    return "".join(
        f'<g transform="rotate({deg} 48 48)" fill="none" stroke="{colour}"'
        f' stroke-opacity=".5" stroke-width="1.4">{one}</g>'
        for deg in (45, 135, 225, 315)
    )


def scaled(scale: float, body: str, **attrs: str) -> str:
    attr = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return (f'<g transform="translate(48,48) scale({scale}) translate(-48,-48)" '
            f'{attr}>{body}</g>')


def build(key: str) -> str:
    spec = SIGILS[key]
    shape = f'<path d="{spec["shape"]}"/>'
    light = spec["light"]
    parts = [
        f'<g id="mark-{key}">',
        scaled(1, shape, fill=spec["dark"]),
        scaled(0.855, shape, fill=spec["mid"]),
        scaled(0.8, shape, fill="none", stroke=light, stroke_opacity=".55", stroke_width="1.4"),
        scaled(0.755, shape, fill="none", stroke=light, stroke_opacity=".3", stroke_width="1.4"),
        rays(light),
        chevrons(light),
        scaled(0.86, spec["emblem"].format(**spec)),
        f'<polygon points="48,3.5 53,8.5 48,13.5 43,8.5" fill="{spec["gem"]}"/>',
        "</g>",
    ]
    return "".join(parts)


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "pressroom"
    if name not in SIGILS:
        sys.exit(f"unknown sigil {name!r}; known: {', '.join(SIGILS)}")
    print(build(name))
