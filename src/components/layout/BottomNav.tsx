'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PenLine, BarChart2, BookOpen, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'ホーム',           href: '/dashboard',   icon: LayoutDashboard },
  { label: '書く',             href: '/journal/new', icon: PenLine },
  { label: 'インサイト',       href: '/insights',    icon: BarChart2 },
  { label: 'フレームワーク',   href: '/frameworks',  icon: BookOpen },
  { label: 'メンター',         href: '/mentor',      icon: MessageCircle },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex items-center z-40 md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 py-3 flex-1 transition-colors',
              isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
