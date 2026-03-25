import type { ReactNode } from 'react'

interface ChatPreviewLayoutProps {
  chatPanel: ReactNode
  previewPanel: ReactNode
}

export default function ChatPreviewLayout({ chatPanel, previewPanel }: ChatPreviewLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-w-[1024px] font-sans text-text-primary bg-surface">
      <div className="flex-[40] h-full overflow-auto bg-surface-secondary">
        {chatPanel}
      </div>
      <div className="w-px bg-border shrink-0" />
      <div className="flex-[60] h-full overflow-auto bg-surface">
        {previewPanel}
      </div>
    </div>
  )
}
