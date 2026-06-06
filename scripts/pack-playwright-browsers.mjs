/**
 * 将本机 Playwright Chromium 复制到项目根目录 playwright-browsers，
 * 供 electron-builder extraResources 打入安装包。
 * 构建安装包前请先：npm install && npm run postinstall（或 playwright install chromium）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error('未找到 Chromium 目录:', src);
    console.error('请先运行: npx playwright install chromium');
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
const candidates = [
  envPath && path.join(envPath),
  path.join(root, 'node_modules', 'playwright-core', '.local-browsers'),
  path.join(root, 'node_modules', 'playwright', '.local-browsers'),
];

let srcRoot = null;
for (const c of candidates) {
  if (c && fs.existsSync(c)) {
    srcRoot = c;
    break;
  }
}

// Windows 默认缓存路径
if (!srcRoot && process.platform === 'win32') {
  const local = process.env.LOCALAPPDATA;
  if (local) {
    const ms = path.join(local, 'ms-playwright');
    if (fs.existsSync(ms)) srcRoot = ms;
  }
}

if (!srcRoot) {
  console.error('找不到 Playwright 浏览器缓存，请运行: npx playwright install chromium');
  process.exit(1);
}

const out = path.join(root, 'playwright-browsers');
fs.rmSync(out, { recursive: true, force: true });
copyDir(srcRoot, out);
console.log('已复制浏览器到:', out);
