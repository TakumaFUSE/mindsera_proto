'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { JournalEntry } from '@/lib/types'
import { useJournalStore } from '@/lib/store'

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

export function EntryCard({ entry }: { entry: JournalEntry }) {
  const router = useRouter()
  const deleteEntry = useJournalStore((s) => s.deleteEntry)
  const preview = stripHtml(entry.content).slice(0, 120)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このエントリを削除しますか？')) return
    await deleteEntry(entry.id)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      onClick={() => router.push(`/journal/${entry.id}`)}
      className="bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors overflow-hidden"
    >
      {/* Art thumbnail */}
      {entry.artUrl && (
        <div className="h-28 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.artUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-white font-medium leading-snug">{entry.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500 mt-0.5">
              {formatDate(entry.createdAt)}
            </span>
            <button
              onClick={handleDelete}
              className="p-1 text-zinc-600 hover:text-red-400 transition-colors rounded"
              aria-label="削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-3">
          {preview}{preview.length >= 120 ? '…' : ''}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            {entry.wordCount}文字
          </span>
          {entry.summary && (
            <p className="text-zinc-500 text-xs italic truncate max-w-[60%]">
              {entry.summary.slice(0, 60)}{entry.summary.length > 60 ? '…' : ''}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
