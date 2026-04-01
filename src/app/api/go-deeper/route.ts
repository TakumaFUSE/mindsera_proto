import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI()

interface Turn {
  question: string
  answer: string
}

export async function POST(req: NextRequest) {
  const { text, conversation }: { text: string; conversation?: Turn[] } = await req.json()

  const isPrompt = !text || !text.trim()

  const systemPrompt = isPrompt
    ? `あなたはジャーナリングコーチです。ユーザーが日記を書き始めるための、オープンな問いかけを1つ生成してください。
- 15〜30文字程度の短い質問
- 内省を促す、具体的すぎない問い
- 返答は質問文だけ（前置きなし）`
    : `あなたはジャーナリングコーチです。ユーザーの日記と会話の流れを読み、次に深掘りするための質問を1つ生成してください。
- 15〜40文字程度
- 直前の回答を受けて、さらに背景や感情に迫る問い
- 同じ質問を繰り返さない
- 返答は質問文だけ（前置きなし）`

  // 会話履歴を文字列に整形
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

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 100,
  })

  const question = res.choices[0].message.content?.trim() ?? ''
  return NextResponse.json({ question })
}
