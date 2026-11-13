import { MENU, findItem } from '../../domain/menu'
import { normalize } from '../../domain/delivery'
import type { AgentMessage, CompletionRequest, CompletionResult, Provider, ToolCall } from '../types'
import { detectIntents, findAllergen, findItemMentions, findNeighborhoodIn, findOrderCode } from './nlu'

/**
 * Provedor de demonstração: segue o mesmo protocolo de um modelo real
 * (pede ferramentas, recebe resultados, responde em texto), mas decide por regras.
 * Serve para a demo pública funcionar sem chave de API e para os testes rodarem
 * de forma determinística no CI. A interface deixa claro quando ele está em uso.
 */

type Snapshot = {
  codigo: string
  status: string
  itens: Array<{ item_id: string; nome: string; quantidade: number; observacao?: string }>
  subtotal: string
  bairro: string | null
  taxa_entrega: string | null
  prazo: string | null
  total: string
  abaixo_minimo: boolean
}

let seq = 0
const callId = () => `toolu_demo_${(++seq).toString(36)}`
const call = (name: string, input: Record<string, unknown> = {}): ToolCall => ({ id: callId(), name, input })

const estimateTokens = (s: string) => Math.ceil(s.length / 4)

function lastUserIndex(messages: AgentMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') return i
  return -1
}

function latestSnapshot(messages: AgentMessage[]): Snapshot | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'tool' && !m.isError) {
      const r = m.result as { pedido?: Snapshot }
      if (r?.pedido) return r.pedido
    }
  }
  return null
}

function lastAssistantText(messages: AgentMessage[], before: number) {
  for (let i = before - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.text) return m.text
  }
  return ''
}

function handoffReason(t: string) {
  if (/(estorno|reembolso|devolver o dinheiro)/.test(t)) return 'reembolso'
  if (/cancelar/.test(t)) return 'cancelamento'
  if (/(reclama|absurdo|demorou|atrasad|nunca chegou|frio|errado)/.test(t)) return 'reclamacao'
  return 'pedido_do_cliente'
}

function buildSummary(messages: AgentMessage[], current: string) {
  const code = findOrderCode(current) ?? findOrderCode(messages.filter((m) => m.role === 'user').map((m) => (m as { content: string }).content).join(' '))
  const snap = latestSnapshot(messages)
  const parts = [`Cliente diz: "${current.trim().slice(0, 140)}"`]
  if (code) parts.push(`Pedido citado: ${code}.`)
  if (snap && snap.itens.length) parts.push(`Pedido em aberto: ${snap.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', ')} (${snap.total}).`)
  return parts.join(' ')
}

/** Decide quais ferramentas chamar a partir da última mensagem do cliente. */
function plan(messages: AgentMessage[], userText: string, userIdx: number): CompletionResult['toolCalls'] | string {
  const t = normalize(userText)
  const intents = detectIntents(userText)
  const calls: ToolCall[] = []

  if (intents.includes('humano')) {
    return [call('transferir_para_humano', { motivo: handoffReason(t), resumo: buildSummary(messages.slice(0, userIdx), userText) })]
  }
  if (intents.includes('status')) {
    const code = findOrderCode(userText)
    if (!code) return 'Claro! Me passa o código do pedido? Ele começa com MRE e está na mensagem de confirmação.'
    calls.push(call('consultar_status', { codigo: code }))
  }

  const allergen = findAllergen(userText)
  const cat = (['bebidas', 'sobremesas', 'petiscos', 'pratos'] as const).find((c) => t.includes(c.slice(0, -1)))
  const catFilter = cat ? { categoria: cat } : {}
  if (allergen) calls.push(call('buscar_cardapio', { ...catFilter, sem_alergeno: allergen }))
  else if (intents.includes('vegetariano')) calls.push(call('buscar_cardapio', { ...catFilter, vegetariano: true }))
  else if (intents.includes('cardapio')) calls.push(call('buscar_cardapio', catFilter))

  const mentions = findItemMentions(userText)
  if (intents.includes('remover')) for (const m of mentions) calls.push(call('remover_item', { item_id: m.item.id }))
  else if (!allergen) for (const m of mentions) calls.push(call('adicionar_item', { item_id: m.item.id, quantidade: m.qty, ...(m.note ? { observacao: m.note } : {}) }))

  const hood = findNeighborhoodIn(userText)
  if (hood) calls.push(call('calcular_entrega', { bairro: hood }))
  else {
    const asked = /bairro/i.test(lastAssistantText(messages, userIdx))
    const raw = userText.trim().replace(/^(é |e |moro (no|na|em) |fica (no|na|em) |no |na |em )/i, '')
    if (asked && raw.split(/\s+/).length <= 3 && !intents.includes('pedido')) calls.push(call('calcular_entrega', { bairro: raw.replace(/[.!]$/, '') }))
  }

  if (intents.includes('confirmar')) {
    const changedNow = calls.some((c) => c.name === 'adicionar_item' || c.name === 'calcular_entrega' || c.name === 'remover_item')
    const askedToConfirm = /posso confirmar/i.test(lastAssistantText(messages, userIdx))
    calls.push(call(!changedNow && askedToConfirm ? 'confirmar_pedido' : 'ver_pedido'))
  }

  if (calls.length) return calls

  if (intents.includes('saudacao'))
    return 'Oi! Aqui é a atendente virtual da Cantina Maré. Posso te mostrar o cardápio ou anotar seu pedido. O que vai ser hoje?'

  const wanted = t.match(/(?:quero|tem|voces tem|vende[m]?)\s+(?:um |uma |o |a )?([a-z]{3,}(?: [a-z]{3,})?)/)?.[1]
  if (wanted) return [call('buscar_cardapio', { termo: wanted })]

  return 'Não entendi muito bem. Posso te mostrar o cardápio, anotar um pedido ou ver o status de uma entrega.'
}

function listItems(itens: Array<{ nome: string; preco: string; disponivel: boolean }>, max = 7) {
  const available = itens.filter((i) => i.disponivel)
  const lines = available.slice(0, max).map((i) => `• ${i.nome}: ${i.preco}`)
  if (available.length > max) lines.push(`• e mais ${available.length - max} opções`)
  return lines.join('\n')
}

function suggestionFor(itemId: string) {
  const item = findItem(itemId)
  return MENU.find((m) => m.category === item?.category && m.available && m.id !== itemId)
}

/** Monta a resposta final a partir dos resultados das ferramentas deste turno. */
function compose(messages: AgentMessage[], userIdx: number): string {
  const results = messages.slice(userIdx + 1).filter((m): m is Extract<AgentMessage, { role: 'tool' }> => m.role === 'tool')
  const parts: string[] = []
  const added: string[] = []
  let closing = true

  for (const r of results) {
    // Resultados de ferramentas são JSON livre, como chegam da API; a forma de cada um está em tools.ts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = r.result as Record<string, any>
    switch (r.name) {
      case 'buscar_cardapio': {
        if (r.isError) break
        if (res.filtro_alergeno) {
          parts.push(`Sem ${res.filtro_alergeno}, hoje temos:\n${listItems(res.itens)}\nNão consigo garantir ausência de contaminação cruzada na cozinha, tá?`)
        } else if (res.total === 0) {
          parts.push('Esse item não está no nosso cardápio. Quer que eu te mostre as opções?')
          closing = false
        } else {
          const off = (res.itens as Array<{ nome: string; disponivel: boolean }>).filter((i) => !i.disponivel).map((i) => i.nome)
          parts.push(`Olha o que tem hoje:\n${listItems(res.itens)}${off.length ? `\nAcabou por hoje: ${off.join(', ')}.` : ''}`)
        }
        break
      }
      case 'adicionar_item': {
        if (!r.isError) {
          added.push(`${res.adicionado.quantidade}x ${res.adicionado.nome}`)
          break
        }
        const call = (messages.find((m) => m.role === 'assistant' && m.toolCalls?.some((c) => c.id === r.toolCallId)) as Extract<AgentMessage, { role: 'assistant' }>)?.toolCalls?.find((c) => c.id === r.toolCallId)
        const itemId = String(call?.input.item_id ?? '')
        const name = findItem(itemId)?.name ?? 'Esse item'
        if (res.codigo === 'indisponivel') {
          const alt = suggestionFor(itemId)
          parts.push(`${name} acabou por hoje.${alt ? ` Posso sugerir ${alt.name}?` : ''}`)
        } else if (res.codigo === 'conflito_alergeno') {
          const allergen = String(res.erro).match(/contém ([^,]+),/)?.[1]
          const alt = MENU.find((m) => m.category === findItem(itemId)?.category && m.available && allergen && !m.allergens.includes(allergen))
          parts.push(`Deixei ${name} de fora porque leva ${allergen ?? 'um ingrediente da sua restrição'}.${alt ? ` Que tal ${alt.name}?` : ''}`)
          closing = false
        }
        else parts.push(res.erro)
        break
      }
      case 'remover_item':
        parts.push(r.isError ? 'Esse item não estava no pedido.' : 'Pronto, tirei do pedido.')
        break
      case 'calcular_entrega':
        if (r.isError) {
          parts.push(`Ainda não entregamos nesse bairro. Atendemos ${(res.bairros_atendidos as string[]).slice(0, 6).join(', ')} e região.`)
          closing = false
        } else parts.push(`Para ${res.entrega.neighborhood}, a entrega custa ${res.pedido.taxa_entrega} e chega em ${res.pedido.prazo}.`)
        break
      case 'ver_pedido': {
        const p = res.pedido as Snapshot
        if (!p.itens.length) parts.push('Seu pedido ainda está vazio. O que vai querer?')
        else if (!p.bairro) parts.push('Antes de fechar, qual é o seu bairro?')
        else if (p.abaixo_minimo) parts.push(`Seu pedido está em ${p.subtotal}, e o mínimo para entrega é R$ 30,00. Quer adicionar mais alguma coisa?`)
        else
          parts.push(
            `Confere o resumo:\n${p.itens.map((i) => `• ${i.quantidade}x ${i.nome}${i.observacao ? ` (${i.observacao})` : ''}`).join('\n')}\nEntrega em ${p.bairro}: ${p.taxa_entrega}\nTotal: ${p.total}\nPosso confirmar?`,
          )
        closing = false
        break
      }
      case 'confirmar_pedido':
        if (r.isError) {
          if (res.codigo === 'sem_endereco') parts.push('Falta só o seu bairro para eu fechar.')
          else if (res.codigo === 'abaixo_minimo') parts.push('O pedido mínimo para entrega é R$ 30,00. Quer adicionar mais alguma coisa?')
          else parts.push('Seu pedido ainda está vazio. O que vai querer?')
        } else parts.push(`Pedido ${res.pedido.codigo} confirmado! Total de ${res.pedido.total}, chega em ${res.pedido.prazo}. ${res.pagamento}`)
        closing = false
        break
      case 'consultar_status':
        parts.push(r.isError ? 'Não achei esse código. Confere pra mim? Ele está na mensagem de confirmação.' : `Pedido ${res.codigo}: ${res.detalhe}`)
        closing = false
        break
      case 'transferir_para_humano':
        parts.push('Entendo, e sinto muito pelo transtorno. Passei a conversa para a nossa equipe com um resumo, então você não vai precisar repetir nada. Alguém responde em até 5 minutos.')
        closing = false
        break
    }
  }

  if (added.length) parts.unshift(`Anotado: ${added.join(', ')}.`)

  if (closing) {
    const snap = latestSnapshot(messages)
    if (snap?.itens.length && !snap.bairro) parts.push('Qual é o seu bairro para eu calcular a entrega?')
    else if (snap?.itens.length && snap.status === 'aberto') parts.push('Mais alguma coisa ou posso fechar?')
    else if (!snap?.itens.length && results.some((r) => r.name === 'buscar_cardapio')) parts.push('O que vai ser?')
  }
  return parts.join('\n\n')
}

export function createDemoProvider(opts: { latencyMs?: [number, number] } = {}): Provider {
  const [min, max] = opts.latencyMs ?? [0, 0]
  return {
    id: 'demo',
    label: 'Demonstração',
    model: 'regras-locais',
    async complete(req: CompletionRequest, signal?: AbortSignal): Promise<CompletionResult> {
      if (max > 0) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, min + Math.random() * (max - min))
          signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new DOMException('Cancelado', 'AbortError'))
          })
        })
      }
      const { messages } = req
      const userIdx = lastUserIndex(messages)
      const last = messages[messages.length - 1]
      const inputTokens = estimateTokens(req.system + JSON.stringify(req.tools) + JSON.stringify(messages))

      if (last?.role === 'user') {
        const decision = plan(messages, last.content, userIdx)
        if (typeof decision === 'string') return { text: decision, toolCalls: [], usage: { inputTokens, outputTokens: estimateTokens(decision), estimated: true } }
        return { toolCalls: decision, usage: { inputTokens, outputTokens: estimateTokens(JSON.stringify(decision)), estimated: true } }
      }
      const text = compose(messages, userIdx)
      return { text, toolCalls: [], usage: { inputTokens, outputTokens: estimateTokens(text), estimated: true } }
    },
  }
}
