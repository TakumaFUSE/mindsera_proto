'use client'

import { useJournalStore } from '@/lib/store'
import { EntryCard } from '@/components/journal/EntryCard'
import Link from 'next/link'
import { PenLine } from 'lucide-react'

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

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

export default function DashboardPage() {
  const entries = useJournalStore((s) => s.entries)

  // Build set of dates that have entries (as YYYY-MM-DD strings)
  const entryDays = new Set(
    entries.map((e) => {
      const d = new Date(e.createdAt)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )

  // Calculate current streak
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (entryDays.has(key)) {
      streak++
    } else {
      break
    }
  }

  // Last 28 days for heatmap
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (27 - i))
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    return { date: d, hasEntry: entryDays.has(key) }
  })

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-zinc-400 text-sm mb-1">{formatHeaderDate()}</p>
        <h1 className="text-2xl font-bold text-white">{getGreeting()}</h1>
      </div>

      {/* Streak + Heatmap */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl font-bold text-white">{streak}</span>
          <div>
            <p className="text-white font-medium leading-tight">日連続</p>
            <p className="text-zinc-500 text-xs">この調子で続けよう 🔥</p>
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapDays.map(({ date, hasEntry }, i) => (
            <div
              key={i}
              title={date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              className={`w-7 h-7 rounded-sm transition-colors ${
                hasEntry ? 'bg-emerald-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        <p className="text-zinc-600 text-xs mt-2">過去28日間</p>
      </div>

      {/* New entry CTA */}
      <Link
        href="/journal/new"
        className="flex items-center gap-3 w-full bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/50 rounded-xl p-4 mb-6 text-zinc-400 hover:text-white transition-all group"
      >
        <PenLine className="w-4 h-4 text-violet-400 group-hover:text-violet-300" />
        <span className="text-sm">今日のエントリを書く…</span>
      </Link>

      {/* Entry list */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
          最近のエントリ
        </h2>
        {entries.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-12">
            エントリがありません。書き始めましょう！
          </p>
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
