import { Headset, ShieldAlert } from 'lucide-react'
import type { AgentState } from '../agent/types'
import { findItem, formatBRL } from '../domain/menu'
import { subtotalCents, totalCents } from '../domain/order'

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Em aberto',
  confirmado: 'Na cozinha',
  em_preparo: 'Em preparo',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
}

const REASON_LABEL: Record<string, string> = {
  reclamacao: 'Reclamação',
  reembolso: 'Reembolso',
  cancelamento: 'Cancelamento',
  pedido_do_cliente: 'Cliente pediu uma pessoa',
  fora_do_escopo: 'Fora do escopo',
}

interface Metrics {
  turns: number
  toolCalls: number
  tokens: number
  latency: number
  estimated: boolean
}

export function TicketPanel({ state, metrics }: { state: AgentState; metrics: Metrics }) {
  const { order, handoff, restrictions } = state
  const confirmed = order.status !== 'aberto'
  const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <aside aria-label="Comanda e indicadores" className="scroll-thin flex h-full min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="relative">
        <div className="rounded-t-xl bg-paper px-5 pb-5 pt-5 font-mono text-[0.8rem] text-paperink shadow-[0_18px_40px_-20px_rgba(0,0,0,.8)]">
          <div className="text-center">
            <p className="font-display text-lg font-extrabold tracking-tight">CANTINA MARÉ</p>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] opacity-60">Comanda de entrega</p>
          </div>
          <div className="my-3 flex justify-between border-y border-dashed border-paperink/30 py-1.5 text-[0.72rem]">
            <span>{order.id}</span>
            <span>{now}</span>
          </div>

          {order.lines.length === 0 ? (
            <p className="py-6 text-center text-[0.75rem] opacity-50">Os itens aparecem aqui conforme o agente anota.</p>
          ) : (
            <ul className="space-y-1.5" aria-label="Itens do pedido">
              {order.lines.map((l) => {
                const item = findItem(l.itemId)!
                return (
                  <li key={l.itemId + (l.note ?? '')} className="animate-print">
                    <div className="flex gap-2">
                      <span className="w-6 shrink-0 tabular-nums">{l.qty}x</span>
                      <span className="min-w-0 flex-1">{item.name}</span>
                      <span className="tabular-nums">{formatBRL(item.priceCents * l.qty)}</span>
                    </div>
                    {l.note && <p className="pl-8 text-[0.72rem] opacity-70">obs.: {l.note}</p>}
                  </li>
                )
              })}
            </ul>
          )}

          {restrictions.length > 0 && (
            <p className="mt-3 flex items-center gap-1.5 rounded bg-paperink px-2 py-1 text-[0.72rem] font-semibold uppercase tracking-wide text-paper">
              <ShieldAlert size={13} aria-hidden /> Alergia: {restrictions.join(', ')}
            </p>
          )}

          <dl className="mt-3 space-y-1 border-t border-dashed border-paperink/30 pt-2 tabular-nums">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatBRL(subtotalCents(order))}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Entrega{order.neighborhood ? ` · ${order.neighborhood}` : ''}</dt>
              <dd>{order.delivery ? formatBRL(order.delivery.feeCents) : '—'}</dd>
            </div>
            <div className="flex justify-between pt-1 text-[0.95rem] font-semibold">
              <dt>Total</dt>
              <dd>{formatBRL(totalCents(order))}</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[0.72rem] opacity-60">{order.delivery ? `Prazo ${order.delivery.etaMin}–${order.delivery.etaMax} min` : 'Sem endereço'}</span>
            <span
              className={`rotate-[-4deg] rounded border-2 px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-widest ${
                confirmed ? 'border-emerald-700 text-emerald-700' : 'border-paperink/40 text-paperink/50'
              }`}
            >
              {STATUS_LABEL[order.status]}
            </span>
          </div>
        </div>
        <div className="paper-tear" aria-hidden />
      </div>

      {handoff && (
        <div className="animate-rise rounded-xl border border-dende/40 bg-dende/10 p-4" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-dende">
            <Headset size={16} aria-hidden /> Na fila do atendimento humano
          </p>
          <p className="mt-1 text-xs text-muted">Motivo: {REASON_LABEL[handoff.reason] ?? handoff.reason}</p>
          <p className="mt-2 rounded-lg bg-ink/60 p-2.5 text-[0.8rem] leading-snug">{handoff.summary}</p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2">
        {[
          ['Mensagens do cliente', String(metrics.turns)],
          ['Ferramentas usadas', String(metrics.toolCalls)],
          ['Latência média', metrics.latency ? `${metrics.latency} ms` : '—'],
          ['Tokens', metrics.tokens ? `${metrics.estimated ? '~' : ''}${metrics.tokens.toLocaleString('pt-BR')}` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-panel px-3 py-2.5">
            <dt className="text-[0.7rem] text-muted">{label}</dt>
            <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {metrics.estimated && <p className="-mt-2 text-[0.7rem] text-muted">~ estimado no modo demonstração (4 caracteres por token).</p>}
    </aside>
  )
}
