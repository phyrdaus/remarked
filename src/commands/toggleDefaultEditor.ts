import * as vscode from "vscode";
import { nextDefaultEditorState } from "./defaultEditorState";
import { setMarkdownDefaultEditor } from "./setMarkdownDefault";

/**
 * Flip which editor opens markdown by default. The manifest's priority
 * "default" makes Remarked the default out of the box; the sanctioned per-user
 * override is workbench.editorAssociations, written at the GLOBAL level only
 * (see setMarkdownDefaultEditor).
 */
export async function toggleDefaultEditor(): Promise<void> {
  const inspected = vscode.workspace
    .getConfiguration("workbench")
    .inspect<Record<string, string>>("editorAssociations");
  const { next } = nextDefaultEditorState(inspected?.globalValue);
  await setMarkdownDefaultEditor(next);

  const workspaceOverride = inspected?.workspaceValue?.["*.md"];
  if (workspaceOverride && workspaceOverride !== next) {
    void vscode.window.showWarningMessage(
      `Remarked: this workspace's settings associate *.md with "${workspaceOverride}", which overrides the global default you just set.`
    );
  }
  void vscode.window.showInformationMessage(
    next === "default"
      ? "Markdown now opens in the plain text editor (Remarked stays available via Reopen Editor With)."
      : "Markdown now opens in Remarked."
  );
}
