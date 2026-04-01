'use client'

import { motion } from 'framer-motion'
import { MindsetScore } from '@/lib/mindset-score'

function RadialGauge({ value, color }: { value: number; color: string }) {
  const size = 128
  const strokeWidth = 9
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - value / 100)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-white tabular-nums"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {value}
        </motion.span>
        <span className="text-xs text-zinc-600 mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

function SubScore({
  label,
  value,
  max,
  color,
  delay,
}: {
  label: string
  value: number
  max: number
  color: string
  delay: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs font-medium text-zinc-300 tabular-nums">
          {value}
          <span className="text-zinc-700">/{max}</span>
        </span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay }}
        />
      </div>
    </div>
  )
}

export function MindsetScoreCard({ score }: { score: MindsetScore }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-semibold text-sm">マインドセットスコア</h2>
          <p className="text-zinc-600 text-xs mt-0.5">感情・思考・継続性から算出</p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${score.gradeColor}22`, color: score.gradeColor }}
        >
          {score.gradeLabel}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-7">
        <RadialGauge value={score.total} color={score.gradeColor} />

        <div className="flex-1 flex flex-col gap-3.5">
          <SubScore label="感情バランス" value={score.emotionBalance} max={40} color="#FBBF24" delay={0.2} />
          <SubScore label="思考の深さ" value={score.writingDepth} max={30} color="#818CF8" delay={0.35} />
          <SubScore label="継続性" value={score.consistency} max={30} color="#34D399" delay={0.5} />
        </div>
      </div>

      <p className="text-zinc-500 text-xs leading-relaxed mt-5 pt-4 border-t border-zinc-800">
        {score.interpretation}
      </p>
    </div>
  )
}
