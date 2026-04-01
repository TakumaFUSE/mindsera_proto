'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 justify-center mb-10">
        <Sparkles className="w-5 h-5 text-violet-400" />
        <span className="text-2xl font-bold text-white tracking-tight">mindsolo</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-xl font-bold text-white mb-1">おかえりなさい</h1>
        <p className="text-zinc-500 text-sm mb-7">アカウントにログインする</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-500 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-500 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors mt-1"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />ログイン中…</> : 'ログイン'}
          </button>
        </form>
      </div>

      {/* Demo hint */}
      <div className="mt-5 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-2 font-medium">デモアカウントで試す</p>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => { setEmail('mindsera@sample.com'); setPassword('password') }}
            className="text-left text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            📧 mindsera@sample.com
          </button>
          <span className="text-xs text-zinc-600">🔑 password</span>
        </div>
        <p className="text-xs text-zinc-700 mt-2">クリックで自動入力されます</p>
      </div>

      <p className="text-center text-sm text-zinc-600 mt-4">
        アカウントをお持ちでない方は{' '}
        <Link href="/signup" className="text-violet-400 hover:text-violet-300">
          新規登録
        </Link>
      </p>
    </div>
  )
}
