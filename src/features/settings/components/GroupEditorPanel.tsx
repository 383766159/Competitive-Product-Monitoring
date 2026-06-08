import type { ReactNode } from 'react';
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
  const activeGroup = props.groups.find((group) => group.id === props.activeGroupId) ?? props.groups[0];

  return (
    <SurfaceCard
      title="分组管理"
      description="把分组选择、名称维护和 ASIN 文本编辑收进同一条维护轨道，输出规则保持不变。"
      headerSlot={<PanelBadge label={`${props.groups.length} 个分组`} />}
      className="h-full"
    >
      {props.disabled && (
        <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
          同步进行中，暂时不能修改分组设置。
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">当前轨道</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{activeGroup?.name ?? '未命名分组'}</p>
            <p className="mt-1 text-xs text-slate-500">
              {activeGroup ? `${activeGroup.asins.length} 个 ASIN，单独输出 1 份 Excel` : '请选择需要维护的分组'}
            </p>
          </div>

          <div role="list" aria-label="分组列表" className="space-y-2">
            {props.groups.map((group) => {
              const isActive = group.id === props.activeGroupId;

              return (
                <div key={group.id} role="listitem">
                  <button
                    type="button"
                    aria-pressed={isActive}
                    disabled={props.disabled}
                    onClick={() => props.onSelectGroup(group.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-amber-300/30 bg-amber-300/[0.08]'
                        : 'border-white/10 bg-white/[0.03] hover:border-[var(--line-strong)] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="block text-sm font-medium text-slate-100">{group.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {group.asins.length > 0 ? `${group.asins.length} 个 ASIN` : '待补充 ASIN'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="button"
              onClick={props.onNewGroup}
              disabled={props.disabled}
              className="rounded-xl px-3 py-2.5 text-sm font-medium"
            >
              新建分组
            </button>
            <button
              type="button"
              onClick={props.onDeleteGroup}
              disabled={props.disabled}
              className="rounded-xl border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-100 hover:bg-red-500/15"
            >
              删除当前分组
            </button>
          </div>
        </aside>

        <div className="space-y-3">
          <FieldBox label="分组名称" htmlFor="group-editor-name" hint="分组名称会直接参与 Excel 导出文件命名。">
            <input
              id="group-editor-name"
              type="text"
              value={props.editName}
              onChange={(event) => props.onEditName(event.target.value)}
              disabled={props.disabled}
              className="mt-3 w-full rounded-xl px-4 py-3 text-sm"
            />
          </FieldBox>

          <FieldBox
            label="本组 ASIN / Amazon 链接（每行一个）"
            htmlFor="group-editor-asins"
            hint="继续支持直接粘贴 ASIN 或整条 Amazon 链接，解析与保存逻辑不变。"
          >
            <textarea
              id="group-editor-asins"
              value={props.editAsinText}
              onChange={(event) => props.onEditAsinText(event.target.value)}
              disabled={props.disabled}
              rows={12}
              spellCheck={false}
              className="mt-3 w-full resize-y rounded-xl px-4 py-3 font-mono text-sm"
            />
          </FieldBox>

          {props.excelPreview && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-slate-400">
              输出预览路径：<span className="font-mono text-slate-300">{props.excelPreview}</span>
            </p>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function FieldBox(props: { label: string; htmlFor: string; hint: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <label className="text-xs font-medium text-slate-300" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      <p className="mt-1 text-xs leading-5 text-slate-500">{props.hint}</p>
      {props.children}
    </div>
  );
}

function PanelBadge(props: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
      {props.label}
    </span>
  );
}
