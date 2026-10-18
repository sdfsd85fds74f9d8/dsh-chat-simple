/**
 * dsh-chat-simple — 宿主半边。
 *
 * 合并自两个插件，各自的行为逐字保留，只换了持久化坐标：
 *
 *   1. 「文字显示」—— 导出 `Config`（九个 volatile 字段）。DSH 读 loader 条目的
 *      `Config` 投射出设置表单，客户端再按**行 id 命名空间**写回 profile。
 *      行 id 从 `font-probe` 变成 `chat-simple`，而旧值存在旧行里，所以客户端
 *      带一次性回落读（见 lib/client.js 的 migrateFromLegacyForm）。
 *   2. 「会话头像」—— 两条同源 HTTP 路由：设置读写 + 两张头像图。
 *      数据目录换成 `~/.dsh-chat-simple`，并**回落读**旧目录
 *      （`~/.dsh-session-avatar` → `~/.dsh-wallpaper-engine`），于是用户导入过的
 *      头像与设置不会因为改名而消失。
 *
 * 稳定性取舍：`webServer` **不做硬依赖**（原壁纸插件是 `inject = ['webServer']`）。
 * 合并后这一行同时承载着字体设置，而字体不需要任何服务 —— 因为拿不到 webServer
 * 就把字体一起拖死，是不成比例的失败。这里改为**有界轮询**：webServer 挂好就注册
 * 路由；永远不出现则只有头像的持久化降级（客户端回落 localStorage），字体照常生效。
 */

import {
  existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync,
  writeFileSync, openSync, closeSync, fsyncSync, renameSync, createReadStream,
} from 'node:fs';
import { writeFile as writeFileP, rename as renameP, unlink as unlinkP } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

import { registerAvatarRoutes } from './routes/avatar.js';

const BASE = '/chat-simple';
const PLUGIN_NAME = 'chat-simple';
/** profile 行 id = 设置表单的命名空间。改名会孤立已存配置，务必稳定。 */
export const SETTINGS_ENTRY = 'chat-simple';

/* ══════════════════════════════════════════════════════════════════════════
 * 1. 「文字显示」的 Config —— 逐字沿用 dsh-font-probe 的宿主半边
 * ══════════════════════════════════════════════════════════════════════════ */

/** 与客户端半体的默认值保持一致。 */
export const FIELD_DEFAULTS = {
  fontFamily: '',
  latinFontFamily: '',
  fontSize: '',
  codeFontFamily: '',
  codeFontSize: '',
  /* 排版四项。都存成字符串；空串或「0」都表示"不覆盖"。 */
  letterSpacing: '',
  lineHeight: '',
  paragraphSpacing: '',
  firstLineIndent: '',
};

/**
 * 候选解析锚点。`schemastery` 装在 **profile** 的 node_modules 里，不在插件自己的
 * 目录里，所以 `createRequire(import.meta.url)` 解析不到它（实测：Config 变成
 * undefined）。按"最可能命中"的顺序收集锚点。
 */
function configRequireAnchors() {
  const anchors = [];
  const push = (value) => {
    if (typeof value !== 'string' || value.length === 0) return;
    const norm = value.replace(/[\\/]+$/, '');
    if (!anchors.includes(norm)) anchors.push(norm);
  };

  for (const value of [process.argv0, ...(process.argv || [])]) {
    if (typeof value !== 'string') continue;
    const hit = /[\\/]profiles[\\/][^\\/]+/.exec(value);
    if (hit !== null) push(value.slice(0, hit.index + hit[0].length));
  }

  push(process.env.DSH_PROFILE_DIR);

  const selfDir = fileURLToPath(new URL('.', import.meta.url));
  const selfHit = /[\\/]profiles[\\/][^\\/]+/.exec(selfDir);
  if (selfHit !== null) push(selfDir.slice(0, selfHit.index + selfHit[0].length));

  push(selfDir);
  return anchors;
}

/**
 * 旧「文字显示设置」的已存值 —— **文件级**回落。
 *
 * 为什么不能只靠 configForms：那条路径要求 `font-probe` 行**仍在 loader 活树里**
 * （表单是从条目的 `Config` 投射出来的）。而用户的正常升级动作恰恰是"停用旧插件、
 * 启用新插件"—— 同一趟重启里旧行就没了，configForms 再也读不到，字体设置静默回到
 * 默认值。所以这里直接读 profile 的 YAML：不依赖旧插件是否挂载。
 *
 * 只读，绝不写：往 profile 写配置是 dsh-settings 的职权（且只认 volatile 字段），
 * 宿主自己改 cordis.*.yml 会绕过它的串行化与校验。
 *
 * @returns {null | Record<string,string>} 九个字段里有任何非默认值时返回整份；否则 null
 */
const LEGACY_ROW_ID = 'font-probe';
function legacyFontSettings() {
  const files = [];
  for (const dir of configRequireAnchors()) files.push(join(dir, 'cordis.patch.yml'), join(dir, 'cordis.yml'));
  const seen = new Set();
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    const block = legacyRowBlock(text, LEGACY_ROW_ID);
    if (block === null) continue;
    const out = {};
    let touched = false;
    for (const key of Object.keys(FIELD_DEFAULTS)) {
      const raw = block[key];
      const value = typeof raw === 'string' && raw !== '' ? raw : FIELD_DEFAULTS[key];
      out[key] = value;
      if (value !== FIELD_DEFAULTS[key]) touched = true;
    }
    // 全等于默认 ⇒ 没有需要迁的东西（也别把"用户真的全留空"误判成待迁移）
    if (touched) return out;
  }
  return null;
}

/**
 * 从 YAML 文本里抠出 `- id: <rowId>` 那一行的 `config:` 映射。
 *
 * 手写解析而不是引 YAML 库：profile 里混着 `!!js` 自定义标签（`disabled: !!js >- ...`），
 * 通用 YAML 解析器会当场抛；而我们要的只是**一个已知行的九个标量**。
 * 缩进即边界：从 `config:` 起，收所有更深缩进的 `key: value`，遇到不更深缩进的行就停。
 */
function legacyRowBlock(text, rowId) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!new RegExp('^- id:\\s*[\'"]?' + rowId + '[\'"]?\\s*$').test(lines[i])) continue;
    // 往下找这一条 entry 的 config:（遇到下一个顶层 `- ` 就放弃：那是另一条 entry）
    for (let j = i + 1; j < lines.length; j++) {
      if (/^- /.test(lines[j])) break;
      const cm = /^(\s*)config:\s*$/.exec(lines[j]);
      if (!cm) continue;
      const indent = cm[1].length;
      const out = {};
      for (let k = j + 1; k < lines.length; k++) {
        const line = lines[k];
        if (line.trim() === '') continue;
        const lead = (line.match(/^\s*/) || [''])[0].length;
        if (lead <= indent) break;                      // 出栈：缩进不再更深
        const kv = /^\s*([\w-]+):\s*(.*)$/.exec(line);
        if (!kv) continue;
        let v = kv[2].trim();
        // 去掉一层引号；`''` / `""` 就是空串
        if (v.length >= 2 && (v[0] === "'" || v[0] === '"') && v[v.length - 1] === v[0]) {
          v = v.slice(1, -1).replace(/''/g, "'");
        }
        out[kv[1]] = v;
      }
      if (Object.keys(out).length > 0) return out;
    }
  }
  return null;
}

/**
 * 从宿主 realm 懒加载 schemastery。找不到就返回 undefined —— 那样条目投射不出
 * 设置表单，但字体覆盖本身照常工作（客户端用内存默认值）。这样"设置页没出来"
 * 不会连累"字体没生效"。
 */
function loadSchemaBuilder() {
  for (const anchor of configRequireAnchors()) {
    let req;
    try { req = createRequire(anchor + '/package.json'); } catch { continue; }
    for (const id of ['@deepseek-ai/schemastery', 'schemastery']) {
      try {
        const mod = req(id);
        const z = mod && mod.default ? mod.default : mod;
        if (z && typeof z.object === 'function' && typeof z.string === 'function') return z;
      } catch { /* 下一个候选 */ }
    }
  }
  return undefined;
}

/**
 * 构造一个可写字段。
 *
 * **`.volatile()` 是必需的，不是装饰。** `@deepseek-ai/dsh-settings` 的 `write()`
 * 开头就是 `const form = volatileForm(schema)`，非 volatile 一律抛 —— 表现是界面
 * 能改、立即生效，但 profile 永远不更新，而且错误被 remote 层吞掉。
 */
function buildConfig() {
  const z = loadSchemaBuilder();
  if (z === undefined) return undefined;
  const str = (fallback) => {
    let field = z.string();
    if (typeof field.default === 'function') field = field.default(fallback);
    if (typeof field.volatile === 'function') field = field.volatile();
    return field;
  };
  return z.object({
    fontFamily: str(FIELD_DEFAULTS.fontFamily),
    latinFontFamily: str(FIELD_DEFAULTS.latinFontFamily),
    fontSize: str(FIELD_DEFAULTS.fontSize),
    codeFontFamily: str(FIELD_DEFAULTS.codeFontFamily),
    codeFontSize: str(FIELD_DEFAULTS.codeFontSize),
    letterSpacing: str(FIELD_DEFAULTS.letterSpacing),
    lineHeight: str(FIELD_DEFAULTS.lineHeight),
    paragraphSpacing: str(FIELD_DEFAULTS.paragraphSpacing),
    firstLineIndent: str(FIELD_DEFAULTS.firstLineIndent),
  });
}

export const Config = buildConfig();

/* ══════════════════════════════════════════════════════════════════════════
 * 2. 「会话头像」的数据目录（新坐标 + 旧坐标回落）
 * ══════════════════════════════════════════════════════════════════════════ */

/** 新目录；`DSH_CHAT_SIMPLE_DATA_DIR` 可整体挪走（测试隔离用）。 */
function dataDir() {
  const override = process.env.DSH_CHAT_SIMPLE_DATA_DIR;
  if (override && override.trim()) return resolve(override.trim());
  return join(homedir(), '.dsh-chat-simple');
}
/**
 * 上一代插件留下的目录，按新→旧排。头像图与设置都只在**本目录为空**时才从这里读，
 * 于是改名不会让用户导入过的图凭空消失。
 */
function legacyDataDirs() {
  const out = [join(homedir(), '.dsh-session-avatar'), join(homedir(), '.dsh-wallpaper-engine')];
  const override = process.env.DSH_CHAT_SIMPLE_LEGACY_DIR;
  if (override && override.trim()) out.unshift(resolve(override.trim()));
  return out.filter((p) => { try { return statSync(p).isDirectory(); } catch { return false; } });
}

function configPath() { return join(dataDir(), 'config.json'); }

function readConfig() {
  for (const p of [configPath(), ...legacyDataDirs().map((d) => join(d, 'config.json'))]) {
    try {
      const o = JSON.parse(readFileSync(p, 'utf8'));
      if (o && typeof o === 'object' && o.settings && typeof o.settings === 'object') return o;
    } catch { /* 下一个候选 */ }
  }
  return {};
}

/** 原子整文件写：临时文件 + fsync + rename（断电只会留下旧的或新的，不会是半截的）。 */
function atomicWriteFileSync(filePath, data) {
  const tmp = filePath + '.tmp';
  let fd;
  try { fd = openSync(tmp, 'w'); } catch { try { mkdirSync(dirname(filePath), { recursive: true }); fd = openSync(tmp, 'w'); } catch { return; } }
  try { writeFileSync(fd, data); fsyncSync(fd); } finally { try { closeSync(fd); } catch { /* ignore */ } }
  try {
    renameSync(tmp, filePath);
  } catch {
    try { writeFileSync(filePath, data); } catch { /* ignore */ }
  }
}

let atomicTmpSeq = 0;
function atomicTmpPath(filePath) {
  atomicTmpSeq = (atomicTmpSeq + 1) % 1000000;
  return filePath + '.tmp' + process.pid + String(atomicTmpSeq).padStart(6, '0');
}
async function atomicWriteFileP(filePath, data) {
  const tmp = atomicTmpPath(filePath);
  await writeFileP(tmp, data);
  try {
    await renameP(tmp, filePath);
  } catch {
    try { await writeFileP(filePath, data); } finally {
      try { await unlinkP(tmp); } catch { /* ignore */ }
    }
  }
}

function writeConfig(cfg) {
  try {
    mkdirSync(dirname(configPath()), { recursive: true });
    atomicWriteFileSync(configPath(), JSON.stringify(cfg));
  } catch { /* ignore */ }
}

const SETTINGS_FIELD = 'settings';
// settings 的写是「读-改-写」三步，并发时后写者会吞掉先写者的改动 ⇒ 用 promise 链排队。
let configWriteQueue = Promise.resolve();
function enqueueConfigWrite(fn) {
  const p = configWriteQueue.then(fn, fn);
  configWriteQueue = p.then(() => {}, () => {});
  return p;
}
function readSettings() {
  const cfg = readConfig();
  const s = cfg[SETTINGS_FIELD];
  return s && typeof s === 'object' ? s : null;
}
function writeSettings(settings) {
  return enqueueConfigWrite(() => {
    // 只写这一族自己的键：readConfig() 可能来自**旧插件**的 config.json（壁纸引擎
    // 那份里有 fontSetId 与上百个无关设置键），整份抄过来会把它们带进新文件。
    writeConfig({ [SETTINGS_FIELD]: settings });
    return settings;
  });
}

/* ── 设置消毒（五个 avatar* 键，与客户端同一套判据）────────────────────────── */
const AVATAR_SIZE_MIN = 24, AVATAR_SIZE_MAX = 72;
const AVATAR_RADIUS_MIN = 0, AVATAR_RADIUS_MAX = 100;
const AVATAR_FILE_RE = /^(user|ai)-[a-z0-9]{4,16}\.(png|jpg|webp)$/;
const AVATAR_DEFAULTS = {
  avatarEnabled: false,
  avatarSize: 40,
  avatarRadius: 100,
  avatarUserImage: '',
  avatarAiImage: '',
};
function clampNum(v, lo, hi, def) {
  const n = typeof v === 'number' && isFinite(v) ? v : Number(v);
  if (!isFinite(n)) return def;
  return Math.min(hi, Math.max(lo, n));
}
function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    avatarEnabled: raw.avatarEnabled === true,
    avatarSize: clampNum(raw.avatarSize, AVATAR_SIZE_MIN, AVATAR_SIZE_MAX, AVATAR_DEFAULTS.avatarSize),
    avatarRadius: clampNum(raw.avatarRadius, AVATAR_RADIUS_MIN, AVATAR_RADIUS_MAX, AVATAR_DEFAULTS.avatarRadius),
    avatarUserImage: AVATAR_FILE_RE.test(String(raw.avatarUserImage || '')) ? String(raw.avatarUserImage) : '',
    avatarAiImage: AVATAR_FILE_RE.test(String(raw.avatarAiImage || '')) ? String(raw.avatarAiImage) : '',
  };
}

/* ── 头像目录 ─────────────────────────────────────────────────────────────── */
const AVATAR_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;
const AVATAR_SIDES = ['user', 'ai'];

const ensuredDirs = new Set();
function ensureDirOnce(dir) {
  if (!ensuredDirs.has(dir)) {
    try { mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
    ensuredDirs.add(dir);
  }
  return dir;
}
function avatarDir() { return ensureDirOnce(join(dataDir(), 'avatars')); }

/**
 * 某一方当前那张头像的绝对路径（没有则 null）。
 * 先看新目录，新目录没有再看旧目录 —— 旧图**不复制**，直接按旧路径服务，
 * 于是导入过的头像立刻可用，且不会有两份真源。下一次导入自然落在新目录。
 */
function avatarPath(side) {
  const s = String(side || '');
  if (!AVATAR_SIDES.includes(s)) return null;
  const dirs = [avatarDir(), ...legacyDataDirs().map((d) => join(d, 'avatars'))];
  for (const dir of dirs) {
    let entries = [];
    try { entries = readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (!AVATAR_FILE_RE.test(name) || name.slice(0, s.length + 1) !== s + '-') continue;
      const p = join(dir, name);
      try { if (statSync(p).isFile()) return p; } catch { /* 下一个 */ }
    }
  }
  return null;
}

/** 启动清扫：上一次进程被强杀留下的 `.tmp`（读取侧只认正式扩展名 ⇒ 不扫就是看不见的垃圾）。 */
function sweepAvatarTmp() {
  let names = [];
  try { names = readdirSync(avatarDir()); } catch { return; }
  const now = Date.now();
  for (const name of names) {
    if (!/\.tmp\d*$/.test(name)) continue;
    const p = join(avatarDir(), name);
    try { if (now - statSync(p).mtimeMs < 60 * 1000) continue; unlinkSync(p); } catch { /* ignore */ }
  }
}

function mimeFor(absPath) {
  const ext = absPath.slice(absPath.lastIndexOf('.') + 1).toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'application/octet-stream';
}

/** 静态发送（GET / HEAD）。头由调用点先写好，这里只负责把文件送出去。 */
function serveFile(absPath, req, res, headOnly) {
  if (!absPath || !existsSync(absPath)) {
    // 错误响应绝不能被缓存：缓存过 404 会让"导入后仍显示上次的 404"。
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 404; res.end('not found'); return;
  }
  const st = statSync(absPath);
  res.setHeader('Content-Type', mimeFor(absPath));
  res.setHeader('Content-Length', String(st.size));
  if (headOnly) { res.end(); return; }
  const stream = createReadStream(absPath);
  stream.on('error', () => { try { res.destroy(); } catch { /* ignore */ } });
  stream.pipe(res);
}

/* ── 请求体的两道保险（超时 + "写完应答再断"）─────────────────────────────── */
const BODY_IDLE_TIMEOUT_MS = 60 * 1000;
function armBodyIdleTimeout(req, onTimeout) {
  let timer = null;
  let fired = false;
  const disarm = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const arm = () => {
    if (fired) return;
    disarm();
    timer = setTimeout(() => {
      fired = true;
      try { onTimeout(); } catch { /* ignore */ }
      try { req.destroy(); } catch { /* ignore */ }
    }, BODY_IDLE_TIMEOUT_MS);
    if (typeof timer.unref === 'function') timer.unref();
  };
  req.on('data', arm);
  req.once('end', disarm);
  req.once('close', disarm);
  arm();
  return disarm;
}

const LINGER_MAX_MS = 5000;
function lingerClose(req, res) {
  let timer = null;
  let armed = false;
  const drop = () => {
    if (timer) { try { clearTimeout(timer); } catch { /* ignore */ } timer = null; }
    try { req.destroy(); } catch { /* ignore */ }
  };
  const armLinger = () => {
    if (armed) return;
    armed = true;
    timer = setTimeout(drop, LINGER_MAX_MS);
    if (typeof timer.unref === 'function') timer.unref();
  };
  const requestDrained = () => req.readableEnded === true || req.complete === true
    || req.destroyed === true || typeof req.once !== 'function';
  const responseFlushed = () => !res || typeof res.once !== 'function' || res.writableFinished === true;
  const dropWhenBothDone = () => {
    if (requestDrained() && responseFlushed()) { drop(); return; }
    if (!requestDrained()) {
      req.once('end', dropWhenBothDone);
      req.once('close', dropWhenBothDone);
    }
    if (!responseFlushed()) {
      res.once('finish', dropWhenBothDone);
      res.once('close', dropWhenBothDone);
    }
    armLinger();
  };
  dropWhenBothDone();
  if (!requestDrained()) { try { req.resume(); } catch { /* ignore */ } }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. 挂载
 * ══════════════════════════════════════════════════════════════════════════ */

/** 见文件头：webServer 不做硬依赖，改为有界轮询。 */
export const inject = [];

const WEBSERVER_POLL_MS = 250;
const WEBSERVER_POLL_MAX = 120; // ~30s

export function apply(ctx) {
  const disposers = [];
  let mounted = false;
  let poll = null;
  let disposed = false;

  const mountRoutes = (webServer) => {
    if (mounted) return;
    mounted = true;

    // 启动清扫（推迟一点，别挡插件树加载）。
    const sweepTimer = setTimeout(() => { try { sweepAvatarTmp(); } catch { /* ignore */ } }, 3000);
    if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
    disposers.push(() => { try { clearTimeout(sweepTimer); } catch { /* ignore */ } });

    // 3a. 两张头像图：POST 导入 / GET·HEAD 查看 / DELETE 清除。
    registerAvatarRoutes(webServer, {
      disposers, base: BASE, serveFile,
      avatarDir, avatarPath, AVATAR_SIDES, AVATAR_EXT, AVATAR_MAX_BYTES,
      atomicWriteFileP, armBodyIdleTimeout, lingerClose,
    });

    // 3a-bis. 文件级字体回落：客户端在 configForms 拿不到旧行时（旧插件已停用）
    //         从这里读一次。只读，不写。
    disposers.push(webServer.register({
      kind: 'exact',
      path: `${BASE}/legacy-font`,
      handler: (req, res) => {
        const method = (req.method || 'GET').toUpperCase();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        if (method !== 'GET' && method !== 'HEAD') { res.statusCode = 405; res.end('method not allowed'); return; }
        let settings = null;
        try { settings = legacyFontSettings(); } catch { settings = null; }
        res.end(JSON.stringify({ settings }));
      },
    }));

    // 3b. 设置读写：GET 返回持久化设置（从未存过则 null），PUT 存一份消毒后的副本。
    const SETTINGS_MAX_BYTES = 64 * 1024;
    disposers.push(webServer.register({
      kind: 'exact',
      path: `${BASE}/settings`,
      handler: (req, res) => {
        const method = (req.method || 'GET').toUpperCase();
        const json = (code, payload) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(payload));
        };
        if (method === 'GET') { json(200, { settings: readSettings() }); return; }
        if (method !== 'PUT') { res.statusCode = 405; res.end('method not allowed'); return; }

        let tooLarge = false;
        // 中途放弃（超限 / 超时）走同一处断开收口：应答先写，再排空、等刷完才断。
        const fail = (code, payload) => {
          if (tooLarge) return;
          tooLarge = true;
          json(code, payload);
          lingerClose(req, res);
        };
        armBodyIdleTimeout(req, () => fail(408, { error: 'request timeout' }));
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
          if (tooLarge) return;
          size += chunk.length;
          if (size > SETTINGS_MAX_BYTES) { fail(413, { error: 'settings payload too large' }); return; }
          chunks.push(chunk);
        });
        req.on('end', () => {
          if (tooLarge) return;
          const body = Buffer.concat(chunks).toString('utf8');
          let parsed;
          try { parsed = JSON.parse(body || '{}'); } catch { json(400, { error: 'invalid JSON body' }); return; }
          const sanitized = sanitizeSettings(parsed);
          if (!sanitized) { json(400, { error: 'settings must be a JSON object' }); return; }
          // 写已串行化，等写盘完成再应答，保持"响应即已持久化"的语义。
          writeSettings(sanitized).then(
            () => json(200, { ok: true, settings: sanitized }),
            () => json(500, { error: 'write failed' }),
          );
        });
        req.on('error', () => { if (!tooLarge) json(400, { error: 'request error' }); });
      },
    }));
  };

  const tryMount = (attempt) => {
    if (disposed || mounted) return;
    let webServer = null;
    try { webServer = ctx.webServer; } catch { webServer = null; }
    if (!webServer) { try { webServer = ctx.get('webServer'); } catch { webServer = null; } }
    if (webServer && typeof webServer.register === 'function') { mountRoutes(webServer); return; }
    if (attempt < WEBSERVER_POLL_MAX) {
      poll = setTimeout(() => tryMount(attempt + 1), WEBSERVER_POLL_MS);
      if (poll && typeof poll.unref === 'function') poll.unref();
    }
    // 超时也不抛：字体半边不依赖这里，头像的客户端会自己回落 localStorage。
  };
  tryMount(0);

  return () => {
    disposed = true;
    if (poll) { try { clearTimeout(poll); } catch { /* ignore */ } poll = null; }
    for (const d of disposers) { try { d(); } catch { /* ignore */ } }
    ensuredDirs.clear();
  };
}

export default { inject, apply, Config, SETTINGS_ENTRY, FIELD_DEFAULTS };
