import type { AgentState, TraceEvent } from '../agent/types'

/**
 * Cenários de avaliação. Cada um simula uma conversa real e verifica
 * o que importa para o negócio: pedido certo, preço certo, segurança e
 * transferência para humano na hora certa.
 */

export interface CheckContext {
  state: AgentState
  replies: string[]
  events: TraceEvent[]
}

export interface Check {
  label: string
  /** Por que essa verificação importa para o restaurante. */
  why: string
  test: (ctx: CheckContext) => boolean
}

export interface Scenario {
  id: string
  title: string
  category: 'pedido' | 'segurança' | 'atendimento' | 'robustez'
  turns: string[]
  checks: Check[]
}

const toolCalls = (ctx: CheckContext, name: string) =>
  ctx.events.filter((e): e is Extract<TraceEvent, { kind: 'tool' }> => e.kind === 'tool' && e.call.name === name)
const qtyOf = (ctx: CheckContext, id: string) => ctx.state.order.lines.find((l) => l.itemId === id)?.qty ?? 0
const lastReply = (ctx: CheckContext) => ctx.replies[ctx.replies.length - 1] ?? ''

export const SCENARIOS: Scenario[] = [
  {
    id: 'pedido-completo',
    title: 'Pedido completo, do oi à confirmação',
    category: 'pedido',
    turns: ['Oi, boa noite!', 'Quero 2 baião de dois e um suco de cajá', 'Boa Viagem', 'Pode fechar', 'Sim'],
    checks: [
      { label: 'Anota 2 baiões de dois', why: 'Quantidade errada vira prato desperdiçado ou cliente sem comida.', test: (c) => qtyOf(c, 'baiao') === 2 },
      { label: 'Anota 1 suco de cajá', why: 'Item esquecido é a reclamação mais comum em delivery.', test: (c) => qtyOf(c, 'suco-caja') === 1 },
      { label: 'Calcula a entrega pelo bairro', why: 'Taxa errada gera prejuízo ou cobrança indevida.', test: (c) => c.state.order.delivery?.feeCents === 500 },
      { label: 'Mostra o resumo antes de confirmar', why: 'O cliente precisa ver o total antes de o pedido ir para a cozinha.', test: (c) => toolCalls(c, 'ver_pedido').length >= 1 },
      { label: 'Confirma o pedido', why: 'É a conversão: a conversa só vale se terminar em pedido.', test: (c) => c.state.order.status === 'confirmado' },
      { label: 'Informa o total certo (R$ 100,70)', why: 'Preço dito pelo agente precisa bater com o sistema.', test: (c) => lastReply(c).includes('100,70') },
    ],
  },
  {
    id: 'item-indisponivel',
    title: 'Item esgotado com sugestão de alternativa',
    category: 'pedido',
    turns: ['Quero uma moqueca'],
    checks: [
      { label: 'Não adiciona item esgotado', why: 'Vender o que não existe gera cancelamento e estorno.', test: (c) => qtyOf(c, 'moqueca') === 0 },
      { label: 'Avisa que acabou', why: 'O cliente precisa saber na hora, não quando o pedido atrasar.', test: (c) => /acabou|indispon/i.test(lastReply(c)) },
      { label: 'Sugere uma alternativa', why: 'Sugestão mantém a venda em vez de perder o cliente.', test: (c) => /sugerir|que tal|posso oferecer/i.test(lastReply(c)) },
    ],
  },
  {
    id: 'alergia-amendoim',
    title: 'Cliente com alergia a amendoim',
    category: 'segurança',
    turns: ['Tenho alergia a amendoim, o que vocês têm de petisco?', 'Quero um dadinho de tapioca'],
    checks: [
      { label: 'Filtra o cardápio pelo alérgeno', why: 'Recomendar algo com amendoim pode causar uma reação grave.', test: (c) => toolCalls(c, 'buscar_cardapio').some((e) => e.call.input.sem_alergeno === 'amendoim') },
      { label: 'Não lista o dadinho de tapioca', why: 'O dadinho leva amendoim na geleia.', test: (c) => !/dadinho/i.test(c.replies[0] ?? '') },
      { label: 'Recusa adicionar item com amendoim', why: 'A restrição informada precisa valer até o fim da conversa.', test: (c) => qtyOf(c, 'dadinho') === 0 },
      { label: 'Não promete ausência de contaminação', why: 'Garantia falsa expõe o restaurante a risco legal.', test: (c) => !/garanto|100% seguro|sem risco/i.test(c.replies.join(' ')) },
    ],
  },
  {
    id: 'reclamacao-atraso',
    title: 'Reclamação de atraso vai para humano',
    category: 'atendimento',
    turns: ['Meu pedido MRE-2041 tá muito atrasado, isso é um absurdo'],
    checks: [
      { label: 'Transfere para humano', why: 'Cliente irritado com IA respondendo piora a avaliação.', test: (c) => c.state.handoff !== null },
      { label: 'Classifica como reclamação', why: 'A fila certa encurta o tempo de resposta da equipe.', test: (c) => c.state.handoff?.reason === 'reclamacao' },
      { label: 'Resumo cita o código do pedido', why: 'A equipe não precisa perguntar de novo.', test: (c) => (c.state.handoff?.summary ?? '').includes('MRE-2041') },
    ],
  },
  {
    id: 'status-pedido',
    title: 'Consulta de status pelo código',
    category: 'atendimento',
    turns: ['Cadê meu pedido?', 'MRE-2038'],
    checks: [
      { label: 'Pede o código quando falta', why: 'Sem código, qualquer resposta seria inventada.', test: (c) => /c[óo]digo/i.test(c.replies[0] ?? '') },
      { label: 'Consulta o sistema', why: 'Status precisa vir do sistema, não do modelo.', test: (c) => toolCalls(c, 'consultar_status').length === 1 },
      { label: 'Informa que está em preparo', why: 'Informação certa evita uma segunda mensagem do cliente.', test: (c) => /cozinha|preparo/i.test(lastReply(c)) },
    ],
  },
  {
    id: 'fora-da-area',
    title: 'Bairro fora da área de entrega',
    category: 'robustez',
    turns: ['Quero um escondidinho', 'Olinda'],
    checks: [
      { label: 'Não aceita entrega fora da área', why: 'Aceitar e não entregar é o pior cenário.', test: (c) => !c.state.order.delivery },
      { label: 'Explica onde entrega', why: 'O cliente pode escolher outro endereço.', test: (c) => /n[ãa]o entregamos/i.test(lastReply(c)) },
    ],
  },
  {
    id: 'confirmacao-prematura',
    title: 'Não confirma sem mostrar o total',
    category: 'robustez',
    turns: ['Quero 1 cuscuz e 1 cartola para as Graças, pode fechar'],
    checks: [
      { label: 'Não confirma de primeira', why: 'Confirmar sem o cliente ver o total gera contestação.', test: (c) => c.state.order.status === 'aberto' },
      { label: 'Mostra o resumo com total', why: 'O resumo é o momento de corrigir erros.', test: (c) => /total/i.test(lastReply(c)) },
    ],
  },
  {
    id: 'pedido-minimo',
    title: 'Pedido abaixo do mínimo',
    category: 'robustez',
    turns: ['Quero uma água', 'Boa Viagem', 'Pode fechar', 'Sim'],
    checks: [
      { label: 'Não confirma abaixo de R$ 30', why: 'Entrega abaixo do mínimo dá prejuízo.', test: (c) => c.state.order.status === 'aberto' },
      { label: 'Explica o pedido mínimo', why: 'O cliente entende e pode completar o pedido.', test: (c) => /m[íi]nimo/i.test(lastReply(c)) },
    ],
  },
]
