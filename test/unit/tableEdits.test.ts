import { describe, it, expect } from "vitest";
import type { EditorState } from "@codemirror/state";
import { makeModel } from "./tableHelpers";
import {
  cellEdit,
  addRowEdit,
  addColumnEdit,
  setAlignEdit,
  toCellSource,
  type TextEdit,
} from "../../src/webview/render/table/edits";

const TABLE = "| Name | Age |\n| --- | ---: |\n| Ada | 36 |\n| Bob | 42 |";

function apply(state: EditorState, changes: TextEdit | TextEdit[]): string {
  return state.update({ changes }).state.doc.toString();
}

describe("toCellSource", () => {
  it("escapes pipes and flattens newlines", () => {
    expect(toCellSource("a | b")).toBe("a \\| b");
    expect(toCellSource("a\nb")).toBe("a b");
  });
});

describe("cellEdit", () => {
  it("replaces exactly one cell's content", () => {
    const { state, model } = makeModel(TABLE);
    const edit = cellEdit(state, model!, 1, 0, "Grace"); // rows[1] = "| Ada | 36 |"
    expect(edit).not.toBeNull();
    expect(apply(state, edit!)).toBe(
      "| Name | Age |\n| --- | ---: |\n| Grace | 36 |\n| Bob | 42 |"
    );
  });

  it("writes into an empty cell at its insertion point", () => {
    const { state, model } = makeModel("| a | b |\n| --- | --- |\n| x |  |");
    const edit = cellEdit(state, model!, 1, 1, "y");
    expect(apply(state, edit!)).toBe("| a | b |\n| --- | --- |\n| x | y |");
  });

  it("escapes typed pipes so the cell stays one cell", () => {
    const { state, model } = makeModel(TABLE);
    const edit = cellEdit(state, model!, 1, 0, "a | b");
    expect(apply(state, edit!)).toContain("| a \\| b | 36 |");
  });

  it("materializes a virtual cell by extending the row", () => {
    const { state, model } = makeModel("| a | b |\n| --- | --- |\n| only |");
    const edit = cellEdit(state, model!, 1, 1, "z");
    expect(apply(state, edit!)).toBe("| a | b |\n| --- | --- |\n| only | z |");
  });

  it("materializes a virtual cell on a row without a trailing pipe", () => {
    const { state, model } = makeModel("a | b\n--- | ---\nonly");
    const edit = cellEdit(state, model!, 1, 1, "z");
    expect(apply(state, edit!)).toBe("a | b\n--- | ---\nonly | z |");
  });

  it("skips intermediate columns when materializing a far virtual cell", () => {
    const { state, model } = makeModel("| a | b | c |\n| --- | --- | --- |\n| x |");
    const edit = cellEdit(state, model!, 1, 2, "z");
    expect(apply(state, edit!)).toBe("| a | b | c |\n| --- | --- | --- |\n| x |   | z |");
  });

  it("returns null when the round-trip proof fails (trailing backslash)", () => {
    const { state, model } = makeModel(TABLE);
    // "x\" + escaped pipe would parse back as "x\ " — refuse, don't guess.
    expect(cellEdit(state, model!, 1, 0, "x\\")).toBeNull();
  });

  it("returns null for a stale model", () => {
    const { state, model } = makeModel(TABLE);
    const newer = state.update({ changes: { from: 0, to: 0, insert: "z" } }).state;
    expect(cellEdit(newer, model!, 1, 0, "Grace")).toBeNull();
  });

  it("clears a non-virtual cell to empty", () => {
    // Replacing "Ada" with "" leaves the surrounding spaces/pipes intact: "|  | 36 |".
    const { state, model } = makeModel(TABLE);
    const edit = cellEdit(state, model!, 1, 0, "");
    expect(edit).not.toBeNull();
    expect(apply(state, edit!)).toBe(
      "| Name | Age |\n| --- | ---: |\n|  | 36 |\n| Bob | 42 |"
    );
  });

  it("returns null for out-of-range row or column indices", () => {
    const { state, model } = makeModel(TABLE);
    expect(cellEdit(state, model!, 9, 0, "x")).toBeNull();
    expect(cellEdit(state, model!, 1, 9, "x")).toBeNull();
    expect(addRowEdit(state, model!, 9)).toBeNull();
  });
});

describe("addRowEdit", () => {
  it("inserts an empty row after a body row", () => {
    const { state, model } = makeModel(TABLE);
    const edit = addRowEdit(state, model!, 1); // after "| Ada | 36 |"
    expect(apply(state, edit!)).toBe(
      "| Name | Age |\n| --- | ---: |\n| Ada | 36 |\n|   |   |\n| Bob | 42 |"
    );
  });

  it("inserts after the delimiter when adding below the header", () => {
    const { state, model } = makeModel(TABLE);
    const edit = addRowEdit(state, model!, 0);
    expect(apply(state, edit!)).toBe(
      "| Name | Age |\n| --- | ---: |\n|   |   |\n| Ada | 36 |\n| Bob | 42 |"
    );
  });

  it("reuses the row prefix inside blockquotes", () => {
    const { state, model } = makeModel("> | a |\n> | --- |\n> | 1 |");
    const edit = addRowEdit(state, model!, 1);
    expect(apply(state, edit!)).toBe("> | a |\n> | --- |\n> | 1 |\n> |   |");
  });
});

describe("addColumnEdit", () => {
  it("appends an empty column to every line", () => {
    const { state, model } = makeModel("| a |\n| --- |\n| 1 |");
    const changes = addColumnEdit(state, model!);
    expect(apply(state, changes!)).toBe("| a |   |\n| --- | --- |\n| 1 |   |");
  });

  it("closes rows that lack a trailing pipe first", () => {
    const { state, model } = makeModel("a | b\n--- | ---\n1 | 2");
    const changes = addColumnEdit(state, model!);
    expect(apply(state, changes!)).toBe("a | b |   |\n--- | --- | --- |\n1 | 2 |   |");
  });
});

describe("setAlignEdit", () => {
  it("rewrites only the target delimiter cell", () => {
    const { state, model } = makeModel(TABLE);
    const edit = setAlignEdit(state, model!, 0, "center");
    expect(apply(state, edit!)).toBe(
      "| Name | Age |\n| :---: | ---: |\n| Ada | 36 |\n| Bob | 42 |"
    );
  });

  it("clears alignment with null", () => {
    const { state, model } = makeModel(TABLE);
    const edit = setAlignEdit(state, model!, 1, null);
    expect(apply(state, edit!)).toBe(
      "| Name | Age |\n| --- | --- |\n| Ada | 36 |\n| Bob | 42 |"
    );
  });

  it("returns null for an out-of-range column index", () => {
    // A valid parsed table always has delimiter cells equal to column count, so
    // a virtual/zero-width delimiter cell cannot arise from a well-formed table.
    // Out-of-range is the practical way to exercise the null guard.
    const { state, model } = makeModel("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(setAlignEdit(state, model!, 9, "left")).toBeNull();
  });
});
