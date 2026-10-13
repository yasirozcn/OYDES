#!/usr/bin/env bash
# Veritabanının sıkıştırılmış yedeğini deploy/yedek/ klasörüne alır; 14 günden eski yedekleri siler.
# sunucu-hazirla.sh bunu her gece 03:30'da çalıştırır. Elle: bash yedek-al.sh
# Geri yükleme (DİKKAT: mevcut veriyi yedektekiyle değiştirir):
#   gunzip -c yedek/izmirfen-TARIH.sql.gz | docker compose -f ../../infra/dev-db/docker-compose.yml exec -T db psql -U izmirfen_owner -d izmirfen
# pipefail: pg_dump başarısız olursa betik burada durur, eski yedekler silinmez.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p yedek
FILE="yedek/izmirfen-$(date +%Y%m%d-%H%M).sql.gz"
docker compose -f ../../infra/dev-db/docker-compose.yml exec -T db pg_dump -U izmirfen_owner -d izmirfen --clean --if-exists | gzip > "$FILE"
find yedek -name 'izmirfen-*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') Yedek alındı: $FILE ($(du -h "$FILE" | cut -f1))"
