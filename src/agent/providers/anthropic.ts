import type { AgentMessage, CompletionRequest, CompletionResult, Provider } from '../types'

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

/** Converte o histórico interno para o formato da API de Mensagens da Anthropic. */
export function toAnthropicMessages(messages: AgentMessage[]) {
  const out: Array<{ role: 'user' | 'assistant'; content: Block[] }> = []
  for (const m of messages) {
    if (m.role === 'user') out.push({ role: 'user', content: [{ type: 'text', text: m.content }] })
    else if (m.role === 'assistant') {
      const content: Block[] = []
      if (m.text) content.push({ type: 'text', text: m.text })
      for (const c of m.toolCalls ?? []) content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.input })
      if (content.length) out.push({ role: 'assistant', content })
    } else {
      const block: Block = { type: 'tool_result', tool_use_id: m.toolCallId, content: JSON.stringify(m.result), ...(m.isError ? { is_error: true } : {}) }
      const last = out[out.length - 1]
      // Resultados de várias ferramentas do mesmo passo vão juntos numa única mensagem de usuário.
      if (last?.role === 'user' && last.content.every((b) => b.type === 'tool_result')) last.content.push(block)
      else out.push({ role: 'user', content: [block] })
    }
  }
  return out
}

export function createAnthropicProvider(apiKey: string, model: string): Provider {
  return {
    id: 'anthropic',
    label: 'Anthropic',
    model,
    async complete(req: CompletionRequest, signal?: AbortSignal): Promise<CompletionResult> {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          // A chave fica só no navegador de quem testa; não existe servidor intermediário.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          system: req.system,
          tools: req.tools,
          messages: toAnthropicMessages(req.messages),
        }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`A API respondeu ${res.status}: ${body.slice(0, 240)}`)
      }
      const data = (await res.json()) as { content: Block[]; usage: { input_tokens: number; output_tokens: number } }
      const text = data.content.filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('\n')
      const toolCalls = data.content
        .filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use')
        .map((b) => ({ id: b.id, name: b.name, input: b.input }))
      return { text: text || undefined, toolCalls, usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, estimated: false } }
    },
  }
}
