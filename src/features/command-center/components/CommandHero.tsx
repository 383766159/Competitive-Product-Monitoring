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
    <SurfaceCard className="overflow-hidden">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="inline-flex w-fit items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-amber-200">
              Command Center
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-[0.04em] text-slate-50">{props.title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">{props.detail}</p>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <StatusItem label="待执行分组" value={`${props.runnableCount} 个`} />
            <StatusItem label="站点" value={props.siteLabel} />
            <StatusItem label="模式" value={props.modeLabel} />
          </dl>

          {props.lastDone && (
            <p className="text-xs text-slate-500">
              上次完成时间：<span className="text-slate-300">{props.lastDone}</span>
            </p>
          )}
        </div>

        <div className="w-full max-w-sm rounded-[24px] border border-white/10 bg-white/5 p-4">
          <button
            type="button"
            onClick={props.onStartSync}
            disabled={props.busy || Boolean(props.blockReason)}
            className="w-full rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_32px_rgba(243,180,92,0.28)] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {props.actionLabel}
          </button>
          <p className="mt-3 text-xs text-slate-500">命令中心只保留一个主动作，其他入口统一收进侧栏。</p>
          {props.blockReason ? (
            <p className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              {props.blockReason}
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-200">当前条件已满足，可以直接开始同步任务。</p>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function StatusItem(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{props.label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-100">{props.value}</dd>
    </div>
  );
}
