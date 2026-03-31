'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { frameworks, CATEGORY_META, FrameworkCategory } from '@/lib/frameworks'

const ALL = 'all'
type Filter = FrameworkCategory | typeof ALL

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all',       label: 'すべて' },
  { value: 'thinking',  label: '思考整理' },
  { value: 'decision',  label: '意思決定' },
  { value: 'reflection',label: '内省' },
  { value: 'goal',      label: '目標設定' },
  { value: 'emotion',   label: '感情管理' },
]

export default function FrameworksPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all'
    ? frameworks
    : frameworks.filter((f) => f.category === filter)

  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">フレームワーク</h1>
        <p className="text-zinc-500 text-sm mt-1">
          思考を深めるメンタルモデルを選んで、ガイド付きジャーナリングを始めよう
        </p>
      </div>

      {/* カテゴリーフィルター */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filter === value
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* カードグリッド */}
      <div className="flex flex-col gap-3">
        {visible.map((fw, i) => {
          const meta = CATEGORY_META[fw.category]
          return (
            <motion.div
              key={fw.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => router.push(`/frameworks/${fw.id}`)}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 cursor-pointer transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* カテゴリーバッジ */}
                  <span
                    className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <h2 className="text-white font-semibold leading-snug mb-1">
                    {fw.name}
                  </h2>
                  <p className="text-zinc-500 text-xs mb-2">{fw.nameEn}</p>
                  <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">
                    {fw.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-1 transition-colors" />
              </div>

              {/* フッター */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-zinc-800">
                <span className="text-xs text-zinc-600">
                  {fw.steps.length} ステップ
                </span>
                <span className="text-zinc-800">·</span>
                <span className="text-xs text-zinc-500 italic">
                  {fw.purpose}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
