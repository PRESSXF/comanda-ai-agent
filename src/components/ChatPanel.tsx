import { useEffect, useRef, useState } from 'react'
import { ArrowUp, CheckCheck, RotateCcw } from 'lucide-react'
import type { ChatMessage } from '../hooks/useAgent'

const STARTERS = ['Oi! O que vocês têm hoje?', 'Tenho alergia a lactose', 'Quero 2 caldinhos e um guaraná', 'Cadê meu pedido MRE-2041?']

const time = (at: number) => new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

interface Props {
  chat: ChatMessage[]
  busy: boolean
  locked: boolean
  onSend: (text: string) => void
  onReset: () => void
}

export function ChatPanel({ chat, busy, locked, onSend, onReset }: Props) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat.length, busy])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || locked || !draft.trim()) return
    onSend(draft)
    setDraft('')
  }

  return (
    <section aria-label="Conversa com o cliente" className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-ink">
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-tide font-display text-sm font-bold text-ink" aria-hidden>
          CM
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Cantina Maré</p>
          <p className="text-xs text-muted" aria-live="polite">
            {busy ? <span className="text-tide">digitando…</span> : locked ? 'com a equipe' : 'atendente virtual · online'}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted transition hover:bg-raised hover:text-fg"
        >
          <RotateCcw size={14} aria-hidden /> Nova conversa
        </button>
      </header>

      <div
        ref={listRef}
        className="scroll-thin flex-1 space-y-2 overflow-y-auto px-3 py-4"
        style={{ backgroundImage: 'radial-gradient(rgb(var(--line) / .35) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        role="log"
        aria-live="polite"
      >
        {chat.length === 0 && (
          <div className="mx-auto mt-6 max-w-[17rem] animate-rise text-center">
            <p className="font-display text-lg font-semibold">Faça um pedido como cliente</p>
            <p className="mt-1 text-sm text-muted">Escreva do jeito que você escreveria no WhatsApp, ou toque numa das mensagens abaixo.</p>
            <div className="mt-4 flex flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSend(s)}
                  className="rounded-xl border border-line bg-panel px-3 py-2 text-left text-sm transition hover:border-tide/60 hover:bg-raised"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.map((m) =>
          m.from === 'sistema' ? (
            <p key={m.id} className="mx-auto w-fit animate-rise rounded-full bg-dende/15 px-3 py-1 text-center text-xs font-medium text-dende">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className={`flex animate-rise ${m.from === 'cliente' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[0.92rem] leading-snug shadow-sm ${
                  m.from === 'cliente' ? 'rounded-br-md bg-tide/20 text-fg' : 'rounded-bl-md bg-raised text-fg'
                }`}
              >
                {m.text}
                <span className="ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[0.68rem] text-muted">
                  {time(m.at)}
                  {m.from === 'cliente' && <CheckCheck size={13} className="text-tide" aria-label="lida" />}
                </span>
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex justify-start" aria-hidden>
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-raised px-3 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-blink rounded-full bg-muted" style={{ animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-line bg-panel p-3">
        <label htmlFor="chat-input" className="sr-only">
          Mensagem do cliente
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={locked}
          placeholder={locked ? 'A equipe assumiu esta conversa' : 'Mensagem'}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2.5 text-sm placeholder:text-muted focus:border-tide/70 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || locked || !draft.trim()}
          aria-label="Enviar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tide text-ink transition hover:brightness-110 disabled:opacity-40"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
    </section>
  )
}
