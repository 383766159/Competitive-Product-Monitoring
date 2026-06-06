import type { Page } from 'playwright';

/**
 * 是否展示 Amazon's Choice。
 */
export async function extractAmazonChoicePresent(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const isAmazonChoiceLabel = (raw: string): boolean => {
      const text = raw.replace(/\s+/g, ' ').trim();
      if (!text || text.length > 120) return false;
      return /^amazon'?s\s+choice\b/i.test(text);
    };

    const roots = document.querySelectorAll(
      '#acBadge_feature_div, #ACBadge_feature_div, [data-feature-name="acBadge"]',
    );

    for (const root of roots) {
      const el = root as HTMLElement;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

      const text = el.innerText || '';
      if (!text.trim() || !isAmazonChoiceLabel(text)) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      return true;
    }

    return false;
  });
}

/**
 * 数量阶梯折扣摘要，例如 `买10件30%`、`结账14%`。
 */
export async function extractTierDiscount(page: Page): Promise<string> {
  return page.evaluate(() => {
    const chunks: string[] = [];
    const body = document.body.innerText || '';

    const pushUnique = (value: string) => {
      const text = value.replace(/\s+/g, ' ').trim();
      if (text && !chunks.includes(text)) chunks.push(text);
    };

    const checkoutSave = /save\s+(\d+)\s*%\s+at\s+checkout/i.exec(body);
    if (checkoutSave) pushUnique(`结账${checkoutSave[1]}%`);

    const reBuyFirst = /(?:buy|Buy)\s+(\d+)\s*(?:or more|\+|,)?\s*(?:items?|units?|pcs)?[^%\n]{0,80}?(\d+)\s*%/gi;
    let match: RegExpExecArray | null;
    while ((match = reBuyFirst.exec(body)) !== null) {
      pushUnique(`买${match[1]}件${match[2]}%`);
    }

    const reDiscountFirst = /(\d+)\s*%\s*(?:off|discount)[^\d\n]{0,60}?(?:buy|Buy)\s+(\d+)/gi;
    while ((match = reDiscountFirst.exec(body)) !== null) {
      pushUnique(`买${match[2]}件${match[1]}%`);
    }

    const reSaveAmount = /(?:save|Save)\s+\$\s*[\d.]+\s+when\s+you\s+buy\s+(\d+)/gi;
    while ((match = reSaveAmount.exec(body)) !== null) {
      pushUnique(`买${match[1]}件减额`);
    }

    for (const el of document.querySelectorAll(
      '#quantityPricingTable, #businessPricingBadge_feature_div, [data-csa-c-slot-id*="quantity"], .snsTieringPriceInfo',
    )) {
      const text = el.textContent || '';
      const scopedMatch = text.match(/(\d+)\s*(?:for|items?).{0,40}?(\d+)\s*%/i);
      if (scopedMatch) pushUnique(`买${scopedMatch[1]}件${scopedMatch[2]}%`);
    }

    return chunks.length === 0 ? '' : chunks.slice(0, 4).join('；');
  });
}
