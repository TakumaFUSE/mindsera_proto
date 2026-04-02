import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { EmotionAnalysis } from '@/lib/types'

const client = new OpenAI()

const SYSTEM_PROMPT = `あなたはPlutchikの感情モデルを専門とする感情分析AIです。
ユーザーのジャーナルエントリを分析し、検出された感情を厳密にJSON形式で返してください。

Plutchikの8基本感情:
- joy (喜び): 幸福感、満足、楽しさ
- trust (信頼): 安心、信頼、受容
- fear (恐れ): 不安、恐怖、懸念
- surprise (驚き): 予想外、発見
- sadness (悲しみ): 悲しさ、喪失感、後悔
- disgust (嫌悪): 嫌悪感、拒絶
- anger (怒り): 苛立ち、フラストレーション、怒り
- anticipation (期待): 期待感、希望、楽しみ

以下のJSON形式のみで返答してください（前後に説明文を書かないこと）:
{
  "emotions": [
    {
      "type": "emotion_type",
      "score": 0.0〜1.0の数値,
      "label": "日本語ラベル",
      "description": "この感情が検出された理由（1〜2文）",
      "spans": ["感情の根拠となったテキスト断片1", "断片2"]
    }
  ],
  "dominant": "最も強い感情のtype",
  "overall": "全体的な感情状態の一言説明（15文字以内）",
  "analysisText": "エントリ全体に対する共感的なフィードバック（100〜150文字）",
  "summary": "エントリの内容を一言で要約（30文字以内）"
}

注意:
- score が 0.2 未満の感情は含めないこと
- emotions は score の降順で並べること
- analysisText はジャーナルを書いた人への温かいメッセージとして書くこと`

export async function POST(req: NextRequest) {
  const { content } = await req.json()

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()

  if (plainText.length < 10) {
    return NextResponse.json({ error: 'content too short' }, { status: 400 })
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `以下のジャーナルエントリを感情分析してください:\n\n${plainText}` },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0].message.content ?? '{}'
  const analysis: EmotionAnalysis = JSON.parse(raw)

  return NextResponse.json(analysis)
}
