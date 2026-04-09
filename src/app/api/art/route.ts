import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { buildDailyArtPrompt, buildWeeklyArtPrompt } from '@/lib/prompts/art'

const client = new OpenAI()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function uploadToStorage(openaiUrl: string): Promise<string> {
  const res = await fetch(openaiUrl)
  const buffer = await res.arrayBuffer()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`

  const { error } = await supabaseAdmin.storage
    .from('art')
    .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabaseAdmin.storage.from('art').getPublicUrl(fileName)
  return data.publicUrl
}

export async function POST(req: NextRequest) {
  const { dominant, overall, content, weekly, weeklyDominant, weeklyOverall } = await req.json()

  const prompt = weekly
    ? buildWeeklyArtPrompt(weeklyDominant, weeklyOverall)
    : buildDailyArtPrompt(content ?? '', dominant, overall)

  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
  })

  const openaiUrl = response.data?.[0]?.url
  if (!openaiUrl) {
    return NextResponse.json({ error: 'No image returned' }, { status: 500 })
  }

  const url = await uploadToStorage(openaiUrl)
  return NextResponse.json({ url })
}
