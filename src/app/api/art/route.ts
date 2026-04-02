import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI()

// 感情 → アートスタイルのヒントマッピング
const EMOTION_STYLE: Record<string, string> = {
  joy:          'warm golden light, soft sunburst, vibrant and uplifting',
  trust:        'emerald green flowing shapes, calm and harmonious',
  fear:         'deep indigo shadows, misty and ethereal',
  surprise:     'bright electric blue bursts, dynamic and energetic',
  sadness:      'cool blue watercolor wash, melancholic and soft',
  disgust:      'muted earthy tones, abstract texture',
  anger:        'crimson and ember tones, bold sharp strokes',
  anticipation: 'amber orange horizon glow, hopeful and expansive',
}

export async function POST(req: NextRequest) {
  const { dominant, overall, weekly, weeklyDominant, weeklyOverall } = await req.json()

  let prompt: string

  if (weekly) {
    prompt = [
      'A large abstract painting representing a week of emotions.',
      `Primary emotion: ${weeklyDominant}.`,
      `Overall feeling: ${weeklyOverall}.`,
      'No text, no faces. Painterly, expressive, wide format.',
    ].join(' ')
  } else {
    const styleHint = EMOTION_STYLE[dominant] ?? 'soft abstract colors, introspective mood'
    prompt = [
      'Abstract digital painting,',
      styleHint + ',',
      'no text, no faces, no words, no letters,',
      'minimalist composition, painterly texture,',
      overall ? `mood: ${overall},` : '',
      'square format, high contrast background',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const response = await client.images.generate({
    model: 'dall-e-2',
    prompt,
    n: 1,
    size: '256x256',
  })

  const url = response.data?.[0]?.url
  if (!url) {
    return NextResponse.json({ error: 'No image returned' }, { status: 500 })
  }

  return NextResponse.json({ url })
}
