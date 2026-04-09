export function buildMentorSystemPrompt(basePrompt: string, entryContext?: string): string {
  if (!entryContext) return basePrompt
  return `${basePrompt}\n\n---\n【ユーザーの最近のジャーナルエントリ】\n${entryContext}`
}
