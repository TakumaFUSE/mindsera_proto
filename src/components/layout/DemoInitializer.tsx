'use client'

import { useEffect } from 'react'
import { useJournalStore } from '@/lib/store'

export function DemoInitializer() {
  const loadEntries = useJournalStore((s) => s.loadEntries)

  useEffect(() => {
    loadEntries()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
