/**
 * Prototype module state — simple ReAct style
 */

export interface PrototypeModuleState {
  currentHtml: string
  htmlSnapshots: Array<{ html: string; summary: string; timestamp: number }>
  requirementSummary: string
}
