import type { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

export type ActionId =
  | "bold" | "italic" | "strike" | "code"
  | "h1" | "h2" | "h3"
  | "bullet" | "ordered" | "task" | "blockquote";

const INLINE_NODE: Record<string, ActionId> = {
  StrongEmphasis: "bold",
  Emphasis: "italic",
  InlineCode: "code",
  Strikethrough: "strike",
};

/**
 * Which toggleable formats are active at the main cursor. Inline marks come
 * from the syntax tree (span detection); block formats come from the cursor
 * line's text (robust against lezer node-name drift). Inserts (link, image,
 * table, HR, code block) are not reported — they have no active state.
 */
export function activeFormats(state: EditorState): Set<ActionId> {
  const active = new Set<ActionId>();
  const head = state.selection.main.head;

  const tree = syntaxTree(state);
  for (let n: SyntaxNode | null = tree.resolveInner(head, 1); n; n = n.parent) {
    const id = INLINE_NODE[n.name];
    if (id) active.add(id);
  }

  const text = state.doc.lineAt(head).text;
  const heading = /^(#{1,6})\s+/.exec(text);
  // Block formats use line-text regex rather than Lezer block nodes (Blockquote,
  // BulletList, …): the marker is always at the line start, and node names have
  // shifted between @lezer/markdown versions, so the regex is more stable.
  const headingIds = ["h1", "h2", "h3"] as const;
  if (heading) {
    const level = heading[1].length;
    if (level >= 1 && level <= 3) active.add(headingIds[level - 1]);
  }
  if (/^\s*>\s?/.test(text)) active.add("blockquote");
  if (/^\s*[-*+]\s+\[[ xX]\](\s|$)/.test(text)) active.add("task");
  else if (/^\s*[-*+]\s+/.test(text)) active.add("bullet");
  else if (/^\s*\d+[.)]\s+/.test(text)) active.add("ordered");

  return active;
}
