#!/bin/sh
set -e

cd /var/www
rm -f /tmp/app-ready

# Espera o MySQL aceitar conexões e aplica as migrations.
echo ">> Aguardando o banco de dados e aplicando migrations..."
until php artisan migrate --force; do
    echo ">> Banco ainda não está pronto, tentando novamente em 3s..."
    sleep 3
done
echo ">> Migrations aplicadas."

# Dados de configuração que o sistema precisa para funcionar (formas de pagamento
# e horários de funcionamento padrão). São idempotentes (firstOrCreate): não
# sobrescrevem o que já foi editado no painel.
# NÃO rodamos "db:seed" inteiro: o DatabaseSeeder cria o usuário de teste
# fernanda@maialanches.test com a senha pública "password".
php artisan db:seed --class=PaymentMethodSeeder --force
php artisan db:seed --class=StoreHourSeeder --force

# Cache de configuração e de views (mais rápido em produção).
# Obs.: NÃO usamos route:cache porque as rotas em routes/web.php são closures.
php artisan config:cache
php artisan view:cache

# O php-fpm roda como www-data: garante que ele consiga escrever em storage/ e bootstrap/cache.
chown -R www-data:www-data storage bootstrap/cache

# Sinaliza para o Docker (healthcheck) que o app está pronto.
touch /tmp/app-ready

echo ">> Iniciando PHP-FPM..."
exec php-fpm
