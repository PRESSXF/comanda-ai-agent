/** Resume o resultado de uma ferramenta em uma linha, para o painel de raciocínio. */
export function summarize(name: string, result: unknown, isError: boolean): string {
  // Resultados de ferramentas são JSON livre, como chegam da API; a forma de cada um está em tools.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as Record<string, any>
  if (isError) return r?.erro ?? 'Erro'
  switch (name) {
    case 'buscar_cardapio':
      return `${r.total} itens${r.filtro_alergeno ? ` sem ${r.filtro_alergeno}` : ''}`
    case 'adicionar_item':
    case 'remover_item':
    case 'ver_pedido':
      return `${r.pedido.itens.length} ${r.pedido.itens.length === 1 ? 'item' : 'itens'} · subtotal ${r.pedido.subtotal}`
    case 'calcular_entrega':
      return `${r.pedido.taxa_entrega} · ${r.pedido.prazo}`
    case 'confirmar_pedido':
      return `${r.pedido.codigo} enviado para a cozinha · ${r.pedido.total}`
    case 'consultar_status':
      return `${r.codigo}: ${r.status}`
    case 'transferir_para_humano':
      return `Fila ${r.fila} · ${r.tempo_estimado}`
    default:
      return 'ok'
  }
}
