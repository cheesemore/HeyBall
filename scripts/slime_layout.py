"""史莱姆 64×64 画布统一布局（底边、躯体高度一致）。"""
from __future__ import annotations

from PIL import Image

ART_SIZE = 64
NORM_FLOOR_Y = 63
NORM_BODY_H = 57


def normalize_slime_canvas(img: Image.Image) -> Image.Image:
    """裁切不透明区后按统一高度贴回，避免各色史莱姆在游戏里大小不一。"""
    base = img.convert("RGBA")
    if base.size != (ART_SIZE, ART_SIZE):
        sq = Image.new("RGBA", (ART_SIZE, ART_SIZE), (0, 0, 0, 0))
        sq.paste(base, ((ART_SIZE - base.width) // 2, (ART_SIZE - base.height) // 2))
        base = sq

    bbox = base.getbbox()
    if not bbox:
        return base

    crop = base.crop(bbox)
    cw, ch = crop.size
    scale = NORM_BODY_H / ch
    nw = max(1, int(round(cw * scale)))
    nh = NORM_BODY_H
    scaled = crop.resize((nw, nh), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (ART_SIZE, ART_SIZE), (0, 0, 0, 0))
    paste_x = (ART_SIZE - nw) // 2
    paste_y = NORM_FLOOR_Y - nh + 1
    out.paste(scaled, (paste_x, paste_y))
    return out
