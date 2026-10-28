# Mapa de Rotas — Maia Lanches

Estado atual do repositório. O frontend (React/Inertia) e a API saem do mesmo Laravel. O contrato das rotas está em `routes/web.php` e `routes/api.php`.

## 1. Portas

| Porta | Serviço | O que é |
|---|---|---|
| **8000** | `app` (Laravel) | Páginas Inertia (`/`, `/admin/...`) e API (`/api/...`) |
| **5173** | `vite` | Assets JS/CSS em desenvolvimento. Não tem rotas de página |
| **8080** | `phpmyadmin` | Administração do MySQL |
| **3306** | `mysql` | Banco de dados |

## 2. Páginas

| Método | Rota | Componente | Quem acessa |
|---|---|---|---|
| GET | `/` | `Home/Home` | Pública |
| GET | `/meus-pedidos` | `MeusPedidos/MeusPedidos` | Pública. A lista vem do `localStorage` deste navegador (id, token, status, itens — sem nome, telefone, CPF ou endereço) |
| GET | `/admin/login` | `Admin/Login/Login` | Pública |
| GET | `/admin` | — | Autenticada. Redireciona para `/admin/pedidos` |
| GET | `/admin/pedidos` | `Admin/Pedidos/Pedidos` | Autenticada |
| GET | `/admin/produtos` | `Admin/Produtos/Produtos` | Autenticada |
| GET | `/admin/centraldepagamentos` | `Admin/CentralDePagamentos/CentralDePagamentos` | Autenticada. Conteúdo de demonstração |
| GET | `/admin/taxasdeentrega` | `Admin/TaxasDeEntrega/TaxasDeEntrega` | Autenticada |
| GET | `/admin/motoboys` | `Admin/Motoboys/Motoboys` | Autenticada. Conteúdo de demonstração |
| GET | `/admin/relatorios` | `Admin/Relatorios/Relatorios` | Autenticada. Conteúdo de demonstração |
| GET | `/admin/horarios` | `Admin/Horarios/Horarios` | Autenticada. Conteúdo de demonstração |
| GET | `/admin/impressao` | `Admin/Impressao/Impressao` | Autenticada |

Sem sessão, o middleware `auth` manda qualquer rota `/admin` (exceto o login) para `/admin/login`.

## 3. Navegação

| De | Ação | Para | Como |
|---|---|---|---|
| `Home` | "Meus pedidos" | `/meus-pedidos` | `<Link>` do Inertia |
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

Prefixo `/api`. Rotas de admin usam o grupo `web` (cookie de sessão + `X-XSRF-TOKEN`).

### Autenticação

| Método | Rota | Quem |
|---|---|---|
| POST | `/api/admin/login` | Pública. Corpo `{email, password}` |
| POST | `/api/admin/logout` | Autenticada. Resposta 204 |
| GET | `/api/admin/me` | Autenticada. `{user}` |

### Públicas

| Método | Rota |
|---|---|
| GET | `/api/store-settings` |
| GET | `/api/categories` e `/api/categories/{id}` |
| GET | `/api/add-ons` e `/api/add-ons/{id}` |
| GET | `/api/delivery-zones` e `/api/delivery-zones/{id}` |
| GET | `/api/products` (`?category_id=`, `?only_active=1`) e `/api/products/{id}` |
| POST | `/api/orders` (a resposta traz `access_token`) |
| GET | `/api/order-status/{token}` (limite de 30 requisições por minuto) |

### Autenticadas

| Método | Rota |
|---|---|
| PUT | `/api/store-settings` |
| POST / PUT / DELETE | `/api/categories` |
| POST / PUT / DELETE | `/api/add-ons` |
| POST / PUT / DELETE | `/api/delivery-zones` |
| POST / PUT / DELETE | `/api/products` |
| PATCH | `/api/products/{id}/availability` |
| GET | `/api/orders` e `/api/orders/{id}` |
| GET | `/api/my-orders` |
| PATCH | `/api/orders/{id}/status` |
| PATCH | `/api/orders/{id}/printed` |

Estas rotas existem e nenhuma página chama hoje: `GET` de um único recurso (`categories/{id}`, `add-ons/{id}`, `delivery-zones/{id}`, `products/{id}`, `orders/{id}`), `PUT/DELETE /categories`, todo o CRUD de `add-ons`, `DELETE /products` e `GET /my-orders`.

## 5. Chamadas por página

O `AdminLayout` (sidebar + cabeçalho) envolve todas as páginas admin autenticadas. Ele não depende do conteúdo da tela.

| Origem | Chamada | Quando |
|---|---|---|
| `AdminLayout` | `POST /api/admin/logout` | "Sair do painel" |
| `AdminHeader` | `GET /api/admin/me` e `GET /api/store-settings` | Ao montar |
| `AdminHeader` | `PUT /api/store-settings` | Abrir/fechar a loja, ou ao sair do campo de minutos de entrega/retirada |

| Página | Chamada | Quando |
|---|---|---|
| `Home` | `GET /api/categories`, `GET /api/products?only_active=1`, `GET /api/add-ons`, `GET /api/delivery-zones`, `GET /api/store-settings` | Ao montar, em paralelo |
| `Home` | `GET /api/store-settings` | Ao abrir o carrinho |
| `CartModal` (aberto pela Home) | `POST /api/orders` | Confirmar o pedido |
| `MeusPedidos` | `GET /api/order-status/{token}` | Na entrada e a cada 20s, para cada pedido do `localStorage` que ainda não está `entregue` |
| `Admin/Login` | `POST /api/admin/login` | Enviar o formulário |
| `Admin/Pedidos` | `GET /api/orders` | Ao montar e a cada 15s |
| `Admin/Pedidos` | `PATCH /api/orders/{id}/status` | Avançar o status de um pedido |
| `Admin/Produtos` | `GET /api/categories` e `GET /api/products` | Ao montar e depois de salvar |
| `Admin/Produtos` | `PATCH /api/products/{id}/availability` | Pausar ou ativar um produto, ou todos os produtos de uma categoria |
| `ProductFormModal` | `POST /api/products` ou `PUT /api/products/{id}` | Criar ou editar produto. No PUT, tamanhos com `id` atualizam; sem `id` são criados; os ausentes o back remove |
| `CategoryFormModal` | `POST /api/categories` | Criar categoria |
| `Admin/TaxasDeEntrega` | `GET /api/delivery-zones` | Ao montar e depois de salvar ou excluir |
| `Admin/TaxasDeEntrega` | `POST /api/delivery-zones` ou `PUT /api/delivery-zones/{id}` | Criar ou editar faixa |
| `Admin/TaxasDeEntrega` | `DELETE /api/delivery-zones/{id}` | Excluir faixa |
| `Admin/Impressao` | `GET /api/orders` | Ao montar e a cada 15s |
| `Admin/Impressao` | `PATCH /api/orders/{id}/printed` | Depois que a janela de impressão fecha |

Sem chamada própria de API (os dados da tela vêm de `resources/js/mocks`): `Motoboys`, `Horarios`, `CentralDePagamentos`, `Relatorios`. O cabeçalho dessas páginas ainda chama `/api/admin/me` e `/api/store-settings`, porque usam o `AdminLayout`.

Na Home, três modais continuam em mock, no arquivo `establishmentMock.js`: horários de funcionamento (`OpeningHoursModal`), formas de pagamento (`PaymentMethodsModal`) e descrição, endereço e contato (`InfoModal`). O tempo de entrega e de retirada do `InfoModal` vem de `store-settings`.

## 6. Mocks que restam

| Arquivo | Quem usa |
|---|---|
| `mocks/motoboysMock.js` | `Admin/Motoboys` |
| `mocks/scheduleMock.js` | `Admin/Horarios` |
| `mocks/adminPaymentMethodsMock.js` | `Admin/CentralDePagamentos` |
| `mocks/reportsMock.js` | `Admin/Relatorios` |
| `mocks/establishmentMock.js` | `OpeningHoursModal`, `PaymentMethodsModal`, `InfoModal` |
