"""
挨打形态史莱姆（monster2）HSV 换色 → public/assets/monsters/slime_hit_*.png
"""
from __future__ import annotations

import importlib.util
import json
import os
import shutil
import sys

from PIL import Image

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _SCRIPT_DIR)
_spec = importlib.util.spec_from_file_location(
    "recolor_slime_hsv",
    os.path.join(_SCRIPT_DIR, "recolor-slime-hsv.py"),
)
_recolor = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_recolor)
build_mask = _recolor.build_mask
recolor = _recolor.recolor
save_mask_images = _recolor.save_mask_images
from slime_layout import normalize_slime_canvas
from slime_recolor_targets import SKIP_GAME_KEYS, TARGETS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "e",
    "assets",
    "c__Users_Cheese_more_AppData_Roaming_Cursor_User_workspaceStorage_3da8a7242a10afa47d70a762ff12f9d6_images_monster2-c357df92-6868-4f38-a68c-18491d0504a7.png",
)
FALLBACK_SRC = os.path.join(ROOT, "temp-experiment", "monster2.png")
OUT_DIR = os.path.join(ROOT, "temp-experiment", "slime-recolor-hit")
GAME_MONSTERS = os.path.join(ROOT, "public", "assets", "monsters")


def game_key(name: str) -> str | None:
    if name == "teal_normal":
        return "normal"
    if name in SKIP_GAME_KEYS:
        return None
    return name


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.isfile(src):
        src = FALLBACK_SRC
    if not os.path.isfile(src):
        raise SystemExit(f"Source not found: {src}")

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(GAME_MONSTERS, exist_ok=True)
    shutil.copy2(src, os.path.join(ROOT, "temp-experiment", "monster2.png"))

    img = Image.open(src).convert("RGBA")
    mask, baseline = build_mask(img)

    save_mask_images(img, mask, OUT_DIR)
    with open(os.path.join(OUT_DIR, "baseline.json"), "w", encoding="utf-8") as f:
        json.dump(baseline, f, ensure_ascii=False, indent=2)

    print("hit baseline:", baseline["avg_hex"], baseline["avg_hsv_deg"], "°")
    print("mask pixels:", baseline["pixel_count"])

    for name, hex_color in TARGETS.items():
        colored = normalize_slime_canvas(recolor(img, mask, baseline, hex_color))
        colored.save(os.path.join(OUT_DIR, f"slime_hit_{name}.png"))
        print("preview", name, hex_color)

        key = game_key(name)
        if key is None:
            continue
        game_path = os.path.join(GAME_MONSTERS, f"slime_hit_{key}.png")
        colored.save(game_path)
        print("game", game_path)

    print("Done:", OUT_DIR)


if __name__ == "__main__":
    main()
