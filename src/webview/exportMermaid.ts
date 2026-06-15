import type { ToHost } from "../shared/messages";

/**
 * Render each source via `render` (injected: the real mermaid in production,
 * a stub in tests) and post one reply carrying the same requestId. Individual
 * failures become nulls — the host falls back to code blocks per-diagram.
 */
export async function handleExportRenderMermaid(
  msg: { requestId: number; sources: string[] },
  render: (source: string) => Promise<string | null>,
  post: (reply: ToHost) => void
): Promise<void> {
  const svgs = await Promise.all(msg.sources.map((source) => render(source).catch(() => null)));
  post({ type: "export:mermaidSvgs", requestId: msg.requestId, svgs });
}
