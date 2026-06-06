import type { Browser, Page } from 'playwright';
import {
  getAmazonDpBase,
  getAmazonMarketplaceMeta,
  type AmazonMarketplace,
} from './constants';
import type { AsinSnapshot } from './types';
import {
  collectPriceDebugSummary,
  extractPagePrice,
  extractStrikePrice,
} from './extractors/prices';
import { extractPromotions } from './extractors/promotions';
import { extractRating, extractReviewCount } from './extractors/rating';
import { extractRank } from './extractors/rank';
import { extractVariationCount } from './extractors/variations';
import { extractInventory } from './extractors/inventory';
import { extractBuyBoxSeller } from './extractors/seller';
import { extractBrand } from './extractors/brand';
import { extractAmazonChoicePresent, extractTierDiscount } from './extractors/acAndTier';

export interface ScrapeOptions {
  headless?: boolean;
  timeoutMs?: number;
  marketplace?: AmazonMarketplace;
}

function composeOtherLine(hasAc: boolean, tier: string): string {
  const parts: string[] = [];
  if (hasAc) parts.push('AC');
  const normalizedTier = tier.trim();
  if (normalizedTier && normalizedTier !== '/') parts.push(`阶梯:${normalizedTier}`);
  return parts.join('；');
}

const defaultSnap = (asin: string, err?: string): AsinSnapshot => ({
  asin,
  brand: '',
  strikePrice: '',
  pagePrice: '',
  promotions: '/',
  rating: '',
  reviewCount: '',
  rank: '',
  variationCount: '',
  inventory: '/',
  buyBoxSeller: '',
  other: '',
  ok: false,
  error: err,
});

async function inspectPageState(page: Page): Promise<{ hasCaptcha: boolean; isUnavailable: boolean }> {
  return page.evaluate(() => {
    const text = (document.body.innerText || '').replace(/\s+/g, ' ');
    return {
      hasCaptcha:
        !!document.querySelector('#captchacharacters') ||
        /enter the characters you see below|type the characters you see in this image/i.test(text),
      isUnavailable:
        /currently unavailable|we couldn't find that page|dogs of amazon|sorry! we just need to make sure/i.test(
          text,
        ),
    };
  });
}

export async function scrapeAsinOnPage(
  page: Page,
  asin: string,
  opts: ScrapeOptions = {},
): Promise<AsinSnapshot> {
  const timeout = opts.timeoutMs ?? 45_000;
  const url = `${getAmazonDpBase(opts.marketplace)}${asin}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await page.waitForTimeout(1_000);

    try {
      await page.waitForSelector('#productTitle, #title', { timeout: 12_000 });
    } catch {
      /* 标题缺失时继续尝试抓取。 */
    }

    await page
      .waitForSelector(
        '#corePrice_feature_div, #corePriceDisplay_desktop_feature_div, .a-price, meta[itemprop="price"], #apex_desktop, #apex_offerDisplay_desktop',
        { timeout: 15_000 },
      )
      .catch(() => {});
    await page.waitForTimeout(600);

    const [
      brand,
      strikePrice,
      pagePrice,
      promotions,
      rating,
      reviewCount,
      rank,
      variationCount,
      inventory,
      buyBoxSeller,
      hasAc,
      tierDiscount,
    ] = await Promise.all([
      extractBrand(page),
      extractStrikePrice(page),
      extractPagePrice(page),
      extractPromotions(page),
      extractRating(page),
      extractReviewCount(page),
      extractRank(page),
      extractVariationCount(page),
      extractInventory(page),
      extractBuyBoxSeller(page),
      extractAmazonChoicePresent(page),
      extractTierDiscount(page),
    ]);

    const other = composeOtherLine(hasAc, tierDiscount) || '/';
    const state = await inspectPageState(page);
    const error = state.hasCaptcha
      ? '命中 Amazon 验证码'
      : state.isUnavailable
        ? '页面不可用或已下架'
        : !pagePrice.trim()
          ? '页面价格为空'
          : undefined;

    return {
      asin,
      brand,
      strikePrice,
      pagePrice,
      promotions: promotions || '/',
      rating,
      reviewCount,
      rank,
      variationCount,
      inventory,
      buyBoxSeller,
      other,
      ok: !error,
      error,
      priceDebug: error ? await collectPriceDebugSummary(page).catch(() => '') : undefined,
    };
  } catch (error) {
    return {
      ...defaultSnap(asin, error instanceof Error ? error.message : String(error)),
      ok: false,
    };
  }
}

export async function withBrowser<T>(
  browser: Browser,
  fn: (page: Page) => Promise<T>,
  marketplace: AmazonMarketplace = 'us',
): Promise<T> {
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({
      'Accept-Language': getAmazonMarketplaceMeta(marketplace).acceptLanguage,
    });
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

export async function createSharedScrapePage(
  browser: Browser,
  marketplace: AmazonMarketplace = 'us',
): Promise<Page> {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': getAmazonMarketplaceMeta(marketplace).acceptLanguage,
  });
  return page;
}
