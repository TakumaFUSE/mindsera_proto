import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { personas, PersonaId } from '@/lib/personas'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ERROR] ANTHROPIC_API_KEY is not set in .env.local')
}

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { messages, personaId, entryContext } = await req.json()

  const persona = personas.find((p) => p.id === (personaId as PersonaId))
  if (!persona) {
    return new Response('Invalid persona', { status: 400 })
  }

  const systemPrompt = entryContext
    ? `${persona.systemPrompt}\n\n---\n【ユーザーの最近のジャーナルエントリ】\n${entryContext}`
    : persona.systemPrompt

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
