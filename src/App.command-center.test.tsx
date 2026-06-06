import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import App from './App';
import { GroupEditorPanel } from './features/settings/components/GroupEditorPanel';
import { CrawlerSettingsPanel } from './features/settings/components/CrawlerSettingsPanel';
import { createTrackerStub } from './test/createTrackerStub';

function mountApp(tracker = createTrackerStub()) {
  window.tracker = tracker;
  return render(<App />);
}

function clearTracker() {
  Object.defineProperty(window, 'tracker', {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

function mountWithoutTracker() {
  clearTracker();
  return render(<App />);
}

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  clearTracker();
  vi.restoreAllMocks();
});

describe('App command center home', () => {
  it('window.tracker 不可用时显示 preload 错误提示', async () => {
    mountWithoutTracker();

    expect(
      await screen.findByText(
        '未检测到 window.tracker（preload 未正常加载）。请先执行 npm run build:electron，再重新运行 npm run dev。',
      ),
    ).toBeInTheDocument();
  });

  it('渲染唯一主动作和命令中心关键区域', async () => {
    mountApp();

    const primaryActions = await screen.findAllByRole('button', { name: '开始同步任务' });
    expect(primaryActions).toHaveLength(1);

    expect(screen.getByRole('heading', { name: '待执行分组' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '运行轨迹' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '快速入口' })).toBeInTheDocument();
  });

  it('点击首页主 CTA 会调用 tracker.syncAsins', async () => {
    const syncAsins = vi.fn(async () => ({ ok: true }));
    mountApp(createTrackerStub({ syncAsins }));

    const user = userEvent.setup();
    const primaryAction = await screen.findByRole('button', { name: '开始同步任务' });
    await user.click(primaryAction);

    await waitFor(() => {
      expect(syncAsins).toHaveBeenCalledWith({ groupIds: ['group-1'] });
    });
  });

  it('同步前保存配置失败时给出明确反馈，且不会进入错误的同步进行中状态', async () => {
    const saveConfig = vi.fn(async () => ({ ok: false as const, error: 'config.json 写入失败' }));
    const syncAsins = vi.fn(async () => ({ ok: true as const }));
    mountApp(createTrackerStub({ saveConfig, syncAsins }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '开始同步任务' }));

    expect(await screen.findAllByText('保存配置失败：config.json 写入失败')).not.toHaveLength(0);
    expect(syncAsins).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '开始同步任务' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '同步进行中' })).not.toBeInTheDocument();
    expect(screen.queryByText('开始同步 1 个分组')).not.toBeInTheDocument();
  });

  it('同步执行期间显示同步中状态，完成后恢复为可再次启动', async () => {
    let resolveSync: ((value: { ok: true }) => void) | undefined;
    const syncAsins = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveSync = resolve;
        }),
    );

    mountApp(createTrackerStub({ syncAsins }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '开始同步任务' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '同步进行中' })).toBeDisabled();
    });
    expect(screen.getByText('正在同步 1 个分组')).toBeInTheDocument();
    expect(screen.getByText('开始同步 1 个分组')).toBeInTheDocument();

    resolveSync?.({ ok: true });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始同步任务' })).toBeEnabled();
    });
  });

  it('保存阶段会锁住入口且连击只触发一次 saveConfig', async () => {
    let resolveSave: ((value: { ok: true }) => void) | undefined;
    const saveConfig = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const syncAsins = vi.fn(async () => ({ ok: true as const }));
    mountApp(createTrackerStub({ saveConfig, syncAsins }));

    const user = userEvent.setup();
    const primaryAction = await screen.findByRole('button', { name: '开始同步任务' });
    await user.dblClick(primaryAction);

    expect(saveConfig).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(primaryAction).toBeDisabled();
    });
    expect(syncAsins).not.toHaveBeenCalled();

    resolveSave?.({ ok: true });

    await waitFor(() => {
      expect(syncAsins).toHaveBeenCalledTimes(1);
    });
  });

  it('同步准备阶段不允许切到设置页', async () => {
    let resolveSave: ((value: { ok: true }) => void) | undefined;
    const saveConfig = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const syncAsins = vi.fn(async () => ({ ok: true as const }));
    mountApp(createTrackerStub({ saveConfig, syncAsins }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '开始同步任务' }));

    const settingsTab = screen.getByRole('button', { name: '高级设置' });
    await waitFor(() => {
      expect(settingsTab).toBeDisabled();
    });
    await user.click(settingsTab);

    expect(screen.queryByRole('heading', { name: '分组编辑' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '待执行分组' })).toBeInTheDocument();

    resolveSave?.({ ok: true });
  });

  it('syncAsins 返回失败时显示失败日志且不会误走成功路径', async () => {
    const baseTracker = createTrackerStub();
    const getConfig = vi.fn(baseTracker.getConfig);
    const syncAsins = vi.fn(async () => ({ ok: false as const, error: '服务端失败' }));
    mountApp(createTrackerStub({ getConfig, syncAsins }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '开始同步任务' }));

    expect(await screen.findAllByText('同步结束（有失败项）：服务端失败')).not.toHaveLength(0);
    expect(screen.queryByText('全部选中分组同步完成')).not.toBeInTheDocument();
    expect(getConfig).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始同步任务' })).toBeEnabled();
    });
  });

  it('syncAsins 抛出异常时显示异常日志且不会误走成功路径', async () => {
    const baseTracker = createTrackerStub();
    const getConfig = vi.fn(baseTracker.getConfig);
    const syncAsins = vi.fn(async () => {
      throw new Error('network exploded');
    });
    mountApp(createTrackerStub({ getConfig, syncAsins }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '开始同步任务' }));

    expect(await screen.findAllByText('异常：network exploded')).not.toHaveLength(0);
    expect(screen.queryByText('全部选中分组同步完成')).not.toBeInTheDocument();
    expect(getConfig).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始同步任务' })).toBeEnabled();
    });
  });

  it('点击快速入口会调用对应 tracker 方法', async () => {
    const openExcel = vi.fn(async () => ({ ok: true }));
    const openDataFolder = vi.fn(async () => ({ ok: true }));
    const openLogsFolder = vi.fn(async () => ({ ok: true }));

    mountApp(createTrackerStub({ openExcel, openDataFolder, openLogsFolder }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '打开今日 Excel' }));
    await user.click(screen.getByRole('button', { name: '打开 data 目录' }));
    await user.click(screen.getByRole('button', { name: '打开日志目录' }));

    expect(openExcel).toHaveBeenCalledTimes(1);
    expect(openDataFolder).toHaveBeenCalledTimes(1);
    expect(openLogsFolder).toHaveBeenCalledTimes(1);
  });

  it('日志与异常留痕按结构分流渲染', async () => {
    mountApp(
      createTrackerStub({
        onSyncProgress: (callback) => {
          callback({ type: 'log', message: '任务排队中' });
          callback({ type: 'log', message: '失败截图路径已归档' });
          callback({ type: 'error', message: 'network timeout' });
          callback({ type: 'done', message: '2026-06-06 10:30:00' });
          return () => undefined;
        },
      }),
    );

    await screen.findByText('任务排队中');
    const activityCard = screen.getByRole('heading', { name: '运行轨迹' }).closest('section');
    const issueCard = screen.getByRole('heading', { name: '异常留痕' }).closest('section');

    expect(activityCard).not.toBeNull();
    expect(issueCard).not.toBeNull();

    expect(within(activityCard as HTMLElement).getByText('最近完成：2026-06-06 10:30:00')).toBeInTheDocument();
    expect(within(activityCard as HTMLElement).getByText('错误: network timeout')).toBeInTheDocument();
    expect(screen.getAllByText('失败截图路径已归档')).toHaveLength(1);
    expect(within(issueCard as HTMLElement).getByText('错误: network timeout')).toBeInTheDocument();
    expect(within(issueCard as HTMLElement).queryByText('失败截图路径已归档')).not.toBeInTheDocument();
  });

  it('没有可执行分组时禁用主按钮并显示阻断信息', async () => {
    mountApp(
      createTrackerStub({
        getConfig: async () => ({
          headless: true,
          marketplace: 'us',
          zipCode: '10001',
          zipHomeWaitSec: 10,
          zipModalWaitSec: 10,
          locale: 'en-US',
          activeGroupId: 'empty-group',
          groups: [{ id: 'empty-group', name: '空分组', asins: [] }],
        }),
      }),
    );

    const primaryAction = await screen.findByRole('button', { name: '开始同步任务' });

    await waitFor(() => {
      expect(primaryAction).toBeDisabled();
    });
    expect(screen.getByText('当前没有可执行分组')).toBeInTheDocument();
  });

  it('高级设置页按站点切换显示条件字段，并提供保存入口', async () => {
    mountApp();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '高级设置' }));

    expect(screen.getByRole('heading', { name: '分组编辑' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '抓取设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument();

    const crawlerPanel = screen.getByRole('heading', { name: '抓取设置' }).closest('section');
    expect(crawlerPanel).not.toBeNull();

    expect(within(crawlerPanel as HTMLElement).getByText('美国邮编')).toBeInTheDocument();

    await user.selectOptions(within(crawlerPanel as HTMLElement).getByRole('combobox'), 'de');

    await waitFor(() => {
      expect(within(crawlerPanel as HTMLElement).queryByText('美国邮编')).not.toBeInTheDocument();
    });
    expect(within(crawlerPanel as HTMLElement).getByText('当前站点为欧洲站，不执行美国邮编设置。')).toBeInTheDocument();
  });

  it('设置页保存配置失败时显示明确反馈', async () => {
    const saveConfig = vi.fn(async () => ({ ok: false as const, error: '磁盘不可写' }));
    mountApp(createTrackerStub({ saveConfig }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '高级设置' }));
    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('保存配置失败：磁盘不可写')).toBeInTheDocument();
  });

  it('设置页保存配置抛出异常时显示明确失败反馈', async () => {
    const saveConfig = vi.fn(async () => {
      throw new Error('磁盘写入中断');
    });
    mountApp(createTrackerStub({ saveConfig }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '高级设置' }));
    await user.click(screen.getByRole('button', { name: '保存设置' }));

    expect(await screen.findByText('保存配置失败：磁盘写入中断')).toBeInTheDocument();
  });

  it('设置组件在运行中统一禁用关键输入与按钮', () => {
    const noop = vi.fn();
    const { rerender } = render(
      <GroupEditorPanel
        groups={[{ id: 'group-1', name: '默认分组', asins: ['B0AAAAAA01'] }]}
        activeGroupId="group-1"
        editName="默认分组"
        editAsinText="B0AAAAAA01"
        excelPreview="E:/工具/竞品优化-V2/data/demo.xlsx"
        onSelectGroup={noop}
        onEditName={noop}
        onEditAsinText={noop}
        onNewGroup={noop}
        onDeleteGroup={noop}
        disabled={true}
      />,
    );

    expect(screen.getByLabelText('当前编辑分组')).toBeDisabled();
    expect(screen.getByLabelText('分组名称')).toBeDisabled();
    expect(screen.getByLabelText('本组 ASIN / Amazon 链接（每行一个）')).toBeDisabled();
    expect(screen.getByRole('button', { name: '新建分组' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除当前分组' })).toBeDisabled();

    rerender(
      <CrawlerSettingsPanel
        marketplace="us"
        marketplaceOptions={[{ code: 'us', label: '美国', host: 'amazon.com' }]}
        headed={false}
        zipCode="10001"
        zipHomeWaitSec={10}
        zipModalWaitSec={10}
        onMarketplaceChange={noop}
        onHeadedChange={noop}
        onZipCodeChange={noop}
        onZipHomeWaitSecChange={noop}
        onZipModalWaitSecChange={noop}
        onSave={noop}
        onResetDefaults={noop}
        disabled={true}
      />,
    );

    expect(screen.getByLabelText('Amazon 站点')).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByLabelText('美国邮编')).toBeDisabled();
    expect(screen.getByLabelText('首页等待（秒）')).toBeDisabled();
    expect(screen.getByLabelText('弹层等待（秒）')).toBeDisabled();
    expect(screen.getByRole('button', { name: '保存设置' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '恢复默认' })).toBeDisabled();
  });

  it('清空当前分组 ASIN 后切回同步页会立即禁用主 CTA', async () => {
    mountApp();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '高级设置' }));

    const asinField = screen.getByLabelText('本组 ASIN / Amazon 链接（每行一个）');
    await user.clear(asinField);
    await user.click(screen.getByRole('button', { name: '同步面板' }));

    const primaryAction = await screen.findByRole('button', { name: '开始同步任务' });
    await waitFor(() => {
      expect(primaryAction).toBeDisabled();
    });
    expect(screen.getByText('当前没有可执行分组')).toBeInTheDocument();
  });

  it('为空分组补充 ASIN 后切回同步页会立即可执行，并按新状态发起同步', async () => {
    const syncAsins = vi.fn(async () => ({ ok: true }));
    const saveConfig = vi.fn(async () => ({ ok: true as const }));
    mountApp(createTrackerStub({ syncAsins, saveConfig: saveConfig as Window['tracker']['saveConfig'] }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '高级设置' }));

    const asinField = screen.getByLabelText('本组 ASIN / Amazon 链接（每行一个）');
    await user.clear(asinField);
    await user.type(asinField, 'B0BBBBBB02');
    await user.click(screen.getByRole('button', { name: '同步面板' }));

    const primaryAction = await screen.findByRole('button', { name: '开始同步任务' });
    await waitFor(() => {
      expect(primaryAction).toBeEnabled();
    });

    await user.click(primaryAction);

    await waitFor(() => {
      expect(saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: [expect.objectContaining({ id: 'group-1', asins: ['B0BBBBBB02'] })],
        }),
      );
    });
    await waitFor(() => {
      expect(syncAsins).toHaveBeenCalledWith({ groupIds: ['group-1'] });
    });
  });

  it('同步前保存配置抛出异常时显示失败反馈且不会进入同步', async () => {
    const saveConfig = vi.fn(async () => {
      throw new Error('config service down');
    });
    const syncAsins = vi.fn(async () => ({ ok: true as const }));
    mountApp(createTrackerStub({ saveConfig, syncAsins }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '开始同步任务' }));

    expect(await screen.findAllByText('保存配置失败：config service down')).not.toHaveLength(0);
    expect(syncAsins).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '同步进行中' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '开始同步任务' })).toBeEnabled();
    });
  });

  it('首屏加载失败时显示可恢复提示并支持重试', async () => {
    const getConfig = vi
      .fn<Window['tracker']['getConfig']>()
      .mockRejectedValueOnce(new Error('配置读取失败'))
      .mockResolvedValue({
        headless: true,
        marketplace: 'us',
        zipCode: '10001',
        zipHomeWaitSec: 10,
        zipModalWaitSec: 10,
        locale: 'en-US',
        activeGroupId: 'group-1',
        groups: [{ id: 'group-1', name: '默认分组', asins: ['B0AAAAAA01'] }],
      });

    mountApp(createTrackerStub({ getConfig }));

    expect(await screen.findByText('加载配置失败：配置读取失败')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: '重试加载' });
    expect(retryButton).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(retryButton);

    await screen.findByRole('heading', { name: '待执行分组' });
    expect(screen.queryByText('加载配置失败：配置读取失败')).not.toBeInTheDocument();
  });

  it('恢复默认配置抛出异常时显示明确反馈', async () => {
    const getDefaultConfig = vi.fn(async () => {
      throw new Error('默认配置读取失败');
    });
    mountApp(createTrackerStub({ getDefaultConfig }));

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '高级设置' }));
    await user.click(screen.getByRole('button', { name: '恢复默认' }));

    expect(await screen.findByText('恢复默认配置失败：默认配置读取失败')).toBeInTheDocument();
  });
});
