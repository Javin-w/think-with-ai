/**
 * AgentChatPanel — Chat panel with Agent step progress display
 *
 * Shows:
 * - User messages
 * - Agent step cards (with progress indicators)
 * - Plan progress checklist
 * - Clarification questions
 * - Error messages
 */

import { useRef, useEffect, type ReactNode } from 'react'
import type { ChatMessage, AgentStep, PrototypePlan } from '@repo/types'
import MessageBubble from '../Chat/MessageBubble'
import MessageInput from '../Chat/MessageInput'

export interface ToolLabelMap {
  [toolName: string]: { icon: string; label: string }
}

export interface AgentChatPanelProps {
  messages: ChatMessage[]
  steps: AgentStep[]
  plan: PrototypePlan | null
  isRunning: boolean
  clarifyQuestions: string[]
  error: string | null
  onSend: (message: string) => void
  /** Custom tool labels — defaults to prototype tools */
  toolLabels?: ToolLabelMap
  /** Custom progress renderer — defaults to PlanProgress */
  renderProgress?: (plan: PrototypePlan) => ReactNode
  /** Placeholder text for input */
  placeholder?: string
  /** Empty state icon */
  emptyStateIcon?: string
  /** Empty state title */
  emptyStateTitle?: string
  /** Empty state description */
  emptyStateText?: string
}

const DEFAULT_TOOL_LABELS: ToolLabelMap = {
  analyze_requirement: { icon: '🔍', label: '分析需求' },
  create_plan: { icon: '📋', label: '制定计划' },
  generate_html: { icon: '🎨', label: '生成页面' },
  review_html: { icon: '✅', label: '审查原型' },
  finalize_prototype: { icon: '🚀', label: '完成输出' },
}

function StepCard({ step, toolLabels }: { step: AgentStep; toolLabels: ToolLabelMap }) {
  const toolInfo = toolLabels[step.tool] ?? { icon: '⚙️', label: step.tool }
  return (
    <div className="flex items-start gap-2 px-3 py-2 mb-2 bg-white border border-border rounded-lg text-xs">
      <span className="text-base leading-none mt-0.5">{toolInfo.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-primary">{toolInfo.label}</div>
        <div className="text-text-secondary mt-0.5 truncate">{step.summary}</div>
      </div>
    </div>
  )
}

function PlanProgress({ plan }: { plan: PrototypePlan }) {
  return (
    <div className="px-3 py-2 mb-3 bg-white border border-border rounded-lg text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-text-primary">构建计划</span>
        <span className="text-text-secondary">{plan.globalProgress}%</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-500"
          style={{ width: `${plan.globalProgress}%` }}
        />
      </div>
      {/* Section list */}
      <div className="space-y-1">
        {plan.sections.map((section) => (
          <div key={section.id} className="flex items-center gap-1.5">
            <span className="text-[10px]">
              {section.status === 'done' ? '✅' : section.status === 'in-progress' ? '🔄' : '⏳'}
            </span>
            <span
              className={
                section.status === 'done' ? 'text-text-secondary line-through' : 'text-text-primary'
              }
            >
              {section.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AgentChatPanel({
  messages,
  steps,
  plan,
  isRunning,
  clarifyQuestions,
  error,
  onSend,
  toolLabels = DEFAULT_TOOL_LABELS,
  renderProgress,
  placeholder = '描述你想要的页面原型，或对现有原型提出修改...',
  emptyStateIcon = '🤖',
  emptyStateTitle = 'AI 原型 Agent',
  emptyStateText = '描述你的产品需求，Agent 会分析需求、制定计划、逐步生成可交互的 HTML 原型',
}: AgentChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, steps])

  const isEmpty = messages.length === 0 && steps.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages + Steps */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <span className="text-4xl mb-3">{emptyStateIcon}</span>
            <span className="text-sm font-medium mb-1">{emptyStateTitle}</span>
            <span className="text-xs text-center max-w-[260px]">
              {emptyStateText}
            </span>
          </div>
        ) : (
          <>
            {/* Render messages interleaved with step cards */}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Plan progress (shown when plan exists and agent is running) */}
            {plan && plan.sections.length > 0 && (
              renderProgress ? renderProgress(plan) : <PlanProgress plan={plan} />
            )}

            {/* Agent steps */}
            {steps.length > 0 && (
              <div className="mb-3">
                {steps.map((step) => (
                  <StepCard key={step.id} step={step} toolLabels={toolLabels} />
                ))}
              </div>
            )}

            {/* Clarification questions */}
            {clarifyQuestions.length > 0 && (
              <div className="px-3 py-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                <div className="font-medium text-amber-800 mb-1">需要补充一些信息：</div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  {clarifyQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-3 py-2 mb-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Running indicator */}
            {isRunning && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-brand rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-brand rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-brand rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary">Agent 工作中...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={onSend}
        disabled={isRunning}
        placeholder={placeholder}
      />
    </div>
  )
}
