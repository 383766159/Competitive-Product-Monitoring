# Reference Workbench Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改动同步逻辑、IPC 契约和配置数据结构的前提下，把首页和设置页重做为参考 `坑位表` 的紧凑深色工作台。

**Architecture:** 保留 `src/App.tsx` 作为状态编排入口，继续复用现有 `command-center` 与 `settings` 组件边界，只重组组件职责和视觉层级。样式改动优先收口到 `src/index.css` 与少量共享容器组件，再分别重排同步首页和设置页，最后用现有 Vitest 集成测试锁住关键状态与交互。

**Tech Stack:** React 18、TypeScript、Vite、Tailwind CSS、Vitest、Testing Library

---

> 说明：按当前工作区约束，本计划不包含 `git commit` 步骤。

## File Structure

### Modify

- `E:/工具/竞品优化-V2/src/index.css`
  - 重写全局 token、基础按钮/输入框风格、页面背景与共享表面层级，使整体质感向参考项目靠拢。
- `E:/工具/竞品优化-V2/src/shared/ui/SurfaceCard.tsx`
  - 收紧圆角、标题间距和容器语义，避免当前过强的悬浮感。
- `E:/工具/竞品优化-V2/src/App.tsx`
  - 保留状态逻辑，调整顶部信息条、标签切换容器和首页/设置页挂载顺序。
- `E:/工具/竞品优化-V2/src/features/command-center/components/CommandCenterView.tsx`
  - 改成“左分组列表 + 右执行摘要”的工作台布局。
- `E:/工具/竞品优化-V2/src/features/command-center/components/CommandHero.tsx`
  - 弱化为右栏执行摘要与主动作面板。
- `E:/工具/竞品优化-V2/src/features/command-center/components/ExecutionRail.tsx`
  - 拆成左侧连续列表和右栏快捷入口/异常留痕结构。
- `E:/工具/竞品优化-V2/src/features/command-center/components/ActivityFeed.tsx`
  - 调整为更紧凑的运行日志面板。
- `E:/工具/竞品优化-V2/src/features/settings/components/GroupEditorPanel.tsx`
  - 重做为参考项目式分组维护台。
- `E:/工具/竞品优化-V2/src/features/settings/components/CrawlerSettingsPanel.tsx`
  - 重做为参数侧栏，统一按钮与表单节奏。
- `E:/工具/竞品优化-V2/src/App.command-center.test.tsx`
  - 更新对首页结构、按钮位置、设置页布局和状态行为的断言。

### Keep As-Is

- `E:/工具/竞品优化-V2/src/features/command-center/utils.ts`
- `E:/工具/竞品优化-V2/src/features/command-center/selectors.ts`
- `E:/工具/竞品优化-V2/src/test/createTrackerStub.ts`
- `E:/工具/竞品优化-V2/src/features/command-center/model.ts`

这些文件负责业务选择逻辑和测试替身，本轮不扩展职责。

## Task 1: 收紧全局视觉层与共享容器

**Files:**
- Modify: `E:/工具/竞品优化-V2/src/index.css`
- Modify: `E:/工具/竞品优化-V2/src/shared/ui/SurfaceCard.tsx`

- [ ] **Step 1: 先写视觉约束清单，锁定要移除的旧质感**

在计划执行备注中确认以下视觉替换：

```text
移除：大范围柔光阴影、过圆的 24px+ 卡片、明显玻璃感、首页强 Hero 氛围
保留：深色主题、清晰焦点态、冷静专业的工具气质、现有文本可读性
新增：更平的深色层级、连续列表、矩形主按钮、细边线结构
```

- [ ] **Step 2: 重写全局 token，让背景和控件先回到工具台基调**

把 `src/index.css` 的根变量和基础控件层改成下面这组方向：

```css
:root {
  color-scheme: dark;
  --bg-canvas: oklch(0.14 0.01 255);
  --bg-shell: oklch(0.17 0.012 255);
  --surface-1: oklch(0.19 0.01 255);
  --surface-2: oklch(0.22 0.012 255);
  --surface-3: oklch(0.26 0.014 255);
  --line-soft: oklch(0.34 0.01 255);
  --line-strong: oklch(0.42 0.012 255);
  --text-primary: oklch(0.95 0.004 255);
  --text-secondary: oklch(0.8 0.008 255);
  --text-muted: oklch(0.64 0.008 255);
  --accent: oklch(0.75 0.14 75);
  --accent-ink: oklch(0.22 0.02 75);
  --danger: oklch(0.7 0.17 25);
  --field-bg: oklch(0.16 0.008 255);
  --field-border: oklch(0.36 0.012 255);
  --focus-ring: oklch(0.72 0.09 220 / 0.28);
}

body {
  background:
    radial-gradient(circle at top left, oklch(0.32 0.06 80 / 0.06), transparent 22%),
    linear-gradient(180deg, var(--bg-shell), var(--bg-canvas));
}

button {
  border: 1px solid var(--field-border);
  background: var(--surface-2);
  border-radius: 10px;
}

input,
textarea,
select {
  border-radius: 10px;
  background: var(--field-bg);
}
```

- [ ] **Step 3: 收紧共享容器 `SurfaceCard`，让它更像工具面板而不是展示卡**

把 `src/shared/ui/SurfaceCard.tsx` 改成更克制的容器：

```tsx
export function SurfaceCard(props: SurfaceCardProps) {
  return (
    <section className={`surface-card rounded-2xl p-4 md:p-5 ${props.className ?? ''}`}>
      {(props.title || props.description || props.headerSlot) && (
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
          <div className="min-w-0">
            {props.title && <h2 className="text-sm font-semibold tracking-[0.02em] text-[var(--text-primary)]">{props.title}</h2>}
            {props.description && <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{props.description}</p>}
          </div>
          {props.headerSlot}
        </div>
      )}
      {props.children}
    </section>
  );
}
```

- [ ] **Step 4: 运行类型检查，确认样式层改动没有带出组件错误**

Run: `npm run typecheck`

Expected:

```text
tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit
```

## Task 2: 把同步首页改成参考项目式工作台

**Files:**
- Modify: `E:/工具/竞品优化-V2/src/App.tsx`
- Modify: `E:/工具/竞品优化-V2/src/features/command-center/components/CommandCenterView.tsx`
- Modify: `E:/工具/竞品优化-V2/src/features/command-center/components/CommandHero.tsx`
- Modify: `E:/工具/竞品优化-V2/src/features/command-center/components/ExecutionRail.tsx`
- Modify: `E:/工具/竞品优化-V2/src/features/command-center/components/ActivityFeed.tsx`

- [ ] **Step 1: 先写首页结构回归测试，锁定“工作台而不是 Hero”**

在 `src/App.command-center.test.tsx` 增加这条断言：

```tsx
it('首页把开始同步任务放在执行摘要区，并同时展示分组列表与运行日志', async () => {
  mountApp();

  expect(await screen.findByText('执行摘要')).toBeInTheDocument();
  expect(screen.getByText('待同步分组')).toBeInTheDocument();
  expect(screen.getByText('运行日志')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '开始同步任务' })).toBeInTheDocument();
});
```

- [ ] **Step 2: 先跑单测，确认新文案和新结构当前还不存在**

Run: `npm run test:ui -- src/App.command-center.test.tsx`

Expected:

```text
FAIL  src/App.command-center.test.tsx
Unable to find an element with the text: 执行摘要
```

- [ ] **Step 3: 重写 `CommandCenterView`，把首页骨架切成左主区与右侧栏**

把组件外层改成参考项目式布局：

```tsx
export function CommandCenterView(props: CommandCenterViewProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_320px]">
      <div className="space-y-5">
        <ExecutionRail
          groupItems={props.groupItems}
          busy={props.busy}
          onToggleGroup={props.onToggleGroup}
          onSelectAll={props.onSelectAll}
          onClearSelection={props.onClearSelection}
          issueLogs={props.issueLogs}
          mode="list"
        />
        <ActivityFeed logs={props.activityLogs} lastDone={props.lastDone} />
      </div>

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
          mode="summary"
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 重写 `CommandHero`，只保留执行摘要和主动作**

把 `CommandHero.tsx` 调整成紧凑右栏：

```tsx
<SurfaceCard title="执行摘要" description="确认本次同步范围，再开始任务。">
  <dl className="grid grid-cols-2 gap-3">
    <StatusItem label="待跑分组" value={`${props.runnableCount}`} />
    <StatusItem label="站点" value={props.siteLabel} />
    <StatusItem label="模式" value={props.modeLabel} />
    <StatusItem label="状态" value={props.busy ? '同步中' : '就绪'} />
  </dl>

  <div className="mt-4 grid gap-2">
    <button type="button" className="rounded-[10px] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)]">
      {props.actionLabel}
    </button>
    {props.blockReason ? (
      <p className="rounded-xl border border-[color:var(--danger)]/20 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-red-100">{props.blockReason}</p>
    ) : (
      <p className="text-xs text-[var(--text-muted)]">当前条件满足，可以直接发起同步。</p>
    )}
  </div>
</SurfaceCard>
```

- [ ] **Step 5: 重写 `ExecutionRail` 与 `ActivityFeed`，分别承担“分组列表”和“快捷入口/异常留痕/运行日志”**

在 `ExecutionRail.tsx` 中增加 `mode` 分支：

```tsx
type ExecutionRailProps = {
  mode: 'list' | 'summary';
  ...
};
```

`mode === 'list'` 时渲染连续分组列表：

```tsx
<SurfaceCard title="待同步分组" description="连续列表展示可执行范围。">
  <ul className="divide-y divide-[var(--line-soft)]">
    {props.groupItems.map((item) => (
      <li key={item.id}>
        <label className={`flex items-start gap-3 px-1 py-3 ${item.selected ? 'bg-[var(--accent-soft)]' : ''}`}>
          ...
        </label>
      </li>
    ))}
  </ul>
</SurfaceCard>
```

`mode === 'summary'` 时渲染快捷入口和异常留痕：

```tsx
<>
  <SurfaceCard title="文件入口" description="统一打开结果与目录。">...</SurfaceCard>
  <SurfaceCard title="异常留痕" description="同步失败后优先查看这里。">...</SurfaceCard>
</>
```

同时把 `ActivityFeed.tsx` 标题改成 `运行日志`，并把日志项收紧为列表行。

- [ ] **Step 6: 调整 `App.tsx` 顶部信息条和标签容器，让首页整体更像参考项目**

保留状态逻辑，只改骨架：

```tsx
<div className="border-b border-[var(--line-soft)] bg-[var(--bg-shell)]">
  <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
    <header>...</header>
    <div className="flex flex-wrap gap-2">
      <SummaryCard label="站点" value={siteLabel} />
      <SummaryCard label="模式" value={modeLabel} />
      <SummaryCard label="分组数" value={String(effectiveConfig?.groups.length ?? 0)} />
    </div>
  </div>
</div>
```

- [ ] **Step 7: 跑首页测试，确认结构、主动作和日志区域都已切换成功**

Run: `npm run test:ui -- src/App.command-center.test.tsx`

Expected:

```text
✓ src/App.command-center.test.tsx
  ✓ 首页把开始同步任务放在执行摘要区，并同时展示分组列表与运行日志
```

## Task 3: 把设置页改成紧凑维护台

**Files:**
- Modify: `E:/工具/竞品优化-V2/src/features/settings/components/GroupEditorPanel.tsx`
- Modify: `E:/工具/竞品优化-V2/src/features/settings/components/CrawlerSettingsPanel.tsx`
- Modify: `E:/工具/竞品优化-V2/src/App.tsx`

- [ ] **Step 1: 先写设置页结构测试，锁定“左编辑右参数”**

在 `src/App.command-center.test.tsx` 增加断言：

```tsx
it('设置页展示分组管理与运行参数两块紧凑面板', async () => {
  mountApp();
  await userEvent.click(await screen.findByRole('button', { name: '高级设置' }));

  expect(screen.getByText('分组管理')).toBeInTheDocument();
  expect(screen.getByText('运行参数')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认当前标题和布局还未更新**

Run: `npm run test:ui -- src/App.command-center.test.tsx`

Expected:

```text
FAIL  src/App.command-center.test.tsx
Unable to find an element with the text: 分组管理
```

- [ ] **Step 3: 重写 `GroupEditorPanel`，把分组选择和文本编辑压回同一维护轨道**

把标题与控件结构调整为：

```tsx
<SurfaceCard title="分组管理" description="维护分组名称、ASIN 与输出预览。">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
    <select ... className="min-w-[14rem] rounded-[10px] px-3 py-2 text-sm" />
    <div className="flex gap-2">
      <button type="button" className="rounded-[10px] px-3 py-2 text-sm">新建</button>
      <button type="button" className="rounded-[10px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">删除</button>
    </div>
  </div>
  <input ... className="mt-2 w-full rounded-[10px] px-3 py-2.5 text-sm" />
  <textarea ... className="mt-2 min-h-[240px] w-full rounded-[10px] px-3 py-3 font-mono text-sm" />
  <p className="mt-3 text-xs text-[var(--text-muted)]">输出预览：{props.excelPreview}</p>
</SurfaceCard>
```

- [ ] **Step 4: 重写 `CrawlerSettingsPanel`，改成右栏参数面板**

标题和按钮改成下面的节奏：

```tsx
<SurfaceCard title="运行参数" description="维护站点、浏览器模式和区域条件。">
  <div className="grid gap-4">
    <select ... />
    <label className="flex items-start gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] px-4 py-3">...</label>
    {showUsZipSettings ? <div className="grid gap-3 sm:grid-cols-2">...</div> : <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--text-muted)]">...</div>}
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" className="rounded-[10px] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)]">保存设置</button>
      <button type="button" className="rounded-[10px] border border-[var(--field-border)] px-4 py-2.5 text-sm">恢复默认</button>
    </div>
  </div>
</SurfaceCard>
```

- [ ] **Step 5: 调整 `App.tsx` 设置页容器宽度和间距，确保与首页语言一致**

设置页挂载区改成：

```tsx
<section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_320px]">
  <GroupEditorPanel ... />
  <CrawlerSettingsPanel ... />
</section>
```

- [ ] **Step 6: 跑设置页相关测试，确认结构、保存按钮和条件切换仍可用**

Run: `npm run test:ui -- src/App.command-center.test.tsx`

Expected:

```text
✓ 设置页展示分组管理与运行参数两块紧凑面板
✓ 设置页 US/EU 条件切换相关用例继续通过
```

## Task 4: 回归关键状态并完成构建验证

**Files:**
- Modify: `E:/工具/竞品优化-V2/src/App.command-center.test.tsx`

- [ ] **Step 1: 补充首页和设置页改版后的关键回归断言**

在现有集成测试中补三类断言：

```tsx
expect(screen.getByRole('button', { name: '开始同步任务' })).toBeDisabled();
expect(screen.getByText('异常留痕')).toBeInTheDocument();
expect(screen.getByText('文件入口')).toBeInTheDocument();
```

以及：

```tsx
expect(screen.getByRole('button', { name: '高级设置' })).toBeDisabled();
expect(screen.getByRole('button', { name: '保存设置' })).toBeDisabled();
```

用于覆盖同步进行中的锁定态。

- [ ] **Step 2: 跑完整 UI 测试，确认结构改版没有破坏现有状态机**

Run: `npm run test:ui`

Expected:

```text
Test Files  2 passed
Tests       31+ passed
```

- [ ] **Step 3: 跑类型检查，确认 JSX 重排和组件 props 没有漂移**

Run: `npm run typecheck`

Expected:

```text
tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit
```

- [ ] **Step 4: 跑前端和 Electron 构建，确认改版后的界面可正常打包**

Run:

```bash
npm run build:renderer
npm run build:electron
```

Expected:

```text
✓ built in ...
electron bundle ok
```

## Self-Review

### Spec coverage

- 首页从 Hero 改成工作台：Task 2 覆盖
- 设置页改成紧凑维护台：Task 3 覆盖
- 视觉向参考项目靠拢：Task 1 + Task 2 + Task 3 覆盖
- 保持业务逻辑与状态测试不回归：Task 4 覆盖

### Placeholder scan

- 计划中没有 `TODO`、`TBD`、`后续补充` 之类占位词
- 每个任务都给出了具体文件、代码方向和验证命令

### Type consistency

- 首页继续复用 `CommandCenterView / CommandHero / ExecutionRail / ActivityFeed`
- 设置页继续复用 `GroupEditorPanel / CrawlerSettingsPanel`
- 所有改动都围绕现有 `App.tsx` 状态编排，不引入新状态入口
