'use client'

import { use, useState } from 'react'
import { ArrowLeft, Pencil, Check } from 'lucide-react'
import Link from 'next/link'
import { JournalEditor } from '@/components/editor/JournalEditor'
import { EmotionBubbles } from '@/components/emotions/EmotionBubbles'
import { useJournalStore } from '@/lib/store'

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export default function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const entry = useJournalStore((s) => s.getEntry(id))
  const updateEntry = useJournalStore((s) => s.updateEntry)

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(entry?.title ?? '')
  const [editContent, setEditContent] = useState(entry?.content ?? '')
  const [editWordCount, setEditWordCount] = useState(entry?.wordCount ?? 0)

  if (!entry) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <p className="text-zinc-400 mb-4">エントリが見つかりません。</p>
        <Link href="/dashboard" className="text-violet-400 hover:text-violet-300 text-sm">
          ← ダッシュボードに戻る
        </Link>
      </div>
    )
  }

  const handleSave = () => {
    updateEntry(id, {
      title: editTitle.trim() || 'タイトルなし',
      content: editContent,
      wordCount: editWordCount,
    })
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    setEditTitle(entry.title)
    setEditContent(entry.content)
    setEditWordCount(entry.wordCount)
    setIsEditing(true)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>
        {isEditing ? (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            変更を保存
          </button>
        ) : (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            編集
          </button>
        )}
      </div>

      {/* Title */}
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-3xl font-bold text-white placeholder-zinc-700 mb-4"
        />
      ) : (
        <h1 className="text-3xl font-bold text-white mb-4">{entry.title}</h1>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-zinc-500">{formatDate(entry.createdAt)}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
          {isEditing ? editWordCount : entry.wordCount}文字
        </span>
      </div>

      {/* AI Summary */}
      {entry.summary && !isEditing && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
              AI サマリー
            </span>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed italic">{entry.summary}</p>
        </div>
      )}

      {/* Editor / Content */}
      <JournalEditor
        key={isEditing ? 'edit' : 'view'}
        content={isEditing ? editContent : entry.content}
        onChange={isEditing ? (html, wc) => { setEditContent(html); setEditWordCount(wc) } : undefined}
        editable={isEditing}
      />

      {/* Emotion Analysis */}
      {entry.emotionAnalysis && !isEditing && (
        <div className="mt-8">
          <EmotionBubbles analysis={entry.emotionAnalysis} />
        </div>
      )}
    </div>
  )
}
