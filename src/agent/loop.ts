import { SYSTEM_PROMPT } from './prompt'
import { TOOL_SPECS, executeTool } from './tools'
import type { AgentState, Provider, TraceEvent } from './types'
import { emptyOrder } from '../domain/order'

export const MAX_STEPS = 6

export function initialState(orderId = 'MRE-2057'): AgentState {
  return { messages: [], order: emptyOrder(orderId), handoff: null, restrictions: [] }
}

export interface TurnResult {
  state: AgentState
  reply: string
  events: TraceEvent[]
}

/**
 * Executa um turno do cliente: chama o modelo, roda as ferramentas pedidas
 * e repete até o modelo responder só com texto ou atingir MAX_STEPS.
 */
export async function runTurn(
  prev: AgentState,
  userText: string,
  provider: Provider,
  onEvent: (e: TraceEvent) => void = () => {},
  signal?: AbortSignal,
): Promise<TurnResult> {
  const events: TraceEvent[] = []
  const emit = (e: TraceEvent) => {
    events.push(e)
    onEvent(e)
  }

  let state: AgentState = { ...prev, messages: [...prev.messages, { role: 'user', content: userText }] }
  emit({ kind: 'user', at: Date.now(), text: userText })

  for (let step = 1; step <= MAX_STEPS; step++) {
    const t0 = performance.now()
    const res = await provider.complete({ system: SYSTEM_PROMPT, messages: state.messages, tools: TOOL_SPECS }, signal)
    emit({ kind: 'model', at: Date.now(), step, text: res.text, toolCalls: res.toolCalls, ms: Math.round(performance.now() - t0), usage: res.usage })

    state = { ...state, messages: [...state.messages, { role: 'assistant', text: res.text, toolCalls: res.toolCalls }] }

    if (res.toolCalls.length === 0) {
      const reply = res.text?.trim() || 'Desculpe, não consegui responder agora. Pode repetir?'
      emit({ kind: 'reply', at: Date.now(), text: reply })
      return { state, reply, events }
    }

    for (const call of res.toolCalls) {
      const t1 = performance.now()
      const out = executeTool(state, call.name, call.input)
      state = {
        ...out.state,
        messages: [...state.messages, { role: 'tool', toolCallId: call.id, name: call.name, result: out.result, isError: out.isError }],
      }
      emit({ kind: 'tool', at: Date.now(), step, call, result: out.result, isError: out.isError, ms: Math.max(1, Math.round(performance.now() - t1)) })
    }
  }

  const reply = 'Vou chamar alguém da equipe para continuar com você.'
  emit({ kind: 'error', at: Date.now(), message: `Limite de ${MAX_STEPS} passos atingido.` })
  emit({ kind: 'reply', at: Date.now(), text: reply })
  return { state, reply, events }
}
