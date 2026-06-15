import type { Page } from 'playwright';

export function normalizeAmazonRatingText(value: string): string {
  const text = value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*out of\s*5/i,
    /(\d+(?:[.,]\d+)?)\s*(?:von|sur|su|de)\s*5/i,
    /(\d+(?:[.,]\d+)?)\s*(?:星|stelle|sternen|étoiles?|etoiles?|stelle|estrellas?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(',', '.');
  }

  const fallback = text.match(/(\d+(?:[.,]\d+)?)/);
  return fallback?.[1]?.replace(',', '.') || '';
}

export async function extractRating(page: Page): Promise<string> {
  return page.evaluate((normalizeSource) => {
    const normalizeRating = new Function(`return ${normalizeSource}`)() as (value: string) => string;
    const pop = document.querySelector('#acrPopover, [data-hook="rating-out-of-text"]');
    const aria = pop?.getAttribute('aria-label') || pop?.textContent || '';
    const popRating = normalizeRating(aria);
    if (popRating) return popRating;

    const span = document.querySelector('span.a-icon-alt');
    return normalizeRating(span?.textContent || '');
  }, normalizeAmazonRatingText.toString());
}

export async function extractReviewCount(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el =
      document.querySelector('#acrCustomerReviewText, [data-hook="total-review-count"]') ||
      document.querySelector('a#acrCustomerReviewLink');
    const raw = el?.textContent?.trim() || '';
    const digits = raw.replace(/[^\d]/g, '');
    return digits || '';
  });
}
