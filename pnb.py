from __future__ import annotations

import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from flask import Flask, Response, abort, redirect, render_template_string, request, send_from_directory, url_for
from PIL import Image

APP_DIR = Path(__file__).resolve().parent
PAINTINGS_DIR = APP_DIR / "paintings"

# iPad portrait target requested by user
TARGET_W = 1620
TARGET_H = 2160

app = Flask(__name__)


RGB = Tuple[int, int, int]


@dataclass(frozen=True)
class PaletteColor:
    num: int
    rgb: RGB

    @property
    def css_rgb(self) -> str:
        r, g, b = self.rgb
        return f"rgb({r}, {g}, {b})"


def _is_bg(rgb: RGB, bg: RGB, tol: int = 8) -> bool:
    return all(abs(a - b) <= tol for a, b in zip(rgb, bg))


@lru_cache(maxsize=8)
def load_palette() -> List[PaletteColor]:
    """Extract palette colors from palette.png.

    The supplied palette image is laid out in sequential rows (0-9, 10-19, ...)
    with colored tiles. We detect the tile bands and sample each tile's color.
    """

    palette_path = PAINTINGS_DIR / "palette.png"
    if not palette_path.exists():
        raise FileNotFoundError(f"Missing palette image: {palette_path}")

    img = Image.open(palette_path).convert("RGB")
    px = img.load()
    w, h = img.size

    bg = px[0, 0]

    # Count non-background pixels per row to detect the solid tile bands.
    row_counts: List[int] = []
    for y in range(h):
        c = 0
        for x in range(w):
            if not _is_bg(px[x, y], bg):
                c += 1
        row_counts.append(c)

    # Tile bands have many non-bg pixels; text rows are sparse.
    threshold = int(w * 0.25)

    bands: List[Tuple[int, int]] = []
    in_band = False
    start = 0
    for y, c in enumerate(row_counts):
        if (c > threshold) and (not in_band):
            start = y
            in_band = True
        elif in_band and (c <= threshold):
            bands.append((start, y - 1))
            in_band = False
    if in_band:
        bands.append((start, h - 1))

    # The palette image alternates between thick tile bands and thin text bands.
    # Keep only thick bands (the actual colored tiles).
    bands = [(a, b) for (a, b) in bands if (b - a + 1) >= 30]

    # For each band, find x-runs at its midline to locate tiles.
    colors: List[PaletteColor] = []
    for row_i, (y0, y1) in enumerate(bands):
        ymid = (y0 + y1) // 2

        runs: List[Tuple[int, int]] = []
        x = 0
        while x < w:
            if not _is_bg(px[x, ymid], bg):
                x0 = x
                while x < w and (not _is_bg(px[x, ymid], bg)):
                    x += 1
                x1 = x - 1
                # Ignore thin text strokes; keep wide tile runs.
                if (x1 - x0) >= 20:
                    runs.append((x0, x1))
            x += 1

        # Sample each tile near its top-left interior (avoids the number overlay).
        for col_i, (x0, _x1) in enumerate(runs):
            num = row_i * 10 + col_i
            # The provided palette ends at 63.
            if num > 63:
                continue

            xs = min(x0 + 10, w - 1)
            ys = min(y0 + 10, h - 1)
            rgb: RGB = px[xs, ys]
            colors.append(PaletteColor(num=num, rgb=rgb))

    # Ensure we have a contiguous palette 0..max.
    colors_by_num = {c.num: c for c in colors}
    out: List[PaletteColor] = []
    for n in range(0, 64):
        if n in colors_by_num:
            out.append(colors_by_num[n])

    if len(out) < 10:
        raise RuntimeError(
            f"Failed to extract palette tiles from {palette_path} (only {len(out)} colors)"
        )

    return out


@lru_cache(maxsize=8)
def palette_rgb_to_num() -> Dict[RGB, int]:
    return {c.rgb: c.num for c in load_palette()}


def available_paintings() -> List[str]:
    if not PAINTINGS_DIR.exists():
        return []
    out = []
    for p in sorted(PAINTINGS_DIR.glob("*.svg")):
        out.append(p.stem)
    return out


def _load_svg(stem: str) -> str:
    svg_path = PAINTINGS_DIR / f"{stem}.svg"
    if not svg_path.exists():
        raise FileNotFoundError(svg_path)
    return svg_path.read_text(encoding="utf-8", errors="ignore")


_FILL_RE = re.compile(r"fill:\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*;", re.I)


@lru_cache(maxsize=8)
def build_interactive_svg(stem: str) -> str:
    """Annotate SVG paths with required palette number + hide fills."""

    svg = _load_svg(stem)
    rgb_to_num = palette_rgb_to_num()

    def repl(m: re.Match[str]) -> str:
        tag = m.group(0)
        if "data-correct-fill=" in tag:
            return tag  # already processed
        if "style=\"" not in tag:
            return tag

        # Extract style="..."
        pre, rest = tag.split('style="', 1)
        style, post = rest.split('"', 1)

        fm = _FILL_RE.search(style)
        if not fm:
            return tag

        r, g, b = int(fm.group(1)), int(fm.group(2)), int(fm.group(3))
        rgb: RGB = (r, g, b)
        num = rgb_to_num.get(rgb, -1)
        correct_css = f"rgb({r}, {g}, {b})"

        # Hide the fill until painted.
        style2 = _FILL_RE.sub("fill: rgb(255, 255, 255);", style, count=1)

        extra = f' data-color-num="{num}" data-correct-fill="{correct_css}"'
        return pre + extra + f'style="{style2}"' + post

    # Process all path tags.
    svg2 = re.sub(r"<path\b[^>]*?>", repl, svg, flags=re.I)

    # Make sure the SVG scales to the viewport.
    svg2 = re.sub(r"<svg\b", '<svg id="pnb-svg" preserveAspectRatio="xMidYMid meet"', svg2, count=1, flags=re.I)

    return svg2


@app.get("/")
def index() -> Response:
    paintings = available_paintings()
    if not paintings:
        return Response(
            "No paintings found. Put .svg/.png and palette.png in /paintings.",
            status=500,
            mimetype="text/plain",
        )

    stem = request.args.get("painting") or paintings[0]
    if stem not in paintings:
        return redirect(url_for("index", painting=paintings[0]))

    palette = load_palette()
    svg = build_interactive_svg(stem)

    html = render_template_string(
        _TEMPLATE,
        target_w=TARGET_W,
        target_h=TARGET_H,
        paintings=paintings,
        stem=stem,
        palette=palette,
        svg=svg,
    )
    return Response(html, mimetype="text/html")


@app.get("/paintings/<path:filename>")
def paintings_static(filename: str):
    # For optional preview/debug.
    return send_from_directory(PAINTINGS_DIR, filename)


_TEMPLATE = r"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Paint by Numbers</title>
  <style>
    :root {
      --target-w: {{ target_w }};
      --target-h: {{ target_h }};
      --palette-h: 28vh;
      --bg: #0f1115;
      --panel: #141824;
      --panel2: #0f1320;
      --text: #e9eefc;
      --muted: #9aa6c0;
      --accent: #6ea8ff;
      --stroke: rgba(255,255,255,0.10);
    }

    html, body {
      height: 100%;
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      overscroll-behavior: none;
    }

    .app {
      height: 100vh;
      width: 100vw;
      display: grid;
      grid-template-rows: auto 1fr var(--palette-h);
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid var(--stroke);
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      gap: 10px;
    }

    .title {
      font-weight: 650;
      letter-spacing: 0.2px;
      font-size: 14px;
      opacity: 0.95;
      user-select: none;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    select {
      background: rgba(255,255,255,0.06);
      color: var(--text);
      border: 1px solid var(--stroke);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 14px;
      outline: none;
    }

    .hint {
      font-size: 12px;
      color: var(--muted);
      user-select: none;
      white-space: nowrap;
    }

    .canvas {
      background: var(--panel2);
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      display: grid;
      place-items: center;
    }

    .svgWrap {
      width: min(100vw, calc(var(--target-w) * 1px));
      height: min(calc(100vh - var(--palette-h) - 56px), calc(var(--target-h) * 1px));
      display: grid;
      place-items: center;
      padding: 12px;
      box-sizing: border-box;
    }

    /* Ensure the embedded SVG scales nicely */
    #pnb-svg {
      width: 100%;
      height: 100%;
      background: white;
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.35);
      touch-action: manipulation;
    }

    #pnb-svg path {
      cursor: pointer;
      transition: fill 120ms ease;
    }

    #pnb-svg path[data-color-num="-1"] {
      cursor: not-allowed;
    }

    .palette {
      border-top: 1px solid var(--stroke);
      background: var(--panel);
      padding: 10px 10px 16px;
      box-sizing: border-box;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 10px;
    }

    .paletteHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .selected {
      font-size: 13px;
      color: var(--muted);
      user-select: none;
    }

    .swatches {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 84px;
      gap: 10px;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 6px;
    }

    .swatch {
      height: 84px;
      border-radius: 14px;
      border: 2px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.06);
      display: grid;
      place-items: center;
      position: relative;
      user-select: none;
      touch-action: manipulation;
    }

    .swatchInner {
      width: 58px;
      height: 58px;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,0.20);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10);
    }

    .swatchNum {
      position: absolute;
      top: 8px;
      right: 10px;
      font-weight: 750;
      font-size: 13px;
      color: rgba(255,255,255,0.92);
      text-shadow: 0 1px 2px rgba(0,0,0,0.55);
    }

    .swatch.active {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(110,168,255,0.20);
    }

    .swatch:active {
      transform: translateY(1px);
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="topbar">
      <div class="title">Paint by Numbers</div>
      <div class="controls">
        <div class="hint">Choose a color number, then tap a region</div>
        <select id="paintingSelect" aria-label="Painting">
          {% for p in paintings %}
            <option value="{{ p }}" {% if p == stem %}selected{% endif %}>{{ p }}</option>
          {% endfor %}
        </select>
      </div>
    </div>

    <div class="canvas">
      <div class="svgWrap">
        {{ svg | safe }}
      </div>
    </div>

    <div class="palette">
      <div class="paletteHeader">
        <div class="selected" id="selectedLabel">Selected: none</div>
        <div class="selected">Palette at bottom (0–63)</div>
      </div>
      <div class="swatches" id="swatches">
        {% for c in palette %}
          <div class="swatch" role="button" tabindex="0" aria-label="Color {{ c.num }}" data-num="{{ c.num }}" data-rgb="{{ c.css_rgb }}">
            <div class="swatchNum">{{ c.num }}</div>
            <div class="swatchInner" style="background: {{ c.css_rgb }}"></div>
          </div>
        {% endfor %}
      </div>
    </div>
  </div>

  <script>
    (function () {
      const paintingSelect = document.getElementById('paintingSelect');
      paintingSelect.addEventListener('change', () => {
        const next = paintingSelect.value;
        const url = new URL(window.location.href);
        url.searchParams.set('painting', next);
        window.location.href = url.toString();
      });

      let selectedNum = null;
      let selectedRgb = null;

      const selectedLabel = document.getElementById('selectedLabel');
      const swatches = document.getElementById('swatches');

      function setSelected(el) {
        for (const node of swatches.querySelectorAll('.swatch')) node.classList.remove('active');
        el.classList.add('active');
        selectedNum = el.dataset.num;
        selectedRgb = el.dataset.rgb;
        selectedLabel.textContent = `Selected: ${selectedNum}`;
      }

      swatches.addEventListener('click', (e) => {
        const el = e.target.closest('.swatch');
        if (!el) return;
        setSelected(el);
      });

      swatches.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target.closest('.swatch');
        if (!el) return;
        e.preventDefault();
        setSelected(el);
      });

      const svg = document.getElementById('pnb-svg');
      svg.addEventListener('click', (e) => {
        const path = e.target.closest('path');
        if (!path) return;
        if (selectedNum == null) return;

        const needed = path.dataset.colorNum;
        if (needed === selectedNum) {
          path.style.fill = selectedRgb;
        }
      });
    })();
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    # Run locally: python pnb.py
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=True)
