import { describe, expect, it, vi } from 'vitest';
import { ensureAmazonDelivery } from './amazonContext';
import type { AmazonMarketplaceMeta } from './constants';

const deMarketplace: AmazonMarketplaceMeta = {
  code: 'de',
  label: '德国',
  host: 'www.amazon.de',
  dpBase: 'https://www.amazon.de/dp/',
  acceptLanguage: 'de-DE,de;q=0.9,en;q=0.6',
  fileSuffix: '德国',
};

function createLocator(overrides: Partial<Record<'click' | 'fill' | 'isVisible' | 'textContent', unknown>> = {}) {
  return {
    first: vi.fn().mockReturnThis(),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    isVisible: vi.fn().mockResolvedValue(true),
    textContent: vi.fn().mockResolvedValue(''),
    ...overrides,
  };
}

function createBrowserContext() {
  return {
    addCookies: vi.fn().mockResolvedValue(undefined),
  };
}

describe('ensureAmazonDelivery', () => {
  it('sets the German marketplace currency preference to EUR in the active browser context', async () => {
    const headerLocator = createLocator({
      textContent: vi.fn().mockResolvedValue('Liefern nach 10115 Berlin'),
    });
    const context = {
      addCookies: vi.fn().mockResolvedValue(undefined),
    };

    const page = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
      context: vi.fn().mockReturnValue(context),
      request: {
        post: vi.fn().mockResolvedValue({
          ok: () => true,
          text: vi.fn().mockResolvedValue(
            JSON.stringify({
              successful: 1,
              isValidAddress: 1,
              address: { zipCode: '10115' },
            }),
          ),
        }),
      },
      locator: vi.fn((selector: string) => {
        if (selector.includes('glow-ingress-line2')) return headerLocator;
        return createLocator({
          isVisible: vi.fn().mockResolvedValue(false),
        });
      }),
    };

    await expect(ensureAmazonDelivery(page as never, deMarketplace, '10115', { homeWaitMs: 0, modalWaitMs: 0 })).resolves.toBe(
      true,
    );
    expect(context.addCookies).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'i18n-prefs',
          value: 'EUR',
          domain: '.amazon.de',
        }),
      ]),
    );
  });

  it('falls back to the location popover when the delivery API redirect cannot be resolved', async () => {
    const headerLocator = createLocator({
      textContent: vi.fn().mockResolvedValue('Lieferung nach 10115'),
    });
    const zipInputLocator = createLocator();
    const submitLocator = createLocator();
    const locationTriggerLocator = createLocator();

    const page = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
      context: vi.fn().mockReturnValue(createBrowserContext()),
      request: {
        post: vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND hp-shoppingportal-eu-1a.dub.amazon.com')),
      },
      locator: vi.fn((selector: string) => {
        if (selector.includes('GLUXZipUpdateInput')) return zipInputLocator;
        if (selector.includes('GLUXZipUpdate')) return submitLocator;
        if (selector.includes('nav-global-location')) return headerLocator;
        if (selector.includes('glow-ingress')) return locationTriggerLocator;
        return createLocator();
      }),
    };

    await expect(ensureAmazonDelivery(page as never, deMarketplace, '10115', { homeWaitMs: 0, modalWaitMs: 0 })).resolves.toBe(
      true,
    );
    expect(zipInputLocator.fill).toHaveBeenCalledWith('10115');
    expect(submitLocator.click).toHaveBeenCalled();
  });

  it('opens the German address popover from the shipping prompt when the header trigger is unavailable', async () => {
    let promptOpened = false;
    const headerLocator = createLocator({
      textContent: vi.fn().mockResolvedValue('Lieferung nach 10115'),
    });
    const headerTriggerLocator = createLocator({
      click: vi.fn().mockRejectedValue(new Error('covered by prompt')),
    });
    const promptAddressLocator = createLocator({
      click: vi.fn().mockImplementation(() => {
        promptOpened = true;
        return Promise.resolve();
      }),
    });
    const zipInputLocator = createLocator({
      isVisible: vi.fn().mockImplementation(() => Promise.resolve(promptOpened)),
    });
    const submitLocator = createLocator();

    const page = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
      context: vi.fn().mockReturnValue(createBrowserContext()),
      request: {
        post: vi.fn().mockResolvedValue({
          ok: () => false,
        }),
      },
      locator: vi.fn((selector: string) => {
        if (selector.includes('glow-ingress-line2')) return headerLocator;
        if (selector.includes('nav-global-location-popover-link')) return headerTriggerLocator;
        if (selector.includes('ADRESSE') || selector.includes('Adresse')) return promptAddressLocator;
        if (selector.includes('GLUXZipUpdateInput')) return zipInputLocator;
        if (selector.includes('GLUXZipUpdate')) return submitLocator;
        return createLocator();
      }),
    };

    await expect(ensureAmazonDelivery(page as never, deMarketplace, '10115', { homeWaitMs: 0, modalWaitMs: 0 })).resolves.toBe(
      true,
    );
    expect(promptAddressLocator.click).toHaveBeenCalled();
    expect(zipInputLocator.fill).toHaveBeenCalledWith('10115');
  });

  it('falls back to the shipping prompt when clicking the header does not reveal the zip input', async () => {
    let promptOpened = false;
    const headerLocator = createLocator({
      textContent: vi.fn().mockResolvedValue('Lieferung nach 10115'),
    });
    const headerTriggerLocator = createLocator();
    const promptAddressLocator = createLocator({
      click: vi.fn().mockImplementation(() => {
        promptOpened = true;
        return Promise.resolve();
      }),
    });
    const zipInputLocator = createLocator({
      isVisible: vi.fn().mockImplementation(() => Promise.resolve(promptOpened)),
    });
    const submitLocator = createLocator();

    const page = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
      context: vi.fn().mockReturnValue(createBrowserContext()),
      request: {
        post: vi.fn().mockResolvedValue({
          ok: () => false,
        }),
      },
      locator: vi.fn((selector: string) => {
        if (selector.includes('glow-ingress-line2')) return headerLocator;
        if (selector.includes('nav-global-location-popover-link')) return headerTriggerLocator;
        if (selector.includes('ADRESSE') || selector.includes('Adresse')) return promptAddressLocator;
        if (selector.includes('GLUXZipUpdateInput')) return zipInputLocator;
        if (selector.includes('GLUXZipUpdate')) return submitLocator;
        return createLocator({
          isVisible: vi.fn().mockResolvedValue(false),
        });
      }),
    };

    await expect(ensureAmazonDelivery(page as never, deMarketplace, '10115', { homeWaitMs: 0, modalWaitMs: 0 })).resolves.toBe(
      true,
    );
    expect(headerTriggerLocator.click).toHaveBeenCalled();
    expect(promptAddressLocator.click).toHaveBeenCalled();
    expect(zipInputLocator.fill).toHaveBeenCalledWith('10115');
  });

  it('confirms the selected German postal code from the active popover instead of the top shipping prompt', async () => {
    let delivered = false;
    const headerLocator = createLocator({
      textContent: vi.fn().mockImplementation(() => Promise.resolve(delivered ? 'Lieferung nach 10115' : 'China')),
    });
    const locationTriggerLocator = createLocator();
    const zipInputLocator = createLocator();
    const submitLocator = createLocator();
    const genericCloseLocator = createLocator({
      isVisible: vi.fn().mockResolvedValue(false),
    });
    const topPromptContinueLocator = createLocator();
    const popoverContinueLocator = createLocator({
      click: vi.fn().mockImplementation(() => {
        delivered = true;
        return Promise.resolve();
      }),
    });

    const page = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
      context: vi.fn().mockReturnValue(createBrowserContext()),
      request: {
        post: vi.fn().mockResolvedValue({
          ok: () => false,
        }),
      },
      locator: vi.fn((selector: string) => {
        if (selector.includes('glow-ingress-line2')) return headerLocator;
        if (selector.includes('nav-global-location-popover-link')) return locationTriggerLocator;
        if (selector.includes('GLUXZipUpdateInput')) return zipInputLocator;
        if (selector.includes('GLUXZipUpdate')) return submitLocator;
        if (selector.includes('GLUXConfirmClose-announce')) return popoverContinueLocator;
        if (selector.includes('GLUXConfirmClose')) return genericCloseLocator;
        if (selector.includes('Fortfahren')) return topPromptContinueLocator;
        return createLocator({
          isVisible: vi.fn().mockResolvedValue(false),
        });
      }),
    };

    await expect(ensureAmazonDelivery(page as never, deMarketplace, '10115', { homeWaitMs: 0, modalWaitMs: 0 })).resolves.toBe(
      true,
    );
    expect(topPromptContinueLocator.click).not.toHaveBeenCalled();
    expect(popoverContinueLocator.click).toHaveBeenCalled();
  });

  it('verifies the German postal code after reloading because the header can stay stale after submit', async () => {
    let reloaded = false;
    const headerLocator = createLocator({
      textContent: vi.fn().mockImplementation(() => Promise.resolve(reloaded ? 'Liefern nach 10115 Berlin' : 'China')),
    });
    const locationTriggerLocator = createLocator();
    const zipInputLocator = createLocator();
    const submitLocator = createLocator();

    const page = {
      setExtraHTTPHeaders: vi.fn().mockResolvedValue(undefined),
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockImplementation(() => {
        reloaded = true;
        return Promise.resolve();
      }),
      context: vi.fn().mockReturnValue(createBrowserContext()),
      request: {
        post: vi.fn().mockResolvedValue({
          ok: () => false,
        }),
      },
      locator: vi.fn((selector: string) => {
        if (selector.includes('glow-ingress-line2')) return headerLocator;
        if (selector.includes('nav-global-location-popover-link')) return locationTriggerLocator;
        if (selector.includes('GLUXZipUpdateInput')) return zipInputLocator;
        if (selector.includes('GLUXZipUpdate')) return submitLocator;
        return createLocator({
          isVisible: vi.fn().mockResolvedValue(false),
        });
      }),
    };

    await expect(ensureAmazonDelivery(page as never, deMarketplace, '10115', { homeWaitMs: 0, modalWaitMs: 0 })).resolves.toBe(
      true,
    );
    expect(page.reload).toHaveBeenCalled();
    expect(headerLocator.textContent).toHaveBeenCalledTimes(1);
  });
});
