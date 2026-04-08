/**
 * Prototype Agent Tools — Simple ReAct: just generate HTML
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { AgentState, SSEEmitter, FeedbackRequester } from '../../core/types'
import type { PrototypeModuleState } from './types'

type ProtoState = AgentState<PrototypeModuleState>

export function createPrototypeTools(state: ProtoState, emit: SSEEmitter, _requestFeedback: FeedbackRequester) {
  const ms = state.moduleState

  return {
    generate_html: tool({
      description:
        '生成或更新 HTML 原型。每次输出完整 HTML 文件。新建时分步调用：先骨架，再逐个添加区块。修改时一次性输出修改后的完整 HTML。可以多次调用。',
      parameters: z.object({
        html: z.string().describe('完整的 HTML 文件内容，不要注释，不要多余空行'),
        changeSummary: z.string().describe('本次新增或修改了什么（简短）'),
      }),
      execute: async ({ html, changeSummary }) => {
        if (ms.currentHtml) {
          ms.htmlSnapshots.push({
            html: ms.currentHtml,
            summary: changeSummary,
            timestamp: Date.now(),
          })
          if (ms.htmlSnapshots.length > 5) {
            ms.htmlSnapshots.shift()
          }
        }

        ms.currentHtml = html

        // Only emit preview here; step event is emitted by runAgent in correct order
        emit({ type: 'preview', html })

        return `HTML 已更新。${changeSummary}`
      },
    }),
  }
}
