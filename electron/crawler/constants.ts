/** 默认监控 ASIN，可在界面里自行调整并保存。 */
export const DEFAULT_ASINS: string[] = [
  'B0DJM4Q4BZ',
  'B0B4ZSKPNL',
  'B0DY4S3HP2',
  'B0C3QQMMRJ',
  'B09YGT8CZ5',
  'B09WHV1NJL',
];

export type AmazonMarketplace = 'us' | 'de' | 'fr' | 'it' | 'es';

export type AmazonMarketplaceMeta = {
  code: AmazonMarketplace;
  label: string;
  host: string;
  dpBase: string;
  acceptLanguage: string;
  fileSuffix: string;
};

export const AMAZON_MARKETPLACES: Record<AmazonMarketplace, AmazonMarketplaceMeta> = {
  us: {
    code: 'us',
    label: '美国',
    host: 'www.amazon.com',
    dpBase: 'https://www.amazon.com/dp/',
    acceptLanguage: 'en-US,en;q=0.9',
    fileSuffix: '',
  },
  de: {
    code: 'de',
    label: '德国',
    host: 'www.amazon.de',
    dpBase: 'https://www.amazon.de/dp/',
    acceptLanguage: 'de-DE,de;q=0.9,en;q=0.6',
    fileSuffix: '德国',
  },
  fr: {
    code: 'fr',
    label: '法国',
    host: 'www.amazon.fr',
    dpBase: 'https://www.amazon.fr/dp/',
    acceptLanguage: 'fr-FR,fr;q=0.9,en;q=0.6',
    fileSuffix: '法国',
  },
  it: {
    code: 'it',
    label: '意大利',
    host: 'www.amazon.it',
    dpBase: 'https://www.amazon.it/dp/',
    acceptLanguage: 'it-IT,it;q=0.9,en;q=0.6',
    fileSuffix: '意大利',
  },
  es: {
    code: 'es',
    label: '西班牙',
    host: 'www.amazon.es',
    dpBase: 'https://www.amazon.es/dp/',
    acceptLanguage: 'es-ES,es;q=0.9,en;q=0.6',
    fileSuffix: '西班牙',
  },
};

export const AMAZON_DP_BASE = AMAZON_MARKETPLACES.us.dpBase;

export function normalizeMarketplace(value: unknown): AmazonMarketplace {
  return value === 'de' || value === 'fr' || value === 'it' || value === 'es' || value === 'us'
    ? value
    : 'us';
}

export function getAmazonMarketplaceMeta(value: unknown): AmazonMarketplaceMeta {
  return AMAZON_MARKETPLACES[normalizeMarketplace(value)];
}

export function getAmazonDpBase(value: unknown): string {
  return getAmazonMarketplaceMeta(value).dpBase;
}
