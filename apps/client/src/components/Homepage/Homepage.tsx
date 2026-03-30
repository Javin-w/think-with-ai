import { useAppStore, type AppView } from '../../store/appStore'

const QUICK_ACTIONS: Array<{ icon: string; label: string; view: AppView }> = [
  { icon: '📰', label: 'AI 新闻', view: 'news' },
  { icon: '🎨', label: '做原型', view: 'prototype' },
  { icon: '🧠', label: 'AI 思考', view: 'thinking-list' },
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
    <div className="h-full flex items-center justify-center bg-surface">
      <div className="text-center max-w-xl px-6">
        {/* Greeting */}
        <h1 className="text-3xl font-semibold text-text-primary mb-2">
          {getGreeting()}，有什么可以帮你的？
        </h1>
        <p className="text-text-secondary text-sm mb-10">
          选择一个功能开始
        </p>

        {/* Quick action pills */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.view}
              onClick={() => navigateTo(action.view)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-border rounded-full text-sm text-text-primary hover:border-brand hover:text-brand hover:shadow-sm transition-all"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
