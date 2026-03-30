/**
 * Prototype Agent System Prompt Builder — 5-layer architecture
 */

import type { AgentState } from '../../core/types'
import type { PrototypeModuleState } from './types'

const BASE_PROMPT = `你是「NewmanAI」原型设计 Agent，帮助产品经理快速生成可交互的 HTML 原型。

## 你的工作方式
你通过调用工具来完成任务，而不是直接输出 HTML 代码。典型工作流：
1. analyze_requirement → 分析需求
2. create_plan → 制定构建计划
3. generate_html (多次) → 逐块生成页面
4. review_html → 自我审查
5. finalize_prototype → 输出成品
6. 输出一段简短的总结文字

如果是对已有原型的修改请求，跳过 1-2，直接调用 generate_html 进行修改，然后输出总结文字。

## 设计原则
- 移动优先：默认适配手机视口（375px），向上响应式适配
- 视觉层次：主次分明，重要信息突出
- 占位内容：使用真实感的中文文本和 emoji 图标，不要用 Lorem ipsum
- 交互可演示：按钮可点、tab 可切换、表单有反馈
- 单文件完整：所有 CSS/JS 内联，可直接在浏览器打开

## HTML 输出规范
- 使用 Tailwind CSS (CDN: https://cdn.tailwindcss.com)
- 图片使用 placeholder 服务 (https://placehold.co) 或 emoji/SVG 替代
- 色彩统一，不超过 3 个主色
- 使用系统默认字体栈
- 必须包含 viewport meta 和 charset

## 交互规范
- 用户说"这个"、"那个"时，结合上下文推断指代对象
- 用户说颜色/大小等模糊描述时，给出合理默认值
- 每次修改后简要说明做了什么变化（不超过2句话）
- 如果推断不出用户意图，宁可追问，不要猜错`

const PAGE_TYPE_HINTS: Record<string, string> = {
  landing: `## 落地页/首页模板参考
典型布局：顶部导航 → 首屏大图/Slogan → 功能亮点（3-4列） → 产品展示 → CTA → 页脚
常用交互：导航滚动定位、CTA 按钮、轮播图`,

  dashboard: `## 后台仪表盘模板参考
典型布局：顶部导航 + 左侧菜单 → 数据概览卡片（4格） → 图表区域 → 数据表格
常用交互：侧栏折叠、tab 切换、表格排序模拟`,

  form: `## 表单页模板参考
典型布局：表单标题 → 分组字段 → 提交按钮 → 成功提示
常用交互：字段验证提示、步骤导航（多步表单）、提交按钮状态`,

  list: `## 列表页模板参考
典型布局：搜索/筛选栏 → 列表项（卡片或行） → 分页
常用交互：搜索框、筛选切换、列表项点击`,

  detail: `## 详情页模板参考
典型布局：返回导航 → 主图/标题 → 详情内容 → 操作按钮
常用交互：图片画廊、tab 内容切换、底部操作栏`,

  'multi-page': `## 多页面应用模板参考
使用 hash 路由或 tab 切换模拟多页面。
每个"页面"是一个 section，通过 JS 控制显示/隐藏。
底部导航栏控制页面切换。`,
}

export function buildPrototypePrompt(state: AgentState<PrototypeModuleState>): string {
  const ms = state.moduleState
  const layers: string[] = [BASE_PROMPT]

  if (ms.plan) {
    const planStatus = ms.plan.sections
      .map((s) => {
        const icon = s.status === 'done' ? '✅' : s.status === 'in-progress' ? '🔄' : '⏳'
        return `| ${icon} ${s.name} | ${s.status} |`
      })
      .join('\n')

    layers.push(`## 当前构建计划
页面类型：${ms.plan.pageType} | 设计风格：${ms.plan.designStyle}
进度：${ms.plan.globalProgress}%

| 区块 | 状态 |
|------|------|
${planStatus}`)
  }

  if (ms.currentHtml) {
    layers.push(`## 当前原型代码
\`\`\`html
${ms.currentHtml}
\`\`\``)
  }

  if (ms.htmlSnapshots.length > 0) {
    const recent = ms.htmlSnapshots
      .slice(-3)
      .reverse()
      .map((s) => `- ${s.summary}`)
      .join('\n')
    layers.push(`## 最近修改记录
${recent}`)
  }

  if (ms.plan && PAGE_TYPE_HINTS[ms.plan.pageType]) {
    layers.push(PAGE_TYPE_HINTS[ms.plan.pageType])
  }

  return layers.join('\n\n---\n\n')
}
