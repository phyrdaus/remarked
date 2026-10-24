// Turns mermaid's error text into a short chip line plus the parser's source
// snippet. Best effort: the message format is not a stable mermaid API, so
// anything that doesn't match falls back to the first line, as the chip always
// did.

export interface MermaidErrorDisplay {
  /** One line for the chip, shown after "⚠ mermaid: ". */
  summary: string;
  /** The parser's source excerpt and caret line, when it gives one. */
  snippet?: string;
  /** The untouched message, for the hover tooltip. */
  full: string;
}

const MAX_SUMMARY = 160;

// Tokens from "Expecting …, got 'X'" that mean something to users. The rest are
// grammar names ('SQE', 'TAGSTART'…), so those parse errors get no reason.
const GOT_REASONS = new Map([
  ["EOF", "unexpected end of diagram"],
  ["EOF_IN_STRUCT", "a { block is never closed"],
  ["NEWLINE", "unexpected line break"],
  ["NL", "unexpected line break"],
]);

export function formatMermaidError(message: string): MermaidErrorDisplay {
  const [first = "", excerpt, caret, expecting] = message.split("\n");
  const isParserError =
    /^(Parse|Lexical) error on line \d+/.test(first) && excerpt !== undefined && /^-*\^$/.test(caret ?? "");
  if (!isParserError) return { summary: clip(first), full: message };

  const header = first.replace(/:$/, "");
  const got = expecting?.match(/got '([^']+)'$/)?.[1];
  const reason = got === undefined ? undefined : GOT_REASONS.get(got);
  return {
    summary: clip(reason ? `${header}, ${reason}` : header),
    snippet: `${excerpt}\n${caret}`,
    full: message,
  };
}

function clip(text: string): string {
  return text.length > MAX_SUMMARY ? text.slice(0, MAX_SUMMARY - 1) + "…" : text;
}
