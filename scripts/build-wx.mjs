/**
 * 微信小游戏构建：资源清单 → TS 检查 → 打包 game.js → 复制 assets
 */
import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const assetsSrc = path.join(root, 'public', 'assets');
const assetsDest = path.join(root, 'assets');

console.log('→ asset manifest');
run('npm', ['run', 'build:asset-manifest']);

console.log('→ tsc');
run('npx', ['tsc', '--noEmit']);

console.log('→ vite build (wx)');
run('npx', ['vite', 'build', '--config', 'vite.config.wx.ts']);

console.log('→ copy public/assets → assets/');
await rm(assetsDest, { recursive: true, force: true });
await mkdir(assetsDest, { recursive: true });
await cp(assetsSrc, assetsDest, { recursive: true });

/** 微信要求每个分包根目录有 game.js（可为空入口，仅承载资源） */
await copyFile(
  path.join(root, 'scripts', 'wx-monsters-subpackage-game.js'),
  path.join(assetsDest, 'monsters', 'game.js'),
);

console.log('\n微信小游戏包已就绪：');
console.log('  game.js');
console.log('  game.json');
console.log('  assets/');
console.log('  project.config.json');
console.log('\n请在微信开发者工具中打开本项目根目录并点击「编译」。');
