// Pure helpers shared by the host asset service and the webview paste handler.
// No node/vscode imports — this file is bundled into both targets.

const MIME_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
};

export function extensionForMime(mime: string): string | null {
  return MIME_EXT[mime.toLowerCase()] ?? null;
}

/**
 * Split the remarked.imageFolder setting into path segments.
 * Returns null when the value could escape the document's directory
 * (absolute paths, drive letters, ".." segments) — never trust settings
 * with file-system writes.
 */
export function splitFolderSetting(folder: string): string[] | null {
  if (/^([/\\]|[a-z]:)/i.test(folder)) return null;
  const segments = folder.split(/[/\\]/).filter((s) => s !== "" && s !== ".");
  if (segments.some((s) => s === "..")) return null;
  return segments;
}

function sanitizeBaseName(name: string): string {
  return name
    .replace(/\.[^.]*$/, "") // drop the original extension; the mime decides
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 64);
}

function timestamp(now: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  );
}

/**
 * Pick a filename for a pasted/dropped image: keep a meaningful original name,
 * fall back to image-<timestamp> for generic clipboard names ("image.png", ""),
 * and suffix -2, -3… until `exists` clears.
 */
export function buildImageFilename(opts: {
  originalName: string;
  mime: string;
  now: Date;
  exists: (filename: string) => boolean;
}): string {
  const ext = extensionForMime(opts.mime) ?? ".png";
  const sanitized = sanitizeBaseName(opts.originalName);
  const base = sanitized === "" || /^image$/i.test(sanitized) ? `image-${timestamp(opts.now)}` : sanitized;
  let candidate = `${base}${ext}`;
  for (let n = 2; opts.exists(candidate); n++) candidate = `${base}-${n}${ext}`;
  return candidate;
}

/** The markdown to insert for a saved asset. */
export function imageMarkdown(relPath: string, alt: string): string {
  const cleanAlt = alt.replace(/[\[\]\n]+/g, " ").replace(/\s+/g, " ").trim();
  const href = /\s/.test(relPath) ? `<${relPath}>` : relPath;
  return `![${cleanAlt}](${href})`;
}
