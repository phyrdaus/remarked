// Host-only helper: makes katex.min.css self-contained by inlining the woff2
// font of every @font-face as a data URI (and dropping the woff/ttf
// alternatives — every engine this decade reads woff2).

export function rewriteKatexCss(css: string, read: (fontFile: string) => Uint8Array | null): string {
  // Match src: up to the first ; OR } — whichever comes first — but do NOT
  // consume the terminator. In pretty-printed CSS the src property ends with ;
  // and in minified CSS it ends with } (last property in the block). Consuming
  // the terminator with the old /src:[^;]+;/g regex caused it to greedily cross
  // @font-face block boundaries in minified input (the ; inside the NEXT
  // block's "font-display:block;" was used as the terminator).
  return css.replace(/src:[^;}]+/g, (srcDecl) => {
    const m = /url\(fonts\/([^)]+\.woff2)\) format\(['"]woff2['"]\)/.exec(srcDecl);
    if (!m) return srcDecl;
    const bytes = read(m[1]);
    if (!bytes) return srcDecl;
    const b64 = Buffer.from(bytes).toString("base64");
    return `src:url(data:font/woff2;base64,${b64}) format('woff2')`;
  });
}
