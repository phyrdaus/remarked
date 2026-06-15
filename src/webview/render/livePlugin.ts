import { type DecorationSet, Decoration, EditorView } from "@codemirror/view";
import { StateField, type EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { buildDecorations } from "./buildDecorations";

function compute(state: EditorState): DecorationSet {
  // StateFields can't see the viewport; this decorates the whole document.
  // The cost driver is NOT the (incremental) parse — it's the full tree
  // iterate + Decoration.set sort: O(decorated nodes) on EVERY doc change and
  // selection change. Measured ~1-3ms/keystroke on typical documents, ~20ms
  // on a pathological 5k-line fully-marked doc. If large-doc jank is ever
  // reported: split block widgets (rare) into this field and return the rest
  // to a viewport-limited ViewPlugin.
  return buildDecorations(state);
}

export const livePlugin = StateField.define<DecorationSet>({
  create: (state) => compute(state),
  update(value, tr) {
    if (tr.docChanged || tr.selection || syntaxTree(tr.startState) !== syntaxTree(tr.state)) {
      return compute(tr.state);
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
