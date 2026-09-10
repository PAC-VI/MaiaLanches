-- ============================================================
-- Maia Lanches - Banco de dados completo, já populado
-- ============================================================
-- Este arquivo é executado AUTOMATICAMENTE pelo container do MySQL
-- na PRIMEIRA vez que ele sobe com um volume de dados vazio (é o
-- mecanismo oficial da imagem "mysql": tudo que está em
-- /docker-entrypoint-initdb.d/ dentro do container roda uma vez só,
-- na inicialização). Está montado assim no docker-compose.yml:
--
--   volumes:
--     - ./database/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
--
-- Isso cria todas as tabelas E já insere dados de exemplo (categorias,
-- produtos, tamanhos, acréscimos, zona de entrega, config da loja e um
-- usuário admin). Quem clonar o projeto e rodar `docker compose up`
-- pela primeira vez já recebe o banco pronto, sem precisar rodar
-- migrations nem seeders manualmente.
--
-- IMPORTANTE: só roda se o volume "mysql_data" estiver vazio (primeira
-- inicialização). Se você já tem um volume com dados antigos, ele NÃO
-- será executado de novo. Para forçar (ex: você mesmo, testando):
--
--   docker compose down -v   (apaga o volume atual do banco)
--   docker compose up -d --build
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- TABELA DE CONTROLE DE MIGRATIONS DO LARAVEL
-- ============================================================
-- Preenchida com todas as migrations do projeto já "marcadas" como
-- aplicadas, para que o `php artisan migrate` (que roda automaticamente
-- ao subir o container do app) não tente recriar essas tabelas e apenas
-- confirme "Nothing to migrate".

CREATE TABLE `migrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` VARCHAR(255) NOT NULL,
  `batch` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `migrations` (`migration`, `batch`) VALUES
  ('0001_01_01_000000_create_users_table', 1),
  ('0001_01_01_000001_create_cache_table', 1),
  ('0001_01_01_000002_create_jobs_table', 1),
  ('2026_08_16_000001_create_store_settings_table', 1),
  ('2026_08_16_000002_create_delivery_zones_table', 1),
  ('2026_08_16_000003_create_categories_table', 1),
  ('2026_08_16_000004_create_products_table', 1),
  ('2026_08_16_000005_create_product_sizes_table', 1),
  ('2026_08_16_000006_create_add_ons_table', 1),
  ('2026_08_16_000007_create_orders_table', 1),
  ('2026_08_16_000008_create_order_items_table', 1),
  ('2026_08_16_000009_create_order_item_add_ons_table', 1);

-- ============================================================
-- TABELAS PADRÃO DO LARAVEL (autenticação, sessão, filas)
-- ============================================================

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `password_reset_tokens` (
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `sessions` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `payload` LONGTEXT NOT NULL,
  `last_activity` INT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cache` (
  `key` VARCHAR(255) NOT NULL,
  `value` MEDIUMTEXT NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `cache_locks` (
  `key` VARCHAR(255) NOT NULL,
  `owner` VARCHAR(255) NOT NULL,
  `expiration` INT NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` VARCHAR(255) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `attempts` SMALLINT UNSIGNED NOT NULL,
  `reserved_at` INT UNSIGNED NULL,
  `available_at` INT UNSIGNED NOT NULL,
  `created_at` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `job_batches` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `total_jobs` INT NOT NULL,
  `pending_jobs` INT NOT NULL,
  `failed_jobs` INT NOT NULL,
  `failed_job_ids` LONGTEXT NOT NULL,
  `options` MEDIUMTEXT NULL,
  `cancelled_at` INT NULL,
  `created_at` INT NOT NULL,
  `finished_at` INT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `failed_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(255) NOT NULL,
  `connection` TEXT NOT NULL,
  `queue` TEXT NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `exception` LONGTEXT NOT NULL,
  `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 1. CONFIGURAÇÕES E ADMINISTRAÇÃO
-- ============================================================

CREATE TABLE `store_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `is_open` TINYINT(1) NOT NULL DEFAULT 0,
  `delivery_time_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
  `pickup_time_minutes` INT UNSIGNED NOT NULL DEFAULT 0,
  `current_daily_number` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_number_reset` DATE NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. LOGÍSTICA DE ENTREGAS
-- ============================================================

CREATE TABLE `delivery_zones` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `radius_km` DECIMAL(5,2) NOT NULL,
  `fee_amount` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. CATÁLOGO (CARDÁPIO)
-- ============================================================

CREATE TABLE `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `products_category_id_foreign` (`category_id`),
  CONSTRAINT `products_category_id_foreign`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `product_sizes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `size_name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_sizes_product_id_foreign` (`product_id`),
  CONSTRAINT `product_sizes_product_id_foreign`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `add_ons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `add_ons_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. PEDIDOS
-- ============================================================

CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `daily_number` INT UNSIGNED NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(255) NOT NULL,
  `type` VARCHAR(20) NOT NULL COMMENT 'delivery | pickup',
  `status` VARCHAR(20) NOT NULL DEFAULT 'novo' COMMENT 'novo | em_preparo | saiu_entrega | concluido',
  `payment_method` VARCHAR(20) NOT NULL COMMENT 'dinheiro | cartao | pix',
  `order_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `change_for` DECIMAL(10,2) NULL,
  `delivery_address` TEXT NULL,
  `delivery_fee` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `is_printed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orders_daily_number_index` (`daily_number`),
  KEY `orders_order_date_index` (`order_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_size_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  `observation` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_foreign` (`order_id`),
  KEY `order_items_product_size_id_foreign` (`product_size_id`),
  CONSTRAINT `order_items_order_id_foreign`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_size_id_foreign`
    FOREIGN KEY (`product_size_id`) REFERENCES `product_sizes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `order_item_add_ons` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_item_id` BIGINT UNSIGNED NOT NULL,
  `add_on_id` BIGINT UNSIGNED NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_item_add_ons_order_item_id_foreign` (`order_item_id`),
  KEY `order_item_add_ons_add_on_id_foreign` (`add_on_id`),
  CONSTRAINT `order_item_add_ons_order_item_id_foreign`
    FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_item_add_ons_add_on_id_foreign`
    FOREIGN KEY (`add_on_id`) REFERENCES `add_ons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DADOS DE EXEMPLO (equivalentes ao CatalogSeeder do Laravel)
-- ============================================================

-- Usuário admin do painel. Login: fernanda@maialanches.test / senha: password
INSERT INTO `users` (`id`, `name`, `email`, `password`, `created_at`, `updated_at`) VALUES
  (1, 'Fernanda', 'fernanda@maialanches.test',
   '$2b$10$bQylXQw/N4N.lA8lHjgO2OY17obZhZUGDw41WMTNU55ycHkyfuiq.',
   NOW(), NOW());

INSERT INTO `store_settings`
  (`id`, `is_open`, `delivery_time_minutes`, `pickup_time_minutes`, `current_daily_number`, `last_number_reset`, `created_at`, `updated_at`)
VALUES
  (1, 1, 40, 15, 0, NULL, NOW(), NOW());

INSERT INTO `delivery_zones` (`id`, `radius_km`, `fee_amount`, `created_at`, `updated_at`) VALUES
  (1, 2.00, 5.00, NOW(), NOW()),
  (2, 3.50, 8.00, NOW(), NOW());

INSERT INTO `add_ons` (`id`, `name`, `price`, `created_at`, `updated_at`) VALUES
  (1, 'Bacon Extra', 4.00, NOW(), NOW()),
  (2, 'Cheddar Extra', 3.50, NOW(), NOW()),
  (3, 'Ovo', 2.50, NOW(), NOW());

INSERT INTO `categories` (`id`, `name`, `created_at`, `updated_at`) VALUES
  (1, 'X-Burguers', NOW(), NOW()),
  (2, 'Dogs', NOW(), NOW()),
  (3, 'Porções', NOW(), NOW());

INSERT INTO `products` (`id`, `category_id`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
  (1, 1, 'X-Bacon', 'Pão, hambúrguer, queijo, bacon e maionese da casa.', 1, NOW(), NOW()),
  (2, 2, 'Dog Frango', 'Pão, salsicha, frango desfiado, milho e ervilha.', 1, NOW(), NOW()),
  (3, 3, 'Batata Frita', 'Porção de batata frita crocante.', 1, NOW(), NOW());

INSERT INTO `product_sizes` (`id`, `product_id`, `size_name`, `price`, `created_at`, `updated_at`) VALUES
  (1, 1, 'Único', 22.90, NOW(), NOW()),
  (2, 2, 'Único', 14.90, NOW(), NOW()),
  (3, 3, 'P', 12.00, NOW(), NOW()),
  (4, 3, 'G', 20.00, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
