import type { ToHost } from "../shared/messages";

/** Spec: above the size threshold, ask before rendering — never silently jank. */
export function renderLargeFilePrompt(root: HTMLElement, bytes: number, post: (msg: ToHost) => void): void {
  root.replaceChildren();
  const box = document.createElement("div");
  box.className = "rm-largefile";
  const message = document.createElement("p");
  message.textContent = `This document is ${(bytes / (1024 * 1024)).toFixed(1)} MB — live rendering may be slow.`;
  const render = document.createElement("button");
  render.textContent = "Render anyway";
  render.addEventListener("click", () => post({ type: "renderAnyway" }));
  const asText = document.createElement("button");
  asText.textContent = "Open as plain text";
  asText.addEventListener("click", () => post({ type: "openAsText" }));
  box.append(message, render, asText);
  root.appendChild(box);
}
