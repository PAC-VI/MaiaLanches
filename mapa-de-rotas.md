# Mapa de Rotas — Maia Lanches

Estado atual do repositório. O frontend (React/Inertia) e a API saem do mesmo Laravel. A fonte das rotas é `routes/web.php` e `routes/api.php`.

Prefixo da API: `/api`. Rotas de admin usam o grupo `web` (cookie de sessão + header `X-XSRF-TOKEN`). Resources de coleção e de item vêm em `{ data: ... }`, salvo onde a tabela diz o contrário.

## 1. Portas

| Porta | Serviço | O que é |
|---|---|---|
| **8000** | `app` (Laravel, PHP 8.4) | Páginas Inertia (`/`, `/admin/...`) e API (`/api/...`) |
| **5173** | `vite` | Assets JS/CSS em desenvolvimento. Não tem rotas de página |
| **8080** | `phpmyadmin` | Administração do MySQL |
| **3306** | `mysql` | Banco de dados |

## 2. Páginas

| Método | Rota | Componente | Quem acessa |
|---|---|---|---|
| GET | `/` | `Home/Home` | Pública |
| GET | `/meus-pedidos` | `MeusPedidos/MeusPedidos` | Pública. A lista vem do `localStorage` deste navegador (id, token, status, itens — sem nome, telefone ou endereço) |
| GET | `/admin/login` | `Admin/Login/Login` | Pública |
| GET | `/admin` | — | Autenticada. Redireciona para `/admin/pedidos` |
| GET | `/admin/pedidos` | `Admin/Pedidos/Pedidos` | Autenticada |
| GET | `/admin/produtos` | `Admin/Produtos/Produtos` | Autenticada |
| GET | `/admin/centraldepagamentos` | `Admin/CentralDePagamentos/CentralDePagamentos` | Autenticada |
| GET | `/admin/taxasdeentrega` | `Admin/TaxasDeEntrega/TaxasDeEntrega` | Autenticada |
| GET | `/admin/motoboys` | `Admin/Motoboys/Motoboys` | Autenticada |
| GET | `/admin/relatorios` | `Admin/Relatorios/Relatorios` | Autenticada |
| GET | `/admin/horarios` | `Admin/Horarios/Horarios` | Autenticada |
| GET | `/admin/impressao` | `Admin/Impressao/Impressao` | Autenticada |
| GET | `/up` | — | Health check do Laravel |

Sem sessão, o middleware `auth` manda qualquer rota `/admin` (exceto o login) para `/admin/login`.

## 3. Navegação

| De | Ação | Para | Como |
|---|---|---|---|
| `Home` | "Pedidos" | `/meus-pedidos` | `<Link>` do Inertia |
| `Home` (carrinho) | Pedido confirmado, "ver pedidos" | `/meus-pedidos` | `router.visit('/meus-pedidos')` |
| `MeusPedidos` | "Voltar ao cardápio" | `/` | `<Link>` |
| `Admin/Login` | Login com sucesso | `/admin/pedidos` | `router.visit('/admin/pedidos')` |
| `Admin/Login` | "Ver cardápio do cliente" | `/` | `<Link>` |
| Qualquer página admin (`AdminLayout` / sidebar) | Item do menu | a rota do item | `<Link>` do Inertia |
| Sidebar | "Ver cardápio do cliente" | `/` | `<Link>` |
| Sidebar | "Sair do painel" | `/admin/login` | `POST /api/admin/logout` e depois `router.visit('/admin/login')` |
| `/admin` autenticado | Acesso direto | `/admin/pedidos` | `redirect` em `routes/web.php` |
| Rota admin sem sessão | Middleware `auth` | `/admin/login` | Redirect do Laravel |
| Qualquer chamada `apiFetch` com 401 fora do login | Sessão inválida | `/admin/login` | `router.visit('/admin/login')` |

## 4. API

Todas as rotas abaixo estão em `routes/api.php` e passam pelo grupo `api`. `throttle:api` limita cada IP a **120 requisições por minuto**. A coluna Throttle mostra o limite extra da rota, quando existe. Passou do limite: `429`, JSON `{message: "Muitas tentativas. Aguarde um minuto e tente de novo."}` e cabeçalho `Retry-After`.

Páginas e API também enviam `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

### Autenticação

| Método | Rota | Auth | Throttle | Payload / retorno |
|---|---|---|---|---|
| POST | `/api/admin/login` | Pública | `admin-login`: 5/min por e-mail + IP e 20/min por IP | `{email, password, remember?}` → `{user: {id, name, email}}`. `remember: true` grava o cookie de manter conectado; sem isso a sessão segue `SESSION_LIFETIME`. E-mail até 254; senha até 128, sem mínimo |
| POST | `/api/admin/logout` | Sessão | — | Sem corpo. `204` |
| GET | `/api/admin/me` | Sessão | — | `{user: {id, name, email}}` |

### Públicas

| Método | Rota | Auth | Throttle | Payload / retorno |
|---|---|---|---|---|
| GET | `/api/store-settings` | Pública | — | Sem `{data}`: `{is_open, delivery_time_minutes, pickup_time_minutes, name, description, address, contact}`. Nome, descrição, endereço e contato vêm de `config/store.php` |
| GET | `/api/store-hours` | Pública | — | Sem `{data}`: `{today, days: [{id, weekday, is_open_day, opens_at, closes_at}]}`. `today` é o dia da semana no fuso da loja (0 = domingo). Horas em `HH:MM` |
| GET | `/api/payment-methods` | Pública | — | Sem `{data}`: `[{code, label}]`, só as ativas, na ordem da loja |
| GET | `/api/categories` | Pública | — | `{data: [{id, name, can_delete}]}` |
| GET | `/api/categories/{id}` | Pública | — | `{data: {id, name, can_delete}}`. Nenhuma tela chama |
| GET | `/api/add-ons` | Pública | — | `{data: [{id, name, price, is_active, can_delete}]}`. Filtro opcional `?only_active=1` (só ativos). A Home usa esse filtro; o admin lista todos |
| GET | `/api/add-ons/{id}` | Pública | — | `{data: {id, name, price, is_active, can_delete}}`. Nenhuma tela chama |
| GET | `/api/delivery-zones` | Pública | — | Sem `{data}`: `[{id, radius_km, fee_amount, motoboy_payout_amount, ...}]`, ordenado por raio |
| GET | `/api/delivery-zones/{id}` | Pública | — | A faixa. Nenhuma tela chama |
| GET | `/api/products` | Pública | — | `{data: [{id, category_id, category, name, description, is_active, can_delete, sizes: [{id, size_name, price, is_active, can_delete}]}]}`. Filtros opcionais `?category_id=` (inteiro que existe) e `?only_active=1` (booleano). Com `only_active=1`, só entram produtos ativos com ao menos um tamanho ativo, e cada produto só traz esses tamanhos. Valor inválido: 422 |
| GET | `/api/products/{id}` | Pública | — | Um produto no mesmo formato. Id inexistente ou não numérico: 404 "Registro não encontrado." Nenhuma tela chama |
| POST | `/api/orders` | Pública | `public-orders`: 5/min e 30/h por IP; 8/h por telefone (dígitos de `customer_phone`, se vier) | Cabeçalho `Idempotency-Key` (uuid) obrigatório. Ver corpo abaixo. `201` com o pedido no topo (sem `{data}`) e `access_token`. A mesma chave no mesmo IP, por 10 minutos, devolve esse mesmo pedido. Taxa, repasse e total saem do servidor |
| POST | `/api/order-status` | Pública | `order-status`: 60/min por IP, além das 120/min do grupo | `{tokens: [string de 40]}` (1 a 20). `{statuses: {"<token>": {status, updated_at} \| null}}`. Token desconhecido é `null`. O token não vai na URL |

Corpo de `POST /api/orders`:

`{customer_name, customer_phone, type: delivery|pickup, payment_method, change_for?, delivery_street?, delivery_number?, delivery_neighborhood?, delivery_reference?, delivery_zone_id?, items: [{product_size_id, quantity, observation?, add_on_ids?}]}`

Na entrega, a rua (3 a 80), o número e o bairro (2 a 60) são obrigatórios, junto com `delivery_zone_id`. O número é `123`, `123A` ou `S/N` (o servidor grava em maiúsculas). A referência é opcional, até 80. Texto livre passa pela regra SafeText. A cidade é a da loja e não é pedida. `payment_method` precisa ser o `code` de uma forma ativa. `change_for` só com `dinheiro`, até 9999,99 e no mínimo o total calculado. De 1 a 30 itens; quantidade de 1 a 50; até 10 acréscimos distintos por item. Nome: 2 a 80, com pelo menos 2 letras. Telefone: DDD 11–99, fixo de 10 dígitos ou celular de 11 começando com 9. O cliente não envia `delivery_fee` nem `total_amount`. O servidor soma em centavos.

### Autenticadas (sessão)

| Método | Rota | Throttle | Payload / retorno |
|---|---|---|---|
| PUT | `/api/store-settings` | — | `{is_open?, delivery_time_minutes?, pickup_time_minutes?}`. Minutos: inteiro de 0 a 600. → o mesmo objeto do GET |
| GET | `/api/admin/payment-methods` | — | `{data: [{id, code, label, is_active, sort_order}]}` |
| PATCH | `/api/admin/payment-methods/{id}` | — | `{label?}` (até 40) e/ou `{is_active?}`. Recusa desligar a última forma ativa. Devolve o item |
| GET | `/api/admin/store-hours` | — | `{days: [...]}` no mesmo formato do GET público, sem `today` |
| PUT | `/api/admin/store-hours` | — | `{days: [{weekday, is_open_day, opens_at, closes_at}]}` com os 7 dias (0–6), cada um uma vez. Dia aberto exige abertura e fechamento diferentes, em `HH:MM`. Devolve `{days}` |
| GET | `/api/admin/reports` | — | `?from=&to=` opcionais (`YYYY-MM-DD`, dias da loja, inclusivos). Sem os dois, últimos 30 dias. Máximo 92. Ver o bloco Relatórios abaixo. Sem nome, telefone, endereço ou repasse |
| GET | `/api/admin/motoboys` | — | `{data: [{id, name, phone, is_active, status_label}]}`. Não lista soft-deleted |
| POST | `/api/admin/motoboys` | — | `{name, phone, is_active}` → `201` com o motoboy. Nome até 80. Telefone com DDD 11–99: fixo de 10 dígitos ou celular de 11 começando com 9 |
| PUT | `/api/admin/motoboys/{id}` | — | O mesmo corpo. Devolve o motoboy |
| DELETE | `/api/admin/motoboys/{id}` | — | Soft delete. `204` |
| GET | `/api/admin/motoboys/{id}/summary` | — | `?date=YYYY-MM-DD` opcional (dia da loja; padrão = hoje). `{date, deliveries_count, payout_total, average_per_delivery, orders: [{id, customer_name, address_summary, delivery_fee, status}]}` |
| POST | `/api/categories` | — | `{name}` até 60 → `201` |
| PUT | `/api/categories/{id}` | — | `{name}` |
| PATCH | `/api/categories/{id}/availability` | — | `{is_active}` liga ou desliga todos os produtos da categoria |
| DELETE | `/api/categories/{id}` | — | `204` se a categoria nunca teve venda. `422` se teve |
| POST | `/api/add-ons` | — | `{name, price}` → `201`. Nome até 60. Preço de 0 a 9999,99, no máximo 2 casas |
| PUT | `/api/add-ons/{id}` | — | `{name, price}` |
| PATCH | `/api/add-ons/{id}/availability` | — | `{is_active}`. Pausa ou reativa o acréscimo |
| DELETE | `/api/add-ons/{id}` | — | `204` se `can_delete`. `422` se já teve venda: inativar |
| POST | `/api/delivery-zones` | — | `{radius_km, fee_amount, motoboy_payout_amount}` → `201`, sem `{data}`. Raio repetido: 422 "Já existe uma faixa com esse raio" |
| PUT | `/api/delivery-zones/{id}` | — | O mesmo corpo. Raio de outra faixa: o mesmo 422 |
| DELETE | `/api/delivery-zones/{id}` | — | `204` |
| POST | `/api/products` | — | `{category_id, name, description?, is_active?, sizes: [{size_name, price}]}` (1 a 10 tamanhos, nome único no produto) → `201`. Nome até 80, descrição até 500, tamanho até 40, preço até 9999,99 |
| PUT | `/api/products/{id}` | — | O mesmo corpo, e cada tamanho pode trazer `is_active`. Tamanho com `id` atualiza; sem `id` cria; ausente é removido. Tamanho que já vendeu não sai: `422`. A loja desativa pelo `is_active` |
| DELETE | `/api/products/{id}` | — | `204` se nunca teve venda. `422` se teve: inativar |
| PATCH | `/api/products/{id}/availability` | — | `{is_active}` |
| GET | `/api/orders` | — | Filtros abaixo. `{data: [pedido]}` |
| GET | `/api/orders/{id}` | — | Um pedido. Nenhuma tela chama |
| PATCH | `/api/orders/{id}/status` | — | `{status}`. Avanço manual: `em_preparo` → `pronto` → `entregue`. `novo` → `em_preparo` responde 422 ("O pedido novo passa sozinho para em preparo. Essa etapa não é manual."). Esse passo é do comando `orders:auto-accept` (a cada minuto, pedido `novo` com `created_at` há pelo menos `ORDER_AUTO_ACCEPT_MINUTES`, padrão 3), com lock na linha. Cancelamento (`cancelado`) só a partir de `novo`, `em_preparo` ou `pronto`. `entregue` e `cancelado` não mudam. A regra é relida com lock: dois PATCH simultâneos, só o primeiro passa |
| PATCH | `/api/orders/{id}/motoboy` | — | `{motoboy_id: id ou null}`. Só entrega ainda aberta, e o motoboy precisa estar ativo. A regra é relida com lock na linha |
| PATCH | `/api/orders/{id}/printed` | — | Sem corpo. Marca `is_printed`, com lock na linha |

Filtros de `GET /api/orders` (todos opcionais):

- `status` — `novo`, `em_preparo`, `pronto`, `entregue` ou `cancelado`. Outro valor: 422
- `type` — `delivery` ou `pickup`. Outro valor: 422
- `from` e `to` — `YYYY-MM-DD`, dias da loja, inclusivos. Sem os dois, vale hoje. Intervalo máximo de 92 dias. Data inválida: 422
- `include_open=1` — também traz `novo`, `em_preparo` e `pronto` criados antes de `from`

Pedido (admin): `{id, number, customer_name, customer_phone, type, status, cancelled_at, payment_method, change_for, delivery_street, delivery_number, delivery_neighborhood, delivery_reference, delivery_address, delivery_zone_id, delivery_fee, total_amount, is_printed, motoboy_id, motoboy_name, motoboy_payout, delivered_at, auto_accept_at, items, created_at, updated_at}`. `auto_accept_at` só vem com o admin logado e só enquanto `status` é `novo`: é `created_at` mais `ORDER_AUTO_ACCEPT_MINUTES`. `delivery_address` é montado (`Rua X, 123 - Bairro (Ref: ...)`) para Pedidos, impressão e o resumo do motoboy. Não é coluna.

`number` é o próprio `id` e não reinicia. Item: `{id, product_size_id, product_name, size_name, quantity, unit_price, total_price, observation, add_ons: [{id, add_on_id, name, price}]}`.

`GET /api/admin/reports` devolve só agregados, calculados em SQL. Datas inválidas, `from` maior que `to` ou intervalo acima de 92 dias: 422, com as mesmas mensagens do filtro de pedidos. O padrão (sem `from`/`to`) são os 30 dias da loja que terminam hoje.

```json
{
  "period": {
    "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 30,
    "revenue": 0, "orders_count": 0, "average_ticket": null,
    "delivery_fees": 0, "delivery_count": 0, "pickup_count": 0,
    "open_count": 0, "cancelled_count": 0,
    "by_status": {"novo": 0, "em_preparo": 0, "pronto": 0, "entregue": 0},
    "by_payment_method": {"pix": 0, "cartao_credito": 0, "cartao_debito": 0, "dinheiro": 0},
    "series": [{"date": "YYYY-MM-DD", "revenue": 0, "orders_count": 0}]
  },
  "previous_period": {
    "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 30,
    "revenue": 0, "orders_count": 0, "average_ticket": null,
    "delivery_fees": 0, "delivery_count": 0, "pickup_count": 0
  },
  "windows": {
    "today": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 1, "revenue": 0, "orders_count": 0},
    "previous_today": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 1, "revenue": 0, "orders_count": 0},
    "days_7": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 7, "revenue": 0, "orders_count": 0},
    "previous_days_7": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 7, "revenue": 0, "orders_count": 0},
    "days_30": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 30, "revenue": 0, "orders_count": 0},
    "previous_days_30": {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "days": 30, "revenue": 0, "orders_count": 0}
  }
}
```

Valores em reais. `average_ticket` é `null` sem venda. `series` traz cada dia do período, com zero quando não houve venda. `open_count` são pedidos do período em `novo`, `em_preparo` ou `pronto`. Cancelados ficam só em `cancelled_count`: não entram no faturamento, no ticket, nas taxas, na série nem em `orders_count`. As janelas `today`, `days_7` e `days_30` (e as anteriores, do mesmo tamanho) são sempre relativas a hoje, para a variação percentual. O período anterior de `previous_period` tem o mesmo número de dias de `period` e termina na véspera de `from`.

Na resposta pública de criação e no `GET` sem sessão, `motoboy_id`, `motoboy_name`, `motoboy_payout` e `delivered_at` não vêm.

## 5. Chamadas por página

O `AdminLayout` (sidebar + cabeçalho) envolve todas as páginas admin autenticadas.

| Origem | Chamada | Quando |
|---|---|---|
| `AdminLayout` | `POST /api/admin/logout` | "Sair do painel" |
| `AdminHeader` | `GET /api/admin/me` e `GET /api/store-settings` | Ao montar |
| `AdminHeader` | `PUT /api/store-settings` | Abrir/fechar a loja, ou ao sair do campo de minutos |

| Página | Chamada | Quando |
|---|---|---|
| `Home` | `GET /api/categories`, `GET /api/products?only_active=1`, `GET /api/add-ons?only_active=1`, `GET /api/delivery-zones`, `GET /api/store-settings` | Ao montar, em paralelo, e de novo (em silêncio) ao abrir o carrinho. `GET /api/store-settings` também a cada 60s. Se um tamanho ou acréscimo do carrinho sumiu dessa lista, o item sai do carrinho e a tela avisa |
| `OpeningHoursModal` | `GET /api/store-hours` | Ao abrir o modal de horários |
| `PaymentMethodsModal` | `GET /api/payment-methods` | Ao abrir o modal de pagamentos |
| `InfoModal` | — | Usa o `store-settings` que a Home já carregou (tempos, descrição, endereço, contato) |
| `CartModal` | `GET /api/payment-methods` | Ao entrar no checkout |
| `CartModal` | `POST /api/orders` | Confirmar o pedido |
| `MeusPedidos` | `GET /api/store-settings` | Ao montar, para o nome e o endereço do cabeçalho |
| `MeusPedidos` | `POST /api/order-status` | Na entrada e a cada 20s, uma chamada com os tokens ainda abertos (até 20). Token `null` fica "Não encontrado" e sai da fila. Rede, 429 ou 5xx mostram "Sem conexão, tentando de novo…" e o ciclo seguinte tenta de novo |
| `Admin/Login` | `POST /api/admin/login` | Enviar o formulário |
| `Admin/Pedidos` | `GET /api/admin/motoboys` | Junto da listagem de pedidos |
| `Admin/Pedidos` | `GET /api/orders?from=&to=` e `include_open=1` quando o intervalo inclui hoje | Ao montar, ao mudar o período e a cada 15s |
| `Admin/Pedidos` | `PATCH /api/orders/{id}/status` | Avançar (`em_preparo` → `pronto` → `entregue`) ou cancelar. Pedido `novo` não tem botão de avançar: a tela mostra "Aceite automático em mm:ss" a partir de `auto_accept_at` e o próximo polling (15s) traz `em_preparo` |
| `Admin/Pedidos` | `PATCH /api/orders/{id}/motoboy` | Atribuir, trocar ou tirar o motoboy |
| `Admin/Produtos` | `GET /api/categories` e `GET /api/products` | Ao montar e depois de salvar |
| `Admin/Produtos` | `PATCH /api/products/{id}/availability` | Pausar ou ativar um produto |
| `Admin/Produtos` | `PATCH /api/categories/{id}/availability` | Pausar ou ativar a categoria inteira |
| `Admin/Produtos` | `DELETE /api/products/{id}` e `DELETE /api/categories/{id}` | Excluir só quando `can_delete` é verdadeiro |
| `ProductFormModal` | `POST /api/products` ou `PUT /api/products/{id}` | Criar ou editar |
| `CategoryFormModal` | `POST /api/categories` ou `PUT /api/categories/{id}` | Criar ou renomear |
| `AddOnsSection` | `GET /api/add-ons`, `POST` / `PUT /api/add-ons`, `PATCH /api/add-ons/{id}/availability`, `DELETE /api/add-ons/{id}` | Listar, salvar, pausar e excluir acréscimo sem venda (`can_delete`) |
| `Admin/CentralDePagamentos` | `GET /api/admin/payment-methods` | Ao montar |
| `Admin/CentralDePagamentos` | `PATCH /api/admin/payment-methods/{id}` | Ativar/desativar ou renomear |
| `Admin/TaxasDeEntrega` | `GET /api/delivery-zones` | Ao montar e depois de salvar ou excluir |
| `Admin/TaxasDeEntrega` | `POST` ou `PUT /api/delivery-zones` | Criar ou editar faixa (taxa e repasse) |
| `Admin/TaxasDeEntrega` | `DELETE /api/delivery-zones/{id}` | Excluir faixa |
| `Admin/Motoboys` | `GET /api/admin/motoboys` | Ao montar e a cada 15s |
| `Admin/Motoboys` | `GET /api/admin/motoboys/{id}/summary` | Ao selecionar um motoboy (dia de hoje) |
| `MotoboyFormModal` | `POST` ou `PUT /api/admin/motoboys` | Criar ou editar |
| `Admin/Motoboys` | `DELETE /api/admin/motoboys/{id}` | Soft delete |
| `Admin/Horarios` | `GET` e `PUT /api/admin/store-hours` | Ao montar e ao salvar |
| `Admin/Relatorios` | `GET /api/admin/reports` | Ao montar e a cada 60s. Os cards só formatam a resposta; a agregação fica no servidor |
| `Admin/Impressao` | `GET /api/orders?from=&to=&include_open=1` | Hoje, ao montar e a cada 15s |
| `Admin/Impressao` | `PATCH /api/orders/{id}/printed` | Depois que a janela de impressão fecha |

Nenhuma página chama hoje: `GET` de um único recurso (`categories/{id}`, `add-ons/{id}`, `delivery-zones/{id}`, `products/{id}`, `orders/{id}`).
