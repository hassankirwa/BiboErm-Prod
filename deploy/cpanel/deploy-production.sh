#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/home/biboco/bibo-erm"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DOCROOT="/home/biboco/public_html/erp.bibo.co.ke"
PHP_BIN="/opt/cpanel/ea-php82/root/usr/bin/php"
NODE_BIN_DIR="/opt/cpanel/ea-nodejs22/bin"
COMPOSER_BIN="/usr/local/bin/composer"

export HOME="/home/biboco"
export PATH="$NODE_BIN_DIR:/usr/local/bin:/usr/bin:/bin"
export NODE_ENV="production"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "Missing $BACKEND_DIR/.env" >&2
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/.env.production" ]]; then
  echo "Missing $FRONTEND_DIR/.env.production" >&2
  exit 1
fi

mkdir -p "$DOCROOT"

cd "$BACKEND_DIR"
"$PHP_BIN" -d allow_url_fopen=1 "$COMPOSER_BIN" install \
  --no-dev \
  --no-interaction \
  --prefer-dist \
  --optimize-autoloader

"$PHP_BIN" artisan down --retry=60 || true

restore_application() {
  "$PHP_BIN" "$BACKEND_DIR/artisan" up || true
}
trap restore_application EXIT

cd "$FRONTEND_DIR"
npm ci --include=dev --no-audit --no-fund
npm run build

cd "$BACKEND_DIR"
"$PHP_BIN" artisan optimize:clear
"$PHP_BIN" artisan migrate --force
"$PHP_BIN" artisan permission:cache-reset || true

rsync --archive --delete \
  --exclude='.htaccess' \
  --exclude='.user.ini' \
  --exclude='index.php' \
  --exclude='media' \
  --exclude='media.packaged' \
  --exclude='php.ini' \
  --exclude='storage' \
  "$BACKEND_DIR/public/" "$DOCROOT/"

install -m 0644 "$APP_DIR/deploy/cpanel/public-index.php" "$DOCROOT/index.php"
install -m 0644 "$APP_DIR/deploy/cpanel/public-htaccess" "$DOCROOT/.htaccess"

ln -sfn /home/biboco/bibo-storage/public "$DOCROOT/media"
ln -sfn "$BACKEND_DIR/storage/app/public" "$DOCROOT/storage"

"$PHP_BIN" artisan optimize

sudo -n /bin/systemctl restart bibo-frontend.service
sudo -n /bin/systemctl restart bibo-queue.service

"$PHP_BIN" artisan up
trap - EXIT

/bin/systemctl is-active --quiet bibo-frontend.service
/bin/systemctl is-active --quiet bibo-queue.service
curl --fail --silent --show-error --max-time 20 \
  --retry 6 --retry-all-errors --retry-delay 2 \
  --resolve erp.bibo.co.ke:443:148.113.245.80 \
  https://erp.bibo.co.ke/up > /dev/null

echo "Production deployment completed successfully."
