import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommandCenterView } from './features/command-center/components/CommandCenterView';
import type { AmazonMarketplace, AsinGroup, UserConfig } from './features/command-center/model';
import {
  getCommandGroupItems,
  getRunnableGroups,
  getSelectableGroupIds,
} from './features/command-center/selectors';
import { buildCommandSummary, getSyncBlockReason, parseAsinText } from './features/command-center/utils';
import { CrawlerSettingsPanel } from './features/settings/components/CrawlerSettingsPanel';
import { GroupEditorPanel } from './features/settings/components/GroupEditorPanel';
import { previewExcelPath } from './previewExcelPath';

const MARKETPLACE_OPTIONS: Array<{ code: AmazonMarketplace; label: string; host: string }> = [
  { code: 'us', label: '美国', host: 'amazon.com' },
  { code: 'de', label: '德国', host: 'amazon.de' },
  { code: 'fr', label: '法国', host: 'amazon.fr' },
  { code: 'it', label: '意大利', host: 'amazon.it' },
  { code: 'es', label: '西班牙', host: 'amazon.es' },
];

type ActivityLogEntry = {
  message: string;
  level: 'info' | 'issue';
};

type SyncStage = 'idle' | 'saving' | 'syncing';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatSaveError(error: string | unknown): string {
  return `保存配置失败：${typeof error === 'string' ? error : getErrorMessage(error)}`;
}

function formatLoadError(error: string | unknown): string {
  return `加载配置失败：${typeof error === 'string' ? error : getErrorMessage(error)}`;
}

function formatResetDefaultsError(error: string | unknown): string {
  return `恢复默认配置失败：${typeof error === 'string' ? error : getErrorMessage(error)}`;
}

function newGroupId(): string {
  return crypto.randomUUID();
}

export default function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [paths, setPaths] = useState<{ dataDir: string; excelPath: string; configPath: string } | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editName, setEditName] = useState('');
  const [editAsinText, setEditAsinText] = useState('');
  const [syncStage, setSyncStage] = useState<SyncStage>('idle');
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);
  const [lastDone, setLastDone] = useState<string | null>(null);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [tab, setTab] = useState<'sync' | 'settings'>('sync');
  const syncInFlightRef = useRef(false);

  const tracker = typeof window !== 'undefined' ? window.tracker : undefined;

  const pushLog = useCallback((message: string, level: ActivityLogEntry['level'] = 'info') => {
    setActivityEntries((prev) => [...prev.slice(-399), { message, level }]);
  }, []);

  const applyEditingGroupToForm = useCallback((group: AsinGroup | undefined) => {
    if (!group) return;
    setEditName(group.name);
    setEditAsinText(group.asins.join('\n'));
  }, []);

  const loadSettings = useCallback(async () => {
    if (!tracker) return;
    setLoadError(null);
    try {
      const [cfg, nextPaths] = await Promise.all([tracker.getConfig(), tracker.getPaths()]);
      setConfig(cfg);
      setPaths(nextPaths);
      const group = cfg.groups.find((item) => item.id === cfg.activeGroupId) ?? cfg.groups[0];
      applyEditingGroupToForm(group);
      setSelectedIds(new Set(getSelectableGroupIds(cfg)));
    } catch (error) {
      setLoadError(formatLoadError(error));
    }
  }, [tracker, applyEditingGroupToForm]);

  useEffect(() => {
    if (!tracker) {
      setPreloadError(
        '未检测到 window.tracker（preload 未正常加载）。请先执行 npm run build:electron，再重新运行 npm run dev。',
      );
      return;
    }
    void loadSettings();
  }, [tracker, loadSettings]);

  useEffect(() => {
    if (syncStage !== 'idle' && tab === 'settings') {
      setTab('sync');
    }
  }, [syncStage, tab]);

  useEffect(() => {
    if (!tracker) return;
    const off = tracker.onSyncProgress((progress) => {
      if (progress.type === 'log' && progress.message) pushLog(progress.message);
      if (progress.type === 'group-start' && progress.message) pushLog(`分组开始 ${progress.message}`);
      if (progress.type === 'group-done' && progress.message) pushLog(`分组完成 ${progress.message}`);
      if (progress.type === 'asin-start' && progress.asin) pushLog(`  -> 抓取 ${progress.asin}`);
      if (progress.type === 'asin-done' && progress.asin) pushLog(`  完成 ${progress.asin}`);
      if (progress.type === 'done' && progress.message) setLastDone(progress.message);
      if (progress.type === 'error' && progress.message) pushLog(`错误: ${progress.message}`, 'issue');
    });
    return off;
  }, [tracker, pushLog]);

  function mergeEditingIntoConfig(base: UserConfig): UserConfig {
    const asins = parseAsinText(editAsinText);
    return {
      ...base,
      groups: base.groups.map((group) =>
        group.id === base.activeGroupId
          ? {
              ...group,
              name: editName.trim() || '未命名分组',
              asins,
            }
          : group,
      ),
    };
  }

  const effectiveConfig = useMemo(() => (config ? mergeEditingIntoConfig(config) : null), [config, editAsinText, editName]);

  const editingGroup = useMemo(
    () =>
      effectiveConfig?.groups.find((group) => group.id === effectiveConfig.activeGroupId) ?? effectiveConfig?.groups[0],
    [effectiveConfig],
  );

  const selectableGroupIds = useMemo(() => getSelectableGroupIds(effectiveConfig), [effectiveConfig]);

  const syncSelectedGroups = useMemo(
    () => getRunnableGroups(effectiveConfig, selectedIds),
    [effectiveConfig, selectedIds],
  );

  const commandGroupItems = useMemo(
    () => getCommandGroupItems(effectiveConfig, selectedIds),
    [effectiveConfig, selectedIds],
  );

  const syncBlockReason = useMemo(
    () => getSyncBlockReason(effectiveConfig, selectedIds, syncStage !== 'idle'),
    [effectiveConfig, selectedIds, syncStage],
  );

  const commandSummary = useMemo(
    () => {
      if (!effectiveConfig) return null;
      if (syncStage === 'saving') {
        return {
          title: `正在准备同步 ${syncSelectedGroups.length} 个分组`,
          detail: '正在保存最新配置，完成后会自动开始同步任务。',
          actionLabel: '准备同步中',
        };
      }
      return buildCommandSummary(effectiveConfig, syncSelectedGroups, syncStage === 'syncing');
    },
    [effectiveConfig, syncSelectedGroups, syncStage],
  );

  const activityLogs = useMemo(() => activityEntries.map((entry) => entry.message), [activityEntries]);

  const issueLogs = useMemo(
    () =>
      activityEntries
        .filter((entry) => entry.level === 'issue')
        .map((entry) => entry.message)
        .slice(-3)
        .reverse(),
    [activityEntries],
  );
  const selectedGroupCount = useMemo(
    () => commandGroupItems.filter((item) => item.selected).length,
    [commandGroupItems],
  );

  function onSelectEditingGroup(id: string) {
    if (!config) return;
    const next = { ...mergeEditingIntoConfig(config), activeGroupId: id };
    setConfig(next);
    applyEditingGroupToForm(next.groups.find((group) => group.id === id));
    setSaveHint(null);
  }

  function onEditNameChange(value: string) {
    setEditName(value);
    setSaveHint(null);
  }

  function onEditAsinTextChange(value: string) {
    setEditAsinText(value);
    setSaveHint(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllWithAsins() {
    setSelectedIds(new Set(selectableGroupIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function onNewGroup() {
    if (!config) return;
    const merged = mergeEditingIntoConfig(config);
    const group: AsinGroup = { id: newGroupId(), name: '新分组', asins: [] };
    const next = { ...merged, groups: [...merged.groups, group], activeGroupId: group.id };
    setConfig(next);
    applyEditingGroupToForm(group);
    setSaveHint('已新建分组，填写后记得点“保存设置”。');
  }

  function onDeleteEditingGroup() {
    if (!config || config.groups.length <= 1) {
      setSaveHint('至少保留一个分组。');
      return;
    }

    const merged = mergeEditingIntoConfig(config);
    const nextGroups = merged.groups.filter((group) => group.id !== merged.activeGroupId);
    const next = { ...merged, groups: nextGroups, activeGroupId: nextGroups[0].id };
    setConfig(next);
    applyEditingGroupToForm(nextGroups[0]);
    setSelectedIds((prev) => {
      const nextIds = new Set(prev);
      nextIds.delete(merged.activeGroupId);
      return nextIds;
    });
    setSaveHint('当前分组已删除，保存设置后会写入磁盘。');
  }

  async function onSaveConfig() {
    if (!tracker || !effectiveConfig || syncStage !== 'idle') return;
    setSaveHint(null);
    try {
      const result = await tracker.saveConfig(effectiveConfig);
      if (!result.ok) {
        setSaveHint(formatSaveError(result.error));
        return;
      }
      setSaveHint('设置已保存到 config.json');
      await loadSettings();
    } catch (error) {
      setSaveHint(formatSaveError(error));
    }
  }

  async function onResetDefaults() {
    if (!tracker || syncStage !== 'idle') return;
    try {
      const defaults = await tracker.getDefaultConfig();
      setConfig(defaults);
      applyEditingGroupToForm(defaults.groups[0]);
      setSelectedIds(new Set(getSelectableGroupIds(defaults)));
      setSaveHint('已恢复默认配置，请点击“保存设置”写入磁盘。');
    } catch (error) {
      setSaveHint(formatResetDefaultsError(error));
    }
  }

  function onMarketplaceChange(value: AmazonMarketplace) {
    if (!config) return;
    setConfig({ ...config, marketplace: value });
    setSaveHint(null);
  }

  function onHeadedChange(value: boolean) {
    if (!config) return;
    setConfig({ ...config, headless: !value });
    setSaveHint(null);
  }

  function onZipCodeChange(value: string) {
    if (!config) return;
    setConfig({ ...config, zipCode: value.replace(/\D/g, '').slice(0, 5) });
    setSaveHint(null);
  }

  function onZipHomeWaitSecChange(value: number) {
    if (!config) return;
    setConfig({
      ...config,
      zipHomeWaitSec: Math.min(120, Math.max(0, Number.isFinite(value) ? value : 0)),
    });
    setSaveHint(null);
  }

  function onZipModalWaitSecChange(value: number) {
    if (!config) return;
    setConfig({
      ...config,
      zipModalWaitSec: Math.min(120, Math.max(0, Number.isFinite(value) ? value : 0)),
    });
    setSaveHint(null);
  }

  async function onSync() {
    if (!effectiveConfig || !tracker || syncInFlightRef.current) return;
    const runnable = getRunnableGroups(effectiveConfig, selectedIds);
    if (runnable.length === 0) {
      setSaveHint('请在同步页勾选至少一个含 ASIN 的分组。');
      return;
    }

    const payload = effectiveConfig;
    syncInFlightRef.current = true;
    setSyncStage('saving');
    setSaveHint(null);
    try {
      try {
        const saveResult = await tracker.saveConfig(payload);
        if (!saveResult.ok) {
          const message = formatSaveError(saveResult.error);
          setSaveHint(message);
          pushLog(message, 'issue');
          return;
        }
      } catch (error) {
        const message = formatSaveError(error);
        setSaveHint(message);
        pushLog(message, 'issue');
        return;
      }

      setConfig(payload);
      setSyncStage('syncing');
      pushLog(`开始同步 ${runnable.length} 个分组`);

      try {
        const result = await tracker.syncAsins({ groupIds: runnable.map((group) => group.id) });
        if (!result.ok) {
          pushLog(`同步结束（有失败项）：${result.error || '请查看上方日志'}`, 'issue');
        } else {
          pushLog('全部选中分组同步完成');
          await loadSettings();
        }
      } catch (error) {
        pushLog(`异常：${error instanceof Error ? error.message : String(error)}`, 'issue');
      }
    } finally {
      syncInFlightRef.current = false;
      setSyncStage('idle');
    }
  }

  const headed = effectiveConfig ? !effectiveConfig.headless : false;
  const siteLabel = MARKETPLACE_OPTIONS.find((site) => site.code === effectiveConfig?.marketplace)?.label ?? '美国';
  const modeLabel = headed ? '有头调试' : '无头批量';
  const settingsLocked = syncStage !== 'idle';
  const syncTabId = 'command-center-tab-sync';
  const settingsTabId = 'command-center-tab-settings';
  const syncPanelId = 'command-center-panel-sync';
  const settingsPanelId = 'command-center-panel-settings';
  const editExcelPreview =
    paths?.dataDir && editingGroup
      ? previewExcelPath(editName || editingGroup.name, paths.dataDir, effectiveConfig?.marketplace ?? 'us')
      : '';

  return (
    <div className="min-h-screen px-4 py-5 text-slate-100 md:px-6">
      {preloadError && (
        <div className="mx-auto mb-4 max-w-7xl rounded-2xl border border-red-400/25 bg-red-500/12 p-4 text-sm text-red-100">
          {preloadError}
        </div>
      )}

      {loadError && (
        <div className="mx-auto mb-4 flex max-w-7xl flex-col gap-3 rounded-2xl border border-red-400/25 bg-red-500/12 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              void loadSettings();
            }}
            className="rounded-full border border-red-200/30 bg-red-100/10 px-4 py-2 text-xs font-medium text-red-50 hover:bg-red-100/15"
          >
            重试加载
          </button>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="mb-5 overflow-hidden rounded-[24px] border border-white/10 bg-[var(--bg-shell)]/95">
          <div className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-sky-300/24 bg-sky-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-sky-100">
                  Amazon Competitor Tracker
                </span>
                {syncStage !== 'idle' && (
                  <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] tracking-[0.16em] text-amber-100">
                    任务运行中
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-['Bahnschrift'] text-2xl tracking-[0.06em] text-slate-50">执行工作台</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  左侧排队待执行分组，右侧集中处理摘要、入口与异常，底部保留本轮运行轨迹。
                </p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <p>
                  配置文件：<span className="font-mono text-slate-300">{paths?.configPath ?? '-'}</span>
                </p>
                {lastDone && <p>最近完成于：{lastDone}</p>}
              </div>
            </div>

            <div className="flex w-full max-w-[420px] flex-col gap-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <SummaryCard label="当前站点" value={siteLabel} />
                <SummaryCard label="执行模式" value={modeLabel} />
                <SummaryCard label="已选分组" value={String(selectedGroupCount)} />
              </div>

              <nav role="tablist" aria-label="首页切页" className="flex flex-wrap gap-2">
                {(
                  [
                    ['sync', '同步面板', syncTabId, syncPanelId],
                    ['settings', '高级设置', settingsTabId, settingsPanelId],
                  ] as const
                ).map(([id, label, tabId, panelId]) => (
                  <button
                    key={id}
                    id={tabId}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    aria-controls={panelId}
                    tabIndex={tab === id ? 0 : -1}
                    onClick={() => setTab(id)}
                    disabled={settingsLocked && id === 'settings'}
                    className={`rounded-xl px-4 py-2 text-sm transition ${
                      tab === id
                        ? 'bg-sky-300 text-slate-950'
                        : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {tab === 'settings' && effectiveConfig && (
          <section
            id={settingsPanelId}
            role="tabpanel"
            aria-labelledby={settingsTabId}
            className="mb-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_320px]"
          >
            <GroupEditorPanel
              groups={effectiveConfig.groups}
              activeGroupId={effectiveConfig.activeGroupId}
              editName={editName}
              editAsinText={editAsinText}
              excelPreview={editExcelPreview}
              disabled={settingsLocked}
              onSelectGroup={onSelectEditingGroup}
              onEditName={onEditNameChange}
              onEditAsinText={onEditAsinTextChange}
              onNewGroup={onNewGroup}
              onDeleteGroup={onDeleteEditingGroup}
            />

            <CrawlerSettingsPanel
              marketplace={effectiveConfig.marketplace}
              marketplaceOptions={MARKETPLACE_OPTIONS}
              headed={headed}
              zipCode={effectiveConfig.zipCode}
              zipHomeWaitSec={effectiveConfig.zipHomeWaitSec ?? 10}
              zipModalWaitSec={effectiveConfig.zipModalWaitSec ?? 10}
              disabled={settingsLocked}
              onMarketplaceChange={onMarketplaceChange}
              onHeadedChange={onHeadedChange}
              onZipCodeChange={onZipCodeChange}
              onZipHomeWaitSecChange={onZipHomeWaitSecChange}
              onZipModalWaitSecChange={onZipModalWaitSecChange}
              onSave={onSaveConfig}
              onResetDefaults={onResetDefaults}
            />
          </section>
        )}

        {tab === 'sync' && effectiveConfig && commandSummary && (
          <section id={syncPanelId} role="tabpanel" aria-labelledby={syncTabId}>
            <CommandCenterView
              summary={commandSummary}
              blockReason={syncBlockReason}
              busy={syncStage !== 'idle'}
              runnableGroups={syncSelectedGroups}
              groupItems={commandGroupItems}
              activityLogs={activityLogs}
              issueLogs={issueLogs}
              lastDone={lastDone}
              siteLabel={siteLabel}
              modeLabel={modeLabel}
              onStartSync={onSync}
              onToggleGroup={toggleSelect}
              onSelectAll={selectAllWithAsins}
              onClearSelection={clearSelection}
              onOpenExcel={() => {
                void tracker?.openExcel();
              }}
              onOpenDataFolder={() => {
                void tracker?.openDataFolder();
              }}
              onOpenLogsFolder={() => {
                void tracker?.openLogsFolder();
              }}
            />
          </section>
        )}

        {saveHint && (
          <p className="mb-4 rounded-3xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">
            {saveHint}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{props.label}</div>
      <div className="mt-1 text-sm font-medium text-slate-100">{props.value}</div>
    </div>
  );
}
