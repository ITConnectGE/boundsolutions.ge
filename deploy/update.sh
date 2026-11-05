#!/usr/bin/env bash
# Lightweight redeploy - pulls latest main and rebuilds app code.
# Called by CI (.github/workflows/deploy.yml) on every push to main.
# For first-time provisioning (PHP/Node/nginx/SSL) use server-setup.sh instead.
set -euo pipefail

ROOT=/srv/bound
cd "$ROOT"

# The checkout is updated first, which rewrites this very file - and bash reads
# a script as it goes, so carrying on here would run a mix of both versions.
# Pull, then hand over to the version that was just checked out.
if [ "${UPDATE_REEXEC:-}" != "1" ]; then
  # Match the remote exactly (keeps untracked vendor/, node_modules/, .env).
  git fetch origin main
  git reset --hard origin/main
  sed -i 's/\r$//' deploy/*.sh deploy/*.conf 2>/dev/null || true
  UPDATE_REEXEC=1 exec bash "$ROOT/deploy/update.sh"
fi

# ---- Backend ----
cd "$ROOT/backend"
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:cache
chown -R www-data:www-data storage bootstrap/cache

# ---- Frontend ----
# Built into a staging folder, never straight into the live one: `vite build`
# empties its output directory first, so building in place left the site without
# its stylesheet for the ~20s of the build.
cd "$ROOT"
npm ci
rm -rf dist-next
BUILD_OUT=dist-next npm run build
test -f dist-next/index.html

node scripts/publish.mjs dist-next dist
rm -rf dist-next
chown -R www-data:www-data dist

# ---- Reload ----
# The PHP-FPM unit is found rather than hardcoded: its name carries the PHP
# version, and a version upgrade used to break the deploy at this line.
fpm=$(systemctl list-units --type=service --state=running --plain --no-legend 'php*-fpm.service' 2>/dev/null | awk '{print $1}' | head -1)
if [ -n "$fpm" ]; then
  systemctl reload "$fpm"
  echo "reloaded $fpm"
else
  echo "WARNING: no running php*-fpm unit found - the API may be served by an orphaned process; check 'systemctl list-units --all | grep php'"
fi
systemctl reload nginx

echo "Deployed $(git rev-parse --short HEAD) at $(date -u +%FT%TZ)"
