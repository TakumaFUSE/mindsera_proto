'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PenLine,
  BarChart2,
  MessageCircle,
  Sparkles,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { label: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard, enabled: true },
  { label: 'インサイト',     href: '/insights',  icon: BarChart2,       enabled: true },
  { label: 'メンター',       href: '/mentor',    icon: MessageCircle,   enabled: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 h-screen sticky top-0 bg-zinc-900 border-r border-zinc-800 flex-col">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-6 hover:opacity-80 transition-opacity">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <span className="text-xl font-bold text-white tracking-tight">mindsolo</span>
      </Link>

      {/* Write CTA */}
      <div className="px-3 mb-4">
        <Link
          href="/journal/new"
          className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
        >
          <PenLine className="w-4 h-4" />
          エントリを書く
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-600 cursor-not-allowed select-none"
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  )
}
