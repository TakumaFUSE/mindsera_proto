'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useJournalStore } from '@/lib/store'
import { mockEntries } from '@/lib/mock-data'

const DEMO_EMAIL = 'mindsera@sample.com'

export function DemoInitializer() {
  const initEntries = useJournalStore((s) => s.initEntries)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === DEMO_EMAIL) {
        initEntries(mockEntries)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
