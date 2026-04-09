'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Check, Sparkles, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { JournalEditor } from '@/components/editor/JournalEditor'
import { ImageUploader } from '@/components/editor/ImageUploader'
import { EmotionBubbles } from '@/components/emotions/EmotionBubbles'
import { KeywordMatrix } from '@/components/journal/KeywordMatrix'
import { useJournalStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { EmotionAnalysis, KeywordMatrix as KeywordMatrixType, PlutchikEmotion } from '@/lib/types'
import { getMentorMessage } from '@/lib/personas'

function formatDate(date: Date) {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

function getNextActions(dominant: PlutchikEmotion) {
  const mentorMsg = getMentorMessage(dominant)

  const card1 = {
    icon: mentorMsg.icon,
    title: 'この感情についてメンターと話す',
    description: `${mentorMsg.personaName}が待っています`,
    href: '/mentor',
  }

  const card2 = {
    icon: '📊',
    title: '感情の傾向を見る',
    description: 'インサイトページで過去の傾向と比較',
    href: '/insights',
  }

  const isNegative = ['fear', 'sadness', 'anger', 'disgust'].includes(dominant)
  const card3 = isNegative
    ? {
        icon: '🧠',
        title: 'CBTメンターと整理する',
        description: '思考パターンを一緒に整理しましょう',
        href: '/mentor',
      }
    : {
        icon: '✏️',
        title: 'もう1つエントリを書く',
        description: 'この良い状態を記録に残しましょう',
        href: '/journal/new',
      }

  return [card1, card2, card3]
}

export default function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const entry = useJournalStore((s) => s.getEntry(id))
  const updateEntry = useJournalStore((s) => s.updateEntry)
  const deleteEntry = useJournalStore((s) => s.deleteEntry)
  const setArtUrl = useJournalStore((s) => s.setArtUrl)
  const setEmotionAnalysis = useJournalStore((s) => s.setEmotionAnalysis)
  const router = useRouter()

  const [isEditing, setIsEditing] = useState(false)
  const [matrix, setMatrix] = useState<KeywordMatrixType | null>(entry?.keywordMatrix ?? null)
  const [matrixLoading, setMatrixLoading] = useState(false)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [editTitle, setEditTitle] = useState(entry?.title ?? '')
  const [editContent, setEditContent] = useState(entry?.content ?? '')
  const [editWordCount, setEditWordCount] = useState(entry?.wordCount ?? 0)
  const [editImageUrls, setEditImageUrls] = useState<string[]>(entry?.imageUrls ?? [])
  const [artLoading, setArtLoading] = useState(false)
  const [artError, setArtError] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('keyword_saves')
        .select('col_index, row_index')
        .eq('entry_id', id)
      if (data) {
        setSavedKeys(new Set(data.map((d) => `${d.col_index}-${d.row_index}`)))
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (entry?.emotionAnalysis && !entry.keywordMatrix && !matrix && !matrixLoading) {
      generateMatrix()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.emotionAnalysis])

  const generateMatrix = async () => {
    if (!entry || matrixLoading) return
    setMatrixLoading(true)
    try {
      const res = await fetch('/api/keyword-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: entry.content }),
      })
      if (res.ok) {
        const data = await res.json()
        setMatrix(data)
        updateEntry(id, { keywordMatrix: data })
      }
    } finally {
      setMatrixLoading(false)
    }
  }

  const handleToggle = async (colIndex: number, rowIndex: number, keyword: string) => {
    const key = `${colIndex}-${rowIndex}`
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (savedKeys.has(key)) {
      setSavedKeys((prev) => { const next = new Set(prev); next.delete(key); return next })
      await supabase
        .from('keyword_saves')
        .delete()
        .eq('entry_id', id)
        .eq('col_index', colIndex)
        .eq('row_index', rowIndex)
    } else {
      setSavedKeys((prev) => new Set([...prev, key]))
      await supabase.from('keyword_saves').insert({
        user_id: user.id,
        entry_id: id,
        keyword,
        col_index: colIndex,
        row_index: rowIndex,
      })
    }
  }

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
      const { summary, topics, ...analysis }: EmotionAnalysis & { summary?: string; topics?: string[] } = await res.json()
      setEmotionAnalysis(id, analysis)
      if (summary) updateEntry(id, { summary })
      if (topics?.length) updateEntry(id, { topics })
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
          content: entry.content,
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
      imageUrls: editImageUrls.length > 0 ? editImageUrls : undefined,
    })
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('このエントリを削除しますか？')) return
    await deleteEntry(id)
    router.push('/dashboard')
  }

  const handleStartEdit = () => {
    setEditTitle(entry.title)
    setEditContent(entry.content)
    setEditWordCount(entry.wordCount)
    setEditImageUrls(entry.imageUrls ?? [])
    setIsEditing(true)
  }

  const nextActions = entry.emotionAnalysis && !isEditing
    ? getNextActions(entry.emotionAnalysis.dominant)
    : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* トップバー */}
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-red-900/40 hover:text-red-400 text-zinc-500 text-sm rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              編集
            </button>
          </div>
        )}
      </div>

      {/* タイトル */}
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

      {/* メタ */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-zinc-500">{formatDate(entry.createdAt)}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
          {isEditing ? editWordCount : entry.wordCount}文字
        </span>
      </div>

      {/* 本文 */}
      <JournalEditor
        key={isEditing ? 'edit' : 'view'}
        content={isEditing ? editContent : entry.content}
        onChange={isEditing ? (html, wc) => { setEditContent(html); setEditWordCount(wc) } : undefined}
        editable={isEditing}
      />

      {/* 添付画像 */}
      {isEditing ? (
        <div className="mt-6 mb-6">
          <ImageUploader images={editImageUrls} onChange={setEditImageUrls} />
        </div>
      ) : entry.imageUrls && entry.imageUrls.length > 0 ? (
        <div className="mt-6 mb-6">
          <div className={`grid gap-2 ${entry.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {entry.imageUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="w-full rounded-xl object-cover max-h-80"
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* AIサマリー */}
      {!isEditing && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mt-6 mb-6">
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

      {/* キーワードマトリクス */}
      {!isEditing && (
        matrix ? (
          <div className="mb-6">
            <KeywordMatrix matrix={matrix} savedKeys={savedKeys} onToggle={handleToggle} />
          </div>
        ) : matrixLoading ? (
          <div className="mb-6">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">キーワードマトリクス</p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-10 bg-zinc-800 animate-pulse rounded-lg" />
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* 感情分析 */}
      {entry.emotionAnalysis && !isEditing && (
        <div className="mb-6">
          <EmotionBubbles analysis={entry.emotionAnalysis} />
        </div>
      )}

      {/* AIアート */}
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
                  <p className="text-zinc-600 text-xs mt-0.5">感情分析をもとに抽象画を生成します（約$0.04）</p>
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

      {/* ネクストアクション */}
      {nextActions && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">Next</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {nextActions.map((action) => (
              <div
                key={action.href + action.title}
                onClick={() => router.push(action.href)}
                className="min-w-[200px] max-w-[240px] flex-shrink-0 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 cursor-pointer transition-colors"
              >
                <span className="text-xl">{action.icon}</span>
                <p className="text-zinc-200 text-sm font-medium mt-2">{action.title}</p>
                <p className="text-zinc-500 text-xs mt-1">{action.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
