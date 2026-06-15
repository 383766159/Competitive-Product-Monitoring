import type { Page } from 'playwright';
import type { AmazonMarketplaceMeta } from './constants';

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

function debugZip(message: string): void {
  if (process.env.AMAZON_ZIP_DEBUG === '1') console.warn(`[amazon-zip] ${message}`);
}

function currencyPreferenceForMarketplace(marketplace: AmazonMarketplaceMeta): string | null {
  return marketplace.code === 'de' || marketplace.code === 'fr' || marketplace.code === 'it' || marketplace.code === 'es'
    ? 'EUR'
    : null;
}

function cookieDomainForHost(host: string): string {
  return host.startsWith('www.') ? `.${host.slice(4)}` : host;
}

async function ensureAmazonCurrencyPreference(page: Page, marketplace: AmazonMarketplaceMeta): Promise<void> {
  const currency = currencyPreferenceForMarketplace(marketplace);
  if (!currency) return;

  await page.context().addCookies([
    {
      name: 'i18n-prefs',
      value: currency,
      domain: cookieDomainForHost(marketplace.host),
      path: '/',
      expires: Math.floor(Date.now() / 1_000) + 365 * 24 * 60 * 60,
      httpOnly: false,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
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

async function clickIfVisible(page: Page, selector: string, timeout = 2_000): Promise<boolean> {
  const locators = page.locator(selector);
  const count = typeof locators.count === 'function' ? await locators.count().catch(() => 1) : 1;
  debugZip(`selector=${selector} count=${count}`);

  for (let index = 0; index < Math.min(count, 10); index++) {
    const locator = count === 1 || typeof locators.nth !== 'function' ? locators.first() : locators.nth(index);
    const visible = await locator.isVisible({ timeout }).catch(() => false);
    debugZip(`selector=${selector} index=${index} visible=${visible}`);
    if (!visible) continue;
    await locator.click({ timeout }).catch(async (error) => {
      debugZip(`normal click failed selector=${selector} index=${index}: ${error instanceof Error ? error.message : String(error)}`);
      await locator.click({ timeout, force: true }).catch(async () => {
        await locator.evaluate((element) => {
          if (element instanceof HTMLElement) element.click();
        });
      });
    });
    debugZip(`clicked selector=${selector} index=${index}`);
    return true;
  }

  return false;
}

async function hasZipInput(page: Page, timeout = 2_000): Promise<boolean> {
  return page
    .locator('#GLUXZipUpdateInput, input[name="zipCode"]')
    .first()
    .isVisible({ timeout })
    .catch(() => false);
}

async function clickFirstVisible(page: Page, selectors: string[], timeout = 2_000): Promise<boolean> {
  for (const selector of selectors) {
    if (await clickIfVisible(page, selector, timeout).catch(() => false)) return true;
  }
  return false;
}

async function openZipPopover(page: Page, timing: ZipSetupTiming): Promise<boolean> {
  if (await hasZipInput(page, 500)) return true;

  const openers = [
    '#nav-global-location-popover-link, #glow-ingress-block',
    'span.a-button-text:has-text("ADRESSE")',
    'span.a-button-text:has-text("Adresse")',
    'text=/DIE ADRESSE .NDERN|Adresse .ndern|Versandadresse .ndern/i',
  ];

  for (const selector of openers) {
    if (!(await clickIfVisible(page, selector, 10_000).catch(() => false))) continue;
    await page
      .waitForSelector('#GLUXZipUpdateInput, input[name="zipCode"]', {
        state: 'visible',
        timeout: Math.max(2_000, timing.modalWaitMs + 2_000),
      })
      .catch(() => {});
    if (await hasZipInput(page)) return true;
  }

  return hasZipInput(page, 500);
}

async function updateZipByApi(page: Page, host: string, zip: string): Promise<boolean> {
  const response = await page.request.post(`https://${host}/gp/delivery/ajax/address-change.html`, {
    maxRedirects: 0,
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

async function updateZipByPopover(page: Page, zip: string, timing: ZipSetupTiming): Promise<boolean> {
  await clickFirstVisible(
    page,
    ['#sp-cc-accept', 'input[name="accept"]', 'button:has-text("Akzeptieren")', 'span.a-button-text:has-text("Akzeptieren")'],
    1_000,
  );

  if (!(await openZipPopover(page, timing))) return false;

  await page
    .locator('#GLUXZipUpdateInput, input[name="zipCode"]')
    .first()
    .fill(zip);
  const submitted =
    (await clickIfVisible(page, '#GLUXZipUpdate, input[aria-labelledby="GLUXZipUpdate-announce"]', 5_000).catch(
      () => false,
    )) || (await clickIfVisible(page, 'text=/Best.tigen|Confirm|Apply/i', 5_000).catch(() => false));
  if (!submitted) return false;

  await page.waitForTimeout(Math.max(1_000, timing.modalWaitMs));

  await clickIfVisible(
    page,
    [
      '#GLUXConfirmClose',
      '#GLUXConfirmClose-announce',
      'input[aria-labelledby="GLUXConfirmClose-announce"]',
      '.a-popover-wrapper #a-autoid-0-announce',
      '.a-popover-wrapper span.a-button-text:has-text("Fortfahren")',
      '.a-popover-wrapper span.a-button-text:has-text("Fertig")',
      '.a-popover-wrapper span.a-button-text:has-text("Continue")',
      '.a-popover-wrapper span.a-button-text:has-text("Done")',
    ].join(', '),
    5_000,
  ).catch(() => false);
  await page.waitForTimeout(Math.max(1_000, timing.modalWaitMs));

  return true;
}

/**
 * 设置当前 Amazon 站点的配送邮编。
 * 先走站点同域接口，再做一次页面级确认。
 */
export async function ensureAmazonDelivery(
  page: Page,
  marketplace: AmazonMarketplaceMeta,
  zipCode: string,
  timing: ZipSetupTiming = DEFAULT_TIMING,
): Promise<boolean> {
  const zip = zipCode.replace(/\D/g, '').slice(0, 5);
  if (zip.length !== 5) return false;

  await page.setExtraHTTPHeaders({
    'Accept-Language': marketplace.acceptLanguage,
  });
  await ensureAmazonCurrencyPreference(page, marketplace);

  try {
    await page.goto(`https://${marketplace.host}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForTimeout(Math.max(0, timing.homeWaitMs));

    const updated =
      (await updateZipByApi(page, marketplace.host, zip).catch(() => {
        return false;
      })) || (await updateZipByPopover(page, zip, timing));
    if (!updated) return false;

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(Math.max(1_000, timing.modalWaitMs));

    const header = await readLocationHeader(page);
    return header.includes(zip);
  } catch (error) {
    console.warn('[ensureAmazonDelivery]', error);
    return false;
  }
}
