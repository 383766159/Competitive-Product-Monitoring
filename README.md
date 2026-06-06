# Amazon 竞品监控工具

一个基于 `Electron + React + Playwright + ExcelJS` 的桌面工具，用来按分组抓取 Amazon PDP 关键字段，并按天写入 Excel。

当前版本重点重构了价格抓取链路，解决参考项目里“页面价格偶发抓不到、失败后难以定位”的问题。

## 当前能力

- 支持站点：`amazon.com / .de / .fr / .it / .es`
- 支持分组管理：每个分组独立输出一份 Excel
- 支持美国站邮编设置
- 抓取失败会自动重试 3 次
- 价格失败会额外保留：
  - `logs/screenshots/*.png`
  - `logs/price-debug/*.json`

## 项目结构

```text
electron/
  crawler/
    extractors/      字段提取器
    amazonContext.ts 美国站邮编设置
    scrapeAsin.ts    单个 ASIN 抓取编排
  excel/
    writer.ts        Excel 写入
  main.ts            Electron 主进程 / IPC / 同步主流程
  preload.ts         渲染进程桥接
  utils/
src/
  App.tsx            桌面端界面
  previewExcelPath.ts
scripts/
  build-electron.mjs
```

## 价格抓取策略

`electron/crawler/extractors/prices.ts`

主价格按以下优先级提取：

1. 价格主区域选择器
2. `a-offscreen`
3. `whole/fraction/symbol` 拆分价格
4. `aria-hidden="true"` 内的可见价格片段
5. 旧版 `priceblock_*`
6. `meta[itemprop="price"]`
7. `JSON-LD offers.price`
8. twister 隐藏价格字段

同时会尽量避开这些容易误判的节点：

- `.a-text-price`
- `basisPrice`
- `list price` 相关容器

## 失败留痕

如果某个 ASIN 最终仍然失败：

- 主进程会保存截图到 `logs/screenshots`
- 价格提取器会输出一份简化 DOM/候选价格调试 JSON 到 `logs/price-debug`

调试 JSON 里会包含：

- 当前页面标题
- 当前 URL
- 是否疑似命中验证码
- 关键价格选择器命中的文本
- 页面上若干价格线索

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run typecheck
npm run build:electron
npm run build:renderer
```

如需打包绿色版：

```bash
npm run pack:browsers
npm run release
```

## 这次相对参考项目的调整

- 重建了当前工作区项目骨架，去掉了构建产物和无关目录
- 重写了价格提取策略和失败判定
- 把“价格为空”也纳入失败重试
- 增加价格调试 JSON，降低后续 DOM 定位成本
- 清理了界面文案和配置流程
- 增加 `npm run typecheck`

## 如果还需要继续定位价格问题

请优先提供下面任意一项：

1. 抓不到价格的具体 ASIN 或商品链接
2. 对应站点和邮编
3. 商品页价格区域截图
4. 商品页价格区域 DOM

有了具体失败页后，可以继续把选择器收得更准，尤其是：

- Prime 专享价
- 变体切换后的价格
- Coupon / LD / BD 混合场景
- 欧洲站本地化价格格式
