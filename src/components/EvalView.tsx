import { useRef, useState } from 'react'
import { Check, ChevronDown, Play, Square, X } from 'lucide-react'
import type { Provider } from '../agent/types'
import { runSuite, type ScenarioResult } from '../evals/runner'
import { SCENARIOS } from '../evals/scenarios'

const CATEGORY_TONE: Record<string, string> = {
  pedido: 'text-tide',
  segurança: 'text-dende',
  atendimento: 'text-sky-300',
  robustez: 'text-violet-300',
}

export function EvalView({ provider }: { provider: Provider }) {
  const [results, setResults] = useState<ScenarioResult[]>([])
  const [running, setRunning] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = async () => {
    setResults([])
    setRunning(true)
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await runSuite(provider, (r) => setResults((prev) => [...prev, r]), ctrl.signal)
    } finally {
      setRunning(false)
    }
  }

  const checks = results.flatMap((r) => r.checks)
  const passedChecks = checks.filter((c) => c.passed).length
  const passedScenarios = results.filter((r) => r.passed).length
  const totalMs = results.reduce((s, r) => s + r.ms, 0)
  const tokens = results.reduce((s, r) => s + r.tokens, 0)
  const totalChecks = SCENARIOS.reduce((s, sc) => s + sc.checks.length, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Avaliações</h2>
          <p className="mt-1 text-sm text-muted">
            {SCENARIOS.length} conversas de clientes e {totalChecks} verificações sobre o que importa para o restaurante: pedido certo, preço certo, segurança alimentar e transferência para humano na hora certa. Os mesmos cenários rodam no CI a cada commit.
          </p>
        </div>
        {running ? (
          <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-raised">
            <Square size={14} aria-hidden /> Parar
          </button>
        ) : (
          <button type="button" onClick={run} className="inline-flex items-center gap-2 rounded-xl bg-tide px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-110">
            <Play size={15} aria-hidden /> Rodar com {provider.id === 'demo' ? 'o modo demonstração' : provider.model}
          </button>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ['Cenários aprovados', results.length ? `${passedScenarios}/${results.length}` : `—/${SCENARIOS.length}`],
          ['Verificações', results.length ? `${passedChecks}/${checks.length}` : `—/${totalChecks}`],
          ['Tempo total', results.length ? `${(totalMs / 1000).toFixed(totalMs < 1000 ? 2 : 1)} s` : '—'],
          ['Tokens', results.length ? `${provider.id === 'demo' ? '~' : ''}${tokens.toLocaleString('pt-BR')}` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-panel px-4 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-6 space-y-2">
        {SCENARIOS.map((s) => {
          const r = results.find((x) => x.scenario.id === s.id)
          const pending = !r
          const isOpen = open === s.id
          return (
            <li key={s.id} className="overflow-hidden rounded-xl border border-line bg-panel">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised/60"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    pending ? 'border border-line' : r.passed ? 'bg-tide text-ink' : 'bg-danger text-ink'
                  } ${pending && running ? 'animate-pulse' : ''}`}
                  aria-label={pending ? 'pendente' : r.passed ? 'aprovado' : 'reprovado'}
                >
                  {!pending && (r.passed ? <Check size={14} /> : <X size={14} />)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{s.title}</span>
                  <span className="block text-xs text-muted">
                    <span className={CATEGORY_TONE[s.category]}>{s.category}</span> · {s.turns.length} {s.turns.length === 1 ? 'mensagem' : 'mensagens'} · {s.checks.length} verificações
                    {r && ` · ${Math.round(r.ms)} ms`}
                  </span>
                </span>
                <ChevronDown size={16} className={`shrink-0 text-muted transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {isOpen && (
                <div className="grid gap-4 border-t border-line px-4 py-4 md:grid-cols-2">
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Verificações</h3>
                    <ul className="mt-2 space-y-2">
                      {s.checks.map((c) => {
                        const res = r?.checks.find((x) => x.label === c.label)
                        return (
                          <li key={c.label} className="flex gap-2 text-sm">
                            <span className={`mt-0.5 shrink-0 ${!res ? 'text-muted' : res.passed ? 'text-tide' : 'text-danger'}`}>
                              {!res ? '○' : res.passed ? <Check size={15} /> : <X size={15} />}
                            </span>
                            <span>
                              {c.label}
                              <span className="block text-xs text-muted">{c.why}</span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Conversa</h3>
                    <ol className="mt-2 space-y-1.5 text-sm">
                      {s.turns.map((t, i) => (
                        <li key={i} className="space-y-1.5">
                          <p className="ml-auto w-fit max-w-[90%] rounded-xl rounded-br-sm bg-tide/20 px-3 py-1.5">{t}</p>
                          {r?.replies[i] && <p className="w-fit max-w-[90%] whitespace-pre-line rounded-xl rounded-bl-sm bg-raised px-3 py-1.5">{r.replies[i]}</p>}
                        </li>
                      ))}
                    </ol>
                    {r?.error && <p className="mt-2 text-sm text-danger">{r.error}</p>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
