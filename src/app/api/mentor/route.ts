import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { personas, PersonaId } from '@/lib/personas'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { messages, personaId, entryContext } = await req.json()

  const persona = personas.find((p) => p.id === (personaId as PersonaId))
  if (!persona) {
    return new Response('Invalid persona', { status: 400 })
  }

  // ジャーナルエントリのコンテキストがあればシステムプロンプトに付加
  const systemPrompt = entryContext
    ? `${persona.systemPrompt}\n\n---\n【ユーザーの最近のジャーナルエントリ】\n${entryContext}`
    : persona.systemPrompt

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
