import * as vscode from "vscode";
import { DefaultEditorTarget, withMarkdownDefault } from "./defaultEditorState";

/**
 * Persist which editor opens markdown by default. Writes only the GLOBAL value
 * of workbench.editorAssociations — reading/writing the merged value would copy
 * workspace-level associations into the user's global settings (Plan 5 review).
 */
export async function setMarkdownDefaultEditor(target: DefaultEditorTarget): Promise<void> {
  const cfg = vscode.workspace.getConfiguration("workbench");
  const inspected = cfg.inspect<Record<string, string>>("editorAssociations");
  const next = withMarkdownDefault(inspected?.globalValue, target);
  await cfg.update("editorAssociations", next, vscode.ConfigurationTarget.Global);
}
