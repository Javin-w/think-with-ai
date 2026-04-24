import { useRef, useEffect } from 'react'
import type { ChatMessage } from '@repo/types'
import MessageBubble from '../Chat/MessageBubble'
import MessageInput from '../Chat/MessageInput'

interface SimpleChatPanelProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  isStreaming: boolean
  placeholder?: string
  emptyStateIcon?: string
  emptyStateText?: string
}

export default function SimpleChatPanel({
  messages,
  onSend,
  isStreaming,
  placeholder,
  emptyStateIcon = '💬',
  emptyStateText = '开始对话吧...',
}: SimpleChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <span className="text-4xl mb-3">{emptyStateIcon}</span>
            <span className="text-sm">{emptyStateText}</span>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex justify-start mb-4">
                <div className="bg-surface border border-border rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={onSend} disabled={isStreaming} placeholder={placeholder} />
    </div>
  )
}
