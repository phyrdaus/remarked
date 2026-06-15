let docBaseUri = "";
let rootBaseUri = "";

export function setDocBaseUri(uri: string): void {
  docBaseUri = uri.replace(/\/$/, "");
}

/** Webview-resource prefix for the filesystem root ("" on Windows: unsupported). */
export function setRootBaseUri(uri: string): void {
  rootBaseUri = uri.replace(/\/$/, "");
}

/** Resolve a markdown image src to a loadable URL; "" means unloadable. */
export function resolveImageSrc(src: string): string {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  // data:image/* is inert and the CSP already allows it; other data:, file:
  // and vscode: srcs from document content stay refused.
  if (/^data:image\//i.test(src)) return src;
  if (/^(data|file|vscode):/i.test(src)) return "";
  // "//host/path" is protocol-relative, not an absolute file path — refuse it
  // rather than letting it ride the rootBaseUri branch.
  if (src.startsWith("//")) return "";
  if (src.startsWith("/")) {
    // Loads only if the target is under a webview resource root (workspace /
    // doc dir); otherwise the existing error chip shows. Windows: rootBaseUri
    // is "" and absolute paths stay unloadable (documented residual).
    return rootBaseUri ? `${rootBaseUri}${src}` : "";
  }
  if (!docBaseUri) return "";
  return `${docBaseUri}/${src.replace(/^\.\//, "")}`;
}
