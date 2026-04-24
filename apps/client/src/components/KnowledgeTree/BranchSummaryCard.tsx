import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { TreeNode } from '@repo/types'
import { useTreeStore } from '../../store/treeStore'
import { getNodeLabel } from '../../store/treeUtils'
import { preprocessLatex } from '../../utils/preprocessLatex'

interface BranchSummaryCardProps {
  branches: TreeNode[]
}

export default function BranchSummaryCard({ branches }: BranchSummaryCardProps) {
  const { setCurrentNode } = useTreeStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (branches.length === 0) return null

  return (
    <div className="space-y-2 mt-2">
      {branches.map(branch => {
        const isExpanded = expandedId === branch.id
        const label = getNodeLabel(branch, 40)
        const msgCount = branch.messages.length

        return (
          <div key={branch.id} className="border border-border/60 rounded-lg overflow-hidden">
            {/* Collapsed header */}
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : branch.id)}
            >
              <span className="text-xs">{isExpanded ? '▼' : '▸'}</span>
              <span className="text-xs text-text-secondary">
                分支：
              </span>
              <span className="text-xs font-medium text-text-primary truncate flex-1">
                {label}
              </span>
              <span className="text-[10px] text-text-secondary/60">
                {msgCount}条对话
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentNode(branch.id)
                }}
                className="text-[10px] text-brand hover:underline shrink-0"
              >
                跳转
              </button>
            </div>

            {/* Expanded: show branch conversation */}
            {isExpanded && (
              <div className="border-t border-border/40 px-4 py-3 bg-slate-50/50 max-h-60 overflow-y-auto">
                {branch.messages.length === 0 ? (
                  <p className="text-xs text-text-secondary">暂无对话</p>
                ) : (
                  <div className="space-y-3">
                    {branch.messages.map(msg => (
                      <div key={msg.id}>
                        {msg.role === 'user' ? (
                          <p className="text-xs font-medium text-brand">Q: {msg.content}</p>
                        ) : (
                          <div className="prose prose-slate prose-xs max-w-none mt-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {preprocessLatex(msg.content)}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
