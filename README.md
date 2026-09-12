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
- O MySQL já cria as tabelas **e popula com dados de exemplo** automaticamente, a partir de `database/init.sql` (categorias, produtos, acréscimos, zonas de entrega e um usuário admin).
- O container `app` cria o `.env`, gera a `APP_KEY` e roda `php artisan migrate` (veja `docker/entrypoint.sh`) — como o banco já vem com as tabelas prontas, isso só confirma que está tudo migrado, sem fazer nada de novo.

**Login admin de exemplo:** `fernanda@maialanches.test` / senha `password`.

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

# Resetar o banco do zero (apaga tudo e reimporta o database/init.sql)
docker compose down -v
docker compose up -d --build

# Rodar comandos artisan dentro do container
docker compose exec app php artisan route:list

# Parar tudo (mantém os dados do banco)
docker compose down
```

## API

Rotas principais (veja `routes/api.php`):

- `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}`
- `GET/POST /api/categories`
- `GET/POST /api/add-ons`
- `GET/POST /api/orders`, `GET /api/orders/{id}`
- `PATCH /api/orders/{id}/status`, `PATCH /api/orders/{id}/printed`
- `GET/PUT /api/store-settings`
