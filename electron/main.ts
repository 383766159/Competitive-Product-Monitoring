import { installPlaywrightBrowsersPathEarly } from './playwrightBootstrap';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { Browser, Page } from 'playwright';
import { scrapeAsinOnPage, withBrowser } from './crawler/scrapeAsin';
import { getAmazonMarketplaceMeta } from './crawler/constants';
import type { AsinSnapshot } from './crawler/types';
import { appendSnapshots } from './excel/writer';
import type { SyncAsinsOptions, SyncProgress } from './ipcTypes';
import { getAppRootDir, getDataDir, getLogsDir, getScreenshotsDir } from './utils/paths';
import {
  buildExcelPathForGroup,
  getActiveGroup,
  getConfigFilePath,
  getDefaultUserConfig,
  loadUserConfig,
  resolveExcelPath,
  saveUserConfig,
  type AsinGroup,
  type UserConfig,
} from './utils/userConfig';

installPlaywrightBrowsersPathEarly();

function formatPlaywrightMissingError(raw: string): string {
  const packagedHint =
    '绿色版未找到内置 Chromium。请在打包机器上先执行：\n' +
    '  npm run pack:browsers\n' +
    '  npm run release\n' +
    '然后再分发 release 中的 zip 或 win-unpacked 整个目录（必须包含 resources\\\\playwright-browsers）。\n' +
    '使用方电脑不需要安装 Node，也不需要手动执行 npx。';
  const devHint =
    '未检测到 Playwright 浏览器。请在项目根目录执行：\n' +
    '  npx playwright install chromium\n' +
    '或 npm run setup:browsers，然后重新同步。';

  if (/Executable doesn't exist|browserType\.launch/i.test(raw)) {
    return `${app.isPackaged ? packagedHint : devHint}\n\n原始错误：${raw}`;
  }
  return raw;
}

let mainWindow: BrowserWindow | null = null;

function sendProgress(progress: SyncProgress): void {
  mainWindow?.webContents.send('sync-progress', progress);
}

function logLine(message: string): void {
  sendProgress({ type: 'log', message });
  const logDir = getLogsDir();
  const logFile = path.join(logDir, `sync-${new Date().toISOString().slice(0, 10)}.log`);
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFilePart(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').trim().slice(0, 48) || 'group';
}

function buildOtherForSheet(snapshot: AsinSnapshot): string {
  const parts: string[] = [];
  const other = snapshot.other.trim();
  if (other && other !== '/') parts.push(other);
  if (!snapshot.ok && snapshot.error) parts.push(`异常:${snapshot.error}`);
  return parts.join('；') || '/';
}

async function saveFailureArtifacts(
  browser: Browser,
  sharedPage: Page | null,
  groupName: string,
  asin: string,
  marketplace: UserConfig['marketplace'],
  priceDebug?: string,
): Promise<void> {
  const baseName = `${sanitizeFilePart(groupName)}-${asin}-${Date.now()}`;
  const screenshotPath = path.join(getScreenshotsDir(), `${baseName}.png`);
  const debugDir = path.join(getLogsDir(), 'price-debug');
  fs.mkdirSync(debugDir, { recursive: true });

  if (priceDebug) {
    const debugPath = path.join(debugDir, `${baseName}.json`);
    fs.writeFileSync(debugPath, priceDebug, 'utf8');
    logLine(`已保存价格调试信息：${debugPath}`);
  }

  try {
    const marketplaceMeta = getAmazonMarketplaceMeta(marketplace);
    if (sharedPage) {
      await sharedPage.goto(`${marketplaceMeta.dpBase}${asin}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await sleep(800);
      await sharedPage.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    } else {
      await withBrowser(
        browser,
        async (page) => {
          await page.goto(`${marketplaceMeta.dpBase}${asin}`, {
            waitUntil: 'domcontentloaded',
            timeout: 45_000,
          });
          await page.waitForTimeout(800);
          await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
        },
        marketplace,
      );
    }
    logLine(`已保存失败截图：${screenshotPath}`);
  } catch (error) {
    logLine(`保存失败截图时出错：${error instanceof Error ? error.message : String(error)}`);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 920,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('[electron] did-fail-load', code, description, url);
  });

  if (!app.isPackaged) {
    void mainWindow.loadURL('http://127.0.0.1:5173/');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('get-config', () => loadUserConfig());
  ipcMain.handle('get-default-config', () => getDefaultUserConfig());
  ipcMain.handle('save-config', (_event, cfg: UserConfig) => saveUserConfig(cfg));

  ipcMain.handle('pick-excel-path', async () => {
    const cfg = loadUserConfig();
    const ownerWindow = BrowserWindow.getFocusedWindow() || mainWindow || undefined;
    const dialogOptions = {
      title: '选择 Excel 保存位置（可选，默认按分组名和日期自动生成）',
      defaultPath: resolveExcelPath(cfg),
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    };
    const { canceled, filePath } = ownerWindow
      ? await dialog.showSaveDialog(ownerWindow, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);

    if (canceled || !filePath) return { ok: false as const };
    return {
      ok: true as const,
      path: filePath.toLowerCase().endsWith('.xlsx') ? filePath : `${filePath}.xlsx`,
    };
  });

  ipcMain.handle('get-paths', () => {
    const cfg = loadUserConfig();
    return {
      dataDir: getDataDir(),
      excelPath: resolveExcelPath(cfg),
      configPath: getConfigFilePath(),
    };
  });

  ipcMain.handle('open-excel', async (_event, groupId?: string) => {
    const cfg = loadUserConfig();
    const group = groupId
      ? cfg.groups.find((item) => item.id === groupId) ?? getActiveGroup(cfg)
      : getActiveGroup(cfg);
    const filePath = group
      ? buildExcelPathForGroup(group.name, new Date(), cfg.marketplace)
      : resolveExcelPath(cfg);

    if (fs.existsSync(filePath)) await shell.openPath(filePath);
    return { ok: true };
  });

  ipcMain.handle('open-data-folder', async () => {
    await shell.openPath(getDataDir());
    return { ok: true };
  });

  ipcMain.handle('open-logs-folder', async () => {
    await shell.openPath(getLogsDir());
    return { ok: true };
  });

  ipcMain.handle('sync-asins', async (_event, opts?: SyncAsinsOptions) => {
    const cfg = loadUserConfig();
    const idSet = opts?.groupIds?.length ? new Set(opts.groupIds) : null;
    let groupsToRun: AsinGroup[] = idSet
      ? cfg.groups.filter((group) => idSet.has(group.id))
      : (() => {
          const activeGroup = getActiveGroup(cfg);
          return activeGroup ? [activeGroup] : [];
        })();

    groupsToRun = groupsToRun.filter((group) => group.asins.length > 0);
    if (groupsToRun.length === 0) {
      const message = '没有可同步的分组，请至少勾选一个包含有效 ASIN 的分组。';
      sendProgress({ type: 'error', message });
      return { ok: false, error: message };
    }

    const headless = cfg.headless !== false;
    const marketplace = cfg.marketplace;
    const marketplaceMeta = getAmazonMarketplaceMeta(marketplace);
    const marketplaceZipSettings = cfg.zipSettings[marketplace];
    const totalAsins = groupsToRun.reduce((sum, group) => sum + group.asins.length, 0);

    logLine(`软件目录：${getAppRootDir()}`);
    logLine(`本次同步 ${groupsToRun.length} 个分组，共 ${totalAsins} 个 ASIN`);
    for (const group of groupsToRun) {
      logLine(
        `  - ${group.name}（${group.asins.length} 个） -> ${buildExcelPathForGroup(group.name, new Date(), marketplace)}`,
      );
    }
    logLine(
      `浏览器：${headless ? '无头' : '有头'} | 站点：${marketplaceMeta.label}（${marketplaceMeta.host}） | 配送邮编：${marketplaceZipSettings.zipCode}`,
    );

    let browser: Browser | null = null;
    let sharedPage: Page | null = null;

    try {
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (error) {
      const message = formatPlaywrightMissingError(
        error instanceof Error ? error.message : String(error),
      );
      sendProgress({ type: 'error', message });
      logLine(message);
      return { ok: false, error: message };
    }

    sharedPage = await browser.newPage();
    await sharedPage.setExtraHTTPHeaders({
      'Accept-Language': marketplaceMeta.acceptLanguage,
    });

    {
      logLine(`正在设置 ${marketplaceMeta.label} 站配送地址。`);
      logLine(
        `邮编等待：首页 ${marketplaceZipSettings.zipHomeWaitSec}s -> 弹层 ${marketplaceZipSettings.zipModalWaitSec}s`,
      );
      const { ensureAmazonDelivery } = await import('./crawler/amazonContext');
      const zipOk = await ensureAmazonDelivery(sharedPage, marketplaceMeta, marketplaceZipSettings.zipCode, {
        homeWaitMs: marketplaceZipSettings.zipHomeWaitSec * 1_000,
        modalWaitMs: marketplaceZipSettings.zipModalWaitSec * 1_000,
      });
      if (!zipOk) {
        const message = `${marketplaceMeta.label}站邮编 ${marketplaceZipSettings.zipCode} 设置失败，已停止本次同步，避免写入不可靠数据。`;
        sendProgress({ type: 'error', message });
        logLine(message);
        await sharedPage?.close().catch(() => {});
        await browser?.close().catch(() => {});
        return { ok: false, error: message };
      }
      logLine(`邮编已设置为 ${marketplaceZipSettings.zipCode}，本轮分组会复用同一个浏览器会话。`);
    }

    let hadFailure = false;

    try {
      for (let groupIndex = 0; groupIndex < groupsToRun.length; groupIndex++) {
        const group = groupsToRun[groupIndex];
        const excelPath = buildExcelPathForGroup(group.name, new Date(), marketplace);
        sendProgress({
          type: 'group-start',
          groupId: group.id,
          message: `[${groupIndex + 1}/${groupsToRun.length}] ${group.name}`,
        });
        logLine(`----- 分组《${group.name}》开始 -----`);

        const results: AsinSnapshot[] = [];

        for (const asin of group.asins) {
          sendProgress({ type: 'asin-start', asin, groupId: group.id });
          logLine(`[${group.name}] 开始抓取 ${asin}`);

          const scrapeOnce = () =>
            marketplace === 'us'
              ? scrapeAsinOnPage(sharedPage!, asin, { marketplace })
              : withBrowser(browser!, (page) => scrapeAsinOnPage(page, asin, { marketplace }), marketplace);

          let snapshot = await scrapeOnce();
          let attempt = 1;
          const maxAttempts = 3;

          while (!snapshot.ok && attempt < maxAttempts) {
            logLine(`${asin} 第 ${attempt} 次失败：${snapshot.error || 'unknown'}，3 秒后重试`);
            await sleep(3_000);
            snapshot = await scrapeOnce();
            attempt++;
          }

          if (!snapshot.ok) {
            hadFailure = true;
            if (snapshot.priceDebug) {
              logLine(`[${group.name}] ${asin} 价格诊断：${snapshot.priceDebug}`);
            }
            await saveFailureArtifacts(browser!, sharedPage, group.name, asin, marketplace, snapshot.priceDebug);
          }

          results.push(snapshot);
          sendProgress({ type: 'asin-done', asin, groupId: group.id, payload: snapshot });
          logLine(`[${group.name}] ${asin} ${snapshot.ok ? '完成' : '失败'} ${snapshot.error || ''}`);
        }

        try {
          await appendSnapshots(
            excelPath,
            group.asins,
            results.map((snapshot) => ({
              ...snapshot,
              other: buildOtherForSheet(snapshot),
            })),
          );
          logLine(`已写入 Excel：${excelPath}`);
        } catch (error) {
          hadFailure = true;
          const message = error instanceof Error ? error.message : String(error);
          sendProgress({ type: 'error', message: `分组《${group.name}》写入 Excel 失败：${message}` });
          logLine(message);
        }

        sendProgress({ type: 'group-done', groupId: group.id, message: group.name });
        logLine(`----- 分组《${group.name}》结束 -----`);
      }
    } finally {
      await sharedPage?.close().catch(() => {});
      await browser?.close().catch(() => {});
    }

    sendProgress({
      type: 'done',
      message: hadFailure
        ? `${new Date().toISOString()}（部分 ASIN 失败，详见日志和截图）`
        : new Date().toISOString(),
    });
    return { ok: true };
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
