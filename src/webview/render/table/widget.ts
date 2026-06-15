import { Decoration, WidgetType, type EditorView } from "@codemirror/view";
import type { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode, SyntaxNodeRef } from "@lezer/common";
import { anyLineRevealed } from "../reveal";
import { parseTableModel, displayCellText, type ColumnAlign, type TableModel } from "./model";
import { cellEdit, addRowEdit, addColumnEdit, setAlignEdit } from "./edits";
import type { HandlerCtx } from "../buildDecorations"; // type-only: no runtime cycle

/** Pure display data; offsets are re-derived from the live tree at event time. */
export interface TableDisplay {
  aligns: ColumnAlign[];
  /** rows[0] is the header. */
  rows: string[][];
}

export function toDisplay(state: EditorState, model: TableModel): TableDisplay {
  return {
    aligns: model.aligns,
    rows: model.rows.map((r) => r.cells.map((c) => displayCellText(state, c))),
  };
}

export class TableWidget extends WidgetType {
  constructor(readonly display: TableDisplay, readonly source: string) {
    super();
  }

  override eq(other: TableWidget): boolean {
    // The display is a pure function of the source, so source identity suffices.
    return this.source === other.source;
  }

  override toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-rm-table-wrap";
    wrap.setAttribute("contenteditable", "false");
    renderTable(wrap, this.display);
    wireTableEvents(wrap, view);
    return wrap;
  }

  override updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    if (!dom.classList.contains("cm-rm-table-wrap")) return false;
    const active = dom.ownerDocument.activeElement;
    const focused =
      active instanceof HTMLElement && dom.contains(active) ? cellOf(active) : null;

    // Fast path (the per-keystroke case): when the table shape is unchanged,
    // reconcile cell text/alignment in place without destroying any nodes. The
    // focused cell's node is left intact — its live text and native caret are
    // untouched — so editing a cell in a long table no longer scrolls the
    // document (FIR-7). A full rebuild + refocus scrolls even with
    // preventScroll, because re-establishing the DOM selection scrolls to it.
    if (reconcileInPlace(dom, this.display, focused)) return true;

    // Shape changed (add/remove row or column): rebuild. These are discrete
    // toolbar/Tab actions, not per-keystroke, so refocusing is acceptable. The
    // focused cell must keep its live edge whitespace across the rebuild.
    const keep = focused
      ? {
          row: Number(focused.dataset.row),
          col: Number(focused.dataset.col),
          text: focused.textContent ?? "",
          caret: caretOffsetIn(focused),
        }
      : null;
    renderTable(dom, this.display); // listeners are delegated on `dom` and survive
    if (keep) {
      const target = dom.querySelector<HTMLElement>(
        `[data-row="${keep.row}"][data-col="${keep.col}"]`
      );
      if (target) {
        target.textContent = keep.text;
        focusCellAt(dom, keep.row, keep.col, keep.caret, /* preventScroll */ true);
      }
    }
    return true;
  }

  override ignoreEvent(): boolean {
    return true; // the widget owns all interaction; CM must not move selection on clicks
  }
}

const TOOLBAR_BUTTONS: Array<[action: string, label: string, title: string]> = [
  ["row", "＋row", "Add row below"],
  ["col", "＋col", "Add column"],
  ["left", "⇤", "Align column left"],
  ["center", "⇹", "Align column center"],
  ["right", "⇥", "Align column right"],
  ["source", "</>", "Edit as markdown (⌘/)"],
];

function renderToolbar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "cm-rm-table-toolbar";
  bar.setAttribute("contenteditable", "false");
  for (const [action, label, title] of TOOLBAR_BUTTONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = action;
    btn.textContent = label;
    btn.title = title;
    bar.appendChild(btn);
  }
  return bar;
}

function renderTable(wrap: HTMLElement, display: TableDisplay): void {
  wrap.replaceChildren();
  const table = document.createElement("table");
  table.className = "cm-rm-table";
  const [headerCells, ...bodyRows] = display.rows;
  const thead = document.createElement("thead");
  thead.appendChild(renderRow(headerCells, 0, "th", display.aligns));
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  bodyRows.forEach((cells, i) => tbody.appendChild(renderRow(cells, i + 1, "td", display.aligns)));
  table.appendChild(tbody);
  wrap.append(renderToolbar(), table);
}

function renderRow(
  cells: string[],
  row: number,
  tag: "th" | "td",
  aligns: ColumnAlign[]
): HTMLTableRowElement {
  const tr = document.createElement("tr");
  cells.forEach((text, col) => {
    const cell = document.createElement(tag);
    cell.dataset.row = String(row);
    cell.dataset.col = String(col);
    const align = aligns[col];
    if (align) cell.style.textAlign = align;
    cell.textContent = text;
    // "plaintext-only" suppresses rich-paste HTML in Chromium (the only target:
    // VS Code webviews); tabIndex makes cells focusable everywhere incl. jsdom.
    cell.setAttribute("contenteditable", "plaintext-only");
    cell.tabIndex = -1;
    tr.appendChild(cell);
  });
  return tr;
}

/**
 * When the new display has the same shape as the live DOM (same row and column
 * counts), update cell text and alignment in place and return true — no node is
 * destroyed. The focused cell keeps its live text (it may hold edge whitespace
 * the source trims) but still gets alignment updates. Returns false when the
 * shape differs, so the caller falls back to a full rebuild.
 */
function reconcileInPlace(
  dom: HTMLElement,
  display: TableDisplay,
  focused: HTMLElement | null
): boolean {
  const rows = display.rows;
  const trs = dom.querySelectorAll<HTMLTableRowElement>("tr");
  if (trs.length !== rows.length) return false;
  for (let r = 0; r < rows.length; r++) {
    if (trs[r].children.length !== rows[r].length) return false;
  }
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const el = dom.querySelector<HTMLElement>(`[data-row="${r}"][data-col="${c}"]`);
      if (!el) continue;
      el.style.textAlign = display.aligns[c] ?? "";
      if (el === focused) continue; // keep the user's live text + caret
      const text = rows[r][c];
      if (el.textContent !== text) el.textContent = text;
    }
  }
  return true;
}

function cellOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target.closest<HTMLElement>("[data-row][data-col]") : null;
}

/**
 * Re-derive the table's model from the live document. Offsets captured at
 * render time go stale the moment anything earlier in the document changes,
 * so event handlers NEVER trust them — they resolve the Table node fresh.
 */
function liveModel(view: EditorView, wrap: HTMLElement): TableModel | null {
  const pos = view.posAtDOM(wrap);
  for (let n: SyntaxNode | null = syntaxTree(view.state).resolveInner(pos, 1); n; n = n.parent) {
    if (n.name === "Table") return parseTableModel(view.state, n);
  }
  return null;
}

/** Put the CM selection on the table so it reveals as raw source. */
function openSource(view: EditorView, wrap: HTMLElement): void {
  cancelPendingPin(view); // view.focus() may scroll to the revealed source
  view.dispatch({ selection: { anchor: view.posAtDOM(wrap) } });
  view.focus();
}

function appendRowAndFocus(view: EditorView, wrap: HTMLElement, afterRow: number): void {
  const model = liveModel(view, wrap);
  const edit = model && addRowEdit(view.state, model, afterRow);
  if (!edit) return;
  view.dispatch({ changes: edit, userEvent: "input" });
  // view.dispatch is synchronous: updateDOM has already rebuilt the table.
  focusCellAt(wrap, afterRow + 1, 0);
}

/** Escape: leave the widget, landing the caret on the line below the table. */
function exitBelow(view: EditorView, wrap: HTMLElement): void {
  const model = liveModel(view, wrap);
  if (!model) return;
  // A caret AT model.to still touches the table (reveal is boundary-inclusive),
  // so land one past it. At the very end of the doc there is nowhere outside
  // to land — no-op (documented residual).
  if (model.to + 1 > view.state.doc.length) return;
  cancelPendingPin(view); // let the scroll-to-exit-below survive the pin window
  view.dispatch({ selection: { anchor: model.to + 1 }, scrollIntoView: true });
  view.focus();
}

function commitCell(view: EditorView, wrap: HTMLElement, cell: HTMLElement): void {
  const model = liveModel(view, wrap);
  const edit =
    model &&
    cellEdit(view.state, model, Number(cell.dataset.row), Number(cell.dataset.col), cell.textContent ?? "");
  if (!edit) {
    // Spec: on mapping failure fall back to source for the block and log —
    // the file is never touched by a failed widget.
    console.error("remarked: table cell edit could not be mapped safely; opening source");
    openSource(view, wrap);
    return;
  }
  if (view.state.doc.sliceString(edit.from, edit.to) === edit.insert) return; // no-op echo
  // A widget-internal cell edit must NOT move the viewport. CM re-measures the
  // tall table block widget after the edit and re-anchors the viewport, so the
  // document jumps on a long table (FIR-7). There is no API to suppress that,
  // so pin scrollTop across CM's measure passes.
  const top = view.scrollDOM.scrollTop;
  view.dispatch({ changes: edit, userEvent: "input" });
  pinScroll(view, top);
}

/** In-flight pinScroll rAF handle per view, so it can be cancelled. */
const pendingPin = new WeakMap<EditorView, number>();

/**
 * Cancel an in-flight scroll pin. MUST be called before any intentional
 * scroll (exitBelow / openSource), or the pin's rAF loop would revert the
 * user's scroll-to-exit within its ~48ms window.
 */
function cancelPendingPin(view: EditorView): void {
  const handle = pendingPin.get(view);
  if (handle === undefined) return;
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(handle);
  pendingPin.delete(view);
}

/**
 * Hold the editor scroll position at `top` across CodeMirror's async re-anchor
 * following a transaction. CM re-measures the tall table block widget on the
 * animation frame after the edit and jumps the viewport; there is no API to
 * suppress that, so re-assert scrollTop synchronously, in CM's measure phase,
 * and for a couple of frames after (observed: the jump lands on the first one).
 */
function pinScroll(view: EditorView, top: number): void {
  cancelPendingPin(view); // newest edit wins; never stack loops with stale tops
  const reset = () => {
    if (view.scrollDOM.scrollTop !== top) view.scrollDOM.scrollTop = top;
  };
  reset();
  view.requestMeasure({ read: () => 0, write: reset });
  if (typeof requestAnimationFrame !== "function") return;
  let frame = 0;
  const tick = () => {
    pendingPin.delete(view);
    reset();
    if (++frame < 3) pendingPin.set(view, requestAnimationFrame(tick));
  };
  pendingPin.set(view, requestAnimationFrame(tick));
}

function caretOffsetIn(cell: HTMLElement): number {
  const sel = cell.ownerDocument.defaultView?.getSelection();
  if (!sel || sel.rangeCount === 0) return cell.textContent?.length ?? 0;
  const range = sel.getRangeAt(0);
  return cell.contains(range.startContainer) ? range.startOffset : cell.textContent?.length ?? 0;
}

export function focusCellAt(
  wrap: HTMLElement,
  row: number,
  col: number,
  offset = 0,
  preventScroll = false
): void {
  const cell = wrap.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return;
  // preventScroll matters on the per-keystroke updateDOM rebuild: the cell is
  // destroyed and re-focused, and the browser default would scroll it into
  // view, yanking the document on a long table (FIR-7).
  cell.focus({ preventScroll });
  const doc = cell.ownerDocument;
  const sel = doc.defaultView?.getSelection();
  if (!sel) return;
  const range = doc.createRange();
  const text = cell.firstChild;
  if (text && text.nodeType === Node.TEXT_NODE) {
    range.setStart(text, Math.min(offset, text.nodeValue?.length ?? 0));
  } else {
    range.setStart(cell, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function wireTableEvents(wrap: HTMLElement, view: EditorView): void {
  let composing = false;
  wrap.addEventListener("compositionstart", () => {
    composing = true;
  });
  wrap.addEventListener("compositionend", (e) => {
    composing = false;
    const cell = cellOf(e.target);
    if (cell) commitCell(view, wrap, cell);
  });
  wrap.addEventListener("input", (e) => {
    if (composing) return; // IME: commit once on compositionend
    const cell = cellOf(e.target);
    if (cell) commitCell(view, wrap, cell);
  });
  wrap.addEventListener("focusin", (e) => {
    const cell = cellOf(e.target);
    if (cell) {
      wrap.dataset.activeRow = cell.dataset.row!;
      wrap.dataset.activeCol = cell.dataset.col!;
    }
  });
  wrap.addEventListener("keydown", (e) => {
    const cell = cellOf(e.target);
    if (!cell) return;
    const row = Number(cell.dataset.row);
    if (e.key === "Tab") {
      e.preventDefault();
      const cells = Array.from(wrap.querySelectorAll<HTMLElement>("[data-row][data-col]"));
      const i = cells.indexOf(cell) + (e.shiftKey ? -1 : 1);
      if (i >= 0 && i < cells.length) {
        const next = cells[i];
        focusCellAt(wrap, Number(next.dataset.row), Number(next.dataset.col), next.textContent?.length ?? 0);
      } else if (!e.shiftKey) {
        appendRowAndFocus(view, wrap, row); // Tab past the last cell starts a new row
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      appendRowAndFocus(view, wrap, row);
    } else if (e.key === "Escape") {
      e.preventDefault();
      exitBelow(view, wrap);
    } else if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      openSource(view, wrap); // ⌘/: flip the block to raw pipe syntax (spec)
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !e.isComposing) {
      // Move between rows in the same column (FIR-6). Without this the keys run
      // the browser's default within-cell caret movement. Caret column is kept.
      // Residual: a cell with wrapped multi-line content can't be navigated
      // line-by-line internally — the explicit ask is inter-row movement.
      const col = Number(cell.dataset.col);
      const offset = caretOffsetIn(cell);
      if (e.key === "ArrowUp") {
        if (row > 0) {
          e.preventDefault();
          focusCellAt(wrap, row - 1, col, offset);
        } else {
          e.preventDefault(); // header row: clamp rather than jump within the cell
        }
      } else {
        const below = wrap.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
        e.preventDefault();
        if (below) focusCellAt(wrap, row + 1, col, offset);
        else exitBelow(view, wrap); // last row: fall out the bottom of the table
      }
    }
  });
  // Toolbar clicks must not steal focus from the active cell (the alignment
  // and add-row actions target the cell you were just editing).
  wrap.addEventListener("mousedown", (e) => {
    if (e.target instanceof HTMLElement && e.target.closest(".cm-rm-table-toolbar")) {
      e.preventDefault();
    }
  });
  wrap.addEventListener("click", (e) => {
    const btn =
      e.target instanceof HTMLElement ? e.target.closest<HTMLElement>("button[data-action]") : null;
    if (!btn) return;
    e.preventDefault();
    const model = liveModel(view, wrap);
    if (!model) return;
    const row = Number(wrap.dataset.activeRow ?? model.rows.length - 1);
    const col = Number(wrap.dataset.activeCol ?? 0);
    const action = btn.dataset.action!;
    if (action === "row") {
      appendRowAndFocus(view, wrap, row);
    } else if (action === "col") {
      const changes = addColumnEdit(view.state, model);
      if (changes) view.dispatch({ changes, userEvent: "input" });
    } else if (action === "left" || action === "center" || action === "right") {
      const next = model.aligns[col] === action ? null : (action as Exclude<ColumnAlign, null>);
      const edit = setAlignEdit(view.state, model, col, next);
      if (edit) view.dispatch({ changes: edit, userEvent: "input" });
    } else if (action === "source") {
      openSource(view, wrap);
    }
  });
}

export function handleTable(ctx: HandlerCtx, ref: SyntaxNodeRef): false | void {
  const node = ref.node;
  if (anyLineRevealed(ctx.state, node.from, node.to)) return; // raw pipes while editing
  const startLine = ctx.state.doc.lineAt(node.from);
  const endLine = ctx.state.doc.lineAt(node.to);
  // Block widgets must span whole lines; tables nested in blockquotes or
  // indentation would put the replacement mid-line — leave those raw.
  if (startLine.from !== node.from || endLine.to !== node.to) return;
  const model = parseTableModel(ctx.state, node);
  if (model === null) return; // unmappable (inline HTML, ragged rows): leave the source alone
  ctx.ranges.push(
    Decoration.replace({
      widget: new TableWidget(toDisplay(ctx.state, model), model.source),
      block: true,
    }).range(node.from, node.to)
  );
  return false;
}
