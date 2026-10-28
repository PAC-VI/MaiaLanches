# Maia Lanches

O Maia Lanches é uma plataforma web desenvolvida para auxiliar na gestão de uma lanchonete,
permitindo o gerenciamento de produtos, categorias, adicionais, pedidos, entregas
e configurações do estabelecimento.

O sistema foi desenvolvido como parte do (PAC VI) e utiliza uma arquitetura web moderna, separando as responsabilidades entre backend, frontend e banco de dados.

### Tecnologias utilizadas

- **Laravel** — responsável pelo backend, regras de negócio e API.
- **React** — responsável pelo frontend do sistema.
- **Inertia.js** — integração entre Laravel e React.
- **MySQL** — armazenamento dos dados da aplicação.
- **Docker** — criação e gerenciamento do ambiente de desenvolvimento.

## Rodando com Docker

Pré-requisito: [Docker](https://www.docker.com/) e Docker Compose instalados.

```bash
# 1. Suba todos os containers (mysql, phpmyadmin, app, vite)
docker compose up -d --build

# 2. Acompanhe os logs do backend até ver "Development Server (http://0.0.0.0:8000) started"
docker compose logs -f app
```

Na primeira vez que os containers sobem (com o volume do banco vazio):
- O MySQL cria só o banco vazio. O schema vem das migrations do Laravel.
- O container `app` cria o `.env`, gera a `APP_KEY`, roda `php artisan migrate` e, se ainda não houver usuários, `php artisan db:seed` (veja `docker/entrypoint.sh`).
- O seed cria o usuário admin, o cardápio de exemplo (categorias, produtos, acréscimos e zonas de entrega) e as configurações iniciais da loja.

O seed **não** roda de novo em restarts: o `CatalogSeeder` sobrescreveria `is_open` e os tempos da loja.

**Login admin de exemplo:** `fernanda@maialanches.test` / senha `password`.

## Login do admin

1. Abra http://localhost:8000/admin/login.
2. O formulário envia `POST /api/admin/login` com `{email, password}`. A sessão é o cookie do Laravel (guard `web`), com o header `X-XSRF-TOKEN`.
3. Se o login passar, o painel abre em `/admin/pedidos`.
4. As outras rotas `/admin/...` exigem sessão. Sem ela, o Laravel redireciona para `/admin/login`. Uma resposta `401` da API também manda o navegador para essa tela.
5. "Sair do painel" chama `POST /api/admin/logout` e volta para `/admin/login`.

O cardápio (`/`) e "Meus pedidos" (`/meus-pedidos`) não usam essa sessão.

## Telas

Conectadas à API:

- `/` — cardápio, carrinho e criação do pedido
- `/meus-pedidos` — status dos pedidos deste navegador
- `/admin/login`
- `/admin/pedidos`
- `/admin/produtos` — produtos, pausar/ativar e nova categoria
- `/admin/taxasdeentrega`
- `/admin/impressao`
- Cabeçalho do painel (em toda página admin autenticada) — loja aberta/fechada e minutos de entrega e retirada

Ainda com dados de demonstração (aviso "Dados de demonstração" na tela):

- `/admin/motoboys`
- `/admin/horarios`
- `/admin/centraldepagamentos`
- `/admin/relatorios`
- Modal "Horários de funcionamento" no cardápio

No cardápio, o modal de formas de pagamento e os campos de descrição, endereço e contato do modal de informações também vêm de mock. O tempo de entrega e de retirada desse modal de informações vem da API.

Para popular o banco manualmente (idempotente para o admin e o catálogo):

```bash
docker compose exec app php artisan db:seed --force
```

### Endereços

| Serviço              | URL                              |
|-----------------------|-----------------------------------|
| Site (Laravel/Inertia) | http://localhost:8000            |
| API (JSON)             | http://localhost:8000/api/...    |
| Vite (dev server)      | http://localhost:5173            |
| phpMyAdmin             | http://localhost:8080            |
| MySQL (fora do Docker) | localhost:3306                   |

### Comandos úteis

```bash
# Ver logs de um serviço específico
docker compose logs -f app
docker compose logs -f vite

# Resetar o banco do zero (apaga o volume do MySQL; o entrypoint migra e faz o seed)
docker compose down -v
docker compose up -d --build

# Rodar comandos artisan dentro do container
docker compose exec app php artisan route:list

# Parar tudo (mantém os dados do banco)
docker compose down
```

## API

O mapa completo (página, rota e qual chamada cada tela faz) está em `mapa-de-rotas.md`. A fonte das rotas é `routes/api.php`.

- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/me`
- `GET/PUT /api/store-settings`
- `GET/POST /api/categories` (também há `PUT/DELETE`)
- `GET/POST /api/add-ons` (também há `PUT/DELETE`; nenhuma tela admin grava acréscimo)
- `GET/POST/PUT/DELETE /api/delivery-zones`
- `GET/POST/PUT /api/products`, `PATCH /api/products/{id}/availability` (`DELETE` existe e a interface não expõe)
- `POST /api/orders`, `GET /api/order-status/{token}`
- `GET /api/orders`, `PATCH /api/orders/{id}/status`, `PATCH /api/orders/{id}/printed`
