import type { Replacement } from "./replace";

/** Feature flags shipped in init; applied at webview creation. */
export interface RenderSettings {
  math: boolean;
  mermaid: boolean;
  toolbar: boolean;
  /** True on macOS: toolbar tooltips show ⌘/⌥ instead of Ctrl/Alt (FIR-76). */
  isMac: boolean;
}

/** Host -> webview */
export type ToWebview =
  | { type: "init"; text: string; docBaseUri: string; rootBaseUri: string; settings: RenderSettings }
  | { type: "sync"; text: string; editVersion: number }
  | { type: "setMode"; focus?: boolean; typewriter?: boolean }
  | { type: "largeFile"; bytes: number }
  | { type: "imageSaved"; requestId: number; relPath: string | null }
  | { type: "revealPos"; pos: number }
  | { type: "export:renderMermaid"; requestId: number; sources: string[] }
  | { type: "test:dispatchEdit"; changes: Replacement[] }
  | { type: "test:getText" }
  | { type: "test:openAsText" };

/** Webview -> host */
export type ToHost =
  | { type: "ready" }
  | { type: "edit"; changes: Replacement[]; version: number }
  | { type: "openLink"; href: string }
  | { type: "saveImage"; requestId: number; name: string; mime: string; dataBase64: string }
  | { type: "renderAnyway" }
  | { type: "openAsText" }
  | { type: "exportHtml" }
  | { type: "exportPdf" }
  | { type: "showError"; message: string }
  | { type: "export:mermaidSvgs"; requestId: number; svgs: (string | null)[] }
  | { type: "test:text"; text: string }
  | { type: "openPreview" }
  // FIR-81: reports whether the editor webview has keyboard focus, so the host
  // can scope the formatting-shortcut absorber keybindings to real focus (not
  // just an active tab, which `activeCustomEditorId` alone would match).
  | { type: "focusChanged"; focused: boolean }
  | { type: "caretLine"; line: number };

/** Host -> preview panel webview (FIR-79: shared so drift is a type error). */
export type ToPreview =
  | { type: "render"; html: string; mermaidSources: string[] }
  | { type: "scrollToLine"; line: number };

/** Preview panel webview -> host (FIR-79). */
export type FromPreview =
  | { type: "ready" }
  | { type: "revealLine"; line: number };
