# 聊天设置 · Chat Settings

> DSH (DeepSeek Harness) 插件 · `dsh-chat-simple`

把两个功能收进**一个设置分区**：顶端两个页签 ——「会话头像」与「文字显示」。

- **会话头像**：给会话双方各配一张头像，消息像好友聊天一样左右分列（你在右、助手在左）
- **文字显示**：改中文字体、英文字体、代码字体与字号，外加字距 / 行距 / 段距 / 首行缩进

两块都是**纯 DOM / CSS 覆盖**：不改任何官方组件、不注册任何聊天插槽；关掉即逐字节回到原生。

## 安装

需要 **DeepSeek Harness kernel ≥ 0.1.5**（官方桌面版，或 DSH Desktop ≥ 2.0.7）。

```bash
pnpm add dsh-chat-simple
```

然后把 bundle 加进 profile 的 `package.json` → `dsh.profile.bundles`，并在 `cordis.yml` 加一行：

```yaml
- id: chat-simple
  name: dsh-chat-simple
```

重启 DSH → 设置侧栏出现「聊天设置」。

> ⚠️ **不要与本仓派生自的两个原插件同时启用**（`dsh-font-probe`、
> `dsh-plugin-wallpaper-engine`）。它们会各自再注册一个分区，侧栏出现重复入口。
> 装本插件前先停用那两个。

## 用法

### 页签一：会话头像

| 控件 | 说明 |
| --- | --- |
| 启用自定义会话头像 | 总开关（默认关，因为它改的是会话界面的排布） |
| 「我」的头像 / 「助手」的头像 | 导入 / 替换 / 清除。没导入就画内置默认头像 |
| 头像大小 | 24–72 px，默认 40 |
| 圆角强度 | 0–100%，默认 100（正圆）；50 = 大圆角方块，0 = 直角方形 |

图片只保存在**本机**，导入时先等比缩到 512 px 以内（JPG / PNG / WebP，上限 8 MB）。

### 页签二：文字显示

中文字体、英文字体、代码字体三个下拉 + 两个字号，下面四行滑块是排版：字距、行距、段距、首行缩进。改动先作为**草稿预览**，点底部「确认应用」才写回 profile。

## 它是怎么做到的

### 会话头像

官方 `ChatNodeSeat` 会给每个消息行写 `data-chat-flow-kind`。插件给三类行（`user` / `steering` / `assistant-step`）的**最前面**插一个 `.sa-avatar` 节点，并把行改成横向 flex；用户行是 `row-reverse`，所以**同一个插入顺序**天然让"我的头像落最右、助手的落最左"，不需要两套逻辑。

- 只碰这三类消息行 —— 工具调用、思考过程、压缩标记一律不动
- 幂等 + 就地更新：`data-sa-avatar-row` 是标记，拖滑块只改已注入节点，不重建 DOM
- 观察者开销有硬界：流式输出时每帧都在插节点，回调对非消息行的新增元素只做一次 `closest` 早退
- 尺寸与圆角走 `body` 上的 CSS 变量，拖滑块只是变量替换

### 文字显示

`@deepseek-ai/dsh-client-ui-theme` 的 `base.css` 是唯一声明字体令牌的地方，且只在 `:root`：

```css
:root { --dsw-font-family: -apple-system, …, "Microsoft YaHei", … }
```

全 bundle 搜 `dsw-font-family`，其余命中全是 `var(...)` 消费，**没有一条 `font-family: var(--dsw-font-family)`** —— 所以改这一个令牌就是改全局字体。字体应用分两条通道（样式表 + inline important），后者压过一切样式表，用来排除层叠 / 加载顺序 / 选择器带来的不确定性。

## 数据存哪

| 内容 | 位置 |
| --- | --- |
| 文字显示的九个字段 | profile 的 `cordis.patch.yml`，`- id: chat-simple` 那一行的 `config` |
| 头像设置（五个 `avatar*` 键） | `~/.dsh-chat-simple/config.json` 的 `settings` 字段 |
| 两张头像图 | `~/.dsh-chat-simple/avatars/<side>-<stamp>.<ext>` |
| 当前页签 | `localStorage`（视图态，不落配置） |

数据目录可用 `DSH_CHAT_SIMPLE_DATA_DIR` 整体挪走（测试隔离用）。

**为什么头像设置存宿主文件而不是 localStorage**：DSH Desktop 每次用随机 `--port 0` 重启，浏览器 origin 会变，origin 作用域的存储保不住设置。

**为什么字体设置走 profile 配置**：DSH 的设置表单是按**宿主条目 id** 投射的（`configForms` 按行 id 取表单），并且只有标了 `.volatile()` 的字段能经这条路径写盘 —— 这是官方设置通道的契约，不是本插件的选择。

### 从旧插件升级（一次性回落）

两个旧插件的持久化坐标都不同，改名会孤立已存配置，所以本插件带两条回落：

- **字体**：新行 `chat-simple` 从没存过东西时，读一次旧行 `font-probe` 的值当初始值，并立刻写进新行。之后不再依赖旧行。
- **头像**：新目录 `~/.dsh-chat-simple` 里没有那张图时，按 `~/.dsh-session-avatar` → `~/.dsh-wallpaper-engine` 的顺序找，**找到就直接按旧路径服务**（不复制，避免两份真源）。下一次导入自然落在新目录。

## 宿主路由（同源 HTTP）

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` / `PUT` | `/chat-simple/settings` | 读写头像设置（PUT 走白名单消毒，只认五个 `avatar*` 键） |
| `GET` / `HEAD` | `/chat-simple/avatar/<side>` | 取那张图（`side` ∈ `user` / `ai`） |
| `POST` | `/chat-simple/avatar/<side>` | 导入（raw body + MIME 白名单，8 MB 上限） |
| `DELETE` | `/chat-simple/avatar/<side>` | 清除 |

头像 URL 上带的是**文件名**（`?v=<name>`），换图即换名 ⇒ 服务端敢给 `immutable` 长缓存；未导入则 404 + `no-store`。

`webServer` **不做硬依赖**（这点与壁纸引擎那个前身不同）：文字显示不需要任何服务，因为拿不到 webServer 就把字体一起拖死是不成比例的失败。这里改为有界轮询挂载路由；实在没有则只有头像持久化降级到 localStorage，字体照常生效。

## 结构

```
lib/
  index.js          宿主半边：Config schema（文字显示）+ 头像的两条 HTTP 路由
  client.js         浏览器半边：两个独立闭包 + 一个双页签设置分区（自包含，无构建步骤）
  http-body.js      收请求体的唯一缓冲实现（累加 + 字节计闸 + 一次解码）
  routes/avatar.js  头像族路由：POST 导入 / GET·HEAD 查看 / DELETE 清除
  types/            两侧的公开类型面
locale/
  zh.json en.json   插件页卡片的标题与说明（跟随界面语言）
cordis.patch.yml    bundle 声明：往 profile 插一行宿主 entry（id = chat-simple）
NOTICE.md           两个上游的 MIT 版权声明
```

`client.js` 是**最终产物**，没有构建步骤 —— 改完直接生效。两个板块各自封在自己的闭包里（`createAvatarHalf` / `createFontHalf`），互不共享标识符，所以两边的实现不会互相踩到。

运行时零第三方依赖（`react` 由宿主提供）。

## 来源

本插件合并自两个 MIT 项目，两半的实现基本逐字沿用（各自的注释里记录了若干实测踩出来的坑，重写会静默地把它们放回去）：

- **文字显示** ← [`dsh-font-probe`](https://github.com/<your-name>/dsh-font-probe)（MIT，© dsh-font-probe contributors）
- **会话头像** ← [`dsh-plugin-wallpaper-engine`](https://github.com/elysia395/dsh-wallpaper-engine)（MIT，© elysia395）—— 会话头像是它唯一保留下来的功能

改动范围、以及两个上游的完整版权声明见 [`NOTICE.md`](./NOTICE.md)。感谢两位原作者。

## 许可

MIT
