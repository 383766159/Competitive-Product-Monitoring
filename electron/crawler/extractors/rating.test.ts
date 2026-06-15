import { describe, expect, it } from 'vitest';
import { extractRating } from './rating';

describe('extractRating', () => {
  const page = {
    evaluate: async <T>(fn: (arg: T) => string, arg: T) => fn(arg),
  };

  it('keeps comma decimal ratings used by European marketplaces', async () => {
    document.body.innerHTML = '<span class="a-icon-alt">4,4 su 5 stelle</span>';

    await expect(extractRating(page as never)).resolves.toBe('4.4');
  });

  it('reads localized rating labels from the rating popover', async () => {
    document.body.innerHTML = '<span id="acrPopover" aria-label="4,1 von 5 Sternen"></span>';

    await expect(extractRating(page as never)).resolves.toBe('4.1');
  });
});
