import { useAppStore } from '../../store/appStore'
import SidebarNav from './SidebarNav'
import SidebarHistory from './SidebarHistory'

export default function Sidebar() {
  const { goHome } = useAppStore()

  return (
    <aside className="w-56 h-screen flex flex-col bg-surface shrink-0 py-4">
      {/* Logo */}
      <button onClick={goHome} className="flex items-center gap-2.5 px-5 mb-5">
        <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-xs">
          N
        </div>
        <span className="font-semibold text-text-primary text-[13px]">NewmanAI</span>
      </button>

      {/* Navigation */}
      <div className="px-3">
        <SidebarNav />
      </div>

      {/* History */}
      <SidebarHistory />

      {/* Bottom user area */}
      <div className="px-3 pt-2 mt-auto">
        <div className="border-t border-border/40 pt-3 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-brand/15 text-brand rounded-full flex items-center justify-center text-[10px] font-semibold">
              PM
            </div>
            <span className="text-xs text-text-primary/70">Product Manager</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
