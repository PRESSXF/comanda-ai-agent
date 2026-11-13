import { describe, expect, it } from 'vitest'
import { toAnthropicMessages } from '../src/agent/providers/anthropic'

describe('conversão para a API da Anthropic', () => {
  it('agrupa resultados de ferramentas do mesmo passo', () => {
    const out = toAnthropicMessages([
      { role: 'user', content: 'oi' },
      { role: 'assistant', toolCalls: [{ id: 'a', name: 'ver_pedido', input: {} }, { id: 'b', name: 'buscar_cardapio', input: {} }] },
      { role: 'tool', toolCallId: 'a', name: 'ver_pedido', result: { ok: 1 } },
      { role: 'tool', toolCallId: 'b', name: 'buscar_cardapio', result: { ok: 2 }, isError: true },
    ])
    expect(out).toHaveLength(3)
    expect(out[2].content).toHaveLength(2)
    expect(out[2].content[1]).toMatchObject({ type: 'tool_result', tool_use_id: 'b', is_error: true })
  })
})
