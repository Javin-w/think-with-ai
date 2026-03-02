import Dexie, { type Table } from 'dexie'
import type { Tree, TreeNode } from '@repo/types'

export class ThinkWithAIDatabase extends Dexie {
  trees!: Table<Tree>
  nodes!: Table<TreeNode>

  constructor() {
    super('ThinkWithAIDB')
    this.version(1).stores({
      trees: 'id, updatedAt',
      nodes: 'id, treeId, parentId, [treeId+parentId], createdAt',
    })
  }
}

export const db = new ThinkWithAIDatabase()

// Expose db on window for debugging (dev only)
if (typeof window !== 'undefined') {
  (window as any).__db = db
}

// Request persistent storage to prevent Safari from clearing IndexedDB
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist()
}
