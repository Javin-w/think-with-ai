/**
 * AgentChatPanel — Chat panel with activity timeline for prototype agent
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { ChatMessage } from '@repo/types'
import type { AgentActivity } from '../../hooks/useAgentStream'
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react'

export interface AgentChatPanelProps {
  messages: ChatMessage[]
  isRunning: boolean
  activities: AgentActivity[]
  error: string | null
  onSend: (message: string, images?: string[]) => void
  onBack?: () => void
  onNewPrototype?: () => void
  placeholder?: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Render a single activity item in the timeline */
function ActivityItem({ activity, isLast, isRunning }: { activity: AgentActivity; isLast: boolean; isRunning: boolean }) {
  const isActive = isLast && isRunning

  if (activity.type === 'thinking') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-brand animate-pulse' : 'bg-text-secondary/30'}`} />
        <span className={isActive ? 'text-brand/70' : 'text-text-secondary/40'}>
          {activity.content}
        </span>
      </div>
    )
  }

  if (activity.type === 'text') {
    return (
      <div className="flex items-start gap-2 text-xs">
        <span className="text-blue-400 mt-0.5 shrink-0">💬</span>
        <span className="text-text-primary/60 leading-relaxed">{activity.content}</span>
      </div>
    )
  }

  // tool-done — only this type shows elapsed time
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-emerald-500">✓</span>
      <span className="text-text-primary/70">{activity.content}</span>
      {activity.elapsed > 0 && (
        <span className="text-text-secondary/30 tabular-nums">{activity.elapsed}s</span>
      )}
    </div>
  )
}

/** Collapsible activity timeline */
function ActivityTimeline({ activities, isRunning, elapsed }: { activities: AgentActivity[]; isRunning: boolean; elapsed: number }) {
  const [collapsed, setCollapsed] = useState(false)

  // When running, always show expanded
  useEffect(() => {
    if (isRunning) setCollapsed(false)
  }, [isRunning])

  if (activities.length === 0) return null

  const totalElapsed = isRunning ? elapsed : (activities[activities.length - 1]?.elapsed ?? 0)

  return (
    <div className="flex gap-4 items-start">
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0 ${isRunning ? 'animate-pulse' : ''}`}>
        <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
      </div>
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {isRunning ? (
            <>
              <span className="text-xs font-medium text-brand/70">Agent 工作中</span>
              <span className="text-xs text-text-secondary/50 tabular-nums">{elapsed}s</span>
            </>
          ) : (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="flex items-center gap-1 text-xs text-text-secondary/50 hover:text-text-secondary transition-colors"
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>生成过程</span>
              <span className="tabular-nums">{totalElapsed}s</span>
            </button>
          )}
        </div>

        {/* Activity items */}
        {(isRunning || !collapsed) && (
          <div className="space-y-1.5 pl-0.5 border-l border-gray-100 ml-0.5">
            {activities.map((act, i) => (
              <div key={act.id} className="pl-3">
                <ActivityItem
                  activity={act}
                  isLast={i === activities.length - 1}
                  isRunning={isRunning}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentChatPanel({
  messages,
  isRunning,
  activities,
  error,
  onSend,
  onBack,
  onNewPrototype,
  placeholder = '描述你想要的界面原型...',
}: AgentChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)

  // Timer
  useEffect(() => {
    if (!isRunning) { setElapsed(0); return }
    setElapsed(0)
    const interval = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activities, isRunning])

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) return
    const base64s = await Promise.all(fileArray.map(fileToBase64))
    setImages(prev => [...prev, ...base64s].slice(0, 4))
  }, [])

  const handleSend = () => {
    const trimmed = inputValue.trim()
    if ((!trimmed && images.length === 0) || isRunning) return
    onSend(trimmed, images.length > 0 ? images : undefined)
    setInputValue('')
    setImages([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean) as File[]
    if (files.length > 0) { e.preventDefault(); addImages(files) }
  }, [addImages])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); addImages(e.dataTransfer.files)
  }, [addImages])

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const hasContent = inputValue.trim() || images.length > 0
  const isEmpty = messages.length === 0 && activities.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 space-y-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-sm text-text-secondary/50 hover:text-text-primary transition-colors">
              ←
            </button>
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand/60">
            {isEmpty ? 'New Session' : 'Prototype'}
          </span>
          {onNewPrototype && !isEmpty && (
            <button onClick={onNewPrototype} className="ml-auto text-[11px] text-text-secondary/50 hover:text-brand transition-colors">
              + 新建
            </button>
          )}
        </div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-text-primary">Design Assistant</h1>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pb-40 space-y-8">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
              <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
            </div>
            <p className="text-base text-text-primary/80 font-medium max-w-xs leading-relaxed">
              描述你的产品需求，我会帮你生成可交互的原型
            </p>
          </div>
        ) : (
          <>
            {(() => {
              // Find the last assistant message index to insert timeline before it
              const lastAssistantIdx = !isRunning
                ? messages.reduce((acc, m, i) => m.role === 'assistant' ? i : acc, -1)
                : -1

              return messages.map((msg, idx) => (
                <React.Fragment key={msg.id}>
                  {/* Insert activity timeline before the last assistant message */}
                  {idx === lastAssistantIdx && activities.length > 0 && (
                    <ActivityTimeline activities={activities} isRunning={isRunning} elapsed={elapsed} />
                  )}
                  <div>
                    {msg.role === 'assistant' ? (
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10">
                          <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                        </div>
                        <div className="max-w-[85%]">
                          <p className="text-[15px] leading-relaxed text-text-primary/90 whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <div className="bg-[#f2f4f6] px-6 py-4 rounded-2xl max-w-[85%]">
                          {msg.images && msg.images.length > 0 && (
                            <div className="flex gap-2 mb-2">
                              {msg.images.map((src, i) => (
                                <img key={i} src={src} alt="" className="w-20 h-20 rounded-lg object-cover" />
                              ))}
                            </div>
                          )}
                          <p className="text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))
            })()}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Activity timeline during running (no completion message yet) */}
            {(isRunning || messages.every(m => m.role !== 'assistant')) && activities.length > 0 && (
              <ActivityTimeline activities={activities} isRunning={isRunning} elapsed={elapsed} />
            )}
          </>
        )}
      </div>

      {/* Floating input bar */}
      <div className="absolute bottom-0 left-0 w-full p-6">
        <div
          className="bg-white/80 backdrop-blur-2xl rounded-2xl p-3 flex items-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200/50"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary/40 hover:bg-gray-100 transition-colors shrink-0"
          >
            <Plus size={20} strokeWidth={1.5} />
          </button>

          {images.length > 0 && (
            <div className="flex gap-1.5">
              {images.map((src, i) => (
                <div key={i} className="relative w-10 h-10 rounded-lg overflow-hidden border border-border/50 group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isRunning}
            placeholder={placeholder}
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-text-primary text-sm placeholder:text-text-secondary/40 resize-none py-2 disabled:opacity-50"
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />

          <button
            onClick={handleSend}
            disabled={isRunning || !hasContent}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
              hasContent && !isRunning
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95'
                : 'bg-gray-100 text-text-secondary/30'
            }`}
          >
            <span className="material-symbols-outlined text-lg">arrow_upward</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) addImages(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}
