'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RotateCcw, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { personas, Persona } from '@/lib/personas'
import { useJournalStore } from '@/lib/store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function toPlainText(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

// ストリーミングチャットフック
function useStreamChat(personaId: string, entryContext: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantId = crypto.randomUUID()

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '' },
    ])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          entryContext,
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'エラーが発生しました。もう一度試してください。' }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, personaId, entryContext])

  return { messages, setMessages, input, setInput, isLoading, sendMessage }
}

// ペルソナ選択画面
function PersonaSelector({ onSelect }: { onSelect: (p: Persona) => void }) {
  const EMOJI: Record<string, string> = {
    stoic: '🏛️', cbt: '🧠', psychologist: '💙', challenger: '⚡',
  }
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AIメンター</h1>
        <p className="text-zinc-500 text-sm mt-1">今日対話したいメンターを選んでください</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {personas.map((persona, i) => (
          <motion.button
            key={persona.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(persona)}
            className="text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-colors"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-lg"
              style={{ backgroundColor: persona.bg }}
            >
              {EMOJI[persona.id]}
            </div>
            <h3 className="text-white font-semibold text-sm mb-0.5">{persona.name}</h3>
            <p className="text-xs mb-2" style={{ color: persona.color }}>{persona.role}</p>
            <p className="text-zinc-500 text-xs leading-relaxed">{persona.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// チャット画面
function ChatView({ persona, onReset }: { persona: Persona; onReset: () => void }) {
  const entries = useJournalStore((s) => s.entries)
  const bottomRef = useRef<HTMLDivElement>(null)

  const entryContext = entries
    .slice(0, 3)
    .map((e) => `【${e.title}】\n${toPlainText(e.content)}`)
    .join('\n\n')

  const { messages, setMessages, input, setInput, isLoading, sendMessage } =
    useStreamChat(persona.id, entryContext)

  const EMOJI: Record<string, string> = {
    stoic: '🏛️', cbt: '🧠', psychologist: '💙', challenger: '⚡',
  }

  // ウェルカムメッセージ
  useEffect(() => {
    const welcomes: Record<string, string> = {
      stoic: 'こんにちは。今日、あなたがコントロールできることに意識を向けてみましょう。何が気になっていますか？',
      cbt: 'こんにちは。今日の気分はどうですか？何か頭の中をぐるぐるしていることがあれば、一緒に整理しましょう。',
      psychologist: 'こんにちは。今日ここに来てくださってありがとうございます。今、どんな気持ちでいますか？',
      challenger: '来ましたね。今日、あなたが本当に向き合いたいことは何ですか？',
    }
    setMessages([{ id: 'welcome', role: 'assistant', content: welcomes[persona.id] }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-12rem)] md:h-[calc(100dvh-8rem)]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-base"
            style={{ backgroundColor: persona.bg }}
          >
            {EMOJI[persona.id]}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{persona.name}</p>
            <p className="text-xs" style={{ color: persona.color }}>{persona.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <BookOpen className="w-3 h-3" />
              <span>直近{Math.min(entries.length, 3)}件のエントリを参照中</span>
            </div>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            変える
          </button>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mr-2 mt-1"
                  style={{ backgroundColor: persona.bg }}
                >
                  {EMOJI[persona.id]}
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                }`}
              >
                {msg.content || (
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 bg-zinc-500 rounded-full inline-block"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      <div className="shrink-0 pt-4 border-t border-zinc-800">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力… (⌘+Enter で送信)"
            rows={2}
            className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-700 outline-none resize-none transition-colors leading-relaxed"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-zinc-700 mt-2 text-right">⌘+Enter で送信</p>
      </div>
    </div>
  )
}

export default function MentorPage() {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)

  return selectedPersona ? (
    <ChatView persona={selectedPersona} onReset={() => setSelectedPersona(null)} />
  ) : (
    <PersonaSelector onSelect={setSelectedPersona} />
  )
}
