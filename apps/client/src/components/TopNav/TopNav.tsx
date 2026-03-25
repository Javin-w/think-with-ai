import { useAppStore, type AppView } from '../../store/appStore'

const tabs: { label: string; view: AppView }[] = [
  { label: '首页', view: 'home' },
  { label: 'AI 新闻', view: 'news' },
  { label: '写文档', view: 'doc' },
  { label: '做原型', view: 'prototype' },
  { label: 'AI 思考', view: 'thinking-list' },
]

export default function TopNav() {
  const { currentView, navigateTo, goHome } = useAppStore()

  // thinking-tree is a sub-view of thinking-list for tab highlighting
  const activeView = currentView === 'thinking-tree' ? 'thinking-list' : currentView

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={goHome}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-8 h-8 bg-[#4CAF50] rounded-lg flex items-center justify-center text-white font-bold text-sm">
            牛
          </div>
          <span className="font-semibold text-text-primary text-base">牛马 AI</span>
          <span className="text-xs text-text-secondary">for PMs</span>
        </button>

        {/* Tab bar */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.view}
              onClick={() => navigateTo(tab.view)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeView === tab.view
                  ? 'bg-[#f0f0f0] text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#f8f8f8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User avatar */}
        <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0">
          PM
        </div>
      </div>
    </header>
  )
}
