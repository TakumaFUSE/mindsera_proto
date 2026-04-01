'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  PenLine,
  BarChart2,
  BookOpen,
  MessageCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard, enabled: true },
  { label: '新規エントリ', href: '/journal/new', icon: PenLine, enabled: true },
  { label: 'インサイト', href: '/insights', icon: BarChart2, enabled: true },
  { label: 'フレームワーク', href: '/frameworks', icon: BookOpen, enabled: true },
  { label: 'メンター', href: '/mentor', icon: MessageCircle, enabled: true },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-6 hover:opacity-80 transition-opacity">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <span className="text-xl font-bold text-white tracking-tight">mindsera</span>
      </Link>

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

      {/* Streak */}
      <div className="px-5 py-5 border-t border-zinc-800">
        <span className="text-xs text-zinc-400">🔥 7日連続</span>
      </div>
    </aside>
  )
}
