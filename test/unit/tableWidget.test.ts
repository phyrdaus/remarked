import { describe, it, expect, afterEach, vi } from "vitest";
import type { EditorView } from "@codemirror/view";
import { ensureSyntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { makeModel } from "./tableHelpers";
import { TableWidget, toDisplay } from "../../src/webview/render/table/widget";
import { parseTableModel } from "../../src/webview/render/table/model";
import { addColumnEdit, setAlignEdit } from "../../src/webview/render/table/edits";
import { tableNode } from "./tableHelpers";
import { exitTableSource } from "../../src/webview/render/table/commands";

const TABLE = "| Name | Age |\n| :--- | ---: |\n| Ada \\| Co | 36 |";

afterEach(() => document.body.replaceChildren());

function renderWidget(doc: string): HTMLElement {
  const { state, model } = makeModel(doc);
  const widget = new TableWidget(toDisplay(state, model!), model!.source);
  const dom = widget.toDOM(undefined as unknown as EditorView);
  document.body.appendChild(dom);
  return dom;
}

describe("TableWidget rendering", () => {
  it("renders header th and body td with row/col coordinates", () => {
    const dom = renderWidget(TABLE);
    const ths = dom.querySelectorAll("thead th");
    const tds = dom.querySelectorAll("tbody td");
    expect(ths).toHaveLength(2);
    expect(tds).toHaveLength(2);
    expect(ths[0].textContent).toBe("Name");
    expect((tds[1] as HTMLElement).dataset.row).toBe("1");
    expect((tds[1] as HTMLElement).dataset.col).toBe("1");
  });

  it("shows escaped pipes as literal pipes", () => {
    const dom = renderWidget(TABLE);
    expect(dom.querySelector('[data-row="1"][data-col="0"]')!.textContent).toBe("Ada | Co");
  });

  it("applies column alignment styles", () => {
    const dom = renderWidget(TABLE);
    const th = dom.querySelector<HTMLElement>('[data-row="0"][data-col="0"]')!;
    const td = dom.querySelector<HTMLElement>('[data-row="1"][data-col="1"]')!;
    expect(th.style.textAlign).toBe("left");
    expect(td.style.textAlign).toBe("right");
  });

  it("is equal to another widget with the same source", () => {
    const { state, model } = makeModel(TABLE);
    const a = new TableWidget(toDisplay(state, model!), model!.source);
    const b = new TableWidget(toDisplay(state, model!), model!.source);
    expect(a.eq(b)).toBe(true);
  });
});

/**
 * Minimal stand-in for EditorView: the widget's event wiring only touches
 * state, dispatch, posAtDOM, and focus. dispatch() does NOT re-render the
 * widget DOM (no real CM view here) — DOM-refresh behavior is exercised by
 * calling updateDOM() explicitly.
 */
class FakeView {
  state: EditorState;
  constructor(doc: string) {
    this.state = EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] });
    ensureSyntaxTree(this.state, doc.length, 5000);
  }
  dispatch(spec: TransactionSpec): void {
    this.state = this.state.update(spec).state;
    ensureSyntaxTree(this.state, this.state.doc.length, 5000);
  }
  posAtDOM(_node: Node): number {
    return tableNode(this.state).from;
  }
  focus(): void {}
  scrollDOM = { scrollTop: 0 } as unknown as HTMLElement;
  requestMeasure(spec?: { read?: () => unknown; write?: (measure: unknown, view: unknown) => void }): void {
    spec?.write?.(spec.read?.(), this);
  }
}

function setup(doc: string) {
  const view = new FakeView(doc);
  const model = parseTableModel(view.state, tableNode(view.state))!;
  const widget = new TableWidget(toDisplay(view.state, model), model.source);
  const wrap = widget.toDOM(view as unknown as EditorView);
  document.body.appendChild(wrap);
  return { view, wrap };
}

function cell(wrap: HTMLElement, row: number, col: number): HTMLElement {
  return wrap.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`)!;
}

function typeInto(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const EDIT_DOC = "| Name | Age |\n| --- | --- |\n| Ada | 36 |\n\ntail";

describe("TableWidget cell editing", () => {
  it("writes cell input through to the document", () => {
    const { view, wrap } = setup(EDIT_DOC);
    typeInto(cell(wrap, 1, 0), "Grace");
    expect(view.state.doc.toString()).toBe("| Name | Age |\n| --- | --- |\n| Grace | 36 |\n\ntail");
  });

  it("escapes typed pipes", () => {
    const { view, wrap } = setup(EDIT_DOC);
    typeInto(cell(wrap, 1, 0), "a | b");
    expect(view.state.doc.toString()).toContain("| a \\| b | 36 |");
  });

  it("does not commit while composing (IME), commits once on compositionend", () => {
    const { view, wrap } = setup(EDIT_DOC);
    const td = cell(wrap, 1, 0);
    td.dispatchEvent(new Event("compositionstart", { bubbles: true }));
    typeInto(td, "中");
    expect(view.state.doc.toString()).toBe(EDIT_DOC); // not yet
    td.dispatchEvent(new Event("compositionend", { bubbles: true }));
    expect(view.state.doc.toString()).toContain("| 中 | 36 |");
  });

  it("falls back to source (selection into the table) when mapping fails", () => {
    const { view, wrap } = setup(EDIT_DOC);
    typeInto(cell(wrap, 1, 0), "x\\"); // trailing backslash: round-trip proof fails
    expect(view.state.doc.toString()).toBe(EDIT_DOC); // file untouched
    expect(view.state.selection.main.head).toBe(0); // caret moved into the table = reveal
  });

  it("updateDOM re-renders cells from a new state", () => {
    const { view, wrap } = setup(EDIT_DOC);
    typeInto(cell(wrap, 1, 0), "Grace");
    const model = parseTableModel(view.state, tableNode(view.state))!;
    const next = new TableWidget(toDisplay(view.state, model), model.source);
    expect(next.updateDOM(wrap, view as unknown as EditorView)).toBe(true);
    expect(cell(wrap, 1, 0).textContent).toBe("Grace");
  });

  it("updateDOM keeps the focused cell's live text (edge whitespace)", () => {
    const { view, wrap } = setup(EDIT_DOC);
    const td = cell(wrap, 1, 0);
    td.focus();
    expect(document.activeElement).toBe(td);
    typeInto(td, "hello "); // trailing space: source stores "hello", DOM must keep "hello "
    const model = parseTableModel(view.state, tableNode(view.state))!;
    const next = new TableWidget(toDisplay(view.state, model), model.source);
    next.updateDOM(wrap, view as unknown as EditorView);
    expect(cell(wrap, 1, 0).textContent).toBe("hello ");
  });

  // FIR-7: the per-keystroke rebuild used to destroy and re-focus the active
  // cell, which scrolls the document on a long table. When the shape is
  // unchanged, updateDOM must reconcile in place and leave the focused cell's
  // NODE untouched — same node, still focused — so the native caret and scroll
  // position are preserved. (Node identity is the testable proxy for "no
  // scroll"; the scroll itself is browser-only and verified live.)
  it("updateDOM preserves the focused cell node and focus (no rebuild)", () => {
    const { view, wrap } = setup(EDIT_DOC);
    const td = cell(wrap, 1, 0);
    td.focus();
    typeInto(td, "Grace");
    const before = cell(wrap, 1, 0);
    const model = parseTableModel(view.state, tableNode(view.state))!;
    const next = new TableWidget(toDisplay(view.state, model), model.source);
    next.updateDOM(wrap, view as unknown as EditorView);
    expect(cell(wrap, 1, 0)).toBe(before); // same node, not destroyed/recreated
    expect(document.activeElement).toBe(before); // focus never left
  });

  it("updateDOM applies alignment changes in place (focused node preserved)", () => {
    const { view, wrap } = setup(EDIT_DOC);
    cell(wrap, 0, 1).focus();
    const m1 = parseTableModel(view.state, tableNode(view.state))!;
    const edit = setAlignEdit(view.state, m1, 1, "center")!;
    view.dispatch({ changes: edit });
    const before = cell(wrap, 0, 1);
    const m2 = parseTableModel(view.state, tableNode(view.state))!;
    const next = new TableWidget(toDisplay(view.state, m2), m2.source);
    next.updateDOM(wrap, view as unknown as EditorView);
    expect(cell(wrap, 0, 1)).toBe(before); // shape unchanged → in-place
    expect(cell(wrap, 0, 1).style.textAlign).toBe("center");
  });

  it("updateDOM rebuilds when the table shape changes (add column)", () => {
    const { view, wrap } = setup(EDIT_DOC);
    const m1 = parseTableModel(view.state, tableNode(view.state))!;
    const changes = addColumnEdit(view.state, m1)!;
    view.dispatch({ changes });
    const m2 = parseTableModel(view.state, tableNode(view.state))!;
    const next = new TableWidget(toDisplay(view.state, m2), m2.source);
    next.updateDOM(wrap, view as unknown as EditorView);
    expect(wrap.querySelectorAll("thead th").length).toBe(3);
    expect(wrap.querySelectorAll("tbody tr")[0].children.length).toBe(3);
  });
});

function key(el: HTMLElement, init: KeyboardEventInit): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
}

const NAV_DOC = "| a | b |\n| --- | --- |\n| 1 | 2 |\n\ntail";

describe("TableWidget keyboard", () => {
  it("Tab moves focus to the next cell", () => {
    const { wrap } = setup(NAV_DOC);
    const first = cell(wrap, 0, 0);
    first.focus();
    key(first, { key: "Tab" });
    expect(document.activeElement).toBe(cell(wrap, 0, 1));
  });

  it("Shift-Tab moves focus to the previous cell", () => {
    const { wrap } = setup(NAV_DOC);
    const second = cell(wrap, 0, 1);
    second.focus();
    key(second, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(cell(wrap, 0, 0));
  });

  it("Enter inserts a row below the current one", () => {
    const { view, wrap } = setup(NAV_DOC);
    key(cell(wrap, 1, 0), { key: "Enter" });
    expect(view.state.doc.toString()).toBe("| a | b |\n| --- | --- |\n| 1 | 2 |\n|   |   |\n\ntail");
  });

  it("Tab on the last cell appends a row", () => {
    const { view, wrap } = setup(NAV_DOC);
    const last = cell(wrap, 1, 1);
    last.focus();
    key(last, { key: "Tab" });
    expect(view.state.doc.toString()).toContain("| 1 | 2 |\n|   |   |");
  });

  it("Escape moves the CM selection past the table", () => {
    const { view, wrap } = setup(NAV_DOC);
    key(cell(wrap, 1, 0), { key: "Escape" });
    const tableEnd = NAV_DOC.indexOf("\n\ntail");
    expect(view.state.selection.main.head).toBe(tableEnd + 1);
  });

  it("Mod-/ flips the block to raw source", () => {
    const { view, wrap } = setup(NAV_DOC);
    key(cell(wrap, 1, 0), { key: "/", metaKey: true });
    expect(view.state.selection.main.head).toBe(0); // selection inside table = reveal
  });
});

// FIR-6: vertical arrows must move between rows in the same column, not run
// the browser's default within-cell caret movement.
const VNAV_DOC = "| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |\n\ntail";

describe("TableWidget vertical arrow navigation", () => {
  it("ArrowDown moves to the same column one row down", () => {
    const { wrap } = setup(VNAV_DOC);
    cell(wrap, 1, 0).focus();
    key(cell(wrap, 1, 0), { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell(wrap, 2, 0));
  });

  it("ArrowUp moves to the same column one row up", () => {
    const { wrap } = setup(VNAV_DOC);
    cell(wrap, 2, 1).focus();
    key(cell(wrap, 2, 1), { key: "ArrowUp" });
    expect(document.activeElement).toBe(cell(wrap, 1, 1));
  });

  it("ArrowUp on the header row clamps (stays put, no within-cell jump)", () => {
    const { wrap } = setup(VNAV_DOC);
    const header = cell(wrap, 0, 0);
    header.focus();
    const e = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowUp" });
    header.dispatchEvent(e);
    expect(document.activeElement).toBe(header);
    expect(e.defaultPrevented).toBe(true);
  });

  it("ArrowDown on the last row exits below the table", () => {
    const { view, wrap } = setup(VNAV_DOC);
    cell(wrap, 2, 0).focus();
    key(cell(wrap, 2, 0), { key: "ArrowDown" });
    const tableEnd = VNAV_DOC.indexOf("\n\ntail");
    expect(view.state.selection.main.head).toBe(tableEnd + 1);
  });

  it("preserves the caret column offset when moving rows", () => {
    const doc = "| name | x |\n| --- | --- |\n| abcd | 1 |\n| wxyz | 2 |\n\ntail";
    const { wrap } = setup(doc);
    const from = cell(wrap, 1, 0); // "abcd"
    from.focus();
    const sel = document.getSelection()!;
    const range = document.createRange();
    range.setStart(from.firstChild!, 2); // caret between "ab" and "cd"
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    key(from, { key: "ArrowDown" });
    expect(document.activeElement).toBe(cell(wrap, 2, 0)); // "wxyz"
    expect(document.getSelection()!.focusOffset).toBe(2); // same column offset
  });
});

// FIR-7 regression guard: the scroll pin (commitCell) must not revert an
// intentional scrollIntoView that follows shortly after — e.g. typing in the
// last cell then immediately pressing ArrowDown/Escape to exit below the table.
describe("TableWidget scroll pin does not fight intentional scroll", () => {
  afterEach(() => vi.useRealTimers());

  it("an exit scroll right after a cell edit survives the pin window", () => {
    vi.useFakeTimers();
    const { view, wrap } = setup(VNAV_DOC);
    const td = cell(wrap, 2, 0); // last body row
    td.focus();
    typeInto(td, "9"); // commit → pinScroll starts its rAF loop (top = 0)
    key(td, { key: "ArrowDown" }); // last row → exitBelow → scrollIntoView (cancels pin)
    (view.scrollDOM as unknown as { scrollTop: number }).scrollTop = 500; // CM scrolls to exit
    vi.runAllTimers(); // flush any pending pin frames
    expect(view.scrollDOM.scrollTop).toBe(500); // pin was cancelled, exit scroll kept
  });
});

describe("exitTableSource (CM Mod-/ in raw mode)", () => {
  it("jumps past the table when the caret is inside it", () => {
    const view = new FakeView(NAV_DOC);
    view.dispatch({ selection: { anchor: 4 } });
    expect(exitTableSource(view as never)).toBe(true);
    expect(view.state.selection.main.head).toBe(NAV_DOC.indexOf("\n\ntail") + 1);
  });

  it("works with the caret at exactly table.from (where ⌘/ from the widget lands it)", () => {
    const view = new FakeView(NAV_DOC);
    view.dispatch({ selection: { anchor: 0 } });
    expect(exitTableSource(view as never)).toBe(true);
    expect(view.state.selection.main.head).toBe(NAV_DOC.indexOf("\n\ntail") + 1);
  });

  it("returns false when the caret is outside any table", () => {
    const view = new FakeView(NAV_DOC);
    view.dispatch({ selection: { anchor: NAV_DOC.length } });
    expect(exitTableSource(view as never)).toBe(false);
  });
});

function clickButton(wrap: HTMLElement, action: string): void {
  const btn = wrap.querySelector<HTMLElement>(`button[data-action="${action}"]`)!;
  btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

const BAR_DOC = "| a | b |\n| --- | --- |\n| 1 | 2 |\n\ntail";

describe("TableWidget toolbar", () => {
  it("renders the toolbar buttons", () => {
    const { wrap } = setup(BAR_DOC);
    const actions = Array.from(wrap.querySelectorAll<HTMLElement>("button[data-action]")).map(
      (b) => b.dataset.action
    );
    expect(actions).toEqual(["row", "col", "left", "center", "right", "source"]);
  });

  it("add-column appends an empty column to every line", () => {
    const { view, wrap } = setup(BAR_DOC);
    clickButton(wrap, "col");
    expect(view.state.doc.toString()).toBe(
      "| a | b |   |\n| --- | --- | --- |\n| 1 | 2 |   |\n\ntail"
    );
  });

  it("add-row inserts after the focused row", () => {
    const { view, wrap } = setup(BAR_DOC);
    cell(wrap, 0, 0).focus(); // focusin sets activeRow=0 → insert after header
    clickButton(wrap, "row");
    expect(view.state.doc.toString()).toBe(
      "| a | b |\n| --- | --- |\n|   |   |\n| 1 | 2 |\n\ntail"
    );
  });

  it("alignment buttons rewrite the focused column's delimiter cell", () => {
    const { view, wrap } = setup(BAR_DOC);
    cell(wrap, 1, 1).focus(); // activeCol=1
    clickButton(wrap, "center");
    expect(view.state.doc.toString()).toBe("| a | b |\n| --- | :---: |\n| 1 | 2 |\n\ntail");
  });

  it("clicking the active alignment clears it", () => {
    const { view, wrap } = setup("| a |\n| :---: |\n| 1 |\n\ntail");
    cell(wrap, 1, 0).focus();
    clickButton(wrap, "center");
    expect(view.state.doc.toString()).toBe("| a |\n| --- |\n| 1 |\n\ntail");
  });

  it("the source button reveals raw pipes", () => {
    const { view, wrap } = setup(BAR_DOC);
    clickButton(wrap, "source");
    expect(view.state.selection.main.head).toBe(0);
  });
});
