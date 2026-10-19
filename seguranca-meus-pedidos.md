# Segurança — Meus Pedidos (localStorage + status por token)

## Contexto e problema atual

O cliente final nunca faz login — só informa nome, telefone, CPF opcional e endereço na hora do pedido. Hoje, a única forma de reconsultar um pedido depois é `GET /api/my-orders?customer_phone=X`, que devolve **todos** os pedidos daquele telefone.

Isso é uma fragilidade: telefone não é segredo. Qualquer pessoa que souber (ou tentar) um número alheio consegue ver nome, endereço e CPF parcial de outro cliente, sem precisar de senha nem token — o telefone funciona como uma "credencial" fraca.

## Decisão: token de acesso por pedido

Cada pedido criado (`POST /api/orders`) passa a receber um **token de acesso** aleatório e único, além do `id` sequencial já existente.

- Gerado no servidor, na criação do pedido (ex.: `Str::random(40)` ou `Str::uuid()`).
- Guardado em uma nova coluna `access_token` na tabela `orders`, indexada e única.
- Devolvido ao cliente **apenas na resposta da criação do pedido** — nunca reaparece em nenhuma listagem administrativa nem em outro endpoint público.
- O front-end salva esse token (junto com o `id`) no `localStorage`, associado ao pedido.

O token substitui o telefone como "chave" de consulta: é longo, aleatório e não é adivinhável por tentativa — diferente de um número de telefone, que segue um padrão previsível.

## Endpoint de status: o que pode e não pode retornar

Novo endpoint público, ex.: `GET /api/orders/{token}/status`.

**Não recebe** nome, telefone, CPF, e-mail ou qualquer outro dado pessoal — só o token que já está salvo no `localStorage`.

**Retorna o mínimo necessário** para atualizar a tela e o `localStorage`:

```json
{
  "status": "em_preparo",
  "updated_at": "2026-09-28T11:20:00Z"
}
```

Não retorna nome, telefone, endereço nem CPF — mesmo que o token vaze de alguma forma (print de tela, link compartilhado sem querer), o dado exposto é só o status do pedido, nunca dados pessoais do cliente.

## Rotina de polling no cliente

Enquanto a tela "Meus Pedidos" estiver aberta:

1. Lê do `localStorage` a lista de pedidos salvos (cada um com seu `id` + `token`).
2. A cada 15–30 segundos, consulta o status de cada pedido salvo (pelo token).
3. Se o status retornado for diferente do que está salvo, atualiza o `localStorage` e re-renderiza a tela.
4. Para de consultar pedidos com status `entregue` (não faz sentido continuar perguntando por um pedido já finalizado).

Tudo roda só no navegador do cliente, só enquanto a página está aberta — é um complemento simples ao que já foi decidido (sem tempo real via WebSocket por enquanto).

## O que esse modelo protege — e o que não protege

**Protege:**

- Ninguém consegue listar os pedidos de outra pessoa a partir do telefone dela.
- Um token de pedido não dá acesso a nenhum outro pedido, nem lista todos os pedidos de um cliente.

**Não protege (limites que continuam existindo, por design):**

- O "local storage" não é criptografado; quem tiver acesso físico ao computador/celular do cliente (ou uma extensão maliciosa no navegador) consegue ler o que está lá. Aceitável aqui porque só guarda dados que o próprio cliente digitou, não senhas nem dados financeiros.
- Se o cliente limpar os dados do navegador, trocar de aparelho ou usar aba anônima, perde a referência local aos pedidos (o pedido em si continua no banco, só a lista de "meus pedidos" salva localmente some).
