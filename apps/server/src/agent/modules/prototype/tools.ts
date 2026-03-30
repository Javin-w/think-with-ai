/**
 * Prototype Agent Tools — 5 tools for HTML prototype generation
 */

import { tool } from 'ai'
import { z } from 'zod'
import type { AgentState, SSEEmitter, FeedbackRequester } from '../../core/types'
import type { PrototypeModuleState } from './types'

type ProtoState = AgentState<PrototypeModuleState>

export function createPrototypeTools(state: ProtoState, emit: SSEEmitter, requestFeedback: FeedbackRequester) {
  const ms = state.moduleState

  return {
    analyze_requirement: tool({
      description:
        '分析用户的产品需求描述，提取关键信息。当用户首次描述需求或需求发生重大变化时，必须首先调用此工具。如果需求不够清晰，通过 clarifications 字段列出需要用户补充的问题（最多3个）。',
      parameters: z.object({
        targetUsers: z.string().describe('目标用户群体'),
        coreFeatures: z.array(z.string()).describe('核心功能列表'),
        pageType: z
          .enum(['landing', 'dashboard', 'form', 'list', 'detail', 'multi-page'])
          .describe('页面类型'),
        designStyle: z.string().describe('设计风格关键词，如"简约商务"、"活泼年轻"'),
        clarifications: z
          .array(z.string())
          .optional()
          .describe('需要用户澄清的问题，最多3个。如果需求已经足够清晰则不填'),
      }),
      execute: async ({ targetUsers, coreFeatures, pageType, designStyle, clarifications }) => {
        ms.requirementSummary = `目标用户: ${targetUsers}\n核心功能: ${coreFeatures.join(', ')}\n页面类型: ${pageType}\n设计风格: ${designStyle}`

        if (clarifications && clarifications.length > 0) {
          emit({ type: 'clarify', questions: clarifications })
          return `需求分析完成，但有 ${clarifications.length} 个问题需要用户确认。已通知用户。请等待用户回复后继续。`
        }

        emit({
          type: 'step',
          tool: 'analyze_requirement',
          summary: `需求分析完成：${pageType} 页面，${designStyle} 风格，${coreFeatures.length} 个核心功能`,
        })

        return `需求分析完成。目标用户: ${targetUsers}，页面类型: ${pageType}，设计风格: ${designStyle}，核心功能: ${coreFeatures.join(', ')}。请继续创建构建计划。`
      },
    }),

    create_plan: tool({
      description:
        '创建或更新原型的构建计划，将需求拆解为有序的页面区块列表。在分析完需求后、开始生成代码之前，必须调用此工具创建计划。每个区块有明确的名称、描述和优先级。',
      parameters: z.object({
        pageType: z
          .enum(['landing', 'dashboard', 'form', 'list', 'detail', 'multi-page'])
          .describe('页面类型'),
        designStyle: z.string().describe('设计风格'),
        sections: z.array(
          z.object({
            id: z.string().describe('区块唯一ID，如 header, hero, product-grid'),
            name: z.string().describe('区块中文名称'),
            description: z.string().describe('区块的功能和布局描述'),
            priority: z.number().describe('优先级，1最高'),
          }),
        ),
      }),
      execute: async ({ pageType, designStyle, sections }) => {
        ms.plan = {
          pageType,
          designStyle,
          sections: sections.map((s) => ({ ...s, status: 'pending' as const })),
          globalProgress: 0,
        }

        emit({
          type: 'step',
          tool: 'create_plan',
          summary: `构建计划已创建：${sections.length} 个区块`,
          plan: ms.plan,
        })

        return `构建计划已创建，共 ${sections.length} 个区块：${sections.map((s) => s.name).join(' → ')}。请按优先级依次生成每个区块的 HTML。`
      },
    }),

    generate_html: tool({
      description:
        '生成或更新完整的 HTML 原型代码。每次调用时输出完整的 HTML 文件内容（不是片段）。初次生成时从基础骨架开始，之后每次添加一个区块时输出包含所有已完成区块的完整 HTML。修改现有内容时也输出修改后的完整 HTML。',
      parameters: z.object({
        html: z.string().describe('完整的 HTML 文件内容，包含 <!DOCTYPE html> 到 </html>'),
        completedSectionId: z
          .string()
          .optional()
          .describe('本次完成的区块 ID（对应 plan 中的 section id）'),
        changeSummary: z.string().describe('本次变更的简要描述'),
      }),
      execute: async ({ html, completedSectionId, changeSummary }) => {
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

        if (completedSectionId && ms.plan) {
          const section = ms.plan.sections.find((s) => s.id === completedSectionId)
          if (section) section.status = 'done'
          const done = ms.plan.sections.filter((s) => s.status === 'done').length
          ms.plan.globalProgress = Math.round((done / ms.plan.sections.length) * 100)
        }

        emit({ type: 'preview', html })
        emit({
          type: 'step',
          tool: 'generate_html',
          summary: changeSummary,
          html,
          plan: ms.plan ?? undefined,
        })

        const progress = ms.plan ? ` 进度: ${ms.plan.globalProgress}%` : ''
        return `HTML 已更新。${changeSummary}${progress}`
      },
    }),

    review_html: tool({
      description:
        '审查当前生成的 HTML 原型，检查完整性、可用性和视觉一致性。在所有计划区块生成完毕后调用此工具。输出发现的问题和改进建议。如果发现问题，之后应调用 generate_html 进行修复。',
      parameters: z.object({
        issues: z.array(
          z.object({
            severity: z.enum(['critical', 'warning', 'suggestion']),
            description: z.string(),
            location: z.string().describe('问题所在的区块或元素'),
          }),
        ),
        overallScore: z.number().min(1).max(10).describe('整体评分 1-10'),
        passesReview: z.boolean().describe('是否通过审查，true 表示可以 finalize'),
      }),
      execute: async ({ issues, overallScore, passesReview }) => {
        const criticalCount = issues.filter((i) => i.severity === 'critical').length
        const warningCount = issues.filter((i) => i.severity === 'warning').length

        emit({
          type: 'step',
          tool: 'review_html',
          summary: `审查完成：评分 ${overallScore}/10，${criticalCount} 个严重问题，${warningCount} 个警告`,
        })

        if (!passesReview) {
          const issueList = issues
            .map((i) => `[${i.severity}] ${i.location}: ${i.description}`)
            .join('\n')
          return `审查未通过（${overallScore}/10）。发现以下问题需要修复：\n${issueList}\n\n请调用 generate_html 修复这些问题。`
        }

        return `审查通过（${overallScore}/10）。原型质量良好，可以输出最终版本。请直接输出总结文字，不需要再调用工具。`
      },
    }),

    verify_render: tool({
      description:
        '验证当前 HTML 的渲染效果。会请求浏览器提供真实的 DOM 信息（元素位置、尺寸、可见性、文本内容等），然后你可以据此判断渲染是否正确。在每次 generate_html 后应调用此工具验证。如果发现问题，调用 generate_html 修复。',
      parameters: z.object({
        checkPoints: z
          .array(z.string())
          .describe('需要验证的要点，如"导航栏是否可见"、"按钮文字是否正确"、"布局是否有溢出"'),
      }),
      execute: async ({ checkPoints }) => {
        emit({
          type: 'step',
          tool: 'verify_render',
          summary: `请求浏览器渲染反馈：${checkPoints.length} 个检查点`,
        })

        // Request DOM info from frontend and wait
        const domInfoJson = await requestFeedback('dom_info')

        return `浏览器渲染的 DOM 信息如下：\n${domInfoJson}\n\n请根据以上信息检查这些要点：${checkPoints.join('、')}。如果有问题请调用 generate_html 修复，如果没问题请继续。`
      },
    }),

    finalize_prototype: tool({
      description:
        '完成原型生成，对当前 HTML 进行最终处理（确保有 viewport meta、charset 等）。这是 agent 循环的最后一个工具调用。调用此工具后，应输出一段简短的总结文字给用户。',
      parameters: z.object({
        title: z.string().describe('HTML 页面 title'),
        finalHtml: z.string().describe('最终完整的 HTML 文件内容'),
      }),
      execute: async ({ title, finalHtml }) => {
        ms.currentHtml = finalHtml

        emit({ type: 'preview', html: finalHtml })
        emit({
          type: 'step',
          tool: 'finalize_prototype',
          summary: `原型「${title}」已完成`,
          html: finalHtml,
          plan: ms.plan ?? undefined,
        })

        if (ms.plan) {
          ms.plan.sections.forEach((s) => {
            s.status = 'done'
          })
          ms.plan.globalProgress = 100
        }

        return `原型已完成，标题「${title}」。请输出一段简短的总结告诉用户原型包含了哪些内容。`
      },
    }),
  }
}
