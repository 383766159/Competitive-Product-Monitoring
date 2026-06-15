import type { Page } from 'playwright';

export function extractBuyBoxSellerFromRoot(root: ParentNode): string {
  const clean = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/^(sold\s+by|verkauf\s+durch|versand\s*durch|vendu\s+par|venduto\s+da|vendido\s+por)\s*:?\s*/i, '')
      .trim()
      .split(/\s{2,}/)[0]
      .trim();

  const isBadSeller = (value: string): boolean => {
    const text = clean(value);
    return (
      !text ||
      text.length > 90 ||
      /^(details|ändern)$/i.test(text) ||
      /(rückgaben|retournierbar|retouren|returns?|return policy|retours?|retour|resi|devoluciones?|kostenfreie|gratuit|gratis|sichere transaktion|transaction sécurisée|transazione sicura|transacción segura|liefer[nung]?|versand nach|expédié|spedizione|enviado|auf lager|en stock|disponibile|kasse|caisse|checkout|datenschutzerklärung|unsere agb)/i.test(
        text,
      )
    );
  };

  const pickText = (value: string | null | undefined): string => {
    const text = clean(value || '');
    return isBadSeller(text) ? '' : text;
  };

  const buybox =
    root.querySelector('#desktop_buybox') ||
    root.querySelector('#buybox') ||
    root.querySelector('[data-feature-name="desktop_buybox"]') ||
    root;

  const scoped = buybox.querySelector('#sellerProfileTriggerId') as HTMLElement | null;
  const scopedText = pickText(scoped?.innerText || scoped?.textContent);
  if (scopedText && !/^amazon\.com$/i.test(scopedText)) return scopedText;

  const globalId = root.querySelector('#sellerProfileTriggerId') as HTMLElement | null;
  const globalText = pickText(globalId?.innerText || globalId?.textContent);
  if (globalText) return globalText;

  const merchantBlocks = buybox.querySelectorAll(
    '#merchantInfoFeature_feature_div, #offerDisplayFeatures_desktop .offer-display-feature, #offer-display-features .offer-display-feature',
  );
  for (const block of merchantBlocks) {
    const label = block.querySelector('.offer-display-feature-label')?.textContent || block.textContent || '';
    if (!/(seller|verk[aä]ufer|verkauf|vendeur|vendu|venditore|venduto|vendedor|vendido)/i.test(label)) continue;

    const link = block.querySelector('.offer-display-feature-text a, a[href*="seller="], a');
    const linkText = pickText(link?.textContent);
    if (linkText) return linkText;

    const valueNode = block.querySelector('.offer-display-feature-text, .offer-display-feature-text-message');
    const valueText = pickText(valueNode?.textContent);
    if (valueText) return valueText;
  }

  const rows = buybox.querySelectorAll('.offer-display-feature-text, .offer-display-feature-text-message, span, div');
  for (const el of rows) {
    const tx = el.textContent || '';
    if (!/(sold\s+by|verkauf\s+durch|vendu\s+par|venduto\s+da|vendido\s+por)/i.test(tx)) continue;

    const parent = el.closest('.offer-display-feature') || el.parentElement;
    const link =
      parent?.querySelector('a[href*="seller="], a#sellerProfileTriggerId, #sellerProfileTriggerId') ||
      el.parentElement?.querySelector('a');
    const hrefText = pickText(link?.textContent);
    if (hrefText) return hrefText;

    const match = tx.match(
      /(?:sold\s+by|verkauf\s+durch|vendu\s+par|venduto\s+da|vendido\s+por)\s*[:\s]+([^\n\r]+?)(?:\s{2,}|Ships|Versand|Expédié|Spedizione|Enviado|$)/i,
    );
    const matchText = pickText(match?.[1]);
    if (matchText) return matchText;
  }

  return '';
}

export async function extractBuyBoxSeller(page: Page): Promise<string> {
  return page.evaluate((sellerSource) => {
    const readSeller = new Function(`return ${sellerSource}`)() as (root: ParentNode) => string;
    return readSeller(document);
  }, extractBuyBoxSellerFromRoot.toString());
}
