import type { Page } from 'playwright';

export function isPrimeMemberPriceText(value: string): boolean {
  return /prime\s+member\s+price|exclusive\s+prime\s+price|prime\s+exklusivpreis|prix\s+prime\s+exclusif|prezzo\s+esclusivo\s+prime|precio\s+exclusivo\s+prime/i.test(
    value.replace(/\s+/g, ' ').trim(),
  );
}

export function isLimitedTimeDealText(value: string): boolean {
  return /limited\s+time\s+deal|zeitlich\s+begrenztes\s+angebot|offre\s+[àa]\s+durée\s+limitée|offerta\s+a\s+tempo\s+limitato|oferta\s+por\s+tiempo\s+limitado/i.test(
    value.replace(/\s+/g, ' ').trim(),
  );
}

export function isCouponPromotionText(value: string): boolean {
  return /coupon|clip|gutschein|cupon|cupón|buono\s+sconto|appliquer|applica|aplicar|aktivieren/i.test(
    value.replace(/\s+/g, ' ').trim(),
  );
}

export async function extractPromotions(page: Page): Promise<string> {
  return page.evaluate(({ primeSource, dealSource, couponSource }) => {
    const isPrimeText = new Function(`return ${primeSource}`)() as (value: string) => boolean;
    const isDealText = new Function(`return ${dealSource}`)() as (value: string) => boolean;
    const isCouponText = new Function(`return ${couponSource}`)() as (value: string) => boolean;
    const moneyPattern =
      /(?:[$€£]\s*\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?\s*[$€£])/;

    const normalizeMoney = (value: string): string => value.replace(/\u00a0/g, ' ').replace(/\s+/g, '');

    const pricePick = (el: Element | null): string => {
      const match = (el?.textContent || '').match(moneyPattern);
      return match ? normalizeMoney(match[0]) : '';
    };

    const pickPagePrice = (): string => {
      const ax = document.querySelector('#apex-pricetopay-accessibility-label');
      const axMatch = ax?.textContent?.match(moneyPattern);
      if (axMatch) return normalizeMoney(axMatch[0]);

      const apex = document.querySelector('.apex-pricetopay-value [aria-hidden="true"]');
      const apexMatch = apex?.textContent?.replace(/\s+/g, '').match(moneyPattern);
      if (apexMatch) return normalizeMoney(apexMatch[0]);

      const core = document.querySelector('#corePriceDisplay_desktop_feature_div, #corePrice_feature_div');
      const off = core?.querySelector(
        '.reinventPricePriceToPayMargin .a-offscreen, .apex-pricetopay-value .a-offscreen, .a-price .a-offscreen',
      );
      return pricePick(off ?? null) || pricePick(document.querySelector('#priceblock_dealprice'));
    };

    const hasPrimeMemberPrice = (): boolean => {
      const scopes = [
        document.querySelector('#corePriceDisplay_desktop_feature_div'),
        document.querySelector('#corePrice_feature_div'),
        document.querySelector('#centerCol'),
        document.querySelector('#desktop_buybox'),
        document.querySelector('#buybox'),
      ];

      for (const scope of scopes) {
        if (scope && isPrimeText(scope.textContent || '')) return true;
      }

      return false;
    };

    const dealScopes = (): Element[] =>
      [
        document.querySelector('#dealBadge_feature_div'),
        document.querySelector('#corePriceDisplay_desktop_feature_div'),
        document.querySelector('#desktop_buybox'),
        document.querySelector('#dealsAccordionRow'),
      ].filter((scope): scope is Element => !!scope);

    const hasLimitedTimeDealInDealAreas = (): boolean =>
      dealScopes().some((scope) => isDealText(scope.textContent || ''));

    const findLimitedTimeDealElement = (): Element | null => {
      const roots = document.querySelectorAll(
        '#dealBadge_feature_div *, #corePriceDisplay_desktop_feature_div *, #desktop_buybox *',
      );
      for (const node of roots) {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (isDealText(text) && text.length <= 120) return node;
      }
      return null;
    };

    const hasLightningStyleProgress = (anchor: Element | null): boolean => {
      const scopes: Element[] = [...dealScopes()];
      let current: Element | null = anchor;
      for (let i = 0; i < 6 && current; i++) {
        if (!scopes.includes(current)) scopes.push(current);
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
          if (rect && rect.width >= 28 && rect.height >= 3 && bar.classList.contains('a-meter-bar')) return true;
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

    const directCouponEl =
      document.querySelector('#promoPriceBlockMessage, #couponText, .couponLabelText, [data-coupon-id]') ||
      null;
    const couponScopes = [
      document.querySelector('#corePriceDisplay_desktop_feature_div'),
      document.querySelector('#corePrice_feature_div'),
      document.querySelector('#promoPriceBlockMessage'),
      document.querySelector('#desktop_buybox'),
      document.querySelector('#buybox'),
      document.querySelector('#rightCol'),
      document.querySelector('#centerCol'),
    ].filter((scope): scope is Element => !!scope);
    const scopedCouponEl = couponScopes
      .flatMap((scope) => Array.from(scope.querySelectorAll('label, span, i, div')))
      .find((el) => {
        const text = el.textContent || '';
        return text.length < 140 && isCouponText(text);
      });
    const couponEl = directCouponEl || scopedCouponEl;

    if (couponEl) {
      const raw = (couponEl.textContent || '').slice(0, 500);
      const pct = raw.match(/(\d+)\s*%/);
      const amount = raw.match(moneyPattern);
      if (pct) parts.push(`Coupon：${pct[1]}%`);
      else if (amount) parts.push(`Coupon：${normalizeMoney(amount[0])}`);
      else parts.push('Coupon');
    }

    const uniq = [...new Set(parts)];
    return uniq.length === 0 ? '/' : uniq.join('\n');
  }, {
    primeSource: isPrimeMemberPriceText.toString(),
    dealSource: isLimitedTimeDealText.toString(),
    couponSource: isCouponPromotionText.toString(),
  });
}
