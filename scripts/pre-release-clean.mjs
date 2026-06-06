/**
 * 打包前释放 release/dist 下 win-unpacked（避免 app.asar 被占用）。
 * Windows：结束本应用 exe 与 electron.exe，重试删除目录。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const productName = pkg.build?.productName ?? pkg.name;
const exeName = `${productName}.exe`;

const dirs = [
  path.join(root, 'release', 'win-unpacked'),
  path.join(root, 'dist', 'win-unpacked'),
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function killLockingProcesses() {
  if (process.platform !== 'win32') return;
  for (const im of [exeName, 'electron.exe']) {
    try {
      execSync(`taskkill /F /IM ${im} /T`, { stdio: 'ignore', windowsHide: true });
      console.log(`[pre-release-clean] 已尝试结束 ${im}`);
    } catch {
      /* 进程不存在 */
    }
  }
}

async function removeDir(dir, attempts = 5) {
  if (!fs.existsSync(dir)) return true;
  const rel = path.relative(root, dir);
  for (let i = 1; i <= attempts; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
      if (!fs.existsSync(dir)) {
        console.log(`[pre-release-clean] 已删除 ${rel}`);
        return true;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[pre-release-clean] 删除 ${rel} 失败 (${i}/${attempts}): ${msg}`);
      killLockingProcesses();
      await sleep(1500);
    }
  }
  return !fs.existsSync(dir);
}

async function main() {
  console.log('[pre-release-clean] 打包前清理：请先关闭正在运行的绿色版程序');
  killLockingProcesses();
  await sleep(800);
  killLockingProcesses();

  let ok = true;
  for (const dir of dirs) {
    if (!(await removeDir(dir))) ok = false;
  }

  if (!ok) {
    console.error(
      '\n[pre-release-clean] 目录仍被占用，无法打包。请手动：\n' +
        `  1. 任务管理器结束「${exeName}」和 Electron\n` +
        '  2. 关闭资源管理器中打开的 release 文件夹\n' +
        '  3. 暂停可能扫描该目录的杀毒软件\n' +
        '  4. 再执行 npm run release\n',
    );
    process.exit(1);
  }
}

main();
