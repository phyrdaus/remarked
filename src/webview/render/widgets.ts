import { WidgetType, type EditorView } from "@codemirror/view";
import { resolveImageSrc } from "./imageBase";
import katex from "katex";

export class BulletWidget extends WidgetType {
  override toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-rm-bullet";
    span.textContent = "•";
    return span;
  }
  override eq(): boolean {
    return true;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}

export class HrWidget extends WidgetType {
  override toDOM(): HTMLElement {
    const hr = document.createElement("hr");
    hr.className = "cm-rm-hr";
    return hr;
  }
  override eq(): boolean {
    return true;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}

export class ImageWidget extends WidgetType {
  constructor(private readonly src: string, private readonly alt: string) {
    super();
  }
  override toDOM(): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "cm-rm-image";
    const resolved = resolveImageSrc(this.src);
    if (!resolved) {
      wrap.classList.add("cm-rm-image-error");
      wrap.textContent = `⚠ image unavailable: ${this.alt || this.src}`;
      return wrap;
    }
    const img = document.createElement("img");
    img.src = resolved;
    img.alt = this.alt;
    img.onerror = () => {
      wrap.classList.add("cm-rm-image-error");
      wrap.textContent = `⚠ image failed to load: ${this.alt || this.src}`;
    };
    wrap.appendChild(img);
    return wrap;
  }
  override eq(other: ImageWidget): boolean {
    return this.src === other.src && this.alt === other.alt;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}

export class CheckboxWidget extends WidgetType {
  constructor(
    private readonly checked: boolean,
    private readonly from: number,
    private readonly to: number
  ) {
    super();
  }
  override toDOM(view: EditorView): HTMLElement {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.className = "cm-rm-checkbox";
    box.addEventListener("mousedown", (e) => e.preventDefault()); // keep editor focus
    box.addEventListener("click", (e) => {
      e.preventDefault();
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: this.checked ? "[ ]" : "[x]" },
        userEvent: "input",
      });
    });
    return box;
  }
  override eq(other: CheckboxWidget): boolean {
    return this.checked === other.checked && this.from === other.from && this.to === other.to;
  }
}

export class MathWidget extends WidgetType {
  constructor(private readonly tex: string, private readonly block: boolean) {
    super();
  }
  override toDOM(): HTMLElement {
    const el = document.createElement(this.block ? "div" : "span");
    el.className = this.block ? "cm-rm-math cm-rm-math-block" : "cm-rm-math";
    try {
      katex.render(this.tex, el, { displayMode: this.block, throwOnError: true });
    } catch (err) {
      el.classList.add("cm-rm-math-error");
      el.textContent = `⚠ ${err instanceof Error ? err.message : "KaTeX error"}`;
    }
    return el;
  }
  override eq(other: MathWidget): boolean {
    return this.tex === other.tex && this.block === other.block;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}

import { renderMermaid } from "./mermaid";

export class MermaidWidget extends WidgetType {
  constructor(private readonly source: string) {
    super();
  }
  override toDOM(): HTMLElement {
    const el = document.createElement("div");
    el.className = "cm-rm-mermaid";
    renderMermaid(this.source, el);
    return el;
  }
  override eq(other: MermaidWidget): boolean {
    return this.source === other.source;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}
