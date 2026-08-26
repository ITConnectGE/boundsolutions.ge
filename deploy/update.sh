#!/usr/bin/env bash
# Lightweight redeploy - pulls latest main and rebuilds app code.
# Called by CI (.github/workflows/deploy.yml) on every push to main.
# For first-time provisioning (PHP/Node/nginx/SSL) use server-setup.sh instead.
set -euo pipefail

ROOT=/srv/bound
cd "$ROOT"

# Match the remote exactly (keeps untracked vendor/, node_modules/, .env).
git fetch origin main
git reset --hard origin/main
sed -i 's/\r$//' deploy/*.sh deploy/*.conf 2>/dev/null || true

# ---- Backend ----
cd "$ROOT/backend"
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:cache
chown -R www-data:www-data storage bootstrap/cache

# ---- Frontend ----
cd "$ROOT"
npm ci
npm run build

# ---- Reload ----
systemctl reload php8.4-fpm
systemctl reload nginx

echo "Deployed $(git rev-parse --short HEAD) at $(date -u +%FT%TZ)"
