import { MENU, type MenuItem } from '../../domain/menu'
import { findNeighborhoodIn, normalize } from '../../domain/delivery'

/**
 * Leitura simples de intenções em português, usada só pelo modo demonstração.
 * O modo com modelo real não usa nada daqui.
 */

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, meia: 1,
}

export interface ItemMention {
  item: MenuItem
  qty: number
  note?: string
}

const ALLERGENS = ['amendoim', 'lactose', 'gluten', 'ovo', 'peixe']

const aliasIndex = MENU.flatMap((item) =>
  [item.name, ...item.aliases].map((alias) => ({ alias: normalize(alias), item })),
).sort((a, b) => b.alias.length - a.alias.length)

export function findItemMentions(text: string): ItemMention[] {
  let t = ` ${normalize(text).replace(/[,.!?;]/g, ' ')} `
  const found: Array<ItemMention & { pos: number }> = []
  for (const { alias, item } of aliasIndex) {
    const needle = ` ${alias} `
    let pos = t.indexOf(needle)
    while (pos !== -1) {
      if (!found.some((f) => f.item.id === item.id)) {
        const before = t.slice(0, pos).trim().split(/\s+/)
        const qty = parseQty(before.slice(-3))
        found.push({ item, qty, pos })
      }
      // Apaga o trecho para "suco de caja" não casar de novo como "suco".
      t = t.slice(0, pos) + ' '.repeat(needle.length) + t.slice(pos + needle.length)
      pos = t.indexOf(needle)
    }
  }
  const note = text.match(/\bsem (cebola|coentro|pimenta|bacon|queijo|gelo)\b/i)?.[0]
  return found
    .sort((a, b) => a.pos - b.pos)
    .map(({ item, qty }) => ({ item, qty, ...(note && item.category === 'pratos' ? { note: note.toLowerCase() } : {}) }))
}

function parseQty(words: string[]): number {
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].replace(/x$/, '')
    if (/^\d{1,2}$/.test(w)) return Math.max(1, Math.min(20, Number(w)))
    if (w in NUMBER_WORDS) return NUMBER_WORDS[w]
  }
  return 1
}

export function findAllergen(text: string): string | null {
  const t = normalize(text)
  if (!/(alerg|intoleran|nao posso|nao como|sem )/.test(t)) return null
  return ALLERGENS.find((a) => t.includes(a)) ?? null
}

export function findOrderCode(text: string): string | null {
  const m = text.toUpperCase().match(/MRE[-\s]?(\d{4})/)
  return m ? `MRE-${m[1]}` : null
}

export type Intent =
  | 'saudacao'
  | 'cardapio'
  | 'pedido'
  | 'remover'
  | 'bairro'
  | 'confirmar'
  | 'status'
  | 'humano'
  | 'alergia'
  | 'vegetariano'
  | 'desconhecido'

export function detectIntents(text: string): Intent[] {
  const t = normalize(text)
  const intents: Intent[] = []
  if (/(atendente|humano|pessoa de verdade|falar com alguem|gerente|reclama|absurdo|demorou|atrasad|nunca chegou|estorno|reembolso|devolver o dinheiro|cancelar (o |meu )?pedido)/.test(t)) intents.push('humano')
  if (findOrderCode(text) || /(cade (o )?meu pedido|status do pedido|onde esta meu pedido)/.test(t)) intents.push('status')
  if (findAllergen(text)) intents.push('alergia')
  if (/(vegetarian|vegano|sem carne)/.test(t)) intents.push('vegetariano')
  if (/(cardapio|menu|o que (voces )?tem|opcoes|sugest|recomenda)/.test(t)) intents.push('cardapio')
  if (/(tira|remove|retira|cancela o|cancela a)\b/.test(t)) intents.push('remover')
  else if (findItemMentions(text).length) intents.push('pedido')
  if (findNeighborhoodIn(text)) intents.push('bairro')
  if (/(pode (confirmar|mandar|fechar)|confirma|fecha(r)? o pedido|finaliza|so isso|e so isso|pode enviar|isso mesmo|^sim\b|^pode\b|^ok\b|^fechado\b)/.test(t)) intents.push('confirmar')
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|opa)\b/.test(t) && intents.length === 0) intents.push('saudacao')
  return intents.length ? intents : ['desconhecido']
}

export { findNeighborhoodIn }
