'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PenLine, BarChart2, BookOpen, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'ホーム',         href: '/dashboard',   icon: LayoutDashboard, isCenterAction: false },
  { label: 'インサイト',     href: '/insights',    icon: BarChart2,       isCenterAction: false },
  { label: '書く',           href: '/journal/new', icon: PenLine,         isCenterAction: true  },
  { label: 'メンター',       href: '/mentor',      icon: MessageCircle,   isCenterAction: false },
  { label: 'フレームワーク', href: '/frameworks',  icon: BookOpen,        isCenterAction: false },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex items-center z-40 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href))

        if (item.isCenterAction) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-3 flex-1"
            >
              <span className="w-11 h-11 -mt-4 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/30">
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-[10px] leading-none text-violet-400">{item.label}</span>
            </Link>
          )
        }

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
