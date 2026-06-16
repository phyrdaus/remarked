/** Mirrors RemarkedEditorProvider.viewType (that module imports vscode; this one must not). */
export const REMARKED_VIEW_TYPE = "remarked.editor";

/** The two values our *.md / *.markdown editor association can take. */
export type DefaultEditorTarget = "default" | typeof REMARKED_VIEW_TYPE;

/** Pure decision: what the *.md association should become when toggled. */
export function nextDefaultEditorState(globalAssociations: Record<string, string> | undefined): {
  next: DefaultEditorTarget;
  remarkedWasDefault: boolean;
} {
  const current = globalAssociations?.["*.md"];
  const remarkedWasDefault = current === undefined || current === REMARKED_VIEW_TYPE;
  return { next: remarkedWasDefault ? "default" : REMARKED_VIEW_TYPE, remarkedWasDefault };
}

/** Pure: the global associations object with our markdown globs set to `target`. */
export function withMarkdownDefault(
  globalAssociations: Record<string, string> | undefined,
  target: DefaultEditorTarget
): Record<string, string> {
  return { ...(globalAssociations ?? {}), "*.md": target, "*.markdown": target };
}
