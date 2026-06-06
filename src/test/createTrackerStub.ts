type TrackerStub = Window['tracker'];

type TrackerOverrides = Partial<TrackerStub>;

function createDefaultConfig(): Awaited<ReturnType<TrackerStub['getConfig']>> {
  return {
    headless: true,
    marketplace: 'us',
    zipCode: '10001',
    zipHomeWaitSec: 10,
    zipModalWaitSec: 10,
    locale: 'en-US',
    activeGroupId: 'group-1',
    groups: [{ id: 'group-1', name: '默认分组', asins: ['B0AAAAAA01'] }],
  };
}

export function createTrackerStub(overrides: TrackerOverrides = {}): TrackerStub {
  return {
    syncAsins: async () => ({ ok: true }),
    openExcel: async () => ({ ok: true }),
    openDataFolder: async () => ({ ok: true }),
    openLogsFolder: async () => ({ ok: true }),
    getPaths: async () => ({
      dataDir: 'E:/工具/竞品优化-V2/data',
      excelPath: 'E:/工具/竞品优化-V2/data/demo.xlsx',
      configPath: 'E:/工具/竞品优化-V2/config.json',
    }),
    getConfig: async () => createDefaultConfig(),
    getDefaultConfig: async () => createDefaultConfig(),
    saveConfig: async () => ({ ok: true }),
    pickExcelPath: async () => ({ ok: false }),
    onSyncProgress: () => () => undefined,
    ...overrides,
  };
}
