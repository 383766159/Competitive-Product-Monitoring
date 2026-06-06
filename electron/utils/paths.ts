import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

/** 可执行文件所在目录（便携版/安装版均为 exe 同级） */
export function getAppRootDir(): string {
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, '..');
}

export function getDataDir(): string {
  const dir = path.join(getAppRootDir(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getLogsDir(): string {
  const dir = path.join(getAppRootDir(), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getScreenshotsDir(): string {
  const dir = path.join(getLogsDir(), 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getExcelPath(): string {
  return path.join(getDataDir(), 'history.xlsx');
}
