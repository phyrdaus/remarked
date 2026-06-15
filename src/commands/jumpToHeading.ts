import * as vscode from "vscode";
import type { RemarkedEditorProvider } from "../editor/remarkedEditorProvider";
import { extractHeadings } from "../shared/outline";

/** QuickPick over the active document's headings; picking scrolls the webview. */
export async function jumpToHeading(provider: RemarkedEditorProvider): Promise<void> {
  const document = provider.activeDocument;
  if (!document) return;
  const headings = extractHeadings(document.getText());
  if (headings.length === 0) {
    void vscode.window.showInformationMessage("Remarked: no headings in this document.");
    return;
  }
  const picked = await vscode.window.showQuickPick(
    headings.map((h) => ({
      label: `${" ".repeat(h.level - 1)}${h.title}`,
      description: `H${h.level}`,
      pos: h.pos,
    })),
    { placeHolder: "Jump to heading…" }
  );
  if (picked) provider.postToActiveWebview({ type: "revealPos", pos: picked.pos });
}
