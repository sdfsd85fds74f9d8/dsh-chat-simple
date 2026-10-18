/**
 * http-body.js —— 收**要整体缓冲**的请求体：**累加 · 字节计闸 · 一次解码**，这三件事的唯一实现。
 *
 * 为什么单独一个模块：头像导入这条腿要把整张图缓冲进内存（客户端已按 512px 压过，上限 8 MB），
 * 而"忘了写上限"与"逐块拼接把跨 TCP 分片的多字节码点切成 U+FFFD"是两个真实会踩的坑。
 * 把这两件事收在一处，调用点只说"上限多少、越界怎么应答"。
 *
 * ⚠️ **两条不变量**：
 *   ① **上限按累计字节判**（`size += chunk.length`），不是按块数、也不是按最终长度 ——
 *      按最终长度判等于先收完再拒，闸就没意义了。
 *   ② **收完只解码一次**（`Buffer.concat(chunks).toString('utf8')`）。逐块 `body += chunk`
 *      会把跨 TCP 分片的多字节码点切成 U+FFFD，用户可见字符串被静默写坏且客户端不会知道。
 *
 * 用法（`end` / 超时 / 断开收口都留在调用点）：
 *
 *   const reader = bodyReader(req, {
 *     maxBytes: AVATAR_MAX_BYTES,
 *     shouldStop: () => timedOut,                       // 可选：调用点自己的中止条件
 *     onOverflow: () => { tooLarge = true; res.statusCode = 413; res.end(); },
 *   });
 *   req.on('data', reader.onData);
 *   req.on('end', () => {
 *     if (timedOut || tooLarge) return;
 *     const body = reader.buf();                        // ← 二进制用 buf()，字符串用 text()
 *     ...
 *   });
 *
 * 为什么是"处理器 + 取值器"而不是一个 `await readBody()`：各调用点的**应答 / 超时 / 断开**
 * 策略互不相同，把它们也抽象进来只会把差异藏进参数里。本模块只吃**那三件真正重复的事**。
 *
 * 宿主半边，只用 `node:` 内置能力，无第三方依赖。
 */

/**
 * 造一个缓冲收集器。
 *
 * @param {import('node:http').IncomingMessage} req 请求（**只用来读 `aborted` 之类的即时状态**；
 *   监听器的挂载仍由调用点做 —— 应答 / 超时 / 断开的策略留在调用点）
 * @param {object} opts
 * @param {number} opts.maxBytes **必填**：累计字节能到多少。缺省不给值是有意的 ——
 *   "忘了写上限"必须在**第一个请求**上就炸，而不是悄悄用一个默认值（那正是这条缺口的老形态）。
 * @param {() => boolean} [opts.shouldStop] 调用点自己的中止条件（如 `() => timedOut`）。
 *   命中后**不再累加** —— 超时/已判失败的请求体不该继续占内存。
 * @param {() => void} [opts.onOverflow] 首次越限时**立即**回调（调用点据此当场应答 413，
 *   而不是等体收完）。只回调一次。
 * @returns {{ onData: (chunk: Buffer) => void, overflowed: boolean, bytes: number,
 *   buf: () => Buffer, text: () => string }}
 */
export function bodyReader(req, { maxBytes, shouldStop, onOverflow } = {}) {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error('bodyReader 需要 maxBytes（正整数）—— 收 body 必须有上限，这是不变量不是选项');
  }
  const chunks = [];
  let size = 0;
  let overflowed = false;

  const onData = (chunk) => {
    if (overflowed) return;
    if (shouldStop && shouldStop()) return;
    size += chunk.length;
    if (size > maxBytes) {
      overflowed = true;
      // 先置位再回调：回调里的应答若同步抛错，也不会让后续块重新进入累加。
      if (onOverflow) onOverflow();
      return;
    }
    chunks.push(chunk);
  };

  return {
    onData,
    get overflowed() { return overflowed; },
    get bytes() { return size; },
    /** 一次 `Buffer.concat`（二进制站点用这个，如头像图）。 */
    buf: () => Buffer.concat(chunks),
    /** 一次 `Buffer.concat` + **只解码这一次**（字符串站点用这个）。 */
    text: () => Buffer.concat(chunks).toString('utf8'),
  };
}
