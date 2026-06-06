import type { Page } from 'playwright';

export async function extractRating(page: Page): Promise<string> {
  return page.evaluate(() => {
    const pop = document.querySelector('#acrPopover, [data-hook="rating-out-of-text"]');
    const aria = pop?.getAttribute('aria-label') || pop?.textContent || '';
    let m = aria.match(/(\d+(?:\.\d+)?)\s*out of\s*5/i);
    if (m) return m[1];
    m = aria.match(/(\d+(?:\.\d+)?)\s*[\u661f\u2022]/);
    if (m) return m[1];
    const span = document.querySelector('span.a-icon-alt');
    if (span?.textContent) {
      const mm = span.textContent.match(/(\d+(?:\.\d+)?)/);
      if (mm) return mm[1];
    }
    return '';
  });
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
