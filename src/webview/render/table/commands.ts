import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

/**
 * Mod-/ while the caret is in raw table source: hop past the table so it
 * collapses back into the widget. Returns false elsewhere so the key falls
 * through (defaultKeymap binds Mod-/ to toggleComment).
 */
export function exitTableSource(view: EditorView): boolean {
  const head = view.state.selection.main.head;
  const tree = syntaxTree(view.state);
  // Resolve on both sides: at exactly table.from (where the widget's ⌘/ puts
  // the caret) side -1 resolves OUTSIDE the table; at table.to side +1 does.
  for (const side of [-1, 1] as const) {
    for (let n: SyntaxNode | null = tree.resolveInner(head, side); n; n = n.parent) {
      if (n.name !== "Table") continue;
      if (n.to + 1 > view.state.doc.length) return false; // table ends the doc: nowhere to land
      view.dispatch({ selection: { anchor: n.to + 1 }, scrollIntoView: true });
      return true;
    }
  }
  return false;
}
