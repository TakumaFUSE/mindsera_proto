import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { DemoInitializer } from '@/components/layout/DemoInitializer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950">
      <DemoInitializer />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 app-main-pb">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
