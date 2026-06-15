import { describe, expect, it } from 'vitest';
import { parseAmazonRanksFromText, textHasAmazonRankLabel } from './rank';

describe('parseAmazonRanksFromText', () => {
  it('parses US and German rank formats', () => {
    expect(parseAmazonRanksFromText('Best Sellers Rank #50,989 in Home & Kitchen #83 in Vacuum Sealers')).toEqual([
      '#50989',
      '#83',
    ]);
    expect(parseAmazonRanksFromText('Amazon Bestseller-Rang Nr. 50.989 in Küche Nr. 83 in Vakuumierer')).toEqual([
      '#50989',
      '#83',
    ]);
  });

  it('parses French, Italian, and Spanish rank formats', () => {
    expect(parseAmazonRanksFromText('Classement des meilleures ventes n° 1 234 en Cuisine n° 56 en Conservation')).toEqual([
      '#1234',
      '#56',
    ]);
    expect(parseAmazonRanksFromText('Classifica Bestseller n. 1.234 in Casa e cucina n. 56 in Sacchetti')).toEqual([
      '#1234',
      '#56',
    ]);
    expect(parseAmazonRanksFromText('Clasificación en los más vendidos nº 1.234 en Hogar nº 56 en Bolsas')).toEqual([
      '#1234',
      '#56',
    ]);
  });
});

describe('textHasAmazonRankLabel', () => {
  it('detects rank labels across supported marketplaces', () => {
    expect(textHasAmazonRankLabel('Best Sellers Rank')).toBe(true);
    expect(textHasAmazonRankLabel('Amazon Bestseller-Rang')).toBe(true);
    expect(textHasAmazonRankLabel('Classement des meilleures ventes')).toBe(true);
    expect(textHasAmazonRankLabel('Classifica Bestseller')).toBe(true);
    expect(textHasAmazonRankLabel('Clasificación en los más vendidos')).toBe(true);
  });
});
