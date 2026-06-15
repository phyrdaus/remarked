// Pure string assembly for the export pipeline. No vscode/node imports
// (mermaidSlot.ts is a local sibling, not a vscode/node dep).
// SECURITY NOTE: css, extraCss, and bodyHtml are TRUSTED inputs (bundled
// constants + our own pipeline) and are interpolated raw into the HTML output.
// Do NOT feed user-controlled strings into those fields.
import { MERMAID_SLOT_RE } from "./mermaidSlot";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface AssembleOptions {
  title: string;
  bodyHtml: string;
  css: string;
  /** Each entry becomes its own <style> block, in order, after `css`. */
  extraCss?: string[];
}

export function assembleHtml(opts: AssembleOptions): string {
  const extra = (opts.extraCss ?? []).map((c) => `<style>${c}</style>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<style>${opts.css}</style>
${extra}
</head>
<body class="rm-export">
<main>
${opts.bodyHtml}
</main>
</body>
</html>`;
}

/**
 * Swap matching <img src="…"> values. Keys are the renderMarkdown imageSrcs —
 * markdown-it's normalized (percent-encoded) attr form, pre entity-escaping.
 * Escaping the key (same 4-entity set markdown-it uses) avoids
 * order-sensitive unescaping of the html side.
 */
export function replaceImageSrcs(html: string, replacements: Map<string, string>): string {
  const byEscaped = new Map([...replacements].map(([k, v]) => [escapeHtml(k), v]));
  return html.replace(/(<img\b[^>]*?\bsrc=")([^"]*)(")/g, (whole, pre: string, src: string, post: string) => {
    const next = byEscaped.get(src);
    return next === undefined ? whole : `${pre}${escapeHtml(next)}${post}`;
  });
}

/** Replace mermaid slots with rendered SVGs; null = render the source as code. */
export function fillMermaidSlots(html: string, sources: string[], svgs: (string | null)[]): string {
  return html.replace(
    MERMAID_SLOT_RE,
    (_whole, n: string) => {
      const i = Number(n);
      const svg = svgs[i];
      if (svg) return `<div class="rm-mermaid">${svg}</div>`;
      return `<pre><code class="language-mermaid">${escapeHtml(sources[i] ?? "")}</code></pre>`;
    }
  );
}
