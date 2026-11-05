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
- `APP_LOCALE` e `APP_FALLBACK_LOCALE` — `pt_BR`. As mensagens de validação da API saem em português (`lang/pt_BR/validation.php`).
- `APP_URL` — origem do site (`http://localhost:8000` em dev).
- `STORE_NAME`, `STORE_DESCRIPTION`, `STORE_ADDRESS`, `STORE_CONTACT` — nome da loja, endereço e texto do modal de informações. Ficam em `config/store.php` e entram no `GET /api/store-settings` (`name`, `description`, `address`, `contact`). O cabeçalho, o rodapé e o `<title>` usam o nome. Não são editáveis no painel e não vão para o banco.
- `DB_*` — conexão MySQL.

## Login do admin

1. Abra http://localhost:8000/admin/login.
2. O formulário envia `POST /api/admin/login` com `{email, password, remember}`. A sessão é o cookie do Laravel (guard `web`), com o header `X-XSRF-TOKEN`. A caixa "Manter conectado" começa desmarcada: `remember` só vai `true` se ela for marcada. Sem isso, a sessão dura `SESSION_LIFETIME`. Com a caixa marcada, o Laravel grava o cookie `remember_web_…`.
3. Se o login passar, o painel abre em `/admin/pedidos`.
4. As outras rotas `/admin/...` exigem sessão. Sem ela, o Laravel redireciona para `/admin/login`. Um `401` da API também manda o navegador para essa tela.
5. "Sair do painel" chama `POST /api/admin/logout` e volta para `/admin/login`.

O cardápio (`/`) e "Meus pedidos" (`/meus-pedidos`) não usam essa sessão. O cliente acompanha o pedido pelo token guardado neste navegador, sem nome, telefone ou endereço no `localStorage`.

## Limites de uso

Acima do limite a API responde `429` com `{message: "Muitas tentativas. Aguarde um minuto e tente de novo."}` e o cabeçalho `Retry-After`. O login e o checkout mostram esse texto pelo `translateApiError`.

- `POST /api/orders` (`public-orders`): 5 por minuto e 30 por hora por IP, e mais 8 por hora por telefone (só os dígitos de `customer_phone`, quando o campo vem). O cabeçalho `Idempotency-Key` (uuid) é obrigatório: a mesma chave no mesmo IP, por 10 minutos, devolve o pedido já criado.
- Grupo `api` (`throttle:api`): 120 por minuto por IP, em toda rota de `routes/api.php`.
- `POST /api/admin/login` (`admin-login`): 5 por minuto por e-mail + IP, e 20 por minuto por IP.
- `POST /api/order-status` (`order-status`): 60 por minuto por IP, além das 120 do grupo. O token vai no corpo, não na URL.

## Cabeçalhos de segurança

Toda resposta HTTP (páginas e API) envia `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

Content-Security-Policy fica de fora por enquanto: no desenvolvimento o Vite serve o script em outra origem (`localhost:5173`) e um CSP restrito quebraria o hot reload. Na rodada de produção, com HTTPS, vale publicar um CSP que permita só a origem do site e ligar `Strict-Transport-Security` (HSTS). HSTS não entra nesta etapa.

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

## Validação

Texto livre do admin (categoria, produto, descrição, tamanho, acréscimo, nome da forma de pagamento, nome do motoboy) aceita letras, números, espaço e pontuação simples. Rejeita `<`, `>`, caracteres invisíveis e espaços repetidos. A descrição pode ter quebra de linha.

Limites: categoria 60; produto 80; descrição 500; tamanho 40 (até 10 por produto, sem nome repetido); acréscimo 60; nome da forma de pagamento 40; e-mail de login 254; senha de login 128. Preço de 0 a 9999,99, com no máximo 2 casas. Minutos de entrega e retirada: inteiro de 0 a 600. Horário em `HH:MM`.

Pedido: nome com pelo menos 2 letras (até 80); telefone com DDD de 11 a 99, fixo de 10 dígitos ou celular de 11 começando com 9; endereço de 5 a 180; até 30 itens; quantidade de 1 a 50; até 10 acréscimos por item; observação até 180. Troco só no dinheiro, até 9999,99, e não pode ser menor que o total. O total é calculado no servidor, em centavos.

Filtros inválidos (`status`, `type`, `only_active`, `category_id`, `from`, `to`) respondem 422. Id de rota inexistente responde 404 ("Registro não encontrado.").

`GET /api/products?only_active=1` devolve só produtos ativos que tenham ao menos um tamanho ativo, e só esses tamanhos. `GET /api/add-ons?only_active=1` devolve só acréscimos ativos. Pedido com tamanho ou acréscimo inativo responde 422. Faixa de entrega com raio repetido responde 422 ("Já existe uma faixa com esse raio"). Mudança de status, motoboy ou impressão do pedido roda em transação com lock na linha.

## Regras de exclusão

- **Produto e categoria:** exclusão só se nunca tiveram venda. Com venda, a resposta é 422 e a loja inativa (produto, ou todos os produtos da categoria).
- **Tamanho:** tem `is_active` (padrão ativo). Na edição do produto, um tamanho omitido é removido só se nunca vendeu; com venda, a edição responde 422 e a loja só pode desativar. `can_delete` é falso quando já houve venda.
- **Acréscimo:** tem `is_active` (padrão ativo) e `PATCH /api/add-ons/{id}/availability`. `DELETE` só passa se nunca teve venda; com venda, 422 e `can_delete` é falso.
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
