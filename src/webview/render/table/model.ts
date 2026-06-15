import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

export type ColumnAlign = "left" | "center" | "right" | null;

export interface CellRange {
  /** Trimmed content range. Empty cells have from === to (an insertion point). */
  from: number;
  to: number;
  /**
   * True when the row has fewer cells than the table: there is no source for
   * this cell yet; from/to anchor at the row end and writing it requires
   * structural pipes (see edits.ts).
   */
  virtual: boolean;
}

export interface RowModel {
  from: number;
  to: number;
  /** Always exactly `columns` entries — short rows are padded with virtual cells. */
  cells: CellRange[];
  trailingPipe: boolean;
}

export interface TableModel {
  from: number;
  to: number;
  /** Exact doc slice [from, to): widget identity and staleness guard. */
  source: string;
  columns: number;
  aligns: ColumnAlign[];
  /** rows[0] is the header row; the delimiter line is kept separately. */
  rows: RowModel[];
  delimiter: RowModel;
  /** Text between line start and each row ("> ", indentation) — reused for inserted rows. */
  rowPrefix: string;
}

interface ParsedRow {
  cells: Array<{ from: number; to: number }>;
  trailingPipe: boolean;
}

function emptyCell(offset: number, areaStart: number, pipeIdx: number): { from: number; to: number } {
  // Insertion point one space after the opening pipe when there is room, so
  // "|  |" edits to "| x |" rather than "|x  |".
  const at = offset + Math.min(areaStart + 1, pipeIdx);
  return { from: at, to: at };
}

/**
 * Faithful mirror of @lezer/markdown's parseRow: split a row line into cell
 * content ranges honoring backslash escapes (an escaped pipe or space is
 * content). Offsets are absolute: `text` is the doc slice starting at `offset`.
 * Unlike the lezer parser, empty cells yield an insertion-point range instead
 * of being dropped — the widget needs a slot for every column.
 */
export function parseRowCells(text: string, offset: number): ParsedRow {
  const cells: Array<{ from: number; to: number }> = [];
  let first = true;
  let cellStart = -1;
  let cellEnd = -1;
  let esc = false;
  let areaStart = 0;
  let trailingPipe = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 124 /* '|' */ && !esc) {
      if (!first || cellStart > -1) {
        cells.push(
          cellStart > -1
            ? { from: offset + cellStart, to: offset + cellEnd }
            : emptyCell(offset, areaStart, i)
        );
      }
      first = false;
      cellStart = cellEnd = -1;
      areaStart = i + 1;
      trailingPipe = true;
    } else if (esc || (ch !== 32 /* space */ && ch !== 9 /* tab */)) {
      if (cellStart < 0) cellStart = i;
      cellEnd = i + 1;
      trailingPipe = false;
    }
    esc = !esc && ch === 92 /* '\' */;
  }
  if (cellStart > -1) cells.push({ from: offset + cellStart, to: offset + cellEnd });
  return { cells, trailingPipe };
}

function alignOf(spec: string): ColumnAlign {
  const left = spec.startsWith(":");
  const right = spec.endsWith(":");
  return left && right ? "center" : right ? "right" : left ? "left" : null;
}

/** Inline HTML anywhere in the table makes cell edits unmappable. */
function containsHtml(table: SyntaxNode): boolean {
  const cur = table.cursor();
  if (!cur.firstChild()) return false;
  do {
    if (cur.name === "HTMLTag" || cur.name === "HTMLBlock") return true;
  // Pre-order walk: every node outside the table subtree starts at or after
  // table.to, so this guard is what bounds the traversal to the table.
  } while (cur.next() && cur.from < table.to);
  return false;
}

/**
 * Build the cell ↔ source map for a Table node. Returns null when the table
 * cannot be mapped safely (inline HTML, body rows wider than the header) —
 * the caller must leave the source untouched and render it raw instead.
 * Spec: never corrupt the document.
 */
export function parseTableModel(state: EditorState, table: SyntaxNode): TableModel | null {
  if (table.name !== "Table") return null;
  if (containsHtml(table)) return null;

  const headerNode = table.getChild("TableHeader");
  // Direct TableDelimiter child of Table = the |---|---| line (the 1-char
  // pipe delimiters live inside TableHeader/TableRow, not here).
  const delimiterNode = table.getChild("TableDelimiter");
  if (!headerNode || !delimiterNode) return null;

  const rowAt = (from: number, to: number): RowModel => {
    const parsed = parseRowCells(state.doc.sliceString(from, to), from);
    return {
      from,
      to,
      cells: parsed.cells.map((c) => ({ ...c, virtual: false })),
      trailingPipe: parsed.trailingPipe,
    };
  };

  const header = rowAt(headerNode.from, headerNode.to);
  const delimiter = rowAt(delimiterNode.from, delimiterNode.to);
  const columns = header.cells.length;
  if (columns === 0 || delimiter.cells.length !== columns) return null;

  const aligns = delimiter.cells.map((c) => alignOf(state.doc.sliceString(c.from, c.to)));

  const rows: RowModel[] = [header];
  for (const rowNode of table.getChildren("TableRow")) {
    const row = rowAt(rowNode.from, rowNode.to);
    // GFM silently truncates extra cells — invisible data is exactly what a
    // structural edit would corrupt, so refuse the widget entirely.
    if (row.cells.length > columns) return null;
    while (row.cells.length < columns) {
      row.cells.push({ from: row.to, to: row.to, virtual: true });
    }
    rows.push(row);
  }

  const headerLine = state.doc.lineAt(header.from);
  return {
    from: table.from,
    to: table.to,
    source: state.doc.sliceString(table.from, table.to),
    columns,
    aligns,
    rows,
    delimiter,
    rowPrefix: state.doc.sliceString(headerLine.from, header.from),
  };
}

/**
 * Cell text as shown in the widget: escaped pipes become literal pipes.
 * Inverse of `toCellSource` in edits.ts.
 */
export function displayCellText(state: EditorState, cell: CellRange): string {
  return state.doc.sliceString(cell.from, cell.to).replace(/\\\|/g, "|");
}
