import { useState, useEffect, useRef, useCallback } from 'react'
import { useFloating, inline, autoPlacement, offset } from '@floating-ui/react'

interface TextSelectionPopupProps {
  onBranch: (selectedText: string) => void
  disabled?: boolean
}

export default function TextSelectionPopup({ onBranch, disabled = false }: TextSelectionPopupProps) {
  const [visible, setVisible] = useState(false)
  const savedRangeRef = useRef<Range | null>(null)
  
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
  }, [])

  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to let selection settle
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

        // Check if selection is inside an assistant message
        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer
        const element = container instanceof Element ? container : container.parentElement
        const assistantMsg = element?.closest('[data-testid="assistant-message"]')
        
        if (!assistantMsg) {
          hide()
          return
        }

        // Clone range to prevent live mutation
        savedRangeRef.current = range.cloneRange()
        
        // Position floating element at the selection
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

  const handleBranchClick = (e: React.MouseEvent) => {
    e.preventDefault()  // CRITICAL: prevent selection collapse
    e.stopPropagation()
    
    const selection = window.getSelection()
    const text = selection?.toString().trim() ?? savedRangeRef.current?.toString().trim() ?? ''
    
    if (text && !disabled) {
      onBranch(text)
      hide()
      // Clear selection
      window.getSelection()?.removeAllRanges()
    }
  }

  if (!visible) return null

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      data-testid="explore-popup"
      className="z-50"
    >
      <button
        onMouseDown={(e) => e.preventDefault()}  // CRITICAL: prevent selection collapse on mousedown
        onClick={handleBranchClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-full shadow-lg hover:bg-indigo-600 transition-colors whitespace-nowrap"
      >
        🔍 深入探索
      </button>
    </div>
  )
}
