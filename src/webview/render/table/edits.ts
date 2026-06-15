// Callers must pass a model derived from the CURRENT document state.
// Given that, a null return always means "could not prove safe" — never "stale model".

import type { EditorState } from "@codemirror/state";
import { parseRowCells, type ColumnAlign, type TableModel } from "./model";

export interface TextEdit {
  from: number;
  to: number;
  insert: string;
}

/**
 * Cell DOM text → cell source: newlines cannot exist in a row, pipes must be escaped.
 * Inverse of `displayCellText` in model.ts.
 */
export function toCellSource(text: string): string {
  return text.replace(/[\r\n]+/g, " ").replace(/\|/g, "\\|");
}

/** The model must describe the CURRENT document — reject anything stale. */
function stale(state: EditorState, model: TableModel): boolean {
  return state.doc.sliceString(model.from, model.to) !== model.source;
}

/**
 * Replace one cell's content. Returns null when the write cannot be PROVEN
 * safe — the caller must fall back to source editing, never apply a guess.
 * Proof: re-parse the edited row and require the target cell to read back
 * exactly (spec: every widget validates its edit round-trips).
 */
export function cellEdit(
  state: EditorState,
  model: TableModel,
  row: number,
  col: number,
  displayText: string
): TextEdit | null {
  if (stale(state, model)) return null;
  const r = model.rows[row];
  const cell = r?.cells[col];
  if (!r || !cell) return null;
  const src = toCellSource(displayText);

  let edit: TextEdit;
  if (cell.virtual) {
    // The row is shorter than the table: append the missing cells up to `col`,
    // normalizing this row to a trailing pipe.
    const real = r.cells.filter((c) => !c.virtual).length;
    let insert = r.trailingPipe ? "" : " |";
    for (let k = real; k <= col; k++) insert += k === col ? ` ${src} |` : "   |";
    edit = { from: r.to, to: r.to, insert };
  } else {
    edit = { from: cell.from, to: cell.to, insert: src };
  }

  const newRow =
    state.doc.sliceString(r.from, edit.from) + edit.insert + state.doc.sliceString(edit.to, r.to);
  const reparsed = parseRowCells(newRow, 0);
  if (reparsed.cells.length > model.columns) return null;
  const target = reparsed.cells[col];
  const expected = src.trim(); // the parse trims cell-edge whitespace
  if (expected === "") {
    // An empty cell may parse to no cell node at all (insertion-point only),
    // hence the dual condition: accept either absent or whitespace-only.
    if (target && newRow.slice(target.from, target.to).trim() !== "") return null;
  } else if (!target || newRow.slice(target.from, target.to) !== expected) {
    return null;
  }
  return edit;
}

/** Insert an empty row after `afterRow` (0 = header → first body position). */
export function addRowEdit(state: EditorState, model: TableModel, afterRow: number): TextEdit | null {
  if (stale(state, model)) return null;
  const anchor = afterRow === 0 ? model.delimiter.to : model.rows[afterRow]?.to;
  if (anchor === undefined) return null;
  const insert = "\n" + model.rowPrefix + "|" + "   |".repeat(model.columns);
  return { from: anchor, to: anchor, insert };
}

/** Append an empty column: one change per row plus the delimiter line. */
export function addColumnEdit(state: EditorState, model: TableModel): TextEdit[] | null {
  if (stale(state, model)) return null;
  const changes: TextEdit[] = model.rows.map((r) => ({
    from: r.to,
    to: r.to,
    insert: r.trailingPipe ? "   |" : " |   |",
  }));
  changes.push({
    from: model.delimiter.to,
    to: model.delimiter.to,
    insert: model.delimiter.trailingPipe ? " --- |" : " | --- |",
  });
  return changes;
}

const ALIGN_SPEC: Record<string, string> = { left: ":---", center: ":---:", right: "---:" };

/** Rewrite one column's delimiter cell; passing null clears the alignment. */
export function setAlignEdit(
  state: EditorState,
  model: TableModel,
  col: number,
  align: ColumnAlign
): TextEdit | null {
  if (stale(state, model)) return null;
  const cell = model.delimiter.cells[col];
  if (!cell || cell.virtual || cell.from === cell.to) return null;
  return { from: cell.from, to: cell.to, insert: align ? ALIGN_SPEC[align] : "---" };
}
