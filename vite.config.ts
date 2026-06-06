import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * 开发模式必须用 `/`，否则 Electron 加载 localhost 时脚本路径容易异常导致白屏/只有背景色。
 * 打包后用 `./` 以便 file:// 协议正确加载资源。
 */
export default defineConfig(({ command }) => ({
  plugins: [react()],
  root: '.',
  base: command === 'build' ? './' : '/',
  build: {
    /** 仅输出到 dist/renderer，避免 emptyDir 删除整个 dist（防止误删/锁定 win-unpacked 等） */
    outDir: 'dist/renderer',
    emptyDirBeforeWrite: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
}));
