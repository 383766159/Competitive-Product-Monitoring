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
  const showUsZipSettings = props.marketplace === 'us';

  return (
    <SurfaceCard title="抓取设置" description="站点、浏览器模式和地区条件都在这里控制。">
      {props.disabled && (
        <div className="mb-4 rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-xs text-amber-100">
          同步进行中，暂时不能修改抓取设置。
        </div>
      )}

      <div>
        <label className="text-xs text-slate-400" htmlFor="crawler-marketplace">
          Amazon 站点
        </label>
        <select
          id="crawler-marketplace"
          value={props.marketplace}
          onChange={(event) => props.onMarketplaceChange(event.target.value as AmazonMarketplace)}
          disabled={props.disabled}
          className="mt-2 w-full rounded-2xl px-4 py-3 text-sm"
        >
          {props.marketplaceOptions.map((site) => (
            <option key={site.code} value={site.code}>
              {site.label}（{site.host}）
            </option>
          ))}
        </select>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
        <input
          type="checkbox"
          checked={props.headed}
          onChange={(event) => props.onHeadedChange(event.target.checked)}
          disabled={props.disabled}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium text-slate-100">开启有头浏览器</span>
          <span className="mt-1 block text-xs text-slate-400">
            适合观察左上角邮编是否生效，以及价格区域是否正常渲染。
          </span>
        </span>
      </label>

      {showUsZipSettings ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SettingsField label="美国邮编" htmlFor="crawler-zip-code">
            <input
              id="crawler-zip-code"
              type="text"
              maxLength={5}
              value={props.zipCode}
              onChange={(event) => props.onZipCodeChange(event.target.value)}
              disabled={props.disabled}
              className="mt-2 w-full rounded-2xl px-4 py-3 font-mono text-sm"
            />
          </SettingsField>

          <SettingsField label="首页等待（秒）" htmlFor="crawler-zip-home-wait">
            <input
              id="crawler-zip-home-wait"
              type="number"
              min={0}
              max={120}
              value={props.zipHomeWaitSec}
              onChange={(event) => props.onZipHomeWaitSecChange(Number(event.target.value))}
              disabled={props.disabled}
              className="mt-2 w-full rounded-2xl px-4 py-3 font-mono text-sm"
            />
          </SettingsField>

          <SettingsField label="弹层等待（秒）" htmlFor="crawler-zip-modal-wait">
            <input
              id="crawler-zip-modal-wait"
              type="number"
              min={0}
              max={120}
              value={props.zipModalWaitSec}
              onChange={(event) => props.onZipModalWaitSecChange(Number(event.target.value))}
              disabled={props.disabled}
              className="mt-2 w-full rounded-2xl px-4 py-3 font-mono text-sm"
            />
          </SettingsField>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-slate-400">
            邮编设置只对美国站点生效，其他站点会直接按对应域名访问 PDP。
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-slate-400">
          当前站点为欧洲站，不执行美国邮编设置。
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.disabled}
          className="rounded-full bg-sky-300 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_14px_36px_rgba(125,211,252,0.22)] hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          保存设置
        </button>
        <button
          type="button"
          onClick={props.onResetDefaults}
          disabled={props.disabled}
          className="rounded-full px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          恢复默认
        </button>
      </div>
    </SurfaceCard>
  );
}

function SettingsField(props: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-400" htmlFor={props.htmlFor}>
        {props.label}
      </label>
      {props.children}
    </div>
  );
}
