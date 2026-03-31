import { create } from 'zustand'
import { JournalEntry, EmotionAnalysis } from '@/lib/types'
import { mockEntries } from '@/lib/mock-data'

interface JournalStore {
  entries: JournalEntry[]
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => string
  updateEntry: (id: string, updates: Partial<Omit<JournalEntry, 'id'>>) => void
  setEmotionAnalysis: (id: string, analysis: EmotionAnalysis) => void
  getEntry: (id: string) => JournalEntry | undefined
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: mockEntries,

  addEntry: (entry) => {
    const id = crypto.randomUUID()
    const newEntry: JournalEntry = {
      ...entry,
      id,
      createdAt: new Date(),
    }
    set((state) => ({ entries: [newEntry, ...state.entries] }))
    return id
  },

  updateEntry: (id, updates) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }))
  },

  setEmotionAnalysis: (id, analysis) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, emotionAnalysis: analysis } : e
      ),
    }))
  },

  getEntry: (id) => {
    return get().entries.find((e) => e.id === id)
  },
}))
