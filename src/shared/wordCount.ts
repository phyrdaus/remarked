/** Tokens containing at least one letter or digit count as words. */
export function countWords(text: string): number {
  let words = 0;
  for (const token of text.split(/\s+/)) {
    if (/[\p{L}\p{N}]/u.test(token)) words++;
  }
  return words;
}

/** ~200 wpm; anything readable takes at least a minute. */
export function readingTimeMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / 200));
}

export function wordCountLabel(text: string): string {
  const words = countWords(text);
  return words === 0 ? "0 words" : `${words} words · ${readingTimeMinutes(words)} min`;
}
