"""
从桌面文件夹导入 8 职业弹球：拷贝到 temp-experiment → 裁切/补方 → 64×64 → public/assets/balls
图层1..8 = 战士、骑士、法师、猎人、刺客、萨满、术士、德鲁伊
"""
from __future__ import annotations

import os
import re
import shutil
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC_DIR = r"D:\Desktop\新建文件夹 (3)"
TEMP_IMPORT = os.path.join(ROOT, "temp-experiment", "balls-import")
GAME_BALLS = os.path.join(ROOT, "public", "assets", "balls")
OUT_SIZE = 64

# 图层序号 → (BallColor 文件名, 中文职业)
LAYERS: list[tuple[int, str, str]] = [
    (1, "brown", "战士"),
    (2, "pink", "骑士"),
    (3, "blue", "法师"),
    (4, "green", "猎人"),
    (5, "yellow", "刺客"),
    (6, "navy", "萨满"),
    (7, "purple", "术士"),
    (8, "orange", "德鲁伊"),
]


def list_layer_files(src_dir: str) -> dict[int, str]:
    out: dict[int, str] = {}
    for name in os.listdir(src_dir):
        if not name.lower().endswith(".png"):
            continue
        m = re.search(r"(\d+)", name)
        if not m:
            continue
        out[int(m.group(1))] = os.path.join(src_dir, name)
    return out


def to_square_64(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = rgba.getbbox()
    if not bbox:
        raise ValueError("empty image")
    cropped = rgba.crop(bbox)
    cw, ch = cropped.size
    side = max(cw, ch)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(cropped, ((side - cw) // 2, (side - ch) // 2))
    return sq.resize((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    src_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC_DIR
    if not os.path.isdir(src_dir):
        raise SystemExit(f"Source dir not found: {src_dir}")

    files = list_layer_files(src_dir)
    os.makedirs(TEMP_IMPORT, exist_ok=True)
    os.makedirs(GAME_BALLS, exist_ok=True)

    for layer, color, label in LAYERS:
        if layer not in files:
            raise SystemExit(f"missing layer {layer} ({label}) in {src_dir}")
        src = files[layer]
        archive = os.path.join(
            TEMP_IMPORT, f"layer{layer:02d}-{label}-{color}.png"
        )
        shutil.copy2(src, archive)

        final = to_square_64(Image.open(src))
        game_path = os.path.join(GAME_BALLS, f"ball_{color}.png")
        final.save(game_path)
        print(f"layer{layer} {label} -> {archive}")
        print(f"  game: {game_path} ({OUT_SIZE}x{OUT_SIZE})")

    print("Done. temp:", TEMP_IMPORT)
    print("Done. game:", GAME_BALLS)


if __name__ == "__main__":
    main()
