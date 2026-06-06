import { SurfaceCard } from '../../../shared/ui/SurfaceCard';

type ActivityFeedProps = {
  logs: string[];
  lastDone: string | null;
};

export function ActivityFeed(props: ActivityFeedProps) {
  const visibleLogs = props.logs.slice(-8).reverse();

  return (
    <SurfaceCard
      title="运行轨迹"
      description="保留最近关键日志，完整原始日志仍以本地 logs 目录为准。"
    >
      {props.lastDone && (
        <div className="mb-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          最近完成：{props.lastDone}
        </div>
      )}

      {visibleLogs.length > 0 ? (
        <ol className="space-y-3">
          {visibleLogs.map((line, index) => (
            <li key={`${index}-${line}`} className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
              <p className="text-xs leading-6 text-slate-300">{line}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-500">
          等待同步任务开始...
        </div>
      )}
    </SurfaceCard>
  );
}
