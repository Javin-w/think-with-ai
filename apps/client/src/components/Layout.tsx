import type { ReactNode } from 'react'

interface LayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
}

export default function Layout({ leftPanel, rightPanel }: LayoutProps) {
  return (
    <div className="flex h-[calc(100vh-2.5rem)] min-w-[1024px] font-sans text-text-primary bg-surface">
      {/* Left panel — mind map area (35%) */}
      <div
        data-testid="left-panel"
        className="flex-[35] h-full overflow-auto bg-surface-secondary"
      >
        {leftPanel}
      </div>

      {/* Divider */}
      <div className="w-px bg-border shrink-0" />

      {/* Right panel — conversation area (65%) */}
      <div
        data-testid="right-panel"
        className="flex-[65] h-full overflow-auto bg-surface"
      >
        {rightPanel}
      </div>
    </div>
  )
}
