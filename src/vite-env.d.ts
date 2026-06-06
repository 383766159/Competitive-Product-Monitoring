/// <reference types="vite/client" />

type TrackerSyncProgress = {
  type:
    | 'log'
    | 'asin-start'
    | 'asin-done'
    | 'group-start'
    | 'group-done'
    | 'done'
    | 'error';
  message?: string;
  asin?: string;
  groupId?: string;
  payload?: unknown;
};

type AsinGroupPayload = {
  id: string;
  name: string;
  asins: string[];
};

type UserConfigPayload = {
  headless: boolean;
  marketplace: 'us' | 'de' | 'fr' | 'it' | 'es';
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
  locale: 'en-US';
  activeGroupId: string;
  groups: AsinGroupPayload[];
};

type SaveConfigResult = { ok: true } | { ok: false; error: string };

type SyncAsinsOptions = {
  groupIds?: string[];
};

declare global {
  interface Window {
    tracker: {
      syncAsins: (opts?: SyncAsinsOptions) => Promise<{ ok: boolean; error?: string }>;
      openExcel: (groupId?: string) => Promise<{ ok: boolean }>;
      openDataFolder: () => Promise<{ ok: boolean }>;
      openLogsFolder: () => Promise<{ ok: boolean }>;
      getPaths: () => Promise<{ dataDir: string; excelPath: string; configPath: string }>;
      getConfig: () => Promise<UserConfigPayload>;
      getDefaultConfig: () => Promise<UserConfigPayload>;
      saveConfig: (cfg: UserConfigPayload) => Promise<SaveConfigResult>;
      pickExcelPath: () => Promise<{ ok: false } | { ok: true; path: string }>;
      onSyncProgress: (cb: (p: TrackerSyncProgress) => void) => () => void;
    };
  }
}

export {};
