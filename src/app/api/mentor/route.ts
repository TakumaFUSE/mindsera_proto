import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { personas, PersonaId } from '@/lib/personas'
import { buildMentorSystemPrompt } from '@/lib/prompts/mentor'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ERROR] ANTHROPIC_API_KEY is not set in .env.local')
}

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { messages, personaId, entryContext, systemPrompt: customSystemPrompt } = await req.json()

  let basePrompt: string
  if (customSystemPrompt) {
    basePrompt = customSystemPrompt
  } else {
    const persona = personas.find((p) => p.id === (personaId as PersonaId))
    if (!persona) return new Response('Invalid persona', { status: 400 })
    basePrompt = persona.systemPrompt
  }

  const systemPrompt = buildMentorSystemPrompt(basePrompt, entryContext)

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
