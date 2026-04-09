import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const MAX_SIZE_BYTES = 8 * 1024 * 1024 // 8MB

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 413 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  // file.type が空（Androidなど）の場合は拡張子からMIMEを補完
  const contentType = file.type || MIME_BY_EXT[ext] || 'image/jpeg'

  const buffer = await file.arrayBuffer()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('entry-images')
    .upload(fileName, buffer, { contentType, upsert: false })

  if (error) {
    console.error('[upload-image] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from('entry-images').getPublicUrl(fileName)
  return NextResponse.json({ url: data.publicUrl })
}
