#!/bin/bash
# Backup do banco (mysqldump comprimido). Guarda os últimos 14 dias em ./backups
# Uso manual:  ./scripts/backup-db.sh
# Agendado (todo dia às 04:00):  crontab -e  ->
#   0 4 * * * /opt/maialanches/scripts/backup-db.sh >> /var/log/maia-backup.log 2>&1
set -e
cd "$(dirname "$0")/.."

mkdir -p backups
FILE="backups/maialanches-$(date +%F-%H%M).sql.gz"

docker compose exec -T mysql sh -c \
    'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines "$MYSQL_DATABASE"' \
    | gzip > "$FILE"

# Descarta backups com mais de 14 dias
find backups -name '*.sql.gz' -mtime +14 -delete

echo "Backup salvo em $FILE ($(du -h "$FILE" | cut -f1))"
