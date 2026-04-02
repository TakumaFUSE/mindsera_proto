'use client'

import { useJournalStore } from '@/lib/store'
import { EntryCard } from '@/components/journal/EntryCard'
import { calculateEnergy } from '@/lib/streak'
import { getMentorMessage } from '@/lib/personas'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PenLine } from 'lucide-react'

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
  const energy = calculateEnergy(entries)

  const latestAnalysis = entries[0]?.emotionAnalysis ?? null
  const mentorMsg = latestAnalysis ? getMentorMessage(latestAnalysis.dominant) : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header + Energy */}
      <div className="mb-6">
        <p className="text-zinc-400 text-sm mb-1">{formatHeaderDate()}</p>
        <h1 className="text-2xl font-bold text-white mb-4">{getGreeting()}</h1>
        <div>
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
      </div>

      {/* New entry CTA */}
      <Link
        href="/journal/new"
        className={`flex items-center gap-3 w-full rounded-xl p-4 mb-5 transition-all group ${
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

      {/* Entry list (max 3) */}
      <div>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
          最近のエントリ
        </h2>
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 text-sm mb-1">まだエントリがありません</p>
            <p className="text-zinc-700 text-xs">ジャーナリングを始めて、自分の思考パターンや感情の傾向が見えてきます。</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {entries.slice(0, 3).map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
            {entries.length > 3 && (
              <Link
                href="/insights"
                className="block text-zinc-500 text-xs text-center mt-3 hover:text-zinc-300 transition-colors"
              >
                すべてのエントリを見る →
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
