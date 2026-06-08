import { SurfaceCard } from '../../../shared/ui/SurfaceCard';

type CommandHeroProps = {
  title: string;
  detail: string;
  actionLabel: string;
  busy: boolean;
  blockReason: string | null;
  runnableCount: number;
  siteLabel: string;
  modeLabel: string;
  lastDone: string | null;
  onStartSync: () => void;
};

export function CommandHero(props: CommandHeroProps) {
  return (
    <SurfaceCard title="执行摘要" description="右栏汇总本轮同步范围、状态和主动作。">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">本轮计划</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{props.title}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                props.busy
                  ? 'border border-amber-300/25 bg-amber-300/10 text-amber-100'
                  : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
              }`}
            >
              {props.busy ? '同步中' : '待启动'}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">{props.detail}</p>
        </div>

        <dl className="space-y-2">
          <StatusItem label="待执行分组" value={`${props.runnableCount} 个`} />
          <StatusItem label="当前站点" value={props.siteLabel} />
          <StatusItem label="执行模式" value={props.modeLabel} />
          <StatusItem label="当前状态" value={props.busy ? '同步中' : '就绪'} />
        </dl>

        {props.lastDone && (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-400">
            最近完成于 <span className="text-slate-200">{props.lastDone}</span>
          </p>
        )}

        <div className="grid gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={props.onStartSync}
            disabled={props.busy || Boolean(props.blockReason)}
            className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {props.actionLabel}
          </button>
          {props.blockReason ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
              {props.blockReason}
            </p>
          ) : (
            <p className="text-xs leading-5 text-slate-500">当前条件满足，可以直接发起同步。</p>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function StatusItem(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{props.label}</dt>
      <dd className="text-sm font-medium text-slate-100">{props.value}</dd>
    </div>
  );
}
