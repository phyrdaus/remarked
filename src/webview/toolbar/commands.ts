import type { EditorState, TransactionSpec } from "@codemirror/state";

/** Set (or clear) the ATX heading level on the cursor's line. */
export function setHeadingSpec(state: EditorState, level: 1 | 2 | 3): TransactionSpec {
  const line = state.doc.lineAt(state.selection.main.head);
  const m = /^(#{1,6})\s+/.exec(line.text);
  const currentLevel = m ? m[1].length : 0;
  const content = m ? line.text.slice(m[0].length) : line.text;
  const replacement = currentLevel === level ? content : "#".repeat(level) + " " + content;
  return {
    changes: { from: line.from, to: line.to, insert: replacement },
    selection: { anchor: line.from + replacement.length },
  };
}

/** [firstLineNumber, lastLineNumber] spanned by the main selection. */
function selectionLineRange(state: EditorState): [number, number] {
  const sel = state.selection.main;
  return [state.doc.lineAt(sel.from).number, state.doc.lineAt(sel.to).number];
}

/** Apply `fn` to each line the main selection touches, building one change set. */
function mapSelectedLines(
  state: EditorState,
  fn: (text: string, indexInSelection: number) => string
): TransactionSpec {
  const [first, last] = selectionLineRange(state);
  const changes: { from: number; to: number; insert: string }[] = [];
  for (let n = first, i = 0; n <= last; n++, i++) {
    const line = state.doc.line(n);
    const next = fn(line.text, i);
    if (next !== line.text) changes.push({ from: line.from, to: line.to, insert: next });
  }
  return { changes };
}

const LIST_MARKER = /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/;

/** Toggle a `> ` quote prefix across the selected lines. */
export function toggleBlockquoteSpec(state: EditorState): TransactionSpec {
  const [first, last] = selectionLineRange(state);
  let allQuoted = true;
  for (let n = first; n <= last; n++) {
    const t = state.doc.line(n).text;
    if (t.trim() !== "" && !/^\s*>\s?/.test(t)) allQuoted = false;
  }
  return mapSelectedLines(state, (t) =>
    allQuoted ? t.replace(/^(\s*)>\s?/, "$1") : "> " + t
  );
}

export type ListKind = "bullet" | "ordered" | "task";

/** Toggle/convert the selected lines to a bullet, ordered, or task list. */
export function toggleListSpec(state: EditorState, kind: ListKind): TransactionSpec {
  const [first, last] = selectionLineRange(state);
  const isKind = (t: string) =>
    kind === "bullet"
      ? /^\s*[-*+]\s+(?!\[[ xX]\]\s)/.test(t)
      : kind === "task"
        ? /^\s*[-*+]\s+\[[ xX]\]\s/.test(t)
        : /^\s*\d+[.)]\s+/.test(t);
  let allKind = true;
  for (let n = first; n <= last; n++) {
    const t = state.doc.line(n).text;
    if (t.trim() !== "" && !isKind(t)) allKind = false;
  }
  let seq = 0;
  return mapSelectedLines(state, (t) => {
    if (t.trim() === "") return t; // never mark blank lines
    const m = LIST_MARKER.exec(t);
    const indent = m ? m[1] : (/^\s*/.exec(t)?.[0] ?? "");
    const body = m ? t.slice(m[0].length) : t.slice(indent.length);
    if (allKind) return indent + body;
    const mk = kind === "bullet" ? "- " : kind === "task" ? "- [ ] " : `${++seq}. `;
    return indent + mk + body;
  });
}

/** Insert a starter table block after the cursor's line; caret lands past it. */
export function insertTableSpec(state: EditorState): TransactionSpec {
  const line = state.doc.lineAt(state.selection.main.head);
  const table = "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |";
  const lead = line.text.trim() === "" ? "\n" : "\n\n";
  const block = lead + table + "\n";
  return {
    changes: { from: line.to, insert: block },
    selection: { anchor: line.to + block.length },
  };
}

/** Insert a thematic break on its own line. */
export function insertHorizontalRuleSpec(state: EditorState): TransactionSpec {
  const line = state.doc.lineAt(state.selection.main.head);
  const lead = line.text.trim() === "" ? "" : "\n\n";
  const block = lead + "---\n";
  return {
    changes: { from: line.to, insert: block },
    selection: { anchor: line.to + block.length },
  };
}

/** Wrap the selection (or the empty cursor) in a fenced code block. */
export function wrapCodeBlockSpec(state: EditorState): TransactionSpec {
  const { from, to } = state.selection.main;
  const body = state.doc.sliceString(from, to);
  const inner = body.endsWith("\n") ? body : body + "\n";
  const insert = "```\n" + inner + "```";
  return {
    changes: { from, to, insert },
    selection: { anchor: from + 4 }, // just inside the opening fence
  };
}
