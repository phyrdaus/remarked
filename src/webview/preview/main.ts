// Preview panel webview entry (browser bundle). Receives rendered body HTML +
// mermaid sources from the host and paints them; mermaid renders client-side.
import { renderMermaid } from "../render/mermaid";

interface PreviewRenderMsg {
  type: "render";
  html: string;
  mermaidSources: string[];
}

/** Inject html and render mermaid slots, preserving scroll position. */
export function applyRender(container: HTMLElement, html: string, mermaidSources: string[]): void {
  const scroll = container.scrollTop;
  container.innerHTML = html;
  for (const el of container.querySelectorAll<HTMLElement>(".rm-mermaid-slot[data-mermaid]")) {
    const source = mermaidSources[Number(el.dataset.mermaid)];
    if (source != null) renderMermaid(source, el);
  }
  container.scrollTop = scroll;
}

const root = document.getElementById("preview");
if (root) {
  window.addEventListener("message", (event) => {
    const msg = event.data as PreviewRenderMsg;
    if (msg?.type === "render") applyRender(root, msg.html, msg.mermaidSources);
  });
}
