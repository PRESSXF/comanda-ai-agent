import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cpu, Github, Play } from 'lucide-react'
import { createDemoProvider } from './agent/providers/demo'
import { createAnthropicProvider } from './agent/providers/anthropic'
import { SCENARIOS } from './evals/scenarios'
import { useAgent } from './hooks/useAgent'
import { ChatPanel } from './components/ChatPanel'
import { TracePanel } from './components/TracePanel'
import { TicketPanel } from './components/TicketPanel'
import { EvalView } from './components/EvalView'
import { HowItWorks } from './components/HowItWorks'
import { DEFAULT_MODEL, SettingsDialog, type ProviderSettings } from './components/SettingsDialog'

type View = 'atendimento' | 'avaliacoes' | 'como-funciona'
type Pane = 'conversa' | 'raciocinio' | 'comanda'

const VIEWS: Array<[View, string]> = [
  ['atendimento', 'Atendimento'],
  ['avaliacoes', 'Avaliações'],
  ['como-funciona', 'Como funciona'],
]

const DEMO_SCRIPTS = SCENARIOS.filter((s) => ['pedido-completo', 'alergia-amendoim', 'item-indisponivel', 'reclamacao-atraso'].includes(s.id))
const SCRIPT_LABEL: Record<string, string> = {
  'pedido-completo': 'Pedido completo',
  'alergia-amendoim': 'Alergia',
  'item-indisponivel': 'Item esgotado',
  'reclamacao-atraso': 'Reclamação',
}

const REPO_URL = 'https://github.com/PRESSXF/comanda-ai-agent'

function readSettings(): ProviderSettings {
  try {
    const raw = sessionStorage.getItem('comanda:provider')
    if (raw) return { mode: 'demo', apiKey: '', model: DEFAULT_MODEL, ...JSON.parse(raw) }
  } catch {
    /* sessionStorage indisponível: segue no modo demonstração */
  }
  return { mode: 'demo', apiKey: '', model: DEFAULT_MODEL }
}

function viewFromHash(): View {
  const h = location.hash.slice(1)
  return VIEWS.some(([v]) => v === h) ? (h as View) : 'atendimento'
}

export default function App() {
  const [view, setView] = useState<View>(viewFromHash)
  const [pane, setPane] = useState<Pane>('conversa')
  const [settings, setSettings] = useState<ProviderSettings>(readSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const playToken = useRef(0)

  const provider = useMemo(
    () => (settings.mode === 'anthropic' && settings.apiKey ? createAnthropicProvider(settings.apiKey, settings.model) : createDemoProvider({ latencyMs: [380, 720] })),
    [settings],
  )
  const agent = useAgent(provider)
  const { send, reset } = agent

  useEffect(() => {
    const onHash = () => setView(viewFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const go = (v: View) => {
    setView(v)
    history.replaceState(null, '', v === 'atendimento' ? location.pathname : `#${v}`)
  }

  const saveSettings = (v: ProviderSettings) => {
    setSettings(v)
    try {
      sessionStorage.setItem('comanda:provider', JSON.stringify(v))
    } catch {
      /* ignora */
    }
    setSettingsOpen(false)
    reset()
  }

  const play = useCallback(
    async (id: string) => {
      const scenario = SCENARIOS.find((s) => s.id === id)
      if (!scenario) return
      const token = ++playToken.current
      reset()
      setPlaying(id)
      for (const turn of scenario.turns) {
        await new Promise((r) => setTimeout(r, 650))
        if (playToken.current !== token) return
        await send(turn)
      }
      if (playToken.current === token) setPlaying(null)
    },
    [reset, send],
  )

  const stopAndReset = () => {
    playToken.current++
    setPlaying(null)
    reset()
  }

  const isDemo = provider.id === 'demo'

  return (
    <div className="flex min-h-full flex-col" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
      <header className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-x-6 gap-y-3 py-4">
        <a href="#" onClick={(e) => (e.preventDefault(), go('atendimento'))} className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-bold tracking-tight">Comanda</span>
          <span className="hidden text-sm text-muted md:inline">agente de pedidos com IA</span>
        </a>

        <nav aria-label="Seções" className="order-3 flex w-full gap-1 rounded-xl border border-line bg-panel p-1 sm:order-none sm:w-auto">
          {VIEWS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => go(v)}
              aria-current={view === v ? 'page' : undefined}
              className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[0.82rem] transition sm:flex-none sm:px-3 sm:text-sm ${view === v ? 'bg-raised text-fg' : 'text-muted hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm hover:bg-raised"
          >
            <span className={`h-2 w-2 rounded-full ${isDemo ? 'bg-dende' : 'bg-tide'}`} aria-hidden />
            <span className="hidden sm:inline">{isDemo ? 'Modo demonstração' : provider.model}</span>
            <Cpu size={15} className="sm:hidden" aria-label={isDemo ? 'Modo demonstração' : provider.model} />
          </button>
          <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="Código no GitHub" className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-panel hover:bg-raised">
            <Github size={16} />
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col pb-6">
        {view === 'atendimento' && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-muted">Roteiros prontos:</span>
              {DEMO_SCRIPTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={agent.busy && playing !== s.id}
                  onClick={() => play(s.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition disabled:opacity-40 ${
                    playing === s.id ? 'border-tide bg-tide/15 text-tide' : 'border-line bg-panel hover:border-tide/50'
                  }`}
                >
                  <Play size={11} aria-hidden /> {SCRIPT_LABEL[s.id]}
                </button>
              ))}
              {isDemo && (
                <span className="ml-auto hidden text-xs text-muted lg:inline">
                  Modo demonstração: respostas por regras locais.{' '}
                  <button type="button" onClick={() => setSettingsOpen(true)} className="text-tide underline-offset-2 hover:underline">
                    Usar o Claude
                  </button>
                </span>
              )}
            </div>

            <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl border border-line bg-panel p-1 lg:hidden" role="tablist" aria-label="Painéis">
              {(
                [
                  ['conversa', 'Conversa'],
                  ['raciocinio', 'Raciocínio'],
                  ['comanda', 'Comanda'],
                ] as const
              ).map(([p, label]) => (
                <button
                  key={p}
                  role="tab"
                  type="button"
                  aria-selected={pane === p}
                  onClick={() => setPane(p)}
                  className={`rounded-lg py-1.5 text-sm ${pane === p ? 'bg-raised text-fg' : 'text-muted'}`}
                >
                  {label}
                  {p === 'raciocinio' && agent.metrics.toolCalls > 0 && <span className="ml-1 font-mono text-xs text-tide">{agent.metrics.toolCalls}</span>}
                </button>
              ))}
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:flex-none lg:h-[calc(100vh-150px)] lg:min-h-[560px] lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)_minmax(280px,330px)]">
              <div className={`h-[70vh] min-h-[480px] lg:block lg:h-full lg:min-h-0 ${pane === 'conversa' ? '' : 'hidden'}`}>
                <ChatPanel chat={agent.chat} busy={agent.busy} locked={!!agent.state.handoff} onSend={send} onReset={stopAndReset} />
              </div>
              <div className={`h-[70vh] min-h-[480px] lg:block lg:h-full lg:min-h-0 ${pane === 'raciocinio' ? '' : 'hidden'}`}>
                <TracePanel trace={agent.trace} busy={agent.busy} />
              </div>
              <div className={`lg:block lg:h-full lg:min-h-0 ${pane === 'comanda' ? '' : 'hidden'}`}>
                <TicketPanel state={agent.state} metrics={agent.metrics} />
              </div>
            </div>
            {agent.error && (
              <p role="alert" className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {agent.error} Confira a chave e o modelo em "{provider.model}", ou volte para o modo demonstração.
              </p>
            )}
          </>
        )}
        {view === 'avaliacoes' && <EvalView provider={isDemo ? createDemoProvider() : provider} />}
        {view === 'como-funciona' && <HowItWorks />}
      </main>

      <footer className="mx-auto w-full max-w-[1480px] border-t border-line py-4 text-xs text-muted">
        Cantina Maré é um restaurante fictício; cardápio, pedidos e pessoas são inventados para a demonstração.
      </footer>

      <SettingsDialog open={settingsOpen} value={settings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />
    </div>
  )
}
