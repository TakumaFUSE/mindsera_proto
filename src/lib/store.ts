import { create } from 'zustand'
import { JournalEntry, EmotionAnalysis } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface JournalStore {
  entries: JournalEntry[]
  loadEntries: () => Promise<void>
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => string
  updateEntry: (id: string, updates: Partial<Omit<JournalEntry, 'id'>>) => void
  setEmotionAnalysis: (id: string, analysis: EmotionAnalysis) => void
  setArtUrl: (id: string, url: string) => void
  getEntry: (id: string) => JournalEntry | undefined
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: [],

  loadEntries: async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data) return

    const entries: JournalEntry[] = data.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: new Date(row.created_at),
      wordCount: row.word_count,
      summary: row.summary ?? undefined,
      artUrl: row.art_url ?? undefined,
      emotionAnalysis: row.emotion_analysis ?? undefined,
    }))
    set({ entries })
  },

  addEntry: (entry) => {
    const id = crypto.randomUUID()
    const newEntry: JournalEntry = { ...entry, id, createdAt: new Date() }
    set((state) => ({ entries: [newEntry, ...state.entries] }))

    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('journal_entries').insert({
        id,
        user_id: user.id,
        title: entry.title,
        content: entry.content,
        word_count: entry.wordCount,
        created_at: newEntry.createdAt.toISOString(),
        updated_at: newEntry.createdAt.toISOString(),
      })
    })()

    return id
  },

  updateEntry: (id, updates) => {
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.content !== undefined) dbUpdates.content = updates.content
    if (updates.wordCount !== undefined) dbUpdates.word_count = updates.wordCount
    if (updates.summary !== undefined) dbUpdates.summary = updates.summary

    const supabase = createClient()
    supabase.from('journal_entries').update(dbUpdates).eq('id', id)
  },

  setEmotionAnalysis: (id, analysis) => {
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, emotionAnalysis: analysis } : e)),
    }))

    const supabase = createClient()
    supabase.from('journal_entries').update({
      emotion_analysis: analysis,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
  },

  setArtUrl: (id, url) => {
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, artUrl: url } : e)),
    }))

    const supabase = createClient()
    supabase.from('journal_entries').update({
      art_url: url,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
  },

  getEntry: (id) => {
    return get().entries.find((e) => e.id === id)
  },
}))
