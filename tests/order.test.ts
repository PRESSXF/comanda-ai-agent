import { describe, expect, it } from 'vitest'
import { OrderError, addLine, confirm, emptyOrder, removeLine, setNeighborhood, subtotalCents, totalCents } from '../src/domain/order'
import { quoteDelivery } from '../src/domain/delivery'

describe('pedido', () => {
  it('soma itens iguais na mesma linha', () => {
    const o = addLine(addLine(emptyOrder(), 'baiao', 1), 'baiao', 2)
    expect(o.lines).toEqual([{ itemId: 'baiao', qty: 3 }])
  })

  it('não altera o pedido original', () => {
    const a = emptyOrder()
    addLine(a, 'baiao', 1)
    expect(a.lines).toHaveLength(0)
  })

  it('recusa item esgotado e item inexistente', () => {
    expect(() => addLine(emptyOrder(), 'moqueca', 1)).toThrowError(OrderError)
    expect(() => addLine(emptyOrder(), 'pizza', 1)).toThrowError(/não existe/)
  })

  it('recusa quantidade inválida', () => {
    expect(() => addLine(emptyOrder(), 'baiao', 0)).toThrowError(/quantidade/)
    expect(() => addLine(emptyOrder(), 'baiao', 1.5)).toThrowError(/quantidade/)
  })

  it('remove parcial e total', () => {
    const o = addLine(emptyOrder(), 'caldinho', 3)
    expect(removeLine(o, 'caldinho', 1).lines[0].qty).toBe(2)
    expect(removeLine(o, 'caldinho').lines).toHaveLength(0)
  })

  it('calcula subtotal e total em centavos', () => {
    let o = addLine(emptyOrder(), 'baiao', 2)
    o = addLine(o, 'suco-caja', 1)
    o = setNeighborhood(o, 'boa viagem')
    expect(subtotalCents(o)).toBe(9570)
    expect(totalCents(o)).toBe(10070)
  })

  it('exige bairro e pedido mínimo para confirmar', () => {
    const small = setNeighborhood(addLine(emptyOrder(), 'agua', 1), 'Pina')
    expect(() => confirm(small)).toThrowError(/mínimo/)
    expect(() => confirm(addLine(emptyOrder(), 'baiao', 1))).toThrowError(/bairro/)
    const ok = setNeighborhood(addLine(emptyOrder(), 'baiao', 1), 'Pina')
    expect(confirm(ok).status).toBe('confirmado')
  })
})

describe('entrega', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(quoteDelivery('VARZEA')?.neighborhood).toBe('Várzea')
  })
  it('devolve null fora da área', () => {
    expect(quoteDelivery('Olinda')).toBeNull()
  })
})
