// Host-only. Path containment check for the Preview panel's resource roots
// (FIR-80): a webview's localResourceRoots is immutable after creation, so when
// the preview is retargeted to a document outside the current roots the panel
// must be recreated. Pure + node:path only, so it is unit-testable.
import { relative, isAbsolute, sep } from "node:path";

/** True if `childFsPath` equals, or is nested inside, any of `rootFsPaths`. */
export function isWithinRoots(childFsPath: string, rootFsPaths: string[]): boolean {
  return rootFsPaths.some((root) => {
    const rel = relative(root, childFsPath);
    if (rel === "") return true; // same directory
    // Escapes the root iff a leading path *segment* is exactly ".." (rel is
    // ".." or starts with "../"). Checking the segment, not a raw "..'" string
    // prefix, keeps a dir literally named e.g. "..cache" as nested, and avoids
    // matching a sibling like ".../ws" vs ".../workspace".
    return rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel);
  });
}
