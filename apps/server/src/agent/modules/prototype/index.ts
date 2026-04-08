/**
 * Prototype Agent Module — assembles config from tools + prompt + types
 */

import type { AgentModuleConfig } from '../../core/types'
import type { PrototypeModuleState } from './types'
import { createPrototypeTools } from './tools'
import { buildPrototypePrompt } from './prompt'

export const prototypeAgentConfig: AgentModuleConfig<PrototypeModuleState> = {
  name: 'prototype',
  defaultProvider: 'moonshot',
  defaultModel: 'kimi-k2.5',
  maxSteps: 15,

  createInitialState: (existing) => ({
    currentHtml: existing?.currentHtml ?? '',
    htmlSnapshots: existing?.htmlSnapshots ?? [],
    requirementSummary: existing?.requirementSummary ?? '',
  }),

  createTools: (state, emit, requestFeedback) => createPrototypeTools(state, emit, requestFeedback),

  buildSystemPrompt: (state) => buildPrototypePrompt(state),
}

export type { PrototypeModuleState } from './types'
