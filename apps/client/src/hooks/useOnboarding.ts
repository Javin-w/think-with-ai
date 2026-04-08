import { useState, useCallback } from 'react'

const KEYS = {
  branchTip: 'onboarding_branch_tip_shown',
  firstBranch: 'onboarding_first_branch_celebrated',
}

export function useOnboarding() {
  const [showBranchTip, setShowBranchTip] = useState(false)
  const [showBranchCelebration, setShowBranchCelebration] = useState(false)

  /** Call after root node's first AI reply completes */
  const triggerBranchTip = useCallback(() => {
    if (localStorage.getItem(KEYS.branchTip)) return
    localStorage.setItem(KEYS.branchTip, '1')
    setShowBranchTip(true)
    setTimeout(() => setShowBranchTip(false), 6000)
  }, [])

  const dismissBranchTip = useCallback(() => {
    setShowBranchTip(false)
  }, [])

  /** Call when user creates their first branch */
  const triggerFirstBranchCelebration = useCallback(() => {
    if (localStorage.getItem(KEYS.firstBranch)) return
    localStorage.setItem(KEYS.firstBranch, '1')
    setShowBranchCelebration(true)
    setTimeout(() => setShowBranchCelebration(false), 3000)
  }, [])

  return {
    showBranchTip,
    triggerBranchTip,
    dismissBranchTip,
    showBranchCelebration,
    triggerFirstBranchCelebration,
  }
}
