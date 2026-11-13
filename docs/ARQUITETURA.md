# Arquitetura e decisões

Este documento explica como o Comanda está organizado e por que cada escolha foi feita.

## Camadas

```
interface (React)          components/, hooks/useAgent.ts
        │
agente                     agent/loop.ts, agent/tools.ts, agent/prompt.ts
        │                         │
provedores                 agent/providers/anthropic.ts, demo.ts
        │
domínio (sem IA)           domain/menu.ts, order.ts, delivery.ts
```

Cada camada só conhece a de baixo. O domínio não sabe que existe IA; o agente não sabe que existe React.

## Decisões

### 1. Regra de negócio fica fora do modelo

**Problema.** Modelos de linguagem erram conta, inventam itens e esquecem regras no meio de conversas longas.

**Decisão.** Tudo que tem resposta certa (preço, total, taxa, prazo, disponibilidade, pedido mínimo, alérgenos) é calculado em funções puras no `domain/`. O modelo só acessa essas regras pelas ferramentas.

**Consequência.** O total que o cliente vê é sempre o total do sistema. Os testes do domínio cobrem os casos de borda (quantidade fracionada, item esgotado, bairro com e sem acento) sem chamar modelo nenhum.

### 2. Valores em centavos

Preços são inteiros em centavos e formatados com `Intl.NumberFormat` só na hora de mostrar. Isso evita `0.1 + 0.2` em dinheiro.

### 3. Restrições alimentares são estado, não instrução

**Problema.** Dizer no prompt "não recomende itens com o alérgeno do cliente" funciona na maior parte das vezes. Para alergia, "na maior parte das vezes" não basta.

**Decisão.** Quando o agente chama `buscar_cardapio` com `sem_alergeno`, a restrição é gravada no estado da conversa. A partir daí, `adicionar_item` recusa qualquer item com aquele alérgeno e devolve um erro explicando o motivo.

**Consequência.** Mesmo que o modelo erre, o item não entra no pedido. A comanda mostra a restrição em destaque para a cozinha.

### 4. Erro de ferramenta é resultado, não exceção

Ferramentas devolvem `{ erro, codigo }` com `isError: true` em vez de lançar exceção. O loop repassa isso ao modelo, que explica ao cliente e sugere alternativas. Só erros de programação viram exceção.

### 5. Confirmação em duas etapas

`confirmar_pedido` só deve ser chamada depois de o cliente ver o resumo com o total. O prompt pede isso, e o cenário de avaliação "Não confirma sem mostrar o total" verifica.

### 6. Transferência para humano com contexto

`transferir_para_humano` exige um motivo de uma lista fechada (reclamação, reembolso, cancelamento, pedido do cliente, fora do escopo) e um resumo. A fila certa reduz o tempo de resposta, e o resumo evita que o cliente repita a história.

### 7. Provedor trocável

O loop depende da interface `Provider`:

```ts
interface Provider {
  complete(req: { system; messages; tools }): Promise<{ text?; toolCalls; usage }>
}
```

O histórico interno (`AgentMessage`) é neutro. `toAnthropicMessages` converte para o formato da API, inclusive agrupando resultados de várias ferramentas do mesmo passo numa só mensagem, como a API exige. Adicionar outro provedor é escrever outra função dessas.

### 8. Modo demonstração honesto

A demo pública não pode depender de uma chave paga nem expor uma. O provedor de demonstração segue exatamente o mesmo protocolo de um modelo real, mas decide por regras de leitura de intenção em português. Ele existe para:

- a demo funcionar para qualquer visitante, de graça;
- os testes do loop, das ferramentas e das avaliações serem determinísticos no CI.

A interface mostra "Modo demonstração" no topo o tempo todo, e os tokens aparecem com `~` porque são estimados.

### 9. Avaliações medem resultado

Cada verificação olha para o estado final (itens, status, taxa, transferência) ou para fatos verificáveis na resposta (o total certo, a menção ao mínimo). Nenhuma compara texto exato, porque um modelo real responde de jeitos diferentes. Cada verificação tem um campo `why` que explica o impacto no restaurante.

### 10. Chave da API só no navegador

Com o modelo real, a chamada vai do navegador direto para a API da Anthropic, com o cabeçalho que autoriza acesso direto. A chave fica em `sessionStorage` e some ao fechar a aba. Para produção, o caminho certo é um back-end que guarda a chave; aqui a escolha foi não ter servidor para a demo continuar estática e gratuita.

## Limites conhecidos

- O modo demonstração entende um conjunto limitado de frases. Fora dele, responde que não entendeu.
- Não há persistência: recarregar a página começa uma conversa nova.
- O status de pedidos anteriores usa três pedidos fixos de exemplo.
