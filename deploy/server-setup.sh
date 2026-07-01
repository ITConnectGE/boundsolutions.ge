#!/usr/bin/env bash
# One-shot deploy for boundsolutions.ge on the server (Ubuntu + nginx + PHP-FPM + MySQL).
# Run as root from the repo root:  cd /srv/bound && bash deploy/server-setup.sh
# Idempotent: safe to re-run after a `git pull`.
set -euo pipefail

ROOT=/srv/bound
BE="$ROOT/backend"

echo "==> [1/5] Backend dependencies (composer)"
cd "$BE"
if [ ! -f vendor/autoload.php ]; then
  COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader
else
  echo "    vendor/ present — skipping composer install"
fi

echo "==> [2/5] Environment + database migrate"
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
DB_PREFIX=bs_
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
ENVEOF
fi
# Always keep APP_URL correct for the single-domain setup.
sed -i 's|^APP_URL=.*|APP_URL=https://boundsolutions.ge|' .env
grep -q '^APP_KEY=base64' .env || php artisan key:generate --force
php artisan migrate --seed --force
php artisan storage:link 2>/dev/null || true
chown -R www-data:www-data storage bootstrap/cache
php artisan config:cache

echo "==> [3/5] Node.js"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "    node $(node -v)"

echo "==> [4/5] Build frontend (VITE_API_BASE=/api)"
cd "$ROOT"
echo "VITE_API_BASE=/api" > .env.production
rm -rf node_modules/.vite-temp node_modules/.vite
npm ci
npm run build
test -f dist/index.html && echo "    dist/index.html OK"

echo "==> [5/5] nginx vhost"
cp deploy/nginx-boundsolutions.conf /etc/nginx/sites-available/boundsolutions
ln -sf /etc/nginx/sites-available/boundsolutions /etc/nginx/sites-enabled/boundsolutions
nginx -t
systemctl reload nginx

echo ""
echo "=================================================="
echo " DONE. Local API test (should print JSON):"
curl -s -H "Host: boundsolutions.ge" http://127.0.0.1/api/vacancies | head -c 200; echo
echo ""
echo " Next — enable HTTPS:"
echo "   certbot --nginx -d boundsolutions.ge -d www.boundsolutions.ge"
echo "=================================================="
