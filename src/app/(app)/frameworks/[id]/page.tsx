'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Lightbulb, Clock } from 'lucide-react'
import Link from 'next/link'
import { frameworks, CATEGORY_META } from '@/lib/frameworks'
import { useJournalStore } from '@/lib/store'

export default function FrameworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const addEntry = useJournalStore((s) => s.addEntry)
  const entries = useJournalStore((s) => s.entries)

  const fw = frameworks.find((f) => f.id === id)

  const [answers, setAnswers] = useState<string[]>(() =>
    fw ? fw.steps.map(() => '') : []
  )
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  if (!fw) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <p className="text-zinc-400 mb-4">フレームワークが見つかりません。</p>
        <Link href="/frameworks" className="text-violet-400 hover:text-violet-300 text-sm">← 一覧に戻る</Link>
      </div>
    )
  }

  const meta = CATEGORY_META[fw.category]
  const currentStep = fw.steps[step]
  const isLast = step === fw.steps.length - 1
  const canNext = answers[step].trim().length > 0

  const pastSessions = entries
    .filter((e) => e.frameworkId === fw.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleNext = () => { if (!isLast) setStep((s) => s + 1) }
  const handleBack = () => { if (step > 0) setStep((s) => s - 1) }

  const handleSave = () => {
    setSaving(true)
    const contentHtml = fw.steps
      .map((s, i) => `<p><strong>Q${i + 1}. ${s.question}</strong></p><p>${answers[i].replace(/\n/g, '<br>')}</p>`)
      .join('')
    const plainText = fw.steps.map((s, i) => `Q${i + 1}. ${s.question}\n${answers[i]}`).join('\n\n')
    const wordCount = plainText.replace(/\s+/g, '').length
    const entryId = addEntry({
      title: `【${fw.name}】`,
      content: contentHtml,
      wordCount,
      summary: `${fw.name}を使った思考整理セッション`,
      frameworkId: fw.id,
    })
    router.push(`/journal/${entryId}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/frameworks" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />戻る
        </Link>
      </div>

      <div className="mb-8">
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-3" style={{ backgroundColor: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold text-white mb-1">{fw.name}</h1>
        <p className="text-zinc-500 text-sm leading-relaxed">{fw.description}</p>
      </div>

      {pastSessions.length > 0 && (
        <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />過去のセッション（{pastSessions.length}件）
          </h3>
          <div className="flex flex-col gap-1">
            {pastSessions.map((e) => (
              <button
                key={e.id}
                onClick={() => router.push(`/journal/${e.id}`)}
                className="text-left flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                  {new Date(e.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">ステップ {step + 1} / {fw.steps.length}</span>
          <span className="text-xs text-zinc-600">{Math.round(((step + 1) / fw.steps.length) * 100)}%</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: meta.color }}
            animate={{ width: `${((step + 1) / fw.steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex gap-1.5 mt-3">
          {fw.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => { if (i <= step || answers[i - 1]?.trim()) setStep(i) }}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6' : i < step ? 'w-1.5' : 'w-1.5 opacity-30'}`}
              style={{ backgroundColor: i <= step ? meta.color : '#3f3f46' }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-white text-lg font-medium leading-relaxed mb-3">{currentStep.question}</h2>
          {currentStep.hint && (
            <div className="flex items-start gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 mb-4">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-zinc-400 text-xs leading-relaxed">{currentStep.hint}</p>
            </div>
          )}
          <textarea
            value={answers[step]}
            onChange={(e) => {
              const next = [...answers]
              next[step] = e.target.value
              setAnswers(next)
            }}
            placeholder={currentStep.placeholder}
            rows={6}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl p-4 text-zinc-100 text-sm leading-relaxed placeholder-zinc-700 outline-none resize-none transition-colors"
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between pt-2">
        <button onClick={handleBack} disabled={step === 0} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ArrowLeft className="w-4 h-4" />前へ
        </button>
        {isLast ? (
          <button onClick={handleSave} disabled={!canNext || saving} className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition-colors">
            <Check className="w-4 h-4" />{saving ? '保存中…' : 'エントリとして保存'}
          </button>
        ) : (
          <button onClick={handleNext} disabled={!canNext} className="flex items-center gap-2 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
            次へ<ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {step > 0 && (
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <h3 className="text-xs text-zinc-600 uppercase tracking-wider mb-4">これまでの回答</h3>
          <div className="flex flex-col gap-4">
            {fw.steps.slice(0, step).map((s, i) => (
              <div key={i} className="cursor-pointer group" onClick={() => setStep(i)}>
                <p className="text-xs text-zinc-500 mb-1 group-hover:text-zinc-400 transition-colors">Q{i + 1}. {s.question}</p>
                <p className="text-zinc-300 text-sm leading-relaxed line-clamp-2">
                  {answers[i] || <span className="text-zinc-700 italic">未回答</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
