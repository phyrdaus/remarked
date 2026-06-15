import { describe, it, expect, afterEach } from "vitest";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import type { EditorView } from "@codemirror/view";
import { createToolbar } from "../../src/webview/toolbar/view";

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
    ]);
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
