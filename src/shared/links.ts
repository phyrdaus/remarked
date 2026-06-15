/**
 * Only web links may leave the editor: file:, vscode:, javascript:, data: etc.
 * coming from document content are refused (the document is untrusted input).
 */
export function isOpenableHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Markdown file extensions Remarked claims (mirrors the manifest selector). */
export function isMarkdownFsPath(fsPath: string): boolean {
  return /\.(md|markdown)$/i.test(fsPath);
}
