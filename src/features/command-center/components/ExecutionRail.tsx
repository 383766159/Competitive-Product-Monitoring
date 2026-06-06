import type { CommandGroupListItem } from '../selectors';
import { SurfaceCard } from '../../../shared/ui/SurfaceCard';

type ExecutionRailProps = {
  groupItems: CommandGroupListItem[];
  busy: boolean;
  onToggleGroup: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenExcel: () => void;
  onOpenDataFolder: () => void;
  onOpenLogsFolder: () => void;
  issueLogs: string[];
};

export function ExecutionRail(props: ExecutionRailProps) {
  return (
    <aside className="space-y-5">
      <SurfaceCard
        title="待执行分组"
        description="只展示本轮可调度的任务范围，空分组会保留但不可执行。"
        headerSlot={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={props.onSelectAll}
              disabled={props.busy}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              全选
            </button>
            <button
              type="button"
              onClick={props.onClearSelection}
              disabled={props.busy}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              清空
            </button>
          </div>
        }
      >
        <ul className="space-y-3">
          {props.groupItems.map((item) => (
            <li key={item.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-3xl border p-4 transition ${
                  item.selected ? 'border-amber-300/30 bg-amber-300/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                } ${item.selectable ? '' : 'cursor-not-allowed opacity-45'}`}
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  disabled={!item.selectable || props.busy}
                  onChange={() => props.onToggleGroup(item.id)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-100">{item.name}</span>
                  <span className="mt-2 block text-xs text-slate-400">
                    {item.selectable ? `${item.asinCount} 个 ASIN` : '当前分组暂无 ASIN'}
                  </span>
                  {item.selectable && (
                    <span className="mt-2 line-clamp-2 block text-[11px] text-slate-500">{item.asins.join(' / ')}</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </SurfaceCard>

      <SurfaceCard title="快速入口" description="保留常用文件与日志入口，不再分散在首页多个位置。">
        <div className="grid gap-2">
          <QuickLink label="打开今日 Excel" onClick={props.onOpenExcel} />
          <QuickLink label="打开 data 目录" onClick={props.onOpenDataFolder} />
          <QuickLink label="打开日志目录" onClick={props.onOpenLogsFolder} />
        </div>
      </SurfaceCard>

      <SurfaceCard title="异常留痕" description="同步失败时优先检查截图和价格调试留痕。">
        <div className="space-y-3 text-sm text-slate-300">
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">失败截图：`logs/screenshots`</p>
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">价格调试：`logs/price-debug`</p>
          {props.issueLogs.length > 0 ? (
            <ul className="space-y-2">
              {props.issueLogs.map((line, index) => (
                <li
                  key={`${index}-${line}`}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-100"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">当前没有新增异常日志。</p>
          )}
        </div>
      </SurfaceCard>
    </aside>
  );
}

function QuickLink(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/10"
    >
      {props.label}
    </button>
  );
}
