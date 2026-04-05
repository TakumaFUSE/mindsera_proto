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

## 品質基準
- score 0.15未満の感情は除外する
- emotionsはscore降順で並べる
- analysisTextは「〜ですね」で終わらず、問いかけや気づきで終わること（150〜200文字）`

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: 'submit_emotion_analysis',
  description: '感情分析の結果を構造化して返す',
  input_schema: {
    type: 'object' as const,
    properties: {
      emotions: {
        type: 'array',
        description: '検出された感情のリスト（score降順）',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'],
            },
            score: { type: 'number', description: '0.0〜1.0' },
            label: { type: 'string', description: '日本語ラベル' },
            description: { type: 'string', description: 'この感情が検出された理由と文脈（2〜3文）' },
            spans: {
              type: 'array',
              description: '感情の根拠となった原文のフレーズ',
              items: { type: 'string' },
            },
          },
          required: ['type', 'score', 'label', 'description', 'spans'],
        },
      },
      dominant: {
        type: 'string',
        enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'],
        description: '最も強い感情のtype',
      },
      overall: { type: 'string', description: '全体的な感情状態（15文字以内）' },
      analysisText: {
        type: 'string',
        description: '書き手への共感的フィードバック。問いかけや気づきで終わること（150〜200文字）',
      },
      summary: {
        type: 'string',
        description: 'エントリの核心を一文で要約。感情ではなく出来事や思考を中心に（40文字以内）',
      },
      topics: {
        type: 'array',
        description: 'エントリに登場する具体的なトピック・好きなもの・人・場所などを3〜5個抽出。例: ["牛丼", "仕事のプレゼン", "朝のランニング"]',
        items: { type: 'string' },
      },
    },
    required: ['emotions', 'dominant', 'overall', 'analysisText', 'summary'],
  },
}

export async function POST(req: NextRequest) {
  const { content } = await req.json()

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_emotion_analysis' },
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
