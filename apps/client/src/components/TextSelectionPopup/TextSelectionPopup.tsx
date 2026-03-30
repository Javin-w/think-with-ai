import { useState, useEffect, useRef, useCallback } from 'react'
import { useFloating, inline, autoPlacement, offset } from '@floating-ui/react'

interface TextSelectionPopupProps {
  onBranch: (selectedText: string) => void
  onAnnotate?: (selectedText: string, messageId: string) => void
  disabled?: boolean
}

export default function TextSelectionPopup({ onBranch, onAnnotate, disabled = false }: TextSelectionPopupProps) {
  const [visible, setVisible] = useState(false)
  const savedRangeRef = useRef<Range | null>(null)
  const messageIdRef = useRef<string | null>(null)

  const { refs, floatingStyles, update } = useFloating({
    placement: 'top',
    middleware: [
      inline(),
      offset(8),
      autoPlacement({ allowedPlacements: ['top', 'bottom'] }),
    ],
  })

  const hide = useCallback(() => {
    setVisible(false)
    savedRangeRef.current = null
    messageIdRef.current = null
  }, [])

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
          hide()
          return
        }

        const selectedText = selection.toString().trim()
        if (!selectedText) {
          hide()
          return
        }

        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer
        const element = container instanceof Element ? container : container.parentElement
        const assistantMsg = element?.closest('[data-testid="assistant-message"]')

        if (!assistantMsg) {
          hide()
          return
        }

        // Capture message ID for annotation
        messageIdRef.current = assistantMsg.getAttribute('data-message-id') || null

        savedRangeRef.current = range.cloneRange()

        refs.setReference({
          getBoundingClientRect: () => range.getBoundingClientRect(),
          getClientRects: () => range.getClientRects(),
        })

        setVisible(true)
        update()
      }, 10)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [hide, refs, update])

  const getSelectedText = () => {
    const selection = window.getSelection()
    return selection?.toString().trim() ?? savedRangeRef.current?.toString().trim() ?? ''
  }

  const handleBranchClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const text = getSelectedText()
    if (text && !disabled) {
      onBranch(text)
      hide()
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleAnnotateClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const text = getSelectedText()
    const messageId = messageIdRef.current
    if (text && messageId && onAnnotate && !disabled) {
      onAnnotate(text, messageId)
      hide()
      window.getSelection()?.removeAllRanges()
    }
  }

  if (!visible) return null

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      data-testid="explore-popup"
      className="z-50 flex items-center gap-0 bg-white border border-border rounded-lg shadow-md overflow-hidden"
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleBranchClick}
        className="px-3 py-1.5 text-xs text-brand font-medium hover:bg-brand/5 transition-colors whitespace-nowrap"
      >
        展开话题
      </button>
      {onAnnotate && (
        <>
          <div className="w-px h-4 bg-border" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAnnotateClick}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            批注
          </button>
        </>
      )}
    </div>
  )
}
