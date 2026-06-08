export type AsinGroup = {
  id: string;
  name: string;
  asins: string[];
};

export type AmazonMarketplace = 'us' | 'de' | 'fr' | 'it' | 'es';

export type MarketplaceZipSettings = {
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
};

export type ZipSettingsByMarketplace = Record<AmazonMarketplace, MarketplaceZipSettings>;

export type UserConfig = {
  headless: boolean;
  marketplace: AmazonMarketplace;
  zipSettings: ZipSettingsByMarketplace;
  locale: 'en-US';
  activeGroupId: string;
  groups: AsinGroup[];
};
