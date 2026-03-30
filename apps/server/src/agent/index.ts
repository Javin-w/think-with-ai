/**
 * Agent module registry — maps module names to configs
 */

export { runAgent, pendingFeedback } from './core'
export type { AgentModuleConfig, AgentState, AgentRunOptions } from './core'

// Module configs
import { prototypeAgentConfig } from './modules/prototype'

export const AGENT_MODULES: Record<string, import('./core').AgentModuleConfig<any>> = {
  prototype: prototypeAgentConfig,
}
