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
      container.classList.add("cm-rm-mermaid-error");
      container.textContent = `⚠ mermaid: ${err instanceof Error ? err.message.split("\n")[0] : "render error"}`;
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
