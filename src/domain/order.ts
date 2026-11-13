import { findItem, RESTAURANT } from './menu'
import { quoteDelivery, type DeliveryQuote } from './delivery'

export interface OrderLine {
  itemId: string
  qty: number
  note?: string
}

export type OrderStatus = 'aberto' | 'confirmado' | 'em_preparo' | 'saiu_para_entrega' | 'entregue'

export interface Order {
  id: string
  lines: OrderLine[]
  neighborhood?: string
  delivery?: DeliveryQuote
  status: OrderStatus
}

export class OrderError extends Error {
  constructor(
    message: string,
    readonly code: 'item_inexistente' | 'indisponivel' | 'quantidade_invalida' | 'pedido_vazio' | 'abaixo_minimo' | 'sem_endereco' | 'fora_da_area',
  ) {
    super(message)
  }
}

export const emptyOrder = (id = 'MRE-0000'): Order => ({ id, lines: [], status: 'aberto' })

/** Funções puras: sempre devolvem um novo pedido, nunca alteram o recebido. */

export function addLine(order: Order, itemId: string, qty: number, note?: string): Order {
  const item = findItem(itemId)
  if (!item) throw new OrderError(`O item "${itemId}" não existe no cardápio.`, 'item_inexistente')
  if (!item.available) throw new OrderError(`${item.name} está indisponível hoje.`, 'indisponivel')
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new OrderError('A quantidade precisa ser entre 1 e 20.', 'quantidade_invalida')

  const existing = order.lines.find((l) => l.itemId === itemId && (l.note ?? '') === (note ?? ''))
  const lines = existing
    ? order.lines.map((l) => (l === existing ? { ...l, qty: Math.min(20, l.qty + qty) } : l))
    : [...order.lines, { itemId, qty, ...(note ? { note } : {}) }]
  return { ...order, lines }
}

export function removeLine(order: Order, itemId: string, qty?: number): Order {
  const lines = order.lines
    .map((l) => (l.itemId === itemId ? { ...l, qty: qty === undefined ? 0 : l.qty - qty } : l))
    .filter((l) => l.qty > 0)
  return { ...order, lines }
}

export function subtotalCents(order: Order): number {
  return order.lines.reduce((sum, l) => sum + (findItem(l.itemId)?.priceCents ?? 0) * l.qty, 0)
}

export function totalCents(order: Order): number {
  return subtotalCents(order) + (order.delivery?.feeCents ?? 0)
}

export function setNeighborhood(order: Order, neighborhood: string): Order {
  const delivery = quoteDelivery(neighborhood)
  if (!delivery) throw new OrderError(`Ainda não entregamos em ${neighborhood}.`, 'fora_da_area')
  return { ...order, neighborhood: delivery.neighborhood, delivery }
}

export function confirm(order: Order): Order {
  if (order.lines.length === 0) throw new OrderError('O pedido está vazio.', 'pedido_vazio')
  if (subtotalCents(order) < RESTAURANT.minOrderCents)
    throw new OrderError('O pedido mínimo para entrega é R$ 30,00.', 'abaixo_minimo')
  if (!order.delivery) throw new OrderError('Falta o bairro de entrega.', 'sem_endereco')
  return { ...order, status: 'confirmado' }
}
