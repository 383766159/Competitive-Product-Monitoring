import type { Page } from 'playwright';

export type ZipSetupTiming = {
  /** 打开首页后的等待时间。 */
  homeWaitMs: number;
  /** 接口切换后的等待时间。 */
  modalWaitMs: number;
};

const DEFAULT_TIMING: ZipSetupTiming = {
  homeWaitMs: 10_000,
  modalWaitMs: 3_000,
};

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

async function readLocationHeader(page: Page): Promise<string> {
  const text =
    (await page
      .locator('#glow-ingress-line2, #nav-global-location-popover-link')
      .first()
      .textContent()
      .catch(() => '')) || '';
  return normalize(text);
}

async function updateZipByApi(page: Page, zip: string): Promise<boolean> {
  const response = await page.request.post('https://www.amazon.com/gp/delivery/ajax/address-change.html', {
    form: {
      locationType: 'LOCATION_INPUT',
      zipCode: zip,
      storeContext: 'generic',
      deviceType: 'web',
      pageType: 'Gateway',
      actionSource: 'glow',
      almBrandId: 'undefined',
    },
    headers: {
      'x-requested-with': 'XMLHttpRequest',
    },
  });

  if (!response.ok()) return false;

  const raw = await response.text().catch(() => '');
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw) as {
      successful?: number;
      isValidAddress?: number;
      address?: { zipCode?: string };
    };
    return (
      payload.successful === 1 &&
      payload.isValidAddress === 1 &&
      String(payload.address?.zipCode || '').trim() === zip
    );
  } catch {
    return false;
  }
}

/**
 * 设置 Amazon US 的配送邮编。
 * 先走 Amazon 同域接口，失败时再保留原有页面级校验。
 */
export async function ensureAmazonUSDelivery(
  page: Page,
  zipCode: string,
  timing: ZipSetupTiming = DEFAULT_TIMING,
): Promise<boolean> {
  const zip = zipCode.replace(/\D/g, '').slice(0, 5);
  if (zip.length !== 5) return false;

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });

  try {
    await page.goto('https://www.amazon.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForTimeout(Math.max(0, timing.homeWaitMs));

    const updated = await updateZipByApi(page, zip);
    if (!updated) return false;

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(Math.max(1_000, timing.modalWaitMs));

    const header = await readLocationHeader(page);
    return header.includes(zip) || /new york\s*10001/i.test(header);
  } catch (error) {
    console.warn('[ensureAmazonUSDelivery]', error);
    return false;
  }
}
