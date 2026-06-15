import type { Page } from 'playwright';

export function textHasAmazonRankLabel(value: string): boolean {
  const text = value.replace(/\s+/g, ' ').trim();
  return (
    /best\s+sellers\s+rank/i.test(text) ||
    /bestseller[\s-]*rang/i.test(text) ||
    /classement\s+des\s+meilleures\s+ventes/i.test(text) ||
    /classifica\s+bestseller/i.test(text) ||
    /clasificaci[oó]n\s+(?:en|de)\s+los\s+m[aá]s\s+vendidos/i.test(text)
  );
}

export function parseAmazonRanksFromText(value: string): string[] {
  const text = value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const ranks: string[] = [];
  const rankPattern =
    /(?:#|Nr\.?|n[°º.]?|N[°º.]?)\s*([\d][\d.,\s]*?)\s+(?=in\b|en\b|dans\b|em\b|nel\b|nella\b|nello\b|de\b)/giu;

  let match: RegExpExecArray | null;
  while ((match = rankPattern.exec(text)) !== null) {
    const digits = match[1].replace(/\D/g, '');
    if (!digits) continue;

    const rank = `#${digits}`;
    if (!ranks.includes(rank)) ranks.push(rank);
  }

  return ranks;
}

export async function extractRank(page: Page): Promise<string> {
  return page.evaluate(({ parseSource, labelSource }) => {
    const parseRanks = new Function(`return ${parseSource}`)() as (value: string) => string[];
    const hasRankLabel = new Function(`return ${labelSource}`)() as (value: string) => boolean;

    const formatRanks = (ranks: string[]): string => {
      if (ranks.length >= 2) return `${ranks[0]}${ranks[1]}`;
      return ranks[0] || '';
    };

    const rankRoots: Element[] = [];
    const candidates = document.querySelectorAll(
      '#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li, #prodDetails li, #productDetails_detailBullets_sections1 li, #productDetails_db_sections tr',
    );
    for (const node of candidates) {
      const text = node.textContent || '';
      if (hasRankLabel(text)) rankRoots.push(node);
    }

    if (rankRoots.length > 0) {
      const ranks = parseRanks(rankRoots.map((el) => el.textContent || '').join('\n'));
      const formatted = formatRanks(ranks);
      if (formatted) return formatted;
    }

    for (const selector of ['#SalesRank', '#detailBullets_feature_div', '#prodDetails']) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const text = node.textContent || '';
      if (!hasRankLabel(text) && selector !== '#SalesRank') continue;
      const formatted = formatRanks(parseRanks(text));
      if (formatted) return formatted;
    }

    return '';
  }, {
    parseSource: parseAmazonRanksFromText.toString(),
    labelSource: textHasAmazonRankLabel.toString(),
  });
}
