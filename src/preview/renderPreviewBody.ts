// Host-only. Reuses the export renderer (math → static HTML, mermaid → slots)
// and rewrites local image srcs to webview-safe URIs for the live Preview panel.
import { renderMarkdown } from "../export/renderMarkdown";
import { replaceImageSrcs } from "../export/assembleHtml";

export interface PreviewBody {
  html: string;
  mermaidSources: string[];
  title: string | null;
}

/**
 * @param toWebviewUri maps a local (doc-relative or absolute) image src to a
 *   webview-safe URI string; return null to leave the original src in place.
 */
export function renderPreviewBody(
  source: string,
  toWebviewUri: (src: string) => string | null
): PreviewBody {
  const rendered = renderMarkdown(source, { sourceMap: true });
  const replacements = new Map<string, string>();
  for (const src of rendered.imageSrcs) {
    const uri = toWebviewUri(src);
    if (uri) replacements.set(src, uri);
  }
  return {
    html: replaceImageSrcs(rendered.html, replacements),
    mermaidSources: rendered.mermaidSources,
    title: rendered.title,
  };
}
