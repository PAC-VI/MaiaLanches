# Segurança — Meus Pedidos (localStorage + status por token)

## Contexto

O cliente final nunca faz login — informa nome, telefone e, na entrega, o endereço na hora do pedido. Não há CPF no cadastro nem no pedido.

Reconsultar pelo telefone foi descartado: telefone não é segredo, e uma listagem pública devolveria nome e endereço de outra pessoa. Essa rota não existe. O cliente acompanha o pedido pelo token abaixo.

## Decisão: token de acesso por pedido

Cada pedido criado (`POST /api/orders`) passa a receber um **token de acesso** aleatório e único, além do `id` sequencial já existente.

- Gerado no servidor, na criação do pedido (ex.: `Str::random(40)` ou `Str::uuid()`).
- Guardado em uma nova coluna `access_token` na tabela `orders`, indexada e única.
- Devolvido ao cliente **apenas na resposta da criação do pedido** — nunca reaparece em nenhuma listagem administrativa nem em outro endpoint público.
- O front-end salva esse token (junto com o `id`) no `localStorage`, associado ao pedido.

O token substitui o telefone como "chave" de consulta: é longo, aleatório e não é adivinhável por tentativa — diferente de um número de telefone, que segue um padrão previsível.

## Endpoint de status: o que pode e não pode retornar

Endpoint público: `POST /api/order-status`.

O token vai no corpo (`{tokens: [...]}`, no máximo 20, cada um com 40 caracteres), nunca na URL — assim não entra em log de acesso. Limite: 60 por minuto por IP.

**Não recebe** nome, telefone, e-mail ou qualquer outro dado pessoal — só os tokens que já estão salvos no `localStorage`.

**Retorna o mínimo necessário** para atualizar a tela e o `localStorage`:

```json
{
  "statuses": {
    "<token>": { "status": "em_preparo", "updated_at": "2026-09-28T11:20:00Z" }
  }
}
```

Token desconhecido volta `null` nessa chave. Não retorna nome, telefone nem endereço.

## Rotina de polling no cliente

Enquanto a tela "Meus Pedidos" estiver aberta:

1. Lê do `localStorage` a lista de pedidos salvos (cada um com seu `id` + `token`). No máximo 50. Pedido `entregue` ou `cancelado` com mais de 30 dias é descartado.
2. A cada 20 segundos, faz uma única consulta com os tokens ainda abertos (até 20 por ciclo).
3. Se o status retornado for diferente do que está salvo, atualiza o `localStorage` e re-renderiza a tela.
4. Para de consultar pedidos `entregue`, `cancelado` ou com token `null` (esses ficam como "Não encontrado").
5. Se a rede cair, ou a API responder 429 ou 5xx, a tela mostra "Sem conexão, tentando de novo…" e o ciclo seguinte tenta de novo.

Tudo roda só no navegador do cliente, só enquanto a página está aberta — é um complemento simples ao que já foi decidido (sem tempo real via WebSocket por enquanto).

## O que esse modelo protege — e o que não protege

**Protege:**

- Ninguém consegue listar os pedidos de outra pessoa a partir do telefone dela.
- Um token de pedido não dá acesso a nenhum outro pedido, nem lista todos os pedidos de um cliente.

**Não protege (limites que continuam existindo, por design):**

- O "local storage" não é criptografado; quem tiver acesso físico ao computador/celular do cliente (ou uma extensão maliciosa no navegador) consegue ler o que está lá. Aceitável aqui porque só guarda dados que o próprio cliente digitou, não senhas nem dados financeiros.
- Se o cliente limpar os dados do navegador, trocar de aparelho ou usar aba anônima, perde a referência local aos pedidos (o pedido em si continua no banco, só a lista de "meus pedidos" salva localmente some).
