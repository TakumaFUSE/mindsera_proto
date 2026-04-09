'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2, AlertCircle } from 'lucide-react'

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    const failed: string[] = []
    const urls: string[] = []

    await Promise.all(
      Array.from(files).map(async (file) => {
        try {
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch('/api/upload-image', { method: 'POST', body: formData })
          if (res.ok) {
            const { url } = await res.json()
            urls.push(url)
          } else {
            const body = await res.json().catch(() => ({}))
            failed.push(body.error ?? `${file.name}: アップロード失敗`)
          }
        } catch {
          failed.push(`${file.name}: ネットワークエラー`)
        }
      })
    )

    if (urls.length > 0) onChange([...images, ...urls])
    if (failed.length > 0) setError(failed.join(' / '))

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (url: string) => onChange(images.filter((u) => u !== url))

  return (
    <div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((url) => (
            <div key={url} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute -top-1.5 -right-1.5 bg-zinc-800 border border-zinc-700 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors disabled:opacity-40"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        {uploading ? 'アップロード中…' : '画像を添付'}
      </button>
      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
