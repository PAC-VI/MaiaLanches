# Publicando o Maia Lanches em uma VPS da Hostinger

Guia passo a passo para colocar o site no ar com Docker, domínio próprio e HTTPS.

**Como fica a arquitetura em produção** (tudo na mesma VPS):

```
Internet ──► Caddy (portas 80/443, HTTPS automático)
                 ├─ arquivos estáticos (React compilado, imagens)
                 └─ PHP-FPM (Laravel: páginas Inertia + API) ──► MySQL (só rede interna)

Agendador (schedule:work) ──► aceita pedidos novos automaticamente, a cada minuto
```

Só o Caddy fica exposto na internet. O MySQL e o PHP não têm porta publicada.
O **agendador** é obrigatório: é ele que passa os pedidos de "novo" para "em preparo" (o painel não faz esse passo).
O Vite (servidor de desenvolvimento) **não** roda em produção: o front é compilado uma vez na construção da imagem.

**Tempo estimado:** 1 a 2 horas na primeira vez (a maior parte é esperar o DNS e o primeiro build).

---

## Parte 1 — Preparar o repositório (no seu computador)

### 1.1 Adicionar e substituir arquivos

Copie para a **raiz do repositório** (mantendo as pastas). Todos são **novos**, exceto os dois marcados como "substitui":

| Arquivo | Para que serve |
|---|---|
| `Dockerfile.prod` | Compila o React e monta as imagens `app` (PHP-FPM) e `web` (Caddy) |
| `docker-compose.prod.yml` | Sobe MySQL + app + agendador + Caddy (sem Vite, sem phpMyAdmin) |
| `docker/Caddyfile` | HTTPS automático + roteamento para o PHP |
| `docker/entrypoint.prod.sh` | Roda as migrations, carrega os dados básicos e inicia o PHP-FPM |
| `.env.production.example` | Modelo do `.env` da VPS (sem segredos) |
| `scripts/create-admin.sh` | Cria o usuário do painel com a senha que você escolher |
| `scripts/backup-db.sh` | Backup diário do banco |
| `vite.config.js` | **Substitui** o atual (veja 1.2) |
| `.gitattributes` | **Substitui** o atual (só acrescenta Caddyfile e Dockerfile*) |

O `docker-compose.yml` e o `Dockerfile` atuais continuam existindo: eles são o ambiente de **desenvolvimento** e não mudam.

### 1.2 Sobre o `vite.config.js`

O arquivo atual manda o `npm run build` baixar a fonte "Instrument Sans" da Bunny Fonts, que o projeto **não usa** (a fonte do site é a Plus Jakarta Sans, carregada pelo `globalStyles.js`). A versão do pacote remove só essa parte e mantém todo o resto (inclusive o `cors: true`).

### 1.3 O que já está certo na sua branch (não precisa mexer)

- **Fuso horário:** o `config/app.php` já usa `America/Sao_Paulo` por padrão.
- **Painel protegido:** o grupo `/admin` em `routes/web.php` e as rotas de escrita da API já exigem login.
- **Agendador:** o `routes/console.php` já agenda o `orders:auto-accept`; o `docker-compose.prod.yml` já traz o serviço que o executa.

### 1.4 Commit e push

```bash
git add Dockerfile.prod docker-compose.prod.yml docker/ scripts/ .env.production.example .gitattributes vite.config.js
git commit -m "Configuração de produção (Docker + Caddy)"
git push
```

> Nunca faça commit de um arquivo `.env` com senhas. O `.gitignore` já ignora `.env`.

---

## Parte 2 — Contratar e preparar a VPS

### 2.1 Contratar

1. Na Hostinger, contrate uma **VPS KVM 1** (1 vCPU, 4 GB de RAM, 50 GB) — suficiente para este projeto.
2. Escolha o sistema **Ubuntu 24.04 com Docker** (modelo pronto) e, se aparecer a opção, o datacenter mais próximo do Brasil.
3. Defina a senha do usuário `root` e anote o **endereço IP** da VPS.

> O preço promocional costuma exigir pagamento adiantado de 24 meses, e a renovação é mais cara. Confira o valor e a política de cancelamento antes de pagar.

### 2.2 Apontar o domínio para a VPS (ou usar `IP.sslip.io`, sem domínio)

Sem domínio próprio, use `SEU_IP.sslip.io` (por exemplo, `189.24.9.78.sslip.io`) como `APP_DOMAIN`: ele já aponta para o IP e o Caddy emite o HTTPS nele.


No painel de DNS de onde o domínio está registrado (Registro.br, Hostinger, Cloudflare...), crie:

| Tipo | Nome | Valor |
|---|---|---|
| `A` | `@` (o domínio raiz) | o IP da VPS |

- Se usar o **Cloudflare**, deixe o registro em **"Somente DNS"** (nuvem cinza) pelo menos até o HTTPS funcionar.
- A propagação leva de poucos minutos a algumas horas. Para conferir, no seu computador:

  ```bash
  nslookup seudominio.com.br
  ```

  O resultado deve mostrar o IP da VPS. **Só continue quando isso estiver certo**, senão o certificado HTTPS não é emitido.

### 2.3 Primeiro acesso e segurança básica

```bash
ssh root@IP_DA_VPS
```

Atualize o sistema e ligue o firewall liberando só SSH, HTTP e HTTPS:

```bash
apt update && apt upgrade -y
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
```

(O painel da Hostinger também tem um firewall próprio. Se usar, libere as mesmas portas.)

Se a VPS tiver só **1 GB de RAM**, crie um swap para não travar durante o build:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Parte 3 — Subir o projeto

### 3.1 Baixar o código

```bash
git clone https://github.com/PAC-VI/maialanches.git /opt/maialanches
cd /opt/maialanches
```

Se o repositório for **privado**, o `git clone` pedirá usuário e senha: use seu usuário do GitHub e, como senha, um **Personal Access Token** (GitHub → Settings → Developer settings → Tokens, com permissão de leitura do repositório).

Se precisar de uma branch específica: `git clone -b NOME_DA_BRANCH ...`.

### 3.2 Criar o `.env` da VPS

```bash
cp .env.production.example .env

# gera a chave da aplicação e as senhas do banco automaticamente
sed -i "s|^APP_KEY=.*|APP_KEY=base64:$(openssl rand -base64 32)|" .env
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 16)|" .env
sed -i "s|^DB_ROOT_PASSWORD=.*|DB_ROOT_PASSWORD=$(openssl rand -hex 16)|" .env

nano .env     # troque APP_DOMAIN e preencha os dados da loja e a chave do Google (veja 3.2.1)
```

No `nano`: `Ctrl+O`, Enter para salvar e `Ctrl+X` para sair.

Guarde uma cópia das senhas do `.env` em um gerenciador de senhas.

### 3.2.1 Frete por distância e autocomplete de endereço (Google Maps)

O cálculo do frete e o autocomplete de rua usam a **Google Routes API** e a **Places API (New)**, chamadas só pelo servidor. No `.env`, preencha:

| Variável | O que colocar |
|---|---|
| `STORE_LAT` e `STORE_LNG` | Coordenadas da loja. No Google Maps, clique com o botão direito no local e copie os dois números. |
| `STORE_CITY` e `STORE_STATE` | Cidade e estado da loja (o estado pode ser a sigla, como `SC`). O sistema só aceita endereços dessa cidade. |
| `GOOGLE_MAPS_API_KEY` | A chave que você cria abaixo. |

Como criar a chave (os nomes dos menus podem variar um pouco):

1. Acesse o [Google Cloud Console](https://console.cloud.google.com), crie um projeto (por exemplo, `maialanches`) e vincule uma **conta de faturamento**. O Google exige um cartão, mas o código foi pensado para ficar dentro do nível gratuito (tetos de 8.000 chamadas por mês em cada API). Confira os limites atuais na tabela de preços do Google Maps Platform.
2. Em **APIs e serviços → Biblioteca**, ative **Routes API** e **Places API (New)**.
3. Em **APIs e serviços → Credenciais**, crie uma **chave de API** e edite-a:
   - **Restrições de aplicativo:** endereços IP → o IP da sua VPS (`189.24.9.78`).
   - **Restrições de API:** só **Routes API** e **Places API (New)**.
4. Copie a chave para `GOOGLE_MAPS_API_KEY="..."` no `.env`.
5. (Recomendado) Crie um **alerta de orçamento** no faturamento para ser avisado se o uso subir.

Sem essa configuração, o site abre e a **retirada** continua possível, mas o cálculo de **entrega** fica indisponível (o log mostra "Cotação de entrega indisponível"). Se mudar o `.env` depois, aplique com `docker compose up -d`.

### 3.3 Subir os containers

```bash
docker compose up -d --build
```

A primeira vez demora (5 a 10 minutos): ele compila o React, instala o Composer e baixa as imagens.
Acompanhe:

```bash
docker compose logs -f app web
```

Deu certo quando o `app` mostrar `Migrations aplicadas` e `Iniciando PHP-FPM`, e o `web` mostrar que obteve o certificado do seu domínio. Saia dos logs com `Ctrl+C` (os containers continuam rodando).

> O `.env` já tem `COMPOSE_FILE=docker-compose.prod.yml`, por isso **não** precisa de `-f` nos comandos, desde que você esteja na pasta `/opt/maialanches`.

### 3.4 Criar o usuário do painel

```bash
chmod +x scripts/*.sh
./scripts/create-admin.sh
```

Digite nome, e-mail e uma senha forte (mínimo de 10 caracteres). Esse é o login do `/admin/login`.
Rode de novo com o mesmo e-mail para **trocar a senha** de um usuário existente.

> O usuário de teste `fernanda@maialanches.test` / `password` (do `DatabaseSeeder`) **não é criado** em produção: o sistema só carrega as formas de pagamento e os horários padrão. Não rode `db:seed` sem `--class=`, porque ele criaria esse usuário com senha pública.

### 3.5 Dados iniciais

O banco nasce **vazio** e, a cada subida, o sistema carrega sozinho (sem sobrescrever o que você editar) as **formas de pagamento** (Pix, crédito, débito, dinheiro) e os **horários de funcionamento** padrão. Ajuste os horários e o restante pelo painel.

Para ter um cardápio de demonstração (X-Bacon, Dog Frango, zonas de entrega, acréscimos), **só na primeira vez** (ele também reescreve os tempos de entrega e retirada da loja):

```bash
docker compose exec app php artisan db:seed --class=CatalogSeeder --force
```

Para o cardápio real, cadastre os produtos pelo painel.

---

## Parte 4 — Testar

No navegador:

- `https://seudominio.com.br/` → home com o cardápio
- `https://seudominio.com.br/admin/login` → faça login
- `https://seudominio.com.br/api/store-settings` → deve mostrar um JSON
- `https://seudominio.com.br/up` → página de saúde do Laravel

Teste o **autocomplete de endereço e o frete** em um pedido de entrega. Faça um **pedido de teste** pelo celular e confira se ele aparece no painel e em "Meus Pedidos". Depois de cerca de 3 minutos ele deve passar sozinho de "novo" para "em preparo" (é o agendador trabalhando).
Confira também o consumo de memória:

```bash
docker stats --no-stream
```

---

## Parte 5 — Dia a dia

**Atualizar o site depois de um novo `git push`:**

```bash
cd /opt/maialanches
git pull
docker compose up -d --build
```

As migrations novas rodam sozinhas ao iniciar. O banco não é apagado.

**Backup diário do banco (às 4h):**

```bash
crontab -e
# adicione a linha:
0 4 * * * /opt/maialanches/scripts/backup-db.sh >> /var/log/maia-backup.log 2>&1
```

Os backups ficam em `/opt/maialanches/backups` (últimos 14 dias). Baixe uma cópia de vez em quando para o seu computador, porque um backup na mesma máquina não protege contra a perda da VPS:

```bash
scp root@IP_DA_VPS:/opt/maialanches/backups/*.sql.gz .
```

**Restaurar um backup:**

```bash
gunzip -c backups/ARQUIVO.sql.gz | docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

**Comandos úteis:**

```bash
docker compose ps                  # situação dos containers
docker compose logs -f app         # logs do Laravel
docker compose logs -f scheduler   # logs do aceite automático de pedidos
docker compose restart app         # reinicia só o app
docker compose down                # para tudo (mantém o banco)
```

> **Nunca** rode `docker compose down -v`: o `-v` apaga o volume do banco e os certificados.

---

## Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| Site não abre / certificado não emitido | DNS ainda não aponta para a VPS, ou as portas 80/443 estão bloqueadas (firewall da Hostinger ou `ufw`). Veja `docker compose logs web`. Com Cloudflare, use "Somente DNS". |
| Erro 502 | O container `app` caiu. Veja `docker compose logs app`. |
| Pedidos ficam parados em "novo" | O agendador não está rodando. Veja `docker compose ps` (o `scheduler` deve estar `Up`) e `docker compose logs scheduler`. |
| `web` ou `scheduler` não iniciam | Eles esperam o `app` ficar "healthy" (migrations aplicadas). Veja `docker compose logs app` para achar o erro da migration. |
| Erro 500 | `APP_KEY` vazia no `.env`, ou falha no banco. Veja `docker compose logs app`. |
| "Vite manifest not found" | O build do front falhou, ou o `public/hot` foi para a imagem. Rode `docker compose build --no-cache web app`. |
| `set: Illegal option -` | Quebra de linha CRLF (Windows) em um `.sh`. O `.gitattributes` resolve para quem clonar de novo. |
| Troquei a senha do banco no `.env` e deu erro de acesso | O MySQL só lê essas senhas na **primeira** criação do volume. Troque a senha dentro do MySQL, ou (só se ainda não houver dados) apague o volume. |
| `docker compose` diz que não há arquivo | Você não está em `/opt/maialanches`, ou o `.env` não tem a linha `COMPOSE_FILE`. |
| O build trava ou é morto | Pouca memória: crie o swap (2.3) ou use um plano com mais RAM. |

---

## Checklist de segurança antes de divulgar o site

- [ ] `APP_DEBUG=false` e `APP_ENV=production` (já definidos no compose)
- [ ] Usuário `fernanda@maialanches.test` / `password` **não** existe (3.4). Confira na tabela `users`
- [ ] Portas 3306 e 8080 **não** estão abertas (`ufw status` e `docker compose ps`)
- [ ] `.env` fora do GitHub, com cópia das senhas guardada
- [ ] Backup agendado e testado (restaure uma vez para ter certeza)
- [ ] `docker compose ps` mostra `mysql`, `app`, `scheduler` e `web` rodando
- [ ] Domínio com HTTPS funcionando (cadeado no navegador)
