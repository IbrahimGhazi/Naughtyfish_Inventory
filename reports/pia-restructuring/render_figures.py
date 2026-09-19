#!/usr/bin/env python3
"""Render the report's SVG figures to high-resolution PNGs.

Headless Chromium is used as the renderer (no SVG library is available in this
environment). The viewport is made deliberately taller than the artwork and the
result is cropped back, because the headless viewport comes out shorter than the
requested window height.
"""
import glob
import os
import re
import subprocess
import sys

from PIL import Image

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
SCALE = 2
PAD = 240  # extra viewport height, cropped away afterwards

HERE = os.path.dirname(os.path.abspath(__file__))
FIGURES = os.path.join(HERE, "figures")


def dimensions(svg_text):
    w = re.search(r'width="(\d+)"', svg_text)
    h = re.search(r'height="(\d+)"', svg_text)
    return int(w.group(1)), int(h.group(1))


def render(svg_path):
    # Must be absolute: a relative path yields file://figures/... which Chromium
    # treats as a host name and renders an error page into the screenshot.
    svg_path = os.path.abspath(svg_path)
    svg = open(svg_path, encoding="utf-8").read()
    width, height = dimensions(svg)
    stem = os.path.splitext(svg_path)[0]
    wrapper = stem + ".render.html"
    png = stem + ".png"

    with open(wrapper, "w", encoding="utf-8") as fh:
        fh.write(
            "<!doctype html><meta charset='utf-8'>"
            "<style>html,body{margin:0;padding:0;background:#fff}"
            "svg{display:block}</style>\n" + svg
        )

    subprocess.run(
        [
            CHROME, "--headless", "--disable-gpu", "--no-sandbox",
            "--hide-scrollbars", f"--force-device-scale-factor={SCALE}",
            f"--window-size={width},{height + PAD}",
            f"--screenshot={png}", f"file://{wrapper}",
        ],
        check=True, capture_output=True,
    )
    os.remove(wrapper)

    with Image.open(png) as im:
        im.convert("RGB").crop((0, 0, width * SCALE, height * SCALE)).save(png)
    return png, width * SCALE, height * SCALE


if __name__ == "__main__":
    targets = sys.argv[1:] or sorted(glob.glob(os.path.join(FIGURES, "*.svg")))
    for svg_path in targets:
        name, w, h = render(svg_path)
        print(f"{os.path.basename(name)}  {w}x{h}")
