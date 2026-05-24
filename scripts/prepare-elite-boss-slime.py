"""精英/首领史莱姆：去黑底 → 等比缩放 → 透明留白补全到 128 / 256。"""
from __future__ import annotations

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONSTERS = os.path.join(ROOT, "public", "assets", "monsters")
ASSETS = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "e",
    "assets",
)

DEFAULT_ELITE = os.path.join(
    ASSETS,
    "c__Users_Cheese_more_AppData_Roaming_Cursor_User_workspaceStorage_"
    "3da8a7242a10afa47d70a762ff12f9d6_images_elite-2c94da96-fe84-4b53-bfaf-c8928fb92f1d.png",
)
DEFAULT_BOSS = os.path.join(
    ASSETS,
    "c__Users_Cheese_more_AppData_Roaming_Cursor_User_workspaceStorage_"
    "3da8a7242a10afa47d70a762ff12f9d6_images_boss-0ebe8771-4548-4248-93b8-1013ffd71f63.png",
)

PADDING_RATIO = 0.08


def key_out_black(img: Image.Image, tol: int = 28) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                px[x, y] = (0, 0, 0, 0)
                continue
            if r < tol and g < tol and b < tol:
                px[x, y] = (0, 0, 0, 0)
    return rgba


def fit_pad_square(img: Image.Image, size: int) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = rgba.getbbox()
    if not bbox:
        raise SystemExit("no visible pixels after keying")
    crop = rgba.crop(bbox)
    cw, ch = crop.size
    pad = int(round(size * PADDING_RATIO))
    inner = size - pad * 2
    scale = min(inner / cw, inner / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    scaled = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(scaled, ((size - nw) // 2, (size - nh) // 2))
    return out


def process_one(src: str, out_name: str, size: int) -> str:
    if not os.path.isfile(src):
        raise SystemExit(f"Source not found: {src}")
    keyed = key_out_black(Image.open(src))
    final = fit_pad_square(keyed, size)
    os.makedirs(MONSTERS, exist_ok=True)
    out_path = os.path.join(MONSTERS, out_name)
    final.save(out_path)
    print(f"{out_name}: {size}x{size} <- {src}")
    return out_path


def main() -> None:
    elite_src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_ELITE
    boss_src = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BOSS
    process_one(elite_src, "slime_elite.png", 128)
    process_one(boss_src, "slime_boss.png", 256)
    # 预览/管线用色板占位
    process_one(elite_src, "slime_color_elite.png", 128)
    process_one(boss_src, "slime_color_boss.png", 256)


if __name__ == "__main__":
    main()
