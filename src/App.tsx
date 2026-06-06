import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { previewExcelPath } from './previewExcelPath';

type AsinGroup = {
  id: string;
  name: string;
  asins: string[];
};

type AmazonMarketplace = 'us' | 'de' | 'fr' | 'it' | 'es';

const MARKETPLACE_OPTIONS: Array<{ code: AmazonMarketplace; label: string; host: string }> = [
  { code: 'us', label: '美国', host: 'amazon.com' },
  { code: 'de', label: '德国', host: 'amazon.de' },
  { code: 'fr', label: '法国', host: 'amazon.fr' },
  { code: 'it', label: '意大利', host: 'amazon.it' },
  { code: 'es', label: '西班牙', host: 'amazon.es' },
];

type UserConfig = {
  headless: boolean;
  marketplace: AmazonMarketplace;
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
  locale: 'en-US';
  activeGroupId: string;
  groups: AsinGroup[];
};

function newGroupId(): string {
  return crypto.randomUUID();
}

function parseAsinText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string) => {
    const urlMatch = raw.match(/(?:\/(?:dp|gp\/product)\/|[?&]asin=)([A-Z0-9]{10})(?:[^A-Z0-9]|$)/i);
    const asin = (urlMatch?.[1] ?? raw).trim().toUpperCase();
    if (/^[A-Z0-9]{10}$/.test(asin) && !seen.has(asin)) {
      seen.add(asin);
      out.push(asin);
    }
  };

  const urlRe = /(?:\/(?:dp|gp\/product)\/|[?&]asin=)([A-Z0-9]{10})(?:[^A-Z0-9]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text)) !== null) push(match[1]);

  text
    .split(/[\s,，、\n\r]+/)
    .filter(Boolean)
    .forEach(push);
  return out;
}

export default function App() {
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [paths, setPaths] = useState<{ dataDir: string; excelPath: string; configPath: string } | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editName, setEditName] = useState('');
  const [editAsinText, setEditAsinText] = useState('');
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastDone, setLastDone] = useState<string | null>(null);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [tab, setTab] = useState<'sync' | 'settings'>('sync');
  const logEndRef = useRef<HTMLSpanElement>(null);

  const tracker = typeof window !== 'undefined' ? window.tracker : undefined;

  const pushLog = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-399), line]);
  }, []);

  const editingGroup = useMemo(
    () => config?.groups.find((group) => group.id === config.activeGroupId) ?? config?.groups[0],
    [config],
  );

  const syncSelectedGroups = useMemo(() => {
    if (!config) return [];
    return config.groups.filter((group) => selectedIds.has(group.id) && group.asins.length > 0);
  }, [config, selectedIds]);

  const applyEditingGroupToForm = useCallback((group: AsinGroup | undefined) => {
    if (!group) return;
    setEditName(group.name);
    setEditAsinText(group.asins.join('\n'));
  }, []);

  const loadSettings = useCallback(async () => {
    if (!tracker) return;
    const [cfg, nextPaths] = await Promise.all([tracker.getConfig(), tracker.getPaths()]);
    setConfig(cfg);
    setPaths(nextPaths);
    const group = cfg.groups.find((item) => item.id === cfg.activeGroupId) ?? cfg.groups[0];
    applyEditingGroupToForm(group);
    setSelectedIds(new Set(cfg.groups.filter((item) => item.asins.length > 0).map((item) => item.id)));
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
    if (!tracker) return;
    const off = tracker.onSyncProgress((progress) => {
      if (progress.type === 'log' && progress.message) pushLog(progress.message);
      if (progress.type === 'group-start' && progress.message) pushLog(`分组开始 ${progress.message}`);
      if (progress.type === 'group-done' && progress.message) pushLog(`分组完成 ${progress.message}`);
      if (progress.type === 'asin-start' && progress.asin) pushLog(`  -> 抓取 ${progress.asin}`);
      if (progress.type === 'asin-done' && progress.asin) pushLog(`  完成 ${progress.asin}`);
      if (progress.type === 'done' && progress.message) setLastDone(progress.message);
      if (progress.type === 'error' && progress.message) pushLog(`错误: ${progress.message}`);
    });
    return off;
  }, [tracker, pushLog]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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

  function onSelectEditingGroup(id: string) {
    if (!config) return;
    const next = { ...mergeEditingIntoConfig(config), activeGroupId: id };
    setConfig(next);
    applyEditingGroupToForm(next.groups.find((group) => group.id === id));
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
    if (!config) return;
    setSelectedIds(new Set(config.groups.filter((group) => group.asins.length > 0).map((group) => group.id)));
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
    if (!tracker || !config) return;
    setSaveHint(null);
    const payload = mergeEditingIntoConfig(config);
    const result = await tracker.saveConfig(payload);
    if (!result.ok) {
      setSaveHint(result.error);
      return;
    }
    setSaveHint('设置已保存到 config.json');
    await loadSettings();
  }

  async function onResetDefaults() {
    if (!tracker) return;
    const defaults = await tracker.getDefaultConfig();
    setConfig(defaults);
    applyEditingGroupToForm(defaults.groups[0]);
    setSelectedIds(new Set(defaults.groups.filter((group) => group.asins.length > 0).map((group) => group.id)));
    setSaveHint('已恢复默认配置，请点击“保存设置”写入磁盘。');
  }

  async function onSync() {
    if (!config || !tracker) return;
    const runnable = syncSelectedGroups;
    if (runnable.length === 0) {
      setSaveHint('请在同步页勾选至少一个含 ASIN 的分组。');
      return;
    }

    setBusy(true);
    pushLog(`开始同步 ${runnable.length} 个分组`);

    const payload = mergeEditingIntoConfig(config);
    const saveResult = await tracker.saveConfig(payload);
    if (!saveResult.ok) {
      pushLog(`保存配置失败：${saveResult.error}`);
      setBusy(false);
      return;
    }
    setConfig(payload);

    try {
      const result = await tracker.syncAsins({ groupIds: runnable.map((group) => group.id) });
      if (!result.ok) {
        pushLog(`同步结束（有失败项）：${result.error || '请查看上方日志'}`);
      } else {
        pushLog('全部选中分组同步完成');
        await loadSettings();
      }
    } catch (error) {
      pushLog(`异常：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  const headed = config ? !config.headless : false;
  const siteLabel = MARKETPLACE_OPTIONS.find((site) => site.code === config?.marketplace)?.label ?? '美国';
  const syncButtonLabel =
    syncSelectedGroups.length > 0
      ? `开始同步（${syncSelectedGroups.length} 个分组）`
      : '开始同步';
  const editExcelPreview =
    paths?.dataDir && editingGroup
      ? previewExcelPath(editName || editingGroup.name, paths.dataDir, config?.marketplace ?? 'us')
      : '';

  return (
    <div className="min-h-screen px-4 py-6 text-slate-100 md:px-6">
      {preloadError && (
        <div className="mx-auto mb-4 max-w-7xl rounded-2xl border border-red-500/25 bg-red-950/70 p-4 text-sm text-red-100">
          {preloadError}
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-[28px] border border-white/10 bg-[rgba(7,14,28,0.82)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <span className="inline-flex w-fit items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-200">
                Amazon Competitor Tracker
              </span>
              <div>
                <h1 className="font-['Bahnschrift'] text-3xl tracking-[0.08em] text-slate-50">竞品监控工作台</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  面向 Amazon PDP 的分组抓取工具，重点优化价格提取、失败重试和调试留痕。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard label="站点" value={siteLabel} />
              <SummaryCard label="模式" value={headed ? '有头调试' : '无头批量'} />
              <SummaryCard label="分组数" value={String(config?.groups.length ?? 0)} />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-slate-500">
            <p>
              配置文件：<span className="font-mono text-slate-300">{paths?.configPath ?? '-'}</span>
            </p>
            {lastDone && <p>上次完成时间：{lastDone}</p>}
            <p>失败截图在 `logs/screenshots`，价格调试信息在 `logs/price-debug`。</p>
          </div>
        </header>

        <nav className="mb-5 flex gap-2">
          {(
            [
              ['sync', '同步面板'],
              ['settings', '高级设置'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                tab === id
                  ? 'bg-amber-300 text-slate-950 shadow-[0_10px_30px_rgba(243,180,92,0.28)]'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'settings' && config && (
          <section className="mb-5 grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
            <Panel title="分组配置" description="每个分组输出一个独立 Excel。价格空值会自动重试，最终失败会保留截图和价格调试 JSON。">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-slate-400">当前编辑分组</label>
                <select
                  value={config.activeGroupId}
                  onChange={(e) => onSelectEditingGroup(e.target.value)}
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm"
                >
                  {config.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}（{group.asins.length} 个 ASIN）
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onNewGroup}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  新建分组
                </button>
                <button
                  type="button"
                  onClick={onDeleteEditingGroup}
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15"
                >
                  删除当前分组
                </button>
              </div>

              <div className="mt-4">
                <label className="text-xs text-slate-400">分组名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setSaveHint(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm outline-none transition focus:border-amber-300/40"
                />
              </div>

              <div className="mt-4">
                <label className="text-xs text-slate-400">本组 ASIN / Amazon 链接（每行一个）</label>
                <textarea
                  value={editAsinText}
                  onChange={(e) => {
                    setEditAsinText(e.target.value);
                    setSaveHint(null);
                  }}
                  rows={10}
                  spellCheck={false}
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm outline-none transition focus:border-amber-300/40"
                />
              </div>

              {editExcelPreview && (
                <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/10 p-3 text-xs text-amber-100">
                  今日输出预览：<span className="font-mono">{editExcelPreview}</span>
                </div>
              )}
            </Panel>

            <Panel title="抓取设置" description="站点、浏览器模式和美国邮编都在这里控制。">
              <div>
                <label className="text-xs text-slate-400">Amazon 站点</label>
                <select
                  value={config.marketplace}
                  onChange={(e) => setConfig({ ...config, marketplace: e.target.value as AmazonMarketplace })}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm"
                >
                  {MARKETPLACE_OPTIONS.map((site) => (
                    <option key={site.code} value={site.code}>
                      {site.label}（{site.host}）
                    </option>
                  ))}
                </select>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <input
                  type="checkbox"
                  checked={headed}
                  onChange={(e) => setConfig({ ...config, headless: !e.target.checked })}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-100">开启有头浏览器</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    适合观察左上角邮编是否生效，以及价格区域是否正常渲染。
                  </span>
                </span>
              </label>

              {config.marketplace === 'us' ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="美国邮编">
                    <input
                      type="text"
                      maxLength={5}
                      value={config.zipCode}
                      onChange={(e) =>
                        setConfig({ ...config, zipCode: e.target.value.replace(/\D/g, '').slice(0, 5) })
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm"
                    />
                  </Field>

                  <Field label="首页等待（秒）">
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={config.zipHomeWaitSec ?? 10}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          zipHomeWaitSec: Math.min(120, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm"
                    />
                  </Field>

                  <Field label="弹层等待（秒）">
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={config.zipModalWaitSec ?? 10}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          zipModalWaitSec: Math.min(120, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm"
                    />
                  </Field>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
                    邮编设置只对美国站点生效，其他站点会直接按对应域名访问 PDP。
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
                  当前站点为欧洲站，不执行美国邮编设置。
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSaveConfig}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
                >
                  保存设置
                </button>
                <button
                  type="button"
                  onClick={onResetDefaults}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  恢复默认
                </button>
              </div>
            </Panel>
          </section>
        )}

        {tab === 'sync' && config && (
          <>
            <Panel
              title="选择要同步的分组"
              description="每个分组会生成一份独立 Excel。价格缺失会自动重试 3 次，仍失败会落盘截图和调试信息。"
              className="mb-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="text-sm text-slate-400">从这里控制本轮执行的分组范围。</div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-slate-400">站点</label>
                  <select
                    value={config.marketplace}
                    disabled={busy}
                    onChange={(e) => setConfig({ ...config, marketplace: e.target.value as AmazonMarketplace })}
                    className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200"
                  >
                    {MARKETPLACE_OPTIONS.map((site) => (
                      <option key={site.code} value={site.code}>
                        {site.label}（{site.host}）
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={selectAllWithAsins}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
                  >
                    全选
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
                  >
                    清空
                  </button>
                </div>
              </div>

              <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {config.groups.map((group) => {
                  const checked = selectedIds.has(group.id);
                  const disabled = group.asins.length === 0;
                  return (
                    <li key={group.id}>
                      <label
                        className={`flex h-full cursor-pointer items-start gap-3 rounded-3xl border p-4 transition ${
                          checked
                            ? 'border-amber-300/30 bg-amber-300/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleSelect(group.id)}
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-slate-100">{group.name}</span>
                          <span className="mt-2 block text-xs text-slate-400">
                            {disabled ? '当前分组暂无 ASIN' : `${group.asins.length} 个 ASIN`}
                          </span>
                          {!disabled && (
                            <span className="mt-2 line-clamp-3 block text-[11px] text-slate-500">
                              {group.asins.join(' / ')}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
                {headed ? '有头' : '无头'} | 站点 {siteLabel}
                {config.marketplace === 'us'
                  ? ` | 邮编 ${config.zipCode} | 首页等待 ${config.zipHomeWaitSec ?? 10}s | 弹层等待 ${
                      config.zipModalWaitSec ?? 10
                    }s`
                  : ' | 跳过美国邮编设置'}
                {syncSelectedGroups.length > 0 ? ` | 将运行：${syncSelectedGroups.map((group) => group.name).join('、')}` : ''}
              </div>
            </Panel>

            <section className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || syncSelectedGroups.length === 0}
                onClick={onSync}
                className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_10px_32px_rgba(243,180,92,0.28)] hover:bg-amber-200 disabled:opacity-50"
              >
                {busy ? '同步中...' : syncButtonLabel}
              </button>
              <button
                type="button"
                onClick={() => tracker?.openExcel()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                打开今日 Excel
              </button>
              <button
                type="button"
                onClick={() => tracker?.openDataFolder()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                打开 data 目录
              </button>
              <button
                type="button"
                onClick={() => tracker?.openLogsFolder()}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                打开日志目录
              </button>
            </section>
          </>
        )}

        {saveHint && (
          <p className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            {saveHint}
          </p>
        )}

        <section className="rounded-[28px] border border-white/10 bg-[rgba(7,14,28,0.82)] shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">运行日志</h2>
              <p className="mt-1 text-xs text-slate-500">界面保留最后 400 条日志，完整日志请查看 `logs` 目录。</p>
            </div>
          </div>
          <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap break-all px-5 py-4 font-mono text-xs leading-6 text-slate-300">
            {logs.length > 0 ? logs.join('\n') : '等待同步任务开始...'}
            <span ref={logEndRef} />
          </pre>
        </section>
      </div>
    </div>
  );
}

function Panel(props: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-[rgba(7,14,28,0.82)] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur ${
        props.className ?? ''
      }`}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">{props.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className="mt-1 text-sm font-medium text-slate-100">{props.value}</div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{props.label}</label>
      {props.children}
    </div>
  );
}
