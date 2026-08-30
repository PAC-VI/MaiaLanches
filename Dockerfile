FROM php:8.3-fpm

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

RUN composer install --no-interaction --optimize-autoloader --no-dev || true

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
