#!/usr/bin/env bash
# Veritabanının çalıştığı Lightsail (Ubuntu) sunucusunu AdminPanel için bir kez hazırlar: swap, saat dilimi, günlük yedek.
# Docker, veritabanı kurulumunda (infra/dev-db/README.md) zaten kurulmuştur; yoksa kurulur.
# Kullanım (sunucuda): cd ~/izmirfen/AdminPanel/deploy && bash sunucu-hazirla.sh
set -euo pipefail

# 1) 2 GB swap: küçük RAM'li makinede derleme (next build) bellek yetersizliğinden çökmesin.
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 2) Docker + compose eklentisi
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# 3) Saat dilimi
sudo timedatectl set-timezone Europe/Istanbul

# 4) Günlük veritabanı yedeği (03:30), son 14 gün tutulur: deploy/yedek/
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
CRON="30 3 * * * cd $DEPLOY_DIR && bash yedek-al.sh >> $DEPLOY_DIR/yedek/yedek.log 2>&1"
mkdir -p "$DEPLOY_DIR/yedek"
( crontab -l 2>/dev/null | grep -v yedek-al.sh ; echo "$CRON" ) | crontab -

echo "Hazır. Docker yeni kurulduysa grubun etkinleşmesi için oturumu kapatıp tekrar bağlanın (exit → yeniden SSH)."
