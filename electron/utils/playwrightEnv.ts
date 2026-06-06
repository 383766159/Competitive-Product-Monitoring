/**
 * @deprecated 浏览器路径改由 `playwrightBootstrap.ts` 在 main 入口最前同步设置。
 * 保留文件以免旧文档引用；逻辑与 `installPlaywrightBrowsersPathEarly` 一致。
 */
import { installPlaywrightBrowsersPathEarly } from '../playwrightBootstrap';

export function applyPlaywrightBrowsersPath(): void {
  installPlaywrightBrowsersPathEarly();
}
