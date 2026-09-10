FROM php:8.4-fpm

# Dependências de sistema + extensões PHP necessárias pro Laravel + MySQL
RUN apt-get update && apt-get install -y \
        git \
        curl \
        unzip \
        zip \
        libpng-dev \
        libonig-dev \
        libxml2-dev \
        libzip-dev \
    && docker-php-ext-install \
        pdo \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
    && rm -rf /var/lib/apt/lists/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copia o código (em dev o volume do compose sobrescreve isso, mas ajuda no build)
COPY . .

# Sem --no-dev: precisamos do Faker (fakerphp/faker) para os seeders em ambiente local.
RUN composer install --no-interaction --optimize-autoloader || true

RUN chmod +x docker/entrypoint.sh

EXPOSE 8000

# Usamos "sh" explicitamente (em vez de confiar no bit de execução do
# arquivo) porque no Windows um bind mount pode não preservar essa
# permissão.
ENTRYPOINT ["sh", "docker/entrypoint.sh"]

