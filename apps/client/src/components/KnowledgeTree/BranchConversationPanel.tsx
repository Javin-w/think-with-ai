import { useRef, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { ChatMessage, Annotation } from '@repo/types'
import { useTreeStore } from '../../store/treeStore'
import MessageInput from '../Chat/MessageInput'
import TextSelectionPopup from '../TextSelectionPopup/TextSelectionPopup'
import Breadcrumb from './Breadcrumb'
import ParentQuoteCard from './ParentQuoteCard'
import BranchTrigger from './BranchTrigger'
import BranchSummaryCard from './BranchSummaryCard'

interface BranchConversationPanelProps {
  nodeId: string | null
  onSend: (message: string, images?: string[]) => void
  onBranch: (selectedText: string) => void
  onAnnotate?: (selectedText: string, messageId: string) => void
  onHighlightClick?: (annotationId: string) => void
  activeAnnotationId?: string | null
  isStreaming: boolean
}

/** Convert \[...\] → $$...$$ and \(...\) → $...$ for remark-math */
function preprocessLatex(content: string): string {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n')
    .replace(/\\\(([\s\S]*?)\\\)/g, ' $$$1$$ ')
}

const markdownComponents = {
  code({ className, children, ...props }: any) {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className={`${className} font-mono text-[13px] bg-slate-50 rounded block p-4 overflow-x-auto`} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="font-mono text-[13px] bg-slate-100 rounded px-1.5 py-0.5" {...props}>
        {children}
      </code>
    )
  },
  pre({ children }: any) {
    return <pre className="bg-slate-50 rounded-lg overflow-x-auto my-4">{children}</pre>
  },
}

/**
 * Highlight annotated text within a string by wrapping matches in <mark> tags.
 * Returns React nodes with highlighted spans.
 */
function highlightAnnotations(text: string, annotations: Annotation[], onHighlightClick?: (id: string) => void, activeAnnotationId?: string | null): React.ReactNode {
  if (annotations.length === 0) return text

  // Find all annotation matches in this text
  const matches: { start: number; end: number; annotation: Annotation }[] = []
  for (const ann of annotations) {
    const idx = text.indexOf(ann.selectedText)
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + ann.selectedText.length, annotation: ann })
    }
  }

  if (matches.length === 0) return text

  // Sort by start position
  matches.sort((a, b) => a.start - b.start)

  // Build React nodes
  const parts: React.ReactNode[] = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.start > lastEnd) {
      parts.push(text.slice(lastEnd, m.start))
    }
    const isActive = m.annotation.id === activeAnnotationId
    parts.push(
      <mark
        key={m.annotation.id}
        className={`rounded-sm px-0.5 cursor-pointer transition-colors ${
          isActive ? 'bg-yellow-300 animate-pulse' : 'bg-yellow-100/80 hover:bg-yellow-200'
        }`}
        data-annotation-id={m.annotation.id}
        title={m.annotation.content}
        onClick={() => onHighlightClick?.(m.annotation.id)}
      >
        {text.slice(m.start, m.end)}
      </mark>
    )
    lastEnd = m.end
  }
  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd))
  }
  return <>{parts}</>
}

/** Render an AI message with per-paragraph branch triggers and annotation highlights */
function AssistantMessage({ message, onBranch, isStreaming, childBranches, annotations, renderedBranchIds, onHighlightClick, activeAnnotationId }: {
  message: ChatMessage
  onBranch: (text: string) => void
  isStreaming: boolean
  childBranches: { selectedText: string | null; id: string }[]
  annotations: Annotation[]
  renderedBranchIds: Set<string>
  onHighlightClick?: (annotationId: string) => void
  activeAnnotationId?: string | null
}) {
  const { nodes } = useTreeStore()

  // Match branches to this message, but skip already-rendered ones to avoid duplicates
  const matchingBranches = useMemo(() => {
    return childBranches.filter(b =>
      b.selectedText && message.content.includes(b.selectedText) && !renderedBranchIds.has(b.id)
    )
  }, [childBranches, message.content, renderedBranchIds])

  // Mark these as rendered
  matchingBranches.forEach(b => renderedBranchIds.add(b.id))

  const branchNodes = useMemo(() => {
    return matchingBranches
      .map(b => nodes.find(n => n.id === b.id))
      .filter(Boolean) as typeof nodes
  }, [matchingBranches, nodes])

  // Annotations for this specific message
  const messageAnnotations = useMemo(() => {
    return annotations.filter(a => a.messageId === message.id)
  }, [annotations, message.id])

  return (
    <div className="mb-6">
      <article
        data-testid="assistant-message"
        data-message-id={message.id}
        className="prose prose-slate max-w-none prose-headings:font-semibold prose-p:leading-7 prose-p:text-text-primary prose-li:leading-7"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeHighlight, rehypeKatex]}
          components={{
            ...markdownComponents,
            p({ children, ...props }: any) {
              const textContent = typeof children === 'string'
                ? children
                : Array.isArray(children)
                  ? children.map((c: any) => typeof c === 'string' ? c : c?.props?.children || '').join('')
                  : ''

              // Apply annotation highlighting to text children
              const highlightedChildren = messageAnnotations.length > 0 && typeof children === 'string'
                ? highlightAnnotations(children, messageAnnotations, onHighlightClick, activeAnnotationId)
                : children

              return (
                <div className="relative group">
                  <p {...props}>{highlightedChildren}</p>
                  {!isStreaming && textContent.length > 20 && (
                    <BranchTrigger
                      paragraphText={textContent.slice(0, 200)}
                      onBranch={onBranch}
                    />
                  )}
                </div>
              )
            },
          }}
        >
          {preprocessLatex(message.content)}
        </ReactMarkdown>
      </article>

      <BranchSummaryCard branches={branchNodes} />
    </div>
  )
}

export default function BranchConversationPanel({
  nodeId,
  onSend,
  onBranch,
  onAnnotate,
  onHighlightClick,
  activeAnnotationId,
  isStreaming,
}: BranchConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { nodes, getChildNodes } = useTreeStore()
  const node = nodeId ? nodes.find(n => n.id === nodeId) ?? null : null
  const messages = node?.messages ?? []
  const annotations = node?.annotations ?? []
  const isRoot = node?.parentId === null

  const childBranches = useMemo(() => {
    if (!nodeId) return []
    return getChildNodes(nodeId).map(n => ({
      id: n.id,
      selectedText: n.selectedText,
    }))
  }, [nodeId, nodes])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Empty state
  if (!nodeId) {
    return (
      <div className="flex flex-col h-full flex-1">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">NewmanAI 知识树</h2>
            <p className="text-text-secondary leading-relaxed">开始一个话题，探索你的知识</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto w-full">
          <MessageInput onSend={onSend} disabled={isStreaming} placeholder="输入你想探索的话题..." />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full flex-1">
      {/* Header — only show for non-root nodes */}
      {!isRoot && (
        <div className="px-6 py-3 border-b border-border/50 shrink-0">
          <div className="max-w-2xl mx-auto">
            <Breadcrumb nodeId={nodeId} />
            <div className="mt-2">
              <ParentQuoteCard nodeId={nodeId} />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
              开始提问吧...
            </div>
          )}

          {(() => {
            const renderedBranchIds = new Set<string>()
            return messages.map(msg => (
              msg.role === 'user' ? (
                <div key={msg.id} className="mb-5">
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {msg.images.map((src, i) => (
                        <img key={i} src={src} alt="" className="max-w-[200px] max-h-[150px] rounded-lg border border-border/50 object-cover" />
                      ))}
                    </div>
                  )}
                  <p className="text-sm font-medium text-brand">Q: {msg.content}</p>
                </div>
              ) : (
                <AssistantMessage
                  key={msg.id}
                  message={msg}
                  onBranch={onBranch}
                  isStreaming={isStreaming}
                  childBranches={childBranches}
                  annotations={annotations}
                  renderedBranchIds={renderedBranchIds}
                  onHighlightClick={onHighlightClick}
                  activeAnnotationId={activeAnnotationId}
                />
              )
            ))
          })()}

          {isStreaming && (
            <div className="flex items-center gap-3 py-4">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-text-secondary">思考中...</span>
            </div>
          )}
        </div>
      </div>

      {/* Text selection popup with branch + annotate */}
      <TextSelectionPopup onBranch={onBranch} onAnnotate={onAnnotate} disabled={isStreaming} />

      {/* Input */}
      <div className="max-w-2xl mx-auto w-full">
        <MessageInput onSend={onSend} disabled={isStreaming} placeholder="继续对话..." />
      </div>
    </div>
  )
}
