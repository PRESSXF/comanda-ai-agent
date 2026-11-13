const STEPS = [
  {
    title: 'O cliente escreve',
    body: 'Mensagem livre, como no WhatsApp: "quero 2 baião e um suco, entrega em Boa Viagem".',
  },
  {
    title: 'O modelo decide o próximo passo',
    body: 'Recebe o histórico, as regras do restaurante e a lista de ferramentas. Responde com texto ou pede ferramentas.',
  },
  {
    title: 'As ferramentas consultam o sistema',
    body: 'Cardápio, pedido, entrega e status vivem em código comum e testado. O modelo nunca calcula preço nem inventa prato.',
  },
  {
    title: 'O resultado volta para o modelo',
    body: 'Inclusive os erros ("acabou", "fora da área"), para ele explicar ao cliente e sugerir alternativas. Até 6 passos por mensagem.',
  },
]

const DECISIONS = [
  ['Regra de negócio fora do modelo', 'Preço, taxa, pedido mínimo e alérgenos são verificados no código. O modelo conversa; o sistema garante.'],
  ['Alergia vale até o fim', 'Quando o cliente informa uma restrição, a ferramenta de adicionar recusa itens com aquele alérgeno, mesmo que o modelo erre.'],
  ['Confirmação em duas etapas', 'O pedido só vai para a cozinha depois que o cliente vê o resumo com o total.'],
  ['Humano na hora certa', 'Reclamação, reembolso e cancelamento vão para a equipe com um resumo pronto, sem o cliente repetir nada.'],
  ['Avaliações como teste', 'Cada cenário verifica resultado de negócio, não texto exato. Os mesmos cenários rodam no navegador e no CI.'],
  ['Provedor trocável', 'O loop fala com uma interface Provider. O modo demonstração e o Claude implementam a mesma interface.'],
]

export function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="font-display text-2xl font-semibold tracking-tight">Como funciona</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Um agente com ferramentas: o modelo de linguagem conduz a conversa e o sistema do restaurante faz o que precisa estar certo.
      </p>

      <ol className="mt-6 grid gap-2 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative rounded-xl border border-line bg-panel p-4">
            <span className="font-mono text-xs text-tide">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-2 text-sm font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-ink p-4">
        <pre className="min-w-[40rem] font-mono text-[0.78rem] leading-relaxed text-muted">{`  cliente ──► runTurn() ──► Provider.complete()  ──►  texto  ──► cliente
                 ▲                │
                 │                ▼ pede ferramentas
                 │          executeTool()
                 │                │
                 └── resultado ◄──┤  buscar_cardapio · adicionar_item · remover_item
                                  │  ver_pedido · calcular_entrega · confirmar_pedido
                                  │  consultar_status · transferir_para_humano
                                  ▼
                       domain/  menu.ts · order.ts · delivery.ts   (funções puras, testadas)`}</pre>
      </div>

      <h3 className="mt-8 font-display text-lg font-semibold">Decisões de projeto</h3>
      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        {DECISIONS.map(([t, d]) => (
          <div key={t} className="rounded-xl border border-line bg-panel p-4">
            <dt className="text-sm font-semibold">{t}</dt>
            <dd className="mt-1 text-sm text-muted">{d}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
