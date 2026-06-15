import { EditorSelection, type EditorState, type TransactionSpec } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { exitTableSource } from "./render/table/commands";

/** Innermost ancestor of [from,to] with the given node name, or null. */
function enclosingNode(state: EditorState, from: number, to: number, name: string): SyntaxNode | null {
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(from, 1); n; n = n.parent) {
    if (n.name === name && n.from <= from && n.to >= to) return n;
  }
  return null;
}

/**
 * Toggle an inline mark: if the selection sits inside an existing `nodeName`,
 * strip its markers; otherwise wrap the selection in `marker` pairs.
 * Pure: returns a TransactionSpec, so it's testable without a view.
 */
export function toggleMarkSpec(state: EditorState, mark: string, nodeName: string): TransactionSpec {
  const len = mark.length;
  return state.changeByRange((range) => {
    const node = enclosingNode(state, range.from, range.to, nodeName);
    if (node) {
      const contentEnd = node.to - len;
      // Map a position through both marker deletions: clamp anything inside
      // or past the closing marker to the content end, then shift left by the
      // opening marker, never landing before the node start.
      const mapPos = (p: number) => Math.max(node.from, Math.min(p, contentEnd) - len);
      return {
        changes: [
          { from: node.from, to: node.from + len },
          { from: contentEnd, to: node.to },
        ],
        range: EditorSelection.range(mapPos(range.anchor), mapPos(range.head)),
      };
    }
    return {
      changes: [
        { from: range.from, insert: mark },
        { from: range.to, insert: mark },
      ],
      range: EditorSelection.range(range.anchor + len, range.head + len),
    };
  });
}

/** Wrap the selection as [text](url) and leave "url" selected for typing over. */
export function insertLinkSpec(state: EditorState): TransactionSpec {
  return state.changeByRange((range) => {
    const text = state.doc.sliceString(range.from, range.to);
    const insert = `[${text}](url)`;
    const urlFrom = range.from + text.length + 3; // past "[text]("
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(urlFrom, urlFrom + 3),
    };
  });
}

function run(spec: (s: EditorState) => TransactionSpec) {
  return (view: EditorView): boolean => {
    view.dispatch(spec(view.state), { userEvent: "input" });
    return true;
  };
}

export const markdownKeymap = keymap.of([
  { key: "Mod-b", run: run((s) => toggleMarkSpec(s, "**", "StrongEmphasis")) },
  { key: "Mod-i", run: run((s) => toggleMarkSpec(s, "*", "Emphasis")) },
  { key: "Mod-`", run: run((s) => toggleMarkSpec(s, "`", "InlineCode")) },
  { key: "Mod-k", run: run(insertLinkSpec) },
  { key: "Mod-/", run: exitTableSource },
]);
