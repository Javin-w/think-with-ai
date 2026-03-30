import { useState, useRef } from 'react'
import { Plus, ArrowRight } from 'lucide-react'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({ onSend, disabled = false, placeholder = '回复...' }: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Textarea area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none px-4 pt-3 pb-1 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
          style={{ minHeight: '36px', maxHeight: '200px' }}
        />
        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-0.5">
            <button className="w-8 h-8 flex items-center justify-center text-text-secondary/30 hover:text-text-secondary/60 rounded-full transition-colors">
              <Plus size={18} strokeWidth={1.5} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
              value.trim() && !disabled
                ? 'bg-text-primary text-white hover:bg-text-primary/80'
                : 'bg-slate-100 text-text-secondary/30'
            }`}
          >
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
