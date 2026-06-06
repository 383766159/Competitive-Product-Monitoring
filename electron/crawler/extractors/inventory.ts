import type { Page } from 'playwright';

/**
 * 库存 / 可购数量：
 * 1. 优先读取 Buy Box 数量下拉的最大可选数量，输出 `限购N`
 * 2. 识别 `Only X left in stock` 一类文案，输出 `仅剩N`
 * 3. 仅有 `In Stock` 这类文案时输出 `充足`
 * 4. 无法判断时输出 `/`
 */
export async function extractInventory(page: Page): Promise<string> {
  return page.evaluate(() => {
    const buybox =
      document.querySelector('#desktop_buybox') ||
      document.querySelector('#buybox') ||
      document.body;

    const select =
      (buybox.querySelector(
        'select#quantity, select[name="quantity"], select[id*="quantity"], select.a-native-dropdown',
      ) as HTMLSelectElement | null) ||
      (document.querySelector('select#quantity, select[name="quantity"]') as HTMLSelectElement | null);

    if (select?.options?.length) {
      let max = 0;
      for (let i = 0; i < select.options.length; i++) {
        const value = Number.parseInt(select.options[i].value, 10);
        if (!Number.isNaN(value) && value > max) max = value;
      }
      if (max > 0) return `限购${max}`;
    }

    const text = document.body.innerText || '';
    const low =
      /only\s+(\d+)\s+left\s+in\s+stock/i.exec(text) ||
      /nur\s+noch\s+(\d+)\s+(?:auf\s+lager|stück)/i.exec(text) ||
      /il\s+ne\s+reste\s+plus\s+que\s+(\d+)/i.exec(text) ||
      /solo\s+(?:quedan|queda)\s+(\d+)/i.exec(text) ||
      /solo\s+(\d+)\s+(?:disponibili|rimasti)/i.exec(text);
    if (low) return `仅剩${low[1]}`;

    if (/(in\s+stock|auf\s+lager|en\s+stock|disponibile|disponibilidad)/i.test(text)) return '充足';
    if (
      /(currently\s+unavailable|derzeit\s+nicht\s+verfügbar|actuellement\s+indisponible|non\s+disponibile|no\s+disponible)/i.test(
        text,
      )
    ) {
      return '/';
    }

    return '/';
  });
}
