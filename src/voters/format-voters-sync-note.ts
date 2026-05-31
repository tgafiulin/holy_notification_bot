export function formatVotersSyncNote(added: string[]): string | null {
  if (added.length === 0) {
    return null;
  }

  const lines = added.map((name) => `• ${name}`);
  return `➕ Добавлены в voters.json (${added.length}):\n${lines.join("\n")}`;
}
