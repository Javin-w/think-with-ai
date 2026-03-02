import { useRef, useEffect } from 'react'
import { useTreeStore } from '../../store/treeStore'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import TextSelectionPopup from '../TextSelectionPopup/TextSelectionPopup'

interface ConversationPanelProps {
  nodeId: string | null
  onSend: (message: string) => void
  onBranch: (selectedText: string) => void
  isStreaming?: boolean
}

export default function ConversationPanel({ nodeId, onSend, onBranch, isStreaming = false }: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { nodes } = useTreeStore()

  const node = nodeId ? nodes.find(n => n.id === nodeId) ?? null : null
  const messages = node?.messages ?? []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (!nodeId) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        选择或创建一个话题开始探索
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - show selected text if this is a branch node */}
      {node?.selectedText && (
        <div className="px-4 py-3 border-b border-border bg-surface-secondary shrink-0">
          <p className="text-xs text-text-secondary">探索：</p>
          <p className="text-sm text-text-primary font-medium truncate">{node.selectedText}</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-secondary text-sm">
            开始提问吧...
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div data-testid="streaming-indicator" className="flex justify-start mb-4">
            <div className="bg-white border border-border rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}

      {/* Text selection branching popup */}
      <TextSelectionPopup onBranch={onBranch} disabled={isStreaming} />

      <MessageInput onSend={onSend} disabled={isStreaming} />
    </div>
  )
}
