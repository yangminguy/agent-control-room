export function normalizeWorkspaceResult(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const lines = trimmed.split("\n");
  const hasHeader = lines[0].startsWith("#") || lines[0].startsWith("##");
  if (hasHeader) return trimmed;

  return `## Vibe Kanban Result\n\n${trimmed}`;
}
