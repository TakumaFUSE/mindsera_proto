import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { EmotionAnalysis } from '@/lib/types'
import { EMOTION_ANALYSIS_SYSTEM_PROMPT, EMOTION_ANALYSIS_TOOL } from '@/lib/prompts/analyze'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ERROR] ANTHROPIC_API_KEY is not set in .env.local')
}

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { content } = await req.json()

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: EMOTION_ANALYSIS_SYSTEM_PROMPT,
    tools: [EMOTION_ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: EMOTION_ANALYSIS_TOOL.name },
    messages: [
      {
        role: 'user',
        content: `以下のジャーナルエントリを感情分析してください:\n\n${plainText}`,
      },
    ],
  })

  const toolUseBlock = response.content.find((b) => b.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    return NextResponse.json({ error: 'No tool use response' }, { status: 500 })
  }

  const analysis = toolUseBlock.input as EmotionAnalysis & { summary?: string; topics?: string[] }
  return NextResponse.json(analysis)
}
