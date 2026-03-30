/**
 * Prototype module state — specific to the HTML prototype agent
 */

export interface PlanSection {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'done'
  priority: number
}

export interface PrototypePlan {
  pageType: 'landing' | 'dashboard' | 'form' | 'list' | 'detail' | 'multi-page'
  designStyle: string
  sections: PlanSection[]
  globalProgress: number
}

export interface PrototypeModuleState {
  plan: PrototypePlan | null
  currentHtml: string
  htmlSnapshots: Array<{ html: string; summary: string; timestamp: number }>
  requirementSummary: string
}
