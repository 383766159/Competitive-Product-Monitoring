import { contextBridge, ipcRenderer } from 'electron';
import type { SyncAsinsOptions, SyncProgress } from './ipcTypes';

export type AsinGroupPayload = {
  id: string;
  name: string;
  asins: string[];
};

export type MarketplaceZipSettingsPayload = {
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
};

export type UserConfigPayload = {
  headless: boolean;
  marketplace: 'us' | 'de' | 'fr' | 'it' | 'es';
  zipSettings: Record<'us' | 'de' | 'fr' | 'it' | 'es', MarketplaceZipSettingsPayload>;
  locale: 'en-US';
  activeGroupId: string;
  groups: AsinGroupPayload[];
};

export type SaveConfigResult =
  | { ok: true }
  | { ok: false; error: string };

contextBridge.exposeInMainWorld('tracker', {
  syncAsins: (opts?: SyncAsinsOptions) =>
    ipcRenderer.invoke('sync-asins', opts) as Promise<{ ok: boolean; error?: string }>,
  openExcel: (groupId?: string) =>
    ipcRenderer.invoke('open-excel', groupId) as Promise<{ ok: boolean }>,
  openDataFolder: () => ipcRenderer.invoke('open-data-folder') as Promise<{ ok: boolean }>,
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder') as Promise<{ ok: boolean }>,
  getPaths: () =>
    ipcRenderer.invoke('get-paths') as Promise<{
      dataDir: string;
      excelPath: string;
      configPath: string;
    }>,
  getConfig: () => ipcRenderer.invoke('get-config') as Promise<UserConfigPayload>,
  getDefaultConfig: () => ipcRenderer.invoke('get-default-config') as Promise<UserConfigPayload>,
  saveConfig: (cfg: UserConfigPayload) =>
    ipcRenderer.invoke('save-config', cfg) as Promise<SaveConfigResult>,
  pickExcelPath: () =>
    ipcRenderer.invoke('pick-excel-path') as Promise<{ ok: false } | { ok: true; path: string }>,
  onSyncProgress: (cb: (p: SyncProgress) => void) => {
    const listener = (_: Electron.IpcRendererEvent, p: SyncProgress) => cb(p);
    ipcRenderer.on('sync-progress', listener);
    return () => ipcRenderer.removeListener('sync-progress', listener);
  },
});
