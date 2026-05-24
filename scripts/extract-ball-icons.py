"""
从「弹球八色·内绘简笔图腾」设定图提取 8 职业弹球：
1. 去白底、去黑色标题/职业文字
2. 定位球体行带后按列裁切
3. 按球心+半径强制正圆并输出透明 PNG
"""
from __future__ import annotations

import math
import os
import sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "e",
    "assets",
    "ball-eight-colors-icons-test.png",
)
OUT_DIR = os.path.join(ROOT, "public", "assets", "balls")
COLORS = [
    "brown",
    "pink",
    "blue",
    "green",
    "yellow",
    "navy",
    "purple",
    "orange",
]
OUT_SIZE = 128

# 近白背景
BG_MIN = 238
# 标题/底部职业名（黑/深灰墨迹）
TEXT_LUM_MAX = 118
TEXT_CHROMA_MAX = 42


def lum(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def chroma(r: int, g: int, b: int) -> int:
    return max(r, g, b) - min(r, g, b)


def is_background(r: int, g: int, b: int) -> bool:
    return r >= BG_MIN and g >= BG_MIN and b >= BG_MIN


def is_text_ink(r: int, g: int, b: int) -> bool:
    if lum(r, g, b) > TEXT_LUM_MAX:
        return False
    return chroma(r, g, b) <= TEXT_CHROMA_MAX


def is_ball_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a < 8:
        return False
    if is_background(r, g, b):
        return False
    if is_text_ink(r, g, b):
        return False
    return True


def clean_image(img: Image.Image) -> Image.Image:
    """去底 + 去字，保留球体彩色与球内浅色图腾。"""
    out = img.convert("RGBA")
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_background(r, g, b) or is_text_ink(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return out


def detect_ball_row_band(img: Image.Image) -> tuple[int, int]:
    """根据每行「球体像素」数量，定位中间球带（排除已去掉的顶标题/底标签残留）。"""
    w, h = img.size
    px = img.load()
    row_counts = [0] * h
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_ball_pixel(r, g, b, a):
                row_counts[y] += 1

    peak = max(row_counts)
    if peak < 1:
        return 0, h - 1

    thresh = peak * 0.12
    ys = [i for i, c in enumerate(row_counts) if c >= thresh]
    if not ys:
        return 0, h - 1

    # 取最长连续高密行段（球体所在横带）
    best_start, best_len = ys[0], 1
    cur_start, cur_len = ys[0], 1
    for i in range(1, len(ys)):
        if ys[i] == ys[i - 1] + 1:
            cur_len += 1
        else:
            if cur_len > best_len:
                best_start, best_len = cur_start, cur_len
            cur_start, cur_len = ys[i], 1
    if cur_len > best_len:
        best_start, best_len = cur_start, cur_len

    y0 = best_start
    y1 = best_start + best_len - 1
    pad = int((y1 - y0) * 0.06)
    return max(0, y0 - pad), min(h - 1, y1 + pad)


def column_ball_pixels(
    img: Image.Image,
    left: int,
    right: int,
    y_band: tuple[int, int],
) -> tuple[list[int], list[int]]:
    """只取列中心附近的球体像素，避免左右邻球渗入。"""
    px = img.load()
    y0, y1 = y_band
    col_cx = (left + right) * 0.5
    col_w = right - left
    max_dx = col_w * 0.36

    xs: list[int] = []
    ys: list[int] = []
    for y in range(y0, y1 + 1):
        for x in range(left, right):
            if abs(x - col_cx) > max_dx:
                continue
            r, g, b, a = px[x, y]
            if is_ball_pixel(r, g, b, a):
                xs.append(x)
                ys.append(y)
    return xs, ys


def extract_ball_from_column(
    img: Image.Image,
    left: int,
    right: int,
    y_band: tuple[int, int],
) -> Image.Image | None:
    w, h = img.size
    xs, ys = column_ball_pixels(img, left, right, y_band)

    if len(xs) < 80:
        return None

    cx = sum(xs) / len(xs)
    cy = sum(ys) / len(ys)
    dists = sorted(math.hypot(x - cx, y - cy) for x, y in zip(xs, ys))
    radius = dists[int(len(dists) * 0.94)]
    radius *= 1.02

    side = int(math.ceil(radius * 2))
    crop_x0 = int(round(cx - radius))
    crop_y0 = int(round(cy - radius))
    crop_x1 = crop_x0 + side
    crop_y1 = crop_y0 + side

    crop_x0 = max(0, crop_x0)
    crop_y0 = max(0, crop_y0)
    crop_x1 = min(w, crop_x1)
    crop_y1 = min(h, crop_y1)

    patch = img.crop((crop_x0, crop_y0, crop_x1, crop_y1))
    pw, ph = patch.size
    side_sq = max(pw, ph)
    sq = Image.new("RGBA", (side_sq, side_sq), (0, 0, 0, 0))
    sq.paste(patch, ((side_sq - pw) // 2, (side_sq - ph) // 2))

    sq = sq.resize((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)
    mask = Image.new("L", (OUT_SIZE, OUT_SIZE), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, OUT_SIZE - 1, OUT_SIZE - 1), fill=255)

    # 圆外像素强制透明，去掉邻球残边
    px = sq.load()
    half = OUT_SIZE / 2
    r2 = (half - 0.5) ** 2
    for y in range(OUT_SIZE):
        for x in range(OUT_SIZE):
            if (x - half + 0.5) ** 2 + (y - half + 0.5) ** 2 > r2:
                px[x, y] = (0, 0, 0, 0)
    return sq


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.isfile(src):
        raise SystemExit(f"Source not found: {src}")
    os.makedirs(OUT_DIR, exist_ok=True)

    raw = Image.open(src).convert("RGBA")
    cleaned = clean_image(raw)
    y_band = detect_ball_row_band(cleaned)

    w, _ = cleaned.size
    n = len(COLORS)
    col_w = w // n

    print(f"source: {src} ({raw.size[0]}x{raw.size[1]})")
    print(f"ball row band: y={y_band[0]}..{y_band[1]}")

    for i, color in enumerate(COLORS):
        left = i * col_w
        right = w if i == n - 1 else (i + 1) * col_w
        ball = extract_ball_from_column(cleaned, left, right, y_band)
        if ball is None:
            print("skip empty", color)
            continue
        out_path = os.path.join(OUT_DIR, f"ball_{color}.png")
        ball.save(out_path)
        print(f"{color} -> {out_path}")

    print("Done:", OUT_DIR)
    print("Tip: run  python scripts/clean-ball-edges.py  to fix rim fringes only (flat core kept).")


if __name__ == "__main__":
    main()
