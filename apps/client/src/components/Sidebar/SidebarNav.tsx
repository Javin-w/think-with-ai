import type { ReactNode } from 'react'
import { BookOpen, Palette } from 'lucide-react'
import { useAppStore, type AppView } from '../../store/appStore'

interface NavItem { icon: ReactNode; label: string; view: AppView }

const TOOLS: NavItem[] = [
  { icon: <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>account_tree</span>, label: '对话树', view: 'thinking-list' },
  { icon: <Palette className="w-4 h-4" />, label: 'AI 原型', view: 'prototype-list' },
]

const INFO: NavItem[] = [
  { icon: <BookOpen className="w-4 h-4" />, label: '每日早读', view: 'news' },
]

export default function SidebarNav() {
  const { currentView, navigateTo } = useAppStore()

  const isActive = (view: AppView) => {
    if (view === 'thinking-list') {
      return currentView === 'thinking-list' || currentView === 'thinking-tree'
    }
    if (view === 'prototype-list') {
      return currentView === 'prototype-list' || currentView === 'prototype'
    }
    return currentView === view
  }

  const renderItem = (item: NavItem) => (
    <button
      key={item.view}
      onClick={() => navigateTo(item.view)}
      className={`w-full flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[13px] transition-colors ${
        isActive(item.view)
          ? 'bg-brand/8 text-brand font-medium'
          : 'text-text-primary/60 hover:bg-black/[0.04] hover:text-text-primary'
      }`}
    >
      {item.icon}
      <span>{item.label}</span>
    </button>
  )

  return (
    <nav>
      <div className="space-y-0.5">
        {TOOLS.map(renderItem)}
      </div>
      <div className="my-3" />
      <div className="space-y-0.5">
        {INFO.map(renderItem)}
      </div>
    </nav>
  )
}
