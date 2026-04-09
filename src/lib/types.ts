export interface KeywordMatrix {
  columns: [
    { keyword: string; related1: string; related2: string },
    { keyword: string; related1: string; related2: string },
    { keyword: string; related1: string; related2: string }
  ]
}

export interface KeywordSave {
  id: string
  entryId: string
  keyword: string
  rowIndex: number
  colIndex: number
  createdAt: string
}

export interface JournalEntry {
  id: string
  title: string
  content: string
  createdAt: Date
  wordCount: number
  summary?: string
  emotionAnalysis?: EmotionAnalysis
  artUrl?: string
  imageUrls?: string[]
  keywordMatrix?: KeywordMatrix
  location?: {
    latitude: number
    longitude: number
    label?: string
  }
  topics?: string[]
}

// Plutchik の8基本感情
export type PlutchikEmotion =
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation'

export interface DetectedEmotion {
  type: PlutchikEmotion
  score: number        // 0.0〜1.0
  label: string        // 日本語ラベル
  description: string  // この感情が検出された理由
  spans: string[]      // 感情の根拠となったテキスト断片
}

export interface EmotionAnalysis {
  emotions: DetectedEmotion[]
  dominant: PlutchikEmotion
  overall: string  // 全体的な感情状態の一言説明
  analysisText: string  // AIからの詳細なフィードバック文
  topics?: string[]
}

export interface CustomMentor {
  id: string
  userId: string
  name: string
  role: string
  description: string
  systemPrompt: string
  color: string
  emoji: string
  createdAt: string
}

export const EMOTION_META: Record<PlutchikEmotion, { label: string; color: string; bg: string }> = {
  joy:          { label: '喜び',    color: '#FBBF24', bg: 'rgba(251,191,36,0.15)'  },
  trust:        { label: '信頼',    color: '#34D399', bg: 'rgba(52,211,153,0.15)'  },
  fear:         { label: '恐れ',    color: '#818CF8', bg: 'rgba(129,140,248,0.15)' },
  surprise:     { label: '驚き',    color: '#38BDF8', bg: 'rgba(56,189,248,0.15)'  },
  sadness:      { label: '悲しみ',  color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
  disgust:      { label: '嫌悪',    color: '#4ADE80', bg: 'rgba(74,222,128,0.15)'  },
  anger:        { label: '怒り',    color: '#F87171', bg: 'rgba(248,113,113,0.15)' },
  anticipation: { label: '期待',    color: '#FB923C', bg: 'rgba(251,146,60,0.15)'  },
}
