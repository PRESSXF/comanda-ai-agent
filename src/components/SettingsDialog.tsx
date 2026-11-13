import { useEffect, useRef, useState } from 'react'
import { KeyRound, X } from 'lucide-react'

export interface ProviderSettings {
  mode: 'demo' | 'anthropic'
  apiKey: string
  model: string
}

export const DEFAULT_MODEL = 'claude-haiku-4-5'

interface Props {
  open: boolean
  value: ProviderSettings
  onClose: () => void
  onSave: (v: ProviderSettings) => void
}

export function SettingsDialog({ open, value, onClose, onSave }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setDraft(value)
      d.showModal()
    } else if (!open && d.open) d.close()
  }, [open, value])

  const canSave = draft.mode === 'demo' || (draft.apiKey.trim().startsWith('sk-') && draft.model.trim())

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-panel p-0 text-fg backdrop:bg-ink/70 backdrop:backdrop-blur-sm"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) onSave({ ...draft, apiKey: draft.apiKey.trim(), model: draft.model.trim() })
        }}
        className="p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Qual cérebro o agente usa</h2>
            <p className="mt-1 text-sm text-muted">As ferramentas, o cardápio e as regras são os mesmos nos dois modos.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-muted hover:bg-raised hover:text-fg">
            <X size={18} />
          </button>
        </div>

        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Modo</legend>
          {(
            [
              ['demo', 'Demonstração', 'Regras locais que seguem o mesmo protocolo de um modelo real. Grátis, instantâneo e sempre igual.'],
              ['anthropic', 'Modelo real (Claude)', 'Usa a sua chave da API da Anthropic. Cada mensagem custa alguns centavos de dólar.'],
            ] as const
          ).map(([mode, title, desc]) => (
            <label
              key={mode}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${draft.mode === mode ? 'border-tide/70 bg-tide/[.06]' : 'border-line hover:bg-raised'}`}
            >
              <input
                id={`mode-${mode}`}
                type="radio"
                name="mode"
                checked={draft.mode === mode}
                onChange={() => setDraft({ ...draft, mode })}
                className="mt-1 accent-[rgb(var(--tide))]"
              />
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted">{desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {draft.mode === 'anthropic' && (
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="api-key" className="text-xs font-medium text-muted">
                Chave da API
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 focus-within:border-tide/70">
                <KeyRound size={15} className="text-muted" aria-hidden />
                <input
                  id="api-key"
                  type="password"
                  autoComplete="off"
                  value={draft.apiKey}
                  onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                  placeholder="sk-ant-…"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="model" className="text-xs font-medium text-muted">
                Modelo
              </label>
              <input
                id="model"
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2.5 font-mono text-sm focus:border-tide/70 focus:outline-none"
              />
            </div>
            <p className="rounded-lg bg-ink/60 p-3 text-xs leading-relaxed text-muted">
              A chave fica só nesta aba (sessionStorage) e vai direto do seu navegador para a API da Anthropic. Não existe servidor no meio. Feche a aba para apagá-la.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-muted hover:bg-raised hover:text-fg">
            Cancelar
          </button>
          <button type="submit" disabled={!canSave} className="rounded-xl bg-tide px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-40">
            Usar este modo
          </button>
        </div>
      </form>
    </dialog>
  )
}
