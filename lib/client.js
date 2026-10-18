window.__ModuleLoader__.load({
	id: "dsh-chat-simple",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/* ══════════════════════════════════════════════════════════════════════
		 * dsh-chat-simple — 浏览器半边：把「会话头像」与「文字显示」合成一个设置分区
		 *
		 * 两个板块各自是一个**独立闭包**（createAvatarHalf / createFontHalf），
		 * 逐字沿用原插件的实现，只改了三件事：
		 *   1. 各自不再注册 settings.section —— 这里统一注册一个「聊天设置」
		 *   2. 各自的持久化坐标换新（路由 /chat-simple、行 id chat-simple），字体半边
		 *      保留对旧行 font-probe 的一次性回落读（旧值不会因改名而丢）
		 *   3. 顶端两个页签切换两个板块
		 * ══════════════════════════════════════════════════════════════════════ */

		const React = require("react");

		/* 页签是**视图态**（localStorage），不进任何配置：它不是用户意图。 */
		const TAB_KEY = "dsh-chat-simple:tab";
		const TABS = [
			{ id: "avatar", label: "会话头像" },
			{ id: "text", label: "文字显示" },
		];
		function readTab() {
			try {
				const v = localStorage.getItem(TAB_KEY);
				if (v && TABS.some((x) => x.id === v)) return v;
			} catch { /* 站点数据被禁：默认页签 */ }
			return "avatar";
		}

		function createTabbedSection(avatarHalf, fontHalf, t) {
			const bar = {
				display: "flex", gap: 4, padding: 4, borderRadius: 10,
				background: "var(--dsw-alias-bg-layer-1, rgba(128,128,128,0.10))",
				border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.20))",
				flex: "0 0 auto",
			};
			const tabStyle = (active) => ({
				flex: "1 1 0", minWidth: 0, height: 30, border: "none", borderRadius: 7,
				cursor: "pointer", font: "inherit", fontSize: "13px",
				fontWeight: active ? 600 : 400,
				color: active ? "var(--dsw-alias-label-primary, inherit)" : "var(--dsw-alias-label-secondary, rgba(128,128,128,0.85))",
				background: active ? "var(--dsw-alias-bg-layer-3, rgba(255,255,255,0.72))" : "transparent",
				boxShadow: active ? "0 1px 3px rgba(0,0,0,0.16)" : "none",
				transition: "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
				whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
			});

			return function ChatSettingsSection() {
				const [tab, setTab] = React.useState(readTab);
				const pick = (id) => {
					setTab(id);
					try { localStorage.setItem(TAB_KEY, id); } catch { /* 存不下也要能切 */ }
				};
				return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
					React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
						React.createElement("div", { style: { fontSize: "15px", fontWeight: 600, color: "var(--dsw-alias-label-primary, inherit)" } }, t("聊天设置")),
						React.createElement("div", { style: bar, role: "tablist", "aria-label": t("聊天设置分区") },
							TABS.map((x) => React.createElement("button", {
								key: x.id, type: "button", role: "tab",
								"aria-selected": tab === x.id ? "true" : "false",
								style: tabStyle(tab === x.id),
								onClick: () => pick(x.id),
							}, t(x.label))),
						),
					),
					// 两个板块都**挂载后隐藏**，不是条件渲染：字体页有草稿态与预览高度、
					// 头像页有在途导入 —— 切页签不该把它们丢掉（卸载重建会重置草稿）。
					React.createElement("div", { style: { display: tab === "avatar" ? "block" : "none" }, role: "tabpanel" },
						React.createElement(avatarHalf.Page, null)),
					React.createElement("div", { style: { display: tab === "text" ? "block" : "none" }, role: "tabpanel" },
						React.createElement(fontHalf.Page, null)),
				);
			};
		}

		/* ── 两个半边（各自一个闭包）────────────────────────────────────────── */
		function createAvatarHalf() {

		// React 由 DSH 客户端模块加载器注册，与官方 bundle 同一条取法。
		const React = require("react");

		// ════════════════════════════════════════════════════════════════════════════
		// 会话头像板块（合并自 dsh-session-avatar）
		//
		// 本 bundle 只做一件事：给会话双方各配一张头像，消息像好友聊天一样左右分列。
		// 设置入口是一个一级分区「会话头像」，面板里只有头像那一组控件。
		//
		// 契约：
		//   · 宿主路由前缀 /chat-simple（设置持久化 + 两张头像图读写），
		//     数据目录 ~/.dsh-chat-simple（宿主会把旧目录里的图迁进来）。
		//   · 装饰本体是纯 DOM 补丁（给 data-chat-flow-kind 的消息行补 .sa-avatar 节点），
		//     不改任何官方组件；关掉开关逐字节回到原生。
		//   · 所有注入的类名 / 属性 / CSS 变量都以 sa- 为前缀，与宿主和第三方插件不冲突。
		// ════════════════════════════════════════════════════════════════════════════

		// ── i18n：中文原文即键，跟随宿主 locale 服务 ────────────────────────────────
		const SA_I18N_NS = "chat-simple";
		const SA_I18N_DEFAULT_LOCALE = "zh";

		/** 英文词表（键 = 界面上的中文原文）。 */
		const SA_I18N_EN = {
			"会话头像": "Session avatars",
			"给会话双方各配一张头像": "Give both sides of the conversation an avatar",
			"自定义会话头像": "Custom session avatars",
			"给会话双方各配一张头像，消息像好友聊天一样左右分列（默认关）": "Give both sides of the conversation an avatar, so messages line up left and right like a chat with a friend (off by default)",
			"启用自定义会话头像": "Enable custom session avatars",
			"给会话双方配上头像，消息像好友聊天一样左右分列": "Gives both sides an avatar, so messages line up left and right like a chat with a friend",
			"开启后：你的消息靠右侧、带你的头像；助手的消息靠左侧、带助手的头像。图片只保存在本机（导入时会缩到 512px 以内），没导入就用内置的默认头像。关掉这个开关，会话立刻恢复原样。": "Once on: your messages sit on the right with your avatar; the assistant's messages sit on the left with its own. Images are stored on this machine only (shrunk to at most 512px on import); without one a built-in default avatar is drawn. Turn this off and the conversation goes back to exactly how it was.",
			"「我」的头像": "Your avatar",
			"你的消息在右侧，头像跟着在右侧": "Your messages sit on the right, so your avatar does too",
			"「助手」的头像": "Assistant avatar",
			"助手的消息在左侧，头像跟着在左侧": "The assistant's messages sit on the left, so its avatar does too",
			"导入图片…": "Import image…",
			"替换图片…": "Replace image…",
			"导入中…": "Importing…",
			"清除": "Clear",
			"头像大小": "Avatar size",
			"圆角强度": "Corner roundness",
			"100% = 正圆（默认），50% = 大圆角方块，0% = 直角方形": "100% = a full circle (default), 50% = a rounded square, 0% = sharp corners",
			"仅支持 JPG / PNG / WebP 图片": "Only JPG / PNG / WebP images are supported",
			"导入失败：{error}": "Import failed: {error}",
			"清除失败：{error}": "Clear failed: {error}",
			"宿主里没有{what}路由：重启 DSH 后再试（改过宿主代码要重挂，刷新页面不够）": "The host has no {what} route: restart DSH and try again (if you changed host code it must be re-mounted; refreshing the page is not enough)",
			"宿主返回 {status}": "Host returned {status}",
			"头像": "avatar",
			"聊天设置": "Chat settings",
			"聊天设置分区": "Chat settings sections",
			"文字显示": "Text display",
		};

		let saLocaleService = null;
		let saLocaleActive = SA_I18N_DEFAULT_LOCALE;
		let saLocaleRevision = 0;
		const saLocaleListeners = new Set();

		function saLocaleIsZh(id) { return String(id || "").toLowerCase().startsWith("zh"); }
		function saLocaleId() { return saLocaleService !== null ? saLocaleActive : SA_I18N_DEFAULT_LOCALE; }
		function saLocaleRevisionValue() { return saLocaleRevision; }
		function saLocaleSubscribe(fn) {
			if (typeof fn !== "function") return () => {};
			saLocaleListeners.add(fn);
			return () => { saLocaleListeners.delete(fn); };
		}
		function saOnLocaleChange(fn) { return saLocaleSubscribe(fn); }
		function saLocalePublish(nextActive, force) {
			const changed = force === true || nextActive !== saLocaleActive;
			if (nextActive !== saLocaleActive) saLocaleActive = nextActive;
			if (!changed) return;
			saLocaleRevision += 1;
			for (const fn of Array.from(saLocaleListeners)) {
				try { fn(); } catch { /* 单个订阅者异常不许打断其它订阅者 */ }
			}
		}
		function saI18nInterpolate(template, params) {
			if (!params) return template;
			return template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
		}
		/** 取词：`saT("头像大小")` → 当前语言下的文案。 */
		function saT(key, params) {
			const text = String(key);
			if (saLocaleService !== null && typeof saLocaleService.bind === "function") {
				try {
					const bound = saLocaleService.bind(SA_I18N_NS);
					if (typeof bound === "function") return bound(text, params);
				} catch { /* 服务异常：落到本地实现 */ }
			}
			const out = saLocaleIsZh(saLocaleId()) ? text : (SA_I18N_EN[text] !== undefined ? SA_I18N_EN[text] : text);
			return saI18nInterpolate(out, params);
		}
		function saI18nZhDict() { const o = {}; for (const k of Object.keys(SA_I18N_EN)) o[k] = k; return o; }
		function saI18nEnDict() { return Object.assign({}, SA_I18N_EN); }

		/** 接上宿主 locale 服务（可选服务 + 短轮询）；永远拿不到就停在默认语言（中文）。 */
		function saI18nAttach(ctx) {
			if (!ctx || typeof ctx.get !== "function") return null;
			let disposed = false, poll = 0, offDicts = null, offSub = null, attachedTo = null;
			const sync = () => {
				if (disposed || attachedTo === null) return;
				let active = SA_I18N_DEFAULT_LOCALE;
				try { const snap = attachedTo.getSnapshot(); active = (snap && snap.active) || SA_I18N_DEFAULT_LOCALE; } catch { /* 默认语言 */ }
				saLocalePublish(active, false);
			};
			const attempt = () => {
				if (disposed) return;
				let service = null;
				try { service = ctx.get("locale"); } catch { service = null; }
				if (!service || typeof service.getSnapshot !== "function" || typeof service.register !== "function") {
					poll = setTimeout(attempt, 250);
					if (poll && typeof poll.unref === "function") poll.unref();
					return;
				}
				attachedTo = service; saLocaleService = service;
				try {
					const offZh = service.register(SA_I18N_NS, "zh", saI18nZhDict());
					const offEn = service.register(SA_I18N_NS, "en", saI18nEnDict());
					offDicts = () => { try { offZh(); } catch { /* ignore */ } try { offEn(); } catch { /* ignore */ } };
				} catch { offDicts = null; }
				if (typeof service.subscribe === "function") { try { offSub = service.subscribe(sync); } catch { offSub = null; } }
				sync();
				saLocalePublish(saLocaleActive, true);
			};
			attempt();
			return () => {
				disposed = true;
				if (poll) { try { clearTimeout(poll); } catch { /* ignore */ } poll = 0; }
				if (offSub) { try { offSub(); } catch { /* ignore */ } offSub = null; }
				if (offDicts) { try { offDicts(); } catch { /* ignore */ } offDicts = null; }
				if (saLocaleService === attachedTo) saLocaleService = null;
				attachedTo = null;
				saLocalePublish(SA_I18N_DEFAULT_LOCALE, true);
			};
		}
		/** React 侧语言订阅钩子：语言一变整棵子树重渲染。 */
		function useWeLocale() {
			const R = typeof React !== "undefined" ? React : null;
			if (R && typeof R.useSyncExternalStore === "function") return R.useSyncExternalStore(saLocaleSubscribe, saLocaleRevisionValue);
			if (R && typeof R.useState === "function" && typeof R.useEffect === "function") {
				const [, setTick] = R.useState(0);
				R.useEffect(() => saLocaleSubscribe(() => setTick((n) => n + 1)), []);
				return saLocaleRevisionValue();
			}
			return 0;
		}

		// ── 样式表（纯数据；只含头像 + 通用控件那部分）──────────────────────────────
		const CSS = `.sa-picker {display: flex; flex-direction: column; gap: 14px;
				    /* issue #127：设置窗整窗规则把 --sa-accent 掐成 initial（不泄漏给窗内第三方
				       分区）—— 我们的 picker 子树在这里从 body 的原件重新别名，消费面不变。 */
				    --sa-accent: var(--sa-accent-src, #4f8cff);
				    /* ── 统一控件 token：一套高度/圆角/墨色词汇贯穿全部控件 ──
				       墨色走宿主主题 token（明暗主题都可读），强调色只用于选中态/激活态。 */
				    --sa-ui-h: 30px;
				    --sa-ui-radius: 8px;
				    --sa-ink: var(--dsw-alias-label-primary, inherit);
				    --sa-ink-2: var(--dsw-alias-label-secondary, rgba(128, 128, 128, 0.9));
				    --sa-ink-3: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.65));
}
.sa-picker__select {max-width: 100%;
}
.sa-picker__row {display: flex; gap: 8px; align-items: center;
}
.sa-picker__section-list {margin: 0; padding: 0; list-style: none;
}
.sa-picker__card-shell {display: block;
}
.sa-picker__card-head {display: flex; align-items: baseline; gap: 8px;
				    padding-bottom: 10px; border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.22));
}
.sa-picker__card-name {font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit);
}
.sa-picker__card-desc {margin-left: auto; font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280);
				    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sa-picker__slider::-moz-range-thumb {corner-shape: round;
}
.sa-picker__btn {/* 这枚类同时挂在 <button> 与 <a> 上（导出是普通链接，D2）。两种元素的 UA 默认不同，
				       只写 height/padding 会让它们长得不一样 —— 四处差异逐条钉住：
				         · display：<a> 默认 inline，而**行内盒忽略 height** ⇒ 那句 30px 对它无效；
				           <button> 默认 inline-block。⇒ 两者都显式 inline-flex，居中也不再靠 line-height 猜。
				         · box-sizing：<button> 默认 border-box、<a> 默认 content-box（同高差 2px 边框）。
				         · font：<button> **不继承**字体（用 UA 自己那套），<a> 继承 ⇒ 同字号不同字体、宽度也不同。
				         · text-decoration：<a> 默认带下划线。
				       （本文件是模板字符串：注释里不能出现反引号 —— 会截断 CSS。） */
				    display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;
				    box-sizing: border-box; height: var(--sa-ui-h, 30px); padding: 0 12px;
				    border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.35));
				    border-radius: var(--sa-ui-radius, 8px); background: transparent;
				    color: var(--sa-ink, inherit); font: inherit; font-size: 0.82em; line-height: 1;
				    text-decoration: none; white-space: nowrap; cursor: pointer;
}
.sa-picker__btn:disabled {opacity: 0.45; cursor: default;
}
.sa-picker__btn.is-on {border-color: var(--sa-accent, var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.35)));
				    color: var(--sa-accent, inherit);
}
.sa-picker__hint {font-size: 0.8em; color: var(--sa-ink-3, rgba(128, 128, 128, 0.75));
}
.sa-picker__pager .sa-picker__hint, .sa-picker__card-badge, .sa-picker__value {font-variant-numeric: tabular-nums;
}
.sa-picker__section + .sa-picker__section {border-top: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.22));
				    padding-top: 12px;
}
.sa-picker__section-head {display: flex; align-items: center;
}
.sa-picker__section-label {font-size: 0.72em; font-weight: 600; letter-spacing: 0.04em;
				    /* 分组标题是「找路」信息而非装饰：次级墨色保证暗玻璃上可读。 */
				    color: var(--sa-ink-2, rgba(128, 128, 128, 0.9));
}
.sa-picker__ctl {display: flex; align-items: center; justify-content: space-between;
				    gap: 12px; min-height: 32px;
}
.sa-picker__ctl--wrap {flex-wrap: wrap; row-gap: 8px;
}
.sa-picker__ctl-text {display: flex; flex-direction: column; gap: 1px; min-width: 0;
}
.sa-picker__ctl-label {font-size: 0.88em; color: var(--sa-ink, inherit);
				    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sa-picker__ctl-hint {font-size: 0.7em; color: var(--sa-ink-3, rgba(128, 128, 128, 0.65));
				    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
}
.sa-picker__ctl-side {display: flex; align-items: center; gap: 8px; flex: 0 0 auto;
}
.sa-picker__slider {-webkit-appearance: none; appearance: none;
				    flex: 1; height: 18px; background: transparent; cursor: pointer;
}
.sa-picker__slider::-webkit-slider-runnable-track {height: 4px; border-radius: 2px;
				    /* accent 填充段（0 → --sa-fill）+ 灰色剩余段 */
				    background: linear-gradient(to right,
				      var(--sa-accent, #4f8cff) var(--sa-fill, 0%),
				      var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.4)) var(--sa-fill, 0%));
}
.sa-picker__slider::-webkit-slider-thumb {-webkit-appearance: none; appearance: none;
				    width: 16px; height: 16px; margin-top: -6px; border-radius: 50%;
				    background: #fff;
				    border: 2px solid var(--sa-accent, #4f8cff);
				    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
				    transition: transform var(--sa-dur-fast, 120ms) var(--sa-ease, ease);
}
.sa-picker__slider:hover::-webkit-slider-thumb {transform: scale(1.12);
}
.sa-picker__slider:active::-webkit-slider-thumb {transform: scale(1.2);
}
.sa-picker__slider::-moz-range-track {height: 4px; border-radius: 2px;
				    background: var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.4));
}
.sa-picker__slider::-moz-range-progress {height: 4px; border-radius: 2px;
				    background: var(--sa-accent, #4f8cff);
}
.sa-picker__switch {position: relative; display: inline-flex; cursor: pointer;
}
.sa-picker__switch input {position: absolute; opacity: 0; width: 0; height: 0;
}
.sa-picker__switch-track {position: relative; width: 36px; height: 20px; border-radius: 999px;
				    background: var(--dsw-alias-bg-layer-3, rgba(128, 128, 128, 0.4));
				    border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.25));
				    box-sizing: border-box;
				    transition: background-color 180ms var(--sa-ease, ease), border-color 180ms var(--sa-ease, ease);
				    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.16);
}
.sa-picker__switch:hover .sa-picker__switch-track {border-color: var(--dsw-alias-label-dimmed, rgba(128, 128, 128, 0.5));
}
.sa-picker__switch input:focus-visible + .sa-picker__switch-track {outline: 2px solid var(--sa-accent, #4f8cff);
				    outline-offset: 2px;
}
.sa-picker__switch input:checked + .sa-picker__switch-track {background: var(--sa-accent, #4f8cff); /* 跟随「配色」设置，不再硬编码 */
}
.sa-picker__switch-thumb {position: absolute; left: 2px; top: 2px;
				    width: 14px; height: 14px; border-radius: 50%;
				    background: #fff;
				    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
				    transition: transform 180ms var(--sa-ease, ease);
}
.sa-picker__switch input:checked + .sa-picker__switch-track .sa-picker__switch-thumb {transform: translateX(16px);
}
.sa-picker__btn, .sa-picker select, .sa-picker__card, .sa-picker__editor-card, .sa-picker__tab, .sa-picker__rate, .sa-picker__card-hide {transition:
				      background-color var(--sa-dur-fast, 120ms) var(--sa-ease, ease),
				      border-color var(--sa-dur-fast, 120ms) var(--sa-ease, ease),
				      color var(--sa-dur-fast, 120ms) var(--sa-ease, ease),
				      box-shadow var(--sa-dur-fast, 120ms) var(--sa-ease, ease),
				      transform var(--sa-dur-fast, 120ms) var(--sa-ease, ease);
}
.sa-picker__btn:active, .sa-picker__rate:active, .sa-picker__tab:active {transform: scale(0.96);
}
.sa-picker__slider-row {display: flex; align-items: center; gap: 10px;
}
.sa-picker__label {min-width: 28px; flex: 0 0 auto; color: var(--sa-ink, inherit); font-size: 0.88em;
}
.sa-picker__slider-row .sa-picker__label {flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sa-picker__value {min-width: 48px; text-align: right; flex: 0 0 auto;
				    padding: 2px 8px; border-radius: 999px; font-size: 0.72em;
				    background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.14));
				    color: var(--sa-ink-2, rgba(128, 128, 128, 0.9));
}
.sa-ext {display: flex; flex-direction: column; gap: 10px;
}
.sa-ext__module {display: flex; flex-direction: column; gap: 6px; padding: 10px;
				    border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
				    border-radius: 12px; background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.08));
}
.sa-ext__module-head {display: flex; align-items: center; gap: 8px;
}
.sa-ext__module-title {font-size: 0.85em; font-weight: 600; color: var(--sa-ink, inherit);
}
body[data-sa-avatar="on"] [data-sa-avatar-row] {display: flex; align-items: flex-start; gap: 8px;
}
body[data-sa-avatar="on"] [data-sa-avatar-row="user"] {flex-direction: row-reverse;
}
body[data-sa-avatar="on"] [data-sa-avatar-row] > :not(.sa-avatar) {flex: 1 1 auto; min-width: 0;
}
.sa-avatar {box-sizing: border-box; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
				    width: var(--sa-avatar-size, 40px); height: var(--sa-avatar-size, 40px);
				    border-radius: calc(var(--sa-avatar-round, 100) * 0.5%);
				    overflow: hidden;
				    color: var(--dsw-alias-label-secondary, currentColor);
				    background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.16));
				    border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
}
.sa-avatar__img {display: block; width: 100%; height: 100%; object-fit: cover;
}
.sa-avatar__glyph {display: flex; align-items: center; justify-content: center;
}
.sa-avatar__glyph svg {width: 62%; height: 62%;
}
.sa-avatar-preview {box-sizing: border-box; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
				    border: 1px dashed var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
				    border-radius: 10px;
}
.sa-avatar-preview__face {box-sizing: border-box; display: flex; align-items: center; justify-content: center;
				    overflow: hidden;
				    color: var(--dsw-alias-label-secondary, currentColor);
				    background: var(--dsw-alias-bg-layer-1, rgba(128, 128, 128, 0.16));
				    border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
}
.sa-avatar-preview__img {display: block; width: 100%; height: 100%; object-fit: cover;
}
.sa-avatar-preview__glyph {display: flex; align-items: center; justify-content: center;
}
.sa-avatar-preview__glyph svg {width: 62%; height: 62%;
}
.sa-avatar-error {font-size: 0.82em; opacity: 0.9; color: #e5534b;
}`;

		// ── 设置项（真源；宿主 PUT 与客户端本地缓存共用同一套消毒）─────────────────
		const AVATAR_SIZE_MIN = 24, AVATAR_SIZE_MAX = 72;
		const AVATAR_RADIUS_MIN = 0, AVATAR_RADIUS_MAX = 100;
		const AVATAR_FILE_RE = /^(user|ai)-[a-z0-9]{4,16}\.(png|jpg|webp)$/;
		const DEFAULTS = {
			avatarEnabled: false,
			avatarSize: 40,
			avatarRadius: 100,
			avatarUserImage: "",
			avatarAiImage: "",
		};
		function clampNum(v, lo, hi, def) {
			const n = typeof v === "number" && isFinite(v) ? v : Number(v);
			if (!isFinite(n)) return def;
			return Math.min(hi, Math.max(lo, n));
		}
		/** 只认白名单里的五个 avatar* 键，坏值一律回落到默认。 */
		function sanitizeSettings(raw) {
			const out = Object.assign({}, DEFAULTS);
			if (!raw || typeof raw !== "object") return out;
			out.avatarEnabled = raw.avatarEnabled === true;
			out.avatarSize = clampNum(raw.avatarSize, AVATAR_SIZE_MIN, AVATAR_SIZE_MAX, DEFAULTS.avatarSize);
			out.avatarRadius = clampNum(raw.avatarRadius, AVATAR_RADIUS_MIN, AVATAR_RADIUS_MAX, DEFAULTS.avatarRadius);
			out.avatarUserImage = AVATAR_FILE_RE.test(String(raw.avatarUserImage || "")) ? String(raw.avatarUserImage) : "";
			out.avatarAiImage = AVATAR_FILE_RE.test(String(raw.avatarAiImage || "")) ? String(raw.avatarAiImage) : "";
			return out;
		}
		function serializeSettings(sel) {
			const s = sel && typeof sel === "object" ? sel : {};
			return {
				avatarEnabled: s.avatarEnabled === true,
				avatarSize: s.avatarSize,
				avatarRadius: s.avatarRadius,
				avatarUserImage: typeof s.avatarUserImage === "string" ? s.avatarUserImage : "",
				avatarAiImage: typeof s.avatarAiImage === "string" ? s.avatarAiImage : "",
			};
		}

		// ── 宿主 API 的唯一出入口 ───────────────────────────────────────────────────
		const BASE = "/chat-simple";
		const SETTINGS_URL = "/chat-simple/settings";
		function apiUrl(path) {
			const p = String(path == null ? "" : path);
			if (/^[a-z][a-z0-9+.-]*:/i.test(p) || p.startsWith("data:") || p.startsWith("blob:")) return p;
			if (p.startsWith(BASE)) return p;
			return BASE + (p.startsWith("/") ? p : "/" + p);
		}
		async function apiFetch(path, options) {
			const o = options || {};
			const doFetch = typeof fetch === "function" ? fetch : null;
			const url = apiUrl(path);
			if (!doFetch) return { ok: false, status: 0, data: null, error: "no-fetch", url };
			const init = { method: o.method || "GET", cache: o.cache || "no-store" };
			if (o.signal) init.signal = o.signal;
			if (o.headers) init.headers = o.headers;
			if (o.body !== undefined) init.body = o.body;
			if (o.keepalive) init.keepalive = true;
			let response = null;
			try { response = await doFetch(url, init); }
			catch (e) { return { ok: false, status: 0, data: null, error: String((e && e.name) || (e && e.message) || e), url }; }
			const status = (response && response.status) || 0;
			const ok = status >= 200 && status < 300;
			let data = null, error = null;
			if (o.parse === "always" || (o.parse !== false && ok)) {
				try {
					if (typeof response.json === "function") data = await response.json();
					else if (typeof response.text === "function") { const t = await response.text(); data = t ? JSON.parse(t) : null; }
				} catch (e) { data = null; error = "parse:" + String((e && e.message) || e); }
			}
			return { ok, status, data, error, response, url };
		}
		const apiJson = (path, options) => apiFetch(path, Object.assign({ method: "GET" }, options));
		const apiDelete = (path, options) => apiFetch(path, Object.assign({ method: "DELETE", parse: false }, options));

		// ── store：设置 + 视图态；宿主文件是真源，localStorage 是缓存 ──────────────
		const SETTINGS_KEY = "dsh-chat-simple:avatar-selection";
		function readPersisted() {
			try {
				const raw = localStorage.getItem(SETTINGS_KEY);
				if (!raw) return Object.assign({}, DEFAULTS);
				return sanitizeSettings(JSON.parse(raw));
			} catch { return Object.assign({}, DEFAULTS); }
		}
		function readPersistedRaw() {
			try { const raw = localStorage.getItem(SETTINGS_KEY); return raw ? JSON.parse(raw) : null; }
			catch { return null; }
		}

		const selection = Object.assign(
			{},
			DEFAULTS,
			readPersisted(),
			{ hostLoaded: false, avatarBusy: "", avatarError: "" },
		);

		const listeners = new Set();
		function emit() { for (const fn of [...listeners]) fn(); }
		function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

		let persistTimer = null, persistDirty = false, persistWrites = 0;
		function writeLocalCache() {
			try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(serializeSettings(selection))); } catch { /* ignore */ }
		}
		async function pushPersisted() {
			try {
				const res = await apiFetch(SETTINGS_URL, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(serializeSettings(selection)),
					keepalive: true,
				});
				persistDirty = !res.ok;
			} catch { persistDirty = true; }
		}
		function flushPersist() { persistTimer = null; writeLocalCache(); pushPersisted(); }
		function schedulePersist() {
			if (persistTimer) return;
			if (typeof window === "undefined" || typeof window.setTimeout !== "function") { flushPersist(); return; }
			persistTimer = window.setTimeout(flushPersist, 200);
		}
		function persistSelection() { persistWrites++; schedulePersist(); }
		function onPageHideFlush() {
			if (persistTimer && typeof window.clearTimeout === "function") { window.clearTimeout(persistTimer); flushPersist(); }
		}
		function onVisibilityResyncPersist() {
			if (typeof document !== "undefined" && !document.hidden && persistDirty && !persistTimer) schedulePersist();
		}
		function cancelPendingPersist() {
			if (persistTimer && typeof window !== "undefined" && typeof window.clearTimeout === "function") window.clearTimeout(persistTimer);
			persistTimer = null;
		}
		async function loadPersisted() {
			let hostSettings = null, hostOk = false;
			const writesAtStart = persistWrites;
			try {
				const res = await apiJson(SETTINGS_URL);
				if (res.ok && !res.error) { hostSettings = res.data && res.data.settings; hostOk = true; }
			} catch { /* 宿主不可达：回落本地 */ }
			const stale = persistWrites !== writesAtStart;
			if (hostOk && hostSettings && typeof hostSettings === "object") {
				if (!stale) { Object.assign(selection, sanitizeSettings(hostSettings)); writeLocalCache(); }
			} else if (hostOk) {
				const parsedLocal = readPersistedRaw();
				if (!stale) Object.assign(selection, sanitizeSettings(parsedLocal || DEFAULTS));
				if (parsedLocal) pushPersisted();
			} else {
				if (!stale) Object.assign(selection, readPersisted());
			}
			selection.hostLoaded = true;
			syncAvatarLayer();
			emit();
		}

		function setSetting(field, value) { selection[field] = value; persistSelection(); return value; }
		function setTransient(field, value) { selection[field] = value; return value; }
		/** 拖动档：live 只写值 + 即时刷新头像层（不整棵面板重渲染）；抬手走完整 emit。 */
		function commitLiveSetting(field, value, live) {
			setSetting(field, value);
			if (live) syncAvatarLayer();
			else emit();
		}

		// ── 会话头像装饰层（唯一改宿主会话 DOM 的一层）─────────────────────────────
		/** 三种"消息行"的 kind → 头像属于哪一方。 */
		const AVATAR_FLOW_SIDES = { user: "user", steering: "user", "assistant-step": "ai" };
		const AVATAR_ROW_SELECTOR = '[data-chat-flow-kind="user"], [data-chat-flow-kind="steering"], [data-chat-flow-kind="assistant-step"]';
		const AVATAR_ROW_ATTR = "data-sa-avatar-row";
		const AVATAR_NODE_CLASS = "sa-avatar";
		const AVATAR_NODE_ATTR = "data-sa-avatar-node";
		const AVATAR_ATTR = "data-sa-avatar";
		const AVATAR_VAR_SIZE = "--sa-avatar-size";
		const AVATAR_VAR_ROUND = "--sa-avatar-round";
		const AVATAR_IMAGE_KEYS = { user: "avatarUserImage", ai: "avatarAiImage" };
		const AVATAR_CLAMP_SIZE = { min: 24, max: 72, def: 40 };
		const AVATAR_CLAMP_RADIUS = { min: 0, max: 100, def: 100 };

		/** 内置默认头像的零件表（唯一真源）；两侧画在 0..16 方格上，currentColor 上色。 */
		const AVATAR_GLYPH_PARTS = {
			user: [
				["circle", { cx: "8", cy: "5.6", r: "2.5" }],
				["path", { d: "M3.4 13.2c0-2.3 2.1-3.8 4.6-3.8s4.6 1.5 4.6 3.8" }],
			],
			ai: [
				["path", { d: "M8 2.2l1.35 3.9a1.6 1.6 0 0 0 1 1l3.9 1.35-3.9 1.35a1.6 1.6 0 0 0-1 1L8 14.7l-1.35-3.9a1.6 1.6 0 0 0-1-1L1.75 8.45l3.9-1.35a1.6 1.6 0 0 0 1-1z" }],
			],
		};
		const AVATAR_GLYPH_VIEW_BOX = "0 0 16 16";

		let avatarObserver = null;
		let avatarActive = false;

		function avatarBody() {
			if (typeof document === "undefined" || !document || !document.body) return null;
			return document.body;
		}
		function avatarClamp(v, lo, hi, fallback) {
			const n = typeof v === "number" && isFinite(v) ? v : Number(v);
			if (!isFinite(n)) return fallback;
			return Math.min(hi, Math.max(lo, n));
		}
		/** 头像图 URL：`/avatar/<side>?v=<文件名>`；没导入返回空串（画内置默认头像）。 */
		function avatarImageUrl(side, selLike) {
			const sel = selLike || selection;
			const key = AVATAR_IMAGE_KEYS[side];
			const name = key && sel ? String(sel[key] || "") : "";
			if (!name) return "";
			return apiUrl("/avatar/" + side + "?v=" + encodeURIComponent(name));
		}
		function avatarGlyphSvgString(side, size) {
			const parts = AVATAR_GLYPH_PARTS[side] || AVATAR_GLYPH_PARTS.user;
			const px = (Number(size) > 0 ? Number(size) : 16);
			const attrs = 'viewBox="' + AVATAR_GLYPH_VIEW_BOX + '" width="' + px + '" height="' + px
				+ '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"'
				+ ' stroke-linejoin="round" aria-hidden="true" focusable="false"';
			const inner = parts.map(([tag, a]) => "<" + tag + " "
				+ Object.keys(a).map((k) => k + '="' + a[k] + '"').join(" ") + "/>").join("");
			return "<svg " + attrs + ">" + inner + "</svg>";
		}
		function renderAvatarGlyph(side, size) {
			const parts = AVATAR_GLYPH_PARTS[side] || AVATAR_GLYPH_PARTS.user;
			const px = (Number(size) > 0 ? Number(size) : 16);
			return React.createElement("svg", {
				viewBox: AVATAR_GLYPH_VIEW_BOX, width: px, height: px, fill: "none", stroke: "currentColor",
				"stroke-width": "1.4", "stroke-linecap": "round", "stroke-linejoin": "round",
				"aria-hidden": "true", focusable: "false",
			}, parts.map(([tag, a]) => React.createElement(tag, a)));
		}
		/** 把一个已注入的头像节点就地更新到当前设置（只在"该显示什么"真变了才动 DOM）。 */
		function avatarFillNode(node, side) {
			const url = avatarImageUrl(side);
			const want = url ? "img" : "glyph";
			if (node.getAttribute("data-sa-avatar-kind") === want) {
				if (want === "img") {
					const img = node.firstElementChild;
					const src = img ? img.getAttribute("src") : "";
					if (src !== url) { try { img.setAttribute("src", url); } catch { /* ignore */ } }
				}
				return;
			}
			node.setAttribute("data-sa-avatar-kind", want);
			try { node.textContent = ""; } catch { /* ignore */ }
			if (want === "img") {
				const img = document.createElement("img");
				img.className = AVATAR_NODE_CLASS + "__img";
				img.setAttribute("alt", "");
				img.setAttribute("draggable", "false");
				img.setAttribute("src", url);
				node.appendChild(img);
			} else {
				const glyph = document.createElement("span");
				glyph.className = AVATAR_NODE_CLASS + "__glyph";
				glyph.innerHTML = avatarGlyphSvgString(side, 16);
				node.appendChild(glyph);
			}
		}
		function avatarDecorateRow(row) {
			if (!row || typeof row.getAttribute !== "function") return false;
			const side = AVATAR_FLOW_SIDES[row.getAttribute("data-chat-flow-kind")];
			if (!side) return false;
			const marked = row.getAttribute(AVATAR_ROW_ATTR);
			if (marked === side) {
				const node = row.firstElementChild;
				if (node && node.classList && node.classList.contains(AVATAR_NODE_CLASS)) { avatarFillNode(node, side); return false; }
				row.removeAttribute(AVATAR_ROW_ATTR);
			} else if (marked) {
				const old = row.firstElementChild;
				if (old && old.classList && old.classList.contains(AVATAR_NODE_CLASS)) { try { old.remove(); } catch { /* ignore */ } }
				row.removeAttribute(AVATAR_ROW_ATTR);
			}
			const node = document.createElement("div");
			node.className = AVATAR_NODE_CLASS + " " + AVATAR_NODE_CLASS + "--" + side;
			node.setAttribute(AVATAR_NODE_ATTR, side);
			node.setAttribute("aria-hidden", "true");
			avatarFillNode(node, side);
			row.setAttribute(AVATAR_ROW_ATTR, side);
			try { row.insertBefore(node, row.firstChild); } catch { /* ignore */ }
			return true;
		}
		function avatarSweep() {
			if (typeof document.querySelectorAll !== "function") return;
			let rows = [];
			try { rows = document.querySelectorAll(AVATAR_ROW_SELECTOR); } catch { return; }
			for (const row of rows) avatarDecorateRow(row);
		}
		function avatarOnMutations(records) {
			if (!avatarActive) return;
			for (const r of records) {
				const added = r.addedNodes;
				if (!added || !added.length) continue;
				for (const n of added) {
					if (!n || n.nodeType !== 1) continue;
					try {
						if (n.matches && n.matches(AVATAR_ROW_SELECTOR)) { avatarDecorateRow(n); continue; }
						if (n.closest && n.closest("[" + AVATAR_ROW_ATTR + "]")) continue;
					} catch { continue; }
					let inner = [];
					try { inner = n.querySelectorAll ? n.querySelectorAll(AVATAR_ROW_SELECTOR) : []; } catch { inner = []; }
					for (const row of inner) avatarDecorateRow(row);
				}
			}
		}
		function avatarStop() {
			avatarActive = false;
			if (avatarObserver) { try { avatarObserver.disconnect(); } catch { /* ignore */ } avatarObserver = null; }
			if (typeof document === "undefined" || !document) return;
			const body = avatarBody();
			if (body) {
				body.removeAttribute(AVATAR_ATTR);
				body.style.removeProperty(AVATAR_VAR_SIZE);
				body.style.removeProperty(AVATAR_VAR_ROUND);
			}
			if (typeof document.querySelectorAll !== "function") return;
			let nodes = [];
			try { nodes = document.querySelectorAll("[" + AVATAR_NODE_ATTR + "]"); } catch { /* ignore */ }
			for (const n of nodes) { try { n.remove(); } catch { /* ignore */ } }
			let rows = [];
			try { rows = document.querySelectorAll("[" + AVATAR_ROW_ATTR + "]"); } catch { /* ignore */ }
			for (const row of rows) { try { row.removeAttribute(AVATAR_ROW_ATTR); } catch { /* ignore */ } }
		}
		/** 设置变了就调一次：开 → 挂属性/变量、起观察者、补一遍现况；关 → 全部收掉。 */
		function syncAvatarLayer() {
			const on = selection.avatarEnabled === true;
			const body = avatarBody();
			if (!on || !body || typeof MutationObserver !== "function") {
				if (avatarActive || avatarObserver) avatarStop();
				else if (body) { body.removeAttribute(AVATAR_ATTR); body.style.removeProperty(AVATAR_VAR_SIZE); body.style.removeProperty(AVATAR_VAR_ROUND); }
				return;
			}
			const size = avatarClamp(selection.avatarSize, AVATAR_CLAMP_SIZE.min, AVATAR_CLAMP_SIZE.max, AVATAR_CLAMP_SIZE.def);
			const round = avatarClamp(selection.avatarRadius, AVATAR_CLAMP_RADIUS.min, AVATAR_CLAMP_RADIUS.max, AVATAR_CLAMP_RADIUS.def);
			body.setAttribute(AVATAR_ATTR, "on");
			body.style.setProperty(AVATAR_VAR_SIZE, Math.round(size) + "px");
			body.style.setProperty(AVATAR_VAR_ROUND, String(Math.round(round)));
			if (!avatarObserver) {
				try { avatarObserver = new MutationObserver(avatarOnMutations); avatarObserver.observe(body, { childList: true, subtree: true }); }
				catch { avatarObserver = null; }
			}
			avatarActive = true;
			avatarSweep();
		}
		function disposeAvatarLayer() { avatarStop(); }

		// ── 通用控件（统一高度/圆角/墨色 token 的一套 chrome）─────────────────────
		function SliderRow(label, min, max, step, value, onInput, suffix, key, opts) {
			opts = opts || {};
			const unit = suffix == null ? "" : String(suffix);
			const preformatted = /\d/.test(unit);
			const readout = (v) => (v == null || v === "" ? "" : (preformatted ? unit : String(v) + unit));
			const liveFill = (el) => {
				try {
					const lo = Number(el.min); const hi = Number(el.max); const v = Number(el.value);
					const pct = hi > lo ? Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)) : 0;
					el.style.setProperty("--sa-fill", pct + "%");
					const row = el.parentNode;
					const out = row && typeof row.querySelector === "function" ? row.querySelector(".sa-picker__value") : null;
					if (out && !preformatted) out.textContent = readout(el.value);
				} catch { /* 回显是增强 */ }
			};
			return React.createElement("div", { className: "sa-picker__row sa-picker__slider-row", key: key },
				React.createElement("span", { className: "sa-picker__hint sa-picker__label", title: opts.tooltip || undefined }, label),
				React.createElement("input", {
					className: "sa-picker__slider", type: "range",
					min: String(min), max: String(max), step: String(step), value: String(value),
					style: { "--sa-fill": Math.max(0, Math.min(100, ((Number(value) - min) / (max - min)) * 100)) + "%" },
					"aria-label": label,
					onInput: (e) => { liveFill(e.currentTarget); onInput(Number(e.target.value), true); },
					onChange: (e) => onInput(Number(e.target.value), false),
				}),
				React.createElement("span", { className: "sa-picker__hint sa-picker__value" }, readout(value)),
			);
		}
		function ctlText(label, hint, tooltip) {
			return React.createElement("div", { className: "sa-picker__ctl-text" },
				React.createElement("span", { className: "sa-picker__ctl-label", title: tooltip || undefined }, label),
				hint ? React.createElement("span", { className: "sa-picker__ctl-hint" }, hint) : null,
			);
		}
		function Toggle(props) {
			return React.createElement("label", { className: "sa-picker__switch", title: props.title },
				React.createElement("input", {
					type: "checkbox", checked: props.checked, disabled: props.disabled === true,
					onChange: props.onChange, "aria-label": props.label,
				}),
				React.createElement("span", { className: "sa-picker__switch-track" },
					React.createElement("span", { className: "sa-picker__switch-thumb" }),
				),
			);
		}
		function switchRow(label, checked, onChange, opts) {
			opts = opts || {};
			return React.createElement("div", { className: "sa-picker__ctl", key: opts.key },
				ctlText(label, opts.hint, opts.tooltip),
				Toggle({ checked: checked, onChange: onChange, label: label, title: opts.tooltip, disabled: opts.disabled }),
			);
		}

		// ── 头像那一组控件（面板的全部内容）──────────────────────────────────────────
		const AVATAR_SIDE_ROWS = [
			{ id: "user", get label() { return saT("「我」的头像"); }, get hint() { return saT("你的消息在右侧，头像跟着在右侧"); } },
			{ id: "ai", get label() { return saT("「助手」的头像"); }, get hint() { return saT("助手的消息在左侧，头像跟着在左侧"); } },
		];
		const AVATAR_PREVIEW_BOX = 80;
		const AVATAR_PREVIEW_SIZE_FALLBACK = 40;
		const AVATAR_PREVIEW_ROUND_FALLBACK = 100;
		function avatarPreviewSize(sel) {
			const n = Number(sel && sel.avatarSize);
			if (!isFinite(n)) return AVATAR_PREVIEW_SIZE_FALLBACK;
			return Math.min(AVATAR_SIZE_MAX, Math.max(AVATAR_SIZE_MIN, Math.round(n)));
		}
		function avatarPreviewRound(sel) {
			const n = Number(sel && sel.avatarRadius);
			if (!isFinite(n)) return AVATAR_PREVIEW_ROUND_FALLBACK;
			return Math.min(AVATAR_RADIUS_MAX, Math.max(AVATAR_RADIUS_MIN, Math.round(n)));
		}
		function avatarSideRow(side, sel, acts) {
			const set = Boolean(side.id === "user" ? sel.avatarUserImage : sel.avatarAiImage);
			const busy = sel.avatarBusy === side.id;
			const size = avatarPreviewSize(sel);
			const round = avatarPreviewRound(sel);
			const url = avatarImageUrl(side.id, sel);
			return React.createElement("div", { className: "sa-picker__ctl sa-picker__ctl--wrap", key: "avatar-row-" + side.id },
				React.createElement("span", { className: "sa-avatar-preview", style: { width: AVATAR_PREVIEW_BOX + "px", height: AVATAR_PREVIEW_BOX + "px" } },
					React.createElement("span", {
						className: "sa-avatar-preview__face",
						style: { width: size + "px", height: size + "px", borderRadius: (round / 2) + "%" },
					},
						url
							? React.createElement("img", { className: "sa-avatar-preview__img", src: url, alt: "", draggable: false })
							: React.createElement("span", { className: "sa-avatar-preview__glyph" }, renderAvatarGlyph(side.id, AVATAR_PREVIEW_BOX)),
					),
				),
				ctlText(side.label, side.hint),
				React.createElement("button", {
					className: "sa-picker__btn", type: "button", disabled: busy,
					onClick: () => acts.onPick(side.id),
				}, busy ? saT("导入中…") : (set ? saT("替换图片…") : saT("导入图片…"))),
				set && React.createElement("button", {
					className: "sa-picker__btn", type: "button", disabled: busy,
					onClick: () => acts.onClear(side.id),
				}, saT("清除")),
			);
		}
		function renderAvatarIsland(ctx) {
			const { sel, onAvatarEnabled, onAvatarSize, onAvatarRadius, onAvatarPick, onAvatarClear } = ctx;
			const on = sel.avatarEnabled === true;
			return React.createElement(React.Fragment, null,
				switchRow(saT("启用自定义会话头像"), on, onAvatarEnabled,
					{ key: "avatar-on", hint: saT("给会话双方配上头像，消息像好友聊天一样左右分列") }),
				React.createElement("span", { className: "sa-picker__hint", key: "avatar-what" },
					saT("开启后：你的消息靠右侧、带你的头像；助手的消息靠左侧、带助手的头像。图片只保存在本机（导入时会缩到 512px 以内），没导入就用内置的默认头像。关掉这个开关，会话立刻恢复原样。")),
				on && AVATAR_SIDE_ROWS.map((side) => avatarSideRow(side, sel, { onPick: onAvatarPick, onClear: onAvatarClear })),
				on && SliderRow(saT("头像大小"), AVATAR_SIZE_MIN, AVATAR_SIZE_MAX, 1, sel.avatarSize, onAvatarSize, "px", "avatar-size"),
				on && SliderRow(saT("圆角强度"), AVATAR_RADIUS_MIN, AVATAR_RADIUS_MAX, 1, sel.avatarRadius, onAvatarRadius, "%", "avatar-radius",
					{ tooltip: saT("100% = 正圆（默认），50% = 大圆角方块，0% = 直角方形") }),
				on && sel.avatarError
					&& React.createElement("div", { className: "sa-picker__hint sa-avatar-error", key: "avatar-err" }, sel.avatarError),
			);
		}

		// ── 图片导入这条腿（选文件 → 解码 → 缩到 512px → POST）─────────────────────
		const IMAGE_IMPORT_MAX_EDGE = 512;
		function pickImageFile(onFile) {
			if (typeof document === "undefined" || typeof document.createElement !== "function") return;
			const input = document.createElement("input");
			input.type = "file";
			input.accept = "image/png,image/jpeg,image/webp";
			input.style.display = "none";
			try { document.body.appendChild(input); } catch { /* ignore */ }
			const done = () => { try { input.remove(); } catch { /* ignore */ } };
			input.addEventListener("change", () => { const file = input.files && input.files[0]; done(); if (file) onFile(file); });
			input.addEventListener("cancel", done);
			if (typeof window !== "undefined" && typeof window.setTimeout === "function") window.setTimeout(done, 60000);
			try { input.click(); } catch { /* ignore */ }
		}
		async function decodeImageFile(file) {
			if (typeof createImageBitmap === "function") { try { return await createImageBitmap(file); } catch { /* 落到下面 */ } }
			const url = URL.createObjectURL(file);
			try {
				return await new Promise((resolve, reject) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.onerror = () => reject(new Error("decode failed"));
					img.src = url;
				});
			} finally { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }
		}
		async function downscaleImageFile(file, maxEdge) {
			const src = await decodeImageFile(file);
			const w = Number(src.width) || 0, h = Number(src.height) || 0;
			if (!w || !h) throw new Error("bad image");
			const scale = Math.min(1, maxEdge / Math.max(w, h));
			const tw = Math.max(1, Math.round(w * scale)), th = Math.max(1, Math.round(h * scale));
			const canvas = document.createElement("canvas");
			canvas.width = tw; canvas.height = th;
			const g = canvas.getContext("2d");
			if (!g) throw new Error("no canvas");
			g.drawImage(src, 0, 0, tw, th);
			if (src.close) { try { src.close(); } catch { /* ignore */ } }
			const toBlob = (type, quality) => new Promise((resolve) => {
				try { canvas.toBlob((b) => resolve(b), type, quality); } catch { resolve(null); }
			});
			const webp = await toBlob("image/webp", 0.92);
			const blob = (webp && webp.type === "image/webp") ? webp : (await toBlob("image/png")) || file;
			return { blob, width: tw, height: th };
		}
		function assetRouteFailure(res, what) {
			const bare = !res || !res.data || typeof res.data !== "object" || !res.data.error;
			if (bare && (res.status === 404 || res.status === 405)) {
				return saT("宿主里没有{what}路由：重启 DSH 后再试（改过宿主代码要重挂，刷新页面不够）", { what: what });
			}
			return (res && res.data && res.data.error) || saT("宿主返回 {status}", { status: res ? res.status : 0 });
		}
		async function postImageAsset(path, blob, what) {
			const res = await apiFetch(path, { method: "POST", headers: { "Content-Type": blob.type }, body: blob, parse: "always" });
			const name = res.data && typeof res.data.name === "string" ? res.data.name : "";
			if (!res.ok || !name) return { ok: false, error: assetRouteFailure(res, what) };
			return { ok: true, name: name };
		}

		// ── 处理器（控件只报事件，写设置 + 重渲染都在这里）─────────────────────────
		function onAvatarEnabled(e) { setSetting("avatarEnabled", e.target.checked); emit(); }
		function onAvatarSize(v, live) { commitLiveSetting("avatarSize", v, live); }
		function onAvatarRadius(v, live) { commitLiveSetting("avatarRadius", v, live); }
		function onAvatarPick(side) { pickImageFile((file) => uploadAvatarFile(side, file)); }
		async function uploadAvatarFile(side, file) {
			if (!file || !/^image\/(png|jpeg|webp)$/.test(String(file.type || ""))) {
				setTransient("avatarError", saT("仅支持 JPG / PNG / WebP 图片")); emit(); return;
			}
			setTransient("avatarError", ""); setTransient("avatarBusy", side); emit();
			try {
				const img = await downscaleImageFile(file, IMAGE_IMPORT_MAX_EDGE);
				const posted = await postImageAsset("/avatar/" + side, img.blob, saT("头像"));
				if (!posted.ok) throw new Error(posted.error);
				setSetting(side === "ai" ? "avatarAiImage" : "avatarUserImage", posted.name);
			} catch (err) {
				setTransient("avatarError", saT("导入失败：{error}", { error: err && err.message ? err.message : String(err) }));
			} finally { setTransient("avatarBusy", ""); emit(); }
		}
		function onAvatarClear(side) {
			setTransient("avatarError", "");
			apiDelete("/avatar/" + side, { parse: "always" }).then((r) => {
				if (!r.ok) throw new Error(assetRouteFailure(r, saT("头像")));
				setSetting(side === "ai" ? "avatarAiImage" : "avatarUserImage", "");
				emit();
			}).catch((err) => {
				setTransient("avatarError", saT("清除失败：{error}", { error: err && err.message ? err.message : String(err) }));
				emit();
			});
		}

		// ── 设置分区：一个卡片，里头只有头像那一组 ─────────────────────────────────
		function SessionAvatarSection() {
			useWeLocale();
			const sel = useStore();
			return React.createElement("ul", { className: "sa-picker__section-list" },
				React.createElement("li", { className: "sa-picker__card-shell" },
					React.createElement("div", { className: "sa-picker" },
						React.createElement("div", { className: "sa-picker__card-head" },
							React.createElement("span", { className: "sa-picker__card-name" }, saT("会话头像")),
							React.createElement("span", { className: "sa-picker__card-desc" }, saT("给会话双方各配一张头像")),
						),
						React.createElement("div", { className: "sa-ext" },
							React.createElement("div", { className: "sa-ext__module", key: "avatar" },
								React.createElement("div", { className: "sa-ext__module-head" },
									React.createElement("span", { className: "sa-ext__module-title" }, saT("自定义会话头像")),
								),
								React.createElement("span", { className: "sa-picker__hint" }, saT("给会话双方各配一张头像，消息像好友聊天一样左右分列（默认关）")),
								renderAvatarIsland({
									sel: sel,
									onAvatarEnabled: onAvatarEnabled,
									onAvatarSize: onAvatarSize,
									onAvatarRadius: onAvatarRadius,
									onAvatarPick: onAvatarPick,
									onAvatarClear: onAvatarClear,
								}),
							),
						),
					),
				),
			);
		}
		function useStore() {
			const [, setTick] = React.useState(0);
			React.useEffect(() => subscribe(() => setTick((n) => n + 1)), []);
			return selection;
		}

		// ── 设置导航图标（把官方兜底齿轮换成一张"头像"图标，锚点是本分区 label）───
		const NAV_ICON_PARTS = [
			["circle", { cx: "8", cy: "8", r: "6.3" }],
			["circle", { cx: "8", cy: "6.4", r: "2.1" }],
			["path", { d: "M3.9 13.1c0-2.1 1.8-3.4 4.1-3.4s4.1 1.3 4.1 3.4" }],
		];
		function navIconSvgString(size) {
			const attrs = 'viewBox="0 0 16 16" width="' + size + '" height="' + size
				+ '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"'
				+ ' stroke-linejoin="round" aria-hidden="true" focusable="false"';
			const inner = NAV_ICON_PARTS.map(([tag, a]) => "<" + tag + " "
				+ Object.keys(a).map((k) => k + '="' + a[k] + '"').join(" ") + "/>").join("");
			return "<svg " + attrs + ">" + inner + "</svg>";
		}
		function installNavIcon() {
			if (typeof document === "undefined" || !document.body) return null;
			if (typeof MutationObserver !== "function") return null;
			let patched = new WeakSet();
			const patchIn = (root) => {
				if (!root || typeof root.querySelectorAll !== "function") return;
				let buttons = [];
				try { buttons = root.querySelectorAll("nav button"); } catch { return; }
				const want = saT("聊天设置");
				for (const btn of buttons) {
					try {
						if (patched.has(btn)) continue;
						if ((btn.textContent || "").trim() !== want) continue;
						const iconEl = btn.firstElementChild;
						if (!iconEl || iconEl === btn.lastElementChild && btn.childElementCount < 2) continue;
						try { if (iconEl.getAttribute("data-sa-nav-icon") === "1") { patched.add(btn); continue; } } catch { /* ignore */ }
						const span = document.createElement("span");
						span.className = iconEl.className;
						span.setAttribute("data-sa-nav-icon", "1");
						span.innerHTML = navIconSvgString(16);
						btn.replaceChild(span, iconEl);
						patched.add(btn);
					} catch { /* 单个按钮失败不影响其它 */ }
				}
			};
			patchIn(document.body);
			const obs = new MutationObserver((records) => {
				for (const r of records) for (const n of r.addedNodes) if (n && n.nodeType === 1) patchIn(n);
			});
			try { obs.observe(document.body, { childList: true }); } catch { return null; }
			const offLocale = saOnLocaleChange(() => { patched = new WeakSet(); patchIn(document.body); });
			return () => { try { obs.disconnect(); } catch { /* ignore */ } try { offLocale(); } catch { /* ignore */ } };
		}

		// ── 样式注入（按 fiber 生命周期，HMR 重挂能补回）───────────────────────────
		const TAG_ID = "dsh-chat-simple/styles-v1";
		const CSS_GEN = Date.now() + ":" + Math.random().toString(36).slice(2);
		function ensurePluginCss() {
			if (typeof document === "undefined") return null;
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "dsh-chat-simple";
				tag.dataset.pluginCss = TAG_ID;
				document.head.appendChild(tag);
			}
			if (tag.textContent !== CSS) tag.textContent = CSS;
			tag.dataset.pluginCssGen = CSS_GEN;
			return tag;
		}
		ensurePluginCss();

		// ── 插件导出 ────────────────────────────────────────────────────────────────
		const inject = ["slots"];

		function chatSimpleAttachAvatar(ctx) {
			// i18n：接上宿主 locale 服务（可选 + 短轮询），界面首次渲染就要按当前语言取词。
			if (ctx.effect) ctx.effect(() => saI18nAttach(ctx) || undefined);

			// 头像装饰层：每次 emit 重画一遍；卸载逐字节回到原生。
			if (ctx.effect) {
				ctx.effect(() => {
					const unsub = subscribe(syncAvatarLayer);
					// 会话消息是动态插入的：路由切换 / 新消息都可能带来新行，跟着 emit 之外
					// 再挂一次轻量的可见性复核（切回会话时补一遍现况）。
					const onVisibility = () => { if (typeof document === "undefined" || !document.hidden) syncAvatarLayer(); };
					let visBound = false, pageHideBound = false;
					if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
						document.addEventListener("visibilitychange", onVisibility);
						document.addEventListener("visibilitychange", onVisibilityResyncPersist);
						visBound = true;
					}
					if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
						window.addEventListener("pagehide", onPageHideFlush);
						pageHideBound = true;
					}
					ensurePluginCss();
					syncAvatarLayer();
					return () => {
						unsub();
						if (visBound && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
							document.removeEventListener("visibilitychange", onVisibility);
							document.removeEventListener("visibilitychange", onVisibilityResyncPersist);
						}
						if (pageHideBound && typeof window !== "undefined" && typeof window.removeEventListener === "function") {
							window.removeEventListener("pagehide", onPageHideFlush);
						}
						disposeAvatarLayer();
						cancelPendingPersist();
						if (typeof document !== "undefined" && typeof document.querySelector === "function") {
							const cssTag = document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]");
							if (cssTag && cssTag.dataset && cssTag.dataset.pluginCssGen === CSS_GEN && typeof cssTag.remove === "function") cssTag.remove();
						}
					};
				});
			}

			// 导航图标补丁（失败 = 保留官方兜底齿轮，不抛）。
			if (ctx.effect && typeof document !== "undefined") {
				ctx.effect(() => installNavIcon() || undefined);
			}

			// 先读设置（宿主文件是真源），再补画一次头像层。
			loadPersisted().catch(() => { /* 启动链失败不该抛穿 fiber */ });
		}

		function chatSimpleLegacyFontFetch() {
			if (typeof apiFetch !== 'function') return Promise.resolve(null)
			return apiFetch('/legacy-font', { method: 'GET' })
				.then((res) => (res && res.ok && res.data && res.data.settings) || null)
				.catch(() => null)
		}
		return { attach: chatSimpleAttachAvatar, Page: SessionAvatarSection, t: saT, apiFetch, legacyFontFetch: chatSimpleLegacyFontFetch };
	}

		function createFontHalf(require) {
			// 原 dsh-font-probe 的 factory 头部那一行（随切片一起剥掉了，这里补回）
			const React = (typeof window !== 'undefined' && window.React) || require('react')

    /* ---------- 默认值（与 host 半体 index.js 的 FIELD_DEFAULTS 保持一致）---------- */
    const DEFAULTS = {
      fontFamily: '',
      latinFontFamily: '',
      fontSize: '',
      codeFontFamily: '',
      codeFontSize: '',
      /* 排版四项：空串或 "0" 都按"不覆盖"处理 */
      letterSpacing: '',
      lineHeight: '',
      paragraphSpacing: '',
      firstLineIndent: '',
    }

    /* 排版项定义：一份数据驱动出四行滑块。value 存字符串，0 表示不覆盖。 */
    const METRICS = [
      { key: 'letterSpacing', label: '字距', hint: '整段文字的字符间距', unit: 'px', min: 0, max: 3, step: 0.1 },
      { key: 'lineHeight', label: '行距', hint: '在应用自身行高之上额外增加', unit: 'px', min: 0, max: 12, step: 1 },
      { key: 'paragraphSpacing', label: '段距', hint: '段落之间的额外间距', unit: 'px', min: 0, max: 24, step: 2 },
      { key: 'firstLineIndent', label: '首行缩进', hint: '段落首行缩进，单位 em（随字号缩放）', unit: 'em', min: 0, max: 4, step: 0.5 },
    ]
    const METRIC_KEYS = METRICS.map((m) => m.key)

    /** 把 "0" / "" / 非数字都归一成 0；有效正数原样返回。 */
    const metricValue = (raw) => {
      const n = Number(typeof raw === 'string' ? raw.trim() : raw)
      return Number.isFinite(n) && n > 0 ? n : 0
    }

    /** 从任意来源（快照 / 默认值）抽取四个排版数值。 */
    const pickMetrics = (src) => {
      const out = {}
      for (const k of METRIC_KEYS) out[k] = metricValue(src ? src[k] : 0)
      return out
    }

    /** 用于"宿主值是否变了"的指纹，避免每次渲染都重设草稿。 */
    const metricSignature = (src) => METRIC_KEYS.map((k) => String(metricValue(src ? src[k] : 0))).join('|')

    /**
     * 常用可选字体。
     *
     * `downloadUrl` 只在**确认过官方页面**的条目上填：缺字体时列表里会长出一个「下载」，
     * 直接开官方页。填第三方下载站不如不填 —— 那些站点的包来源不可控。
     *
     * `system: true` 表示操作系统自带（Windows 中文版预装 / 系统 UI 字体），
     * 没有合法的单独下载页，缺了就只提示，不给按钮。
     */
    const FONT_CHOICES = [
      {
        label: '阿里妈妈数黑体（Alimama ShuHeiTi）',
        value: 'Alimama ShuHeiTi',
        /* 必须链**页面**而不是 zip：字体包的 CDN（fonts.alibabadesign.com）开了
           防盗链，只认 alibabadesign.com / alibabafonts.com 的 Referer。
           直接访问 zip 会得到 403 "denied by Referer ACL"（实测：无 Referer 403，
           带该域 Referer 才 206）。从门户页点下载时 Referer 才是对的。 */
        downloadUrl: 'https://www.alibabafonts.com/#/more',
      },
      { label: '微软雅黑（Microsoft YaHei）', value: 'Microsoft YaHei', system: true },
      {
        label: '思源黑体（Noto Sans SC）',
        value: 'Noto Sans SC',
        downloadUrl: 'https://fonts.google.com/noto/specimen/Noto+Sans+SC',
      },
      {
        label: '思源宋体（Noto Serif SC）',
        value: 'Noto Serif SC',
        downloadUrl: 'https://fonts.google.com/noto/specimen/Noto+Serif+SC',
      },
      { label: '黑体（SimHei）', value: 'SimHei', system: true },
      { label: '宋体（SimSun）', value: 'SimSun', system: true },
      { label: 'Segoe UI（仅拉丁）', value: 'Segoe UI', system: true },
    ]

    /**
     * 判断某个字体族本机是否真的可用。
     *
     * 不用 `document.fonts.check()`：它对不存在的家族也返回 true（没有要加载的
     * 字体就算"通过"）。改用**宽度比对** —— 同一个字符串，先用 monospace 量一次，
     * 再用「目标字体 + monospace」量一次；找不到该字体时会回落到 monospace，
     * 两次宽度相等，据此判定"未安装"。
     *
     * 环境不支持 canvas 时返回 true（当作已安装），宁可少显示按钮也不误报。
     */
    const isFamilyAvailable = (family) => {
      try {
        if (typeof document === 'undefined' || typeof document.createElement !== 'function') return true
        const canvas = document.createElement('canvas')
        if (!canvas || typeof canvas.getContext !== 'function') return true
        const ctx = canvas.getContext('2d')
        if (!ctx || typeof ctx.measureText !== 'function') return true
        const probe = '中文ABCabc012'
        ctx.font = '40px monospace'
        const baseWidth = ctx.measureText(probe).width
        ctx.font = `40px "${family}", monospace`
        const testWidth = ctx.measureText(probe).width
        if (!Number.isFinite(baseWidth) || !Number.isFinite(testWidth)) return true
        return Math.abs(testWidth - baseWidth) > 0.5
      } catch (error) {
        return true
      }
    }

    /* 应用自带字体栈，抄成字面量当兜底。**不能**写 var(--dsw-font-family)：
       那是在声明该令牌的规则里引用它自己，属于自引用，整条声明判无效。 */
    const APP_FALLBACK_STACK =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'

    const APP_CODE_FALLBACK_STACK =
      '"SF Mono", "JetBrains Mono", "Fira Code", Consolas, "Liberation Mono", Menlo, Courier, "PingFang SC", "Microsoft YaHei"'

    const SHEET_MARKER = 'font-probe/1.0.0-settings'

    /** 把一个字体族名包成栈：选择在前，应用自带栈兜底。 */
    const stackFor = (family, fallback) => {
      const name = typeof family === 'string' ? family.trim() : ''
      if (name === '') return fallback
      const quoted = /^[A-Za-z][A-Za-z0-9 _-]*$/.test(name) ? `"${name}"` : name
      return `${quoted}, ${fallback}`
    }

    /** 字体族名 → 可安全放进 CSS 的值（含空格等需要引号）。 */
    const quoteFamily = (family) => {
      const name = typeof family === 'string' ? family.trim() : ''
      if (name === '') return ''
      return /^[A-Za-z][A-Za-z0-9 _-]*$/.test(name) ? `"${name}"` : name
    }

    /**
     * 界面正文字体栈：**拉丁字体排在前面，中文字体排在后面**。
     *
     * 浏览器逐个尝试字体栈里的族，第一个含该字符的字体胜出。中文字体通常也
     * 带拉丁字形，所以如果把中文放在前面，英文就永远走不到拉丁字体 ——
     * 顺序反过来才成立：英文/数字命中拉丁字体，汉字因为拉丁字体没有而回落到中文字体。
     *
     * 两者都留空时返回空串，表示"不覆盖"。
     */
    const buildUiStack = (latinFamily, cjkFamily) => {
      const parts = [quoteFamily(latinFamily), quoteFamily(cjkFamily)].filter((v) => v !== '')
      if (parts.length === 0) return ''
      return `${parts.join(', ')}, ${APP_FALLBACK_STACK}`
    }

    /* ---------- 运行时状态 ---------- */
    const state = {
      fontFamily: DEFAULTS.fontFamily,
      latinFontFamily: DEFAULTS.latinFontFamily,
      fontSize: DEFAULTS.fontSize,
      codeFontFamily: DEFAULTS.codeFontFamily,
      codeFontSize: DEFAULTS.codeFontSize,
      letterSpacing: DEFAULTS.letterSpacing,
      lineHeight: DEFAULTS.lineHeight,
      paragraphSpacing: DEFAULTS.paragraphSpacing,
      firstLineIndent: DEFAULTS.firstLineIndent,
    }

    const errors = []
    function note(where, error) {
      const text = error && error.message ? error.message : String(error)
      errors.push(`${where}: ${text}`)
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('data-dsh-font-override-errors', JSON.stringify(errors))
      }
      try { console.error('[font-probe]', where, error) } catch (e) { /* console may be absent */ }
    }

    /* ---------- 字体应用 ---------- */
    let sheetMode = null // null | 'runtime' | 'element'
    let sheetElement = null
    let sheetDispose = null

    function applyNow() {
      /* 界面字体栈由「英文字体 + 中文字体」合成：任一非空即视为启用覆盖。 */
      const uiStack = buildUiStack(state.latinFontFamily, state.fontFamily)
      const hasUiFont = uiStack !== ''
      const hasCodeFont = typeof state.codeFontFamily === 'string' && state.codeFontFamily.trim() !== ''
      const codeStack = stackFor(state.codeFontFamily, APP_CODE_FALLBACK_STACK)
      const size = typeof state.fontSize === 'string' ? state.fontSize.trim() : ''
      const sizeOk = /^\d+(\.\d+)?$/.test(size)

      /* 留空 = **不覆盖**，而不是覆盖成应用默认栈。
         这样"什么都没配"时本插件对界面完全无影响，也不会跟别的主题抢令牌。 */
      const declarations = []
      if (hasUiFont) declarations.push(`--dsw-font-family: ${uiStack};`)
      if (hasCodeFont) declarations.push(`--ds-font-family-code: ${codeStack};`)
      const bodyDeclarations = sizeOk ? [`--dsh-content-font-size: ${size}px;`] : []

      /* ---------- 排版四项：只作用于正文（Markdown 区域）----------
         容器是 `<div class="<hash>_markdown">`（primitives 的 Markdown 组件）。
         CSS Module 的类名是「哈希 + _ + 局部名」，所以用 [class*="_markdown"]
         做钩子：跨构建稳定，且不会误伤设置面板自己的 <p>。
         刻意不用全局 `p` —— 那会把插件自己的说明文字也缩进。 */
      const MD = '[class*="_markdown"]'
      const metricRules = []

      const letterSpacing = metricValue(state.letterSpacing)
      if (letterSpacing > 0) {
        metricRules.push(`${MD} { letter-spacing: ${letterSpacing}px; }`)
      }

      const lineExtra = metricValue(state.lineHeight)
      if (lineExtra > 0) {
        // 在应用自身的行高（24px + 内容字号增量）之上再加 Xpx
        metricRules.push(
          `${MD} p, ${MD} li, ${MD} blockquote, ${MD} td, ${MD} h1, ${MD} h2, ${MD} h3, ${MD} h4 ` +
          `{ line-height: calc(24px + var(--dsh-content-font-delta, 0px) + ${lineExtra}px) !important; }`,
        )
      }

      const paragraphSpacing = metricValue(state.paragraphSpacing)
      if (paragraphSpacing > 0) {
        metricRules.push(`${MD} p { margin-block: ${paragraphSpacing}px !important; }`)
      }

      const firstLineIndent = metricValue(state.firstLineIndent)
      if (firstLineIndent > 0) {
        metricRules.push(`${MD} p { text-indent: ${firstLineIndent}em !important; }`)
      }

      /* 代码字号：应用把代码块的字号写死在各自规则里（例如 11px/16px 的 font 简写），
         没有可供覆盖的令牌，所以直接用语义标签压 font-size。
         pre / code / kbd / samp 本来就是"代码"语义，改动它们不会波及普通正文。 */
      const codeSize = String(state.codeFontSize == null ? '' : state.codeFontSize).trim()
      if (/^\d+(\.\d+)?$/.test(codeSize) && Number(codeSize) > 0) {
        metricRules.push(`pre, pre code, code, kbd, samp { font-size: ${Number(codeSize)}px !important; }`)
      }

      const css =
        `/* ${SHEET_MARKER} */\n` +
        /* 字体名的横向缓慢滑动。位移量由设置页写入 --fp-marquee-x（实测溢出像素），
           两端往返，所以用 alternate。这段与用户配置无关，恒定存在。 */
        '@keyframes fp-marquee { from { transform: translateX(0); } to { transform: translateX(var(--fp-marquee-x, 0px)); } }\n' +
        (declarations.length > 0 ? `:root { ${declarations.join(' ')} }\n` : '') +
        (declarations.length > 0 || bodyDeclarations.length > 0
          ? `body { ${[...declarations, ...bodyDeclarations].join(' ')} }\n`
          : '') +
        metricRules.map((rule) => rule + '\n').join('')

      // 通道 1：样式表（保证以后新挂载的元素也能拿到令牌）。
      // 只挂一份：再次应用时更新内容，绝不堆叠。
      try {
        if (sheetMode === null) {
          if (typeof styles !== 'undefined' && styles && typeof styles.insert === 'function') {
            sheetDispose = styles.insert(css)
            sheetMode = 'runtime'
          } else if (typeof document !== 'undefined') {
            const el = document.createElement('style')
            el.setAttribute('data-plugin', 'font-probe')
            el.textContent = css
            document.head.appendChild(el)
            sheetElement = el
            sheetMode = 'element'
          }
        } else if (sheetMode === 'runtime') {
          try { if (typeof sheetDispose === 'function') sheetDispose() } catch (error) { /* already gone */ }
          sheetDispose = styles.insert(css)
        } else if (sheetElement !== null && typeof sheetElement.textContent === 'string') {
          sheetElement.textContent = css
        }
      } catch (error) {
        note('insertCss', error)
      }

      // 通道 2：inline + important —— 压过一切样式表。
      // 留空的字段要**移除**自家内联值，而不是写一个默认值进去。
      try {
        if (typeof document !== 'undefined') {
          const html = document.documentElement
          const body = document.body
          const applyInline = (el, property, value, on) => {
            if (!el || !el.style) return
            if (on) el.style.setProperty(property, value, 'important')
            else el.style.removeProperty(property)
          }
          for (const el of [html, body]) {
            applyInline(el, '--dsw-font-family', uiStack, hasUiFont)
            applyInline(el, '--ds-font-family-code', codeStack, hasCodeFont)
          }
          if (body && body.style) {
            if (sizeOk) body.style.setProperty('--dsh-content-font-size', size + 'px', 'important')
            else body.style.removeProperty('--dsh-content-font-size')
          }
          if (html) {
            html.setAttribute('data-dsh-font-override', SHEET_MARKER)
            html.setAttribute('data-dsh-font-family', (hasUiFont ? state.fontFamily : '') || '(default)')
          }
        }
      } catch (error) {
        note('inline setProperty', error)
      }
    }

    /* ---------- 可订阅的最小 store ---------- */
    function createStore(initial) {
      let snapshot = initial
      const listeners = new Set()
      return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set(next) {
          snapshot = next
          for (const listener of [...listeners]) {
            try { listener() } catch (error) { note('store listener', error) }
          }
        },
      }
    }

    /** 持久化状态：显示在设置页顶部，让"到底存不存得进去"可见。 */
    let formStatus = 'pending'
    /** 诊断串：宿主实际服务的命名空间 + 快照真实内容。必须在使用前声明（TDZ）。 */
    let debugInfo = 'describe: (未读取)'
    function setFormStatus(next) {
      formStatus = next
      try { store.set({ ...state, formStatus, debugInfo }) } catch (error) { /* store not ready yet */ }
      try {
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.setAttribute('data-dsh-font-override-form', next)
        }
      } catch (error) { /* no DOM */ }
    }

    const store = createStore({ ...DEFAULTS, formStatus, debugInfo: 'describe: (未读取)' })

    function update(patch, persist) {
      Object.assign(state, patch)
      applyNow()
      store.set({ ...state, formStatus, debugInfo })
      if (persist) persistNow()
    }

    /* ---------- 持久化：profile 的 configForms / settingsScope ---------- */
    /**
     * `configForms` 按 **Host 插件条目 id** 取表单，不是包名、也不是 patchId。
     * `list_plugins` 里本插件的 entryId 是 `include:font-probe`（bundle 插入的行
     * 带 `include:` 前缀），所以它排第一。
     */
    /** 候选命名空间。真实 ns 是 `entry.options.id`（profile 行 id）——不带 `include:`。 */
    const ENTRY_CANDIDATES = ['chat-simple', 'include:chat-simple']
    const LEGACY_NAMESPACE = 'dsh-font-probe'
    /** 旧插件留下的行 id：新行还没存过东西时从它读一次（回落）。 */
    const MIGRATION_NAMESPACES = ['font-probe', 'include:font-probe']

    let form = null
    let formUnsubscribe = null
    let pendingWrite = Promise.resolve()
    /** 未就绪时上一次看到的快照状态，供诊断显示。 */
    let pendingNote = ''
    let dirty = false
    /** 表单绑定与清理 effect 只做一次。 */
    let bound = false
    /** 诊断用：保留 configForms 服务句柄，供 refreshDebug 读 served 列表。 */
    let formsRef = null

    /**
     * 取设置表单。
     * 踩坑记录（两条，都很隐蔽）：
     *
     * A. `inject` 留空、只在 apply 里试探 `ctx.configForms`，服务没就绪就永久放弃。
     *    现在改成就绪重试。
     *
     * B. **`forms.get(ns)` 永远返回一个 lazy view，不校验该 ns 是否真被服务。**
     *    所以"拿到了 form"不等于"就绪"——必须看 `getSnapshot().status === 'ready'`。
     *    第一版据此乐观判定，状态行显示"会保存"却实际写不进去。
     *
     * 命名空间优先从 describe 镜像里找（`view.namespaces[].ns`），它才是 Host
     * 真正服务的名字；找不到再退回候选列表。
     */
    function listServedNamespaces(forms) {
      try {
        if (typeof forms.describe !== 'function') return []
        const describe = forms.describe()
        if (!describe || typeof describe.getSnapshot !== 'function') return []
        const snapshot = describe.getSnapshot()
        const namespaces = snapshot && snapshot.view && Array.isArray(snapshot.view.namespaces) ? snapshot.view.namespaces : []
        return namespaces.map((entry) => entry && entry.ns).filter((ns) => typeof ns === 'string')
      } catch (error) {
        return []
      }
    }

    function acquireForm(ctx) {
      let forms
      try { forms = ctx.configForms } catch (e) { forms = undefined }
      if (forms === undefined || forms === null) {
        try { forms = ctx.get('configForms') } catch (e) { forms = undefined }
      }
      formsRef = forms

      if (forms !== undefined && forms !== null && typeof forms.get === 'function') {
        const served = listServedNamespaces(forms).filter((ns) => ns === 'chat-simple' || ns.endsWith('chat-simple'))
        const candidates = served.length > 0 ? served : ENTRY_CANDIDATES

        /** 只有快照 status === 'ready' 才算真正就绪。 */
        const readyForm = (ns) => {
          try {
            const candidate = forms.get(ns)
            if (!candidate || typeof candidate.getSnapshot !== 'function') return null
            const snapshot = candidate.getSnapshot()
            return snapshot && snapshot.status === 'ready' ? candidate : null
          } catch (e) { return null }
        }

        for (const ns of candidates) {
          const candidate = readyForm(ns)
          if (candidate !== null) {
            setFormStatus(ns + ':ready')
            return candidate
          }
        }

        /* 没就绪就**不要绑定**。
           踩坑：`get()` 对任何 namespace 都返回一个 lazy view，所以"先拿一个
           凑合着用、靠 subscribe 等它就绪"是错的 —— 如果那个 namespace 根本不是
           宿主服务的名字（例如把 `include:font-probe` 当成 ns），它的快照会
           **永久 unavailable**，订阅再多次也救不回来。状态行于是卡在
           `include:unavailable`，而 served 列表里明明有正确的 `font-probe`。
           正确做法：返回 null，交给 bindFormWhenReady 继续重试。 */
        let lastSeen = ''
        for (const ns of candidates) {
          try {
            const candidate = forms.get(ns)
            if (!candidate || typeof candidate.getSnapshot !== 'function') continue
            const snapshot = candidate.getSnapshot()
            lastSeen = String(snapshot && snapshot.status ? snapshot.status : 'unknown')
          } catch (e) { /* 下一个候选 */ }
        }
        pendingNote = lastSeen === '' ? 'none-of:' + ENTRY_CANDIDATES.join('|') : 'waiting:' + lastSeen
        setFormStatus('pending')
        return null
      }

      setFormStatus('no-configForms')

      // 旧版：settingsScope.bind({ namespace })
      let binder
      try { binder = ctx.settingsScope } catch (e) { binder = undefined }
      if (binder === undefined || binder === null) {
        try { binder = ctx.get('settingsScope') } catch (e) { binder = undefined }
      }
      if (binder && typeof binder.bind === 'function') {
        try {
          const scope = binder.bind({ namespace: LEGACY_NAMESPACE })
          if (scope && typeof scope.getSnapshot === 'function') {
            setFormStatus('settingsScope')
            return scope
          }
        } catch (e) { /* 放弃持久化 */ }
      }
      return null
    }

    /* ---------- 诊断：把宿主实际服务的命名空间与快照内容摊在页面上 ----------
       排查"设了不生效/存不进去"时，最缺的就是这两样东西。它们不依赖控制台，
       打开设置页就能读到。稳定后可以删，但代价是下次再出问题又得靠猜。 */
    function refreshDebug(forms, snapshot) {
      const parts = []
      try {
        const served = listServedNamespaces(forms)
        parts.push('served=' + (served.length ? served.join(',') : '(空)'))
      } catch (error) {
        parts.push('served=ERR')
      }
      if (snapshot) {
        parts.push('status=' + String(snapshot.status))
        if (snapshot.value) {
          parts.push('value.fontFamily=' + JSON.stringify(snapshot.value.fontFamily))
        } else {
          parts.push('value=(无)')
        }
      }
      // 关键：区分"宿主给了什么"和"我们实际应用了什么"
      parts.push('applied=' + JSON.stringify(state.fontFamily))
      parts.push('dirty=' + String(dirty))
      if (pendingNote) parts.push('pending=' + pendingNote)
      try {
        const inlineVar = typeof document !== 'undefined' && document.documentElement && document.documentElement.style
          ? document.documentElement.style.getPropertyValue('--dsw-font-family')
          : ''
        parts.push('inlineVar=' + JSON.stringify(String(inlineVar).slice(0, 34)))
      } catch (error) { parts.push('inlineVar=ERR') }
      if (errors.length > 0) parts.push('errors=' + JSON.stringify(errors.slice(-3)))
      debugInfo = parts.join('  ')
      try { store.set({ ...state, formStatus, debugInfo }) } catch (error) { /* store not ready */ }
    }
    function syncFromForm() {
      if (!form || typeof form.getSnapshot !== 'function') return
      let snapshot
      try { snapshot = form.getSnapshot() } catch (error) { note('form.getSnapshot', error); return }
      if (!snapshot) return
      // 诊断先行：不管 ready 与否都把宿主真实状态摊出来
      refreshDebug(formsRef, snapshot)
      // 状态以快照为准：loading / unavailable / ready
      if (snapshot.status !== 'ready') {
        setFormStatus((formStatus.split(':')[0] || 'chat-simple') + ':' + snapshot.status)
        return
      }
      if (!snapshot.value) return
      const value = snapshot.value
      if (dirty) return
      /* 字符串字段统一走这里的宽松读取：非字符串一律按默认（空）处理。 */
      const str = (v, fallback) => (typeof v === 'string' ? v : (typeof v === 'number' && Number.isFinite(v) ? String(v) : fallback))
      Object.assign(state, {
        fontFamily: str(value.fontFamily, '') !== '' ? value.fontFamily : DEFAULTS.fontFamily,
        latinFontFamily: str(value.latinFontFamily, DEFAULTS.latinFontFamily),
        fontSize: str(value.fontSize, DEFAULTS.fontSize),
        codeFontFamily: str(value.codeFontFamily, DEFAULTS.codeFontFamily),
        codeFontSize: str(value.codeFontSize, DEFAULTS.codeFontSize),
        letterSpacing: str(value.letterSpacing, DEFAULTS.letterSpacing),
        lineHeight: str(value.lineHeight, DEFAULTS.lineHeight),
        paragraphSpacing: str(value.paragraphSpacing, DEFAULTS.paragraphSpacing),
        firstLineIndent: str(value.firstLineIndent, DEFAULTS.firstLineIndent),
      })
      applyNow()
      refreshDebug(formsRef, snapshot)
    }

    function bindForm(ctx) {
      form = acquireForm(ctx)
      if (!form) return false
      syncFromForm()
      if (typeof form.subscribe === 'function') formUnsubscribe = form.subscribe(syncFromForm)
      return true
    }

    /**
     * 等 `configForms` 就绪再绑定。
     * 和 `slots` 完全同一类坑：apply 那一刻服务可能还没装好，只试一次就永久放弃，
     * 结果是界面能改字体、`persistNow()` 却因为 `form === null` 直接 return ——
     * 设置永远不落盘，而且没有任何报错。
     */
    let bindTimer = null
    function bindFormWhenReady(ctx, attempt) {
      if (disposed || form !== null) return
      let ok = false
      try { ok = bindForm(ctx) } catch (error) { note('bindForm', error) }
      if (ok) return
      if (attempt < 120) {
        bindTimer = setTimeout(() => bindFormWhenReady(ctx, attempt + 1), 250)
        if (bindTimer && typeof bindTimer.unref === 'function') bindTimer.unref()
      } else {
        note('configForms', new Error('等待 configForms 服务超时；设置不会落盘（字体仍生效）'))
      }
    }

    /**
     * 串行写入。
     *
     * **关键 API 事实**（从 `@deepseek-ai/dsh-client-ui-settings` 的
     * `ConfigFormController` 读出来的）：
     *     set(field, value)  →  mutate([{ op:"set", path:[field], value }])
     * 也就是说 `set` 收的是**单个字段名**，不是整个配置对象。
     * 第一版写成 `form.set({fontFamily, …})`，整个对象被当成"字段名"，
     * 于是什么都没写进去 —— 而且 `mutate` 内部报的错不会冒泡到这里，
     * 表现为"界面能改、文件永不更新"。现在改用 `mutate` 一次原子写入三个字段。
     */
    function persistNow() {
      if (!form) {
        note('form.set', new Error('设置表单尚未就绪，这次改动只在当前页面生效'))
        return
      }
      dirty = true
      const payload = { ...state }
      const ops = Object.keys(payload).map((field) => ({ op: 'set', path: [field], value: payload[field] }))

      pendingWrite = pendingWrite
        .then(async () => {
          if (typeof form.mutate === 'function') return form.mutate(ops)
          // 极老的形态：逐字段 set(field, value)
          if (typeof form.set === 'function') {
            for (const op of ops) await form.set(op.path[0], op.value)
            return true
          }
          throw new Error('表单既无 mutate 也无 set')
        })
        .then((ok) => {
          if (ok === false) {
            setFormStatus((formStatus.split(':')[0] || 'chat-simple') + ':refused')
            note('form.set', new Error('宿主拒绝了这次写入（字段未标 volatile / 非 loopback 的 memory 模式 / revision 冲突）'))
          } else {
            // 写成功后本地状态与宿主一致，解除 dirty，让后续宿主推送能再同步回来。
            dirty = false
            setFormStatus((formStatus.split(':')[0] || 'chat-simple') + ':saved')
          }
        })
        .catch((error) => {
          setFormStatus((formStatus.split(':')[0] || 'chat-simple') + ':error')
          note('form.set', error)
        })
      return pendingWrite
    }

    /* ---------- 设置页 UI ---------- */
    const rowStyle = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px 0',
      borderBottom: '0.5px solid var(--dsw-alias-border-l2)',
      /* 页面是列向 flex；同样禁止被压扁，否则高滚动容器里行会被挤压重叠 */
      flexShrink: 0,
    }
    const labelStyle = {
      display: 'block',
      color: 'var(--dsw-alias-label-primary)',
      fontSize: '14px',
      lineHeight: '22px',
    }
    const hintStyle = {
      display: 'block',
      color: 'var(--dsw-alias-label-tertiary)',
      fontSize: '12px',
      lineHeight: '18px',
      marginTop: '2px',
    }
    const controlStyle = {
      font: 'inherit',
      fontSize: '13px',
      color: 'var(--dsw-alias-label-primary)',
      background: 'var(--dsw-alias-bg-layer-1)',
      border: '0.5px solid var(--dsw-alias-border-l3)',
      borderRadius: 'var(--dsw-radius-md)',
      padding: '6px 10px',
      minWidth: '260px',
      boxSizing: 'border-box',
    }
    const buttonStyle = {
      font: 'inherit',
      fontSize: '13px',
      color: 'var(--dsw-alias-label-primary)',
      background: 'var(--dsw-alias-interactive-bg-hover)',
      border: '0.5px solid var(--dsw-alias-border-l3)',
      borderRadius: 'var(--dsw-radius-md)',
      padding: '6px 14px',
      cursor: 'pointer',
    }

    /* 预览用**草稿**字体，而不是已应用的字体 —— 确认制下这才有意义：
       先在这里看准了再点确认。 */
    function PreviewBlock(props) {
      const family = stackFor(props && props.fontFamily, APP_FALLBACK_STACK)
      return React.createElement(
        'div',
        {
          style: {
            border: '0.5px solid var(--dsw-alias-border-l2)',
            borderRadius: 'var(--dsw-radius-lg)',
            background: 'var(--dsw-alias-bg-layer-1)',
            padding: '12px 16px',
            fontFamily: family,
            color: 'var(--dsw-alias-label-primary)',
            lineHeight: '1.7',
          },
        },
        [
          React.createElement('div', { key: 'cn', style: { fontSize: '15px' } }, '字体预览：永和九年，岁在癸丑，暮春之初。'),
          React.createElement('div', { key: 'en', style: { fontSize: '15px' } }, 'The quick brown fox jumps over the lazy dog. 0123456789'),
          React.createElement('div', { key: 'mix', style: { fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)' } }, '混排 ABC 中文 123 · 标点，。！？——…《》'),
        ],
      )
    }

    function FontSettingsPage() {
      const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
      const [draft, setDraft] = React.useState(snapshot.fontFamily)
      const [draftLatin, setDraftLatin] = React.useState(snapshot.latinFontFamily)
      const [draftSize, setDraftSize] = React.useState(snapshot.fontSize)
      const [draftCode, setDraftCode] = React.useState(snapshot.codeFontFamily)
      const [draftCodeSize, setDraftCodeSize] = React.useState(snapshot.codeFontSize)

      /* ---------- 采样设置面板的真实底色 ----------
         渐隐带必须"淹没"在设置面板里，任何猜错的令牌都会露出一道色带。
         与其猜 --dsw-alias-bg-* 里的哪一个，不如从本段往上走，
         取第一个真正有底色的祖先算出来的 backgroundColor。
         这样深浅色主题、第三方主题、以及面板内部再多包几层都能自动对上。 */
      const useRefSafe = typeof React.useRef === 'function' ? React.useRef : () => ({ current: null })
      const useEffectSafe = typeof React.useEffect === 'function' ? React.useEffect : () => {}
      const rootRef = useRefSafe(null)
      const [panelBg, setPanelBg] = React.useState('')

      useEffectSafe(() => {
        const node = rootRef.current
        if (!node || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return
        /** 'transparent' 与全透明 rgba 都表示"没画底色"，继续往上找。 */
        const opaque = (value) => typeof value === 'string' && value !== '' && value !== 'transparent'
          && !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(value)
        let el = node.parentElement
        let depth = 0
        while (el && depth < 12) {
          let bg = ''
          try { bg = window.getComputedStyle(el).backgroundColor || '' } catch (error) { bg = '' }
          if (opaque(bg)) { setPanelBg(bg); return }
          el = el.parentElement
          depth++
        }
      }, [])

      /* 采样成功就用面板真实底色；拿不到就退回应用基础背景令牌。
         两个派生色都从它算：渐隐末端 86%，卡片 92%（略实一点，边界更清楚）。 */
      const panelColor = panelBg || 'var(--dsw-alias-bg-base, Canvas)'

      /* useState 的初始值只在挂载时取一次；宿主值晚到或外部改动后，
         输入框会一直显示旧值（用户以为"还是阿里妈妈"其实是控件没同步）。
         这里把 draft 跟随快照更新，编辑期间由本地 setDraft 覆盖。 */
      const [syncedFrom, setSyncedFrom] = React.useState(snapshot.fontFamily)
      if (syncedFrom !== snapshot.fontFamily) {
        setSyncedFrom(snapshot.fontFamily)
        setDraft(snapshot.fontFamily)
      }
      const [syncedLatin, setSyncedLatin] = React.useState(snapshot.latinFontFamily)
      if (syncedLatin !== snapshot.latinFontFamily) {
        setSyncedLatin(snapshot.latinFontFamily)
        setDraftLatin(snapshot.latinFontFamily)
      }

      /* ---------- 草稿 → 确认 的提交模型 ----------
         控件只改本地草稿，界面与 profile 都不动；点「确认应用」才一次性生效并写盘。
         好处：可以先把字体挑好、在预览里看准了再提交，避免每动一下就改全局。 */
      const [syncedSize, setSyncedSize] = React.useState(snapshot.fontSize)
      if (syncedSize !== snapshot.fontSize) {
        setSyncedSize(snapshot.fontSize)
        setDraftSize(snapshot.fontSize)
      }
      const [syncedCode, setSyncedCode] = React.useState(snapshot.codeFontFamily)
      if (syncedCode !== snapshot.codeFontFamily) {
        setSyncedCode(snapshot.codeFontFamily)
        setDraftCode(snapshot.codeFontFamily)
      }
      const [syncedCodeSize, setSyncedCodeSize] = React.useState(snapshot.codeFontSize)
      if (syncedCodeSize !== snapshot.codeFontSize) {
        setSyncedCodeSize(snapshot.codeFontSize)
        setDraftCodeSize(snapshot.codeFontSize)
      }

      /* 排版四项合成**一个**草稿对象：字段同构，逐项 useState 只会堆样板。 */
      const [metrics, setMetrics] = React.useState(() => pickMetrics(snapshot))
      const metricSig = metricSignature(snapshot)
      const [syncedMetricSig, setSyncedMetricSig] = React.useState(metricSig)
      if (syncedMetricSig !== metricSig) {
        setSyncedMetricSig(metricSig)
        setMetrics(pickMetrics(snapshot))
      }

      /* 总预览的样张：两段（中文 / 拉丁+数字）。
         保留两段是因为单段看不出「段距」；混排那段只是重复信息，占地方就够了。 */
      const previewParagraphs = [
        '永和九年，岁在癸丑，暮春之初，会于会稽山阴之兰亭，修禊事也。',
        'The quick brown fox jumps over the lazy dog — 0123456789',
      ]

      /* 行高/字号基准与应用一致：24px 基准 + 正文字号增量，再叠加草稿里的行距增量。
         预览的字号必须**跟着草稿走** —— 之前这里写死 15px/14px，
         结果改正文字号时只有行高变了、字号纹丝不动，看着像功能没生效。 */
      const draftSizeNum = Number(String(draftSize).trim())
      const sizeValid = Number.isFinite(draftSizeNum) && draftSizeNum > 0
      const baseLineHeight = sizeValid ? 24 + (draftSizeNum - 14) : 24
      const previewLineHeight = baseLineHeight + (metrics.lineHeight || 0)
      /* 未设置时按应用默认的 14px 显示，这样"空"和"设成 14"看起来一致，符合预期 */
      const previewFontSize = sizeValid ? draftSizeNum : 14

      /* 代码样张：只受「代码字体 / 代码字号」影响。
         应用里代码块字号在 11–13px 区间（各组件写死，没有令牌），
         未设置时取 12px 作为代表值；用户设了就用用户的。 */
      const draftCodeSizeNum = Number(String(draftCodeSize).trim())
      const codeSizeValid = Number.isFinite(draftCodeSizeNum) && draftCodeSizeNum > 0
      const previewCodeFontSize = codeSizeValid ? draftCodeSizeNum : 12
      const previewCodeLineHeight = Math.round(previewCodeFontSize * 1.6)
      /* 反引号在单引号字符串里是普通字符，不会被当成模板插值 */
      const previewCodeSample = [
        'const greet = (name) => `Hi, ${name}`',
        '// 0123 ABCdef + 中文标点，。！？',
      ].join('\n')

      const asDraft = (v) => (typeof v === 'string' ? v : '')

      /* 触发按钮上显示的名字：命中预设就显示预设的友好名称，否则原样显示族名。 */
      const draftFamily = asDraft(draft)
      const matchedChoice = FONT_CHOICES.find((c) => c.value === draftFamily)
      const currentFamilyLabel = draftFamily === ''
        ? '默认（应用自带字体）'
        : (matchedChoice ? matchedChoice.label : draftFamily)
      const hasChanges =
        asDraft(draft) !== asDraft(snapshot.fontFamily) ||
        asDraft(draftLatin) !== asDraft(snapshot.latinFontFamily) ||
        asDraft(draftSize) !== asDraft(snapshot.fontSize) ||
        asDraft(draftCode) !== asDraft(snapshot.codeFontFamily) ||
        asDraft(draftCodeSize) !== asDraft(snapshot.codeFontSize) ||
        METRIC_KEYS.some((k) => metrics[k] !== metricValue(snapshot[k]))

      /** 字号只接受正的十进制数；其它输入一律按"不覆盖"存空，避免脏值进 profile。 */
      const pxOrEmpty = (v) => {
        const t = String(v == null ? '' : v).trim()
        if (!/^\d+(\.\d+)?$/.test(t)) return ''
        const n = Number(t)
        return n > 0 ? t : ''
      }

      const confirmAll = () => {
        const metricPayload = {}
        for (const k of METRIC_KEYS) metricPayload[k] = metrics[k] > 0 ? String(metrics[k]) : ''
        update(
          {
            fontFamily: draft,
            latinFontFamily: draftLatin,
            fontSize: pxOrEmpty(draftSize),
            codeFontFamily: draftCode,
            codeFontSize: pxOrEmpty(draftCodeSize),
            ...metricPayload,
          },
          true,
        )
      }

      /** 恢复默认只重置草稿，同样需要点确认才生效。 */
      const resetDrafts = () => {
        setDraft(DEFAULTS.fontFamily)
        setDraftLatin(DEFAULTS.latinFontFamily)
        setDraftSize(DEFAULTS.fontSize)
        setDraftCode(DEFAULTS.codeFontFamily)
        setDraftCodeSize(DEFAULTS.codeFontSize)
        setMetrics(pickMetrics(DEFAULTS))
      }

      /* ---------- 预览的尺寸偏好（可拖动 / 可隐藏）----------
         字号和行距一调大，预览会把吸底卡片顶得很高。给一条拖动条和一个隐藏开关，
         偏好存进 localStorage：**不动 host schema，所以不需要重启**。 */
      const PREVIEW_PREF_KEY = 'dsh-font-probe.preview-pref'
      const readPreviewPref = () => {
        const fallback = { height: 176, hidden: false }
        try {
          if (typeof window === 'undefined' || !window.localStorage) return fallback
          const raw = window.localStorage.getItem(PREVIEW_PREF_KEY)
          if (!raw) return fallback
          const parsed = JSON.parse(raw) || {}
          const height = Number(parsed.height)
          return {
            height: Number.isFinite(height) && height >= 60 ? Math.min(600, Math.round(height)) : fallback.height,
            hidden: parsed.hidden === true,
          }
        } catch (error) {
          return fallback
        }
      }
      const [previewPref, setPreviewPref] = React.useState(readPreviewPref)

      const persistPreviewPref = (next) => {
        setPreviewPref(next)
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(PREVIEW_PREF_KEY, JSON.stringify(next))
          }
        } catch (error) { /* 隐私模式下可能抛错，忽略即可 */ }
      }

      /** 向上拖 = 变高。拖动过程只更新状态，松手才落盘，避免每次 mousemove 都写 localStorage。 */
      const startPreviewResize = (event) => {
        if (typeof window === 'undefined' || !window.addEventListener) return
        event.preventDefault()
        const startY = event.clientY
        const startHeight = previewPref.height
        const hiddenAtStart = previewPref.hidden
        let latest = startHeight
        const onMove = (moveEvent) => {
          latest = Math.round(Math.max(80, Math.min(560, startHeight + (startY - moveEvent.clientY))))
          setPreviewPref((prev) => (prev.height === latest ? prev : { ...prev, height: latest }))
        }
        const onUp = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
          persistPreviewPref({ height: latest, hidden: hiddenAtStart })
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }

      /* ---------- 当前字体名的横向滚动（marquee）----------
         字体族名经常比控件宽，原生 <select> 只会把它截断，无法做动画。
         所以换成自绘触发按钮：名字放在 overflow:hidden 的容器里，
         实测溢出量后写进 CSS 变量，交给 @keyframes 缓慢左右往返。 */
      const [presetMenuOpen, setPresetMenuOpen] = React.useState(false)
      const nameWrapRef = useRefSafe(null)
      const [nameOverflow, setNameOverflow] = React.useState(0)

      /* 不传依赖数组：每次渲染后都重新量一次（字体加载完、窗口变化都会影响宽度）。
         值没变时 setState 会被 React 短路，不会造成循环。 */
      useEffectSafe(() => {
        const el = nameWrapRef.current
        if (!el) return
        const overflow = (el.scrollWidth || 0) - (el.clientWidth || 0)
        setNameOverflow(overflow > 2 ? Math.round(overflow) : 0)
      })

      /* ---------- 系统字体列表（Local Font Access API）----------
         `queryLocalFonts()` 需要用户手势，所以只在点击「浏览本机字体」时调用。
         权限：DSH 主窗口的 permission handler 对非 media 权限直接放行，因此这里
         通常不需要弹窗；若环境不支持或用户拒绝，就退回手输字体族名。 */
      const [pickerOpen, setPickerOpen] = React.useState(false)
      /** 这次打开列表是要选哪一个：'cjk'（界面字体）还是 'latin'（英文字体）。 */
      const [pickerFor, setPickerFor] = React.useState('cjk')
      const [fontList, setFontList] = React.useState(null)   // string[] | null
      const [fontListState, setFontListState] = React.useState('idle') // idle|loading|ready|unsupported|denied
      const [fontQuery, setFontQuery] = React.useState('')

      const loadSystemFonts = async () => {
        const api = typeof window !== 'undefined' ? window.queryLocalFonts : undefined
        if (typeof api !== 'function') { setFontListState('unsupported'); return }
        setFontListState('loading')
        try {
          const fonts = await api.call(window)
          const families = Array.from(new Set((fonts || []).map((f) => f && f.family).filter((n) => typeof n === 'string' && n.trim() !== '')))
          families.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { sensitivity: 'base' }))
          setFontList(families)
          setFontListState(families.length > 0 ? 'ready' : 'unsupported')
        } catch (error) {
          note('queryLocalFonts', error)
          setFontListState('denied')
        }
      }

      const onBrowse = (target) => {
        const wanted = target === 'latin' ? 'latin' : target === 'code' ? 'code' : 'cjk'
        // 已打开且选的是同一目标 → 收起；换了目标 → 只切换目标，不收起
        if (pickerOpen && pickerFor === wanted) { setPickerOpen(false); return }
        setPickerFor(wanted)
        setPickerOpen(true)
        if (fontList === null && fontListState !== 'loading') loadSystemFonts()
      }

      /** 列表点选：写进当前目标对应的草稿（三行共用同一份列表）。 */
      const pickFamily = (family) => {
        if (pickerFor === 'latin') setDraftLatin(family)
        else if (pickerFor === 'code') setDraftCode(family)
        else setDraft(family)
        setPickerOpen(false)
      }

      /** 当前目标的草稿值 —— 用于列表里的高亮判定。 */
      const currentPickValue = asDraft(
        pickerFor === 'latin' ? draftLatin : pickerFor === 'code' ? draftCode : draft,
      )

      const filteredFamilies = (() => {
        if (!fontList) return []
        const q = fontQuery.trim().toLowerCase()
        return (q === '' ? fontList : fontList.filter((f) => f.toLowerCase().includes(q))).slice(0, 300)
      })()

      /* 字体列表：两行（界面字体 / 英文字体）共用同一份 UI，
         谁被点开就渲染在谁自己下方 —— 之前写死在界面字体行里，
         点英文字体时面板却从上面弹出，很怪。 */
      const renderFontPicker = () => (
React.createElement('div', {
                key: 'picker',
                style: {
                  marginTop: '10px',
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '0.5px solid var(--dsw-alias-border-l3)',
                  borderRadius: 'var(--dsw-radius-lg)',
                  background: 'var(--dsw-alias-bg-layer-1)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                },
              }, [
                React.createElement('input', {
                  key: 'q',
                  type: 'text',
                  'aria-label': '筛选字体',
                  placeholder: '输入名称筛选，例如 yahei / noto / 黑体',
                  value: fontQuery,
                  onChange: (event) => setFontQuery(event.target.value),
                  style: { ...controlStyle, minWidth: '0', width: '100%', boxSizing: 'border-box' },
                }),
                React.createElement('span', { key: 'st', style: hintStyle },
                  fontListState === 'loading' ? '正在读取系统字体…'
                    : fontListState === 'unsupported' ? '当前环境不支持字体枚举（需要 Chromium 的 Local Font Access API），请直接在上面输入字体族名。'
                      : fontListState === 'denied' ? '读取系统字体被拒绝，请直接输入字体族名。'
                        : fontListState === 'ready' ? `共 ${fontList.length} 个字体族，显示 ${filteredFamilies.length} 个`
                          : ''),
                React.createElement('div', {
                  key: 'list',
                  style: { maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' },
                }, filteredFamilies.map((family) => React.createElement(
                  'button',
                  {
                    key: family,
                    type: 'button',
                    title: family,
                    onClick: () => pickFamily(family),
                    style: {
                      font: 'inherit',
                      fontSize: '15px',
                      /* 行高给足：CJK 字体的 ascent/descent 比拉丁大，行太矮会切掉上下 */
                      lineHeight: '1.7',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--dsw-alias-label-primary)',
                      fontFamily: `"${family}", sans-serif`,
                      background: family === currentPickValue ? 'var(--dsw-alias-bg-module-platform)' : 'transparent',
                      border: '0.5px solid ' + (family === currentPickValue ? 'var(--dsw-static-neutral-bluish-400)' : 'transparent'),
                      borderRadius: 'var(--dsw-radius-md)',
                      padding: '9px 12px',
                      minHeight: '46px',
                      boxSizing: 'border-box',
                      /* 关键：列表是 max-height 的列向 flex 容器，子项默认
                         flex-shrink:1 会被压扁（内容溢出、边框穿字）。必须禁止收缩，
                         让容器正常滚动。 */
                      flexShrink: 0,
                      /* 长名字换行而不是被省略号截断 */
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      alignItems: 'stretch',
                    },
                  },
                  [
                    React.createElement('span', { key: 'n', style: { display: 'block' } }, family),
                    React.createElement('span', {
                      key: 's',
                      style: {
                        display: 'block',
                        fontSize: '12px',
                        lineHeight: '1.7',
                        color: 'var(--dsw-alias-label-tertiary)',
                      },
                    }, 'Aa Bb 0123 中文示例'),
                  ],
                ))),
              ])
      )
      const rows = []

      rows.push(
        React.createElement('div', { key: 'family', style: { ...rowStyle, flexDirection: 'column' } }, [
          React.createElement('div', { key: 'head', style: { display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' } }, [
            React.createElement('span', { key: 'l', style: { flex: '1 1 auto', minWidth: '0' } }, [
              React.createElement('span', { key: 't', style: labelStyle }, '中文字体'),
              React.createElement('span', { key: 'h', style: hintStyle }, '汉字使用的字体。改完点底部「确认应用」才生效。'),
            ]),
            /* 控件列固定成下面输入框的同一宽度（controlStyle.minWidth），
               否则三个控件会被各自内容撑成不同宽，右边缘参差。 */
            React.createElement('div', {
              key: 'c',
              style: {
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                flex: '0 0 auto',
                width: controlStyle.minWidth,
              },
            }, [
              /* 触发按钮：显示当前字体族名，超出宽度时缓慢左右滑动 */
              React.createElement('button', {
                key: 'sel',
                type: 'button',
                'aria-label': '中文字体',
                'aria-expanded': presetMenuOpen ? 'true' : 'false',
                title: currentFamilyLabel,
                onClick: () => setPresetMenuOpen((open) => !open),
                style: {
                  ...controlStyle,
                  minWidth: 0,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  overflow: 'hidden',
                },
              }, [
                React.createElement('span', {
                  key: 'w',
                  ref: nameWrapRef,
                  style: {
                    flex: '1 1 auto',
                    minWidth: 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    /* 动画距离由实测溢出量决定，交给 keyframes 消费 */
                    '--fp-marquee-x': `-${nameOverflow}px`,
                  },
                }, React.createElement('span', {
                  key: 'n',
                  style: {
                    display: 'inline-block',
                    whiteSpace: 'nowrap',
                    animation: nameOverflow > 0 ? 'fp-marquee 6s ease-in-out infinite alternate' : undefined,
                  },
                }, currentFamilyLabel)),
                React.createElement('span', {
                  key: 'arrow',
                  'aria-hidden': 'true',
                  style: { flex: '0 0 auto', opacity: 0.55, fontSize: '11px' },
                }, presetMenuOpen ? '▴' : '▾'),
              ]),

              /* 预设下拉：自绘，原生 select 无法做滚动动画 */
              presetMenuOpen
                ? React.createElement('div', {
                    key: 'menu',
                    style: {
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      zIndex: 20,
                      maxHeight: '240px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '4px',
                      gap: '2px',
                      background: 'var(--dsw-alias-bg-layer-1)',
                      border: '0.5px solid var(--dsw-alias-border-l3)',
                      borderRadius: 'var(--dsw-radius-md)',
                      boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)',
                    },
                  }, FONT_CHOICES.map((choice) => {
                    /* 每次展开菜单时实测哪些没装：7 个族各量一次宽度，开销可忽略。
                       只在菜单打开时算，关着的时候完全不碰 canvas。 */
                    const installed = isFamilyAvailable(choice.value)
                    const showDownload = !installed && typeof choice.downloadUrl === 'string'
                    return React.createElement('div', {
                      key: choice.value,
                      style: { display: 'flex', alignItems: 'center', gap: '4px' },
                    }, [
                      React.createElement('button', {
                        key: 'pick',
                        type: 'button',
                        onClick: () => {
                          setDraft(choice.value)
                          setPresetMenuOpen(false)
                        },
                        style: {
                          font: 'inherit',
                          fontSize: '13px',
                          lineHeight: '20px',
                          textAlign: 'left',
                          padding: '6px 8px',
                          borderRadius: 'var(--dsw-radius-sm, 4px)',
                          border: 'none',
                          cursor: 'pointer',
                          flex: '1 1 auto',
                          minWidth: '0',
                          color: installed ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-tertiary)',
                          background: choice.value === asDraft(draft)
                            ? 'var(--dsw-alias-bg-module-platform)'
                            : 'transparent',
                        },
                      }, choice.label),

                      /* 没装 + 有官方页 → 直接开官方下载 */
                      showDownload
                        ? React.createElement('a', {
                            key: 'dl',
                            href: choice.downloadUrl,
                            target: '_blank',
                            rel: 'noreferrer noopener',
                            title: '打开官方下载页',
                            onClick: (event) => event.stopPropagation(),
                            style: {
                              flex: '0 0 auto',
                              fontSize: '11px',
                              lineHeight: '18px',
                              padding: '1px 7px',
                              borderRadius: '999px',
                              textDecoration: 'none',
                              color: 'var(--dsw-alias-label-primary)',
                              background: 'var(--dsw-alias-interactive-bg-hover)',
                              border: '0.5px solid var(--dsw-alias-border-l3)',
                            },
                          }, '下载')
                        : null,

                      /* 没装但是系统自带（或没有确认过官方页）→ 只给一个不可点的提示 */
                      !installed && !showDownload
                        ? React.createElement('span', {
                            key: 'miss',
                            title: choice.system ? '操作系统自带，通常已随系统安装' : '本机未安装',
                            style: {
                              flex: '0 0 auto',
                              fontSize: '11px',
                              lineHeight: '18px',
                              padding: '1px 7px',
                              borderRadius: '999px',
                              color: 'var(--dsw-alias-label-tertiary)',
                              border: '0.5px dashed var(--dsw-alias-border-l3)',
                            },
                          }, choice.system ? '系统自带' : '未安装')
                        : null,
                    ])
                  }))
                : null,

              /* 不再提供手输框：自定义族名统一走「浏览本机字体…」，
                 避免同一个名字有两种输入途径、状态各自为政。 */
              React.createElement(
                'button',
                {
                  key: 'browse',
                  type: 'button',
                  style: { ...buttonStyle, minWidth: 0, width: '100%' },
                  onClick: () => onBrowse('cjk'),
                },
                pickerOpen && pickerFor === 'cjk' ? '收起字体列表' : '浏览本机字体…',
              ),
            ]),
          ]),

          pickerOpen && pickerFor === 'cjk' ? renderFontPicker() : null,
        ]),
      )

      /* 英文字体：和代码字体一样是独立一项。
         合成栈时拉丁字体排在中文字体**前面**，这样字母/数字命中它，
         汉字因为它没有字形而回落到界面字体。 */
      rows.push(
        React.createElement('div', { key: 'latin', style: { ...rowStyle, flexDirection: 'column' } }, [
          React.createElement('div', { key: 'head', style: { display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' } }, [
            React.createElement('span', { key: 'l', style: { flex: '1 1 auto', minWidth: '0' } }, [
              React.createElement('span', { key: 't', style: labelStyle }, '英文字体'),
              React.createElement('span', { key: 'h', style: hintStyle }, '只作用于拉丁字母与数字；汉字仍用上面的中文字体。留空则不区分。'),
            ]),
            React.createElement('span', { key: 'c', style: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 auto' } }, [
              React.createElement('input', {
                key: 'i',
                type: 'text',
                'aria-label': '英文字体',
                placeholder: '例如 Segoe UI / Inter',
                value: draftLatin,
                style: controlStyle,
                onChange: (event) => setDraftLatin(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') confirmAll()
                },
              }),
              React.createElement(
                'button',
                {
                  key: 'browse',
                  type: 'button',
                  style: { ...buttonStyle, minWidth: controlStyle.minWidth },
                  onClick: () => onBrowse('latin'),
                },
                pickerOpen && pickerFor === 'latin' ? '收起字体列表' : '浏览本机字体…',
              ),
            ]),
          ]),

          // 面板渲染在**自己这一行**下方：谁被点开就长在谁下面
          pickerOpen && pickerFor === 'latin' ? renderFontPicker() : null,
        ]),
      )

      /* 预览不再单独占一行：它被并进底部吸底卡片，和确认按钮待在同一个框里，
         这样滚动时"看效果"和"确认"始终在同一处，不用上下找。 */

      /* 代码字体：与英文字体同构 —— 输入框 + 「浏览本机字体…」，
         点开时列表就展开在自己这一行下方。 */
      rows.push(
        React.createElement('div', { key: 'code', style: { ...rowStyle, flexDirection: 'column' } }, [
          React.createElement('div', { key: 'head', style: { display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' } }, [
            React.createElement('span', { key: 'l', style: { flex: '1 1 auto', minWidth: '0' } }, [
              React.createElement('span', { key: 't', style: labelStyle }, '代码字体'),
              React.createElement('span', { key: 'h', style: hintStyle }, '代码块 / 终端 / 行号的等宽字体。留空用应用自带栈。'),
            ]),
            React.createElement('span', { key: 'c', style: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 auto' } }, [
              React.createElement('input', {
                key: 'i',
                type: 'text',
                'aria-label': '代码字体',
                placeholder: '例如 Consolas',
                value: draftCode,
                style: controlStyle,
                onChange: (event) => setDraftCode(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') confirmAll()
                },
              }),
              React.createElement(
                'button',
                {
                  key: 'browse',
                  type: 'button',
                  style: { ...buttonStyle, minWidth: controlStyle.minWidth },
                  onClick: () => onBrowse('code'),
                },
                pickerOpen && pickerFor === 'code' ? '收起字体列表' : '浏览本机字体…',
              ),
            ]),
          ]),

          pickerOpen && pickerFor === 'code' ? renderFontPicker() : null,
        ]),
      )

      /* ---------- 字号：正文 / 代码 并排一行，中间一条竖线分隔 ----------
         两者都是"字号"这一件事，各占一行太松散；并排后左对齐关系也更直观。
         每格内部是「标签 + 输入框」竖排，竖线用 alignSelf:stretch 撑满行高。 */
      const sizeField = (key, label, hint, ariaLabel, placeholder, value, onChange) =>
        React.createElement('div', {
          key,
          style: { flex: '1 1 0', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' },
        }, [
          React.createElement('span', { key: 'l' }, [
            React.createElement('span', { key: 't', style: labelStyle }, label),
            React.createElement('span', { key: 'h', style: hintStyle }, hint),
          ]),
          React.createElement('input', {
            key: 'i',
            type: 'text',
            inputMode: 'numeric',
            'aria-label': ariaLabel,
            placeholder,
            value,
            style: { ...controlStyle, minWidth: '0', width: '100%' },
            onChange,
            onKeyDown: (event) => {
              if (event.key === 'Enter') confirmAll()
            },
          }),
        ])

      rows.push(
        React.createElement('div', { key: 'sizes', style: { ...rowStyle, alignItems: 'stretch', gap: '16px' } }, [
          sizeField('bodySize', '正文字号', '留空交给「通用 → 字号大小」', '正文字号', '例如 15', draftSize,
            (event) => setDraftSize(event.target.value)),
          React.createElement('div', {
            key: 'divider',
            'aria-hidden': true,
            style: { flex: '0 0 auto', width: '0.5px', alignSelf: 'stretch', background: 'var(--dsw-alias-border-l2)' },
          }),
          sizeField('codeSize', '代码字号', '留空用应用自带字号', '代码字号', '例如 13', draftCodeSize,
            (event) => setDraftCodeSize(event.target.value)),
        ]),
      )

      /* ---------- 排版四项（滑块）----------
          只作用于正文 Markdown 区，不碰设置界面自己的文字（见 applyNow 里的
         [class*="_markdown"] 选择器）。滑块拖到最左（0）即"不覆盖"。 */
      for (const metric of METRICS) {
        const value = metrics[metric.key] || 0
        const sliderId = 'fp-metric-' + metric.key
        rows.push(
          React.createElement('div', { key: metric.key, style: { ...rowStyle, flexDirection: 'column', gap: '6px' } }, [
            React.createElement('div', { key: 'head', style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', width: '100%' } }, [
              React.createElement('span', { key: 'l', style: { flex: '1 1 auto', minWidth: '0' } }, [
                React.createElement('label', { key: 't', htmlFor: sliderId, style: { ...labelStyle, cursor: 'pointer' } }, metric.label),
                React.createElement('span', { key: 'h', style: hintStyle }, metric.hint),
              ]),
              React.createElement('span', {
                key: 'v',
                style: {
                  flex: '0 0 auto',
                  fontSize: '13px',
                  fontVariantNumeric: 'tabular-nums',
                  color: value > 0 ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-tertiary)',
                },
              }, value > 0 ? `${value}${metric.unit}` : '默认'),
            ]),
            React.createElement('input', {
              key: 's',
              id: sliderId,
              type: 'range',
              min: metric.min,
              max: metric.max,
              step: metric.step,
              value,
              'aria-label': metric.label,
              style: { width: '100%', accentColor: 'var(--dsw-alias-state-business-primary, auto)', cursor: 'pointer' },
              onChange: (event) => {
                const next = Number(event.target.value)
                setMetrics((prev) => ({ ...prev, [metric.key]: Number.isFinite(next) ? next : 0 }))
              },
            }),
          ]),
        )
      }

      /* ---------- 吸底操作栏 ----------
         设置项还会继续增加，操作栏必须始终可见，不能让人滚半天才找到「确认」。
         用 position: sticky + bottom: 0 贴住设置面板可视区底部。

         造型跟「预览」那一块保持一致：圆角 + 细描边 + 面板底色。
         之前是一条通栏加顶部细线，左右两端直抵面板边缘，看着像被切断的横条；
         做成卡片后四个角都是圆的，跟其它块统一。

         背景仍带一点透明度并叠 backdrop-filter：滚动时后面的行会从卡片下
         掠过，纯实色会因为底色差一点点而显出接缝，半透明能把背景色吸收掉。 */
      /* 两层结构：外层负责"吸底 + 自动下压"，内层是视觉上的圆角卡片。
         不能只写一层 —— marginTop:auto（内容短时压到底）与 margin 简写（留间距）
         会互相覆盖，分成两层才两者兼得。 */
      /* ---------- 底部渐隐 + 操作卡片（两层） ----------
         外层负责三件事，都跟"整段过渡"有关：
           1. position: sticky + bottom: 0 —— 贴住设置面板可视区底边；
           2. paddingTop 34px —— 这段高度专门留给渐隐，内容滚到这里逐渐消失；
           3. 自身背景就是那条渐变 —— 从顶部全透明，到面板底色收尾。
         这样渐隐是从**面板最边缘**一路过渡到卡片上方，而不是卡片上缘贴一条窄带；
         卡片落在渐变的不透明段上，边界清晰。

         不能只写一层：marginTop:auto（内容短时压到底）与 margin 简写会互相覆盖。 */
      const footer = React.createElement('div', {
        key: 'actions',
        style: {
          position: 'sticky',
          bottom: 0,
          zIndex: 3,
          flexShrink: 0,
          marginTop: 'auto',
          boxSizing: 'border-box',
          paddingTop: '34px',
          /* 卡片下方的留白：22px → 11px，让框整体下移到原来剩余空隙的一半位置。
             这段高度同时也是底部渐隐的收尾区，所以别设成 0 —— 否则淡出会被截断。 */
          paddingBottom: '11px',
          /* 一条渐变负责整段过渡，两端都淡到透明：
               0%  透明        内容从这里开始被"吃掉"
               ~26% 半实       压在卡片上缘
               ~72% 接近实色   卡片下缘
               100% 透明       底边淡回去，不留硬边
             之前底边停在 96% 就结束，下面没有绘制，于是出现一道清晰水平线。
             颜色全部来自运行时采样的面板底色，浅色/深色/第三方主题都能自动吻合。 */
          background: `linear-gradient(to bottom, transparent 0%, color-mix(in srgb, ${panelColor} 62%, transparent) 26%, color-mix(in srgb, ${panelColor} 96%, transparent) 72%, transparent 100%)`,
        },
      }, React.createElement('div', {
        key: 'card',
        style: {
          boxSizing: 'border-box',
          /* 合并后是竖向：上半预览、下半按钮行 */
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '12px 14px',
          border: '0.5px solid var(--dsw-alias-border-l2)',
          borderRadius: 'var(--dsw-radius-lg)',
          background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1) 92%, transparent)',
          backdropFilter: 'var(--dsw-menu-backdrop-filter, blur(20px) saturate(150%))',
          WebkitBackdropFilter: 'var(--dsw-menu-backdrop-filter, blur(20px) saturate(150%))',
        },
      }, [
        /* ---------- 总预览 ----------
           不只是字体：字距 / 行距 / 段距 / 首行缩进全部按**草稿**渲染，
           所以确认前看到的就接近真实效果。
           行高基准与应用一致（24px + 字号增量），再叠加草稿里的行距增量，
           这样"改字号 → 行高跟着变"的关系在预览里也成立。

           高度可拖动、可隐藏：字号和行距调大时预览会顶得很高，
           所以给它一个 maxHeight + 滚动，以及顶层的一条拖动条。 */
        React.createElement('div', {
          key: 'resizer',
          title: '拖动调整预览高度',
          'aria-label': '拖动调整预览高度',
          role: 'separator',
          'aria-orientation': 'horizontal',
          onMouseDown: startPreviewResize,
          style: {
            /* 负边距抵消卡片 padding，让拖动条贴住卡片上缘 */
            margin: '-12px -14px 8px',
            height: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'ns-resize',
            flexShrink: 0,
          },
        }, React.createElement('div', {
          key: 'grip',
          style: {
            width: '36px',
            height: '3px',
            borderRadius: '999px',
            background: 'var(--dsw-alias-border-l3)',
          },
        })),

        React.createElement('div', {
          key: 'previewHead',
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
        }, [
          React.createElement('span', {
            key: 'label',
            style: {
              fontSize: '11px',
              lineHeight: '16px',
              letterSpacing: '0.08em',
              color: 'var(--dsw-alias-label-tertiary)',
            },
          }, previewPref.hidden ? '总预览（已隐藏）' : '总预览'),
          React.createElement('button', {
            key: 'toggle',
            type: 'button',
            onClick: () => persistPreviewPref({ ...previewPref, hidden: !previewPref.hidden }),
            style: {
              font: 'inherit',
              fontSize: '11px',
              lineHeight: '16px',
              padding: '0 4px',
              border: 'none',
              background: 'transparent',
              color: 'var(--dsw-alias-label-tertiary)',
              cursor: 'pointer',
            },
          }, previewPref.hidden ? '显示' : '隐藏'),
        ]),

        previewPref.hidden ? null : React.createElement('div', {
          key: 'preview',
          style: {
            display: 'flex',
            flexDirection: 'column',
            /* 超出用户设定的高度就在内部滚动，不再把卡片顶高 */
            maxHeight: `${previewPref.height}px`,
            overflowY: 'auto',
            fontFamily: buildUiStack(draftLatin, draft) || APP_FALLBACK_STACK,
            letterSpacing: metrics.letterSpacing > 0 ? `${metrics.letterSpacing}px` : undefined,
            color: 'var(--dsw-alias-label-primary)',
          },
        }, [
          ...previewParagraphs.map((text, index) => React.createElement('p', {
            key: 'p' + index,
            style: {
              margin: 0,
              marginTop: index === 0 ? 0 : `${metrics.paragraphSpacing}px`,
              lineHeight: `${previewLineHeight}px`,
              textIndent: metrics.firstLineIndent > 0 ? `${metrics.firstLineIndent}em` : undefined,
              /* 跟草稿字号走，而不是写死 —— 两段用同一字号，只有颜色区分主次 */
              fontSize: `${previewFontSize}px`,
              color: index === 0 ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
            },
          }, text)),

          /* 代码样张：验证「代码字体 / 代码字号」。
             字距、行距、段距、缩进**不套用** —— 那四项只作用于正文段落（MD p），
             套到代码上会让预览失真。 */
          React.createElement('pre', {
            key: 'code',
            style: {
              margin: 0,
              marginTop: '10px',
              padding: '8px 10px',
              borderRadius: 'var(--dsw-radius-md)',
              background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent)',
              fontFamily: stackFor(draftCode, APP_CODE_FALLBACK_STACK),
              fontSize: `${previewCodeFontSize}px`,
              lineHeight: `${previewCodeLineHeight}px`,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              color: 'var(--dsw-alias-label-primary)',
            },
          }, previewCodeSample),
        ]),

        /* 按钮行：和预览之间用一条细线分开 */
        React.createElement('div', {
          key: 'actionRow',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderTop: '0.5px solid var(--dsw-alias-border-l2)',
            paddingTop: '10px',
          },
        }, [
        // 左：待应用提示
        React.createElement('span', {
          key: 'hint',
          style: {
            fontSize: '12px',
            lineHeight: '18px',
            minWidth: '0',
            color: hasChanges ? 'var(--dsw-alias-state-warn-primary, #b26a00)' : 'var(--dsw-alias-label-tertiary)',
          },
        }, hasChanges ? '有未应用的改动，点右侧「确认应用」后生效' : '当前已与已保存的设置一致'),

        // 右：恢复默认（只重置草稿）+ 确认应用
        React.createElement('span', { key: 'btns', style: { display: 'flex', gap: '8px', flex: '0 0 auto' } }, [
          React.createElement(
            'button',
            { key: 'reset', type: 'button', style: buttonStyle, onClick: resetDrafts },
            '恢复默认',
          ),
          React.createElement(
            'button',
            {
              key: 'confirm',
              type: 'button',
              disabled: !hasChanges,
              onClick: confirmAll,
              style: {
                ...buttonStyle,
                fontWeight: 600,
                color: hasChanges ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-tertiary)',
                background: hasChanges
                  ? 'var(--dsw-alias-state-business-tertiary, var(--dsw-alias-interactive-bg-hover))'
                  : 'var(--dsw-alias-interactive-bg-hover)',
                borderColor: hasChanges
                  ? 'var(--dsw-alias-state-business-primary, var(--dsw-alias-border-l3))'
                  : 'var(--dsw-alias-border-l3)',
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                opacity: hasChanges ? 1 : 0.6,
              },
            },
            '确认应用',
          ),
        ]),
      ]),
      ]),
      )

      /* 持久化状态条：把"能不能存进去"变成页面上看得见的一行。
         排查写入失败时靠的就是这一行——没有它，写入失败是完全静默的。
         状态来自表单快照的真实 status（ready / loading / unavailable），
         不是"拿到了 form 对象"就算成功（lazy view 永远拿得到）。 */
      const status = snapshot.formStatus
      const statusReady = status === 'settingsScope' || /:(ready|saved)$/.test(status) || status === 'ready' || status === 'saved'
      const statusText = statusReady
        ? (/:saved$/.test(status) ? '已保存到当前 profile ✓' : '设置会保存到当前 profile（跨重启保留）')
        : status === 'pending'
          ? '正在连接设置服务…'
          : /:refused$/.test(status)
            ? '⚠ 宿主拒绝了写入：字段未标 volatile（需重启应用加载新 schema）'
            : /:error$/.test(status)
              ? '⚠ 写入报错（详情见 data-dsh-font-override-errors）'
              : '⚠ 设置服务未就绪，改动只在本次会话生效（诊断：' + status + '）'

      return React.createElement(
        'div',
        {
          className: 'font-probe-settings',
          ref: rootRef,
          style: {
            width: '100%',
            maxWidth: '720px',
            /* 撑满可视高度，短内容时靠 footer 的 margin-top:auto 把操作栏压到底部 */
            minHeight: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        },
        [
          React.createElement('h3', { key: 'h', style: { margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '文字显示设置'),
          React.createElement('p', { key: 'i', style: { margin: '0 0 8px', fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)' } }, '字体、字号与排版。改动先作为草稿预览，点底部「确认应用」后生效并写回 profile。'),
          React.createElement(
            'p',
            {
              key: 'status',
              style: {
                margin: '0 0 12px',
                fontSize: '12px',
                lineHeight: '18px',
                color: statusReady ? 'var(--dsw-alias-label-tertiary)' : 'var(--dsw-alias-state-warn-primary, #b26a00)',
              },
            },
            statusText,
          ),
          // 诊断行只在真出问题时出现：正常状态下面板保持干净，
          // 一旦未就绪或有错误就把它摊出来（排查时不用开控制台）。
          (statusReady && snapshot.debugInfo.indexOf('errors=') === -1)
            ? null
            : React.createElement(
                'code',
                {
                  key: 'debug',
                  style: {
                    display: 'block',
                    margin: '0 0 12px',
                    fontSize: '11px',
                    lineHeight: '16px',
                    color: 'var(--dsw-alias-label-tertiary)',
                    fontFamily: 'var(--ds-font-family-code)',
                    wordBreak: 'break-all',
                  },
                },
                '诊断 / ' + status + ' / ' + String(snapshot.debugInfo || ''),
              ),
          ...rows,
          footer,
        ],
      )
    }


    /**
     * 一次性回落：新行 chat-simple 从没存过字体设置时，把旧「文字显示设置」的值
     * 读进来当初始值，并立刻写进新行 —— 之后不再依赖旧行。
     *
     * 两条来源，按可靠性排：
     *   ① 宿主路由 /chat-simple/legacy-font —— 直接读 profile 的 YAML。**不要求旧
     *      插件还挂载着**，所以"停用旧插件 + 启用新插件"这一趟重启里照样能迁。
     *   ② configForms 的旧行 font-probe —— 旧插件还在时的活路径。
     * 为什么必须有 ①：configForms 的表单是从**条目**的 Config 投射的，旧行一旦从
     * 活树里摘掉就读不到了；只靠 ② 的话，用户的 Arial / 17px 会在升级当场静默回默认。
     *
     * 判据是"新命名空间里九项全等于默认值"；用户真把九项都留空时这次回落是空操作，无害。
     */
    let migratedFromLegacy = false
    /**
     * 新行是否"还没存过东西"。
     * ⚠️ 这条判据**不能省**：少了它，每次启动都会拿旧行的值盖掉新行 —— 用户在
     * 新插件里改过字体之后，旧行仍是老值，于是改动在下次启动被静默回滚。
     * 读的是 "state"：bindForm → syncFromForm 已经先把新行的值灌进来了。
     */
    function newRowLooksUnset() {
      return Object.keys(DEFAULTS).every((k) => {
        const v = state[k]
        return v === undefined || v === null || v === '' || v === DEFAULTS[k]
      })
    }
    function legacyValueUsable(v) {
      if (!v || typeof v !== 'object') return false
      return Object.keys(DEFAULTS).some((k) => typeof v[k] === 'string' && v[k] !== '' && v[k] !== DEFAULTS[k])
    }
    function adoptLegacyValues(legacy, where) {
      migratedFromLegacy = true
      for (const k of Object.keys(DEFAULTS)) {
        if (typeof legacy[k] === 'string' && legacy[k] !== '') state[k] = legacy[k]
      }
      applyNow()
      note('migrate', new Error('已从旧「文字显示设置」(' + where + ') 迁入现有字体设置'))
      persistNow()
      return true
    }
    function migrateFromLegacyForm(forms) {
      if (migratedFromLegacy || !newRowLooksUnset()) return false
      for (const ns of MIGRATION_NAMESPACES) {
        let legacy = null
        try {
          const c = forms && typeof forms.get === 'function' ? forms.get(ns) : null
          if (!c || typeof c.getSnapshot !== 'function') continue
          const snap = c.getSnapshot()
          if (!snap || snap.status !== 'ready' || !snap.value) continue
          legacy = snap.value
        } catch (error) { continue }
        if (legacyValueUsable(legacy)) return adoptLegacyValues(legacy, 'configForms')
      }
      return false
    }
    /** 来源 ①：问宿主要 profile 里的旧行。返回 Promise<boolean>（拿到并采纳）。 */
    async function migrateFromLegacyRoute(fetchLegacy) {
      if (migratedFromLegacy || !newRowLooksUnset() || typeof fetchLegacy !== 'function') return false
      let legacy = null
      try { legacy = await fetchLegacy() } catch (error) { return false }
      if (legacyValueUsable(legacy)) return adoptLegacyValues(legacy, 'legacy-font route')
      return false
    }

    /* ---------- 插件入口 ----------
       实测教训（务必保留这段注释）：
       第一版 `dsh.client.inject` 是空数组、apply 里又无条件把 applied 置 true，
       结果 bundle 在 `slots` 服务安装**之前**就加载了，`ctx.get('slots')` 拿到
       undefined，而 applied 已被置 true 再也不会重试 —— 字体本身不需要任何服务
       所以一直正常，设置页却静默地从未注册（槽位 occupants 里查不到）。
       修法：字体立即应用；槽位注册改为**等 slots 就绪再注册**，而不是指望
       加载顺序（`dsh.client.inject` 的改动还要重启才生效，这个重试不用）。 */
    let registered = false
    let disposed = false
    let disposeSection = null

    /** 两种取法都试：注入属性拼写，再 ctx.get。取不到返回 undefined，不抛。 */
    function getSlots(ctx) {
      try {
        const direct = ctx.slots
        if (direct !== undefined && direct !== null && typeof direct.inject === 'function') return direct
      } catch (error) { /* 服务尚未安装 */ }
      try {
        const viaGet = ctx.get('slots')
        if (viaGet !== undefined && viaGet !== null && typeof viaGet.inject === 'function') return viaGet
      } catch (error) { /* 服务尚未安装 */ }
      return undefined
    }

    function registerSectionWhenReady(ctx, attempt) {
      if (disposed || registered) return

      const slots = getSlots(ctx)
      if (slots === undefined) {
        // 服务还没装好：有界重试（最多 ~30 秒），绝不静默放弃。
        if (attempt < 120) {
          const timer = setTimeout(() => registerSectionWhenReady(ctx, attempt + 1), 250)
          if (timer && typeof timer.unref === 'function') timer.unref()
        } else {
          note('slots', new Error('等待 slots 服务超时；设置页未注册（字体不受影响）'))
        }
        return
      }

      try {
        disposeSection = slots.inject('settings.section', () =>
          slots.register(
            { name: 'settings.section', id: 'font-probe', order: 36, label: '文字显示设置' },
            FontSettingsPage,
          ),
        )
        registered = true
        try { document.documentElement.setAttribute('data-dsh-font-override-section', 'registered') } catch (e) { /* no DOM */ }
      } catch (error) {
        note('slots.inject', error)
      }
    }

    /* ═════════ chat-simple 合并层（字体半边）═════════
       替换了原 dsh-font-probe 的 return { inject, apply }：
         · 不再自己注册 settings.section（合并后的「聊天设置」统一注册）
         · apply 的其余行为逐字保留（字体立即生效 + 有界重试绑定 configForms）
         · 额外：绑定成功后若新行还没存过东西，从旧 font-probe 行回落一次
    */
    function chatSimpleAttachFont(ctx, extra) {
      if (disposed) return

      // 字体：不依赖任何服务，立即生效（重复调用也只是幂等重设）。
      applyNow()

      if (!bound) {
        bound = true
        bindFormWhenReady(ctx, 0)

        ctx.effect(() => {
          return () => {
            disposed = true
            bound = false
            if (bindTimer !== null) { try { clearTimeout(bindTimer) } catch (error) { /* no timer */ } }
            bindTimer = null
            try { if (typeof disposeSection === 'function') disposeSection() } catch (error) { /* already gone */ }
            disposeSection = null
            registered = false
            try { if (typeof formUnsubscribe === 'function') formUnsubscribe() } catch (error) { /* already gone */ }
            formUnsubscribe = null
            form = null
            dirty = false
            try { if (typeof sheetDispose === 'function') sheetDispose() } catch (error) { /* already gone */ }
            sheetDispose = null
            if (sheetElement && typeof sheetElement.remove === 'function') {
              try { sheetElement.remove() } catch (error) { /* already gone */ }
            }
            sheetElement = null
            sheetMode = null
          }
        }, 'chat-simple: font cleanup')
      }

      // 旧行回落（configForms 可能还没就绪；就绪前 migrateFromLegacyForm 自己会跳过）
      try {
        let forms
        try { forms = ctx.configForms } catch (e) { forms = undefined }
        if (!forms) { try { forms = ctx.get('configForms') } catch (e) { forms = undefined } }
        if (forms && typeof forms.get === 'function') migrateFromLegacyForm(forms)
      } catch (error) { /* 回落是增强，失败不影响字体本身 */ }

      // 来源 ①（宿主路由，读 profile YAML）：旧插件停用后也照样能迁。
      // 延后一拍，等宿主 webServer 把 /legacy-font 挂出来再问。
      const fetchLegacy = extra && typeof extra.fetchLegacy === 'function' ? extra.fetchLegacy : null
      if (fetchLegacy) {
        try { setTimeout(() => { migrateFromLegacyRoute(fetchLegacy).catch(() => {}) }, 0) }
        catch (error) { /* 同上 */ }
      }
    }

    return { attach: chatSimpleAttachFont, Page: FontSettingsPage };
  }

		/* ── 装配 ───────────────────────────────────────────────────────────── */
		const avatarHalf = createAvatarHalf();
		const fontHalf = createFontHalf(require);
		const t = avatarHalf.t;
		const ChatSettingsSection = createTabbedSection(avatarHalf, fontHalf, t);

		const inject = ["slots"];

		function apply(ctx) {
			// 两半各自原有的 apply 行为逐字保留（头像层 + 字体应用 + 各自的持久化绑定）
			// 一半失败不连累另一半。
			try { avatarHalf.attach(ctx); } catch { /* 半边失败 */ }
			// 把头像半边的 fetch 借给字体半边做文件级回落（来源 ①）
			const fetchLegacy = (typeof avatarHalf.legacyFontFetch === 'function') ? avatarHalf.legacyFontFetch : null
			try { fontHalf.attach(ctx, fetchLegacy ? { fetchLegacy } : undefined); } catch { /* 半边失败 */ }

			// 唯一的设置分区：「聊天设置」
			const slots = (function () {
				try { if (ctx.slots && typeof ctx.slots.inject === "function") return ctx.slots; } catch { /* 未装好 */ }
				try { const s = ctx.get("slots"); if (s && typeof s.inject === "function") return s; } catch { /* 未装好 */ }
				return null;
			})();
			if (slots) {
				try {
					slots.inject("settings.section", () =>
						slots.register(
							{ name: "settings.section", id: "chat-simple", order: 40, label: () => t("聊天设置") },
							() => React.createElement(ChatSettingsSection),
						),
					);
				} catch { /* 注册失败 = 侧栏没这一项，两半功能本身照常 */ }
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
