import type { CommandGroupListItem } from '../selectors';
import { SurfaceCard } from '../../../shared/ui/SurfaceCard';

type GroupListRailProps = {
  mode: 'list';
  groupItems: CommandGroupListItem[];
  busy: boolean;
  onToggleGroup: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

type WorkspaceSideRailProps = {
  mode: 'summary';
  onOpenExcel: () => void;
  onOpenDataFolder: () => void;
  onOpenLogsFolder: () => void;
  issueLogs: string[];
};

type ExecutionRailProps = GroupListRailProps | WorkspaceSideRailProps;

export function ExecutionRail(props: ExecutionRailProps) {
  if (props.mode === 'list') {
    return <GroupQueuePanel {...props} />;
  }

  return <WorkspaceSupportPanel {...props} />;
}

function GroupQueuePanel(props: GroupListRailProps) {
  const selectedCount = props.groupItems.filter((item) => item.selected).length;
  const pendingCount = props.groupItems.filter((item) => !item.selectable).length;

  return (
    <SurfaceCard
      title="待执行分组"
      description="按分组排队本轮任务，空分组保留在列表里但不会进入执行。"
      headerSlot={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusPill label={`已选 ${selectedCount}`} />
          <StatusPill label={`待补 ${pendingCount}`} />
          <button
            type="button"
            onClick={props.onSelectAll}
            disabled={props.busy}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-50"
          >
            全选
          </button>
          <button
            type="button"
            onClick={props.onClearSelection}
            disabled={props.busy}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-50"
          >
            清空
          </button>
        </div>
      }
    >
      <ul className="space-y-3">
        {props.groupItems.map((item) => (
          <GroupQueueItem
            key={item.id}
            item={item}
            busy={props.busy}
            onToggle={() => props.onToggleGroup(item.id)}
          />
        ))}
      </ul>
    </SurfaceCard>
  );
}

function WorkspaceSupportPanel(props: WorkspaceSideRailProps) {
  return (
    <div className="space-y-5">
      <SurfaceCard title="文件入口" description="同步后直接回看结果文件、数据目录和日志目录。">
        <div className="grid gap-2">
          <QuickLink label="打开今日 Excel" detail="查看当前批次导出的结果文件。" onClick={props.onOpenExcel} />
          <QuickLink
            label="打开 data 目录"
            detail="回到分组结果与原始缓存所在目录。"
            onClick={props.onOpenDataFolder}
          />
          <QuickLink
            label="打开日志目录"
            detail="快速定位日志、截图与价格调试文件。"
            onClick={props.onOpenLogsFolder}
          />
        </div>
      </SurfaceCard>

      <IssueTracePanel issueLogs={props.issueLogs} />
    </div>
  );
}

function GroupQueueItem(props: {
  item: CommandGroupListItem;
  busy: boolean;
  onToggle: () => void;
}) {
  const { item } = props;

  return (
    <li
      className={`rounded-2xl border px-4 py-3 transition ${
        item.selectable
          ? item.selected
            ? 'border-amber-300/30 bg-amber-300/[0.06]'
            : 'border-white/10 bg-white/[0.02]'
          : 'border-white/10 bg-white/[0.02] opacity-55'
      }`}
    >
      <label
        className={`flex items-start gap-3 transition ${item.selectable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <input
          type="checkbox"
          checked={item.selected}
          disabled={!item.selectable || props.busy}
          onChange={props.onToggle}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-100">{item.name}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] ${
                item.selected ? 'bg-amber-300/15 text-amber-100' : 'bg-white/[0.06] text-slate-400'
              }`}
            >
              {item.selectable ? `${item.asinCount} 个 ASIN` : '待补充 ASIN'}
            </span>
            {item.selectable && (
              <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-100">
                {item.selected ? '已加入队列' : '可执行'}
              </span>
            )}
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {item.selectable ? item.asins.join(' / ') : '当前分组暂无 ASIN，暂不进入执行队列。'}
          </span>
        </span>
      </label>
    </li>
  );
}

function IssueTracePanel(props: { issueLogs: string[] }) {
  return (
    <SurfaceCard title="异常留痕" description="同步失败后先看落盘目录，再看最近异常摘要。">
      <div className="space-y-3 text-sm text-slate-300">
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">失败截图目录：`logs/screenshots`</p>
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">价格调试目录：`logs/price-debug`</p>
        {props.issueLogs.length > 0 ? (
          <ul className="space-y-2">
            {props.issueLogs.map((line, index) => (
              <li
                key={`${index}-${line}`}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-100"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-5 text-slate-500">当前没有新增异常留痕。</p>
        )}
      </div>
    </SurfaceCard>
  );
}

function QuickLink(props: { label: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.07]"
    >
      <span className="block text-sm font-medium text-slate-200">{props.label}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{props.detail}</span>
    </button>
  );
}

function StatusPill(props: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
      {props.label}
    </span>
  );
}
