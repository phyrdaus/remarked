import * as vscode from "vscode";
import { RemarkedEditorProvider } from "../editor/remarkedEditorProvider";
import { isMarkdownFsPath } from "../shared/links";
import { DefaultEditorTarget, REMARKED_VIEW_TYPE } from "./defaultEditorState";
import { setMarkdownDefaultEditor } from "./setMarkdownDefault";

/** Reopen the active markdown tab in the other editor (Remarked <-> text). */
export async function toggleSource(): Promise<void> {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (!tab) return;
  const input = tab.input;
  if (input instanceof vscode.TabInputCustom && input.viewType === RemarkedEditorProvider.viewType) {
    await vscode.commands.executeCommand("vscode.openWith", input.uri, "default");
    await rememberLastFormat("default");
  } else if (input instanceof vscode.TabInputText && isMarkdownFsPath(input.uri.fsPath)) {
    await vscode.commands.executeCommand("vscode.openWith", input.uri, REMARKED_VIEW_TYPE);
    await rememberLastFormat(REMARKED_VIEW_TYPE);
  }
}

/** Persist the just-chosen view as the default for fresh opens, unless opted out. */
async function rememberLastFormat(target: DefaultEditorTarget): Promise<void> {
  const enabled = vscode.workspace
    .getConfiguration("remarked")
    .get<boolean>("rememberLastFormat", true);
  if (enabled) await setMarkdownDefaultEditor(target);
}
