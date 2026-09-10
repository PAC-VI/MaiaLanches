# Maia Lanches

Plataforma web para gestão de pedidos e cardápio da lanchonete Maia Lanches
(PAC VI). Backend em Laravel + MySQL, frontend em React via Inertia.js.

## Rodando com Docker

Pré-requisito: [Docker](https://www.docker.com/) e Docker Compose instalados.

```bash
# 1. Suba todos os containers (mysql, phpmyadmin, app, vite)
docker compose up -d --build

# 2. Acompanhe os logs do backend até ver "Server running on [http://0.0.0.0:8000]"
docker compose logs -f app
```

Na primeira vez, o container `app` cria o `.env`, gera a `APP_KEY` e roda as
migrations automaticamente (veja `docker/entrypoint.sh`).

### Endereços

| Serviço              | URL                              |
|-----------------------|-----------------------------------|
| Site (Laravel/Inertia) | http://localhost:8000            |
| API (JSON)             | http://localhost:8000/api/...    |
| Vite (dev server)      | http://localhost:5173            |
| phpMyAdmin             | http://localhost:8080            |
| MySQL (fora do Docker) | localhost:3306                   |

### Popular o banco com dados de exemplo

```bash
docker compose exec app php artisan db:seed
```

### Comandos úteis

```bash
# Ver logs de um serviço específico
docker compose logs -f app
docker compose logs -f vite

# Rodar comandos artisan dentro do container
docker compose exec app php artisan migrate:fresh --seed
docker compose exec app php artisan route:list

# Parar tudo
docker compose down

# Parar e apagar também os dados do banco (cuidado!)
docker compose down -v
```

## API

Rotas principais (veja `routes/api.php`):

- `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}`
- `GET/POST /api/categories`
- `GET/POST /api/add-ons`
- `GET/POST /api/orders`, `GET /api/orders/{id}`
- `PATCH /api/orders/{id}/status`, `PATCH /api/orders/{id}/printed`
- `GET/PUT /api/store-settings`
