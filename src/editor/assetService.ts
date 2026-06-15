import * as vscode from "vscode";
import { buildImageFilename, extensionForMime, splitFolderSetting } from "../shared/imageAssets";

// Saves serialize module-wide: two same-second pastes (even across panels
// sharing a folder) must each see the other's file in the fresh listing, or
// they'd compute the same timestamp name and silently overwrite each other.
let saveQueue: Promise<void> = Promise.resolve();

/**
 * Save image bytes under the document-relative folder and return the
 * POSIX-style relative path to insert into the markdown. Throws with a
 * user-facing message on anything unsafe or unsupported.
 *
 * Calls are serialized module-wide so concurrent same-second pastes always
 * see each other's files when building the dedup listing.
 */
export function saveImageAsset(opts: {
  docUri: vscode.Uri;
  folder: string;
  name: string;
  mime: string;
  data: Uint8Array;
}): Promise<string> {
  const run = saveQueue.then(() => doSaveImageAsset(opts));
  // A failed save must not poison the queue for the next one.
  saveQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function doSaveImageAsset(opts: {
  docUri: vscode.Uri;
  folder: string;
  name: string;
  mime: string;
  data: Uint8Array;
}): Promise<string> {
  if (!extensionForMime(opts.mime)) throw new Error(`unsupported image type ${opts.mime}`);
  const segments = splitFolderSetting(opts.folder);
  if (segments === null) throw new Error(`unsafe remarked.imageFolder value "${opts.folder}"`);

  const dirUri = vscode.Uri.joinPath(opts.docUri, "..", ...segments);
  await vscode.workspace.fs.createDirectory(dirUri);
  const taken = new Set((await vscode.workspace.fs.readDirectory(dirUri)).map(([n]) => n));
  const filename = buildImageFilename({
    originalName: opts.name,
    mime: opts.mime,
    now: new Date(),
    exists: (n) => taken.has(n),
  });
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dirUri, filename), opts.data);
  return [...segments, filename].join("/");
}
