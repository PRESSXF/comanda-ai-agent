import { useCallback, useMemo, useRef, useState } from 'react'
import { initialState, runTurn } from '../agent/loop'
import type { AgentState, Provider, TraceEvent } from '../agent/types'

export interface ChatMessage {
  id: string
  from: 'cliente' | 'agente' | 'sistema'
  text: string
  at: number
}

let n = 0
const mid = () => `m${++n}`

export function useAgent(provider: Provider) {
  const [state, setState] = useState<AgentState>(() => initialState())
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [trace, setTrace] = useState<TraceEvent[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim()
      if (!clean) return
      setError(null)
      setBusy(true)
      setChat((c) => [...c, { id: mid(), from: 'cliente', text: clean, at: Date.now() }])
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const before = stateRef.current
        const res = await runTurn(before, clean, provider, (e) => setTrace((t) => [...t, e]), ctrl.signal)
        stateRef.current = res.state
        setState(res.state)
        const handedOff = !before.handoff && res.state.handoff
        setChat((c) => [
          ...c,
          { id: mid(), from: 'agente', text: res.reply, at: Date.now() },
          ...(handedOff ? [{ id: mid(), from: 'sistema' as const, text: 'Conversa transferida para a equipe de atendimento.', at: Date.now() }] : []),
        ])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          const message = (e as Error).message
          setError(message)
          setTrace((t) => [...t, { kind: 'error', at: Date.now(), message }])
        }
      } finally {
        setBusy(false)
        abortRef.current = null
      }
    },
    [provider],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    const fresh = initialState()
    stateRef.current = fresh
    setState(fresh)
    setChat([])
    setTrace([])
    setError(null)
    setBusy(false)
  }, [])

  const metrics = useMemo(() => {
    const models = trace.filter((e): e is Extract<TraceEvent, { kind: 'model' }> => e.kind === 'model')
    const tools = trace.filter((e) => e.kind === 'tool')
    const turns = trace.filter((e) => e.kind === 'user').length
    const tokens = models.reduce((s, e) => s + e.usage.inputTokens + e.usage.outputTokens, 0)
    const latency = models.length ? Math.round(models.reduce((s, e) => s + e.ms, 0) / models.length) : 0
    return { turns, steps: models.length, toolCalls: tools.length, tokens, latency, estimated: models.some((m) => m.usage.estimated) }
  }, [trace])

  return { state, chat, trace, busy, error, send, reset, metrics }
}
