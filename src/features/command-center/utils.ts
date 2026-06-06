import type { AsinGroup, UserConfig } from './model';
import { getRunnableGroups } from './selectors';

const MARKETPLACE_LABEL: Record<UserConfig['marketplace'], string> = {
  us: '美区',
  de: '德国',
  fr: '法国',
  it: '意大利',
  es: '西班牙',
};

export function parseAsinText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const candidateRe =
    /(?:\/(?:dp|gp\/product)\/|[?&]asin=)([A-Z0-9]{10})(?:[^A-Z0-9]|$)|\b([A-Z0-9]{10})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = candidateRe.exec(text)) !== null) {
    const asin = (match[1] ?? match[2] ?? '').toUpperCase();
    if (!seen.has(asin)) {
      seen.add(asin);
      out.push(asin);
    }
  }

  return out;
}

export function getSyncBlockReason(
  config: UserConfig | null,
  selectedIds: Set<string>,
  busy: boolean,
): string | null {
  if (busy) return null;
  if (!config) return '配置加载中';

  const runnable = getRunnableGroups(config, selectedIds);
  if (runnable.length === 0) return '当前没有可执行分组';

  return null;
}

export function buildCommandSummary(
  config: UserConfig,
  runnableGroups: AsinGroup[],
  busy: boolean,
): { title: string; detail: string; actionLabel: string } {
  if (busy) {
    return {
      title: `正在同步 ${runnableGroups.length} 个分组`,
      detail: '任务正在执行中，可在运行轨迹查看最新进展。',
      actionLabel: '同步进行中',
    };
  }

  return {
    title: `已准备同步 ${runnableGroups.length} 个分组`,
    detail: `${MARKETPLACE_LABEL[config.marketplace]}站点，${config.headless ? '无头' : '有头'}模式，可直接开始同步任务。`,
    actionLabel: '开始同步任务',
  };
}
