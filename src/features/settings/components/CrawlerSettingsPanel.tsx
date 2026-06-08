import type { ReactNode } from 'react';
import type { AmazonMarketplace } from '../../command-center/model';
import { SurfaceCard } from '../../../shared/ui/SurfaceCard';

type MarketplaceOption = {
  code: AmazonMarketplace;
  label: string;
  host: string;
};

type CrawlerSettingsPanelProps = {
  marketplace: AmazonMarketplace;
  marketplaceOptions: MarketplaceOption[];
  headed: boolean;
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
  disabled?: boolean;
  onMarketplaceChange: (value: AmazonMarketplace) => void;
  onHeadedChange: (value: boolean) => void;
  onZipCodeChange: (value: string) => void;
  onZipHomeWaitSecChange: (value: number) => void;
  onZipModalWaitSecChange: (value: number) => void;
  onSave: () => void;
  onResetDefaults: () => void;
};

export function CrawlerSettingsPanel(props: CrawlerSettingsPanelProps) {
  const currentMarketplace = props.marketplaceOptions.find((site) => site.code === props.marketplace);
  const modeLabel = props.headed ? '有头调试' : '无头批量';

  return (
    <SurfaceCard
      title="运行参数"
      description="站点、浏览器模式、邮编和等待秒数集中在右栏，保存行为保持不变。"
      headerSlot={<PanelBadge label={currentMarketplace?.host ?? 'amazon.com'} />}
      className="h-full"
    >
      {props.disabled && (
        <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
          同步进行中，暂时不能修改抓取设置。
        </div>
      )}

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label="当前站点" value={currentMarketplace?.label ?? '美国'} />
          <MetricTile label="浏览器模式" value={modeLabel} />
        </div>

        <FieldBox label="Amazon 站点" htmlFor="crawler-marketplace">
          <select
            id="crawler-marketplace"
            value={props.marketplace}
            onChange={(event) => props.onMarketplaceChange(event.target.value as AmazonMarketplace)}
            disabled={props.disabled}
            className="mt-3 w-full rounded-xl px-4 py-3 text-sm"
          >
            {props.marketplaceOptions.map((site) => (
              <option key={site.code} value={site.code}>
                {site.label}（{site.host}）
              </option>
            ))}
          </select>
        </FieldBox>

        <FieldBox label="浏览器模式" htmlFor="crawler-headed-toggle">
          <label className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-[var(--field-bg)] px-4 py-3">
            <input
              id="crawler-headed-toggle"
              type="checkbox"
              checked={props.headed}
              onChange={(event) => props.onHeadedChange(event.target.checked)}
              disabled={props.disabled}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-slate-100">开启有头浏览器</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                适合观察左上角邮编是否生效，以及价格区域是否正常渲染。
              </span>
            </span>
          </label>
        </FieldBox>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldBox label="配送邮编" htmlFor="crawler-zip-code">
            <input
              id="crawler-zip-code"
              type="text"
              maxLength={5}
              value={props.zipCode}
              onChange={(event) => props.onZipCodeChange(event.target.value)}
              disabled={props.disabled}
              className="mt-3 w-full rounded-xl px-4 py-3 font-mono text-sm"
            />
          </FieldBox>

          <FieldBox label="首页等待（秒）" htmlFor="crawler-zip-home-wait">
            <input
              id="crawler-zip-home-wait"
              type="number"
              min={0}
              max={120}
              value={props.zipHomeWaitSec}
              onChange={(event) => props.onZipHomeWaitSecChange(Number(event.target.value))}
              disabled={props.disabled}
              className="mt-3 w-full rounded-xl px-4 py-3 font-mono text-sm"
            />
          </FieldBox>

          <FieldBox label="弹层等待（秒）" htmlFor="crawler-zip-modal-wait">
            <input
              id="crawler-zip-modal-wait"
              type="number"
              min={0}
              max={120}
              value={props.zipModalWaitSec}
              onChange={(event) => props.onZipModalWaitSecChange(Number(event.target.value))}
              disabled={props.disabled}
              className="mt-3 w-full rounded-xl px-4 py-3 font-mono text-sm"
            />
          </FieldBox>

          <NoteBox title="条件切换说明">
            每个站点都会单独保存一套邮编与等待时间；切换站点时会自动切换到该站点自己的设置。
          </NoteBox>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.disabled}
            className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-200"
          >
            保存设置
          </button>
          <button
            type="button"
            onClick={props.onResetDefaults}
            disabled={props.disabled}
            className="rounded-xl px-4 py-3 text-sm font-medium"
          >
            恢复默认
          </button>
        </div>

        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-slate-500">
          保存后会写回 <span className="font-mono text-slate-300">config.json</span>，不会改变现有同步流程和落盘路径。
        </p>
      </div>
    </SurfaceCard>
  );
}

function FieldBox(props: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <label className="text-xs font-medium text-slate-300" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}

function MetricTile(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{props.label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{props.value}</p>
    </div>
  );
}

function NoteBox(props: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-xs font-medium text-slate-300">{props.title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{props.children}</p>
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
