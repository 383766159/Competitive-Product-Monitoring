export type AsinGroup = {
  id: string;
  name: string;
  asins: string[];
};

export type AmazonMarketplace = 'us' | 'de' | 'fr' | 'it' | 'es';

export type UserConfig = {
  headless: boolean;
  marketplace: AmazonMarketplace;
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
  locale: 'en-US';
  activeGroupId: string;
  groups: AsinGroup[];
};
