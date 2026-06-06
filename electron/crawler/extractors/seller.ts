import type { Page } from 'playwright';

/**
 * Buy Box 内「Sold by」后的店铺名（如 olleticss）。
 * 优先 #sellerProfileTriggerId，且限定在 desktop Buy Box 区域内，避免命中页脚其它链接。
 */
export async function extractBuyBoxSeller(page: Page): Promise<string> {
  return page.evaluate(() => {
    const clean = (s: string) =>
      s
        .replace(/\s+/g, ' ')
        .replace(/^(sold\s+by|verkauf\s+durch|vendu\s+par|venduto\s+da|vendido\s+por)\s*:?\s*/i, '')
        .trim()
        .split(/\s{2,}/)[0]
        .trim();

    const buybox =
      document.querySelector('#desktop_buybox') ||
      document.querySelector('#buybox') ||
      document.querySelector('[data-feature-name="desktop_buybox"]') ||
      document.body;

    const scoped = buybox.querySelector('#sellerProfileTriggerId') as HTMLElement | null;
    if (scoped?.innerText) {
      const t = clean(scoped.innerText);
      if (t && !/^amazon\.com$/i.test(t)) return t;
    }

    const globalId = document.querySelector('#sellerProfileTriggerId') as HTMLElement | null;
    if (globalId?.innerText) {
      const t = clean(globalId.innerText);
      if (t) return t;
    }

    /** offer 区块：包含 “Sold by” 文案的同一行里找链接 */
    const rows = buybox.querySelectorAll('.offer-display-feature-text, .offer-display-feature-text-message, span, div');
    for (const el of rows) {
      const tx = el.textContent || '';
      if (!/(sold\s+by|verkauf\s+durch|vendu\s+par|venduto\s+da|vendido\s+por)/i.test(tx)) continue;
      const parent = el.closest('.offer-display-feature') || el.parentElement;
      const link =
        parent?.querySelector('a[href*="seller="], a#sellerProfileTriggerId, #sellerProfileTriggerId') ||
        el.parentElement?.querySelector('a');
      const hrefText = link?.textContent?.trim();
      if (hrefText && hrefText.length < 120) return clean(hrefText);
      const m = tx.match(/(?:sold\s+by|verkauf\s+durch|vendu\s+par|venduto\s+da|vendido\s+por)\s*[:\s]+([^\n\r]+?)(?:\s{2,}|Ships|Versand|Expédié|Spedizione|Enviado|$)/i);
      if (m) return clean(m[1]);
    }

    return '';
  });
}
