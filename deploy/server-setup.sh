#!/usr/bin/env bash
# One-shot deploy for boundsolutions.ge (Ubuntu + nginx + PHP-FPM + MySQL).
# Run as root from the repo root:  cd /srv/bound && bash deploy/server-setup.sh
# Idempotent: safe to re-run after a `git pull`. Preserves the SSL certificate.
set -euo pipefail

ROOT=/srv/bound
BE="$ROOT/backend"

echo "==> [0/6] Ensure PHP 8.4 (Laravel 13 requires PHP >= 8.4)"
if ! command -v php8.4 >/dev/null 2>&1; then
  apt-get install -y software-properties-common
  add-apt-repository -y ppa:ondrej/php
  apt-get update
  apt-get install -y php8.4-fpm php8.4-mysql php8.4-mbstring php8.4-xml \
    php8.4-curl php8.4-bcmath php8.4-zip php8.4-gd php8.4-intl
fi
systemctl enable --now php8.4-fpm
# Make the CLI default PHP 8.4 so composer + artisan use it (WordPress keeps 8.3-fpm).
update-alternatives --install /usr/bin/php php /usr/bin/php8.4 84 2>/dev/null || true
update-alternatives --set php /usr/bin/php8.4 2>/dev/null || true
php -v | head -1

echo "==> [1/6] Backend dependencies (composer)"
cd "$BE"
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader

echo "==> [2/6] Environment + database migrate"
if [ ! -f .env ]; then
  read -rsp "    Enter MySQL password for user 'bound': " DBPASS; echo
  cat > .env <<ENVEOF
APP_NAME="Bound Solutions"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://boundsolutions.ge
LOG_LEVEL=error
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bound_solutions
DB_USERNAME=bound
DB_PASSWORD=${DBPASS}
DB_PREFIX=
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
ENVEOF
fi
sed -i 's|^APP_URL=.*|APP_URL=https://boundsolutions.ge|' .env
sed -i 's|^DB_PREFIX=.*|DB_PREFIX=|' .env   # dedicated DB - no table prefix
grep -q '^APP_KEY=base64' .env || php artisan key:generate --force
php artisan migrate --seed --force
php artisan storage:link 2>/dev/null || true
chown -R www-data:www-data storage bootstrap/cache
php artisan config:cache

echo "==> [3/6] Node.js"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "    node $(node -v)"

echo "==> [4/6] Build frontend (VITE_API_BASE=/api)"
cd "$ROOT"
echo "VITE_API_BASE=/api" > .env.production
rm -rf node_modules/.vite-temp node_modules/.vite
npm ci
npm run build
test -f dist/index.html && echo "    dist/index.html OK - served directly from /srv/bound/dist"
# Remove SPA files a previous version copied into backend/public (now unused).
rm -rf "$BE/public/assets" "$BE/public/images" "$BE/public/index.html" \
       "$BE/public/404.html" "$BE/public/sitemap.xml"

echo "==> [5/6] nginx vhost"
cp deploy/nginx-boundsolutions.conf /etc/nginx/sites-available/boundsolutions
ln -sf /etc/nginx/sites-available/boundsolutions /etc/nginx/sites-enabled/boundsolutions
nginx -t
systemctl reload nginx

echo "==> [6/6] Re-apply SSL (if a certificate already exists)"
if [ -d /etc/letsencrypt/live/boundsolutions.ge ]; then
  certbot --nginx -d boundsolutions.ge -d www.boundsolutions.ge \
    --reinstall --redirect --non-interactive 2>/dev/null || \
    echo "    (could not auto-reinstall SSL - run: certbot --nginx -d boundsolutions.ge -d www.boundsolutions.ge)"
  systemctl reload nginx
fi

echo ""
echo "=================================================="
echo " DONE. Local API test (should print JSON):"
curl -sk --resolve boundsolutions.ge:443:127.0.0.1 https://boundsolutions.ge/api/vacancies | head -c 200; echo
echo "=================================================="
echo " Open: https://boundsolutions.ge   (admin: /admin  nino@gmail.com / Tbilisi1!)"
