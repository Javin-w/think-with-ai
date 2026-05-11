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
import { CitationList, injectCitationMarkers } from '../Chat/CitationList'
import { preprocessLatex } from '../../utils/preprocessLatex'

interface BranchConversationPanelProps {
  nodeId: string | null
  onSend: (message: string, images?: string[]) => void
  onBranch: (selectedText: string) => void
  onAnnotate?: (selectedText: string, messageId: string) => void
  onHighlightClick?: (annotationId: string) => void
  activeAnnotationId?: string | null
  isStreaming: boolean
}

const markdownComponents = {
  code({ className, children, ...props }: any) {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className={`${className} font-mono text-[13px] bg-code-bg rounded block p-4 overflow-x-auto`} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="font-mono text-[13px] bg-code-bg text-code-text rounded px-1.5 py-0.5" {...props}>
        {children}
      </code>
    )
  },
  pre({ children }: any) {
    return <pre className="bg-code-bg rounded-lg overflow-x-auto my-4">{children}</pre>
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
        className={`rounded-sm px-0.5 cursor-pointer transition-colors text-text-primary ${
          isActive ? 'bg-brand/40 animate-pulse' : 'bg-brand/20 hover:bg-brand/30'
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

  const citations = message.meta?.citations ?? []
  const searchInProgress = message.meta?.searchInProgress
  const searchQueries = message.meta?.searchQueries ?? []

  return (
    <div className="mb-6">
      {searchInProgress && isStreaming && (
        <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
          <span className="animate-pulse">🔍</span>
          <span>正在搜索：<span className="text-text-primary">{searchInProgress}</span></span>
        </div>
      )}
      {!(searchInProgress && isStreaming) && searchQueries.length > 0 && (
        <div className="text-xs text-text-secondary/70 mb-3">
          🔍 已搜索 {searchQueries.length} 次：
          <span className="opacity-80"> {searchQueries.join(' · ')}</span>
        </div>
      )}

      <article
        data-testid="assistant-message"
        data-message-id={message.id}
        className="prose prose-invert max-w-none prose-headings:font-semibold prose-p:leading-7 prose-p:text-text-primary prose-li:leading-7 prose-strong:text-text-primary prose-a:text-brand prose-code:text-brand"
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

              // Apply annotation highlighting first (operates on raw strings),
              // then citation [N] markers (walks the resulting React tree).
              const annotated = messageAnnotations.length > 0 && typeof children === 'string'
                ? highlightAnnotations(children, messageAnnotations, onHighlightClick, activeAnnotationId)
                : children
              const finalChildren = citations.length > 0
                ? injectCitationMarkers(annotated, citations, message.id)
                : annotated

              return (
                <div className="relative group">
                  <p {...props}>{finalChildren}</p>
                  {!isStreaming && textContent.length > 20 && (
                    <BranchTrigger
                      paragraphText={textContent.slice(0, 200)}
                      onBranch={onBranch}
                    />
                  )}
                </div>
              )
            },
            li({ children, ...props }: any) {
              const finalChildren = citations.length > 0
                ? injectCitationMarkers(children, citations, message.id)
                : children
              return <li {...props}>{finalChildren}</li>
            },
          }}
        >
          {preprocessLatex(message.content)}
        </ReactMarkdown>
      </article>

      <CitationList messageId={message.id} citations={citations} />

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

  const userScrolledUpRef = useRef(false)
  const autoScrollLockedRef = useRef(false)
  const lastProgrammaticScrollRef = useRef(0)

  // Track if user scrolled up manually (ignore programmatic scrolls we trigger)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      // Ignore scroll events fired by our own programmatic scrolls
      if (Date.now() - lastProgrammaticScrollRef.current < 50) return
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      userScrolledUpRef.current = distanceFromBottom > 80
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Reset lock whenever a new message is added (new turn begins)
  useEffect(() => {
    autoScrollLockedRef.current = false
    userScrolledUpRef.current = false
  }, [messages.length])

  // Auto-scroll during streaming, but lock once the latest user question reaches the viewport top
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (autoScrollLockedRef.current || userScrolledUpRef.current) return

    const userMsgs = el.querySelectorAll<HTMLElement>('[data-user-message]')
    const lastUserMsg = userMsgs[userMsgs.length - 1]

    // Lock once the latest Q has scrolled up to the viewport top — let user read from the beginning
    if (lastUserMsg && el.scrollTop >= lastUserMsg.offsetTop) {
      autoScrollLockedRef.current = true
      return
    }

    lastProgrammaticScrollRef.current = Date.now()
    el.scrollTop = el.scrollHeight
  }, [messages])

  // Reset scroll when switching nodes
  useEffect(() => {
    userScrolledUpRef.current = false
    autoScrollLockedRef.current = false
    if (scrollRef.current) {
      lastProgrammaticScrollRef.current = Date.now()
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [nodeId])

  // Empty state
  if (!nodeId) {
    const starterTopics = [
      '什么是量子计算？它有哪些实际应用？',
      'TCP 三次握手的原理是什么？',
      '经济学中的供需关系如何影响价格？',
    ]

    return (
      <div className="flex flex-col h-full flex-1 bg-surface-secondary">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="text-center mb-10 max-w-md">
            {/* Tree branch illustration */}
            <div className="mb-6 flex justify-center">
              <svg width="200" height="100" viewBox="0 0 200 100" fill="none" className="text-brand">
                {/* Root node */}
                <rect x="10" y="38" width="56" height="24" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
                <text x="38" y="54" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="500">提问</text>
                {/* Edges */}
                <path d="M66 50 L90 30" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                <path d="M66 50 L90 50" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                <path d="M66 50 L90 70" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                {/* Branch nodes */}
                <rect x="90" y="18" width="56" height="24" rx="6" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="118" y="34" textAnchor="middle" fill="currentColor" fontSize="9" opacity="0.7">概念 A</text>
                <rect x="90" y="38" width="56" height="24" rx="6" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="118" y="54" textAnchor="middle" fill="currentColor" fontSize="9" opacity="0.7">概念 B</text>
                <rect x="90" y="58" width="56" height="24" rx="6" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="118" y="74" textAnchor="middle" fill="currentColor" fontSize="9" opacity="0.7">概念 C</text>
                {/* Deep branch */}
                <path d="M146 30 L164 22" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
                <rect x="164" y="10" width="32" height="20" rx="5" fill="currentColor" opacity="0.05" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                <text x="180" y="23" textAnchor="middle" fill="currentColor" fontSize="8" opacity="0.4">...</text>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2 tracking-tight">开始构建你的对话树</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              提出一个问题，<span className="text-brand font-medium">选中回答中感兴趣的概念</span>，一键展开为新分支
            </p>
          </div>

          {/* Starter topics */}
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {starterTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => onSend(topic)}
                disabled={isStreaming}
                className="px-3.5 py-2 text-xs text-text-secondary bg-surface border border-border/50 rounded-full hover:border-brand/40 hover:text-brand transition-colors disabled:opacity-50"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
        <div className="max-w-2xl mx-auto w-full">
          <MessageInput onSend={onSend} disabled={isStreaming} placeholder="输入你想探索的话题..." />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full flex-1 bg-surface-secondary">
      {/* Header — only show for non-root nodes */}
      {!isRoot && (
        <div className="px-6 py-3 border-b border-border shrink-0">
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
                <div key={msg.id} data-user-message className="mb-5">
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
