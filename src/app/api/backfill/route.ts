import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { EMOTION_ANALYSIS_SYSTEM_PROMPT, EMOTION_ANALYSIS_TOOL } from '@/lib/prompts/analyze'

const anthropic = new Anthropic()

// Service roleで全エントリにアクセス
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function analyzeEntry(content: string) {
  const plainText = content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: EMOTION_ANALYSIS_SYSTEM_PROMPT,
    tools: [EMOTION_ANALYSIS_TOOL],
    tool_choice: { type: 'tool', name: EMOTION_ANALYSIS_TOOL.name },
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
