import { describe, it, expect, afterEach, vi } from "vitest";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import type { EditorView } from "@codemirror/view";
import { createToolbar } from "../../src/webview/toolbar/view";
import { setRenderSettings } from "../../src/webview/render/settings";

afterEach(() => document.body.replaceChildren());

/** Minimal view stand-in: createToolbar only uses state + dispatch + focus. */
class FakeView {
  state: EditorState;
  lastSpec: TransactionSpec | null = null;
  constructor(doc: string, head = 0) {
    this.state = EditorState.create({
      doc,
      selection: { anchor: head },
      extensions: [markdown({ base: markdownLanguage })],
    });
    ensureSyntaxTree(this.state, doc.length, 5000);
  }
  dispatch(spec: TransactionSpec): void {
    this.lastSpec = spec;
    this.state = this.state.update(spec).state;
  }
  focus(): void {}
}

function click(dom: HTMLElement, action: string): void {
  dom.querySelector<HTMLElement>(`[data-action="${action}"]`)!
    .dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("createToolbar", () => {
  it("renders a button for every action", () => {
    const view = new FakeView("hello");
    const { dom } = createToolbar(view as unknown as EditorView, () => {});
    const actions = Array.from(dom.querySelectorAll<HTMLElement>("[data-action]")).map(
      (b) => b.dataset.action
    );
    expect(actions).toEqual([
      "bold", "italic", "strike", "code",
      "h1", "h2", "h3",
      "bullet", "ordered", "task",
      "blockquote", "codeblock", "hr",
      "link", "image", "table",
      "viewSource", "exportHtml", "exportPdf", "preview",
    ]);
  });

  it("view-source button asks the host to open the raw markdown", () => {
    const posted: Array<{ type: string }> = [];
    const view = new FakeView("x");
    const { dom } = createToolbar(view as unknown as EditorView, (m) => posted.push(m));
    click(dom, "viewSource");
    expect(posted).toEqual([{ type: "openAsText" }]);
  });

  it("export buttons post the matching host message", () => {
    setRenderSettings({ math: true, mermaid: true, toolbar: true, isMac: false });
    const posted: Array<{ type: string }> = [];
    const view = new FakeView("x");
    const { dom } = createToolbar(view as unknown as EditorView, (m) => posted.push(m));
    click(dom, "exportHtml");
    click(dom, "exportPdf");
    expect(posted).toEqual([{ type: "exportHtml" }, { type: "exportPdf" }]);
  });

  it("preview button posts openPreview", () => {
    setRenderSettings({ math: true, mermaid: true, toolbar: true, isMac: false });
    const posted: Array<{ type: string }> = [];
    const view = new FakeView("x");
    const { dom } = createToolbar(view as unknown as EditorView, (m) => posted.push(m));
    click(dom, "preview");
    expect(posted).toEqual([{ type: "openPreview" }]);
  });

  it("a bold click dispatches the bold toggle to the document", () => {
    const view = new FakeView("hi", 0);
    view.state = view.state.update({ selection: { anchor: 0, head: 2 } }).state;
    const { dom } = createToolbar(view as unknown as EditorView, () => {});
    click(dom, "bold");
    expect(view.state.doc.toString()).toBe("**hi**");
  });

  it("update() lights the buttons that are active at the cursor", () => {
    const view = new FakeView("## t", 3);
    const { dom, update } = createToolbar(view as unknown as EditorView, () => {});
    update();
    expect(dom.querySelector('[data-action="h2"]')!.classList.contains("on")).toBe(true);
    expect(dom.querySelector('[data-action="bold"]')!.classList.contains("on")).toBe(false);
  });

  it("update() clears active state when the cursor leaves the format", () => {
    const view = new FakeView("## t\nplain", 3);
    const { dom, update } = createToolbar(view as unknown as EditorView, () => {});
    update();
    expect(dom.querySelector('[data-action="h2"]')!.classList.contains("on")).toBe(true);
    view.state = view.state.update({ selection: { anchor: 7 } }).state; // on the "plain" line
    update();
    expect(dom.querySelector('[data-action="h2"]')!.classList.contains("on")).toBe(false);
  });

  it("image button opens a file input and routes a chosen file to the host", async () => {
    const posted: Array<{ type: string }> = [];
    const view = new FakeView("x");
    const { dom } = createToolbar(view as unknown as EditorView, (m) => posted.push(m));
    click(dom, "image");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input!.accept).toBe("image/*");
    const file = new File([new Uint8Array([1, 2, 3])], "pic.png", { type: "image/png" });
    Object.defineProperty(input!, "files", { value: [file] });
    input!.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 0));
    expect(posted.some((m) => m.type === "saveImage")).toBe(true);
  });
});

describe("createToolbar — platform shortcut hints", () => {
  // The hint lives on aria-label (and the custom tooltip), not the native
  // `title` attribute — native titles are slow and fire inconsistently in
  // webviews, so the shortcut was often unreadable.
  function titleFor(action: string, isMac: boolean): string {
    setRenderSettings({ math: true, mermaid: true, toolbar: true, isMac });
    const view = new FakeView("x");
    const { dom } = createToolbar(view as unknown as EditorView, () => {});
    return dom.querySelector<HTMLElement>(`[data-action="${action}"]`)!.getAttribute("aria-label") ?? "";
  }

  it("shows Mac symbols on macOS", () => {
    expect(titleFor("bold", true)).toBe("Bold (⌘B)");
    expect(titleFor("link", true)).toBe("Link (⌘K)");
    expect(titleFor("viewSource", true)).toBe("View Markdown source (⌥⌘E)");
  });

  it("shows Ctrl/Alt on other platforms", () => {
    expect(titleFor("bold", false)).toBe("Bold (Ctrl+B)");
    expect(titleFor("link", false)).toBe("Link (Ctrl+K)");
    expect(titleFor("viewSource", false)).toBe("View Markdown source (Ctrl+Shift+Alt+E)");
  });

  it("leaves shortcut-less buttons unchanged", () => {
    expect(titleFor("strike", false)).toBe("Strikethrough");
    expect(titleFor("h1", true)).toBe("Heading 1");
  });
});

describe("createToolbar — custom tooltip", () => {
  it("labels buttons via aria-label and does not set the slow native title", () => {
    setRenderSettings({ math: true, mermaid: true, toolbar: true, isMac: true });
    const view = new FakeView("x");
    const { dom } = createToolbar(view as unknown as EditorView, () => {});
    const bold = dom.querySelector<HTMLElement>('[data-action="bold"]')!;
    expect(bold.getAttribute("aria-label")).toBe("Bold (⌘B)");
    expect(bold.title).toBe(""); // native title dropped in favour of the custom tooltip
  });

  it("shows a custom tooltip on hover after a short delay and hides on leave", () => {
    vi.useFakeTimers();
    try {
      setRenderSettings({ math: true, mermaid: true, toolbar: true, isMac: false });
      const view = new FakeView("x");
      const { dom } = createToolbar(view as unknown as EditorView, () => {});
      document.body.appendChild(dom);
      const bold = dom.querySelector<HTMLElement>('[data-action="bold"]')!;
      const tip = dom.querySelector<HTMLElement>(".rm-toolbar-tip")!;
      expect(tip).toBeTruthy();
      expect(tip.classList.contains("show")).toBe(false);

      bold.dispatchEvent(new MouseEvent("mouseenter"));
      expect(tip.classList.contains("show")).toBe(false); // waits out the delay
      vi.advanceTimersByTime(150);
      expect(tip.classList.contains("show")).toBe(true);
      expect(tip.textContent).toBe("Bold (Ctrl+B)");

      bold.dispatchEvent(new MouseEvent("mouseleave"));
      expect(tip.classList.contains("show")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clicking a button dismisses the tooltip", () => {
    vi.useFakeTimers();
    try {
      setRenderSettings({ math: true, mermaid: true, toolbar: true, isMac: false });
      const view = new FakeView("hi", 0);
      const { dom } = createToolbar(view as unknown as EditorView, () => {});
      document.body.appendChild(dom);
      const strike = dom.querySelector<HTMLElement>('[data-action="strike"]')!;
      const tip = dom.querySelector<HTMLElement>(".rm-toolbar-tip")!;
      strike.dispatchEvent(new MouseEvent("mouseenter"));
      vi.advanceTimersByTime(150);
      expect(tip.classList.contains("show")).toBe(true);
      strike.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(tip.classList.contains("show")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
