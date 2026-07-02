// Pure geometry for editor->preview scroll sync (FIR-82). No DOM / no vscode:
// callers pass measured anchor offsets so this stays unit-testable.
export interface Anchor {
  /** 0-based source line the anchor element maps to (data-line). */
  line: number;
  /** Pixel offset of the anchor within the scroll container. */
  offsetTop: number;
}

/**
 * Interpolated pixel offset for a 0-based source `line`, given anchors sorted
 * ascending by line. Clamps to the first/last anchor outside their range.
 */
export function targetOffsetForLine(anchors: Anchor[], line: number): number {
  if (anchors.length === 0) return 0;
  if (line <= anchors[0].line) return anchors[0].offsetTop;
  const last = anchors[anchors.length - 1];
  if (line >= last.line) return last.offsetTop;
  // Largest anchor with anchor.line <= line, and its successor.
  let lo = 0;
  for (let i = 0; i < anchors.length && anchors[i].line <= line; i++) lo = i;
  const a = anchors[lo];
  const b = anchors[lo + 1];
  if (!b || b.line === a.line) return a.offsetTop;
  const f = (line - a.line) / (b.line - a.line);
  return a.offsetTop + f * (b.offsetTop - a.offsetTop);
}
