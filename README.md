# HeyBall

弹球塔防 — PixiJS + TypeScript + Vite

## 开发（浏览器 H5）

```bash
npm install
npm run dev
```

## 构建 H5

```bash
npm run build
npm run preview
```

## 微信小游戏

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，导入**本项目根目录**（已含 `project.config.json`）。
2. 在本机执行打包（生成 `game.js` 与 `assets/`）：

```bash
npm install
npm run build:wx
```

3. 回到微信开发者工具 → **编译** → **真机调试**（模拟器与真机差异较大，建议真机试）。

每次改代码或更新 `public/assets` 后需重新执行 `npm run build:wx`。

### 包体说明

- 主包：`game.js` + `assets/balls/`（约 2MB）
- 分包：`assets/monsters/`（`game.json` 中 `monsters` 分包，进入游戏前自动 `loadSubpackage`）
- `game.js`、`assets/` 为构建产物，已加入 `.gitignore`；CI/上传前务必先 `build:wx`。

### 常见问题

| 现象 | 处理 |
|------|------|
| 黑屏 | 确认已运行 `build:wx`，根目录存在 `game.js` |
| 贴图全白 | 确认存在 `assets/` 且已重新 `build:wx` |
| 模拟器正常真机异常 | 基础库版本、WebGL 支持；查看真机调试控制台 |
