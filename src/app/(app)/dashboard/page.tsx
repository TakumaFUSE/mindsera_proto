'use client'

import { useJournalStore } from '@/lib/store'
import { EntryCard } from '@/components/journal/EntryCard'
import { MindsetScoreCard } from '@/components/mindset/MindsetScoreCard'
import { calcMindsetScore } from '@/lib/mindset-score'
import { calcStreak, toDateKey, calculateEnergy } from '@/lib/streak'
import { getMentorMessage } from '@/lib/personas'
import { JournalEntry, PlutchikEmotion } from '@/lib/types'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { PenLine, Sparkles, Loader2 } from 'lucide-react'

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

interface PastEntry {
  entry: JournalEntry
  label: string
  snippet: string
}

function getPastEntry(entries: JournalEntry[]): PastEntry | null {
  if (entries.length <= 1) return null

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  const daysDiff = (e: JournalEntry) =>
    Math.round((now - new Date(e.createdAt).getTime()) / DAY)

  // Exclude the most recent entry (entries[0])
  const candidates = entries.slice(1)

  let found: JournalEntry | null = null
  let label = ''

  // 1. ~30 days ago (±2 days)
  const around30 = candidates
    .filter((e) => Math.abs(daysDiff(e) - 30) <= 2)
    .sort((a, b) => Math.abs(daysDiff(a) - 30) - Math.abs(daysDiff(b) - 30))
  if (around30.length > 0) {
    found = around30[0]
    label = '1ヶ月前のあなたより'
  }

  // 2. ~7 days ago (±1 day)
  if (!found) {
    const around7 = candidates
      .filter((e) => Math.abs(daysDiff(e) - 7) <= 1)
      .sort((a, b) => Math.abs(daysDiff(a) - 7) - Math.abs(daysDiff(b) - 7))
    if (around7.length > 0) {
      found = around7[0]
      label = '1週間前のあなたより'
    }
  }

  // 3. Oldest entry
  if (!found) {
    found = candidates[candidates.length - 1]
    const days = daysDiff(found)
    label = `${days}日前のあなたより`
  }

  const plain = found.content.replace(/<[^>]+>/g, '')
  const snippet = plain.length > 80 ? plain.slice(0, 80) + '...' : plain

  return { entry: found, label, snippet }
}

function getThisMonday(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diff)
  return d
}

function getWeeklyOverall(dominant: PlutchikEmotion): string {
  if (dominant === 'joy' || dominant === 'trust') return '充実した1週間'
  if (dominant === 'fear' || dominant === 'sadness') return '内省が深まった週'
  if (dominant === 'anger') return 'エネルギッシュな週'
  if (dominant === 'anticipation') return '期待に満ちた週'
  return '変化のある週'
}

function WeeklyArtCard({
  weeklyDominant,
  weeklyOverall,
  cachedUrl,
  onGenerated,
}: {
  weeklyDominant: PlutchikEmotion
  weeklyOverall: string
  cachedUrl: string | null
  onGenerated: (url: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState<string | null>(cachedUrl)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly: true, weeklyDominant, weeklyOverall }),
      })
      if (res.ok) {
        const { url: newUrl } = await res.json()
        setUrl(newUrl)
        onGenerated(newUrl)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6"
    >
      <div className="flex items-center justify-between p-4 pb-3">
        <span className="text-zinc-500 text-xs">🎨 今週のアート</span>
        <span className="text-zinc-400 text-xs">{weeklyOverall}</span>
      </div>

      {url ? (
        <>
          <img src={url} alt="今週のアート" className="w-full h-40 object-cover" />
          <div className="flex items-center p-3">
            <button
              onClick={() => window.open(url, '_blank')}
              className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
            >
              壁紙にする
            </button>
            <button
              onClick={generate}
              disabled={loading}
              className="text-zinc-600 text-xs ml-auto hover:text-zinc-400 transition-colors disabled:opacity-40"
            >
              {loading ? '生成中…' : '再生成'}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-zinc-800 h-40 flex items-center justify-center">
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '生成中…' : '生成する'}
          </button>
        </div>
      )}
    </motion.div>
  )
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

  const entryDays = new Set(entries.map((e) => toDateKey(new Date(e.createdAt))))
  const streak = calcStreak(entries.map((e) => new Date(e.createdAt)))
  const energy = calculateEnergy(entries)

  const today = new Date()
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (27 - i))
    return { date: d, hasEntry: entryDays.has(toDateKey(d)) }
  })

  const mindsetScore = entries.length > 0 ? calcMindsetScore(entries, streak) : null
  const latestAnalysis = entries[0]?.emotionAnalysis ?? null
  const mentorMsg = latestAnalysis ? getMentorMessage(latestAnalysis.dominant) : null
  const pastEntry = getPastEntry(entries)

  const weeklyArtUrl = useJournalStore((s) => s.weeklyArtUrl)
  const weeklyArtGeneratedAt = useJournalStore((s) => s.weeklyArtGeneratedAt)
  const setWeeklyArt = useJournalStore((s) => s.setWeeklyArt)

  const monday = getThisMonday()
  const weeklyEntries = entries.filter(
    (e) => e.emotionAnalysis && new Date(e.createdAt) >= monday
  )

  let weeklyDominant: PlutchikEmotion | null = null
  if (weeklyEntries.length > 0) {
    const totals: Partial<Record<PlutchikEmotion, { sum: number; count: number }>> = {}
    for (const e of weeklyEntries) {
      for (const d of e.emotionAnalysis!.emotions) {
        if (!totals[d.type]) totals[d.type] = { sum: 0, count: 0 }
        totals[d.type]!.sum += d.score
        totals[d.type]!.count++
      }
    }
    weeklyDominant = (Object.entries(totals) as [PlutchikEmotion, { sum: number; count: number }][])
      .map(([type, { sum, count }]) => ({ type, avg: sum / count }))
      .sort((a, b) => b.avg - a.avg)[0]?.type ?? null
  }

  const weeklyOverall = weeklyDominant ? getWeeklyOverall(weeklyDominant) : ''
  const isCacheValid = weeklyArtGeneratedAt
    ? new Date(weeklyArtGeneratedAt) >= monday
    : false
  const cachedWeeklyUrl = isCacheValid ? weeklyArtUrl : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-zinc-400 text-sm mb-1">{formatHeaderDate()}</p>
        <h1 className="text-2xl font-bold text-white">{getGreeting()}</h1>
      </div>

      {/* Weekly Art */}
      {weeklyDominant && (
        <WeeklyArtCard
          weeklyDominant={weeklyDominant}
          weeklyOverall={weeklyOverall}
          cachedUrl={cachedWeeklyUrl}
          onGenerated={setWeeklyArt}
        />
      )}

      {/* Mindset Score or Welcome */}
      {mindsetScore ? (
        <MindsetScoreCard score={mindsetScore} />
      ) : (
        <MindsetWelcomeCard />
      )}

      {/* Mentor message */}
      {mentorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6"
        >
          <div className="border-l-2 border-violet-500 pl-4">
            <p className="text-zinc-500 text-xs mb-2">メンターより</p>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{mentorMsg.icon}</span>
              <span className="text-zinc-400 text-sm">{mentorMsg.personaName}</span>
            </div>
            <p className="text-zinc-200 text-sm mt-1 leading-relaxed">{mentorMsg.message}</p>
            <div className="flex justify-end mt-3">
              <Link href="/mentor" className="text-violet-400 text-xs hover:text-violet-300 transition-colors">
                続きを話す →
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Energy + Heatmap */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-medium text-sm">メンタルエナジー</p>
            <p className="text-white font-semibold tabular-nums">{energy} / 100</p>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                energy <= 30 ? 'bg-zinc-500' : energy <= 60 ? 'bg-violet-400' : 'bg-violet-500'
              }`}
              style={{ width: `${energy}%` }}
            />
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            {energy <= 30
              ? '少し充電が必要です。今日書いてみましょう。'
              : energy <= 60
              ? '良いペースです。続けていきましょう。'
              : '絶好調！この調子で。🔥'}
          </p>
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

      {/* 過去の自分から */}
      {pastEntry && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6"
        >
          <p className="text-zinc-500 text-xs">🕰 {pastEntry.label}</p>
          <p className="text-zinc-300 text-sm mt-3 italic leading-relaxed">
            &ldquo;{pastEntry.snippet}&rdquo;
          </p>
          <div className="flex items-center justify-end gap-3 mt-4">
            <Link
              href={`/journal/${pastEntry.entry.id}`}
              className="text-zinc-500 text-xs underline hover:text-zinc-300 transition-colors"
            >
              当時のエントリを見る
            </Link>
            <Link
              href="/journal/new"
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg px-3 py-1.5 transition-colors"
            >
              返事を書く
            </Link>
          </div>
        </motion.div>
      )}

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
