'use client'

import { motion } from 'framer-motion'
import { KeywordMatrix as KeywordMatrixType } from '@/lib/types'

interface KeywordMatrixProps {
  matrix: KeywordMatrixType
  savedKeys: Set<string>
  onToggle: (colIndex: number, rowIndex: number, keyword: string) => void
}

function cellKey(col: number, row: number): string {
  return `${col}-${row}`
}

export function KeywordMatrix({ matrix, savedKeys, onToggle }: KeywordMatrixProps) {
  return (
    <div className="w-full">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">キーワードマトリクス</p>
      <div className="grid grid-cols-3 gap-2">
        {matrix.columns.map((col, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-2">
            {/* 行0: キーワード */}
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: colIndex * 3 * 0.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onToggle(colIndex, 0, col.keyword)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium text-center cursor-pointer transition-all duration-150 border ${
                savedKeys.has(cellKey(colIndex, 0))
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:border-zinc-500'
              }`}
            >
              {col.keyword}
            </motion.button>

            <div className="border-b border-zinc-800" />

            {/* 行1: related1 */}
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (colIndex * 3 + 1) * 0.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onToggle(colIndex, 1, col.related1)}
              className={`rounded-lg px-3 py-2.5 text-xs text-center cursor-pointer transition-all duration-150 border ${
                savedKeys.has(cellKey(colIndex, 1))
                  ? 'bg-violet-900/50 border-violet-700 text-violet-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {col.related1}
            </motion.button>

            {/* 行2: related2 */}
            <motion.button
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (colIndex * 3 + 2) * 0.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onToggle(colIndex, 2, col.related2)}
              className={`rounded-lg px-3 py-2.5 text-xs text-center cursor-pointer transition-all duration-150 border ${
                savedKeys.has(cellKey(colIndex, 2))
                  ? 'bg-violet-900/50 border-violet-700 text-violet-200'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              }`}
            >
              {col.related2}
            </motion.button>
          </div>
        ))}
      </div>
    </div>
  )
}
