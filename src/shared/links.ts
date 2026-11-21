/**
 * Only web links may leave the editor: file:, vscode:, javascript:, data: etc.
 * coming from document content are refused (the document is untrusted input).
 * The preview panel follows the same rule for vscode: links via DOMPurify's
 * default link allow-list (src/webview/preview/main.ts); file: links never
 * reach it (markdown-it refuses them). It still lets VS Code open mailto:
 * links there.
 */
export function isOpenableHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Markdown file extensions Remarked claims (mirrors the manifest selector). */
export function isMarkdownFsPath(fsPath: string): boolean {
  return /\.(md|markdown)$/i.test(fsPath);
}
