import { useAppStore, type AppView } from '../../store/appStore'

const NAV_ITEMS: Array<{ icon: string; label: string; view: AppView }> = [
  { icon: '📰', label: 'AI 新闻', view: 'news' },
  { icon: '🎨', label: 'AI 原型', view: 'prototype' },
  { icon: '🧠', label: 'AI 思考', view: 'thinking-list' },
]

export default function SidebarNav() {
  const { currentView, navigateTo } = useAppStore()

  const isActive = (view: AppView) => {
    if (view === 'thinking-list') {
      return currentView === 'thinking-list' || currentView === 'thinking-tree'
    }
    if (view === 'news') {
      return currentView === 'news' || currentView === 'news-admin'
    }
    return currentView === view
  }

  return (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.view}
          onClick={() => navigateTo(item.view)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            isActive(item.view)
              ? 'bg-brand/10 text-brand font-medium'
              : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary'
          }`}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
