import type { Order } from '../domain/order'

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export type AgentMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; text?: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; result: unknown; isError?: boolean }

export interface ToolSpec {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface Usage {
  inputTokens: number
  outputTokens: number
  /** true quando os tokens são estimados (modo demonstração). */
  estimated: boolean
}

export interface CompletionRequest {
  system: string
  messages: AgentMessage[]
  tools: ToolSpec[]
}

export interface CompletionResult {
  text?: string
  toolCalls: ToolCall[]
  usage: Usage
}

export interface Provider {
  id: 'demo' | 'anthropic'
  label: string
  model: string
  complete(req: CompletionRequest, signal?: AbortSignal): Promise<CompletionResult>
}

export interface Handoff {
  reason: string
  summary: string
  at: number
}

/** Estado que o agente pode ler e alterar por meio das ferramentas. */
export interface AgentState {
  messages: AgentMessage[]
  order: Order
  handoff: Handoff | null
  /** Restrições informadas pelo cliente, como alergias. */
  restrictions: string[]
}

export type TraceEvent =
  | { kind: 'user'; at: number; text: string }
  | { kind: 'model'; at: number; step: number; text?: string; toolCalls: ToolCall[]; ms: number; usage: Usage }
  | { kind: 'tool'; at: number; step: number; call: ToolCall; result: unknown; isError: boolean; ms: number }
  | { kind: 'reply'; at: number; text: string }
  | { kind: 'error'; at: number; message: string }
