import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

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

  const systemPrompt = closing
    ? `あなたは熟練のジャーナリングコーチです。
ユーザーとの深い対話が一区切りつきました。
これまでの会話全体を振り返り、ユーザーが今日の内省を
締めくくるための最後の問いかけを1つだけ生成してください。

## 問いかけの方向性
- 今日の対話で見えてきたことを統合する問い
- 「今日の気づきを一言で表すなら？」のような収束的な問い
- 明日以降のアクションにつながる問い
- 会話を肯定的に締めくくるトーン

## 形式
- 20〜40文字の日本語の質問文のみ（前置き不要）
- 「？」で終わること`
    : isPrompt
    ? `あなたは熟練のジャーナリングコーチです。
ユーザーが今日のジャーナリングを始めるための、内省を促すオープンな問いかけを1つ生成してください。

## 質問の方向性（毎回バリエーションを変える）
- 今日の身体的・感情的な状態に気づく問い
- 最近の出来事を振り返る問い
- 未来の自分に向けた問い
- 価値観や優先順位に関する問い

## 形式
- 15〜35文字の日本語の質問文のみ（前置き・説明不要）
- 「？」で終わること`
    : `あなたは熟練のジャーナリングコーチです。
ユーザーの日記と会話の流れを読み、内省をさらに深めるための質問を1つだけ生成してください。

## 質問生成の原則
- 「なぜ」より「どのように」「何が」「どんなとき」で始める問いを優先する
- 感情の奥にある価値観・信念・ニーズに迫る
- ユーザーが自分でも気づいていない前提や思い込みに光を当てる
- 直前の質問と明確に違う角度から切り込む
- 過去の体験と今の感情を接続させる問いを心がける

## 形式
- 20〜45文字の日本語の質問文のみ（前置き・説明不要）
- 「？」で終わること`

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
