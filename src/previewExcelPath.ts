type AmazonMarketplace = 'us' | 'de' | 'fr' | 'it' | 'es';

const MARKETPLACE_SUFFIX: Record<AmazonMarketplace, string> = {
  us: '',
  de: '德国',
  fr: '法国',
  it: '意大利',
  es: '西班牙',
};

/** 与主进程 buildExcelPathForGroup 的命名规则保持一致。 */
export function previewExcelPath(
  groupName: string,
  dataDir: string,
  marketplace: AmazonMarketplace = 'us',
): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${day}`;
  const safe =
    groupName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '').trim().slice(0, 40) ||
    '未命名分组';
  const sep = dataDir.includes('\\') ? '\\' : '/';
  return `${dataDir}${sep}${safe}${MARKETPLACE_SUFFIX[marketplace]}${dateStr}竞品追踪.xlsx`;
}
