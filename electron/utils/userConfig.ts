import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_ASINS,
  getAmazonMarketplaceMeta,
  normalizeMarketplace,
  type AmazonMarketplace,
} from '../crawler/constants';
import { getAppRootDir, getDataDir } from './paths';

export interface AsinGroup {
  id: string;
  name: string;
  asins: string[];
}

export interface UserConfig {
  headless: boolean;
  marketplace: AmazonMarketplace;
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
  locale: 'en-US';
  activeGroupId: string;
  groups: AsinGroup[];
}

const CONFIG_FILENAME = 'config.json';
export const DEFAULT_ZIP_CODE = '10001';
export const DEFAULT_ZIP_HOME_WAIT_SEC = 10;
export const DEFAULT_ZIP_MODAL_WAIT_SEC = 10;
const ZIP_WAIT_SEC_MIN = 0;
const ZIP_WAIT_SEC_MAX = 120;

export function clampZipWaitSec(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(ZIP_WAIT_SEC_MAX, Math.max(ZIP_WAIT_SEC_MIN, Math.round(next)));
}

function sanitizeFilePart(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .slice(0, 40);
}

export function buildExcelPathForGroup(
  groupName: string,
  date = new Date(),
  marketplace: AmazonMarketplace = 'us',
): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const safe = sanitizeFilePart(groupName) || '未命名分组';
  const dateStr = `${y}-${m}-${d}`;
  const siteSuffix = getAmazonMarketplaceMeta(marketplace).fileSuffix;
  return path.join(getDataDir(), `${safe}${siteSuffix}${dateStr}竞品追踪.xlsx`);
}

function createGroup(name: string, asins: string[]): AsinGroup {
  return { id: randomUUID(), name, asins: [...asins] };
}

export function getDefaultUserConfig(): UserConfig {
  const defaultGroup = createGroup('默认分组', [...DEFAULT_ASINS]);
  return {
    headless: true,
    marketplace: 'us',
    zipCode: DEFAULT_ZIP_CODE,
    zipHomeWaitSec: DEFAULT_ZIP_HOME_WAIT_SEC,
    zipModalWaitSec: DEFAULT_ZIP_MODAL_WAIT_SEC,
    locale: 'en-US',
    activeGroupId: defaultGroup.id,
    groups: [defaultGroup],
  };
}

export function normalizeAsinToken(raw: string): string | null {
  const urlMatch = raw.match(/(?:\/(?:dp|gp\/product)\/|[?&]asin=)([A-Z0-9]{10})(?:[^A-Z0-9]|$)/i);
  const asin = (urlMatch?.[1] ?? raw).trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(asin)) return null;
  return asin;
}

export function parseAsinLines(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (value: string) => {
    const asin = normalizeAsinToken(value);
    if (asin && !seen.has(asin)) {
      seen.add(asin);
      out.push(asin);
    }
  };

  const urlRe = /(?:\/(?:dp|gp\/product)\/|[?&]asin=)([A-Z0-9]{10})(?:[^A-Z0-9]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text)) !== null) push(match[1]);

  for (const part of text.split(/[\s,，、\n\r]+/).filter(Boolean)) {
    push(part);
  }

  return out;
}

export function getActiveGroup(cfg: UserConfig): AsinGroup | undefined {
  return cfg.groups.find((group) => group.id === cfg.activeGroupId) ?? cfg.groups[0];
}

export function resolveExcelPath(cfg: UserConfig): string {
  return buildExcelPathForGroup(getActiveGroup(cfg)?.name ?? '未命名分组', new Date(), cfg.marketplace);
}

function migrateLegacy(raw: Record<string, unknown>, base: UserConfig): UserConfig {
  const next = { ...base };

  if (Array.isArray(raw.groups) && raw.groups.length > 0) {
    next.groups = (raw.groups as AsinGroup[]).map((group) => ({
      id: String(group.id || randomUUID()),
      name: String(group.name || '未命名分组'),
      asins: parseAsinLines(Array.isArray(group.asins) ? group.asins.join('\n') : ''),
    }));
  } else if (Array.isArray(raw.asins) && raw.asins.length > 0) {
    const group = createGroup('默认分组', parseAsinLines(raw.asins.join('\n')));
    next.groups = [group];
    next.activeGroupId = group.id;
  }

  if (typeof raw.activeGroupId === 'string') {
    next.activeGroupId = raw.activeGroupId;
  }
  if (!next.groups.some((group) => group.id === next.activeGroupId)) {
    next.activeGroupId = next.groups[0]?.id ?? next.activeGroupId;
  }
  if (typeof raw.headless === 'boolean') next.headless = raw.headless;

  next.marketplace = normalizeMarketplace(raw.marketplace);
  if (typeof raw.zipCode === 'string' && /^\d{5}$/.test(raw.zipCode.trim())) {
    next.zipCode = raw.zipCode.trim();
  }
  next.zipHomeWaitSec = clampZipWaitSec(raw.zipHomeWaitSec, next.zipHomeWaitSec);
  next.zipModalWaitSec = clampZipWaitSec(raw.zipModalWaitSec, next.zipModalWaitSec);
  return next;
}

export function loadUserConfig(): UserConfig {
  const configPath = path.join(getAppRootDir(), CONFIG_FILENAME);
  const fallback = getDefaultUserConfig();
  if (!fs.existsSync(configPath)) return fallback;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    return migrateLegacy(raw, fallback);
  } catch {
    return fallback;
  }
}

export type SaveConfigResult = { ok: true } | { ok: false; error: string };

export function saveUserConfig(cfg: UserConfig): SaveConfigResult {
  if (!cfg.groups?.length) {
    return { ok: false, error: '请至少保留一个 ASIN 分组。' };
  }

  const groups: AsinGroup[] = [];
  for (const group of cfg.groups) {
    const asins = parseAsinLines(
      Array.isArray(group.asins) ? group.asins.join('\n') : String(group.asins ?? ''),
    );
    groups.push({
      id: group.id || randomUUID(),
      name: String(group.name ?? '').trim() || '未命名分组',
      asins,
    });
  }

  if (!groups.some((group) => group.asins.length > 0)) {
    return { ok: false, error: '至少要有一个分组包含有效 ASIN。' };
  }

  const activeGroupId = groups.some((group) => group.id === cfg.activeGroupId)
    ? cfg.activeGroupId
    : groups[0].id;

  const normalized: UserConfig = {
    headless: cfg.headless !== false,
    marketplace: normalizeMarketplace(cfg.marketplace),
    zipCode: /^\d{5}$/.test(String(cfg.zipCode ?? '').trim())
      ? String(cfg.zipCode).trim()
      : DEFAULT_ZIP_CODE,
    zipHomeWaitSec: clampZipWaitSec(cfg.zipHomeWaitSec, DEFAULT_ZIP_HOME_WAIT_SEC),
    zipModalWaitSec: clampZipWaitSec(cfg.zipModalWaitSec, DEFAULT_ZIP_MODAL_WAIT_SEC),
    locale: 'en-US',
    activeGroupId,
    groups,
  };

  const configPath = path.join(getAppRootDir(), CONFIG_FILENAME);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(normalized, null, 2), 'utf8');
  return { ok: true };
}

export function getConfigFilePath(): string {
  return path.join(getAppRootDir(), CONFIG_FILENAME);
}
