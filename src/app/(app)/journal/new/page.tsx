'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Loader2 } from 'lucide-react'
import { useJournalStore } from '@/lib/store'
import { EmotionAnalysis } from '@/lib/types'
import { calculateEnergy } from '@/lib/streak'

type Phase = 'write' | 'loading' | 'deepen' | 'saving' | 'complete'

interface Turn {
  question: string
  answer: string
}

function CompletionModal({ energy, onContinue }: { energy: number; onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden grid grid-cols-1 sm:grid-cols-2"
      >
        <div className="p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-white leading-snug mb-4">
            素晴らしい！<br />
            メンタルフィットネスが<br />
            向上しています。
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8">
            毎日振り返ることでエナジーを積み上げ、
            あなただけにパーソナライズされた体験が得られます。
          </p>
          <button
            onClick={onContinue}
            className="w-fit px-6 py-3 bg-white text-zinc-900 font-semibold rounded-full text-sm hover:bg-zinc-100 transition-colors"
          >
            続ける
          </button>
        </div>
        <div className="bg-zinc-800/60 flex items-center justify-center p-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="w-40 h-40 rounded-full border-4 border-violet-500/60 flex flex-col items-center justify-center"
          >
            <span className="text-violet-400 text-sm font-medium mb-1">＋20エナジー獲得！</span>
            <span className="text-4xl font-bold text-white tabular-nums">{energy}</span>
            <span className="text-zinc-500 text-xs mt-1">/ 100</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function NewEntryPage() {
  const router = useRouter()
  const addEntry = useJournalStore((s) => s.addEntry)
  const updateEntry = useJournalStore((s) => s.updateEntry)
  const setEmotionAnalysis = useJournalStore((s) => s.setEmotionAnalysis)
  const entries = useJournalStore((s) => s.entries)

  const [phase, setPhase] = useState<Phase>('write')
  const [text, setText] = useState('')
  // 確定済みのQ&Aターン
  const [turns, setTurns] = useState<Turn[]>([])
  // 現在表示中の質問と入力中の回答
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [energy, setEnergy] = useState(0)
  const [savedId, setSavedId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const answerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])
  useEffect(() => {
    if (phase === 'deepen') answerRef.current?.focus()
  }, [phase, turns.length])

  const fetchQuestion = async (committedTurns: Turn[]) => {
    setPhase('loading')
    try {
      const res = await fetch('/api/go-deeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, conversation: committedTurns }),
      })
      const { question: q } = await res.json()
      setCurrentQuestion(q)
      setPhase('deepen')
    } catch {
      setPhase(committedTurns.length === 0 ? 'write' : 'deepen')
    }
  }

  // Phase 1 のメインボタン
  const handleMainButton = () => {
    fetchQuestion([])
  }

  // Phase 2: 回答なし → 別の質問を取得
  const handleRefresh = () => {
    fetchQuestion(turns)
  }

  // Phase 2: 回答あり → 現ターンを確定して次の質問を取得
  const handleGoDeeper = () => {
    const newTurns = [...turns, { question: currentQuestion, answer: currentAnswer }]
    setTurns(newTurns)
    setCurrentAnswer('')
    fetchQuestion(newTurns)
  }

  const handleFinish = async () => {
    setPhase('saving')

    // 確定済みターン + 現在のターン（回答があれば）を含めてコンテンツ生成
    const allTurns = currentAnswer.trim()
      ? [...turns, { question: currentQuestion, answer: currentAnswer }]
      : turns

    const contentParts: string[] = []
    if (text.trim()) contentParts.push(`<p>${text.trim().replace(/\n/g, '<br>')}</p>`)
    for (const t of allTurns) {
      if (t.question) contentParts.push(`<blockquote><em>${t.question}</em></blockquote>`)
      if (t.answer.trim()) contentParts.push(`<p>${t.answer.trim().replace(/\n/g, '<br>')}</p>`)
    }
    const content = contentParts.join('')

    // 文字数は日本語対応でcharacter countを使用
    const plainText = [text, ...allTurns.map((t) => t.answer)].join('')
    const wordCount = plainText.replace(/\s+/g, '').length

    const title = text.trim().slice(0, 40) || 'New Entry'
    const id = addEntry({ title, content, wordCount })

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const { summary, ...analysis }: EmotionAnalysis & { summary?: string } = await res.json()
        setEmotionAnalysis(id, analysis)
        if (summary) updateEntry(id, { summary })
      }
    } catch {}

    const allEntries = [{ createdAt: new Date() } as (typeof entries)[0], ...entries]
    setEnergy(calculateEnergy(allEntries))
    setSavedId(id)
    setPhase('complete')
  }

  const isLoading = phase === 'loading' || phase === 'saving'
  const hasAnswer = currentAnswer.trim().length > 0

  return (
    <>
      <AnimatePresence>
        {phase === 'complete' && savedId && (
          <CompletionModal
            energy={energy}
            onContinue={() => router.push(`/journal/${savedId}`)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto pt-20 px-4">
        <AnimatePresence mode="wait">
          {/* Phase 1: Write */}
          {(phase === 'write' || (phase === 'loading' && turns.length === 0)) && (
            <motion.div
              key="write"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="今日、何を考えていますか..."
                rows={4}
                className="w-full bg-transparent border-none outline-none text-2xl text-white placeholder-zinc-700 resize-none leading-relaxed mb-12"
              />
              <button
                onClick={handleMainButton}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-white font-semibold rounded-full text-base transition-colors"
              >
                {phase === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />考え中…</>
                ) : !text.trim() ? 'お題をもらう' : 'もっと深く'}
              </button>
            </motion.div>
          )}

          {/* Phase 2: Deepen（会話スレッド） */}
          {(phase === 'deepen' || phase === 'saving' || (phase === 'loading' && turns.length > 0)) && (
            <motion.div
              key="deepen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* 初期テキスト */}
              <p className="text-2xl text-white leading-relaxed mb-8 whitespace-pre-wrap">
                {text}
              </p>

              {/* 確定済みターン */}
              {turns.map((turn, i) => (
                <div key={i}>
                  <div className="border-l-4 border-violet-500 pl-5 mb-6">
                    <p className="text-violet-400 text-lg leading-relaxed">{turn.question}</p>
                  </div>
                  <p className="text-2xl text-white leading-relaxed mb-8 whitespace-pre-wrap">
                    {turn.answer}
                  </p>
                </div>
              ))}

              {/* 現在の質問 */}
              <AnimatePresence>
                {currentQuestion && (
                  <motion.div
                    key={currentQuestion}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="border-l-4 border-violet-500 pl-5 mb-8"
                  >
                    <p className="text-violet-400 text-lg leading-relaxed">{currentQuestion}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 回答入力エリア（ローディング中は非表示） */}
              {phase !== 'loading' && (
                <textarea
                  ref={answerRef}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="ここに書く..."
                  rows={4}
                  className="w-full bg-transparent border-none outline-none text-2xl text-white placeholder-zinc-700 resize-none leading-relaxed mb-12"
                />
              )}

              {/* ボタン群 */}
              <div className="flex items-center gap-6">
                <button
                  onClick={hasAnswer ? handleGoDeeper : handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-white font-semibold rounded-full text-base transition-colors"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />考え中…</>
                  ) : hasAnswer ? (
                    'もっと深く'
                  ) : (
                    <><RotateCcw className="w-4 h-4" />別の質問</>
                  )}
                </button>

                <button
                  onClick={handleFinish}
                  disabled={isLoading}
                  className="text-zinc-500 hover:text-zinc-300 text-base font-medium transition-colors disabled:opacity-40"
                >
                  {phase === 'saving' ? '保存中…' : 'エントリを完成させる'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
