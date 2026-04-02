'use client'

import { use, useState } from 'react'
import { ArrowLeft, Pencil, Check, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { JournalEditor } from '@/components/editor/JournalEditor'
import { EmotionBubbles } from '@/components/emotions/EmotionBubbles'
import { useJournalStore } from '@/lib/store'
import { EmotionAnalysis } from '@/lib/types'

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
  const setArtUrl = useJournalStore((s) => s.setArtUrl)
  const setEmotionAnalysis = useJournalStore((s) => s.setEmotionAnalysis)

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(entry?.title ?? '')
  const [editContent, setEditContent] = useState(entry?.content ?? '')
  const [editWordCount, setEditWordCount] = useState(entry?.wordCount ?? 0)
  const [artLoading, setArtLoading] = useState(false)
  const [artError, setArtError] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!entry || analysisLoading) return
    setAnalysisLoading(true)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: entry.content }),
      })
      if (!res.ok) throw new Error()
      const { summary, ...analysis }: EmotionAnalysis & { summary?: string } = await res.json()
      setEmotionAnalysis(id, analysis)
      if (summary) updateEntry(id, { summary })
    } catch {
      setAnalysisError('分析に失敗しました。もう一度試してください。')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleGenerateArt = async () => {
    if (!entry?.emotionAnalysis || artLoading) return
    setArtLoading(true)
    setArtError(null)
    try {
      const res = await fetch('/api/art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dominant: entry.emotionAnalysis.dominant,
          overall: entry.emotionAnalysis.overall,
        }),
      })
      if (!res.ok) throw new Error('生成失敗')
      const { url } = await res.json()
      setArtUrl(id, url)
    } catch {
      setArtError('生成に失敗しました。もう一度試してください。')
    } finally {
      setArtLoading(false)
    }
  }

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
      {!isEditing && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
              AI サマリー
            </span>
            <button
              onClick={handleAnalyze}
              disabled={analysisLoading}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40"
            >
              {analysisLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {entry.emotionAnalysis ? '再分析' : '分析する'}
            </button>
          </div>
          {entry.summary ? (
            <p className="text-zinc-300 text-sm leading-relaxed italic">{entry.summary}</p>
          ) : (
            <p className="text-zinc-600 text-sm">まだ分析されていません</p>
          )}
          {analysisError && <p className="text-red-400 text-xs mt-2">{analysisError}</p>}
        </div>
      )}

      {/* AI Art */}
      {!isEditing && entry.emotionAnalysis && (
        <div className="mb-6">
          <AnimatePresence mode="wait">
            {entry.artUrl ? (
              <motion.div
                key="art"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-xl overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.artUrl}
                  alt="AI生成アート"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={handleGenerateArt}
                  disabled={artLoading}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/50 hover:bg-black/70 backdrop-blur text-white text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  {artLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  再生成
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="generate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-800 border-dashed rounded-xl px-5 py-4"
              >
                <div>
                  <p className="text-zinc-300 text-sm font-medium">AIアートを生成</p>
                  <p className="text-zinc-600 text-xs mt-0.5">感情分析をもとに抽象画を生成します（約$0.016）</p>
                </div>
                <button
                  onClick={handleGenerateArt}
                  disabled={artLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                >
                  {artLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      生成中…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      生成する
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {artError && (
            <p className="text-red-400 text-xs mt-2">{artError}</p>
          )}
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
