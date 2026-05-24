"""为各色史莱姆生成两套 8 帧：普通（slime/slime_color）+ 挨打（slime_hit，源自 monster2）。"""
from __future__ import annotations

import math
import os
import re
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from slime_layout import NORM_FLOOR_Y, normalize_slime_canvas
from slime_recolor_targets import SKIP_KEYS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONSTERS = os.path.join(ROOT, "public", "assets", "monsters")
FRAME_COUNT = 8

IDLE_SY_AMP = 0.14
IDLE_SX_AMP = 0.07
HIT_SY_AMP = 0.26
HIT_SX_AMP = 0.12


def squash_frame_bottom(img: Image.Image, floor_y: int, sx: float, sy: float) -> Image.Image:
    w, h = img.size
    nw = max(1, int(round(w * sx)))
    nh = max(1, int(round(h * sy)))
    scaled = img.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(scaled, ((w - nw) // 2, floor_y - nh + 1))
    return out


def build_frame_set(
    base: Image.Image,
    key: str,
    suffix: str,
    sy_amp: float,
    sx_amp: float,
) -> None:
    floor_y = NORM_FLOOR_Y
    for i in range(FRAME_COUNT):
        t = i / FRAME_COUNT
        phase = t * math.pi * 2
        sy = 1 + sy_amp * math.sin(phase)
        sx = 1 - sx_amp * math.sin(phase)
        frame = squash_frame_bottom(base, floor_y, sx, sy)
        tag = f"_{suffix}" if suffix else ""
        frame.save(os.path.join(MONSTERS, f"slime_idle_{key}{tag}_{i:02d}.png"))


def copy_normal_aliases(suffix: str) -> None:
    if suffix == "":
        for i in range(FRAME_COUNT):
            src = os.path.join(MONSTERS, f"slime_idle_normal_{i:02d}.png")
            Image.open(src).save(os.path.join(MONSTERS, f"slime_idle_{i:02d}.png"))
    else:
        for i in range(FRAME_COUNT):
            src = os.path.join(MONSTERS, f"slime_idle_normal_{suffix}_{i:02d}.png")
            Image.open(src).save(os.path.join(MONSTERS, f"slime_idle_{suffix}_{i:02d}.png"))


def discover_idle_bases() -> dict[str, str]:
    bases: dict[str, str] = {}
    if os.path.isfile(os.path.join(MONSTERS, "slime.png")):
        bases["normal"] = os.path.join(MONSTERS, "slime.png")
    for name in os.listdir(MONSTERS):
        m = re.fullmatch(r"slime_color_(.+)\.png", name)
        if not m or m.group(1) in SKIP_KEYS:
            continue
        bases[m.group(1)] = os.path.join(MONSTERS, name)
    return bases


def discover_hit_bases() -> dict[str, str]:
    bases: dict[str, str] = {}
    if os.path.isfile(os.path.join(MONSTERS, "slime_hit_normal.png")):
        bases["normal"] = os.path.join(MONSTERS, "slime_hit_normal.png")
    for name in os.listdir(MONSTERS):
        m = re.fullmatch(r"slime_hit_(.+)\.png", name)
        if not m or m.group(1) in SKIP_KEYS:
            continue
        bases[m.group(1)] = os.path.join(MONSTERS, name)
    return bases


def main() -> None:
    os.makedirs(MONSTERS, exist_ok=True)

    idle_bases = discover_idle_bases()
    hit_bases = discover_hit_bases()
    if not hit_bases:
        raise SystemExit("no slime_hit_*.png — run: python scripts/recolor-slime-hit-hsv.py")

    for key, path in sorted(idle_bases.items()):
        base = normalize_slime_canvas(Image.open(path))
        build_frame_set(base, key, "", IDLE_SY_AMP, IDLE_SX_AMP)
        print(f"idle: {key}")

    for key, path in sorted(hit_bases.items()):
        base = normalize_slime_canvas(Image.open(path))
        build_frame_set(base, key, "hit", HIT_SY_AMP, HIT_SX_AMP)
        print(f"hit: {key}")

    copy_normal_aliases("")
    copy_normal_aliases("hit")

    print(
        "Done:",
        MONSTERS,
        f"({len(idle_bases)} idle + {len(hit_bases)} hit bases)",
    )


if __name__ == "__main__":
    main()
