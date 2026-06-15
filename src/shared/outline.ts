export interface Heading {
  level: number;
  title: string;
  pos: number;
}

/**
 * ATX headings with document offsets, skipping fenced code blocks.
 * (Setext headings stay un-extracted, consistent with the renderer — residual.)
 */
export function extractHeadings(text: string): Heading[] {
  const headings: Heading[] = [];
  let offset = 0;
  let fenceChar: string | null = null;
  for (const line of text.split("\n")) {
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const char = fence[1][0];
      if (fenceChar === null) fenceChar = char;
      else if (fenceChar === char) fenceChar = null;
    } else if (fenceChar === null) {
      const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (m) headings.push({ level: m[1].length, title: m[2], pos: offset });
    }
    offset += line.length + 1;
  }
  return headings;
}
