import type { Page } from 'playwright';

/** 商品页品牌（常与「Visit the xxx Store」一致） */
export async function extractBrand(page: Page): Promise<string> {
  return page.evaluate(() => {
    const link = document.querySelector('#bylineInfo a, a#bylineInfo');
    if (link?.textContent) return link.textContent.replace(/\s+/g, ' ').trim();
    const byline = document.querySelector('#bylineInfo');
    const raw = byline?.textContent || '';
    const m = raw.match(/Visit\s+the\s+(.+?)\s+Store/i);
    if (m) return m[1].trim();
    return '';
  });
}
