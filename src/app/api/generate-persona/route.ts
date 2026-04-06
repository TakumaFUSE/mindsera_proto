import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

const SYSTEM_PROMPT = `ユーザーが「こんな人と話したい」と書いた説明文をもとに、
AIメンターとしてのシステムプロンプトを生成してください。

出力はJSONのみ（前後に説明不要）:
{
  "name": "メンターの名前（10文字以内）",
  "role": "一言でどんな人か（15文字以内）",
  "emoji": "このメンターを象徴する絵文字1文字",
  "color": "16進数のカラーコード。メンターのキャラクターに合う色",
  "systemPrompt": "このメンターのシステムプロンプト（日本語）。メンターの話し方・価値観・アプローチを具体的に記述する。ユーザーの説明文に忠実に。200〜400文字。末尾に以下の共通ルールを必ず含める: 返答は日本語で3〜6文。毎回の返答の最後は問いかけか提案で終わること。"
}`

export async function POST(req: NextRequest) {
  const { description } = await req.json()

  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
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
