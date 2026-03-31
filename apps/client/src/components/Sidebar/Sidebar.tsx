import { useAppStore } from '../../store/appStore'
import SidebarNav from './SidebarNav'
import SidebarHistory from './SidebarHistory'

export default function Sidebar() {
  const { goHome } = useAppStore()

  return (
    <aside className="w-60 h-screen flex flex-col bg-surface shrink-0">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <button onClick={goHome} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-sm">
            N
          </div>
          <div>
            <span className="font-semibold text-text-primary text-sm">NewmanAI</span>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 pb-3">
        <SidebarNav />
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-border/60" />

      {/* History */}
      <SidebarHistory />

      {/* Bottom user area */}
      <div className="px-4 py-3 mt-auto border-t border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded-full flex items-center justify-center text-white text-xs font-medium">
            PM
          </div>
          <span className="text-xs text-text-secondary">Product Manager</span>
        </div>
      </div>
    </aside>
  )
}
