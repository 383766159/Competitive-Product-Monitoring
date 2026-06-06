import type { Page } from 'playwright';

const MONEY_PATTERN =
  /(?:[$\u20ac\u00a3]\s*\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?\s*[$\u20ac\u00a3])/g;

function currencyFromCode(code: string): string {
  if (code === 'EUR') return '\u20ac';
  if (code === 'GBP') return '\u00a3';
  return '$';
}

export async function extractPagePrice(page: Page): Promise<string> {
  return page.evaluate((moneyPatternSource) => {
    const moneyPattern = new RegExp(moneyPatternSource, 'g');

    const normalizeToken = (value: string): string => {
      return value
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/([$€£])\s+/g, '$1')
        .replace(/\s+([$€£])/g, '$1')
        .trim();
    };

    const parseAmount = (token: string): number | null => {
      const raw = (token.match(/[\d.,\s]+/)?.[0] || '').replace(/\s/g, '');
      if (!raw) return null;

      const lastComma = raw.lastIndexOf(',');
      const lastDot = raw.lastIndexOf('.');
      let normalized = raw;

      if (lastComma >= 0 && lastDot >= 0) {
        normalized =
          lastComma > lastDot
            ? raw.replace(/\./g, '').replace(',', '.')
            : raw.replace(/,/g, '');
      } else if (lastComma >= 0) {
        const tailLen = raw.length - lastComma - 1;
        normalized =
          tailLen === 2 ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
      } else {
        normalized = raw.replace(/,/g, '');
      }

      const amount = Number.parseFloat(normalized);
      if (!Number.isFinite(amount) || amount <= 0 || amount >= 1_000_000) return null;
      return amount;
    };

    const pickMoney = (value: string): string => {
      const matches = value.match(moneyPattern) || [];
      for (const match of matches) {
        const token = normalizeToken(match);
        if (parseAmount(token) != null) return token;
      }
      return '';
    };

    const pickSplitMoneyText = (value: string): string => {
      const flat = value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (!flat) return '';

      const leading = /([$€£])\s*(\d{1,3}(?:[.,]\d{3})*)(?:\s+)(\d{2})(?!\d)/.exec(flat);
      if (leading) {
        const token = `${leading[1]}${leading[2]}.${leading[3]}`;
        if (parseAmount(token) != null) return token;
      }

      const trailing = /(\d{1,3}(?:[.,]\d{3})*)(?:\s+)(\d{2})(?!\d)\s*([$€£])/.exec(flat);
      if (trailing) {
        const token = `${trailing[1]}.${trailing[2]}${trailing[3]}`;
        if (parseAmount(token) != null) return token;
      }

      return '';
    };

    const readStructuredPrice = (root: ParentNode | null): string => {
      if (!root) return '';

      const whole = root.querySelector('.a-price-whole')?.textContent?.replace(/[^\d,.\s]/g, '').trim();
      const fraction = root.querySelector('.a-price-fraction')?.textContent?.replace(/[^\d]/g, '').trim();
      const symbol =
        root.querySelector('.a-price-symbol')?.textContent?.replace(/\s+/g, '').trim() ||
        (root.textContent?.includes('\u20ac')
          ? '\u20ac'
          : root.textContent?.includes('\u00a3')
            ? '\u00a3'
            : '$');

      if (whole) {
        const flatWhole = whole.replace(/\s+/g, '');
        const decimalSeparator = /,$/.test(flatWhole) ? ',' : '.';
        const integerPart = flatWhole.replace(/[.,]+$/g, '');
        const token = fraction
          ? `${symbol}${integerPart}${decimalSeparator}${fraction}`
          : `${symbol}${integerPart}`;
        if (parseAmount(token) != null) return normalizeToken(token);
      }

      return '';
    };

    const readPriceNode = (root: ParentNode | null): string => {
      if (!root) return '';

      const structured = readStructuredPrice(root);
      if (structured) return structured;

      for (const block of root.querySelectorAll('[aria-hidden="true"]')) {
        const blockStructured = readStructuredPrice(block);
        if (blockStructured) return blockStructured;

        const splitToken = pickSplitMoneyText(block.textContent || '');
        if (splitToken) return splitToken;

        const textToken = pickMoney(block.textContent || '');
        if (textToken) return textToken;
      }

      const offscreenNodes = root.querySelectorAll('.a-offscreen');
      for (const node of offscreenNodes) {
        const splitToken = pickSplitMoneyText(node.textContent || '');
        if (splitToken) return splitToken;

        const token = pickMoney(node.textContent || '');
        if (token) return token;
      }

      const rootSplit = pickSplitMoneyText(root.textContent || '');
      if (rootSplit) return rootSplit;

      return pickMoney(root.textContent || '');
    };

    const preferSelectors = [
      '#apex_desktop .apex-pricetopay-value',
      '#corePriceDisplay_desktop_feature_div .priceToPay',
      '#corePrice_feature_div .priceToPay',
      '#corePriceDisplay_desktop_feature_div .apexPriceToPay',
      '#corePrice_feature_div .apexPriceToPay',
      '#corePriceDisplay_desktop_feature_div .reinventPricePriceToPayMargin',
      '#corePrice_feature_div .reinventPricePriceToPayMargin',
      '#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price)',
      '#corePrice_feature_div .a-price:not(.a-text-price)',
      '#corePrice_desktop .a-price:not(.a-text-price)',
      '#apex_desktop_display_price_primary_buybox .a-price:not(.a-text-price)',
      '#desktop_buybox .a-price:not(.a-text-price)',
      '#buybox .a-price:not(.a-text-price)',
      '#newAccordionRow_0 .a-price:not(.a-text-price)',
      '#tp_price_block_total_price_ww',
    ];

    for (const selector of preferSelectors) {
      for (const node of document.querySelectorAll(selector)) {
        if (node.closest('.a-text-price, .basisPrice, #basisPrice_feature_div, #listPrice_feature_div')) {
          continue;
        }
        const token = readPriceNode(node);
        if (token) return token;
      }
    }

    for (const selector of [
      '#apex-pricetopay-accessibility-label',
      '#corePriceDisplay_desktop_feature_div',
      '#corePrice_feature_div',
      '#apex_desktop',
      '#desktop_buybox',
      '#buybox',
      '#centerCol',
      '#ppd',
      '#dp',
    ]) {
      const token = readPriceNode(document.querySelector(selector));
      if (token) return token;
    }

    for (const selector of ['#priceblock_dealprice', '#priceblock_ourprice', '#priceblock_saleprice']) {
      const node = document.querySelector(selector);
      const structured = readStructuredPrice(node);
      if (structured) return structured;

      const splitToken = pickSplitMoneyText(node?.textContent || '');
      if (splitToken) return splitToken;

      const token = pickMoney(node?.textContent || '');
      if (token) return token;
    }

    const metaPrice = document.querySelector('meta[itemprop="price"]')?.getAttribute('content')?.trim();
    if (metaPrice) {
      const amount = Number.parseFloat(metaPrice);
      if (Number.isFinite(amount) && amount > 0) {
        const currencyCode =
          document.querySelector('meta[itemprop="priceCurrency"]')?.getAttribute('content') || 'USD';
        return `${currencyFromCode(currencyCode)}${amount.toFixed(2)}`;
      }
    }

    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const json = JSON.parse(script.textContent || '') as unknown;
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const offersRaw = (item as { offers?: unknown }).offers;
          const offers = Array.isArray(offersRaw) ? offersRaw : offersRaw ? [offersRaw] : [];
          for (const offer of offers) {
            if (!offer || typeof offer !== 'object') continue;
            const price = (offer as { price?: number | string }).price;
            const currencyCode = String((offer as { priceCurrency?: string }).priceCurrency || 'USD').toUpperCase();
            const amount = typeof price === 'number' ? price : Number.parseFloat(String(price ?? ''));
            if (Number.isFinite(amount) && amount > 0) {
              return `${currencyFromCode(currencyCode)}${amount.toFixed(2)}`;
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    const twister = document.querySelector(
      '#twister-plus-price-data-price, input[name="items[0.base][customerVisiblePrice][amount]"]',
    );
    if (twister) {
      const raw =
        (twister as HTMLInputElement).value || twister.getAttribute('value') || twister.textContent || '';
      const structured = pickSplitMoneyText(raw);
      if (structured) return structured;

      const token = pickMoney(
        raw.startsWith('$') || raw.startsWith('\u20ac') || raw.startsWith('\u00a3') ? raw : `$${raw}`,
      );
      if (token) return token;
    }

    for (const node of document.querySelectorAll('.a-price:not(.a-text-price)')) {
      if (node.closest('.a-text-price, .basisPrice, #basisPrice_feature_div, #listPrice_feature_div')) {
        continue;
      }
      const token = readPriceNode(node);
      if (token) return token;
    }

    return '';
  }, MONEY_PATTERN.source);
}

export async function collectPriceDebugSummary(page: Page): Promise<string> {
  const data = await page.evaluate((moneyPatternSource) => {
    const moneyPattern = new RegExp(moneyPatternSource, 'g');
    const selectors = [
      '#apex-pricetopay-accessibility-label',
      '#apex_desktop .apex-pricetopay-value',
      '#corePriceDisplay_desktop_feature_div .priceToPay',
      '#corePrice_feature_div .priceToPay',
      '#corePriceDisplay_desktop_feature_div .a-price',
      '#corePrice_feature_div .a-price',
      '#priceblock_dealprice',
      '#priceblock_ourprice',
      '#priceblock_saleprice',
      'meta[itemprop="price"]',
    ];

    const candidates = selectors
      .map((selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const text =
          selector.startsWith('meta[')
            ? node.getAttribute('content') || ''
            : (node.textContent || '').replace(/\s+/g, ' ').trim();
        return { selector, text: text.slice(0, 240) };
      })
      .filter(Boolean);

    const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ');
    const hints = (bodyText.match(moneyPattern) || []).slice(0, 8);

    return {
      title: document.title,
      url: window.location.href,
      hasCaptcha:
        !!document.querySelector('input#captchacharacters') ||
        /enter the characters you see below|type the characters you see in this image/i.test(bodyText),
      candidates,
      hints,
    };
  }, MONEY_PATTERN.source);

  return JSON.stringify(data, null, 2);
}

/** 划线价（List Price / Was / Typical price）。 */
export async function extractStrikePrice(page: Page): Promise<string> {
  return page.evaluate((moneyPatternSource) => {
    const pattern = new RegExp(moneyPatternSource);

    const pickMoney = (value: string): string => {
      const match = value.match(pattern);
      return match ? match[0].replace(/\u00a0/g, ' ').replace(/\s+/g, '').trim() : '';
    };

    const roots = [
      document.querySelector('.apex-basisprice-value'),
      document.querySelector('#basisPrice_feature_div'),
      document.querySelector('#listPrice_feature_div'),
      document.querySelector('.basisPrice'),
      document.querySelector('#corePriceDisplay_desktop_feature_div'),
      document.querySelector('#corePrice_feature_div'),
    ];

    for (const root of roots) {
      if (!root) continue;
      const offscreen = root.querySelector(
        '.apex-basisprice-value .a-offscreen, .a-text-price .a-offscreen, [data-a-strike="true"] .a-offscreen, .basisPrice .a-offscreen',
      );
      if (offscreen?.textContent) {
        const token = pickMoney(offscreen.textContent);
        if (token) return token;
      }

      const row = root.querySelector('.a-text-price, [data-a-strike="true"], .basisPrice');
      if (row?.textContent) {
        const token = pickMoney(row.textContent);
        if (token) return token;
      }
    }

    const body = document.body.innerText || '';
    const was =
      /(?:List\s*Price|Was|Typical\s*price|UVP|Prix conseillé|Precio recomendado|Prezzo consigliato)\s*:\s*((?:[$€£]\s*[\d.,]+|[\d.,]+\s*[$€£]))/i.exec(
        body,
      );
    if (was) return was[1].replace(/\s/g, '');

    const prices = document.querySelectorAll(
      '#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen, #corePrice_feature_div .a-text-price .a-offscreen',
    );
    for (const price of prices) {
      const token = pickMoney(price.textContent || '');
      if (token) return token;
    }

    return '';
  }, MONEY_PATTERN.source);
}
