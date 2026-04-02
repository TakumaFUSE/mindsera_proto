'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Bold, Italic, List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JournalEditorProps {
  content: string
  onChange?: (content: string, wordCount: number) => void
  editable?: boolean
  placeholder?: string
}

export function JournalEditor({
  content,
  onChange,
  editable = true,
  placeholder = '今日はどんなことを考えていますか？',
}: JournalEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const html = editor.getHTML()
        const charCount = editor.getText().replace(/\s+/g, '').length
        onChange(html, charCount)
      }
    },
  })

  if (!editor) return null

  return (
    <div className="flex flex-col gap-2">
      {editable && (
        <div className="flex items-center gap-1 pb-2 border-b border-zinc-800">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-zinc-700 text-white'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      )}
    >
      {children}
    </button>
  )
}
