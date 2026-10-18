/**
 * dsh-chat-simple — host half type surface.
 *
 * The host plugin contributes no public Cordis services and registers no model
 * tool. It does two things:
 *
 *   1. Exports `Config` — the schemastery schema DSH reads off the loader entry
 *      to project the text-display form. Every field is `.volatile()`; only
 *      volatile fields can be written back through `dsh-settings`.
 *   2. Serves two same-origin HTTP routes through `ctx.webServer` for the
 *      session-avatar section:
 *        · `GET/PUT  /chat-simple/settings`
 *        · `GET/HEAD/POST/DELETE /chat-simple/avatar/<side>`
 *
 * `webServer` is NOT a hard dependency here (unlike the wallpaper plugin this
 * derives from): the text section needs no service at all, so a profile without
 * an HTTP server still gets working fonts. The avatar routes are mounted once
 * `webServer` appears (bounded poll); until then the browser half falls back to
 * localStorage.
 */

import type { Context } from '@deepseek-ai/cordis';

/** The profile row id, which doubles as the Host settings namespace. */
export declare const SETTINGS_ENTRY: 'chat-simple';

/** Defaults for the nine text-display fields ('' means "do not override"). */
export declare const FIELD_DEFAULTS: {
  fontFamily: string;
  latinFontFamily: string;
  fontSize: string;
  codeFontFamily: string;
  codeFontSize: string;
  letterSpacing: string;
  lineHeight: string;
  paragraphSpacing: string;
  firstLineIndent: string;
};

/**
 * The text-display schema, or `undefined` when `schemastery` cannot be resolved
 * from the host realm — in which case no form is projected but font overriding
 * still works (the client uses in-memory defaults).
 */
export declare const Config: unknown;

/** The avatar sides. */
export type AvatarSide = 'user' | 'ai';

/** Shape persisted by `GET/PUT /chat-simple/settings`. */
export interface AvatarSettings {
  avatarEnabled: boolean;
  /** Avatar edge length in px, clamped to 24–72. */
  avatarSize: number;
  /** Corner roundness, 0–100 (%; 100 = a full circle). */
  avatarRadius: number;
  avatarUserImage: string;
  avatarAiImage: string;
}

export declare const inject: string[];

/** Mounts the avatar routes (when a webServer is available); returns a disposer. */
export declare function apply(ctx: Context): () => void;

declare const plugin: {
  inject: string[];
  apply: typeof apply;
  Config: unknown;
  SETTINGS_ENTRY: string;
  FIELD_DEFAULTS: typeof FIELD_DEFAULTS;
};
export default plugin;
