import { EditorState } from "@codemirror/state";
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import type { SyntaxNode } from "@lezer/common";
import { parseTableModel, type TableModel } from "../../src/webview/render/table/model";

export function makeTableState(doc: string): EditorState {
  const state = EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
  });
  ensureSyntaxTree(state, doc.length, 5000); // force a full parse for deterministic tests
  return state;
}

export function tableNode(state: EditorState): SyntaxNode {
  let found: SyntaxNode | undefined;
  syntaxTree(state).iterate({
    enter: (ref) => {
      if (ref.name === "Table") {
        found = ref.node;
        return false;
      }
    },
  });
  if (!found) throw new Error("fixture contains no Table node");
  return found;
}

export function makeModel(doc: string): { state: EditorState; model: TableModel | null } {
  const state = makeTableState(doc);
  return { state, model: parseTableModel(state, tableNode(state)) };
}
