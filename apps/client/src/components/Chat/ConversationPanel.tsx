import { useRef, useEffect } from 'react'
import type { ChatMessage, TreeNode } from '@repo/types'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

interface ConversationPanelProps {
  node: TreeNode | null
  onSend: (message: string) => void
  isStreaming?: boolean
}

// Mock messages for UI testing (will be replaced in Task 7)
const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: '什么是量子计算？',
    createdAt: Date.now() - 60000,
  },
  {
    id: '2',
    role: 'assistant',
    content: `量子计算是一种利用**量子力学**原理进行计算的技术。

## 核心概念

1. **量子比特（Qubit）**：与经典比特只能是 0 或 1 不同，量子比特可以处于叠加态
2. **叠加（Superposition）**：量子比特可以同时表示 0 和 1
3. **纠缠（Entanglement）**：多个量子比特可以相互关联

## 代码示例

\`\`\`python
# 量子电路示例（使用 Qiskit）
from qiskit import QuantumCircuit

qc = QuantumCircuit(2)
qc.h(0)  # Hadamard gate - 创建叠加态
qc.cx(0, 1)  # CNOT gate - 创建纠缠
\`\`\`

量子计算机在某些特定问题上比经典计算机快得多，例如**密码学**和**药物发现**。`,
    createdAt: Date.now() - 30000,
  },
]

export default function ConversationPanel({ node, onSend, isStreaming = false }: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Use mock messages for now (Task 7 will wire real data)
  const messages = node?.messages.length ? node.messages : MOCK_MESSAGES

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {node?.selectedText && (
        <div className="px-4 py-3 border-b border-border bg-surface-secondary">
          <p className="text-xs text-text-secondary">探索：</p>
          <p className="text-sm text-text-primary font-medium truncate">{node.selectedText}</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
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
      <MessageInput onSend={onSend} disabled={isStreaming} />
    </div>
  )
}
