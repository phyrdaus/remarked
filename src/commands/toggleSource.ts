import * as vscode from "vscode";
import { RemarkedEditorProvider } from "../editor/remarkedEditorProvider";
import { isMarkdownFsPath } from "../shared/links";

/** Reopen the active markdown tab in the other editor (Remarked <-> text). */
export async function toggleSource(): Promise<void> {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (!tab) return;
  const input = tab.input;
  if (input instanceof vscode.TabInputCustom && input.viewType === RemarkedEditorProvider.viewType) {
    await vscode.commands.executeCommand("vscode.openWith", input.uri, "default");
  } else if (input instanceof vscode.TabInputText && isMarkdownFsPath(input.uri.fsPath)) {
    await vscode.commands.executeCommand("vscode.openWith", input.uri, RemarkedEditorProvider.viewType);
  }
}
