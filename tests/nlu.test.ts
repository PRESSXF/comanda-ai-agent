import { describe, expect, it } from 'vitest'
import { detectIntents, findAllergen, findItemMentions, findOrderCode } from '../src/agent/providers/nlu'
import { findNeighborhoodIn } from '../src/domain/delivery'

describe('leitura de intenções do modo demonstração', () => {
  it('lê quantidades por número e por extenso', () => {
    const m = findItemMentions('quero 2 baião de dois e duas cartolas, e um suco de cajá')
    expect(m.map((x) => [x.item.id, x.qty])).toEqual([['baiao', 2], ['suco-caja', 1]])
  })
  it('prefere o nome mais longo', () => {
    expect(findItemMentions('um bolo de rolo')[0].item.id).toBe('bolo-rolo')
  })
  it('acha código de pedido em formatos diferentes', () => {
    expect(findOrderCode('meu pedido mre 2041')).toBe('MRE-2041')
  })
  it('acha alérgeno só quando há restrição', () => {
    expect(findAllergen('tenho alergia a amendoim')).toBe('amendoim')
    expect(findAllergen('gosto de amendoim')).toBeNull()
  })
  it('separa Casa Amarela de Casa Forte', () => {
    expect(findNeighborhoodIn('moro em Casa Amarela')).toBe('Casa Amarela')
  })
  it('manda reclamação para humano', () => {
    expect(detectIntents('isso é um absurdo')).toContain('humano')
  })
})
