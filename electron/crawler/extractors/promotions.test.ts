import { describe, expect, it } from 'vitest';
import { isCouponPromotionText, isLimitedTimeDealText, isPrimeMemberPriceText } from './promotions';

describe('promotion text classifiers', () => {
  it('detects Prime member price labels across marketplaces', () => {
    expect(isPrimeMemberPriceText('Prime member price')).toBe(true);
    expect(isPrimeMemberPriceText('Prime Exklusivpreis')).toBe(true);
    expect(isPrimeMemberPriceText('Prix Prime exclusif')).toBe(true);
    expect(isPrimeMemberPriceText('Prezzo esclusivo Prime')).toBe(true);
    expect(isPrimeMemberPriceText('Precio exclusivo Prime')).toBe(true);
  });

  it('detects limited time deal labels across marketplaces', () => {
    expect(isLimitedTimeDealText('Limited time deal')).toBe(true);
    expect(isLimitedTimeDealText('Zeitlich begrenztes Angebot')).toBe(true);
    expect(isLimitedTimeDealText('Offre à durée limitée')).toBe(true);
    expect(isLimitedTimeDealText('Offerta a tempo limitato')).toBe(true);
    expect(isLimitedTimeDealText('Oferta por tiempo limitado')).toBe(true);
  });

  it('detects coupon labels across marketplaces', () => {
    expect(isCouponPromotionText('Clip coupon')).toBe(true);
    expect(isCouponPromotionText('Gutschein aktivieren')).toBe(true);
    expect(isCouponPromotionText('Appliquer le coupon')).toBe(true);
    expect(isCouponPromotionText('Applica buono sconto')).toBe(true);
    expect(isCouponPromotionText('Aplicar cupón')).toBe(true);
  });
});
