'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useJournalStore } from '@/lib/store'
import { EMOTION_META, PlutchikEmotion, JournalEntry } from '@/lib/types'
import { calcStreak, toDateKey } from '@/lib/streak'
import { calcMindsetScore } from '@/lib/mindset-score'
import { MindsetScoreCard } from '@/components/mindset/MindsetScoreCard'

const LocationMap = dynamic(() => import('@/components/insights/LocationMap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-zinc-800 rounded-xl animate-pulse" />,
})

type Range = '7' | '30' | 'all'

const RANGE_LABELS: Record<Range, string> = {
  '7': '7日間',
  '30': '30日間',
  'all': 'すべて',
}

const TREND_EMOTIONS: PlutchikEmotion[] = ['joy', 'sadness', 'fear', 'anticipation']

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

interface Nudge {
  message: string
  buttonLabel: string
  href: string
}

interface PastEntry {
  entry: JournalEntry
  label: string
  snippet: string
}

function calcNudge(entries: JournalEntry[]): Nudge | null {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = entries.filter(
    (e) => e.emotionAnalysis && new Date(e.createdAt).getTime() >= cutoff
  )
  if (recent.length === 0) return null

  const avg = (emotion: PlutchikEmotion) => {
    const scores = recent.flatMap((e) =>
      e.emotionAnalysis!.emotions.filter((d) => d.type === emotion).map((d) => d.score)
    )
    return scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length
  }

  if (avg('fear') >= 0.5) return {
    message: '恐れの感情が高まっています。CBTコーチと一緒に、思考のパターンを整理してみませんか？',
    buttonLabel: 'CBTコーチに相談する',
    href: '/mentor',
  }
  if (avg('sadness') >= 0.5) return {
    message: '悲しみの感情が続いています。心理士と気持ちを整理してみましょう。',
    buttonLabel: '心理士に話す',
    href: '/mentor',
  }
  if (avg('anger') >= 0.4) return {
    message: '怒りを感じる場面が多いようです。ストア哲学の視点で、コントロールできることに目を向けてみましょう。',
    buttonLabel: 'ストア哲学者と話す',
    href: '/mentor',
  }
  if (avg('joy') >= 0.6 && avg('anticipation') <= 0.3) return {
    message: '喜びを感じていますが、期待感が少し低め。いきがいフレームワークで、やりがいの方向性を確認してみませんか？',
    buttonLabel: 'いきがいを探る',
    href: '/frameworks',
  }
  return {
    message: '今週も内省を続けています。デイリーレビューフレームワークで、週を振り返ってみましょう。',
    buttonLabel: '週を振り返る',
    href: '/frameworks',
  }
}

function getPastEntry(entries: JournalEntry[]): PastEntry | null {
  if (entries.length <= 1) return null

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  const daysDiff = (e: JournalEntry) =>
    Math.round((now - new Date(e.createdAt).getTime()) / DAY)

  const candidates = entries.slice(1)

  let found: JournalEntry | null = null
  let label = ''

  const around30 = candidates
    .filter((e) => Math.abs(daysDiff(e) - 30) <= 2)
    .sort((a, b) => Math.abs(daysDiff(a) - 30) - Math.abs(daysDiff(b) - 30))
  if (around30.length > 0) {
    found = around30[0]
    label = '1ヶ月前のあなたより'
  }

  if (!found) {
    const around7 = candidates
      .filter((e) => Math.abs(daysDiff(e) - 7) <= 1)
      .sort((a, b) => Math.abs(daysDiff(a) - 7) - Math.abs(daysDiff(b) - 7))
    if (around7.length > 0) {
      found = around7[0]
      label = '1週間前のあなたより'
    }
  }

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

function NudgeCard({ nudge, onNavigate }: { nudge: Nudge; onNavigate: (href: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-violet-950/50 border border-violet-800/50 rounded-2xl p-5 mb-6"
    >
      <p className="text-violet-400 text-xs">✦ 今週のナッジ</p>
      <p className="text-zinc-200 text-sm mt-2 leading-relaxed">{nudge.message}</p>
      <button
        onClick={() => onNavigate(nudge.href)}
        className="mt-4 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg px-4 py-2 transition-colors"
      >
        {nudge.buttonLabel}
      </button>
    </motion.div>
  )
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

export default function InsightsPage() {
  const entries = useJournalStore((s) => s.entries)
  const weeklyArtUrl = useJournalStore((s) => s.weeklyArtUrl)
  const weeklyArtGeneratedAt = useJournalStore((s) => s.weeklyArtGeneratedAt)
  const setWeeklyArt = useJournalStore((s) => s.setWeeklyArt)
  const router = useRouter()
  const [range, setRange] = useState<Range>('all')
  const [selectedEmotion, setSelectedEmotion] = useState<PlutchikEmotion | null>(null)

  const filteredEntries = useMemo(() => {
    const sorted = [...entries]
      .filter((e) => e.emotionAnalysis)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (range === 'all') return sorted
    const days = Number(range)
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return sorted.filter((e) => new Date(e.createdAt).getTime() >= cutoff)
  }, [entries, range])

  const aggregatedEmotions = useMemo(() => {
    const totals: Partial<Record<PlutchikEmotion, { sum: number; count: number }>> = {}
    for (const entry of filteredEntries) {
      for (const e of entry.emotionAnalysis!.emotions) {
        if (!totals[e.type]) totals[e.type] = { sum: 0, count: 0 }
        totals[e.type]!.sum += e.score
        totals[e.type]!.count += 1
      }
    }
    return Object.entries(totals)
      .map(([type, { sum, count }]) => ({
        type: type as PlutchikEmotion,
        avg: sum / count,
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [filteredEntries])

  const trendData = useMemo(() => {
    return filteredEntries.map((entry) => {
      const point: Record<string, unknown> = {
        date: new Date(entry.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        entryId: entry.id,
      }
      for (const emotion of TREND_EMOTIONS) {
        const found = entry.emotionAnalysis!.emotions.find((e) => e.type === emotion)
        point[emotion] = found ? Math.round(found.score * 100) : 0
      }
      return point
    })
  }, [filteredEntries])

  const filteredByEmotion = useMemo(() => {
    if (!selectedEmotion) return filteredEntries
    return filteredEntries.filter(
      (e) => e.emotionAnalysis?.dominant === selectedEmotion
    )
  }, [filteredEntries, selectedEmotion])

  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of filteredEntries) {
      for (const topic of entry.topics ?? []) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [filteredEntries])

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  const filteredByTopic = useMemo(() => {
    if (!selectedTopic) return filteredByEmotion
    return filteredByEmotion.filter((e) => e.topics?.includes(selectedTopic))
  }, [filteredByEmotion, selectedTopic])

  const entriesWithLocation = useMemo(
    () => entries.filter((e) => e.location),
    [entries]
  )

  const nudge = useMemo(() => calcNudge(entries), [entries])

  // Weekly art
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

  // Mindset score
  const streak = calcStreak(entries.map((e) => new Date(e.createdAt)))
  const hasEmotionEntries = entries.some((e) => e.emotionAnalysis)
  const mindsetScore = entries.length > 0 && hasEmotionEntries
    ? calcMindsetScore(entries, streak)
    : null

  // Heatmap
  const entryDays = new Set(entries.map((e) => toDateKey(new Date(e.createdAt))))
  const today = new Date()
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (27 - i))
    return { date: d, hasEntry: entryDays.has(toDateKey(d)) }
  })

  // Past self
  const pastEntry = getPastEntry(entries)

  const bubbleSize = (avg: number) => Math.round(44 + avg * 52)
  const hasData = filteredEntries.length > 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">インサイト</h1>
          <p className="text-zinc-500 text-sm mt-1">感情の傾向を振り返る</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                range === r
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-24 text-zinc-600">
          <p className="mb-2">まだ感情分析済みのエントリがありません。</p>
          <button
            onClick={() => router.push('/journal/new')}
            className="text-violet-400 hover:text-violet-300 text-sm"
          >
            エントリを書いてみる →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ① 感情集計バブル */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-1">感情サマリー</h2>
            <p className="text-xs text-zinc-600 mb-5">
              クリックしてエントリを絞り込む
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              {aggregatedEmotions.map(({ type, avg }, i) => {
                const meta = EMOTION_META[type]
                const size = bubbleSize(avg)
                const isActive = selectedEmotion === type

                return (
                  <motion.button
                    key={type}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 20 }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedEmotion(isActive ? null : type)}
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: meta.bg,
                      boxShadow: isActive ? `0 0 0 2px ${meta.color}` : 'none',
                    }}
                    className="rounded-full flex flex-col items-center justify-center cursor-pointer transition-shadow"
                  >
                    <span className="text-xs font-bold leading-tight" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-xs" style={{ color: meta.color, opacity: 0.7 }}>
                      {Math.round(avg * 100)}%
                    </span>
                  </motion.button>
                )
              })}
            </div>
            {selectedEmotion && (
              <p className="text-xs text-zinc-500 mt-4">
                「{EMOTION_META[selectedEmotion].label}」で絞り込み中
                <button
                  onClick={() => setSelectedEmotion(null)}
                  className="ml-2 text-zinc-600 hover:text-zinc-400 underline"
                >
                  解除
                </button>
              </p>
            )}
          </section>

          {/* ② トピックバブル */}
          {topicCounts.length > 0 && (
            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-zinc-400 mb-4">よく書くトピック</h2>
              <div className="flex flex-wrap gap-3 items-end">
                {topicCounts.map(({ topic, count }, i) => {
                  const minSize = 36
                  const maxSize = 80
                  const maxCount = topicCounts[0].count
                  const size = Math.round(minSize + ((count / maxCount) * (maxSize - minSize)))
                  const isActive = selectedTopic === topic
                  return (
                    <motion.button
                      key={topic}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 260, damping: 20 }}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTopic(isActive ? null : topic)}
                      style={{ width: size, height: size }}
                      className={`rounded-full flex flex-col items-center justify-center cursor-pointer transition-all bg-zinc-800 border ${
                        isActive ? 'border-zinc-400' : 'border-zinc-700'
                      }`}
                    >
                      <span className="text-zinc-300 text-xs font-medium leading-tight px-1 text-center line-clamp-2">
                        {topic}
                      </span>
                      {count > 1 && (
                        <span className="text-zinc-500 text-xs mt-0.5">{count}</span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
              {selectedTopic && (
                <p className="text-xs text-zinc-500 mt-4">
                  「{selectedTopic}」で絞り込み中
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="ml-2 text-zinc-600 hover:text-zinc-400 underline"
                  >
                    解除
                  </button>
                </p>
              )}
            </section>
          )}

          {/* 書いた場所 */}
          {entriesWithLocation.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-zinc-400 mb-4">書いた場所</h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden h-64">
                <LocationMap entries={entriesWithLocation} />
              </div>
            </section>
          )}

          {/* エントリ一覧 */}
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
              {selectedTopic
                ? `「${selectedTopic}」のエントリ（${filteredByTopic.length}件）`
                : selectedEmotion
                ? `「${EMOTION_META[selectedEmotion].label}」のエントリ（${filteredByTopic.length}件）`
                : `エントリ一覧（${filteredByTopic.length}件）`}
            </h2>
            <div className="flex flex-col gap-3">
              {[...filteredByTopic].reverse().map((entry) => {
                const dominant = entry.emotionAnalysis!.dominant
                const meta = EMOTION_META[dominant]
                return (
                  <motion.div
                    key={entry.id}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => router.push(`/journal/${entry.id}`)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{entry.title}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {new Date(entry.createdAt).toLocaleDateString('ja-JP', {
                            month: 'long', day: 'numeric',
                          })}
                        </p>
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                        style={{ backgroundColor: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-3">
                      {entry.emotionAnalysis!.emotions.slice(0, 5).map((e) => (
                        <div
                          key={e.type}
                          title={`${EMOTION_META[e.type].label} ${Math.round(e.score * 100)}%`}
                          style={{
                            flex: e.score,
                            backgroundColor: EMOTION_META[e.type].color,
                            opacity: 0.7,
                          }}
                          className="h-1 rounded-full"
                        />
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* ========== 仮出力物 ========== */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-zinc-500 text-xs font-mono whitespace-nowrap">==========仮出力物==========</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>

          {/* 今週のナッジ */}
          {nudge && <NudgeCard nudge={nudge} onNavigate={router.push} />}

          {/* 週次アートカード */}
          {weeklyDominant && (
            <WeeklyArtCard
              weeklyDominant={weeklyDominant}
              weeklyOverall={weeklyOverall}
              cachedUrl={cachedWeeklyUrl}
              onGenerated={setWeeklyArt}
            />
          )}

          {/* マインドセットスコア */}
          {mindsetScore && <MindsetScoreCard score={mindsetScore} />}

          {/* 感情トレンドチャート */}
          {trendData.length >= 2 && (
            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-zinc-400 mb-5">感情トレンド</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    {TREND_EMOTIONS.map((emotion) => (
                      <linearGradient key={emotion} id={`grad-${emotion}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={EMOTION_META[emotion].color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={EMOTION_META[emotion].color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#e4e4e7',
                    }}
                    formatter={(value, name) => [
                      `${value}%`,
                      EMOTION_META[name as PlutchikEmotion]?.label ?? String(name),
                    ]}
                  />
                  {TREND_EMOTIONS.map((emotion) => (
                    <Area
                      key={emotion}
                      type="monotone"
                      dataKey={emotion}
                      stroke={EMOTION_META[emotion].color}
                      strokeWidth={2}
                      fill={`url(#grad-${emotion})`}
                      dot={{ r: 3, fill: EMOTION_META[emotion].color, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {TREND_EMOTIONS.map((emotion) => (
                  <div key={emotion} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: EMOTION_META[emotion].color }}
                    />
                    <span className="text-xs text-zinc-500">{EMOTION_META[emotion].label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ⑦ 28日ヒートマップ */}
          {entries.length > 0 && (
            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-zinc-400 mb-4">28日の記録</h2>
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
            </section>
          )}

          {/* ⑧ 過去の自分から */}
          {pastEntry && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
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

        </div>
      )}
    </div>
  )
}
