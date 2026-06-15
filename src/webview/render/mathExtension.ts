import type { BlockContext, Line, MarkdownConfig } from "@lezer/markdown";

const DOLLAR = 36;

/**
 * Minimal $-delimiter math: $inline$ (no spaces required, but a lone $
 * followed by a digit/space stays text) and $$ blocks (single- or multi-line).
 */
export const mathExtension: MarkdownConfig = {
  defineNodes: [
    { name: "InlineMath" },
    { name: "MathMark" },
    { name: "BlockMath", block: true },
  ],
  parseInline: [
    {
      name: "InlineMath",
      parse(cx, next, pos) {
        if (next !== DOLLAR || cx.char(pos + 1) === DOLLAR) return -1;
        // Reject $digit and $space (lone price-like $ stays text)
        const afterDollar = cx.char(pos + 1);
        if (afterDollar >= 48 && afterDollar <= 57) return -1; // digit 0-9
        if (afterDollar === 32 || afterDollar === 9) return -1; // space or tab
        for (let i = pos + 1; i < cx.end; i++) {
          const ch = cx.char(i);
          if (ch === DOLLAR) {
            if (i === pos + 1) return -1;
            const prev = cx.char(i - 1);
            if (prev === 32 || prev === 9) continue;
            return cx.addElement(
              cx.elt("InlineMath", pos, i + 1, [
                cx.elt("MathMark", pos, pos + 1),
                cx.elt("MathMark", i, i + 1),
              ])
            );
          }
          if (ch === 10) return -1; // newline: inline math is single-line
        }
        return -1;
      },
    },
  ],
  parseBlock: [
    {
      name: "BlockMath",
      parse(cx: BlockContext, line: Line): boolean {
        if (!line.text.startsWith("$$")) return false;
        const start = cx.lineStart;
        // Single-line $$content$$
        if (/^\$\$.+\$\$\s*$/.test(line.text)) {
          const end = cx.lineStart + line.text.length;
          cx.nextLine();
          cx.addElement(cx.elt("BlockMath", start, end));
          return true;
        }
        // "$$x$$ tail" — closed on the first line but with trailing text:
        // not a block; leave it to inline/paragraph parsing rather than
        // consuming lines until a closing $$ that may never come.
        if (line.text.slice(2).includes("$$")) return false;
        // Multi-line: consume until a closing $$ line (or EOF)
        let end = cx.lineStart + line.text.length;
        while (cx.nextLine()) {
          end = cx.lineStart + line.text.length;
          if (/^\$\$\s*$/.test(line.text)) {
            cx.nextLine();
            break;
          }
        }
        cx.addElement(cx.elt("BlockMath", start, end));
        return true;
      },
    },
  ],
};
