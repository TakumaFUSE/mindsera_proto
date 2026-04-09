import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getGoDeeperSystemPrompt } from '@/lib/prompts/go-deeper'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ERROR] ANTHROPIC_API_KEY is not set in .env.local')
}

const client = new Anthropic()

interface Turn {
  question: string
  answer: string
}

export async function POST(req: NextRequest) {
  const { text, conversation, closing }: { text: string; conversation?: Turn[]; closing?: boolean } = await req.json()

  const isPrompt = !text || !text.trim()

  const systemPrompt = getGoDeeperSystemPrompt(isPrompt, closing ?? false)

  const conversationText = (conversation ?? [])
    .map((t) => `Q: ${t.question}\nA: ${t.answer}`)
    .join('\n\n')

  const userMessage = isPrompt
    ? 'ジャーナリングのお題を1つください。'
    : [
        `最初の文章: 「${text.trim()}」`,
        conversationText ? `\nこれまでの会話:\n${conversationText}` : '',
        '\n次の深掘り質問を1つください。',
      ].join('')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const question = response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : ''

  return NextResponse.json({ question })
}
