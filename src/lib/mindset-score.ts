import { JournalEntry } from './types'

export interface MindsetScore {
  total: number
  emotionBalance: number  // 0-40
  writingDepth: number    // 0-30
  consistency: number     // 0-30
  grade: 'critical' | 'fair' | 'good' | 'excellent'
  gradeLabel: string
  gradeColor: string
  interpretation: string
}

const POSITIVE_EMOTIONS = ['joy', 'trust', 'anticipation']
const NEGATIVE_EMOTIONS = ['fear', 'sadness', 'disgust', 'anger']

export function calcMindsetScore(entries: JournalEntry[], streak: number): MindsetScore {
  // 1. 感情バランス (0-40)
  const analyzedEntries = entries.filter((e) => e.emotionAnalysis).slice(0, 7)

  let emotionBalance = 20 // デフォルト: 中立
  if (analyzedEntries.length > 0) {
    const balances = analyzedEntries.map((e) => {
      const emotions = e.emotionAnalysis!.emotions
      const posScores = emotions
        .filter((em) => POSITIVE_EMOTIONS.includes(em.type))
        .map((em) => em.score)
      const negScores = emotions
        .filter((em) => NEGATIVE_EMOTIONS.includes(em.type))
        .map((em) => em.score)
      const posAvg =
        posScores.length > 0
          ? posScores.reduce((a, b) => a + b, 0) / posScores.length
          : 0.3
      const negAvg =
        negScores.length > 0
          ? negScores.reduce((a, b) => a + b, 0) / negScores.length
          : 0.3
      return posAvg - negAvg // -1 〜 1
    })
    const avg = balances.reduce((a, b) => a + b, 0) / balances.length
    emotionBalance = Math.round(((avg + 1) / 2) * 40)
  }

  // 2. 思考の深さ (0-30)
  const recentEntries = entries.slice(0, 10)
  const avgWordCount =
    recentEntries.length > 0
      ? recentEntries.reduce((a, e) => a + e.wordCount, 0) / recentEntries.length
      : 0
  const writingDepth = Math.round(Math.min(avgWordCount / 150, 1) * 30)

  // 3. 継続性 (0-30)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentCount = entries.filter((e) => new Date(e.createdAt) >= sevenDaysAgo).length
  const streakScore = Math.round(Math.min(streak / 7, 1) * 20)
  const frequencyScore = Math.round(Math.min(recentCount / 7, 1) * 10)
  const consistency = streakScore + frequencyScore

  const total = emotionBalance + writingDepth + consistency

  let grade: MindsetScore['grade']
  let gradeLabel: string
  let gradeColor: string
  let interpretation: string

  if (total >= 76) {
    grade = 'excellent'
    gradeLabel = '最良'
    gradeColor = '#34D399'
    interpretation = '心身のバランスが取れた良好な状態です。ポジティブな感情と深い思考が高いレベルで維持されています。'
  } else if (total >= 61) {
    grade = 'good'
    gradeLabel = '良好'
    gradeColor = '#60A5FA'
    interpretation = '全体的に安定したメンタル状態です。継続的なジャーナリングでさらに深い洞察を得られるでしょう。'
  } else if (total >= 41) {
    grade = 'fair'
    gradeLabel = '普通'
    gradeColor = '#FBBF24'
    interpretation = '改善の余地があります。感情と向き合う時間を増やし、フレームワークを活用してみましょう。'
  } else {
    grade = 'critical'
    gradeLabel = '要注意'
    gradeColor = '#F87171'
    interpretation = '心のサポートが必要かもしれません。AIメンターとの対話や、毎日の記録を続けることで改善が期待できます。'
  }

  return { total, emotionBalance, writingDepth, consistency, grade, gradeLabel, gradeColor, interpretation }
}
