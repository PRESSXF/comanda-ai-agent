import { describe, expect, it } from 'vitest'
import { createDemoProvider } from '../src/agent/providers/demo'
import { runScenario } from '../src/evals/runner'
import { SCENARIOS } from '../src/evals/scenarios'

describe('avaliações com o provedor de demonstração', () => {
  const provider = createDemoProvider()
  for (const scenario of SCENARIOS) {
    it(scenario.title, async () => {
      const r = await runScenario(scenario, provider)
      const failed = r.checks.filter((c) => !c.passed).map((c) => c.label)
      expect(r.error, r.error).toBeUndefined()
      expect(failed, `Respostas:\n${r.replies.join('\n---\n')}`).toEqual([])
    })
  }
})
