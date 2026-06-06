import type { AsinGroup } from '../../command-center/model';
import { SurfaceCard } from '../../../shared/ui/SurfaceCard';

type GroupEditorPanelProps = {
  groups: AsinGroup[];
  activeGroupId: string;
  editName: string;
  editAsinText: string;
  excelPreview: string;
  disabled?: boolean;
  onSelectGroup: (id: string) => void;
  onEditName: (value: string) => void;
  onEditAsinText: (value: string) => void;
  onNewGroup: () => void;
  onDeleteGroup: () => void;
};

export function GroupEditorPanel(props: GroupEditorPanelProps) {
  return (
    <SurfaceCard
      title="分组编辑"
      description="每个分组输出一个独立 Excel。价格空值会自动重试，最终失败会保留截图和价格调试 JSON。"
    >
      {props.disabled && (
        <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
          同步进行中，暂时不能修改分组设置。
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-400" htmlFor="group-editor-select">
          当前编辑分组
        </label>
        <select
          id="group-editor-select"
          value={props.activeGroupId}
          onChange={(event) => props.onSelectGroup(event.target.value)}
          disabled={props.disabled}
          className="w-full min-w-[15rem] flex-1 rounded-2xl px-3 py-2.5 text-sm md:w-auto"
        >
          {props.groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}（{group.asins.length} 个 ASIN）
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={props.onNewGroup}
          disabled={props.disabled}
          className="rounded-2xl px-3 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          新建分组
        </button>
        <button
          type="button"
          onClick={props.onDeleteGroup}
          disabled={props.disabled}
          className="rounded-2xl border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-100 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          删除当前分组
        </button>
      </div>

      <div className="mt-5">
        <label className="text-xs text-slate-400" htmlFor="group-editor-name">
          分组名称
        </label>
        <input
          id="group-editor-name"
          type="text"
          value={props.editName}
          onChange={(event) => props.onEditName(event.target.value)}
          disabled={props.disabled}
          className="mt-2 w-full rounded-2xl px-4 py-3 text-sm"
        />
      </div>

      <div className="mt-5">
        <label className="text-xs text-slate-400" htmlFor="group-editor-asins">
          本组 ASIN / Amazon 链接（每行一个）
        </label>
        <textarea
          id="group-editor-asins"
          value={props.editAsinText}
          onChange={(event) => props.onEditAsinText(event.target.value)}
          disabled={props.disabled}
          rows={10}
          spellCheck={false}
          className="mt-2 w-full resize-y rounded-2xl px-4 py-3 font-mono text-sm"
        />
      </div>

      {props.excelPreview && (
        <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-xs text-sky-100">
          今日输出预览：<span className="font-mono">{props.excelPreview}</span>
        </div>
      )}
    </SurfaceCard>
  );
}
