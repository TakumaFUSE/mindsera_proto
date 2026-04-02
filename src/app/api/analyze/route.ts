import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { EmotionAnalysis } from '@/lib/types'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ERROR] ANTHROPIC_API_KEY is not set in .env.local')
}

const client = new Anthropic()

const SYSTEM_PROMPT = `あなたは感情心理学と臨床心理学を専門とする感情分析AIです。
Robert Plutchikの感情の輪モデルに基づいて、ユーザーのジャーナルエントリに含まれる感情を多層的に分析してください。

## 分析の指針
- 表面的なキーワードマッチではなく、文脈・トーン・暗示から感情を読み取る
- 矛盾した感情（例: 喜びと不安の共存）も積極的に検出する
- 書き手が自覚していない可能性のある感情にも注目する
- spansには感情の根拠となる原文のフレーズを正確に引用する

## Plutchikの8基本感情
- joy (喜び): 幸福感、満足、達成感、感謝、充実
- trust (信頼): 安心、受容、繋がり、帰属感
- fear (恐れ): 不安、懸念、心配、脅威の感覚
- surprise (驚き): 予想外の発見、認識の変化
- sadness (悲しみ): 喪失感、後悔、寂しさ、落胆
- disgust (嫌悪): 拒絶感、不快、価値観との衝突
- anger (怒り): 苛立ち、フラストレーション、不公平感
- anticipation (期待): 希望、楽しみ、将来への意欲

## 出力形式（JSONのみ、前後に説明文不要）
{
  "emotions": [
    {
      "type": "emotion_type",
      "score": 0.0〜1.0,
      "label": "日本語ラベル",
      "description": "この感情が検出された理由と文脈（2〜3文で具体的に）",
      "spans": ["原文から正確に引用したフレーズ1", "フレーズ2"]
    }
  ],
  "dominant": "最も強い感情のtype",
  "overall": "全体的な感情状態（15文字以内）",
  "analysisText": "書き手への共感的フィードバック。書いた内容を正確に受け止めた上で、新たな気づきやポジティブなリフレーミングを含める。一方的な励ましではなく、書き手の感情を鏡のように反映した上で視点を提供する。問いかけや気づきで終わること。（150〜200文字）",
  "summary": "エントリの核心を一文で要約。感情ではなく出来事や思考を中心に。（40文字以内）"
}

## 品質基準
- score 0.15未満の感情は除外する
- emotionsはscore降順で並べる
- analysisTextは「〜ですね」で終わらず、問いかけや気づきで終わること`

export async function POST(req: NextRequest) {
  const { content } = await req.json()

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `以下のジャーナルエントリを感情分析してください:\n\n${plainText}`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const analysis: EmotionAnalysis = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')

  return NextResponse.json(analysis)
}
