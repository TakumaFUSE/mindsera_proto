import { JournalEntry } from './types'

const toKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function calcStreak(dates: Date[]): number {
  const entryDays = new Set(dates.map(toKey))
  const today = new Date()
  const startOffset = entryDays.has(toKey(today)) ? 0 : 1
  let streak = 0
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (entryDays.has(toKey(d))) streak++
    else break
  }
  return streak
}

export function toDateKey(d: Date): string {
  return toKey(d)
}

export function calculateEnergy(entries: JournalEntry[]): number {
  const today = new Date()
  const entryDays = new Set(entries.map((e) => toKey(new Date(e.createdAt))))

  let energy = 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (entryDays.has(toKey(d))) {
      energy = Math.min(100, energy + 20)
    } else {
      energy = Math.max(0, energy - 5)
    }
  }
  return energy
}
