/** Flattened copy-alongside names can collide across directories; suffix -2, -3… */
export function uniqueName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  for (let n = 2; used.has(candidate); n++) candidate = `${base}-${n}${ext}`;
  used.add(candidate);
  return candidate;
}
