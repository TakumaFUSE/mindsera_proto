import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { GENERATE_PERSONA_SYSTEM_PROMPT } from '@/lib/prompts/generate-persona'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { description } = await req.json()

  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: GENERATE_PERSONA_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: description }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  try {
    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch {
    // JSONブロックが含まれている場合は抽出を試みる
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const result = JSON.parse(match[0])
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
