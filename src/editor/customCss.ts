// Extension-host only (node:path) — must never be imported from src/webview/.
import * as path from "node:path";

/**
 * Resolve the remarked.customCss setting to an absolute filesystem path.
 * Relative values resolve against the first workspace folder; null means
 * "no custom css". Existence is NOT checked — a broken link degrades to an
 * ignored stylesheet, which is visible (unstyled) rather than fatal.
 */
export function resolveCustomCssFsPath(
  setting: string | undefined,
  firstWorkspaceRoot: string | undefined
): string | null {
  const value = setting?.trim();
  if (!value) return null;
  if (path.isAbsolute(value)) return value;
  return firstWorkspaceRoot ? path.join(firstWorkspaceRoot, value) : null;
}
