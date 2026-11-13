import { useEffect, useRef } from 'react'
import { AlertTriangle, Bot, MessageSquare, Wrench } from 'lucide-react'
import type { TraceEvent } from '../agent/types'
import { summarize } from '../agent/summarize'

const TOOL_LABEL: Record<string, string> = {
  buscar_cardapio: 'Consultou o cardápio',
  adicionar_item: 'Adicionou ao pedido',
  remover_item: 'Removeu do pedido',
  ver_pedido: 'Revisou o pedido',
  calcular_entrega: 'Calculou a entrega',
  confirmar_pedido: 'Confirmou o pedido',
  consultar_status: 'Consultou o status',
  transferir_para_humano: 'Transferiu para humano',
}

function compact(input: Record<string, unknown>) {
  const entries = Object.entries(input)
  if (!entries.length) return '()'
  return `(${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})`
}

const fmtTokens = (n: number, estimated: boolean) => `${estimated ? '~' : ''}${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n} tokens`

export function TracePanel({ trace, busy }: { trace: TraceEvent[]; busy: boolean }) {
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    // Rola só a lista; scrollIntoView rolaria a página inteira junto.
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [trace.length])

  return (
    <section aria-label="Raciocínio do agente" className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel">
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-base font-semibold">Raciocínio do agente</h2>
          <p className="text-xs text-muted">Cada chamada ao modelo e cada ferramenta usada, na ordem em que aconteceram.</p>
        </div>
        {busy && <span className="shrink-0 animate-blink font-mono text-xs text-tide">executando</span>}
      </header>

      <ol ref={listRef} className="scroll-thin flex-1 space-y-1.5 overflow-y-auto px-4 py-4 font-mono text-[0.78rem]">
        {trace.length === 0 && (
          <li className="mx-auto mt-8 max-w-sm text-center font-sans text-sm text-muted">
            Aqui aparece o que o agente faz por trás de cada resposta: quais ferramentas ele chamou, com quais dados, quanto tempo levou e o que o sistema devolveu.
          </li>
        )}
        {trace.map((e, i) => {
          if (e.kind === 'user')
            return (
              <li key={i} className={`flex animate-rise gap-2 font-sans ${i > 0 ? 'mt-4 border-t border-line pt-4' : ''}`}>
                <MessageSquare size={15} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                <p className="min-w-0 text-sm">
                  <span className="text-muted">Cliente: </span>
                  {e.text}
                </p>
              </li>
            )
          if (e.kind === 'model')
            return (
              <li key={i} className="flex animate-rise items-start gap-2 pl-1">
                <Bot size={14} className="mt-0.5 shrink-0 text-tide" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-fg">
                    <span>Modelo · passo {e.step}</span>
                    <span className="text-muted">
                      {e.ms} ms · {fmtTokens(e.usage.inputTokens + e.usage.outputTokens, e.usage.estimated)}
                    </span>
                  </p>
                  <p className="text-muted">
                    {e.toolCalls.length
                      ? `pediu ${e.toolCalls.length} ${e.toolCalls.length === 1 ? 'ferramenta' : 'ferramentas'}`
                      : 'respondeu ao cliente'}
                  </p>
                </div>
              </li>
            )
          if (e.kind === 'tool')
            return (
              <li key={i} className="animate-rise pl-6">
                <details className={`group rounded-lg border px-3 py-2 ${e.isError ? 'border-dende/40 bg-dende/[.07]' : 'border-line bg-ink/60'}`}>
                  <summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
                    <Wrench size={13} className={`mt-0.5 shrink-0 ${e.isError ? 'text-dende' : 'text-tide'}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-[0.8rem] font-medium text-fg">{TOOL_LABEL[e.call.name] ?? e.call.name}</span>
                      <span className="block break-words text-muted">
                        {e.call.name}
                        {compact(e.call.input)}
                      </span>
                      <span className={`block ${e.isError ? 'text-dende' : 'text-fg/80'}`}>→ {summarize(e.call.name, e.result, e.isError)}</span>
                    </span>
                    <span className="shrink-0 text-muted">{e.ms} ms</span>
                  </summary>
                  <pre className="scroll-thin mt-2 max-h-56 overflow-auto rounded-md bg-ink p-2 text-[0.72rem] leading-relaxed text-muted">
                    {JSON.stringify(e.result, null, 2)}
                  </pre>
                </details>
              </li>
            )
          if (e.kind === 'error')
            return (
              <li key={i} className="flex animate-rise gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-sans text-sm text-danger">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> {e.message}
              </li>
            )
          return null
        })}
      </ol>
    </section>
  )
}
