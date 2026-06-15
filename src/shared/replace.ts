export interface Replacement {
  from: number;
  to: number;
  insert: string;
}

/**
 * Minimal single-range replacement turning oldText into newText,
 * or null if they are identical. Used by the webview to apply
 * host-initiated document changes without resetting the editor.
 * Offsets are UTF-16 code units, matching both CodeMirror and VS Code's positionAt.
 */
export function computeReplacement(oldText: string, newText: string): Replacement | null {
  if (oldText === newText) return null;
  let start = 0;
  const maxStart = Math.min(oldText.length, newText.length);
  while (start < maxStart && oldText[start] === newText[start]) start++;
  let endOld = oldText.length;
  let endNew = newText.length;
  while (endOld > start && endNew > start && oldText[endOld - 1] === newText[endNew - 1]) {
    endOld--;
    endNew--;
  }
  return { from: start, to: endOld, insert: newText.slice(start, endNew) };
}
