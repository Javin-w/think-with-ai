interface BranchTriggerProps {
  paragraphText: string
  onBranch: (text: string) => void
  disabled?: boolean
}

export default function BranchTrigger({ paragraphText, onBranch, disabled }: BranchTriggerProps) {
  if (disabled) return null

  return (
    <button
      onClick={() => onBranch(paragraphText)}
      className="absolute -right-8 top-0 w-6 h-6 flex items-center justify-center text-text-secondary/0 group-hover:text-text-secondary/40 hover:!text-brand hover:!bg-brand/10 rounded transition-all text-xs"
      title="展开此话题"
    >
      +
    </button>
  )
}
