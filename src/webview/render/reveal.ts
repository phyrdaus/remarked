import type { EditorSelection, EditorState } from "@codemirror/state";

/**
 * A node is "revealed" (rendered as raw markdown) when any selection range
 * touches it, boundaries inclusive — so clicking at the very edge of bold
 * text reveals its markers.
 */
export function touchesSelection(sel: EditorSelection, from: number, to: number): boolean {
  return sel.ranges.some((r) => r.to >= from && r.from <= to);
}

/** The line containing `pos` touches the selection (block-marker reveal). */
export function lineRevealed(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos);
  return touchesSelection(state.selection, line.from, line.to);
}

/** Any line of [from, to] touches the selection (multi-line block reveal). */
export function anyLineRevealed(state: EditorState, from: number, to: number): boolean {
  for (let pos = from; pos <= to; ) {
    const line = state.doc.lineAt(pos);
    if (touchesSelection(state.selection, line.from, line.to)) return true;
    pos = line.to + 1;
  }
  return false;
}
