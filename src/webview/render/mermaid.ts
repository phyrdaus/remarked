import { formatMermaidError } from "./mermaidError";

let mermaidPromise: Promise<typeof import("mermaid")["default"]> | null = null;
let seq = 0;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const dark =
        document.body.classList.contains("vscode-dark") ||
        document.body.classList.contains("vscode-high-contrast");
      // mermaid 12's ELK layout and `neo` look are adopted deliberately; add
      // layout: "dagre", look: "classic" here to restore the pre-12 appearance.
      // suppressErrorRendering: on a parse error mermaid otherwise leaves its own
      // "Syntax error" graphic attached to <body>; callers show their own error.
      m.default.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        suppressErrorRendering: true,
      });
      return m.default;
    });
  }
  return mermaidPromise;
}

/** Render mermaid source into the container; shows an inline error chip on failure. */
export function renderMermaid(source: string, container: HTMLElement): void {
  // Drop any earlier error state in case the caller reuses the container.
  // Overlapping renders into one container can't settle out of order:
  // mermaid.render() runs calls one at a time through its executionQueue.
  container.classList.remove("cm-rm-mermaid-error");
  container.removeAttribute("title");
  container.textContent = "⏳ rendering diagram…";
  loadMermaid()
    .then((mermaid) => mermaid.render(`rm-mermaid-${seq++}`, source))
    .then(({ svg }) => {
      // innerHTML trust model: SVG from bundled mermaid rendering user's own doc
      // inside a strictly-CSP'd webview. Mermaid's
      // securityLevel defaults to "strict", which sanitizes labels.
      container.innerHTML = svg;
    })
    .catch((err: unknown) => {
      const { summary, snippet, full } = formatMermaidError(err instanceof Error ? err.message : "render error");
      container.classList.add("cm-rm-mermaid-error");
      container.title = full;
      // textContent only: the snippet is the user's own diagram source.
      const line = document.createElement("div");
      line.className = "cm-rm-mermaid-error-summary";
      line.textContent = `⚠ mermaid: ${summary}`;
      container.replaceChildren(line);
      if (snippet) {
        const excerpt = document.createElement("div");
        excerpt.className = "cm-rm-mermaid-error-snippet";
        excerpt.textContent = snippet;
        container.append(excerpt);
      }
    });
}

/** Render to an SVG string for export; null = parse/render failure. */
export async function renderMermaidSvg(source: string): Promise<string | null> {
  try {
    const mermaid = await loadMermaid();
    const { svg } = await mermaid.render(`rm-export-${seq++}`, source);
    return svg;
  } catch {
    return null;
  }
}
