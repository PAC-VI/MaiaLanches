# Mapa de rotas — Maia Lanches

> Atualizado em 2026-09-28, após: login do admin (sessão), CPF opcional,
> novo enum de status (`novo, em_preparo, pronto, entregue`), disponibilidade
> de produto, e o fluxo de "Meus Pedidos" por token (localStorage + polling).

## Arquitetura de portas

Este projeto **não** separa frontend e backend em portas diferentes — é um
monólito Laravel + Inertia. Uma única porta serve tanto as páginas quanto a
API.

| Porta | Serviço | O quê |
|---|---|---|
| **8000** | Laravel (`app`) | Tudo: as páginas (Home, Meus Pedidos, Admin) **e** a API (`/api/...`) |
| **5173** | Vite (`vite`) | Só serve os arquivos JS/CSS em modo desenvolvimento (hot-reload) — sem rotas de página, não existe em produção |
| **8080** | phpMyAdmin | Interface visual do banco MySQL — ferramenta auxiliar, fora do sistema |
| **3306** | MySQL | Porta do banco de dados |

---

## Porta 8000 — Páginas (frontend React/Inertia)

| Rota | Componente | Acesso | O quê |
|---|---|---|---|
| `GET /` | `pages/Home/Home.jsx` | Público | Cardápio, onde o cliente monta o pedido *(ainda em cima de dados mock — não chama a API de verdade)* |
| `GET /meus-pedidos` | `pages/MeusPedidos/MeusPedidos.jsx` | Público | Lista os pedidos salvos no `localStorage` do navegador + polling de status |
| `GET /admin/login` | `pages/Admin/Login/Login.jsx` | Público | Login do admin |
| `GET /admin` | *(sem componente — redireciona)* | Autenticado | Redireciona para `/admin/pedidos` |
| `GET /admin/pedidos` | `pages/Admin/Pedidos/Pedidos.jsx` | Autenticado | Painel de pedidos do admin |

## Porta 8000 — API: autenticação

| Método | Rota | Acesso |
|---|---|---|
| POST | `/api/admin/login` | Público |
| POST | `/api/admin/logout` | Autenticado |
| GET | `/api/admin/me` | Autenticado |

## Porta 8000 — API: pública (cardápio + fluxo do cliente sem login)

| Método | Rota | O quê |
|---|---|---|
| GET | `/api/store-settings` | Dados da lanchonete |
| GET | `/api/categories` | Lista categorias |
| GET | `/api/categories/{id}` | Detalhe de categoria |
| GET | `/api/add-ons` | Lista acréscimos |
| GET | `/api/add-ons/{id}` | Detalhe de acréscimo |
| GET | `/api/delivery-zones` | Lista zonas de entrega |
| GET | `/api/delivery-zones/{id}` | Detalhe de zona de entrega |
| GET | `/api/products` | Cardápio |
| GET | `/api/products/{id}` | Detalhe de produto |
| POST | `/api/orders` | Cria pedido — devolve `access_token` (só nesta resposta) |
| GET | `/api/order-status/{token}` | Status de um pedido, pelo token (rate-limited 30 req/min) |

## Porta 8000 — API: protegida (admin logado)

| Método | Rota | O quê |
|---|---|---|
| PUT | `/api/store-settings` | Editar dados da loja |
| POST | `/api/categories` | Criar categoria |
| PUT | `/api/categories/{id}` | Editar categoria |
| DELETE | `/api/categories/{id}` | Remover categoria |
| POST | `/api/add-ons` | Criar acréscimo |
| PUT | `/api/add-ons/{id}` | Editar acréscimo |
| DELETE | `/api/add-ons/{id}` | Remover acréscimo |
| POST | `/api/delivery-zones` | Criar zona de entrega |
| PUT | `/api/delivery-zones/{id}` | Editar zona de entrega |
| DELETE | `/api/delivery-zones/{id}` | Remover zona de entrega |
| POST | `/api/products` | Criar produto |
| PUT | `/api/products/{id}` | Editar produto |
| DELETE | `/api/products/{id}` | Remover produto |
| PATCH | `/api/products/{id}/availability` | Marcar disponível/indisponível |
| GET | `/api/orders` | Lista todos os pedidos (filtros `?status=` e `?type=`) |
| GET | `/api/orders/{id}` | Detalhe de um pedido |
| GET | `/api/my-orders?customer_phone=` | Busca pedidos por telefone (uso administrativo) |
| PATCH | `/api/orders/{id}/status` | Muda o status do pedido |
| PATCH | `/api/orders/{id}/printed` | Marca como impresso |

---

## Notas

- **`GET /api/my-orders`** foi movida da área pública para a protegida:
  telefone não é segredo, então deixou de ser uma forma segura do cliente
  consultar o próprio histórico. Continua útil para o admin (ex.: cliente
  liga perguntando pelo pedido).
- **`GET /api/order-status/{token}`** é a substituta pública dela: não
  recebe nem devolve nenhum dado pessoal, só `{ status, updated_at }`, e só
  funciona com o token gerado na criação do pedido (não é adivinhável).
- **`Home.jsx`** ainda não chama `POST /api/orders` de verdade — está sobre
  dados mock. Enquanto isso não for ligado, `MeusPedidos.jsx` não tem nada
  para mostrar (não há como popular o `localStorage` sem um checkout real).
