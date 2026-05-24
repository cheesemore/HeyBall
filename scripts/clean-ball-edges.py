"""
平面风格弹球后处理：外缘去毛边 + 深色外圈描边（核心区域不改动）。
运行：python scripts/clean-ball-edges.py
"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BALL_DIR = os.path.join(ROOT, "public", "assets", "balls")

# 归一化半径平方：以内为核心，不改动
CORE_D2 = 0.74 * 0.74
# 外缘修复带：CORE_D2 < d2 <= 1
INWARD_SAMPLE = 0.68  # 向内取样参考色的比例（相对圆心）
STROKE_PX = 4.0  # 外圈描边宽度（像素）
STROKE_DARKEN = 0.48  # 相对主色的加深系数（越小越深）


def clamp_byte(v: float) -> int:
    return max(0, min(255, int(round(v))))


def lum(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def chroma(r: int, g: int, b: int) -> int:
    return max(r, g, b) - min(r, g, b)


def is_fringe(r: int, g: int, b: int, a: int, ref_lum: float) -> bool:
    if a < 100:
        return True
    if r >= 238 and g >= 238 and b >= 238:
        return True
    l = lum(r, g, b)
    if l > ref_lum + 55 and chroma(r, g, b) < 48:
        return True
    if l > 220 and chroma(r, g, b) < 28:
        return True
    return False


def sample_inner(
    px,
    w: int,
    h: int,
    cx: float,
    cy: float,
    x: int,
    y: int,
) -> tuple[int, int, int] | None:
    dx = x - cx
    dy = y - cy
    ix = int(round(cx + dx * INWARD_SAMPLE))
    iy = int(round(cy + dy * INWARD_SAMPLE))
    if not (0 <= ix < w and 0 <= iy < h):
        return None
    r, g, b, a = px[ix, iy]
    if a < 160:
        return None
    if r >= 238 and g >= 238 and b >= 238:
        return None
    return r, g, b


def median_body_color(px, w: int, h: int, cx: float, cy: float, radius: float) -> tuple[int, int, int]:
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    for y in range(h):
        for x in range(w):
            nx = (x - cx) / radius
            ny = (y - cy) / radius
            d2 = nx * nx + ny * ny
            if d2 < 0.35 * 0.35 or d2 > CORE_D2:
                continue
            r, g, b, a = px[x, y]
            if a < 160 or (r >= 238 and g >= 238 and b >= 238):
                continue
            rs.append(r)
            gs.append(g)
            bs.append(b)
    if not rs:
        return 128, 128, 128
    rs.sort()
    gs.sort()
    bs.sort()
    m = len(rs) // 2
    return rs[m], gs[m], bs[m]


def darken_rgb(r: int, g: int, b: int, factor: float = STROKE_DARKEN) -> tuple[int, int, int]:
    return (
        clamp_byte(r * factor),
        clamp_byte(g * factor),
        clamp_byte(b * factor),
    )


def add_dark_outline(img: Image.Image, body: tuple[int, int, int]) -> Image.Image:
    """最外一圈平面描边，颜色比主色更深。"""
    w, h = img.size
    out = img.copy()
    opx = out.load()
    cx = (w - 1) / 2.0
    cy = (h - 1) / 2.0
    radius = min(w, h) / 2.0 - 0.5
    stroke_r_inner = max(0.0, 1.0 - STROKE_PX / radius)
    stroke_d2_inner = stroke_r_inner * stroke_r_inner
    or_, og, ob = darken_rgb(*body)

    for y in range(h):
        for x in range(w):
            nx = (x - cx) / radius
            ny = (y - cy) / radius
            d2 = nx * nx + ny * ny
            if d2 > 1.0:
                opx[x, y] = (0, 0, 0, 0)
                continue
            if d2 < stroke_d2_inner:
                continue
            if d2 > 0.985:
                t = (1.0 - d2) / 0.015
                opx[x, y] = (or_, og, ob, clamp_byte(255 * t))
            else:
                opx[x, y] = (or_, og, ob, 255)
    return out


def process_ball(img: Image.Image) -> Image.Image:
    w, h = img.size
    spx = img.convert("RGBA").load()
    cx = (w - 1) / 2.0
    cy = (h - 1) / 2.0
    radius = min(w, h) / 2.0 - 0.5
    body = median_body_color(spx, w, h, cx, cy, radius)
    cleaned = clean_edges(img)
    return add_dark_outline(cleaned, body)


def clean_edges(img: Image.Image) -> Image.Image:
    w, h = img.size
    src = img.convert("RGBA")
    spx = src.load()
    out = src.copy()
    opx = out.load()

    cx = (w - 1) / 2.0
    cy = (h - 1) / 2.0
    radius = min(w, h) / 2.0 - 0.5
    body = median_body_color(spx, w, h, cx, cy, radius)
    ref_lum = lum(*body)

    for y in range(h):
        for x in range(w):
            nx = (x - cx) / radius
            ny = (y - cy) / radius
            d2 = nx * nx + ny * ny
            if d2 > 1.0:
                opx[x, y] = (0, 0, 0, 0)
                continue

            sr, sg, sb, sa = spx[x, y]

            # 核心：完全保留原图
            if d2 <= CORE_D2:
                opx[x, y] = (sr, sg, sb, sa)
                continue

            # 仅外缘带：修复毛边/缺口
            inner = sample_inner(spx, w, h, cx, cy, x, y)
            fill = inner if inner is not None else body

            if sa < 80 or is_fringe(sr, sg, sb, sa, ref_lum):
                fr, fg, fb = fill
                opx[x, y] = (fr, fg, fb, 255)
            else:
                opx[x, y] = (sr, sg, sb, sa)

            # 最外 1～2 像素只做透明抗锯齿，不改 RGB
            if d2 > 0.985:
                t = (1.0 - d2) / 0.015
                opx[x, y] = (*opx[x, y][:3], clamp_byte(255 * t))

    return out


def main() -> None:
    ball_dir = sys.argv[1] if len(sys.argv) > 1 else BALL_DIR
    if not os.path.isdir(ball_dir):
        raise SystemExit(f"Not found: {ball_dir}")

    names = sorted(
        f for f in os.listdir(ball_dir) if f.startswith("ball_") and f.endswith(".png")
    )
    if not names:
        raise SystemExit("No ball_*.png")

    for name in names:
        path = os.path.join(ball_dir, name)
        process_ball(Image.open(path)).save(path)
        print("processed:", path)

    print("Done:", ball_dir)


if __name__ == "__main__":
    main()
