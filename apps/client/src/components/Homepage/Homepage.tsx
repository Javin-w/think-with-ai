import { useAppStore, type AppView } from '../../store/appStore'
import RecentList from './RecentList'
import NewsTicker from './NewsTicker'

interface CardData {
  icon: string
  title: string
  badge: string
  badgeColor: string
  desc: string
  tags: string[]
  view: AppView
}

const cards: CardData[] = [
  {
    icon: '📰',
    title: 'AI 新闻',
    badge: 'web search',
    badgeColor: 'bg-green-100 text-green-700',
    desc: '聚合 X、公众号等平台的 AI 资讯，每日摘要推送',
    tags: ['X/Twitter', '公众号', '每日摘要', '关键词订阅'],
    view: 'news',
  },
  {
    icon: '📝',
    title: 'AI 写文档',
    badge: 'Agent',
    badgeColor: 'bg-blue-100 text-blue-700',
    desc: '先生成框架再逐步填充，面向 PM/运营的 Markdown 文档 Agent',
    tags: ['PRD', '运营方案', '复盘报告', '分步生成'],
    view: 'doc',
  },
  {
    icon: '🎨',
    title: 'AI 原型',
    badge: 'HTML 生成',
    badgeColor: 'bg-orange-100 text-orange-700',
    desc: '用自然语言描述需求，生成可在浏览器运行的 HTML 原型',
    tags: ['移动端页面', '管理后台', '交互演示', '一键导出'],
    view: 'prototype',
  },
  {
    icon: '🧠',
    title: 'AI 思考',
    badge: '思维导图',
    badgeColor: 'bg-purple-100 text-purple-700',
    desc: '输入命题，生成摘要 + 思维导图，支持节点拓展和内容深挖',
    tags: ['概念解析', '思维导图', '节点展开', '导出大纲'],
    view: 'thinking-list',
  },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export default function Homepage() {
  const { navigateTo } = useAppStore()

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-surface-secondary flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        {/* Greeting */}
        <h1 className="text-3xl font-bold text-text-primary">
          {getGreeting()}，今天搞什么
        </h1>
        <p className="text-text-secondary mt-2 mb-8">
          选一个模块开始你的 AI 辅助工作流
        </p>

        {/* Feature cards 2x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {cards.map((card) => (
            <button
              key={card.view}
              onClick={() => navigateTo(card.view)}
              className="bg-white rounded-xl border border-border p-5 text-left hover:shadow-md hover:border-[#4CAF50]/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1 group-hover:text-[#4CAF50] transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                {card.desc}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-surface-secondary text-text-secondary rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Recent list */}
        <RecentList />
      </div>

      {/* News ticker at bottom */}
      <NewsTicker />
    </div>
  )
}
