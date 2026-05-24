import { defineConfig } from 'vite';
import path from 'node:path';

/** 微信小游戏：单文件 game.js，不压缩（避免 Pixi worker/eval 问题） */
export default defineConfig({
  define: {
    'import.meta.env.BASE_URL': JSON.stringify('./'),
  },
  build: {
    outDir: '.',
    emptyOutDir: false,
    minify: false,
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/game.wx.ts'),
      output: {
        entryFileNames: 'game.js',
        format: 'iife',
        name: 'HeyBall',
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
