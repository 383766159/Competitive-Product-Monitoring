import { SurfaceCard } from '../../../shared/ui/SurfaceCard';

type ActivityFeedProps = {
  logs: string[];
  lastDone: string | null;
};

export function ActivityFeed(props: ActivityFeedProps) {
  const visibleLogs = props.logs.slice(-12).reverse();

  return (
    <SurfaceCard title="运行轨迹" description="保留最近关键进度，完整原始日志仍以本地 logs 目录为准。">
      {props.lastDone && (
        <div className="mb-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          最近完成于 {props.lastDone}
        </div>
      )}

      {visibleLogs.length > 0 ? (
        <ol className="space-y-2">
          {visibleLogs.map((line, index) => (
            <li
              key={`${index}-${line}`}
              className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3"
            >
              <span className="font-mono text-[11px] leading-5 text-slate-500">
                {String(visibleLogs.length - index).padStart(2, '0')}
              </span>
              <p className="font-mono text-xs leading-5 text-slate-300">{line}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-4 py-6 text-sm text-slate-500">
          等待同步任务写入运行轨迹...
        </div>
      )}
    </SurfaceCard>
  );
}
