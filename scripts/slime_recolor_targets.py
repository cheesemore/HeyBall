"""史莱姆换色目标（与怪物砖块 / 灰砖青绿一致）。"""

# normal 灰砖上显示青绿；gray_brick 仅预览用
TARGETS: dict[str, str] = {
    "teal_normal": "#5DAFA0",
    "gray_brick": "#C8C8C8",
    "elite": "#DD3333",
    "boss": "#660018",
    "airdrop_blue": "#888888",
    "airdrop_red": "#444444",
    "special_copy": "#00ACC1",
    "special_invincible": "#FFB300",
    "special_heal": "#43A047",
    "special_annihilate": "#8E24AA",
    "special_jump": "#FB8C00",
    "special_summon": "#E91E63",
    "special_shield": "#4A4A4A",
    "special_rebirth": "#FFAB91",
    "special_regen": "#8B0000",
}

SKIP_GAME_KEYS = {"elite", "boss", "teal_normal", "gray_brick"}

# build-slime-idle-frames 不生成帧的键
SKIP_KEYS = SKIP_GAME_KEYS
