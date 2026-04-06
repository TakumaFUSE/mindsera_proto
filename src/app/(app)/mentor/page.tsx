'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RotateCcw, BookOpen, Plus, Loader2, X } from 'lucide-react'
import { personas, Persona } from '@/lib/personas'
import { CustomMentor } from '@/lib/types'
import { useJournalStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

// NOTE: Supabaseで以下のSQLを実行してください:
// CREATE TABLE IF NOT EXISTS custom_mentors (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   name text NOT NULL,
//   role text NOT NULL,
//   description text NOT NULL,
//   system_prompt text NOT NULL,
//   color text NOT NULL DEFAULT '#8B5CF6',
//   emoji text NOT NULL DEFAULT '✨',
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE custom_mentors ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can manage their own custom mentors"
//   ON custom_mentors FOR ALL
//   USING (auth.uid() = user_id)
//   WITH CHECK (auth.uid() = user_id);

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatPersona {
  id: string
  name: string
  role: string
  systemPrompt: string
  color: string
  bg: string
  emoji: string
  isCustom?: boolean
}

function toChatPersona(p: Persona): ChatPersona {
  return { id: p.id, name: p.name, role: p.role, systemPrompt: p.systemPrompt, color: p.color, bg: p.bg, emoji: p.emoji }
}

function customToChatPersona(m: CustomMentor): ChatPersona {
  return { id: m.id, name: m.name, role: m.role, systemPrompt: m.systemPrompt, color: m.color, bg: m.color + '20', emoji: m.emoji, isCustom: true }
}

function toPlainText(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

const WELCOME_MESSAGES: Record<string, string> = {
  stoic: 'こんにちは。今日、あなたがコントロールできることに意識を向けてみましょう。何が気になっていますか？',
  cbt: 'こんにちは。今日の気分はどうですか？何か頭の中をぐるぐるしていることがあれば、一緒に整理しましょう。',
  psychologist: 'こんにちは。今日ここに来てくださってありがとうございます。今、どんな気持ちでいますか？',
  challenger: '来ましたね。今日、あなたが本当に向き合いたいことは何ですか？',
}
const DEFAULT_WELCOME = 'こんにちは。今日はどんなことを話しましょうか？'

// ---- DB helpers ----
async function loadConversation(personaId: string): Promise<Message[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('mentor_conversations')
    .select('messages')
    .eq('persona_id', personaId)
    .maybeSingle()
  return (data?.messages as Message[]) ?? []
}

async function saveConversation(personaId: string, messages: Message[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('mentor_conversations').upsert(
    { user_id: user.id, persona_id: personaId, messages, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,persona_id' }
  )
}

// ---- Chat hook ----
function useStreamChat(persona: ChatPersona, entryContext: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    setHistoryLoading(true)
    loadConversation(persona.id).then((saved) => {
      if (saved.length > 0) {
        setMessages(saved)
      } else {
        const welcome = WELCOME_MESSAGES[persona.id] ?? DEFAULT_WELCOME
        setMessages([{ id: 'welcome', role: 'assistant', content: welcome }])
      }
      setHistoryLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.id])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantId = crypto.randomUUID()
    const nextMessages: Message[] = [
      ...messages,
      userMsg,
      { id: assistantId, role: 'assistant', content: '' },
    ]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId: persona.isCustom ? undefined : persona.id,
          systemPrompt: persona.isCustom ? persona.systemPrompt : undefined,
          entryContext,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        assistantContent += chunk
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        )
      }

      const finalMessages: Message[] = [
        ...messages,
        userMsg,
        { id: assistantId, role: 'assistant', content: assistantContent },
      ]
      saveConversation(persona.id, finalMessages)
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: 'エラーが発生しました。もう一度試してください。' } : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, persona, entryContext])

  const resetConversation = useCallback(async () => {
    const welcome = WELCOME_MESSAGES[persona.id] ?? DEFAULT_WELCOME
    const welcomeMsg: Message = { id: 'welcome', role: 'assistant', content: welcome }
    setMessages([welcomeMsg])
    setInput('')
    await saveConversation(persona.id, [welcomeMsg])
  }, [persona.id])

  return { messages, input, setInput, isLoading, historyLoading, sendMessage, resetConversation }
}

// ---- Create mentor modal ----
function CreateMentorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (mentor: CustomMentor) => void
}) {
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleCreate = async () => {
    if (!description.trim() || isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })
      if (!res.ok) throw new Error()
      const { name, role, systemPrompt, color, emoji } = await res.json()

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error()

      const { data, error } = await supabase
        .from('custom_mentors')
        .insert({ user_id: user.id, name, role, description: description.trim(), system_prompt: systemPrompt, color, emoji })
        .select()
        .single()
      if (error || !data) throw new Error()

      onCreated({
        id: data.id,
        userId: data.user_id,
        name: data.name,
        role: data.role,
        description: data.description,
        systemPrompt: data.system_prompt,
        color: data.color,
        emoji: data.emoji,
        createdAt: data.created_at,
      })
      onClose()
    } catch {
      // エラーは無視してモーダルを開いたまま
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-8"
      >
        <h2 className="text-xl font-bold text-white">あなただけのメンターをつくる</h2>
        <p className="text-zinc-400 text-sm mt-2 mb-6">
          どんな人と話したいか、自由に教えてください。<br />AIがあなたの理想のメンターを作ります。
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder={`例:\n・元スタートアップCEOで、失敗経験が豊富な人。厳しいけど愛がある。\n・禅の思想を持つ、静かで深い人。短い言葉で本質をついてくる。\n・年上の姉のような存在。話を聞いてくれて、最後は背中を押してくれる。`}
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none transition-colors leading-relaxed"
        />
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={!description.trim() || isGenerating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中…
              </>
            ) : 'つくる'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ---- Persona selector ----
function PersonaSelector({
  customMentors,
  onSelect,
  onDeleteCustom,
  onOpenCreate,
}: {
  customMentors: CustomMentor[]
  onSelect: (p: ChatPersona) => void
  onDeleteCustom: (id: string) => void
  onOpenCreate: () => void
}) {
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
            onClick={() => onSelect(toChatPersona(persona))}
            className="text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-colors"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-lg" style={{ backgroundColor: persona.bg }}>
              {persona.emoji}
            </div>
            <h3 className="text-white font-semibold text-sm mb-0.5">{persona.name}</h3>
            <p className="text-xs mb-2" style={{ color: persona.color }}>{persona.role}</p>
            <p className="text-zinc-500 text-xs leading-relaxed">{persona.description}</p>
          </motion.button>
        ))}
      </div>

      {/* マイメンター */}
      {customMentors.length > 0 && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">マイメンター</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customMentors.map((mentor, i) => (
              <motion.div
                key={mentor.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="relative group"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(customToChatPersona(mentor))}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-lg" style={{ backgroundColor: mentor.color + '20' }}>
                    {mentor.emoji}
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-0.5">{mentor.name}</h3>
                  <p className="text-xs mb-2" style={{ color: mentor.color }}>{mentor.role}</p>
                  <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{mentor.description}</p>
                </motion.button>
                <button
                  onClick={() => onDeleteCustom(mentor.id)}
                  className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* 作成ボタン */}
      <button
        onClick={onOpenCreate}
        className="w-full mt-4 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl p-5 flex items-center justify-center gap-3 transition-colors"
      >
        <Plus className="w-4 h-4 text-zinc-500" />
        <span className="text-zinc-400 text-sm">自分だけのメンターをつくる</span>
      </button>
    </div>
  )
}

// ---- Chat view ----
function ChatView({ persona, onReset }: { persona: ChatPersona; onReset: () => void }) {
  const entries = useJournalStore((s) => s.entries)
  const bottomRef = useRef<HTMLDivElement>(null)

  const entryContext = entries
    .slice(0, 3)
    .map((e) => `【${e.title}】\n${toPlainText(e.content)}`)
    .join('\n\n')

  const { messages, input, setInput, isLoading, historyLoading, sendMessage, resetConversation } =
    useStreamChat(persona, entryContext)

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
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base" style={{ backgroundColor: persona.bg }}>
            {persona.emoji}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{persona.name}</p>
            <p className="text-xs" style={{ color: persona.color }}>{persona.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <BookOpen className="w-3 h-3" />
              <span className="hidden sm:inline">直近{Math.min(entries.length, 3)}件参照中</span>
            </div>
          )}
          <button
            onClick={resetConversation}
            title="新しい会話を始める"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />新しい会話
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3 h-3" />変える
          </button>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : (
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
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mr-2 mt-1" style={{ backgroundColor: persona.bg }}>
                    {persona.emoji}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                }`}>
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
        )}
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

// ---- Page ----
export default function MentorPage() {
  const [selectedPersona, setSelectedPersona] = useState<ChatPersona | null>(null)
  const [customMentors, setCustomMentors] = useState<CustomMentor[]>([])
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('custom_mentors')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) {
        setCustomMentors(data.map((d) => ({
          id: d.id,
          userId: d.user_id,
          name: d.name,
          role: d.role,
          description: d.description,
          systemPrompt: d.system_prompt,
          color: d.color,
          emoji: d.emoji,
          createdAt: d.created_at,
        })))
      }
    }
    load()
  }, [])

  const handleDeleteCustom = async (id: string) => {
    const supabase = createClient()
    await supabase.from('custom_mentors').delete().eq('id', id)
    setCustomMentors((prev) => prev.filter((m) => m.id !== id))
  }

  const handleCreated = (mentor: CustomMentor) => {
    setCustomMentors((prev) => [mentor, ...prev])
  }

  return (
    <>
      <AnimatePresence>
        {isCreating && (
          <CreateMentorModal
            onClose={() => setIsCreating(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
      {selectedPersona ? (
        <ChatView persona={selectedPersona} onReset={() => setSelectedPersona(null)} />
      ) : (
        <PersonaSelector
          customMentors={customMentors}
          onSelect={setSelectedPersona}
          onDeleteCustom={handleDeleteCustom}
          onOpenCreate={() => setIsCreating(true)}
        />
      )}
    </>
  )
}
