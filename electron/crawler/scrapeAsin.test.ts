import { describe, expect, it } from 'vitest';
import { inspectAmazonPageText } from './scrapeAsin';

describe('inspectAmazonPageText', () => {
  it('detects unavailable product text across supported marketplaces', () => {
    expect(inspectAmazonPageText('Currently unavailable')).toEqual({ hasCaptcha: false, isUnavailable: true });
    expect(inspectAmazonPageText('Derzeit nicht verfügbar')).toEqual({ hasCaptcha: false, isUnavailable: true });
    expect(inspectAmazonPageText('Actuellement indisponible')).toEqual({ hasCaptcha: false, isUnavailable: true });
    expect(inspectAmazonPageText('Non disponibile')).toEqual({ hasCaptcha: false, isUnavailable: true });
    expect(inspectAmazonPageText('No disponible actualmente')).toEqual({ hasCaptcha: false, isUnavailable: true });
  });

  it('detects Amazon bot check pages beyond English text', () => {
    expect(inspectAmazonPageText('Gib die Zeichen ein, die du unten siehst')).toEqual({
      hasCaptcha: true,
      isUnavailable: false,
    });
  });
});
