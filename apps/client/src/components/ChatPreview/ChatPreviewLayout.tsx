import type { ReactNode } from 'react'

interface ChatPreviewLayoutProps {
  chatPanel: ReactNode
  previewPanel: ReactNode
}

export default function ChatPreviewLayout({ chatPanel, previewPanel }: ChatPreviewLayoutProps) {
  return (
    <div className="flex h-full font-sans text-text-primary">
      <div className="w-[480px] shrink-0 h-full overflow-hidden bg-white relative">
        {chatPanel}
      </div>
      <div className="flex-1 h-full overflow-auto bg-[#f2f4f6] p-6">
        {previewPanel}
      </div>
    </div>
  )
}
