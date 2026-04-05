import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic()

// Service roleで全エントリにアクセス
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'] },
            score: { type: 'number' },
            label: { type: 'string' },
            description: { type: 'string' },
            spans: { type: 'array', items: { type: 'string' } },
          },
          required: ['type', 'score', 'label', 'description', 'spans'],
        },
      },
      dominant: { type: 'string', enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'] },
      overall: { type: 'string' },
      analysisText: { type: 'string' },
      summary: { type: 'string', description: 'エントリの核心を一文で要約（40文字以内）' },
      topics: {
        type: 'array',
        description: 'エントリに登場する具体的なトピック・好きなもの・人・場所などを3〜5個',
        items: { type: 'string' },
      },
    },
    required: ['emotions', 'dominant', 'overall', 'analysisText', 'summary', 'topics'],
  },
}

async function analyzeEntry(content: string) {
  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_emotion_analysis' },
    messages: [{ role: 'user', content: `以下のジャーナルエントリを感情分析してください:\n\n${plainText}` }],
  })
  const block = response.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return null
  return block.input as Record<string, unknown>
}

// 東京周辺のランダム座標（半径約30km）
function randomTokyoLocation() {
  const lat = 35.6812 + (Math.random() - 0.5) * 0.5
  const lng = 139.7671 + (Math.random() - 0.5) * 0.5
  return { latitude: parseFloat(lat.toFixed(4)), longitude: parseFloat(lng.toFixed(4)) }
}

export async function POST() {
  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('id, content, word_count, emotion_analysis, summary, topics, latitude')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!entries?.length) return NextResponse.json({ message: 'No entries found' })

  const results = { success: 0, skipped: 0, failed: 0 }

  for (const entry of entries) {
    const needsAnalysis = !entry.emotion_analysis
    const needsTopics = !entry.topics?.length
    const needsLocation = entry.latitude == null

    if (!needsAnalysis && !needsTopics && !needsLocation) {
      results.skipped++
      continue
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if ((needsAnalysis || needsTopics) && entry.content) {
      try {
        const analysis = await analyzeEntry(entry.content)
        if (analysis) {
          const { summary, topics, ...emotionAnalysis } = analysis as { summary?: string; topics?: string[]; [key: string]: unknown }
          if (needsAnalysis) updates.emotion_analysis = emotionAnalysis
          if (summary && !entry.summary) updates.summary = summary
          if (topics?.length) updates.topics = topics
        }
      } catch {
        results.failed++
        continue
      }
    }

    if (needsLocation) {
      const loc = randomTokyoLocation()
      updates.latitude = loc.latitude
      updates.longitude = loc.longitude
      updates.location_label = '東京'
    }

    // word_countが0またはnullなら本文から計算
    if (!entry.word_count && entry.content) {
      const plain = entry.content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
      updates.word_count = plain.length
    }

    const { error: updateError } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', entry.id)

    if (updateError) {
      console.error(`Failed to update ${entry.id}:`, updateError)
      results.failed++
    } else {
      results.success++
    }
  }

  return NextResponse.json({ total: entries.length, ...results })
}
