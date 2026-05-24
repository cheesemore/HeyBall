"""精英(128) / 首领(256) 史莱姆 idle UV，无 hit 套。"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slime_layout import normalize_slime_canvas

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONSTERS = os.path.join(ROOT, "public", "assets", "monsters")
FRAME_COUNT = 8
IDLE_SY_AMP = 0.14
IDLE_SX_AMP = 0.07

BIG = (
    ("elite", "slime_elite.png", 128),
    ("boss", "slime_boss.png", 256),
)


def squash_frame_bottom(img: Image.Image, floor_y: int, sx: float, sy: float) -> Image.Image:
    w, h = img.size
    nw = max(1, int(round(w * sx)))
    nh = max(1, int(round(h * sy)))
    scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(scaled, ((w - nw) // 2, floor_y - nh + 1))
    return out


def build_for_key(key: str, base_path: str, art_size: int) -> None:
    floor_y = art_size - 1
    body_h = int(round(57 * art_size / 64))
    base = normalize_slime_canvas(Image.open(base_path), art_size=art_size, floor_y=floor_y, body_h=body_h)
    for i in range(FRAME_COUNT):
        t = i / FRAME_COUNT
        phase = t * math.pi * 2
        sy = 1 + IDLE_SY_AMP * math.sin(phase)
        sx = 1 - IDLE_SX_AMP * math.sin(phase)
        frame = squash_frame_bottom(base, floor_y, sx, sy)
        frame.save(os.path.join(MONSTERS, f"slime_idle_{key}_{i:02d}.png"))


def main() -> None:
    for key, fname, size in BIG:
        path = os.path.join(MONSTERS, fname)
        if not os.path.isfile(path):
            raise SystemExit(f"missing {path} — run: python scripts/prepare-elite-boss-slime.py")
        build_for_key(key, path, size)
        print(f"idle UV: {key} ({size}px)")


if __name__ == "__main__":
    main()
