import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import type { AsinSnapshot } from '../crawler/types';

export const MONITOR_SHEET_NAME = '竞品监控';

const METRIC_LABELS = [
  '划线价',
  '页面价',
  '活动（专享/优惠券/LD/BD）',
  '评分',
  '评论数',
  '排名（大类/小类）',
  '变体数量',
  '库存',
  '购物车卖家',
  '其他',
] as const;

const DATA_START_ROW = 5;

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function stripMoneyForCell(value: string): string | number {
  const text = String(value).trim();
  if (!text || text === '/') return '/';

  const numericText = text.match(/[\d.,]+/)?.[0];
  if (!numericText) return text;

  const normalized =
    numericText.includes(',') && numericText.lastIndexOf(',') > numericText.lastIndexOf('.')
      ? numericText.replace(/\./g, '').replace(',', '.')
      : numericText.replace(/,/g, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : text;
}

function formatPromotions(value: string): string {
  const text = String(value).replace(/\r?\n/g, ' ').trim();
  return text || '/';
}

function formatRankForSheet(value: string): string {
  return value ? value.replace(/\//g, '') : '/';
}

function snapshotByMetric(snapshot: AsinSnapshot | undefined): Array<string | number> {
  if (!snapshot) return Array.from({ length: METRIC_LABELS.length }, () => '/');

  const strike = stripMoneyForCell(snapshot.strikePrice);
  const page = stripMoneyForCell(snapshot.pagePrice);
  const other = (snapshot.other || (snapshot.ok ? '' : snapshot.error || '')).trim();

  return [
    strike === '' ? '/' : strike,
    page === '' ? '/' : page,
    formatPromotions(snapshot.promotions),
    snapshot.rating || '/',
    snapshot.reviewCount || '/',
    formatRankForSheet(snapshot.rank),
    snapshot.variationCount || '/',
    snapshot.inventory || '/',
    snapshot.buyBoxSeller || '/',
    other || '/',
  ];
}

function lastUsedRow(sheet: ExcelJS.Worksheet): number {
  let max = 1;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const value = row.getCell(1).value;
    if (value != null && String(value).trim() !== '') {
      max = Math.max(max, rowNumber);
    }
  });
  return max;
}

function findDateHeaderRow(sheet: ExcelJS.Worksheet, dateStr: string): number | undefined {
  const limit = Math.max(lastUsedRow(sheet) + 40, DATA_START_ROW + 500);
  for (let row = DATA_START_ROW; row <= limit; row++) {
    const value = sheet.getRow(row).getCell(1).value;
    if (value != null && String(value).trim() === dateStr) return row;
  }
  return undefined;
}

function ensureSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  return workbook.getWorksheet(MONITOR_SHEET_NAME) ?? workbook.addWorksheet(MONITOR_SHEET_NAME);
}

function writeHeaderRows(
  sheet: ExcelJS.Worksheet,
  orderedAsins: string[],
  snapshots: AsinSnapshot[],
): void {
  const brandByAsin = new Map(snapshots.map((snapshot) => [snapshot.asin, snapshot.brand?.trim() ?? '']));

  sheet.getCell('A2').value = '竞品 ASIN';
  orderedAsins.forEach((asin, index) => {
    sheet.getRow(2).getCell(index + 2).value = asin;
  });

  sheet.getCell('A3').value = '品牌';
  orderedAsins.forEach((asin, index) => {
    sheet.getRow(3).getCell(index + 2).value = brandByAsin.get(asin) ?? '';
  });

  sheet.getRow(4).values = [];
}

function styleDateHeaderRow(sheet: ExcelJS.Worksheet, rowNum: number, lastCol: number): void {
  const row = sheet.getRow(rowNum);
  row.height = 22;
  for (let col = 1; col <= lastCol; col++) {
    const cell = row.getCell(col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDCE6F2' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.font = { bold: true, size: 11 };
  }
}

function mergeDateRow(sheet: ExcelJS.Worksheet, rowNum: number, lastCol: number): void {
  if (lastCol <= 1) return;
  try {
    sheet.mergeCells(rowNum, 1, rowNum, lastCol);
  } catch {
    /* 同一天重复写入时忽略。 */
  }
}

export async function appendSnapshots(
  excelPath: string,
  orderedAsins: string[],
  snapshots: AsinSnapshot[],
): Promise<void> {
  fs.mkdirSync(path.dirname(excelPath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(excelPath)) {
    await workbook.xlsx.readFile(excelPath);
  }

  const sheet = ensureSheet(workbook);
  const byAsin = new Map(snapshots.map((snapshot) => [snapshot.asin, snapshot]));
  const dateStr = todayStr();
  const lastCol = 1 + orderedAsins.length;

  writeHeaderRows(sheet, orderedAsins, snapshots);

  let dateRow = findDateHeaderRow(sheet, dateStr);
  if (dateRow === undefined) {
    dateRow = Math.max(lastUsedRow(sheet), DATA_START_ROW - 1) + 1;
  }

  sheet.getCell(dateRow, 1).value = dateStr;
  mergeDateRow(sheet, dateRow, lastCol);
  styleDateHeaderRow(sheet, dateRow, lastCol);

  for (let index = 0; index < METRIC_LABELS.length; index++) {
    const rowNum = dateRow + 1 + index;
    sheet.getCell(rowNum, 1).value = METRIC_LABELS[index];
    orderedAsins.forEach((asin, colIndex) => {
      const values = snapshotByMetric(byAsin.get(asin));
      sheet.getRow(rowNum).getCell(colIndex + 2).value = values[index];
    });
  }

  sheet.getColumn(1).width = 30;
  for (let col = 2; col <= lastCol; col++) {
    sheet.getColumn(col).width = 14;
  }

  await workbook.xlsx.writeFile(excelPath);
}
