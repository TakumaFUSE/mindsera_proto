'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { JournalEditor } from '@/components/editor/JournalEditor'
import { useJournalStore } from '@/lib/store'
import { EmotionAnalysis } from '@/lib/types'

type Status = 'idle' | 'saving' | 'analyzing' | 'done' | 'error'

const STATUS_LABEL: Record<Status, string> = {
  idle:      '未保存',
  saving:    '保存中…',
  analyzing: 'AIが感情を分析中…',
  done:      '保存・分析完了',
  error:     'エラーが発生しました',
}

export default function NewEntryPage() {
  const router = useRouter()
  const addEntry = useJournalStore((s) => s.addEntry)
  const setEmotionAnalysis = useJournalStore((s) => s.setEmotionAnalysis)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [status, setStatus] = useState<Status>('idle')

  const handleContentChange = (html: string, wc: number) => {
    setContent(html)
    setWordCount(wc)
    if (status === 'done' || status === 'error') setStatus('idle')
  }

  const handleSave = async () => {
    if (!content || content === '<p></p>') return

    // 1. エントリをストアに追加
    setStatus('saving')
    const id = addEntry({
      title: title.trim() || 'タイトルなし',
      content,
      wordCount,
    })

    // 2. 感情分析APIを呼ぶ
    setStatus('analyzing')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        const analysis: EmotionAnalysis = await res.json()
        setEmotionAnalysis(id, analysis)
      }
    } catch {
      // 分析に失敗してもエントリは保存済みなので続行
    }

    setStatus('done')
    router.push(`/journal/${id}`)
  }

  const canSave = content && content !== '<p></p>' && status === 'idle'

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
        <span className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-zinc-600'}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトルなし"
        className="w-full bg-transparent border-none outline-none text-3xl font-bold text-white placeholder-zinc-700 mb-6"
      />

      {/* Editor */}
      <JournalEditor
        content={content}
        onChange={handleContentChange}
        editable={true}
        placeholder="今日はどんなことを考えていますか？"
      />

      {/* Footer */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-800">
        <span className="text-sm text-zinc-500">{wordCount}文字</span>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {status === 'analyzing' && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {status === 'analyzing' ? '分析中…' : '保存する'}
        </button>
      </div>
    </div>
  )
}
