import { describe, expect, it } from 'vitest';
import { normalizeBrandByline } from './brand';

describe('normalizeBrandByline', () => {
  it('extracts the store name from US and German Amazon byline text', () => {
    expect(normalizeBrandByline('Visit the LEVOIT Store')).toBe('LEVOIT');
    expect(normalizeBrandByline('Besuche den Bonsenkitchen-Store')).toBe('Bonsenkitchen');
    expect(normalizeBrandByline('Besuche den CASO-Store')).toBe('CASO');
  });

  it('extracts the brand name from German brand label text', () => {
    expect(normalizeBrandByline('Marke: Vpcok Direct')).toBe('Vpcok Direct');
  });

  it('extracts store names from French, Italian, and Spanish Amazon byline text', () => {
    expect(normalizeBrandByline('Visiter la boutique Caso')).toBe('Caso');
    expect(normalizeBrandByline('Visita lo Store di Caso')).toBe('Caso');
    expect(normalizeBrandByline('Visita la tienda de Caso')).toBe('Caso');
  });

  it('extracts brand labels from French, Italian, and Spanish Amazon text', () => {
    expect(normalizeBrandByline('Marque : Caso')).toBe('Caso');
    expect(normalizeBrandByline('Marca: Caso')).toBe('Caso');
  });
});
