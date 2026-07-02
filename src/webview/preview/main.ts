// Preview panel webview entry (browser bundle). Receives rendered body HTML +
// mermaid sources from the host and paints them; mermaid renders client-side.
import { renderMermaid } from "../render/mermaid";
import { targetOffsetForLine, type Anchor } from "../../preview/scrollSync";
import type { ToPreview, FromPreview } from "../../shared/messages";

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };

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
  const vscode = acquireVsCodeApi();
  const post = (msg: FromPreview) => vscode.postMessage(msg);
  let anchors: Anchor[] = [];

  const collectAnchors = () => {
    // Measure each anchor's offset within the scroll container's content, not
    // via offsetTop: offsetTop is relative to the element's offsetParent (a
    // positioned ancestor, table cell, etc.), which is not necessarily #preview,
    // so it can yield offsets outside the scroll space. rootContentTop is the
    // viewport Y of the content origin (top of content at scrollTop 0); the
    // element's rect top minus it is exactly the scrollTop that brings it to the
    // top of the viewport — correct regardless of layout.
    const rootContentTop = root.getBoundingClientRect().top - root.scrollTop;
    anchors = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"))
      .map((el) => ({
        line: Number(el.dataset.line),
        offsetTop: el.getBoundingClientRect().top - rootContentTop,
      }))
      .filter((a) => Number.isFinite(a.line))
      .sort((x, y) => x.line - y.line);
  };

  const scrollToLine = (line: number) => {
    if (anchors.length === 0) return;
    const target = targetOffsetForLine(anchors, line);
    const view = root.clientHeight;
    const top = root.scrollTop;
    // Comfortable-band gate: only scroll if the target isn't already
    // roughly on-screen (avoids jitter while typing within a visible block).
    if (target >= top + view * 0.15 && target <= top + view * 0.85) return;
    root.scrollTop = Math.max(0, target - view / 3); // ~1/3 from the top
  };

  window.addEventListener("message", (event) => {
    const msg = event.data as ToPreview;
    if (msg?.type === "render") {
      applyRender(root, msg.html, msg.mermaidSources);
      collectAnchors();
    } else if (msg?.type === "scrollToLine") {
      scrollToLine(msg.line);
    }
  });

  root.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement)?.closest?.("[data-line]") as HTMLElement | null;
    if (!el) return;
    const line = Number(el.dataset.line);
    if (Number.isFinite(line)) post({ type: "revealLine", line });
  });

  post({ type: "ready" });
}
