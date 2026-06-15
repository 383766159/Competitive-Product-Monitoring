import type { Page } from 'playwright';

export function normalizeBrandByline(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const patterns = [
    /^Visit\s+the\s+(.+?)\s+Store$/i,
    /^Besuche\s+(?:den|die|das)\s+(.+?)(?:-|\s+)Store$/i,
    /^Visiter\s+la\s+boutique\s+(.+)$/i,
    /^Visitez\s+la\s+boutique\s+(.+)$/i,
    /^Visita\s+(?:lo|il|la)\s+Store\s+di\s+(.+)$/i,
    /^Visita\s+(?:lo|il|la)\s+Store\s+(.+)$/i,
    /^Visita\s+la\s+tienda\s+de\s+(.+)$/i,
    /^Visita\s+la\s+tienda\s+(.+)$/i,
    /^Marke\s*:\s*(.+)$/i,
    /^Marque\s*:\s*(.+)$/i,
    /^Marca\s*:\s*(.+)$/i,
    /^Brand\s*:\s*(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return text;
}

export async function extractBrand(page: Page): Promise<string> {
  return page.evaluate((normalizeSource) => {
    const normalizeBrand = new Function(`return ${normalizeSource}`)() as (value: string) => string;
    const link = document.querySelector('#bylineInfo a, a#bylineInfo');
    if (link?.textContent) return normalizeBrand(link.textContent);

    const byline = document.querySelector('#bylineInfo');
    return normalizeBrand(byline?.textContent || '');
  }, normalizeBrandByline.toString());
}
