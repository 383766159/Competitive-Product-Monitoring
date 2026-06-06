import type { Page } from 'playwright';

/**
 * 活动识别：
 * 1. Prime 专享价 -> `专享：$xx`
 * 2. Limited time deal + 进度条 -> `LD：$xx`
 * 3. 仅有 Limited time deal -> `BD：$xx`
 * 4. Coupon -> `Coupon：xx%` 或 `Coupon：$xx`
 */
export async function extractPromotions(page: Page): Promise<string> {
  return page.evaluate(() => {
    const moneyPattern =
      /(?:[$€£]\s*\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?\s*[€£$])/;

    const pricePick = (el: Element | null): string => {
      const text = el?.textContent || '';
      const match = text.match(moneyPattern);
      return match ? match[0].replace(/\u00a0/g, ' ').replace(/\s+/g, '') : '';
    };

    const pickPagePrice = (): string => {
      const ax = document.querySelector('#apex-pricetopay-accessibility-label');
      if (ax?.textContent) {
        const match = ax.textContent.match(moneyPattern);
        if (match) return match[0].replace(/\u00a0/g, ' ').replace(/\s+/g, '');
      }

      const apex = document.querySelector('.apex-pricetopay-value [aria-hidden="true"]');
      if (apex?.textContent) {
        const match = apex.textContent.replace(/\s+/g, '').match(moneyPattern);
        if (match) return match[0].replace(/\u00a0/g, ' ').replace(/\s+/g, '');
      }

      const core = document.querySelector('#corePriceDisplay_desktop_feature_div, #corePrice_feature_div');
      const off = core?.querySelector(
        '.reinventPricePriceToPayMargin .a-offscreen, .apex-pricetopay-value .a-offscreen, .a-price .a-offscreen',
      );
      return pricePick(off ?? null) || pricePick(document.querySelector('#priceblock_dealprice'));
    };

    const hasPrimeMemberPrice = (): boolean => {
      const blocks = document.querySelectorAll('div.a-section.a-spacing-none.a-padding-none.a-size-small');
      for (const block of blocks) {
        const bold = block.querySelector('span.a-size-base.a-text-bold');
        const text = (bold?.textContent || '').replace(/\s+/g, ' ').trim();
        if (/prime\s+member\s+price/i.test(text)) return true;
      }

      const buybox = document.querySelector('#desktop_buybox, #buybox');
      if (buybox) {
        for (const node of buybox.querySelectorAll('span.a-size-base.a-text-bold, .a-text-bold')) {
          if (/prime\s+member\s+price/i.test(node.textContent || '')) return true;
        }
      }

      const priceCol = document.querySelector(
        '#corePriceDisplay_desktop_feature_div, #corePrice_feature_div, #centerCol',
      );
      return !!priceCol && /exclusive\s+prime\s+price/i.test(priceCol.textContent || '');
    };

    const hasLimitedTimeDealInDealAreas = (): boolean => {
      const scopes = [
        document.querySelector('#dealBadge_feature_div'),
        document.querySelector('#corePriceDisplay_desktop_feature_div'),
        document.querySelector('#desktop_buybox'),
        document.querySelector('#dealsAccordionRow'),
      ];
      return scopes.some((scope) => !!scope && /limited\s+time\s+deal/i.test(scope.textContent || ''));
    };

    const findLimitedTimeDealElement = (): Element | null => {
      const roots = document.querySelectorAll(
        '#dealBadge_feature_div *, #corePriceDisplay_desktop_feature_div *, #desktop_buybox *',
      );
      for (const node of roots) {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (/limited\s+time\s+deal/i.test(text) && text.length <= 90) return node;
      }
      return null;
    };

    const hasLightningStyleProgress = (anchor: Element | null): boolean => {
      const scopes: Element[] = [];
      const push = (el: Element | null) => {
        if (el && !scopes.includes(el)) scopes.push(el);
      };

      push(document.querySelector('#dealBadge_feature_div'));
      push(document.querySelector('#corePriceDisplay_desktop_feature_div'));
      push(document.querySelector('#dealsAccordionRow'));
      push(document.querySelector('#lightningDealsAccordion'));

      let current: Element | null = anchor;
      for (let i = 0; i < 6 && current; i++) {
        push(current);
        current = current.parentElement;
      }

      for (const scope of scopes) {
        for (const bar of scope.querySelectorAll('[role="progressbar"][aria-valuemax], .a-meter .a-meter-bar, meter')) {
          if (bar.closest('.a-icon-row, #averageCustomerReviews')) continue;
          if (bar.getAttribute('role') === 'progressbar') {
            const max = Number.parseFloat(bar.getAttribute('aria-valuemax') || '0');
            if (max > 0) return true;
          }
          const rect = (bar as HTMLElement).getBoundingClientRect?.();
          if (rect && rect.width >= 28 && rect.height >= 3 && bar.classList.contains('a-meter-bar')) {
            return true;
          }
        }
      }
      return false;
    };

    const parts: string[] = [];
    const mainPrice = pickPagePrice();

    if (hasPrimeMemberPrice()) {
      parts.push(`专享：${mainPrice || '/'}`);
    } else if (hasLimitedTimeDealInDealAreas()) {
      const anchor = findLimitedTimeDealElement();
      parts.push(`${hasLightningStyleProgress(anchor) ? 'LD' : 'BD'}：${mainPrice || '/'}`);
    }

    const bodyText = document.body.innerText || '';
    const couponEl =
      document.querySelector('#promoPriceBlockMessage, #couponText, .couponLabelText, [data-coupon-id]') ||
      Array.from(document.querySelectorAll('label, span')).find((el) => {
        const text = el.textContent || '';
        return text.length < 120 && /coupon|clip/i.test(text);
      });

    if (couponEl || (/coupon/i.test(bodyText) && /clip|apply/i.test(bodyText))) {
      const raw = (couponEl?.textContent || bodyText).slice(0, 500);
      const pct = raw.match(/(\d+)\s*%/);
      const amount = raw.match(moneyPattern);
      if (pct) parts.push(`Coupon：${pct[1]}%`);
      else if (amount) parts.push(`Coupon：${amount[0].replace(/\u00a0/g, ' ').replace(/\s+/g, '')}`);
      else parts.push('Coupon');
    }

    const uniq = [...new Set(parts)];
    return uniq.length === 0 ? '/' : uniq.join('\n');
  });
}
