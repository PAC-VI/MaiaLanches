# Maia Lanches

Plataforma web de uma lanchonete: cardápio e pedido do cliente, e painel para produtos, pedidos, pagamentos, faixas de entrega, motoboys, horários, impressão e relatórios.

O sistema foi desenvolvido como parte do PAC VI. O Laravel entrega as páginas (Inertia) e a API na mesma origem.

## Stack

- **PHP 8.4** e **Laravel 13** — regras de negócio, sessão do admin e API.
- **React 19** (JSX, sem TypeScript) e **Inertia.js** — telas.
- **MySQL 8** — banco.
- **Docker** — PHP, MySQL, phpMyAdmin, o agendador e Vite (Node 22) em desenvolvimento.

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
| `scheduler` | sem porta; roda `php artisan schedule:work` |

O serviço `scheduler` usa a mesma imagem do `app` e, a cada minuto, executa `orders:auto-accept`. **Em produção o agendador é obrigatório.** Sem ele o pedido fica em `novo` e não passa sozinho para `em preparo`. No servidor, o cron é `* * * * * php /caminho/do/projeto/artisan schedule:run` (ou um processo contínuo equivalente ao `schedule:work`).

```bash
docker compose logs -f app
docker compose logs -f vite
docker compose exec app php artisan route:list
docker compose down
```

## Variáveis de ambiente

O modelo está em `.env.example`. Dentro do Docker, o Compose sobrescreve `DB_HOST=mysql` e a senha do banco.

- `APP_TIMEZONE` — fuso da loja. O padrão é `America/Sao_Paulo`. Filtro de pedido por dia, relatórios, horário “hoje” e o dia do motoboy usam esse fuso, não o UTC do relógio do servidor.
- `APP_LOCALE` e `APP_FALLBACK_LOCALE` — `pt_BR`. As mensagens de validação da API saem em português (`lang/pt_BR/validation.php`).
- `APP_URL` — origem do site (`http://localhost:8000` em dev).
- `STORE_NAME`, `STORE_DESCRIPTION`, `STORE_ADDRESS`, `STORE_CONTACT` — nome da loja, endereço e texto do modal de informações. Ficam em `config/store.php` e entram no `GET /api/store-settings` (`name`, `description`, `address`, `contact`). O cabeçalho, o rodapé e o `<title>` usam o nome. Não são editáveis no painel e não vão para o banco. `STORE_ADDRESS` é só esse texto: o frete não usa essa string.
- `STORE_LAT`, `STORE_LNG`, `STORE_CITY`, `STORE_STATE` — origem da rota e a cidade anexada ao endereço do cliente. Ver a seção Frete automático.
- `GOOGLE_MAPS_API_KEY` — chave da Routes API e da Places API (New), só no servidor (`config/services.php`). Nunca vai para o front, para o git nem para o log.
- `MAPS_LIMIT_AUTOCOMPLETE`, `MAPS_LIMIT_DETAILS`, `MAPS_LIMIT_ROUTES` — teto mensal de chamadas (padrão 8000, abaixo das 10.000 grátis). `0` desliga aquela chamada.
- `ORDER_AUTO_ACCEPT_MINUTES` — minutos em `novo` até o comando `orders:auto-accept` passar o pedido para `em preparo`. Fica em `config/orders.php`. O padrão é `3`. O painel não faz esse passo.
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
- `POST /api/delivery-quote` (`delivery-quote`): 20 por minuto e 100 por hora por IP, além das 120 do grupo.
- `GET` e `POST /api/address/suggest` (`address-suggest`): 30 por minuto e 300 por hora por IP. `POST /api/address/resolve` (`address-resolve`): 20 por minuto por IP. Acima disso, 429 "Muitas tentativas. Aguarde um minuto e tente de novo."
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

Datas de filtro (“hoje”, “ontem”, intervalo) usam o dia da loja em `APP_TIMEZONE`. `created_at` é `TIMESTAMP` e a sessão do MySQL fica em `-03:00`, então o dia do pedido no SQL é esse fuso.

`GET /api/admin/reports` agrega no servidor (padrão: últimos 30 dias, máximo 92). Cancelados não entram no faturamento nem na contagem de vendas. A resposta não inclui nome, telefone nem endereço.

## Frete automático

O checkout não pede região. A rua vem de uma sugestão da Places API (New) ou, se a pessoa não achar, é digitada. Com rua e número válidos o front chama `POST /api/delivery-quote` (debounce de cerca de 800 ms) e mostra a distância e a taxa. O bairro não entra nessa conta. O `POST /api/orders` não aceita taxa nem faixa: o servidor calcula de novo. Retirada fica com taxa zero e não consulta o Google. Se a Routes API falhar e não houver cache, o pedido não é criado (`503`). Não existe faixa padrão.

Há dois modos de endereço. No verificado, `POST /api/address/resolve` devolve um `address_token` assinado (30 minutos) com a rua e o bairro oficiais. A cotação e o pedido usam só esse token mais o número; rua ou bairro enviados pelo navegador são ignorados. No manual, a cotação recebe rua e número, e o pedido exige também o bairro digitado. Token inválido ou vencido responde 422 "Selecione o endereço novamente."

A distância é a rota de carro (`travelMode` DRIVE, `routingPreference` TRAFFIC_UNAWARE) entre `STORE_LAT`/`STORE_LNG` e `"{rua}, {número}, {cidade} - {estado}, Brasil"`. Número `S/N` sai da frase. A referência não entra. `distance_km` é `distanceMeters / 1000`, arredondado para cima em 2 casas. A faixa é a de menor `radius_km` que ainda cobre essa distância. O pedido grava rua, bairro, `delivery_fee`, `distance_km` e `delivery_zone_id` como snapshot e soma a taxa ao total em centavos. O repasse do motoboy é essa taxa inteira.

A rota pede só `routes.distanceMeters` e `geocodingResults.destination.partialMatch`. Sem polyline, rota alternativa ou `departureTime`, para permanecer na categoria **Essentials** (Compute Routes Essentials). Endereço com `partialMatch` ou sem rota responde 422. Fora da maior faixa, 422 com o raio máximo. Sem faixa cadastrada, 422. Cota, autenticação, timeout e resposta inesperada: 503, com o erro no log sem a chave. A cota estourada (429) fica identificada no log. Se o teto `MAPS_LIMIT_ROUTES` estourar, a resposta é 503 "Cálculo de entrega indisponível no momento." e nenhuma faixa é usada no lugar.

O sucesso (a distância) fica em cache por 24 horas. A chave é o hash de rua e número normalizados (minúsculas, espaços colapsados, número em maiúsculas) mais cidade e estado. O bairro não entra. Falha não entra no cache. A faixa e a taxa são lidas de novo a cada cotação. O pedido reaproveita a distância em cache. O resultado do Place Details não é guardado: os termos do Google não permitem cachear esse conteúdo. Só a distância da rota fica em cache.

A busca de rua é `POST /api/address/suggest`. Ela chama o Autocomplete (New) com `includedRegionCodes` `br`, `includedPrimaryTypes` `route` (tipo de rua da Table B), `languageCode` `pt-BR` e `locationBias` num raio de 20 km em volta da loja. A máscara pede só `placeId` e os textos da sugestão. A resposta pública é `{enabled, suggestions: [{place_id, main_text, secondary_text}]}`, no máximo 5. Se o Google falhar ou o teto `MAPS_LIMIT_AUTOCOMPLETE` estourar, a resposta é 200 `{enabled:false, suggestions:[]}` e o checkout passa para o endereço digitado. Nunca 500.

Ao escolher uma sugestão, `POST /api/address/resolve` chama Place Details (New) com a máscara `addressComponents` (SKU Place Details Essentials; sem `displayName`, fotos ou coordenadas). O `sessionToken` do autocomplete encerra a sessão nessa chamada. A rua é o componente `route`. O bairro é `sublocality_level_1`, `neighborhood` ou `sublocality`. Cidade e UF precisam bater com `STORE_CITY` e `STORE_STATE`; se não baterem, 422 "Esse endereço não é atendido por aqui". Sem bairro, 422 pedindo a opção "Não encontrei meu endereço". O teto `MAPS_LIMIT_DETAILS` desliga essa confirmação do mesmo jeito.

Cada chamada real ao Google soma 1 no contador mensal `maps-usage:{api}:{Y-m}` (fuso da loja, cache com validade até dois dias depois do fim do mês). A partir de 80% do teto, um aviso entra no log, sem a chave. O contador usa o `CACHE_STORE`. Se ele for `array` ou `null`, o contador passa para o cache em arquivo.

Variáveis: `GOOGLE_MAPS_API_KEY`, `STORE_LAT`, `STORE_LNG`, `STORE_CITY`, `STORE_STATE`, `MAPS_LIMIT_AUTOCOMPLETE`, `MAPS_LIMIT_DETAILS`, `MAPS_LIMIT_ROUTES`. `STORE_ADDRESS` continua só no modal de informações.

Como criar a chave: no Google Cloud, ative a **Routes API** e a **Places API (New)**. Crie uma chave e restrinja-a a essas duas APIs. A chamada sai do servidor, então restrinja por IP (restrição por referrer não vale). Defina uma cota diária e um orçamento com alerta no console, para um bug não passar do free tier. Autocomplete Requests, Place Details Essentials e Compute Routes Essentials têm 10.000 grátis por mês; os tetos do `.env` ficam em 8.000. Uma sessão (várias letras + um Place Details) agrupa o autocomplete pelo `sessionToken`: as primeiras chamadas contam como Autocomplete Requests e o Details encerra a sessão. A segunda cotação do mesmo rua+número em 24 h sai do cache e não conta de novo.

Cuidados com a chave: ela fica só no `.env` do servidor. Não commitar, não colocar em variável `VITE_`, não imprimir em log, resposta ou `public/build`. O token de endereço fica só na memória da tela, nunca no `localStorage`.

## Validação

Texto livre do admin (categoria, produto, descrição, tamanho, acréscimo, nome da forma de pagamento, nome do motoboy) aceita letras, números, espaço e pontuação simples. Rejeita `<`, `>`, caracteres invisíveis e espaços repetidos. A descrição do produto aceita quebra de linha: o servidor troca `\r\n` por `\n`, tira o espaço no fim de cada linha, reduz 3 ou mais quebras seguidas a no máximo 2 e corta em 500 caracteres, contando as quebras. No cardápio, o modal mostra a descrição inteira (`pre-line`) e o card limita a 3 linhas. O texto de `STORE_DESCRIPTION`, o endereço e o contato também preservam quebra de linha. A observação do item do pedido continua em uma linha.

Limites: categoria 60; produto 80; descrição 500; tamanho 40 (até 10 por produto, sem nome repetido); acréscimo 60; nome da forma de pagamento 40; e-mail de login 254; senha de login 128. Preço de 0 a 9999,99, com no máximo 2 casas. Minutos de entrega e retirada: inteiro de 0 a 600. Horário em `HH:MM`.

Pedido: nome com pelo menos 2 letras (até 80); telefone com DDD de 11 a 99, fixo de 10 dígitos ou celular de 11 começando com 9; endereço com rua, número e bairro; até 30 itens diferentes no carrinho e no pedido; quantidade de 1 a 50 por item; até 10 acréscimos por item e de 1 a 10 unidades de cada acréscimo, por unidade do lanche. O mesmo acréscimo em dois lanches diferentes é válido; repetido dentro do mesmo item responde 422. Observação até 180. Troco só no dinheiro, até 9999,99, e não pode ser menor que o total. O total é calculado no servidor, em centavos: unitário do item = tamanho + soma(preço do acréscimo × quantidade); total da linha = unitário × quantidade do item. O carrinho avisa, sem fechar o produto, quando já tem 30 linhas ou quando o item passaria de 50 unidades.

Filtros inválidos (`status`, `type`, `only_active`, `category_id`, `from`, `to`) respondem 422. Id de rota inexistente responde 404 ("Registro não encontrado.").

O pedido nasce `novo`. Depois de `ORDER_AUTO_ACCEPT_MINUTES` o agendador passa para `em preparo` (`orders:auto-accept`, todo minuto, com lock na linha). Rodar o comando de novo não altera o que já foi aceito, e pedido `cancelado` não entra. O `PATCH` manual de `novo` para `em preparo` responde 422. Continuam manuais: `em preparo` → `pronto`, `pronto` → `entregue`, e cancelar a partir de `novo`, `em preparo` ou `pronto`. No painel, o pedido `novo` mostra a contagem "Aceite automático em mm:ss" (a partir de `auto_accept_at`) e o botão de cancelar. "Meus pedidos" segue em "Novo" até a consulta de status trazer "Em preparo". A impressão continua listando o pedido `novo` em "Aguardando impressão".

`GET /api/products?only_active=1` devolve só produtos ativos que tenham ao menos um tamanho ativo, e só esses tamanhos. `GET /api/add-ons?only_active=1` devolve só acréscimos ativos, cada um com `category_ids`. Pedido com tamanho ou acréscimo inativo responde 422. Acréscimo que não pertence à categoria do produto também responde 422. Faixa de entrega com raio repetido responde 422 ("Já existe uma faixa com esse raio"). Mudança de status, motoboy ou impressão do pedido roda em transação com lock na linha.

## Regras de exclusão

- **Produto e categoria:** exclusão só se nunca tiveram venda. Com venda, a resposta é 422 e a loja inativa (produto, ou todos os produtos da categoria).
- **Tamanho:** tem `is_active` (padrão ativo). Na edição do produto, um tamanho omitido é removido só se nunca vendeu; com venda, a edição responde 422 e a loja só pode desativar. `can_delete` é falso quando já houve venda.
- **Acréscimo:** tem `is_active` (padrão ativo) e `PATCH /api/add-ons/{id}/availability`. `DELETE` só passa se nunca teve venda; com venda, 422 e `can_delete` é falso. No create e no update, `category_ids` é a lista das categorias em que ele aparece (ids existentes, sem repetir; vazio é válido e o acréscimo não entra em produto nenhum). O cardápio só oferece os acréscimos da categoria do produto, com quantidade de 0 a 10. No pedido, `items[].add_ons` é `[{id, quantity}]`. O `price` gravado em `order_item_add_ons` é o preço unitário; `quantity` (padrão 1 nos pedidos antigos) é por unidade do lanche. Se um acréscimo do carrinho ficar inativo, sumir ou deixar de valer para aquele produto, ele sai do item e o preço é recalculado. No banco novo, o seed liga bacon aos X-Burguers, cheddar aos X-Burguers e às Porções, e ovo aos X-Burguers e aos Dogs. Acréscimo que já existia antes da tabela `add_on_category` fica ligado a todas as categorias.
- **Ordem do cardápio:** `categories.sort_order` e `products.sort_order` (inteiro, índice). O GET ordena por `sort_order` e depois `id`. Acréscimos continuam em ordem alfabética. Item novo entra no fim. Produto mudado de categoria entra no fim da nova. `PUT /api/categories/reorder` e `PUT /api/categories/{id}/products/reorder` recebem a lista completa de ids; se o conjunto não for exatamente o atual, 422 "A lista mudou. Recarregue a página.". O painel de produtos tem botões de subir e descer.
- **Motoboy:** soft delete. O cadastro some da lista e o histórico do pedido permanece.
- **Faixa de entrega:** pode ser excluída.

## Pastas

- `app/` — controllers da API, models, services, form requests e resources
- `routes/web.php` — páginas Inertia; `routes/api.php` — API (o contrato, se a documentação divergir)
- `resources/js/pages` — telas; `components` — um par `.jsx` + `.css` por componente; `layouts`; `lib` — fetch, formato, erros
- `resources/styles/globalStyles.js` — tipografia e tokens
- `config/store.php` — descrição, endereço exibido, contato e origem do frete (`lat`, `lng`, `city`, `state`)
- `config/services.php` — `google_maps.key` e os tetos `limits`
- `config/orders.php` — minutos do aceite automático
- `app/Console/Commands` — `orders:auto-accept`
- `database/migrations` e `database/seeders`
- `docker/` — imagem PHP 8.4 e entrypoint. Antes de subir, cria `storage/framework/cache/data`, `storage/framework/sessions`, `storage/framework/views`, `storage/framework/testing`, `storage/logs`, `storage/app/public`, `storage/app/private` e `bootstrap/cache`, com permissão de escrita
- `storage/` e `bootstrap/cache/` — pastas versionadas só pelo `.gitignore` de cada uma (`*` e `!.gitignore`; `storage/app` também libera `private/` e `public/`; `storage/framework/cache` também libera `data/`). Views compiladas, cache de pacotes e logs não entram no git. O clone mantém as pastas porque o `.gitignore` está dentro delas

O mapa de cada rota (método, auth, throttle, payload) está em `mapa-de-rotas.md`.
