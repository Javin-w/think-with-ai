import { useState, useRef, useCallback } from 'react'
import { Plus, ArrowRight, X } from 'lucide-react'

interface MessageInputProps {
  onSend: (message: string, images?: string[]) => void
  disabled?: boolean
  placeholder?: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MessageInput({ onSend, disabled = false, placeholder = '回复...' }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [images, setImages] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if ((!trimmed && images.length === 0) || disabled) return
    onSend(trimmed, images.length > 0 ? images : undefined)
    setValue('')
    setImages([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (fileArray.length === 0) return
    const base64s = await Promise.all(fileArray.map(fileToBase64))
    setImages(prev => [...prev, ...base64s].slice(0, 4)) // max 4 images
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean) as File[]
    if (files.length > 0) {
      e.preventDefault()
      addImages(files)
    }
  }, [addImages])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    addImages(e.dataTransfer.files)
  }, [addImages])

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const hasContent = value.trim() || images.length > 0

  return (
    <div className="p-4">
      <div
        className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 px-4 pt-3">
            {images.map((src, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 group">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none px-4 pt-3 pb-1 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
          style={{ minHeight: '36px', maxHeight: '200px' }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center text-text-secondary/30 hover:text-text-secondary/60 rounded-full transition-colors"
              title="上传图片"
            >
              <Plus size={18} strokeWidth={1.5} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={disabled || !hasContent}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
              hasContent && !disabled
                ? 'bg-text-primary text-white hover:bg-text-primary/80'
                : 'bg-slate-100 text-text-secondary/30'
            }`}
          >
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) addImages(e.target.files)
            e.target.value = '' // allow re-selecting same file
          }}
        />
      </div>
    </div>
  )
}
