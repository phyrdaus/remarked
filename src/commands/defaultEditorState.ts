/** Mirrors RemarkedEditorProvider.viewType (that module imports vscode; this one must not). */
export const REMARKED_VIEW_TYPE = "remarked.editor";

/** Pure decision: what the *.md association should become. */
export function nextDefaultEditorState(globalAssociations: Record<string, string> | undefined): {
  next: string;
  remarkedWasDefault: boolean;
} {
  const current = globalAssociations?.["*.md"];
  const remarkedWasDefault = current === undefined || current === REMARKED_VIEW_TYPE;
  return { next: remarkedWasDefault ? "default" : REMARKED_VIEW_TYPE, remarkedWasDefault };
}
