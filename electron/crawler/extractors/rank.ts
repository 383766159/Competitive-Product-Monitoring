import type { Page } from 'playwright';

/**
 * 大类 / 小类 BSR：优先从「Best Sellers Rank」区块解析两行排名；
 * 格式 `#50989#83`（前者多大类，后者小类；与手工表一致无斜杠）。
 */
export async function extractRank(page: Page): Promise<string> {
  return page.evaluate(() => {
    const normalizeRank = (n: string) => '#' + n.replace(/[,.]/g, '');

    /** 在指定容器内按出现顺序收集 #数字 */
    const parseRanksFromText = (text: string): string[] => {
      const out: string[] = [];
      const re = /(?:#|Nr\.?|n[º°.]?)\s*([\d,.]+)\s+(?:in|en|dans)\s+/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const num = normalizeRank(m[1]);
        if (!out.includes(num)) out.push(num);
      }
      return out;
    };

    /** 定位包含 Best Sellers Rank 的整块文案（避免扫到页面其它 #xxx） */
    const rankRoots: Element[] = [];
    const candidates = document.querySelectorAll(
      '#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li, #prodDetails li, #productDetails_detailBullets_sections1 li',
    );
    for (const li of candidates) {
      const t = li.textContent || '';
      if (/best\s+sellers\s+rank/i.test(t) || /amazon\s+best\s+sellers\s+rank/i.test(t)) {
        rankRoots.push(li);
      }
    }

    if (rankRoots.length > 0) {
      const ranks = parseRanksFromText(rankRoots.map((el) => el.textContent || '').join('\n'));
      if (ranks.length >= 2) return `${ranks[0]}${ranks[1]}`;
      if (ranks.length === 1) return ranks[0];
    }

    const salesRank = document.querySelector('#SalesRank');
    if (salesRank) {
      const ranks = parseRanksFromText(salesRank.textContent || '');
      if (ranks.length >= 2) return `${ranks[0]}${ranks[1]}`;
      if (ranks.length === 1) return ranks[0];
    }

    const bullets = document.querySelector('#detailBullets_feature_div, #prodDetails');
    if (bullets) {
      const ranks = parseRanksFromText(bullets.textContent || '');
      if (ranks.length >= 2) return `${ranks[0]}${ranks[1]}`;
      if (ranks.length === 1) return ranks[0];
    }

    return '';
  });
}
