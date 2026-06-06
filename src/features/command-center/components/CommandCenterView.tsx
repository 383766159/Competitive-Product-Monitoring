import type { AsinGroup } from '../model';
import type { CommandGroupListItem } from '../selectors';
import { ActivityFeed } from './ActivityFeed';
import { CommandHero } from './CommandHero';
import { ExecutionRail } from './ExecutionRail';

type CommandCenterViewProps = {
  summary: {
    title: string;
    detail: string;
    actionLabel: string;
  };
  blockReason: string | null;
  busy: boolean;
  runnableGroups: AsinGroup[];
  groupItems: CommandGroupListItem[];
  activityLogs: string[];
  issueLogs: string[];
  lastDone: string | null;
  siteLabel: string;
  modeLabel: string;
  onStartSync: () => void;
  onToggleGroup: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpenExcel: () => void;
  onOpenDataFolder: () => void;
  onOpenLogsFolder: () => void;
};

export function CommandCenterView(props: CommandCenterViewProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
      <div className="space-y-5">
        <CommandHero
          title={props.summary.title}
          detail={props.summary.detail}
          actionLabel={props.summary.actionLabel}
          busy={props.busy}
          blockReason={props.blockReason}
          runnableCount={props.runnableGroups.length}
          siteLabel={props.siteLabel}
          modeLabel={props.modeLabel}
          lastDone={props.lastDone}
          onStartSync={props.onStartSync}
        />
        <ActivityFeed logs={props.activityLogs} lastDone={props.lastDone} />
      </div>

      <ExecutionRail
        groupItems={props.groupItems}
        busy={props.busy}
        onToggleGroup={props.onToggleGroup}
        onSelectAll={props.onSelectAll}
        onClearSelection={props.onClearSelection}
        onOpenExcel={props.onOpenExcel}
        onOpenDataFolder={props.onOpenDataFolder}
        onOpenLogsFolder={props.onOpenLogsFolder}
        issueLogs={props.issueLogs}
      />
    </section>
  );
}
