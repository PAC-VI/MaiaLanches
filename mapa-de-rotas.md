# Mapa de Rotas — Maia Lanches

> Baseado no estado atual do repositório (branch `creating-adm-api`). Este documento cobre: portas/arquitetura, páginas do frontend, **links/navegação entre páginas**, rotas da API e **quais chamadas de API cada página dispara**.

---

## 1. Arquitetura (portas)

Tudo roda como um monólito Laravel — o frontend (React/Inertia) e a API são servidos **na mesma porta**. Não existem "frontend" e "backend" em portas separadas em produção/uso normal.

| Porta | Serviço | O que é |
|---|---|---|
| **8000** | `app` (Laravel) | Tudo: páginas Inertia (`/`, `/admin/...`) **e** API (`/api/...`) |
| **5173** | `vite` | Servidor de dev do Vite (só serve os assets JS/CSS em modo dev; não tem rotas de página) |
| **8080** | `phpmyadmin` | Ferramenta de administração do MySQL — não faz parte da aplicação |
| **3306** | `mysql` | Banco de dados |

---

## 2. Páginas do frontend (Inertia)

| Método | Rota | Componente renderizado | Camada | Autenticação |
|---|---|---|---|---|
| GET | `/` | `Home/Home` | Cliente | Pública |
| GET | `/meus-pedidos` | `MeusPedidos/MeusPedidos` | Cliente | Pública (dados vêm do `localStorage` do navegador) |
| GET | `/admin/login` | `Admin/Login/Login` | Admin | Pública |
| GET | `/admin` | *(sem página própria)* | Admin | **Autenticado** — redireciona direto para `/admin/pedidos` |
| GET | `/admin/pedidos` | `Admin/Pedidos/Pedidos` | Admin | **Autenticado** (sem sessão, o Laravel redireciona pro login) |

---

## 3. Links e navegação entre páginas

Isto é o "grafo de navegação" real do frontend: o que cada página tem que leva o usuário para outra rota, e como (link `<a>`, `router.visit()` do Inertia após uma ação, ou redirect do próprio Laravel).

| De | Ação/elemento | Para | Como funciona |
|---|---|---|---|
| `Admin/Login` | Submit do formulário de login, se `POST /api/admin/login` retornar sucesso | `/admin/pedidos` | `router.visit('/admin/pedidos')` (navegação client-side do Inertia, sem reload) |
| `Admin/Pedidos` (via `AdminLayout`) | Link "Pedidos" na sidebar | `/admin/pedidos` | `<a href="/admin/pedidos">` — **link comum, não usa `<Link>` do Inertia**, então recarrega a página inteira |
| `Admin/Pedidos` (via `AdminLayout`) | Botão "Sair" | `/admin/login` | Chama `POST /api/admin/logout` e, independentemente do resultado, faz `router.visit('/admin/login')` |
| `/admin` (rota do servidor) | Acesso direto autenticado | `/admin/pedidos` | `redirect('/admin/pedidos')` — feito no `routes/web.php`, no servidor, não no React |
| `/admin/pedidos` sem sessão | Middleware `auth` do Laravel | `/admin/login` | Redirect automático do Laravel (não é código do frontend) |
| `Home` | — | `/meus-pedidos` | ⚠️ **Não existe ainda.** Ver nota no final do documento. |

---

## 4. Rotas da API

### 4.1 Autenticação (guard `web`, sessão)

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| POST | `/api/admin/login` | Pública | Login do admin (email + senha) |
| POST | `/api/admin/logout` | Autenticado | Encerra a sessão |
| GET | `/api/admin/me` | Autenticado | Dados do admin logado |

### 4.2 Públicas (cardápio, pedido do cliente)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/store-settings` | Configurações da loja (aberto/fechado, tempos de entrega/retirada) |
| GET | `/api/categories` | Lista categorias |
| GET | `/api/categories/{id}` | Uma categoria |
| GET | `/api/add-ons` | Lista acréscimos |
| GET | `/api/add-ons/{id}` | Um acréscimo |
| GET | `/api/delivery-zones` | Lista zonas de entrega (raio + taxa) |
| GET | `/api/delivery-zones/{id}` | Uma zona de entrega |
| GET | `/api/products` | Lista produtos (aceita `?category_id=` e `?only_active=1`) |
| GET | `/api/products/{id}` | Um produto |
| POST | `/api/orders` | Cria um pedido — devolve o `access_token` (só nesta resposta) |
| GET | `/api/order-status/{token}` | Consulta status de um pedido pelo token (throttle: 30/min) |

### 4.3 Protegidas (admin logado)

| Método | Rota | Descrição |
|---|---|---|
| PUT | `/api/store-settings` | Atualiza configurações da loja |
| POST/PUT/DELETE | `/api/categories...` | CRUD de categorias |
| POST/PUT/DELETE | `/api/add-ons...` | CRUD de acréscimos |
| POST/PUT/DELETE | `/api/delivery-zones...` | CRUD de zonas de entrega |
| POST/PUT/DELETE | `/api/products...` | CRUD de produtos |
| PATCH | `/api/products/{id}/availability` | Pausa/ativa um produto |
| GET | `/api/orders` | Lista todos os pedidos |
| GET | `/api/orders/{id}` | Um pedido específico |
| GET | `/api/my-orders?customer_phone=` | Busca pedidos por telefone (uso do admin, ex.: cliente ligou) |
| PATCH | `/api/orders/{id}/status` | Atualiza status do pedido |
| PATCH | `/api/orders/{id}/printed` | Marca pedido como impresso |

---

## 5. Chamadas de API por página

Isto mostra, pra cada página React, quais endpoints ela realmente chama e quando.

| Página | Chamada | Disparada quando |
|---|---|---|
| `Admin/Login` | `POST /api/admin/login` | Submit do formulário |
| `Admin/Pedidos` | `GET /api/admin/me` + `GET /api/orders` | Ao montar a página (`useEffect`, em paralelo) |
| `Admin/Pedidos` (via `AdminLayout`) | `POST /api/admin/logout` | Clique em "Sair" |
| `MeusPedidos` | `GET /api/order-status/{token}` | A cada 20s, para cada pedido salvo no `localStorage` que ainda não está `entregue` (polling) |
| `Home` | — | ⚠️ **Nenhuma.** Ver nota abaixo. |

---

## Notas

- **`Home` ainda não fala com a API no repositório atual.** O cardápio vem 100% de `resources/js/mocks/menuMock.js`, e o botão de adicionar produto só faz `console.log`. Já te entreguei no chat o código completo (`Home.jsx`, `ProductCard.jsx`, `ProductModal.jsx`, `CartModal.jsx`, `publicApi.js` + a migration do `access_token`) que conecta essa página de verdade: carrega `GET /api/categories`, `GET /api/products?only_active=1`, `GET /api/add-ons`, `GET /api/delivery-zones` e `GET /api/store-settings` ao montar, monta um carrinho, e no checkout dispara `POST /api/orders`. **Esse código ainda não foi aplicado no seu repositório** — é por isso que ele não aparece nas tabelas acima. Assim que você aplicar, o link `Home → /meus-pedidos` passa a existir (via `router.visit`, depois de um pedido confirmado) e a linha de `Home` na seção 5 passa a ter as 5 chamadas GET + o `POST /api/orders`.
- O link "Pedidos" na sidebar do admin (`AdminLayout`) usa `<a href="...">` em vez do `<Link>` do Inertia — funciona, mas recarrega a página inteira em vez de navegar via SPA. Não é um bug, só um detalhe de performance que dá pra melhorar depois.
- `/api/my-orders` é autenticado (movida pra lá por segurança — telefone não é segredo o suficiente pra ficar público). O fluxo público de acompanhamento de pedido agora é só `/api/order-status/{token}`.
