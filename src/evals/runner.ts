import { initialState, runTurn } from '../agent/loop'
import type { Provider, TraceEvent } from '../agent/types'
import { SCENARIOS, type Scenario } from './scenarios'

export interface CheckResult {
  label: string
  why: string
  passed: boolean
}

export interface ScenarioResult {
  scenario: Scenario
  checks: CheckResult[]
  passed: boolean
  replies: string[]
  events: TraceEvent[]
  ms: number
  tokens: number
  error?: string
}

export async function runScenario(scenario: Scenario, provider: Provider, signal?: AbortSignal): Promise<ScenarioResult> {
  const t0 = performance.now()
  let state = initialState()
  const replies: string[] = []
  const events: TraceEvent[] = []
  try {
    for (const turn of scenario.turns) {
      const res = await runTurn(state, turn, provider, undefined, signal)
      state = res.state
      replies.push(res.reply)
      events.push(...res.events)
    }
  } catch (e) {
    return { scenario, checks: [], passed: false, replies, events, ms: performance.now() - t0, tokens: 0, error: (e as Error).message }
  }
  const ctx = { state, replies, events }
  const checks = scenario.checks.map((c) => ({ label: c.label, why: c.why, passed: safe(() => c.test(ctx)) }))
  const tokens = events.reduce((s, e) => (e.kind === 'model' ? s + e.usage.inputTokens + e.usage.outputTokens : s), 0)
  return { scenario, checks, passed: checks.every((c) => c.passed), replies, events, ms: performance.now() - t0, tokens }
}

function safe(fn: () => boolean) {
  try {
    return fn()
  } catch {
    return false
  }
}

export async function runSuite(provider: Provider, onResult?: (r: ScenarioResult) => void, signal?: AbortSignal) {
  const results: ScenarioResult[] = []
  for (const s of SCENARIOS) {
    const r = await runScenario(s, provider, signal)
    results.push(r)
    onResult?.(r)
  }
  return results
}
