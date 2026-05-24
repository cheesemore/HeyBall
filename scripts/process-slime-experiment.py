"""史莱姆实验图：裁切空白 → 最小正方形 → 64×64（假定已自行去背）。"""
from __future__ import annotations

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "temp-experiment")
DEFAULT_SRC = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "e",
    "assets",
    "c__Users_Cheese_more_AppData_Roaming_Cursor_User_workspaceStorage_3da8a7242a10afa47d70a762ff12f9d6_images______-ec17541d-897a-4368-b093-c7262f02080b.png",
)
OUT_SIZE = 64


def crop_and_square(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    bbox = rgba.getbbox()
    if not bbox:
        raise SystemExit("no visible pixels")
    cropped = rgba.crop(bbox)

    cw, ch = cropped.size
    side = max(cw, ch)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(cropped, ((side - cw) // 2, (side - ch) // 2))
    return sq


def process(src: str, out_path: str) -> None:
    sq = crop_and_square(Image.open(src))
    final = sq.resize((OUT_SIZE, OUT_SIZE), Image.Resampling.LANCZOS)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    final.save(out_path)


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.isfile(src):
        raise SystemExit(f"Source not found: {src}")
    out = os.path.join(OUT_DIR, "slime-64.png")
    process(src, out)
    print(f"source: {src}")
    print(f"saved: {out} ({OUT_SIZE}x{OUT_SIZE})")


if __name__ == "__main__":
    main()
