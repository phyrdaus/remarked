import { Compartment, type EditorState } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

export const focusCompartment = new Compartment();
export const typewriterCompartment = new Compartment();

const dimLine = Decoration.line({ class: "cm-rm-dim" });

// Pathological documents (thousands of lines, no blank line) would otherwise
// make every selection change scan the whole doc.
const MAX_PARAGRAPH_SCAN = 400;

/** Contiguous non-blank lines around the main cursor = the "current paragraph". */
function paragraphBounds(state: EditorState): { from: number; to: number } {
  const doc = state.doc;
  const cur = doc.lineAt(state.selection.main.head);
  let first = cur.number;
  let last = cur.number;
  while (first > 1 && cur.number - first < MAX_PARAGRAPH_SCAN && doc.line(first - 1).text.trim() !== "") first--;
  while (last < doc.lines && last - cur.number < MAX_PARAGRAPH_SCAN && doc.line(last + 1).text.trim() !== "") last++;
  return { from: doc.line(first).from, to: doc.line(last).to };
}

/** Dim every line outside the current paragraph. */
export const focusMode = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.compute(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged) this.decorations = this.compute(u.view);
    }
    compute(view: EditorView): DecorationSet {
      const { from, to } = paragraphBounds(view.state);
      const ranges = [];
      for (const vr of view.visibleRanges) {
        for (let pos = vr.from; pos <= vr.to; ) {
          const line = view.state.doc.lineAt(pos);
          if (line.to < from || line.from > to) ranges.push(dimLine.range(line.from));
          pos = line.to + 1;
        }
      }
      return Decoration.set(ranges, true);
    }
  },
  { decorations: (v) => v.decorations }
);

/** Keep the cursor line vertically centered while typing. */
export const typewriterMode = EditorView.updateListener.of((u) => {
  if (!u.selectionSet || !u.transactions.some((tr) => tr.isUserEvent("input") || tr.isUserEvent("delete"))) return;
  const head = u.state.selection.main.head;
  // Dispatching from a listener must be deferred.
  setTimeout(() => {
    u.view.dispatch({ effects: EditorView.scrollIntoView(head, { y: "center" }) });
  }, 0);
});
