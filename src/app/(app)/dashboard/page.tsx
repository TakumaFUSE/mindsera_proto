'use client'

import { useJournalStore } from '@/lib/store'
import { EntryCard } from '@/components/journal/EntryCard'
import { MindsetScoreCard } from '@/components/mindset/MindsetScoreCard'
import { calcMindsetScore } from '@/lib/mindset-score'
import Link from 'next/link'
import { PenLine, Sparkles } from 'lucide-react'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'おはようございます'
  if (hour < 17) return 'こんにちは'
  return 'こんばんは'
}

function formatHeaderDate() {
  return new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

function MindsetWelcomeCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-white font-semibold text-sm mb-1">マインドセットスコア</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-4">
            最初のエントリを書いて、あなたのマインドセットスコアを確認しましょう。
            ジャーナリングを続けることで、自分の思考パターンや感情の傾向が見えてきます。
          </p>
          <Link
            href="/journal/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" />
            最初のエントリを書く
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const entries = useJournalStore((s) => s.entries)

  const entryDays = new Set(
    entries.map((e) => {
      const d = new Date(e.createdAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )

  let streak = 0
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const startOffset = entryDays.has(todayKey) ? 0 : 1
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (entryDays.has(key)) {
      streak++
    } else {
      break
    }
  }

  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (27 - i))
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    return { date: d, hasEntry: entryDays.has(key) }
  })

  const mindsetScore = entries.length > 0 ? calcMindsetScore(entries, streak) : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-zinc-400 text-sm mb-1">{formatHeaderDate()}</p>
        <h1 className="text-2xl font-bold text-white">{getGreeting()}</h1>
      </div>

      {/* Mindset Score or Welcome */}
      {mindsetScore ? (
        <MindsetScoreCard score={mindsetScore} />
      ) : (
        <MindsetWelcomeCard />
      )}

      {/* Streak + Heatmap */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl font-bold text-white">{streak}</span>
          <div>
            <p className="text-white font-medium leading-tight">日連続</p>
            <p className="text-zinc-500 text-xs">
              {streak === 0 ? '今日から始めよう！' : 'この調子で続けよう 🔥'}
            </p>
          </div>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {Array.from({ length: 7 }, (_, col) => {
            const dayIndex = heatmapDays[col].date.getDay() % 7
            return (
              <div key={col} className="text-center text-xs text-zinc-600">
                {DAY_LABELS[dayIndex]}
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapDays.map(({ date, hasEntry }, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                title={date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                className={`w-7 h-7 rounded-sm transition-colors ${
                  hasEntry ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              />
              {i % 7 === 0 && (
                <span className="text-zinc-700" style={{ fontSize: '9px' }}>
                  {date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New entry CTA */}
      <Link
        href="/journal/new"
        className={`flex items-center gap-3 w-full rounded-xl p-4 mb-6 transition-all group ${
          entries.length === 0
            ? 'bg-violet-600 hover:bg-violet-500 border border-violet-500 text-white'
            : 'bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/50 text-zinc-400 hover:text-white'
        }`}
      >
        <PenLine className={`w-4 h-4 ${entries.length === 0 ? 'text-white' : 'text-violet-400 group-hover:text-violet-300'}`} />
        <span className="text-sm font-medium">
          {entries.length === 0 ? '最初のエントリを書いてみよう' : '今日のエントリを書く…'}
        </span>
      </Link>

      {/* Entry list */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
          最近のエントリ
        </h2>
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 text-sm mb-1">まだエントリがありません</p>
            <p className="text-zinc-700 text-xs">ジャーナリングを始めて、自分の思考パターンを発見しよう</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
