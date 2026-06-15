import type { RenderSettings } from "../../shared/messages";

// Applied once from the init message, before the view is created. Changing a
// setting takes effect on the next editor open (documented in package.json).
let settings: RenderSettings = { math: true, mermaid: true, toolbar: true };

export function setRenderSettings(next: RenderSettings): void {
  settings = next;
}

export function getRenderSettings(): RenderSettings {
  return settings;
}
