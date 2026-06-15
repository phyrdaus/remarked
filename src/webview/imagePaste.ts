import { EditorView } from "@codemirror/view";
import type { ToHost, ToWebview } from "../shared/messages";
import { imageMarkdown } from "../shared/imageAssets";

let nextRequestId = 1;
/** Save requests awaiting the host's imageSaved reply: id -> insertion intent. */
const pending = new Map<number, { from: number; to: number; alt: string }>();

/** Test-only: reset module state between tests. */
export function clearPendingForTest(): void {
  pending.clear();
}

export function base64FromBytes(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000; // String.fromCharCode arg-spread limit safety
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function altFromName(name: string): string {
  const base = name.replace(/\.[^.]*$/, "").trim();
  return base === "" || /^image$/i.test(base) ? "" : base;
}

/**
 * If the transfer carries an image file, capture it: remember where to insert,
 * ship the bytes to the host, and let the host's imageSaved reply finish the
 * job. Returns false (CM handles the event) when there is no image.
 */
export function handleImageTransfer(
  // ArrayLike so tests can pass a plain { files: [file] } (jsdom has no DataTransfer constructor)
  data: { files: ArrayLike<File> } | null,
  from: number,
  to: number,
  event: Event,
  post: (msg: ToHost) => void
): boolean {
  const file = data ? Array.from(data.files).find((f) => f.type.startsWith("image/")) : undefined;
  if (!file) return false;
  event.preventDefault();
  const requestId = nextRequestId++;
  pending.set(requestId, { from, to, alt: altFromName(file.name) });
  void file
    .arrayBuffer()
    .then((buf) =>
      post({
        type: "saveImage",
        requestId,
        name: file.name,
        mime: file.type,
        dataBase64: base64FromBytes(new Uint8Array(buf)),
      })
    )
    .catch((err) => {
      // Degrade visibly: a file we can't read must not vanish silently.
      pending.delete(requestId);
      console.error("remarked: could not read pasted image", err);
      post({ type: "showError", message: "could not read the pasted image" });
    });
  return true;
}

/** Insert the link for a completed save; null relPath = host already showed the error. */
export function handleImageSaved(
  view: EditorView,
  msg: Pick<Extract<ToWebview, { type: "imageSaved" }>, "requestId" | "relPath">
): void {
  const request = pending.get(msg.requestId);
  pending.delete(msg.requestId);
  if (!request || msg.relPath === null) return;
  // The doc may have changed during the round-trip; clamping beats corrupting.
  // (No position mapping — documented residual; the round-trip is fast.)
  const from = Math.min(request.from, view.state.doc.length);
  const to = Math.min(request.to, view.state.doc.length);
  const insert = imageMarkdown(msg.relPath, request.alt);
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
    userEvent: "input",
  });
}

/** CM extension capturing image paste/drop before the default handlers. */
export function imagePasteExtension(post: (msg: ToHost) => void) {
  return EditorView.domEventHandlers({
    paste: (event, view) => {
      const sel = view.state.selection.main;
      return handleImageTransfer(event.clipboardData, sel.from, sel.to, event, post);
    },
    drop: (event, view) => {
      const pos =
        view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.head;
      return handleImageTransfer(event.dataTransfer, pos, pos, event, post);
    },
  });
}
