'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EmotionAnalysis, EMOTION_META } from '@/lib/types'
import { X } from 'lucide-react'

interface EmotionBubblesProps {
  analysis: EmotionAnalysis
}

export function EmotionBubbles({ analysis }: EmotionBubblesProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const selectedEmotion = analysis.emotions.find((e) => e.type === selected)

  // dominant が EMOTION_META に存在しない場合は最初の感情にフォールバック
  const dominantKey = EMOTION_META[analysis.dominant]
    ? analysis.dominant
    : analysis.emotions[0]?.type

  // バブルサイズをスコアに応じてスケール（最小48px、最大96px）
  function bubbleSize(score: number) {
    return Math.round(48 + score * 48)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
            感情分析
          </span>
          <span className="text-xs text-zinc-500">Plutchikモデル</span>
        </div>
      </div>

      {/* 全体サマリー */}
      <p className="text-zinc-300 text-sm leading-relaxed mt-3 mb-5">
        {analysis.analysisText}
      </p>

      {/* バブル群 */}
      <div className="flex flex-wrap gap-3 items-end mb-5">
        {analysis.emotions.map((emotion, i) => {
          const meta = EMOTION_META[emotion.type]
          if (!meta) return null
          const size = bubbleSize(emotion.score)
          const isSelected = selected === emotion.type

          return (
            <motion.button
              key={emotion.type}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelected(isSelected ? null : emotion.type)}
              style={{
                width: size,
                height: size,
                backgroundColor: meta.bg,
                borderColor: isSelected ? meta.color : 'transparent',
                boxShadow: isSelected ? `0 0 0 2px ${meta.color}` : 'none',
              }}
              className="rounded-full border-2 flex flex-col items-center justify-center transition-shadow cursor-pointer"
            >
              <span className="text-xs font-bold leading-tight" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="text-xs" style={{ color: meta.color, opacity: 0.75 }}>
                {Math.round(emotion.score * 100)}%
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* 選択した感情の詳細パネル */}
      <AnimatePresence>
        {selectedEmotion && (
          <motion.div
            key={selectedEmotion.type}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            style={{ borderColor: EMOTION_META[selectedEmotion.type].color + '40' }}
            className="rounded-xl border p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: EMOTION_META[selectedEmotion.type].color }}
                >
                  {selectedEmotion.label}
                </span>
                <span className="text-xs text-zinc-500">
                  {Math.round(selectedEmotion.score * 100)}%
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-600 hover:text-zinc-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-zinc-300 text-sm mb-3">{selectedEmotion.description}</p>

            {selectedEmotion.spans.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-zinc-500">検出された箇所</span>
                {selectedEmotion.spans.map((span, i) => (
                  <span
                    key={i}
                    className="text-xs text-zinc-300 bg-zinc-800 rounded px-2.5 py-1.5 italic"
                  >
                    「{span}」
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* dominant */}
      {dominantKey && EMOTION_META[dominantKey] && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-zinc-600">主な感情:</span>
          <span
            className="text-xs font-medium"
            style={{ color: EMOTION_META[dominantKey].color }}
          >
            {EMOTION_META[dominantKey].label}
          </span>
          <span className="text-xs text-zinc-600">— {analysis.overall}</span>
        </div>
      )}
    </div>
  )
}
