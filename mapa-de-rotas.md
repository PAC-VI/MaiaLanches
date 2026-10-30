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

### Autenticação

| Método | Rota | Auth | Throttle | Payload / retorno |
|---|---|---|---|---|
| POST | `/api/admin/login` | Pública | `admin-login`: 5/min por e-mail + IP | `{email, password}` → `{user: {id, name, email}}` |
| POST | `/api/admin/logout` | Sessão | — | Sem corpo. `204` |
| GET | `/api/admin/me` | Sessão | — | `{user: {id, name, email}}` |

### Públicas

| Método | Rota | Auth | Throttle | Payload / retorno |
|---|---|---|---|---|
| GET | `/api/store-settings` | Pública | — | Sem `{data}`: `{is_open, delivery_time_minutes, pickup_time_minutes, description, address, contact}`. Os três últimos vêm de `config/store.php` |
| GET | `/api/store-hours` | Pública | — | Sem `{data}`: `{today, days: [{id, weekday, is_open_day, opens_at, closes_at}]}`. `today` é o dia da semana no fuso da loja (0 = domingo). Horas em `HH:MM` |
| GET | `/api/payment-methods` | Pública | — | Sem `{data}`: `[{code, label}]`, só as ativas, na ordem da loja |
| GET | `/api/categories` | Pública | — | `{data: [{id, name, can_delete}]}` |
| GET | `/api/categories/{id}` | Pública | — | `{data: {id, name, can_delete}}`. Nenhuma tela chama |
| GET | `/api/add-ons` | Pública | — | `{data: [{id, name, price}]}` |
| GET | `/api/add-ons/{id}` | Pública | — | `{data: {id, name, price}}`. Nenhuma tela chama |
| GET | `/api/delivery-zones` | Pública | — | Sem `{data}`: `[{id, radius_km, fee_amount, motoboy_payout_amount, ...}]`, ordenado por raio |
| GET | `/api/delivery-zones/{id}` | Pública | — | A faixa. Nenhuma tela chama |
| GET | `/api/products` | Pública | — | `{data: [{id, category_id, category, name, description, is_active, can_delete, sizes: [{id, size_name, price}]}]}`. Filtros opcionais `?category_id=` e `?only_active=1` |
| GET | `/api/products/{id}` | Pública | — | Um produto no mesmo formato. Nenhuma tela chama |
| POST | `/api/orders` | Pública | `public-orders`: 10/min por IP | Ver corpo abaixo. `201` com o pedido no topo (sem `{data}`) e `access_token`. Taxa, repasse e total saem do servidor |
| GET | `/api/order-status/{token}` | Pública | 30/min por IP | `{status, updated_at}` ou `404` |

Corpo de `POST /api/orders`:

`{customer_name, customer_phone, type: delivery|pickup, payment_method, change_for?, delivery_address?, delivery_zone_id?, items: [{product_size_id, quantity, observation?, add_on_ids?}]}`

`delivery_address` e `delivery_zone_id` são obrigatórios quando `type` é `delivery`. `payment_method` precisa ser o `code` de uma forma ativa. O cliente não envia `delivery_fee` nem `total_amount`.

### Autenticadas (sessão)

| Método | Rota | Throttle | Payload / retorno |
|---|---|---|---|
| PUT | `/api/store-settings` | — | `{is_open?, delivery_time_minutes?, pickup_time_minutes?}` → o mesmo objeto do GET |
| GET | `/api/admin/payment-methods` | — | `{data: [{id, code, label, is_active, sort_order}]}` |
| PATCH | `/api/admin/payment-methods/{id}` | — | `{label?}` e/ou `{is_active?}`. Recusa desligar a última forma ativa. Devolve o item |
| GET | `/api/admin/store-hours` | — | `{days: [...]}` no mesmo formato do GET público, sem `today` |
| PUT | `/api/admin/store-hours` | — | `{days: [{weekday, is_open_day, opens_at, closes_at}]}` com os 7 dias (0–6), cada um uma vez. Dia aberto exige abertura e fechamento diferentes, em `HH:MM`. Devolve `{days}` |
| GET | `/api/admin/motoboys` | — | `{data: [{id, name, phone, is_active, status_label}]}`. Não lista soft-deleted |
| POST | `/api/admin/motoboys` | — | `{name, phone, is_active}` → `201` com o motoboy. Telefone `(XX) XXXXX-XXXX` ou `(XX) XXXX-XXXX` |
| PUT | `/api/admin/motoboys/{id}` | — | O mesmo corpo. Devolve o motoboy |
| DELETE | `/api/admin/motoboys/{id}` | — | Soft delete. `204` |
| GET | `/api/admin/motoboys/{id}/summary` | — | `?date=YYYY-MM-DD` opcional (dia da loja; padrão = hoje). `{date, deliveries_count, payout_total, average_per_delivery, orders: [{id, customer_name, address_summary, delivery_fee, status}]}` |
| POST | `/api/categories` | — | `{name}` → `201` |
| PUT | `/api/categories/{id}` | — | `{name}` |
| PATCH | `/api/categories/{id}/availability` | — | `{is_active}` liga ou desliga todos os produtos da categoria |
| DELETE | `/api/categories/{id}` | — | `204` se a categoria nunca teve venda. `422` se teve |
| POST | `/api/add-ons` | — | `{name, price}` → `201` |
| PUT | `/api/add-ons/{id}` | — | `{name, price}` |
| DELETE | `/api/add-ons/{id}` | — | `204` se nunca teve venda. `422` se teve. Não há inativação |
| POST | `/api/delivery-zones` | — | `{radius_km, fee_amount, motoboy_payout_amount}` → `201`, sem `{data}` |
| PUT | `/api/delivery-zones/{id}` | — | O mesmo corpo |
| DELETE | `/api/delivery-zones/{id}` | — | `204` |
| POST | `/api/products` | — | `{category_id, name, description?, is_active?, sizes: [{size_name, price}]}` (mínimo 1 tamanho) → `201` |
| PUT | `/api/products/{id}` | — | O mesmo corpo. Tamanho com `id` atualiza; sem `id` cria; ausente é removido. Tamanho que já vendeu não sai: `422` |
| DELETE | `/api/products/{id}` | — | `204` se nunca teve venda. `422` se teve: inativar |
| PATCH | `/api/products/{id}/availability` | — | `{is_active}` |
| GET | `/api/orders` | — | Filtros abaixo. `{data: [pedido]}` |
| GET | `/api/orders/{id}` | — | Um pedido. Nenhuma tela chama |
| GET | `/api/my-orders` | — | `?customer_phone=` obrigatório. `{data: [pedido]}`. Nenhuma tela chama; o cliente usa o token |
| PATCH | `/api/orders/{id}/status` | — | `{status}`. Avanço: `novo` → `em_preparo` → `pronto` → `entregue`. Cancelamento (`cancelado`) só a partir de `novo`, `em_preparo` ou `pronto`. `entregue` e `cancelado` não mudam |
| PATCH | `/api/orders/{id}/motoboy` | — | `{motoboy_id: id ou null}`. Só entrega ainda aberta, e o motoboy precisa estar ativo |
| PATCH | `/api/orders/{id}/printed` | — | Sem corpo. Marca `is_printed` |

Filtros de `GET /api/orders` (todos opcionais):

- `status` — `novo`, `em_preparo`, `pronto`, `entregue` ou `cancelado`
- `type` — `delivery` ou `pickup`
- `from` e `to` — `YYYY-MM-DD`, dias da loja, inclusivos. Sem os dois, vale hoje. Intervalo máximo de 92 dias
- `include_open=1` — também traz `novo`, `em_preparo` e `pronto` criados antes de `from`

Pedido (admin): `{id, number, customer_name, customer_phone, type, status, cancelled_at, payment_method, change_for, delivery_address, delivery_zone_id, delivery_fee, total_amount, is_printed, motoboy_id, motoboy_name, motoboy_payout, delivered_at, items, created_at, updated_at}`.

`number` é o próprio `id` e não reinicia. Item: `{id, product_size_id, product_name, size_name, quantity, unit_price, total_price, observation, add_ons: [{id, add_on_id, name, price}]}`.

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
| `Home` | `GET /api/categories`, `GET /api/products?only_active=1`, `GET /api/add-ons`, `GET /api/delivery-zones`, `GET /api/store-settings` | Ao montar, em paralelo, e de novo (em silêncio) ao abrir o carrinho |
| `OpeningHoursModal` | `GET /api/store-hours` | Ao abrir o modal de horários |
| `PaymentMethodsModal` | `GET /api/payment-methods` | Ao abrir o modal de pagamentos |
| `InfoModal` | — | Usa o `store-settings` que a Home já carregou (tempos, descrição, endereço, contato) |
| `CartModal` | `GET /api/payment-methods` | Ao entrar no checkout |
| `CartModal` | `POST /api/orders` | Confirmar o pedido |
| `MeusPedidos` | `GET /api/order-status/{token}` | Na entrada e a cada 20s, para cada pedido do `localStorage` que ainda não está `entregue` nem `cancelado` |
| `Admin/Login` | `POST /api/admin/login` | Enviar o formulário |
| `Admin/Pedidos` | `GET /api/admin/motoboys` | Junto da listagem de pedidos |
| `Admin/Pedidos` | `GET /api/orders?from=&to=` e `include_open=1` quando o intervalo inclui hoje | Ao montar, ao mudar o período e a cada 15s |
| `Admin/Pedidos` | `PATCH /api/orders/{id}/status` | Avançar ou cancelar |
| `Admin/Pedidos` | `PATCH /api/orders/{id}/motoboy` | Atribuir, trocar ou tirar o motoboy |
| `Admin/Produtos` | `GET /api/categories` e `GET /api/products` | Ao montar e depois de salvar |
| `Admin/Produtos` | `PATCH /api/products/{id}/availability` | Pausar ou ativar um produto |
| `Admin/Produtos` | `PATCH /api/categories/{id}/availability` | Pausar ou ativar a categoria inteira |
| `Admin/Produtos` | `DELETE /api/products/{id}` e `DELETE /api/categories/{id}` | Excluir só quando `can_delete` é verdadeiro |
| `ProductFormModal` | `POST /api/products` ou `PUT /api/products/{id}` | Criar ou editar |
| `CategoryFormModal` | `POST /api/categories` ou `PUT /api/categories/{id}` | Criar ou renomear |
| `AddOnsSection` | `GET /api/add-ons`, `POST` / `PUT /api/add-ons`, `DELETE /api/add-ons/{id}` | Listar, salvar e excluir acréscimo sem venda |
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
| `Admin/Relatorios` | `GET /api/orders?from=&to=` | Ao montar e a cada 15s. Os cards são calculados no front a partir dessa lista |
| `Admin/Impressao` | `GET /api/orders?from=&to=&include_open=1` | Hoje, ao montar e a cada 15s |
| `Admin/Impressao` | `PATCH /api/orders/{id}/printed` | Depois que a janela de impressão fecha |

Nenhuma página chama hoje: `GET` de um único recurso (`categories/{id}`, `add-ons/{id}`, `delivery-zones/{id}`, `products/{id}`, `orders/{id}`) e `GET /api/my-orders`.
