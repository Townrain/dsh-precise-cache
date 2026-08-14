# dsh-precise-cache

简体中文 | [English](README.en.md)

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 界面提供**五位小数的缓存命中读数**：在 composer 下方聊天统计条旁边新增一行，显示 `精确命中 XX.XXXXX%`。

## 为什么需要它

内置统计行的缓存命中率会**四舍五入到整数**：真实命中率只要 ≥ 99.5% 就显示为 `100%`。本插件使用与内置行**完全相同的分母**（缓存读取 ÷ 三个互斥计费桶 `uncachedInputTokens + cacheReadTokens + cacheWriteTokens` 之和），但**不做任何舍入**，只保留五位小数，让接近 100% 的真实命中率现出原形。读数来自持久化的 `tokenUsage` 投影（全日志累计），分页、压缩、刷新都不会改变它；没有输入计费时自动隐藏。

## 功能

- 一行读数，紧跟内置统计行，视觉体系一致（12px 三级文字、居中、超长省略）
- 五位固定小数，无四舍五入
- 中文 / 英文双语，跟随 Harness 语言设置（`preciseCache` 词典命名空间）
- 零宿主代码：纯浏览器呈现，不注册任何 Service、工具或提示词
- 完全可逆：插件停止/更新时，槽条目、词典与样式标签全部自动清理

## 安装

```sh
npx dsh-precise-cache install
```

安装器会幂等地完成：

1. 把包复制到 `$DSH_HOME/profiles/node_modules/dsh-precise-cache`（dsh 的插件解析根）
2. 在 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 写入组合行

之后**重启 dsh 并刷新浏览器页面**即可看到读数——重启是唯一需要手动完成的步骤。

可选参数：

| 参数 | 说明 |
| --- | --- |
| `--profile <name>` | 指定目标 profile（默认 `web`） |
| `--force` | 重新覆盖已安装的包 |
| `--from <dir>` | 从本地源码目录安装（git clone 后使用） |

从源码本地安装：

```sh
git clone https://github.com/Townrain/dsh-precise-cache.git
cd dsh-precise-cache
node scripts/install.js install --from . --force
```

## 卸载

```sh
npx dsh-precise-cache uninstall
```

或手动：删除 `$DSH_HOME/profiles/node_modules/dsh-precise-cache` 目录，并从 `cordis.patch.yml` 移除 `name: dsh-precise-cache` 的 insert 行，然后重启 dsh。也可以在 Harness 设置页的插件清单里禁用本插件。

## 工作原理

```
lib/index.js      宿主半：空实现（读数纯属浏览器呈现）
lib/client.js     浏览器半：模块表格式 bundle，无需构建步骤
scripts/install.js 一键安装器：拷贝包 + 写入组合行
```

- **数据来源**：Harness 的 `tokenUsage` 投影（provider 上报值，宿主折叠、全日志累计），通过 dock 槽位的标准 `useProjection` 座席读取，无任何自建 RPC。
- **插件装载契约**：`package.json` 声明 `dsh.client.platform = "web"` 及 `inject` 依赖，宿主扫描器据此生成 `window.__DSH_BOOT__` 图行并挂载 `/plugins/dsh-precise-cache/client.js` 路由；浏览器半以 `window.__ModuleLoader__.load({ id, factory })` 注册交接，`id` 即包名，工厂返回 `{ apply, inject }`。
- **UI 入口**：通过 `ctx.slots.inject('conversation.composer.dock', …)` 注册为新 id 的列表条目（排在内置 `stats` 行之后），文案走 `locale: 'preciseCache'` 座席，样式标签带 `data-plugin` 归属、卸载时由模块加载器回收。
- **热更新边界**：`lib/client.js` 内容变化刷新页面即生效；`dsh.client` 声明变化需要重启 dsh。

## 开发

```sh
npm run check          # node --check 语法校验
npm run install:local  # 本地安装验证
```

## 许可

MIT © 2026 [Townrain](https://github.com/Townrain)。欢迎按 `dsh-plugin` 生态习惯提 PR 与 Issue。
