/** Taxas e prazos de entrega por bairro do Recife (valores fictícios). */

export interface DeliveryQuote {
  neighborhood: string
  feeCents: number
  etaMin: number
  etaMax: number
}

const ZONES: Array<{ fee: number; eta: [number, number]; neighborhoods: string[] }> = [
  { fee: 500, eta: [30, 45], neighborhoods: ['Boa Viagem', 'Pina', 'Setúbal'] },
  { fee: 800, eta: [40, 55], neighborhoods: ['Espinheiro', 'Graças', 'Aflitos', 'Casa Forte', 'Madalena', 'Derby'] },
  { fee: 1100, eta: [50, 70], neighborhoods: ['Casa Amarela', 'Torre', 'Várzea', 'Imbiribeira', 'Recife Antigo'] },
]

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

export const SERVED_NEIGHBORHOODS = ZONES.flatMap((z) => z.neighborhoods)

export function quoteDelivery(input: string): DeliveryQuote | null {
  const n = normalize(input)
  for (const zone of ZONES) {
    const hit = zone.neighborhoods.find((b) => normalize(b) === n)
    if (hit) return { neighborhood: hit, feeCents: zone.fee, etaMin: zone.eta[0], etaMax: zone.eta[1] }
  }
  return null
}

export function findNeighborhoodIn(text: string): string | null {
  const t = ` ${normalize(text)} `
  // Os mais longos primeiro, para "Casa Amarela" não virar "Casa Forte" por engano.
  const sorted = [...SERVED_NEIGHBORHOODS].sort((a, b) => b.length - a.length)
  return sorted.find((b) => t.includes(` ${normalize(b)} `) || t.includes(` ${normalize(b)},`) || t.includes(` ${normalize(b)}.`) || t.includes(` ${normalize(b)}?`)) ?? null
}

export { normalize }
