import * as vscode from "vscode";
import { nextDefaultEditorState } from "./defaultEditorState";

/**
 * Flip which editor opens markdown by default. The manifest's priority
 * "default" makes Remarked the default out of the box; the sanctioned per-user
 * override is workbench.editorAssociations, written at the GLOBAL level only —
 * reading the merged value would copy workspace-level associations into the
 * user's global settings (Plan 5 review finding).
 */
export async function toggleDefaultEditor(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration("workbench");
  const inspected = cfg.inspect<Record<string, string>>("editorAssociations");
  const globalAssociations = { ...(inspected?.globalValue ?? {}) };
  const { next } = nextDefaultEditorState(inspected?.globalValue);
  globalAssociations["*.md"] = next;
  globalAssociations["*.markdown"] = next;
  await cfg.update("editorAssociations", globalAssociations, vscode.ConfigurationTarget.Global);

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
