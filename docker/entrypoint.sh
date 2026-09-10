#!/bin/sh
set -e

cd /var/www

# 1. Garante que o .env existe (se você já tem um .env seu, ele não é sobrescrito)
if [ ! -f .env ]; then
    echo ">> Criando .env a partir do .env.example..."
    cp .env.example .env
fi

# 2. Garante que as dependências do Composer estão instaladas.
#    (Isso normalmente já vem pronto da imagem, mas roda de novo se o
#    volume do vendor estiver vazio, ex: primeira execução.)
if [ ! -d vendor ] || [ ! -f vendor/autoload.php ]; then
    echo ">> Instalando dependências do Composer..."
    composer install --no-interaction --optimize-autoloader
fi

# 3. Gera a APP_KEY se ainda não tiver uma definida.
if ! grep -q "^APP_KEY=base64:" .env; then
    echo ">> Gerando APP_KEY..."
    php artisan key:generate --force
fi

# 4. Espera o MySQL aceitar conexões e roda as migrations.
echo ">> Aguardando o banco de dados MySQL..."
until php artisan migrate --force; do
    echo ">> Banco ainda não está pronto, tentando novamente em 2s..."
    sleep 2
done

echo ">> Migrations aplicadas com sucesso."

# 5. Sobe o servidor PHP embutido diretamente. O router script
#    (vendor/.../Foundation/resources/server.php) espera que o diretório
#    de trabalho atual já seja "public/" (é isso que o `artisan serve`
#    faz por baixo dos panos: primeiro um chdir() pra "public", só depois
#    roda o `php -S`). Por isso fazemos o mesmo aqui, em vez de usar a
#    flag "-t public" (que NÃO muda o diretório de trabalho do processo).
cd public
exec php -d variables_order=EGPCS -S 0.0.0.0:8000 \
    ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
