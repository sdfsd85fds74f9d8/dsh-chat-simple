/**
 * dsh-chat-simple — client (browser) half.
 *
 * A compiled browser module in the `window.__ModuleLoader__.load({ id, factory })`
 * form. It is a normal browser module (full access to fetch/document/window;
 * `react` via `require("react")`).
 *
 * The factory merges two independent closures — the session-avatar layer and the
 * text-display panel — each carried over verbatim from its own plugin, and
 * registers ONE settings section ("聊天设置") that shows them behind two tabs.
 */

import type { Context } from '@deepseek-ai/cordis';

/** Declarative service dependency of the browser half: the client `slots` service. */
export declare const inject: string[];

/**
 * Attaches both halves and registers the merged「聊天设置」section.
 * Each half is attached inside its own try/catch, so a failure in one does not
 * take the other down. Returns nothing; teardown rides the fiber's effects.
 */
export declare function apply(ctx: Context): void;

/** The factory's return shape: the browser plugin exports consumed by the Cordis Loader. */
export interface ChatSimpleClientPlugin {
  apply: typeof apply;
  inject: typeof inject;
}
