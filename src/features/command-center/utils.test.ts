import { describe, expect, expectTypeOf, it } from 'vitest';

import type { UserConfig } from './model';
import { getRunnableGroups } from './selectors';
import { createTrackerStub } from '../../test/createTrackerStub';
import { buildCommandSummary, getSyncBlockReason, parseAsinText } from './utils';

const buildSummaryFromRunnableGroups: (
  config: UserConfig,
  groups: UserConfig['groups'],
  busy: boolean,
) => ReturnType<typeof buildCommandSummary> = buildCommandSummary;

const baseConfig: UserConfig = {
  headless: true,
  marketplace: 'us',
  zipCode: '10001',
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
  it('能从纯文本和 Amazon 链接中提取并去重 ASIN', () => {
    const input = `
      B0AAAAAA01
      https://www.amazon.com/dp/B0BBBBBB02
      https://www.amazon.com/gp/product/B0BBBBBB02
      https://www.amazon.com/s?k=test&asin=B0CCCCCC03
      invalid
    `;

    expect(parseAsinText(input)).toEqual(['B0AAAAAA01', 'B0BBBBBB02', 'B0CCCCCC03']);
  });

  it('会把小写 asin 归一化为大写', () => {
    expect(parseAsinText('b0dddddd04')).toEqual(['B0DDDDDD04']);
  });

  it('会对文本中的重复 asin 去重', () => {
    expect(parseAsinText('B0EEEEEE05 B0EEEEEE05\nb0eeeeee05')).toEqual(['B0EEEEEE05']);
  });
});

describe('getRunnableGroups', () => {
  it('只返回已选且包含 ASIN 的分组', () => {
    expect(getRunnableGroups(baseConfig, new Set(['g-1', 'g-2']))).toEqual([baseConfig.groups[0]]);
  });
});

describe('getSyncBlockReason', () => {
  it('在没有可执行分组时返回阻断原因', () => {
    expect(getSyncBlockReason(baseConfig, new Set(['g-2']), false)).toBe('当前没有可执行分组');
  });

  it('在 busy=true 时不返回阻断原因', () => {
    expect(getSyncBlockReason(baseConfig, new Set(['g-2']), true)).toBeNull();
  });
});

describe('buildCommandSummary', () => {
  it('第二个参数契约与 runnable groups 对齐', () => {
    expectTypeOf(buildSummaryFromRunnableGroups).toEqualTypeOf(buildCommandSummary);
  });

  it('基于配置和选择结果构建首页 hero 文案', () => {
    const runnableGroups = getRunnableGroups(baseConfig, new Set(['g-1', 'g-2']));

    expect(buildCommandSummary(baseConfig, runnableGroups, false)).toEqual({
      title: '已准备同步 1 个分组',
      detail: '美区站点，无头模式，可直接开始同步任务。',
      actionLabel: '开始同步任务',
    });
  });

  it('分组数量与 runnable 规则保持一致', () => {
    const runnableGroups = getRunnableGroups(baseConfig, new Set(['g-1', 'g-2']));

    expect(buildCommandSummary(baseConfig, runnableGroups, false).title).toBe('已准备同步 1 个分组');
  });
});

describe('createTrackerStub', () => {
  it('每次返回新的配置对象和嵌套数组引用', async () => {
    const tracker = createTrackerStub();
    const first = await tracker.getConfig();
    const second = await tracker.getConfig();

    expect(first).not.toBe(second);
    expect(first.groups).not.toBe(second.groups);
    expect(first.groups[0].asins).not.toBe(second.groups[0].asins);
    expect(first).toEqual(second);
  });
});
