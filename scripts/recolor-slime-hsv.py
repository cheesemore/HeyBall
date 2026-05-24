"""
史莱姆 HSV 换色：仅替换身上蓝色区域，保留嘴/眼/黑边。
输入：temp-experiment/slime-64.png
输出：temp-experiment/slime-recolor/（蒙版记录图、基准色、各色史莱姆）
"""
from __future__ import annotations

import colorsys
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slime_layout import normalize_slime_canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "temp-experiment", "slime-64.png")
OUT_DIR = os.path.join(ROOT, "temp-experiment", "slime-recolor")
GAME_MONSTERS = os.path.join(ROOT, "public", "assets", "monsters")

from slime_recolor_targets import SKIP_GAME_KEYS, TARGETS


def hex_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def is_blue_body(r: int, g: int, b: int, a: int) -> bool:
    if a < 24:
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    h_deg = h * 360

    if v < 0.14:
        return False
    if v > 0.9 and s < 0.22:
        return False
    if s < 0.1:
        return False
    # 嘴：偏红
    if r > 70 and r > g * 1.25 and r > b * 1.05 and s > 0.18:
        return False
    # 青蓝躯体
    if 155 <= h_deg <= 235 and s >= 0.12:
        return True
    if b > r + 12 and b >= g - 8 and s >= 0.1:
        return True
    return False


def build_mask(img: Image.Image) -> tuple[list[list[bool]], dict]:
    w, h = img.size
    px = img.load()
    mask = [[False] * w for _ in range(h)]
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    hs: list[float] = []
    ss: list[float] = []
    vs: list[float] = []

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not is_blue_body(r, g, b, a):
                continue
            mask[y][x] = True
            rs.append(r)
            gs.append(g)
            bs.append(b)
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hs.append(h)
            ss.append(s)
            vs.append(v)

    if not rs:
        raise SystemExit("no blue body pixels found")

    avg_r = sum(rs) / len(rs)
    avg_g = sum(gs) / len(gs)
    avg_b = sum(bs) / len(bs)
    avg_h = sum(hs) / len(hs)
    avg_s = sum(ss) / len(ss)
    avg_v = sum(vs) / len(vs)

    baseline = {
        "pixel_count": len(rs),
        "avg_rgb": [round(avg_r), round(avg_g), round(avg_b)],
        "avg_hex": "#%02X%02X%02X"
        % (round(avg_r), round(avg_g), round(avg_b)),
        "avg_hsv_deg": round(avg_h * 360, 2),
        "avg_hsv": [round(avg_h, 4), round(avg_s, 4), round(avg_v, 4)],
    }
    return mask, baseline


def save_mask_images(img: Image.Image, mask: list[list[bool]], out_dir: str) -> None:
    w, h = img.size
    px = img.load()

    mask_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    record = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mpx = mask_img.load()
    rpx = record.load()

    for y in range(h):
        for x in range(w):
            if not mask[y][x]:
                continue
            mpx[x, y] = (255, 255, 255, 255)
            r, g, b, a = px[x, y]
            rpx[x, y] = (r, g, b, a)

    mask_img.save(os.path.join(out_dir, "blue_mask.png"))
    record.save(os.path.join(out_dir, "blue_body_record.png"))

    preview = img.copy()
    ppx = preview.load()
    for y in range(h):
        for x in range(w):
            if mask[y][x]:
                ppx[x, y] = (120, 200, 255, 180)
    preview.save(os.path.join(out_dir, "blue_mask_overlay.png"))


def recolor(
    img: Image.Image,
    mask: list[list[bool]],
    baseline: dict,
    target_hex: str,
) -> Image.Image:
    w, h = img.size
    out = img.copy()
    opx = out.load()
    src = img.load()

    sh, ss, sv = baseline["avg_hsv"]
    tr, tg, tb = hex_rgb(target_hex)
    th, ts, tv = colorsys.rgb_to_hsv(tr / 255, tg / 255, tb / 255)

    for y in range(h):
        for x in range(w):
            if not mask[y][x]:
                continue
            r, g, b, a = src[x, y]
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)

            nh = (h - sh + th) % 1.0
            if ss > 0.02:
                ns = min(1.0, max(0.0, s * (ts / ss)))
            else:
                ns = ts
            if sv > 0.02:
                nv = min(1.0, max(0.0, v * (tv / sv)))
            else:
                nv = tv

            nr, ng, nb = colorsys.hsv_to_rgb(nh, ns, nv)
            opx[x, y] = (
                int(round(nr * 255)),
                int(round(ng * 255)),
                int(round(nb * 255)),
                a,
            )
    return out


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else SRC
    if not os.path.isfile(src):
        raise SystemExit(f"Source not found: {src}")

    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(src).convert("RGBA")
    mask, baseline = build_mask(img)

    save_mask_images(img, mask, OUT_DIR)
    with open(os.path.join(OUT_DIR, "baseline.json"), "w", encoding="utf-8") as f:
        json.dump(baseline, f, ensure_ascii=False, indent=2)

    print("baseline:", baseline["avg_hex"], "HSV", baseline["avg_hsv_deg"], "°")
    print("mask pixels:", baseline["pixel_count"])

    os.makedirs(GAME_MONSTERS, exist_ok=True)

    for name, hex_color in TARGETS.items():
        out_path = os.path.join(OUT_DIR, f"slime_{name}.png")
        colored = normalize_slime_canvas(recolor(img, mask, baseline, hex_color))
        colored.save(out_path)
        print("wrote", out_path, "->", hex_color)

    # 实装：灰砖用青绿史莱姆 #5DAFA0
    teal_hex = TARGETS["teal_normal"]
    teal = normalize_slime_canvas(recolor(img, mask, baseline, teal_hex))
    teal.save(os.path.join(OUT_DIR, "slime_teal_normal.png"))
    for dest in ("slime.png", "monster1.png"):
        teal.save(os.path.join(GAME_MONSTERS, dest))
    print("game base (normal gray brick) ->", teal_hex)

    for name, hex_color in TARGETS.items():
        if name in SKIP_GAME_KEYS:
            continue
        colored = normalize_slime_canvas(recolor(img, mask, baseline, hex_color))
        colored.save(os.path.join(GAME_MONSTERS, f"slime_color_{name}.png"))

    print("Done:", OUT_DIR)


if __name__ == "__main__":
    main()
