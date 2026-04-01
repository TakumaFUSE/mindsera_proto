'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { useJournalStore } from '@/lib/store'
import { EMOTION_META, PlutchikEmotion } from '@/lib/types'

type Range = '7' | '30' | 'all'

const RANGE_LABELS: Record<Range, string> = {
  '7': '7日間',
  '30': '30日間',
  'all': 'すべて',
}

// トレンドチャートに表示する感情（多すぎると見づらいので上位4つ）
const TREND_EMOTIONS: PlutchikEmotion[] = ['joy', 'sadness', 'fear', 'anticipation']

export default function InsightsPage() {
  const entries = useJournalStore((s) => s.entries)
  const router = useRouter()
  const [range, setRange] = useState<Range>('all')
  const [selectedEmotion, setSelectedEmotion] = useState<PlutchikEmotion | null>(null)

  // 期間フィルター
  const filteredEntries = useMemo(() => {
    const sorted = [...entries]
      .filter((e) => e.emotionAnalysis)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (range === 'all') return sorted
    const days = Number(range)
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return sorted.filter((e) => new Date(e.createdAt).getTime() >= cutoff)
  }, [entries, range])

  // 全エントリの感情を集計（平均スコア）
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

  // 時系列トレンドデータ
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

  // dominant感情でフィルタしたエントリ
  const filteredByEmotion = useMemo(() => {
    if (!selectedEmotion) return filteredEntries
    return filteredEntries.filter(
      (e) => e.emotionAnalysis?.dominant === selectedEmotion
    )
  }, [filteredEntries, selectedEmotion])

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
        {/* 期間フィルター */}
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

          {/* ② 感情トレンドチャート */}
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
              {/* 凡例 */}
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

          {/* ③ エントリ一覧（絞り込み対応） */}
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
              {selectedEmotion
                ? `「${EMOTION_META[selectedEmotion].label}」のエントリ（${filteredByEmotion.length}件）`
                : `エントリ一覧（${filteredByEmotion.length}件）`}
            </h2>
            <div className="flex flex-col gap-3">
              {[...filteredByEmotion].reverse().map((entry) => {
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
                    {/* ミニ感情バー */}
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

        </div>
      )}
    </div>
  )
}
