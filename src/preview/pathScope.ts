// Host-only. Path containment check for the Preview panel's resource roots
// (FIR-80): a webview's localResourceRoots is immutable after creation, so when
// the preview is retargeted to a document outside the current roots the panel
// must be recreated. Pure + node:path only, so it is unit-testable.
import { relative, isAbsolute } from "node:path";

/** True if `childFsPath` equals, or is nested inside, any of `rootFsPaths`. */
export function isWithinRoots(childFsPath: string, rootFsPaths: string[]): boolean {
  return rootFsPaths.some((root) => {
    const rel = relative(root, childFsPath);
    // "" → same dir; a relative path that neither escapes ("..") nor is absolute
    // → nested inside. Comparing resolved segments (not string prefixes) avoids
    // matching a sibling like ".../ws" vs ".../workspace".
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  });
}
