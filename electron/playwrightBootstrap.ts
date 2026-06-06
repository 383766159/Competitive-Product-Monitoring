/**
 * 必须在加载 playwright 模块之前执行（同步），否则 Playwright 会固定去
 * %LOCALAPPDATA%\\ms-playwright 找浏览器，忽略随软件分发的目录。
 * 不依赖 electron app 是否 ready；仅用 path / fs / process。
 */
import path from 'node:path';
import fs from 'node:fs';

export function installPlaywrightBrowsersPathEarly(): void {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    try {
      if (fs.existsSync(process.env.PLAYWRIGHT_BROWSERS_PATH)) return;
    } catch {
      /* 继续探测 */
    }
  }

  const candidates: string[] = [];

  if (typeof process.resourcesPath === 'string' && process.resourcesPath.length > 0) {
    candidates.push(path.join(process.resourcesPath, 'playwright-browsers'));
  }

  /** dist-electron/main.js → 项目根/playwright-browsers（开发或未打 asar 时） */
  candidates.push(path.join(__dirname, '..', 'playwright-browsers'));

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        process.env.PLAYWRIGHT_BROWSERS_PATH = p;
        return;
      }
    } catch {
      /* ignore */
    }
  }
}
