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
