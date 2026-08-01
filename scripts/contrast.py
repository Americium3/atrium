"""Relative-luminance check between design tokens.

The hall's failure mode is a machine tone that lands within a few levels of
the floor it stands on, which no amount of hairline detail can rescue.

Usage:  python scripts/contrast.py "#1e170d" "#16120b" [label]
"""
import sys


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexs):
    h = hexs.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


if __name__ == "__main__":
    a, b = sys.argv[1], sys.argv[2]
    label = sys.argv[3] if len(sys.argv) > 3 else ""
    print("%-28s %s vs %s  L=%.4f/%.4f  ratio=%.2f:1"
          % (label, a, b, lum(a), lum(b), ratio(a, b)))
