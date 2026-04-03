import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI()

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EMOTION_MOOD: Record<string, string> = {
  joy:          'warm, radiant, uplifting',
  trust:        'calm, grounded, peaceful',
  fear:         'tense, shadowy, uncertain',
  surprise:     'electric, dramatic, vivid',
  sadness:      'melancholic, soft, muted',
  disgust:      'uneasy, murky, discordant',
  anger:        'intense, turbulent, fiery',
  anticipation: 'hopeful, expansive, glowing',
}

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

  let prompt: string

  if (weekly) {
    prompt = [
      'Abstract expressionist panoramic painting, museum quality.',
      `Dominant emotional journey: ${weeklyDominant}. ${EMOTION_MOOD[weeklyDominant] ?? ''}.`,
      `The week felt like: ${weeklyOverall}.`,
      'Show emotional transformation and layered complexity through color transitions and gestural forms.',
      'No text, no figures, no recognizable objects. Pure abstraction.',
      'Rich texture, bold expansive composition, gallery-worthy contemporary art.',
    ].join(' ')
  } else {
    const plainContent = content
      ? content.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim().slice(0, 150)
      : ''

    const moodHint = EMOTION_MOOD[dominant] ?? 'contemplative, atmospheric'

    prompt = [
      'A cinematic digital painting that visually represents the following journal entry:',
      plainContent ? `"${plainContent}"` : '',
      `The emotional atmosphere is ${moodHint}.`,
      overall ? `Overall feeling: ${overall}.` : '',
      'Translate the subject matter and mood into a rich visual scene.',
      'If the entry mentions food, show an evocative scene of that food.',
      'If it mentions a place, show that place atmospherically.',
      'If abstract thoughts, use symbolic landscapes or objects.',
      'No human faces. No text or letters in the image.',
      'Cinematic lighting, painterly texture, emotionally resonant.',
    ].filter(Boolean).join(' ')
  }

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
