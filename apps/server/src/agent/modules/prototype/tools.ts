/**
 * Prototype Agent Tools — Simple ReAct: just generate HTML
 *
 * Tool definitions in OpenAI function-calling format + executor functions.
 */

import type { AgentState, SSEEmitter, FeedbackRequester, ToolSet } from '../../core/types'
import type { PrototypeModuleState } from './types'

type ProtoState = AgentState<PrototypeModuleState>

export function createPrototypeTools(state: ProtoState, emit: SSEEmitter, _requestFeedback: FeedbackRequester): ToolSet {
  const ms = state.moduleState

  return {
    definitions: [
      {
        type: 'function',
        function: {
          name: 'generate_html',
          description:
            '生成或更新 HTML 原型。每次输出完整 HTML 文件。新建时分步调用：先骨架，再逐个添加区块。修改时一次性输出修改后的完整 HTML。可以多次调用。',
          parameters: {
            type: 'object',
            properties: {
              html: {
                type: 'string',
                description: '完整的 HTML 文件内容，不要注释，不要多余空行',
              },
              changeSummary: {
                type: 'string',
                description: '本次新增或修改了什么（简短）',
              },
            },
            required: ['html', 'changeSummary'],
          },
        },
      },
    ],
    executors: {
      generate_html: async (args: Record<string, unknown>) => {
        const html = args.html as string
        const changeSummary = args.changeSummary as string

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

        // Emit preview for real-time iframe update
        emit({ type: 'preview', html })

        return `HTML 已更新。${changeSummary}`
      },
    },
  }
}
