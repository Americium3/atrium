"""Crop a region out of a shot for close inspection.

Usage:  python scripts/crop.py <shot-name> <left> <top> <right> <bottom> [outname] [scale]
Reads shots/space/<shot-name>.png, writes shots/space/<outname>.png.
"""
import os
import sys

from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "shots", "space")

name = sys.argv[1]
box = tuple(int(v) for v in sys.argv[2:6])
outname = sys.argv[6] if len(sys.argv) > 6 else name + "-crop"
scale = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0

im = Image.open(os.path.join(OUT, name + ".png")).convert("RGB")
im = im.crop(box)
if scale != 1.0:
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
path = os.path.join(OUT, outname + ".png")
im.save(path)
print(path, im.size)
