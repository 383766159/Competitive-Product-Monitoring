import { describe, expect, it } from 'vitest';
import { extractStrikePrice } from './prices';

describe('extractStrikePrice', () => {
  const page = {
    evaluate: async <T>(fn: (arg: T) => string, arg: T) => fn(arg),
  };

  it('ignores non-strike text prices inside the core price area', async () => {
    document.body.innerHTML = `
      <div id="corePriceDisplay_desktop_feature_div">
        <span class="a-price">
          <span class="a-offscreen">11,99 €</span>
        </span>
        <span class="a-text-price pricePerUnit">
          <span class="a-offscreen">0,24 €</span>
        </span>
      </div>
    `;

    await expect(extractStrikePrice(page as never)).resolves.toBe('');
  });

  it('keeps explicit struck-through prices', async () => {
    document.body.innerHTML = `
      <div id="corePriceDisplay_desktop_feature_div">
        <span class="a-price">
          <span class="a-offscreen">17,99 €</span>
        </span>
        <span class="a-text-price" data-a-strike="true">
          <span class="a-offscreen">19,99 €</span>
        </span>
      </div>
    `;

    await expect(extractStrikePrice(page as never)).resolves.toBe('19,99€');
  });
});
