import type { Page } from 'playwright';

/**
 * 统计变体总数：优先解析页面内嵌的 dimensionToAsinMap。
 */
export async function extractVariationCount(page: Page): Promise<string> {
  const html = await page.content();
  const fromMap = parseDimensionMapCount(html);
  if (fromMap > 0) return String(fromMap);

  const domCount = await page.evaluate(() => {
    const twister = document.querySelector('#twister, #variation_twister');
    if (!twister) return 0;
    const imgs = twister.querySelectorAll('li[data-defaultasin], li[data-asin]');
    if (imgs.length > 0) return imgs.length;
    const opts = twister.querySelectorAll('option[value]:not([value=""])');
    if (opts.length > 0) return opts.length;
    return twister.querySelectorAll('li').length;
  });
  return domCount > 0 ? String(domCount) : '';
}

function parseDimensionMapCount(html: string): number {
  const idx = html.indexOf('dimensionToAsinMap');
  if (idx === -1) return 0;
  const slice = html.slice(idx, idx + 80000);
  const braceStart = slice.indexOf('{');
  if (braceStart === -1) return 0;
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < slice.length; i++) {
    const c = slice[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return 0;
  const jsonStr = slice.slice(braceStart, end);
  try {
    const obj = JSON.parse(jsonStr) as Record<string, string>;
    const keys = Object.keys(obj).filter((k) => obj[k] && /^B0[A-Z0-9]{8}$/i.test(obj[k]));
    const uniq = new Set(keys.map((k) => obj[k]));
    return uniq.size;
  } catch {
    return 0;
  }
}
