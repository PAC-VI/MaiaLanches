# Maia Lanches

Plataforma web de uma lanchonete: cardápio e pedido do cliente, e painel para produtos, pedidos, pagamentos, faixas de entrega, motoboys, horários, impressão e relatórios.

O sistema foi desenvolvido como parte do PAC VI. O Laravel entrega as páginas (Inertia) e a API na mesma origem.

## Stack

- **PHP 8.4** e **Laravel 13** — regras de negócio, sessão do admin e API.
- **React 19** (JSX, sem TypeScript) e **Inertia.js** — telas.
- **MySQL 8** — banco.
- **Docker** — PHP, MySQL, phpMyAdmin e Vite (Node 22) em desenvolvimento.

O back-end é a fonte da verdade para taxa, total e status. O front não envia valor calculado.

## Como subir com Docker

Pré-requisito: Docker e Docker Compose.

```bash
docker compose up -d --build
docker compose logs -f app
```

Espere a linha `Development Server (http://0.0.0.0:8000) started`.

Na primeira subida, com o volume do MySQL vazio, o `docker/entrypoint.sh`:

- cria o `.env` a partir do `.env.example`, se ainda não existir, e gera a `APP_KEY`;
- roda `php artisan migrate`;
- roda `php artisan db:seed` somente se ainda não houver usuário.

O seed cria o admin, o cardápio de exemplo, as formas de pagamento, os horários e a configuração inicial da loja. Ele não roda de novo em restart: o `CatalogSeeder` sobrescreveria `is_open` e os tempos.

**Admin de exemplo:** `fernanda@maialanches.test` / senha `password`.

Para popular de novo na mão (o catálogo volta a abrir a loja e a repor os tempos):

```bash
docker compose exec app php artisan db:seed --force
```

Para zerar o banco:

```bash
docker compose down -v
docker compose up -d --build
```

| Serviço | URL |
|---|---|
| Site e API | http://localhost:8000 e http://localhost:8000/api/... |
| Vite (assets em dev) | http://localhost:5173 |
| phpMyAdmin | http://localhost:8080 |
| MySQL fora do Docker | localhost:3306 |

```bash
docker compose logs -f app
docker compose logs -f vite
docker compose exec app php artisan route:list
docker compose down
```

## Variáveis de ambiente

O modelo está em `.env.example`. Dentro do Docker, o Compose sobrescreve `DB_HOST=mysql` e a senha do banco.

- `APP_TIMEZONE` — fuso da loja. O padrão é `America/Sao_Paulo`. Filtro de pedido por dia, horário “hoje” e o dia do motoboy usam esse fuso, não o UTC do relógio do servidor.
- `APP_URL` — origem do site (`http://localhost:8000` em dev).
- `STORE_DESCRIPTION`, `STORE_ADDRESS`, `STORE_CONTACT` — texto do modal de informações do cardápio. Ficam em `config/store.php` e entram no `GET /api/store-settings`. Não são editáveis no painel e não vão para o banco.
- `DB_*` — conexão MySQL.

## Login do admin

1. Abra http://localhost:8000/admin/login.
2. O formulário envia `POST /api/admin/login` com `{email, password}`. A sessão é o cookie do Laravel (guard `web`), com o header `X-XSRF-TOKEN`.
3. Se o login passar, o painel abre em `/admin/pedidos`.
4. As outras rotas `/admin/...` exigem sessão. Sem ela, o Laravel redireciona para `/admin/login`. Um `401` da API também manda o navegador para essa tela.
5. "Sair do painel" chama `POST /api/admin/logout` e volta para `/admin/login`.

O cardápio (`/`) e "Meus pedidos" (`/meus-pedidos`) não usam essa sessão. O cliente acompanha o pedido pelo token guardado neste navegador, sem nome, telefone ou endereço no `localStorage`.

## Telas

Todas leem a API. Não há mais mock no front.

- `/` — cardápio, carrinho e pedido
- `/meus-pedidos` — status dos pedidos deste navegador
- `/admin/login`
- `/admin/pedidos`
- `/admin/produtos`
- `/admin/centraldepagamentos`
- `/admin/taxasdeentrega`
- `/admin/motoboys`
- `/admin/relatorios`
- `/admin/horarios`
- `/admin/impressao`

O cabeçalho do painel (loja aberta/fechada e minutos de entrega e retirada) aparece em toda página admin autenticada.

## Número do pedido e fuso

O número do pedido é o `id`: sequencial e infinito. Não reinicia no dia. A API também devolve `number` com o mesmo valor.

Datas de filtro (“hoje”, “ontem”, intervalo) usam o dia da loja em `APP_TIMEZONE`.

## Frete

O cliente escolhe uma faixa de entrega (`delivery_zone_id`). A taxa (`fee_amount`) e o repasse do motoboy (`motoboy_payout_amount`) saem dessa faixa, calculados no servidor. Cálculo automático de frete pela distância do endereço é um plano futuro e ainda não está implementado.

## Regras de exclusão

- **Produto e categoria:** exclusão só se nunca tiveram venda. Com venda, a resposta é 422 e a loja inativa (produto, ou todos os produtos da categoria).
- **Tamanho:** não tem exclusão própria nem campo de inativo. Na edição do produto, um tamanho omitido é removido só se nunca vendeu; com venda, a edição responde 422.
- **Acréscimo:** não tem campo de inativo. `DELETE` só passa se nunca teve venda; com venda, 422.
- **Motoboy:** soft delete. O cadastro some da lista e o histórico do pedido permanece.
- **Faixa de entrega:** pode ser excluída.

## Pastas

- `app/` — controllers da API, models, services, form requests e resources
- `routes/web.php` — páginas Inertia; `routes/api.php` — API (o contrato, se a documentação divergir)
- `resources/js/pages` — telas; `components` — um par `.jsx` + `.css` por componente; `layouts`; `lib` — fetch, formato, erros
- `resources/styles/globalStyles.js` — tipografia e tokens
- `config/store.php` — descrição, endereço e contato do cardápio
- `database/migrations` e `database/seeders`
- `docker/` — imagem PHP 8.4 e entrypoint

O mapa de cada rota (método, auth, throttle, payload) está em `mapa-de-rotas.md`.
