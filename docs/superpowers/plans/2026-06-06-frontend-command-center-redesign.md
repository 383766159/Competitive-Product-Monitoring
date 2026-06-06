# Frontend Command Center Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改动 IPC、同步主流程和配置数据结构的前提下，把当前 React 渲染层重构为“冷静专业的同步指挥台”首页，并把设置页降噪为更聚焦的配置工作区。

**Architecture:** 保留 `src/App.tsx` 作为状态编排入口，把当前巨型 JSX 拆成命令中心组件、设置页组件和少量纯函数选择器。补一个最小可用的 `Vitest + Testing Library` 测试基座，优先锁住高频路径和关键状态，再推进视觉重构，避免只改静态样式。

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Vitest, Testing Library

---

> 说明：按当前工作区约束，本计划不包含 `git commit` / 分支操作步骤。

## File Structure

### Modify

- `E:/工具/竞品优化-V2/package.json`
  - 增加 UI 测试脚本和测试依赖。
- `E:/工具/竞品优化-V2/vite.config.ts`
  - 增加 Vitest 配置，复用现有 alias。
- `E:/工具/竞品优化-V2/src/App.tsx`
  - 保留状态、IPC 调用和事件处理，移除大段内联视图，改为组合命令中心和设置页组件。
- `E:/工具/竞品优化-V2/src/index.css`
  - 重建主题 token、页面背景、组件表面层级、焦点态与动效。

### Create

- `E:/工具/竞品优化-V2/src/features/command-center/model.ts`
  - 集中放置前端内部使用的类型与常量，避免 `App.tsx` 顶部继续膨胀。
- `E:/工具/竞品优化-V2/src/features/command-center/utils.ts`
  - 放 `parseAsinText`、日志格式化和首页摘要文案的纯函数。
- `E:/工具/竞品优化-V2/src/features/command-center/selectors.ts`
  - 放“已选可执行分组”“首页摘要”“阻断提示”等选择器。
- `E:/工具/竞品优化-V2/src/features/command-center/components/CommandCenterView.tsx`
  - 首页总布局，组合 Hero、运行轨迹、任务侧栏。
- `E:/工具/竞品优化-V2/src/features/command-center/components/CommandHero.tsx`
  - 首屏主操作区。
- `E:/工具/竞品优化-V2/src/features/command-center/components/ActivityFeed.tsx`
  - 关键事件流视图。
- `E:/工具/竞品优化-V2/src/features/command-center/components/ExecutionRail.tsx`
  - 右侧任务侧栏。
- `E:/工具/竞品优化-V2/src/features/settings/components/GroupEditorPanel.tsx`
  - 分组编辑区。
- `E:/工具/竞品优化-V2/src/features/settings/components/CrawlerSettingsPanel.tsx`
  - 抓取设置区。
- `E:/工具/竞品优化-V2/src/shared/ui/SurfaceCard.tsx`
  - 替代当前内联 `Panel`，统一容器风格。
- `E:/工具/竞品优化-V2/src/test/setup.ts`
  - 挂载 `@testing-library/jest-dom`。
- `E:/工具/竞品优化-V2/src/test/createTrackerStub.ts`
  - 提供可复用的 `window.tracker` 测试替身。
- `E:/工具/竞品优化-V2/src/features/command-center/utils.test.ts`
  - 纯函数测试。
- `E:/工具/竞品优化-V2/src/App.command-center.test.tsx`
  - 首页和设置页的渲染、状态与交互测试。

## Task 1: 搭好测试基座并抽出纯函数

**Files:**
- Create: `E:/工具/竞品优化-V2/src/test/setup.ts`
- Create: `E:/工具/竞品优化-V2/src/test/createTrackerStub.ts`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/model.ts`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/utils.ts`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/selectors.ts`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/utils.test.ts`
- Modify: `E:/工具/竞品优化-V2/package.json`
- Modify: `E:/工具/竞品优化-V2/vite.config.ts`

- [ ] **Step 1: 先写纯函数失败测试**

```ts
// E:/工具/竞品优化-V2/src/features/command-center/utils.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildCommandSummary,
  getSyncBlockReason,
  parseAsinText,
} from './utils';
import type { UserConfig } from './model';

const baseConfig: UserConfig = {
  headless: true,
  marketplace: 'us',
  zipCode: '90001',
  zipHomeWaitSec: 10,
  zipModalWaitSec: 10,
  locale: 'en-US',
  activeGroupId: 'g-1',
  groups: [
    { id: 'g-1', name: 'Kitchen', asins: ['B0AAAAAA01', 'B0AAAAAA02'] },
    { id: 'g-2', name: 'Empty', asins: [] },
  ],
};

describe('parseAsinText', () => {
  it('deduplicates ASINs from plain text and Amazon URLs', () => {
    const input = `
      B0AAAAAA01
      https://www.amazon.com/dp/B0BBBBBB02
      https://www.amazon.com/gp/product/B0BBBBBB02
      invalid
    `;

    expect(parseAsinText(input)).toEqual(['B0AAAAAA01', 'B0BBBBBB02']);
  });
});

describe('getSyncBlockReason', () => {
  it('returns a blocker when no selected group contains ASINs', () => {
    expect(getSyncBlockReason(baseConfig, new Set(['g-2']), false)).toBe('当前没有可执行分组');
  });
});

describe('buildCommandSummary', () => {
  it('builds hero copy from current config and selection', () => {
    expect(buildCommandSummary(baseConfig, ['Kitchen'], false)).toEqual({
      title: '已准备同步 1 个分组',
      detail: '美区站点，无头模式，可直接开始同步任务。',
      actionLabel: '开始同步任务',
    });
  });
});
```

- [ ] **Step 2: 运行测试，确认当前仓库还不具备这些实现**

Run: `npm run test:ui -- src/features/command-center/utils.test.ts`

Expected:

```text
npm ERR! Missing script: "test:ui"
```

- [ ] **Step 3: 增加测试脚本、测试配置和纯函数实现**

```json
// E:/工具/竞品优化-V2/package.json
{
  "scripts": {
    "test:ui": "vitest run",
    "test:ui:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1",
    "vitest": "^2.1.8"
  }
}
```

```ts
// E:/工具/竞品优化-V2/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  root: '.',
  base: command === 'build' ? './' : '/',
  build: {
    outDir: 'dist/renderer',
    emptyDirBeforeWrite: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
}));
```

```ts
// E:/工具/竞品优化-V2/src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

```ts
// E:/工具/竞品优化-V2/src/features/command-center/model.ts
export type AsinGroup = {
  id: string;
  name: string;
  asins: string[];
};

export type AmazonMarketplace = 'us' | 'de' | 'fr' | 'it' | 'es';

export type UserConfig = {
  headless: boolean;
  marketplace: AmazonMarketplace;
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
  locale: 'en-US';
  activeGroupId: string;
  groups: AsinGroup[];
};
```

```ts
// E:/工具/竞品优化-V2/src/features/command-center/utils.ts
import type { UserConfig } from './model';

const MARKETPLACE_LABEL: Record<UserConfig['marketplace'], string> = {
  us: '美区',
  de: '德国',
  fr: '法国',
  it: '意大利',
  es: '西班牙',
};

export function parseAsinText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string) => {
    const urlMatch = raw.match(/(?:\/(?:dp|gp\/product)\/|[?&]asin=)([A-Z0-9]{10})(?:[^A-Z0-9]|$)/i);
    const asin = (urlMatch?.[1] ?? raw).trim().toUpperCase();
    if (/^[A-Z0-9]{10}$/.test(asin) && !seen.has(asin)) {
      seen.add(asin);
      out.push(asin);
    }
  };

  const urlRe = /(?:\/(?:dp|gp\/product)\/|[?&]asin=)([A-Z0-9]{10})(?:[^A-Z0-9]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text)) !== null) push(match[1]);

  text.split(/[\s,，、\n\r]+/).filter(Boolean).forEach(push);
  return out;
}

export function getSyncBlockReason(
  config: UserConfig | null,
  selectedIds: Set<string>,
  busy: boolean,
): string | null {
  if (busy) return null;
  if (!config) return '配置加载中';
  const runnable = config.groups.filter((group) => selectedIds.has(group.id) && group.asins.length > 0);
  if (runnable.length === 0) return '当前没有可执行分组';
  return null;
}

export function buildCommandSummary(
  config: UserConfig,
  selectedGroupNames: string[],
  busy: boolean,
): { title: string; detail: string; actionLabel: string } {
  if (busy) {
    return {
      title: `正在同步 ${selectedGroupNames.length} 个分组`,
      detail: '任务正在执行中，可在运行轨迹查看最新进展。',
      actionLabel: '同步进行中',
    };
  }

  return {
    title: `已准备同步 ${selectedGroupNames.length} 个分组`,
    detail: `${MARKETPLACE_LABEL[config.marketplace]}站点，${config.headless ? '无头' : '有头'}模式，可直接开始同步任务。`,
    actionLabel: '开始同步任务',
  };
}
```

```ts
// E:/工具/竞品优化-V2/src/features/command-center/selectors.ts
import type { AsinGroup, UserConfig } from './model';

export function getRunnableGroups(config: UserConfig | null, selectedIds: Set<string>): AsinGroup[] {
  if (!config) return [];
  return config.groups.filter((group) => selectedIds.has(group.id) && group.asins.length > 0);
}
```

- [ ] **Step 4: 安装依赖并重新运行测试，确认纯函数层稳定**

Run:

```bash
npm install
npm run test:ui -- src/features/command-center/utils.test.ts
```

Expected:

```text
✓ src/features/command-center/utils.test.ts
  ✓ parseAsinText deduplicates ASINs from plain text and Amazon URLs
  ✓ getSyncBlockReason returns a blocker when no selected group contains ASINs
  ✓ buildCommandSummary builds hero copy from current config and selection
```

## Task 2: 拆首页为命令中心组件，并让高频路径先可用

**Files:**
- Create: `E:/工具/竞品优化-V2/src/shared/ui/SurfaceCard.tsx`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/components/CommandHero.tsx`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/components/ExecutionRail.tsx`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/components/ActivityFeed.tsx`
- Create: `E:/工具/竞品优化-V2/src/features/command-center/components/CommandCenterView.tsx`
- Create: `E:/工具/竞品优化-V2/src/App.command-center.test.tsx`
- Modify: `E:/工具/竞品优化-V2/src/App.tsx:59-683`

- [ ] **Step 1: 先写首页失败测试**

```tsx
// E:/工具/竞品优化-V2/src/App.command-center.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createTrackerStub } from './test/createTrackerStub';

describe('command center home', () => {
  it('renders a single primary sync action with execution context', async () => {
    window.tracker = createTrackerStub();

    render(<App />);

    expect(await screen.findByRole('heading', { name: '已准备同步 2 个分组' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始同步任务' })).toBeEnabled();
    expect(screen.getByText('待执行分组')).toBeInTheDocument();
    expect(screen.getByText('运行轨迹')).toBeInTheDocument();
    expect(screen.getByText('快速入口')).toBeInTheDocument();
  });

  it('disables the primary action when no runnable group remains', async () => {
    window.tracker = createTrackerStub({
      config: {
        groups: [{ id: 'empty', name: 'Empty', asins: [] }],
        activeGroupId: 'empty',
      },
    });

    render(<App />);

    expect(await screen.findByText('当前没有可执行分组')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始同步任务' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: 跑测试，确认首页还没有这些结构**

Run: `npm run test:ui -- src/App.command-center.test.tsx`

Expected:

```text
FAIL  src/App.command-center.test.tsx
  × renders a single primary sync action with execution context
  Unable to find role="heading" with name "已准备同步 2 个分组"
```

- [ ] **Step 3: 实现命令中心组件并瘦身 App 视图层**

```ts
// E:/工具/竞品优化-V2/src/test/createTrackerStub.ts
import { vi } from 'vitest';

type StubOptions = {
  config?: Partial<UserConfigPayload>;
  saveConfigResult?: { ok: boolean; error?: string };
};

const baseConfig: UserConfigPayload = {
  headless: true,
  marketplace: 'us',
  zipCode: '90001',
  zipHomeWaitSec: 10,
  zipModalWaitSec: 10,
  locale: 'en-US',
  activeGroupId: 'kitchen',
  groups: [
    { id: 'kitchen', name: 'Kitchen', asins: ['B0AAAAAA01', 'B0AAAAAA02'] },
    { id: 'home', name: 'Home', asins: ['B0BBBBBB01'] },
  ],
};

export function createTrackerStub(options: StubOptions = {}) {
  const config: UserConfigPayload = {
    ...baseConfig,
    ...options.config,
    groups: options.config?.groups ?? baseConfig.groups,
  };

  return {
    syncAsins: vi.fn().mockResolvedValue({ ok: true }),
    openExcel: vi.fn().mockResolvedValue({ ok: true }),
    openDataFolder: vi.fn().mockResolvedValue({ ok: true }),
    openLogsFolder: vi.fn().mockResolvedValue({ ok: true }),
    getPaths: vi.fn().mockResolvedValue({
      dataDir: 'E:/工具/竞品优化-V2/data',
      excelPath: 'E:/工具/竞品优化-V2/data/today.xlsx',
      configPath: 'E:/工具/竞品优化-V2/config.json',
    }),
    getConfig: vi.fn().mockResolvedValue(config),
    getDefaultConfig: vi.fn().mockResolvedValue(config),
    saveConfig: vi.fn().mockResolvedValue(options.saveConfigResult ?? { ok: true }),
    pickExcelPath: vi.fn().mockResolvedValue({ ok: false }),
    onSyncProgress: vi.fn().mockImplementation(() => () => {}),
  };
}
```

```tsx
// E:/工具/竞品优化-V2/src/shared/ui/SurfaceCard.tsx
import type { ReactNode } from 'react';

type SurfaceCardProps = {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export function SurfaceCard({ title, description, className, children }: SurfaceCardProps) {
  return (
    <section className={`surface-card ${className ?? ''}`.trim()}>
      {(title || description) && (
        <header className="surface-card__header">
          {title && <h2 className="surface-card__title">{title}</h2>}
          {description && <p className="surface-card__description">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/features/command-center/components/CommandHero.tsx
type CommandHeroProps = {
  title: string;
  detail: string;
  actionLabel: string;
  blocker: string | null;
  siteLabel: string;
  modeLabel: string;
  selectedCount: number;
  lastDone: string | null;
  busy: boolean;
  onSync: () => void;
};

export function CommandHero(props: CommandHeroProps) {
  return (
    <section className="command-hero">
      <div className="command-hero__summary">
        <span>{props.siteLabel}</span>
        <span>{props.modeLabel}</span>
        <span>{props.selectedCount} 组待执行</span>
        <span>{props.lastDone ? `最近完成 ${props.lastDone}` : '暂无完成记录'}</span>
      </div>
      <h1 className="command-hero__title">{props.title}</h1>
      <p className="command-hero__detail">{props.detail}</p>
      {props.blocker && <p className="command-hero__blocker">{props.blocker}</p>}
      <button
        type="button"
        className="command-hero__action"
        disabled={Boolean(props.blocker) || props.busy}
        onClick={props.onSync}
      >
        {props.actionLabel}
      </button>
    </section>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/features/command-center/components/ExecutionRail.tsx
type ExecutionRailProps = {
  groups: Array<{ id: string; name: string; asins: string[] }>;
  onOpenExcel: () => void;
  onOpenDataFolder: () => void;
  onOpenLogsFolder: () => void;
  onOpenSettings: () => void;
};

export function ExecutionRail(props: ExecutionRailProps) {
  return (
    <aside className="execution-rail" aria-label="任务侧栏">
      <section>
        <h2>待执行分组</h2>
        <ul>
          {props.groups.map((group) => (
            <li key={group.id}>
              <strong>{group.name}</strong>
              <span>{group.asins.length} 个 ASIN</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>快速入口</h2>
        <button type="button" onClick={props.onOpenExcel}>打开今日 Excel</button>
        <button type="button" onClick={props.onOpenDataFolder}>打开 data 目录</button>
        <button type="button" onClick={props.onOpenLogsFolder}>打开日志目录</button>
        <button type="button" onClick={props.onOpenSettings}>进入高级设置</button>
      </section>
      <section>
        <h2>异常留痕</h2>
        <p>失败截图保存在 `logs/screenshots`，价格调试信息保存在 `logs/price-debug`。</p>
      </section>
    </aside>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/features/command-center/components/ActivityFeed.tsx
type ActivityFeedProps = {
  logs: string[];
};

export function ActivityFeed({ logs }: ActivityFeedProps) {
  const items = logs.length > 0 ? logs.slice(-8).reverse() : ['等待同步任务开始...'];
  return (
    <section aria-label="运行轨迹" className="activity-feed">
      <h2>运行轨迹</h2>
      <ul>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/features/command-center/components/CommandCenterView.tsx
import { ActivityFeed } from './ActivityFeed';
import { CommandHero } from './CommandHero';
import { ExecutionRail } from './ExecutionRail';

type CommandCenterViewProps = {
  hero: {
    title: string;
    detail: string;
    actionLabel: string;
    blocker: string | null;
    siteLabel: string;
    modeLabel: string;
    selectedCount: number;
    lastDone: string | null;
    busy: boolean;
  };
  logs: string[];
  runnableGroups: Array<{ id: string; name: string; asins: string[] }>;
  onSync: () => void;
  onOpenExcel: () => void;
  onOpenDataFolder: () => void;
  onOpenLogsFolder: () => void;
  onOpenSettings: () => void;
};

export function CommandCenterView(props: CommandCenterViewProps) {
  return (
    <section className="command-center-layout">
      <div className="command-center-layout__main">
        <CommandHero {...props.hero} onSync={props.onSync} />
        <ActivityFeed logs={props.logs} />
      </div>
      <ExecutionRail
        groups={props.runnableGroups}
        onOpenExcel={props.onOpenExcel}
        onOpenDataFolder={props.onOpenDataFolder}
        onOpenLogsFolder={props.onOpenLogsFolder}
        onOpenSettings={props.onOpenSettings}
      />
    </section>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/App.tsx
import { CommandCenterView } from './features/command-center/components/CommandCenterView';
import { buildCommandSummary, getSyncBlockReason, parseAsinText } from './features/command-center/utils';
import { getRunnableGroups } from './features/command-center/selectors';

// ...保留现有 state、loadSettings、onSync、onSaveConfig 等事件处理...

const runnableGroups = useMemo(() => getRunnableGroups(config, selectedIds), [config, selectedIds]);
const blocker = useMemo(() => getSyncBlockReason(config, selectedIds, busy), [config, selectedIds, busy]);
const heroCopy = config
  ? buildCommandSummary(config, runnableGroups.map((group) => group.name), busy)
  : null;

{tab === 'sync' && config && heroCopy && (
  <CommandCenterView
    hero={{
      ...heroCopy,
      blocker,
      siteLabel,
      modeLabel: headed ? '有头模式' : '无头模式',
      selectedCount: runnableGroups.length,
      lastDone,
      busy,
    }}
    logs={logs}
    runnableGroups={runnableGroups}
    onSync={onSync}
    onOpenExcel={() => void tracker?.openExcel()}
    onOpenDataFolder={() => void tracker?.openDataFolder()}
    onOpenLogsFolder={() => void tracker?.openLogsFolder()}
    onOpenSettings={() => setTab('settings')}
  />
)}
```

- [ ] **Step 4: 重新跑首页测试，确认高频路径成立**

Run: `npm run test:ui -- src/App.command-center.test.tsx`

Expected:

```text
✓ src/App.command-center.test.tsx
  ✓ renders a single primary sync action with execution context
  ✓ disables the primary action when no runnable group remains
```

## Task 3: 重做设置页并统一新主题 token

**Files:**
- Create: `E:/工具/竞品优化-V2/src/features/settings/components/GroupEditorPanel.tsx`
- Create: `E:/工具/竞品优化-V2/src/features/settings/components/CrawlerSettingsPanel.tsx`
- Modify: `E:/工具/竞品优化-V2/src/App.command-center.test.tsx`
- Modify: `E:/工具/竞品优化-V2/src/App.tsx:334-499`
- Modify: `E:/工具/竞品优化-V2/src/index.css`

- [ ] **Step 1: 先写设置页失败测试**

```tsx
// E:/工具/竞品优化-V2/src/App.command-center.test.tsx
it('shows focused settings panels and US-only zipcode fields', async () => {
  window.tracker = createTrackerStub();
  const user = userEvent.setup();

  render(<App />);

  await user.click(await screen.findByRole('button', { name: '高级设置' }));

  expect(screen.getByRole('heading', { name: '分组编辑' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '抓取设置' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument();
  expect(screen.getByLabelText('美国邮编')).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText('Amazon 站点'), 'de');

  expect(screen.queryByLabelText('美国邮编')).not.toBeInTheDocument();
  expect(screen.getByText('当前站点为欧洲站，不执行美国邮编设置。')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认现有设置页命名与结构都不匹配**

Run: `npm run test:ui -- src/App.command-center.test.tsx -t "shows focused settings panels and US-only zipcode fields"`

Expected:

```text
FAIL  src/App.command-center.test.tsx
  × shows focused settings panels and US-only zipcode fields
  Unable to find role="heading" with name "分组编辑"
```

- [ ] **Step 3: 提取设置页组件并切换全局视觉 token**

```tsx
// E:/工具/竞品优化-V2/src/features/settings/components/GroupEditorPanel.tsx
import { SurfaceCard } from '@/shared/ui/SurfaceCard';

type GroupEditorPanelProps = {
  activeGroupId: string;
  groups: Array<{ id: string; name: string; asins: string[] }>;
  editName: string;
  editAsinText: string;
  editExcelPreview: string;
  onSelectGroup: (id: string) => void;
  onNameChange: (value: string) => void;
  onAsinChange: (value: string) => void;
  onNewGroup: () => void;
  onDeleteGroup: () => void;
};

export function GroupEditorPanel(props: GroupEditorPanelProps) {
  return (
    <SurfaceCard title="分组编辑" description="维护分组名称、ASIN 列表和今日输出预览。">
      {/* 下拉、输入框、文本域和路径预览沿用现有行为，只迁移到独立组件 */}
    </SurfaceCard>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/features/settings/components/CrawlerSettingsPanel.tsx
import { SurfaceCard } from '@/shared/ui/SurfaceCard';

type CrawlerSettingsPanelProps = {
  marketplace: 'us' | 'de' | 'fr' | 'it' | 'es';
  headed: boolean;
  zipCode: string;
  zipHomeWaitSec: number;
  zipModalWaitSec: number;
  onMarketplaceChange: (value: 'us' | 'de' | 'fr' | 'it' | 'es') => void;
  onHeadedChange: (value: boolean) => void;
  onZipCodeChange: (value: string) => void;
  onZipHomeWaitSecChange: (value: number) => void;
  onZipModalWaitSecChange: (value: number) => void;
  onSave: () => void;
  onResetDefaults: () => void;
};

export function CrawlerSettingsPanel(props: CrawlerSettingsPanelProps) {
  return (
    <SurfaceCard title="抓取设置" description="控制站点、浏览器模式和地区相关参数。">
      {/* 站点选择、checkbox、US/EU 条件区块和操作按钮迁入这里 */}
    </SurfaceCard>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/App.tsx
import { GroupEditorPanel } from './features/settings/components/GroupEditorPanel';
import { CrawlerSettingsPanel } from './features/settings/components/CrawlerSettingsPanel';

{tab === 'settings' && config && (
  <section className="settings-layout">
    <GroupEditorPanel
      activeGroupId={config.activeGroupId}
      groups={config.groups}
      editName={editName}
      editAsinText={editAsinText}
      editExcelPreview={editExcelPreview}
      onSelectGroup={onSelectEditingGroup}
      onNameChange={(value) => {
        setEditName(value);
        setSaveHint(null);
      }}
      onAsinChange={(value) => {
        setEditAsinText(value);
        setSaveHint(null);
      }}
      onNewGroup={onNewGroup}
      onDeleteGroup={onDeleteEditingGroup}
    />
    <CrawlerSettingsPanel
      marketplace={config.marketplace}
      headed={headed}
      zipCode={config.zipCode}
      zipHomeWaitSec={config.zipHomeWaitSec}
      zipModalWaitSec={config.zipModalWaitSec}
      onMarketplaceChange={(value) => setConfig({ ...config, marketplace: value })}
      onHeadedChange={(value) => setConfig({ ...config, headless: !value })}
      onZipCodeChange={(value) => setConfig({ ...config, zipCode: value.replace(/\D/g, '').slice(0, 5) })}
      onZipHomeWaitSecChange={(value) => setConfig({ ...config, zipHomeWaitSec: value })}
      onZipModalWaitSecChange={(value) => setConfig({ ...config, zipModalWaitSec: value })}
      onSave={onSaveConfig}
      onResetDefaults={onResetDefaults}
    />
  </section>
)}
```

```css
/* E:/工具/竞品优化-V2/src/index.css */
:root {
  color-scheme: dark;
  --bg-canvas: oklch(0.16 0.02 248);
  --bg-elevated: oklch(0.22 0.02 248);
  --bg-panel: oklch(0.26 0.022 248);
  --line-soft: oklch(0.42 0.02 248 / 0.42);
  --ink-strong: oklch(0.94 0.01 250);
  --ink: oklch(0.84 0.015 248);
  --ink-muted: oklch(0.69 0.018 248);
  --accent: oklch(0.72 0.08 232);
  --accent-strong: oklch(0.79 0.09 232);
  --danger: oklch(0.68 0.14 22);
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  background:
    radial-gradient(circle at top left, color-mix(in oklab, var(--accent) 14%, transparent), transparent 28%),
    linear-gradient(180deg, oklch(0.19 0.02 248), var(--bg-canvas));
  font-family: "Microsoft YaHei UI", "PingFang SC", "Noto Sans SC", sans-serif;
}

.command-center-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.86fr);
  gap: 24px;
}

.command-hero,
.activity-feed,
.execution-rail,
.surface-card {
  border: 1px solid var(--line-soft);
  background: linear-gradient(180deg, color-mix(in oklab, var(--bg-panel) 92%, black), var(--bg-elevated));
  border-radius: 20px;
}

.command-hero__action {
  min-height: 52px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--accent-strong), var(--accent));
  color: oklch(0.18 0.02 248);
  font-weight: 700;
}

@media (max-width: 980px) {
  .command-center-layout,
  .settings-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: 跑设置页测试，确认新结构和显隐规则成立**

Run: `npm run test:ui -- src/App.command-center.test.tsx -t "shows focused settings panels and US-only zipcode fields"`

Expected:

```text
✓ src/App.command-center.test.tsx
  ✓ shows focused settings panels and US-only zipcode fields
```

## Task 4: 补齐关键运行状态，并完成最终验证

**Files:**
- Modify: `E:/工具/竞品优化-V2/src/App.command-center.test.tsx`
- Modify: `E:/工具/竞品优化-V2/src/App.tsx`
- Modify: `E:/工具/竞品优化-V2/src/features/command-center/utils.ts`
- Modify: `E:/工具/竞品优化-V2/src/features/command-center/components/ActivityFeed.tsx`
- Modify: `E:/工具/竞品优化-V2/src/index.css`

- [ ] **Step 1: 先写关键状态失败测试**

```tsx
// E:/工具/竞品优化-V2/src/App.command-center.test.tsx
it('shows preload fallback when tracker is unavailable', () => {
  // @ts-expect-error test branch
  delete window.tracker;

  render(<App />);

  expect(screen.getByText(/window\.tracker/)).toBeInTheDocument();
});

it('flushes save failure and busy state into the command center', async () => {
  window.tracker = createTrackerStub({
    saveConfigResult: { ok: false, error: '配置写入失败' },
  });
  const user = userEvent.setup();

  render(<App />);

  await user.click(await screen.findByRole('button', { name: '开始同步任务' }));

  expect(await screen.findByText('配置写入失败')).toBeInTheDocument();
  expect(screen.queryByText('同步进行中')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认当前状态文案还没有完全进首页**

Run: `npm run test:ui -- src/App.command-center.test.tsx -t "shows preload fallback|flushes save failure and busy state into the command center"`

Expected:

```text
FAIL  src/App.command-center.test.tsx
  × flushes save failure and busy state into the command center
  Unable to find text "配置写入失败"
```

- [ ] **Step 3: 把保存失败、执行中状态和日志节奏补齐到首页**

```ts
// E:/工具/竞品优化-V2/src/features/command-center/utils.ts
export function buildSaveHintTone(saveHint: string | null): 'neutral' | 'danger' {
  if (!saveHint) return 'neutral';
  return /失败|错误/.test(saveHint) ? 'danger' : 'neutral';
}
```

```tsx
// E:/工具/竞品优化-V2/src/features/command-center/components/ActivityFeed.tsx
export function ActivityFeed({ logs }: ActivityFeedProps) {
  const items = logs.length > 0 ? logs.slice(-8).reverse() : ['等待同步任务开始...'];
  return (
    <section aria-label="运行轨迹" className="activity-feed">
      <div className="activity-feed__header">
        <h2>运行轨迹</h2>
        <p>界面保留最近 8 条关键事件，完整日志继续写入 logs 目录。</p>
      </div>
      <ol className="activity-feed__list">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="activity-feed__item">
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}
```

```tsx
// E:/工具/竞品优化-V2/src/App.tsx
const [saveHint, setSaveHint] = useState<string | null>(null);

async function onSync() {
  if (!config || !tracker) return;

  const runnable = syncSelectedGroups;
  if (runnable.length === 0) {
    setSaveHint('当前没有可执行分组');
    return;
  }

  setBusy(true);
  setSaveHint(null);
  pushLog(`开始同步 ${runnable.length} 个分组`);

  const payload = mergeEditingIntoConfig(config);
  const saveResult = await tracker.saveConfig(payload);
  if (!saveResult.ok) {
    setSaveHint(saveResult.error);
    pushLog(`保存配置失败：${saveResult.error}`);
    setBusy(false);
    return;
  }

  setConfig(payload);

  try {
    const result = await tracker.syncAsins({ groupIds: runnable.map((group) => group.id) });
    if (!result.ok) {
      setSaveHint(result.error ?? '同步结束，但存在失败项');
      pushLog(result.error ?? '同步结束，但存在失败项');
    } else {
      setSaveHint('同步完成，可打开结果或日志继续查看。');
      pushLog('全部选中分组同步完成');
      await loadSettings();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setSaveHint(message);
    pushLog(`异常：${message}`);
  } finally {
    setBusy(false);
  }
}
```

```css
/* E:/工具/竞品优化-V2/src/index.css */
.command-hero__blocker,
.status-banner--danger {
  color: oklch(0.89 0.04 22);
  background: color-mix(in oklab, var(--danger) 22%, transparent);
  border: 1px solid color-mix(in oklab, var(--danger) 50%, transparent);
}

.activity-feed__item {
  opacity: 0;
  animation: feed-fade-in 180ms ease-out forwards;
}

@keyframes feed-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .activity-feed__item {
    animation: none;
    opacity: 1;
  }
}
```

- [ ] **Step 4: 做一轮完整验证，覆盖测试和类型检查**

Run:

```bash
npm run test:ui
npm run typecheck
```

Expected:

```text
Test Files  2 passed
Tests       6 passed

> amazon-competitor-tracker@1.0.0 typecheck
> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit
```

## Spec Coverage Check

- 首页唯一主动作：Task 2 的 `CommandHero` 与 `CommandCenterView`
- 首页显示待执行分组、快速入口、异常留痕：Task 2 的 `ExecutionRail`
- 日志从底部大块输出改为关键事件流：Task 2 与 Task 4 的 `ActivityFeed`
- 设置页分组编辑 / 抓取设置双栏降噪：Task 3
- 冷静专业的新视觉语言：Task 3 的 `index.css`
- preload 错误、无可执行分组、保存失败、执行中状态验证：Task 1 与 Task 4

## Placeholder Scan

- 本计划未使用 `TBD`、`TODO`、`later` 等占位词。
- 需要新增的函数、组件和测试文件都已在对应任务里命名。
- 没有使用“类似 Task N”式引用，每个任务都给了独立落地片段。

## Type Consistency Check

- `UserConfig`、`AsinGroup` 集中放在 `model.ts`
- `parseAsinText`、`getSyncBlockReason`、`buildCommandSummary` 都由 `utils.ts` 导出
- 首页组件统一通过 `CommandCenterView` 组合，不新增额外状态容器
