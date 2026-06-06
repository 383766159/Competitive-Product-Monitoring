/**
 * 删除旧版 electron-builder 误放在 dist 下的 win-unpacked（现已改为 release）。
 * 若删除失败（占用中），请关闭 exe / 资源管理器后手动删 dist\\win-unpacked。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stale = path.join(root, 'dist', 'win-unpacked');

if (fs.existsSync(stale)) {
  console.log('[clean-dist-win-unpacked] 正在删除旧的 dist\\win-unpacked …');
  try {
    fs.rmSync(stale, { recursive: true, force: true });
    console.log('[clean-dist-win-unpacked] 已删除。');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[clean-dist-win-unpacked] 未能删除（可忽略，Vite 已不再清空整个 dist）：', msg);
    console.warn('若仍占空间，请关闭 exe 后手动删除:', stale);
  }
}
