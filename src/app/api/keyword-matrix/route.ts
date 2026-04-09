import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { KEYWORD_MATRIX_SYSTEM_PROMPT } from '@/lib/prompts/keyword-matrix'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim().slice(0, 500)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: KEYWORD_MATRIX_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `以下のエントリからキーワードマトリクスを生成:\n\n${plainText}` }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const matrix = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')
  return NextResponse.json(matrix)
}
