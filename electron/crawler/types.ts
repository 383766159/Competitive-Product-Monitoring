/** 单日单个 ASIN 的抓取结果，与 Excel 列顺序对齐。 */
export interface AsinSnapshot {
  /** ASIN。 */
  asin: string;
  /** 品牌，写入表格第 3 行。 */
  brand: string;
  /** 划线价，例如 $39.99。 */
  strikePrice: string;
  /** 页面当前主价格。 */
  pagePrice: string;
  /** 活动文案，无则填 /。 */
  promotions: string;
  rating: string;
  reviewCount: string;
  /** 排名，例如 #50989 / #83。 */
  rank: string;
  variationCount: string;
  /** 库存，例如限购 N、仅剩 N、充足。 */
  inventory: string;
  buyBoxSeller: string;
  /** 备注，例如 AC、阶梯折扣。 */
  other: string;
  ok: boolean;
  error?: string;
  /** 价格调试信息，仅在价格抓取失败时填充。 */
  priceDebug?: string;
}
