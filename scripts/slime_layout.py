"""史莱姆 64×64 画布统一布局（底边、躯体高度一致）。"""
from __future__ import annotations

from PIL import Image

ART_SIZE = 64
NORM_FLOOR_Y = 63
NORM_BODY_H = 57


def normalize_slime_canvas(
    img: Image.Image,
    *,
    art_size: int = ART_SIZE,
    floor_y: int | None = None,
    body_h: int | None = None,
) -> Image.Image:
    """裁切不透明区后按统一高度贴回，避免各色史莱姆在游戏里大小不一。"""
    floor_y = art_size - 1 if floor_y is None else floor_y
    body_h = int(round(NORM_BODY_H * art_size / ART_SIZE)) if body_h is None else body_h

    base = img.convert("RGBA")
    if base.size != (art_size, art_size):
        sq = Image.new("RGBA", (art_size, art_size), (0, 0, 0, 0))
        sq.paste(base, ((art_size - base.width) // 2, (art_size - base.height) // 2))
        base = sq

    bbox = base.getbbox()
    if not bbox:
        return base

    crop = base.crop(bbox)
    cw, ch = crop.size
    scale = body_h / ch
    nw = max(1, int(round(cw * scale)))
    nh = body_h
    scaled = crop.resize((nw, nh), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (art_size, art_size), (0, 0, 0, 0))
    paste_x = (art_size - nw) // 2
    paste_y = floor_y - nh + 1
    out.paste(scaled, (paste_x, paste_y))
    return out
