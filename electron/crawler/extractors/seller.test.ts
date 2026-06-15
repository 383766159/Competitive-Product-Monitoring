import { describe, expect, it } from 'vitest';
import { extractBuyBoxSellerFromRoot } from './seller';

describe('extractBuyBoxSellerFromRoot', () => {
  it('reads the German offer display merchant row instead of the return policy row', () => {
    document.body.innerHTML = `
      <div id="desktop_buybox">
        <div id="offerDisplayFeatures_desktop">
          <div id="merchantInfoFeature_feature_div">
            <div class="offer-display-feature-label">Versender / Verkäufer</div>
            <div class="offer-display-feature-text">
              <a href="javascript:void(0)">Amazon</a>
            </div>
          </div>
          <div>
            <div class="offer-display-feature-label">Rückgaben</div>
            <div class="offer-display-feature-text">
              <a href="javascript:void(0)">Retournierbar, wenn diese innerhalb von 14 Tagen nach dem Erhalt angefordert wird</a>
            </div>
          </div>
        </div>
      </div>
    `;

    expect(extractBuyBoxSellerFromRoot(document)).toBe('Amazon');
  });

  it('keeps the existing seller profile link path for US-style buy boxes', () => {
    document.body.innerHTML = `
      <div id="desktop_buybox">
        <a id="sellerProfileTriggerId" href="/sp?seller=A1">Mrbon EU</a>
      </div>
    `;

    expect(extractBuyBoxSellerFromRoot(document)).toBe('Mrbon EU');
  });

  it('reads French, Italian, and Spanish seller labels from offer display rows', () => {
    for (const [label, seller] of [
      ['Vendu par', 'Boutique FR'],
      ['Venditore', 'Negozio IT'],
      ['Vendedor', 'Tienda ES'],
    ]) {
      document.body.innerHTML = `
        <div id="desktop_buybox">
          <div id="merchantInfoFeature_feature_div">
            <div class="offer-display-feature-label">${label}</div>
            <div class="offer-display-feature-text"><a href="javascript:void(0)">${seller}</a></div>
          </div>
          <div>
            <div class="offer-display-feature-label">Returns</div>
            <div class="offer-display-feature-text"><a href="javascript:void(0)">Return policy</a></div>
          </div>
        </div>
      `;

      expect(extractBuyBoxSellerFromRoot(document)).toBe(seller);
    }
  });
});
