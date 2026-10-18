# Upstream notices

`dsh-chat-simple` merges code from two MIT-licensed projects. Each is MIT, so the
combined work may be redistributed under the same terms, provided the upstream
copyright notices travel with it — that is what this file is for. It is referenced
from `README.md` and shipped in the published package.

---

## 1. dsh-font-probe — the「文字显示」section

> MIT License
> Copyright (c) 2026 dsh-font-probe contributors

**What was taken:** the entire text-display implementation — the `createFontHalf`
closure in `lib/client.js` (font-token application, the settings form binding,
the preview panel, the system-font picker) and the `Config` schema in
`lib/index.js`.

**What was changed:**

- The settings namespace / profile row id moved from `font-probe` to `chat-simple`.
  Because that plugin's own docs note that "renaming it orphans any persisted
  config", a one-time fallback read of the legacy `font-probe` row was added
  (`migrateFromLegacyForm`), which seeds the new row from the old one and re-saves.
- Its own `settings.section` registration was removed; the merged「聊天设置」
  section renders it inside a tab instead.
- Its `return { inject, apply }` entry became an `attach(ctx)` called by the
  merged module, with the same body.

---

## 2. dsh-plugin-wallpaper-engine — the「会话头像」section

> MIT License
> Copyright (c) 2026 elysia395
> https://github.com/elysia395/dsh-wallpaper-engine

**What was taken:** the session-avatar implementation — the `createAvatarHalf`
closure in `lib/client.js` (the DOM decoration layer, the avatar import path, the
settings panel, the injected stylesheet) plus `lib/routes/avatar.js` and
`lib/http-body.js`.

**What was changed:**

- Route base `/session-avatar` → `/chat-simple`; data directory
  `~/.dsh-session-avatar` → `~/.dsh-chat-simple`, with a read-only fallback to the
  legacy directories so previously imported avatars keep working.
- The injected CSS/attribute prefix `we-` → `sa-` (it originated as `we-` for
  "Wallpaper Engine"; `sa-` avoids colliding with that plugin if both are installed).
- Its own `settings.section` registration was removed; the merged section renders
  it inside a tab.

---

Neither upstream endorsed this derivative work.
