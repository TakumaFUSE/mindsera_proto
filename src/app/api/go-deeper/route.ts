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
    ? `ユーザーが今日の日記を締めくくろうとしています。
今日書いてきたことを優しく受け取りながら、最後に「今日書いてよかったな」と思えるような、
静かな問いかけをしてください。

## トーンの原則
- 振り返りを促すが、重くしない
- 今日を肯定的に受け取る方向に向ける
- 答えが一言でもいい、答えなくてもいい感じの軽さ

## 形式
- 20〜40文字の日本語（前置き不要）
- 「？」で終わること`
    : isPrompt
    ? `あなたは、ユーザーが今日のことをなんとなく書き始めるきっかけを作る存在です。
難しく考えさせず、「そういえば…」と自然に筆が動くような、軽い問いかけをしてください。

## トーンの原則
- 今日のどこかのシーンや感覚を思い出させる問いかけ
- 「正解」のない、思ったことを書けばいい感じの問い
- 書き始めのハードルをできるだけ下げる

## 形式
- 15〜30文字の日本語（前置き不要）
- 「？」で終わること`
    : `あなたは、ユーザーの日記を一緒に読んでいる、信頼できる友人です。
コーチでも分析家でもなく、ただ純粋に「もっと聞かせて」と思っている人として話しかけてください。

## トーンの原則
- 質問というより、自然な会話の続きのように投げかける
- 「なるほど、それで〜」「それって、〜ということ？」のような相槌から始めても良い
- 重くせず、軽やかに。でも表面をなぞらない
- 答えやすそうだけど、書いてみると意外と深いことに気づく、そういう問いかけが理想
- 答えを急がせない、答えなくても良さそうな空気感を持たせる

## 避けること
- 「〜について教えてください」「〜はなぜですか？」のような尋問口調
- 「深掘りしましょう」「整理しましょう」のような分析的な言い回し
- 一度に複数のことを聞く
- 重たい、正直に向き合わなければいけない感じ

## 形式
- 15〜40文字の日本語（前置き・説明不要）
- 敬語でも友語でもなく、自然な丁寧語
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
