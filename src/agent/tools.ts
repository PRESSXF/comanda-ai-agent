import { CATEGORY_LABEL, MENU, RESTAURANT, findItem, formatBRL, type Category } from '../domain/menu'
import { SERVED_NEIGHBORHOODS, normalize } from '../domain/delivery'
import {
  OrderError,
  addLine,
  confirm,
  removeLine,
  setNeighborhood,
  subtotalCents,
  totalCents,
  type Order,
} from '../domain/order'
import type { AgentState, ToolSpec } from './types'

/** Pedidos anteriores, usados pela ferramenta de status. */
export const PAST_ORDERS: Record<string, { status: string; detalhe: string }> = {
  'MRE-2041': { status: 'saiu_para_entrega', detalhe: 'Saiu às 19h42 com o entregador Paulo. Previsão: até 20h10.' },
  'MRE-2038': { status: 'em_preparo', detalhe: 'Na cozinha desde 19h25. Previsão de saída: 19h55.' },
  'MRE-1990': { status: 'entregue', detalhe: 'Entregue ontem às 21h03.' },
}

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'buscar_cardapio',
    description:
      'Lista itens do cardápio com preço, descrição, alérgenos e disponibilidade. Use antes de recomendar qualquer prato. Nunca invente itens ou preços.',
    input_schema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', enum: ['pratos', 'petiscos', 'bebidas', 'sobremesas'] },
        termo: { type: 'string', description: 'Palavra para buscar no nome ou descrição.' },
        sem_alergeno: { type: 'string', description: 'Exclui itens com este alérgeno, ex.: amendoim, lactose, glúten.' },
        vegetariano: { type: 'boolean' },
      },
    },
  },
  {
    name: 'adicionar_item',
    description: 'Adiciona um item ao pedido atual. Use o id retornado por buscar_cardapio.',
    input_schema: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        quantidade: { type: 'integer', minimum: 1, maximum: 20 },
        observacao: { type: 'string', description: 'Ex.: sem cebola.' },
      },
      required: ['item_id', 'quantidade'],
    },
  },
  {
    name: 'remover_item',
    description: 'Remove um item do pedido. Sem quantidade, remove todas as unidades.',
    input_schema: {
      type: 'object',
      properties: { item_id: { type: 'string' }, quantidade: { type: 'integer', minimum: 1 } },
      required: ['item_id'],
    },
  },
  {
    name: 'ver_pedido',
    description: 'Mostra itens, subtotal, entrega e total do pedido atual.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'calcular_entrega',
    description: 'Calcula taxa e prazo de entrega para um bairro do Recife e grava o bairro no pedido.',
    input_schema: { type: 'object', properties: { bairro: { type: 'string' } }, required: ['bairro'] },
  },
  {
    name: 'confirmar_pedido',
    description: 'Confirma e envia o pedido para a cozinha. Só use depois que o cliente aprovar o resumo com o total.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'consultar_status',
    description: 'Consulta o andamento de um pedido já feito pelo código (formato MRE-0000).',
    input_schema: { type: 'object', properties: { codigo: { type: 'string' } }, required: ['codigo'] },
  },
  {
    name: 'transferir_para_humano',
    description:
      'Passa a conversa para a equipe. Use em reclamações, pedidos de reembolso ou cancelamento, quando o cliente pedir uma pessoa ou quando você não souber resolver.',
    input_schema: {
      type: 'object',
      properties: {
        motivo: { type: 'string', enum: ['reclamacao', 'reembolso', 'cancelamento', 'pedido_do_cliente', 'fora_do_escopo'] },
        resumo: { type: 'string', description: 'Resumo em uma ou duas frases para a equipe não precisar perguntar de novo.' },
      },
      required: ['motivo', 'resumo'],
    },
  },
]

export function orderSnapshot(order: Order) {
  return {
    codigo: order.id,
    status: order.status,
    itens: order.lines.map((l) => {
      const item = findItem(l.itemId)!
      return { item_id: l.itemId, nome: item.name, quantidade: l.qty, preco_unitario: formatBRL(item.priceCents), ...(l.note ? { observacao: l.note } : {}) }
    }),
    subtotal: formatBRL(subtotalCents(order)),
    bairro: order.neighborhood ?? null,
    taxa_entrega: order.delivery ? formatBRL(order.delivery.feeCents) : null,
    prazo: order.delivery ? `${order.delivery.etaMin} a ${order.delivery.etaMax} min` : null,
    total: formatBRL(totalCents(order)),
    abaixo_minimo: order.lines.length > 0 && subtotalCents(order) < RESTAURANT.minOrderCents,
  }
}

export interface ToolOutcome {
  state: AgentState
  result: unknown
  isError: boolean
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function executeTool(state: AgentState, name: string, input: Record<string, unknown>): ToolOutcome {
  const ok = (result: unknown, next: AgentState = state): ToolOutcome => ({ state: next, result, isError: false })
  const fail = (erro: string, codigo: string): ToolOutcome => ({ state, result: { erro, codigo }, isError: true })

  try {
    switch (name) {
      case 'buscar_cardapio': {
        const categoria = str(input.categoria) as Category | ''
        const termo = normalize(str(input.termo))
        const semAlergeno = normalize(str(input.sem_alergeno))
        const restrictions = semAlergeno && !state.restrictions.includes(semAlergeno) ? [...state.restrictions, semAlergeno] : state.restrictions
        const itens = MENU.filter((m) => !categoria || m.category === categoria)
          .filter((m) => !termo || normalize(`${m.name} ${m.description} ${m.aliases.join(' ')}`).includes(termo))
          .filter((m) => !semAlergeno || !m.allergens.some((a) => normalize(a) === semAlergeno))
          .filter((m) => input.vegetariano !== true || m.vegetarian)
          .map((m) => ({
            id: m.id,
            nome: m.name,
            categoria: CATEGORY_LABEL[m.category],
            preco: formatBRL(m.priceCents),
            descricao: m.description,
            alergenos: m.allergens,
            disponivel: m.available,
          }))
        return ok({ itens, total: itens.length, filtro_alergeno: semAlergeno || null }, { ...state, restrictions })
      }
      case 'adicionar_item': {
        const id = str(input.item_id)
        const qty = Number(input.quantidade ?? 1)
        const item = findItem(id)
        const conflict = item?.allergens.find((a) => state.restrictions.includes(normalize(a)))
        if (item && conflict) return fail(`${item.name} contém ${conflict}, que o cliente informou não poder consumir.`, 'conflito_alergeno')
        const order = addLine(state.order, id, qty, str(input.observacao) || undefined)
        return ok({ adicionado: { item_id: id, nome: item!.name, quantidade: qty }, pedido: orderSnapshot(order) }, { ...state, order })
      }
      case 'remover_item': {
        const id = str(input.item_id)
        if (!state.order.lines.some((l) => l.itemId === id)) return fail('Esse item não está no pedido.', 'item_fora_do_pedido')
        const order = removeLine(state.order, id, input.quantidade === undefined ? undefined : Number(input.quantidade))
        return ok({ removido: id, pedido: orderSnapshot(order) }, { ...state, order })
      }
      case 'ver_pedido':
        return ok({ pedido: orderSnapshot(state.order) })
      case 'calcular_entrega': {
        try {
          const order = setNeighborhood(state.order, str(input.bairro))
          return ok({ entrega: order.delivery, pedido: orderSnapshot(order) }, { ...state, order })
        } catch (e) {
          if (e instanceof OrderError) return { state, result: { erro: e.message, codigo: e.code, bairros_atendidos: SERVED_NEIGHBORHOODS }, isError: true }
          throw e
        }
      }
      case 'confirmar_pedido': {
        const order = confirm(state.order)
        return ok({ confirmado: true, pedido: orderSnapshot(order), pagamento: 'Na entrega: Pix, cartão ou dinheiro.' }, { ...state, order })
      }
      case 'consultar_status': {
        const code = str(input.codigo).toUpperCase().replace(/^MRE(\d)/, 'MRE-$1')
        if (code === state.order.id && state.order.status !== 'aberto') return ok({ codigo: code, status: state.order.status, detalhe: 'Pedido recebido pela cozinha agora há pouco.' })
        const found = PAST_ORDERS[code]
        if (!found) return fail(`Não encontrei o pedido ${code}.`, 'pedido_nao_encontrado')
        return ok({ codigo: code, ...found })
      }
      case 'transferir_para_humano': {
        const handoff = { reason: str(input.motivo) || 'fora_do_escopo', summary: str(input.resumo), at: Date.now() }
        return ok({ transferido: true, fila: 'Atendimento', tempo_estimado: 'até 5 min' }, { ...state, handoff })
      }
      default:
        return fail(`Ferramenta desconhecida: ${name}`, 'ferramenta_desconhecida')
    }
  } catch (e) {
    if (e instanceof OrderError) return fail(e.message, e.code)
    throw e
  }
}
