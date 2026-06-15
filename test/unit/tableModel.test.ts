import { describe, it, expect } from "vitest";
import { makeModel } from "./tableHelpers";
import {
  parseRowCells,
  displayCellText,
} from "../../src/webview/render/table/model";

const TABLE = "| Name | Age |\n| --- | ---: |\n| Ada | 36 |\n| Bob | 42 |";

describe("parseRowCells", () => {
  it("splits a piped row into trimmed cell ranges", () => {
    const { cells, trailingPipe } = parseRowCells("| a | bb |", 0);
    expect(cells).toEqual([
      { from: 2, to: 3 },
      { from: 6, to: 8 },
    ]);
    expect(trailingPipe).toBe(true);
  });

  it("handles rows without leading/trailing pipes", () => {
    const { cells, trailingPipe } = parseRowCells("a | b", 0);
    expect(cells).toEqual([
      { from: 0, to: 1 },
      { from: 4, to: 5 },
    ]);
    expect(trailingPipe).toBe(false);
  });

  it("gives empty cells an insertion point instead of dropping them", () => {
    const { cells } = parseRowCells("| a |  | c |", 0);
    expect(cells).toHaveLength(3);
    expect(cells[1].from).toBe(cells[1].to); // insertion point between the pipes
    expect(cells[1].from).toBeGreaterThan(4);
    expect(cells[1].to).toBeLessThanOrEqual(7);
  });

  it("treats escaped pipes as cell content", () => {
    const { cells } = parseRowCells("| a \\| b | c |", 0);
    expect(cells).toHaveLength(2);
    expect("| a \\| b | c |".slice(cells[0].from, cells[0].to)).toBe("a \\| b");
  });

  it("applies offsets to all ranges", () => {
    const { cells } = parseRowCells("| x |", 100);
    expect(cells).toEqual([{ from: 102, to: 103 }]);
  });
});

describe("parseTableModel", () => {
  it("maps dimensions, cells, and alignment", () => {
    const { state, model } = makeModel(TABLE);
    expect(model).not.toBeNull();
    expect(model!.columns).toBe(2);
    expect(model!.rows).toHaveLength(3); // header + 2 body rows
    expect(model!.aligns).toEqual([null, "right"]);
    const slice = (c: { from: number; to: number }) => state.doc.sliceString(c.from, c.to);
    expect(slice(model!.rows[0].cells[0])).toBe("Name");
    expect(slice(model!.rows[2].cells[1])).toBe("42");
    expect(model!.source).toBe(TABLE);
  });

  it("parses all three alignment forms", () => {
    const { model } = makeModel("| a | b | c |\n| :--- | :---: | --- |\n| 1 | 2 | 3 |");
    expect(model!.aligns).toEqual(["left", "center", null]);
  });

  it("pads short rows with virtual cells anchored at the row end", () => {
    const { model } = makeModel("| a | b |\n| --- | --- |\n| only |");
    const cell = model!.rows[1].cells[1]; // rows[0] is the header; one body row → rows[1]
    expect(cell.virtual).toBe(true);
    expect(cell.from).toBe(cell.to);
    expect(cell.to).toBe(model!.rows[1].to);
  });

  it("returns null when a body row is wider than the header (hidden cells)", () => {
    const { model } = makeModel("| a |\n| --- |\n| x | y |");
    expect(model).toBeNull();
  });

  it("returns null when a cell contains inline HTML", () => {
    const { model } = makeModel("| a <b>x</b> | c |\n| --- | --- |\n| 1 | 2 |");
    expect(model).toBeNull();
  });

  it("captures the row prefix for tables inside blockquotes", () => {
    const { model } = makeModel("> | a | b |\n> | --- | --- |\n> | 1 | 2 |");
    expect(model).not.toBeNull();
    expect(model!.rowPrefix).toBe("> ");
  });

  it("handles pipe-less continuation rows as single-cell rows", () => {
    const { state, model } = makeModel("| a | b |\n| --- | --- |\ntail");
    expect(model).not.toBeNull();
    const row = model!.rows[1]; // header + one continuation row
    expect(state.doc.sliceString(row.cells[0].from, row.cells[0].to)).toBe("tail");
    expect(row.cells[1].virtual).toBe(true);
  });
});

describe("displayCellText", () => {
  it("unescapes pipes for display", () => {
    const { state, model } = makeModel("| a \\| b | c |\n| --- | --- |\n| 1 | 2 |");
    expect(displayCellText(state, model!.rows[0].cells[0])).toBe("a | b");
  });
});
