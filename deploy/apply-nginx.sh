#!/usr/bin/env bash
# Install deploy/nginx-boundsolutions.conf on the server - safely.
#
#   sudo bash /srv/bound/deploy/apply-nginx.sh
#
# 1. backs up the live vhost
# 2. copies the repo config over it
# 3. re-installs the existing Let's Encrypt certificates for boundsolutions.ge
#    domains with --no-redirect: the config does its own single-hop canonical
#    redirect (http/www/missing slash -> https://boundsolutions.ge/<path>/), and
#    certbot's redirect would put an extra hop in front of it
# 4. nginx -t + reload, and on ANY failure restores the backup
# 5. prints a few origin-side redirect checks
#
# update.sh (run on every push) does NOT touch nginx; run this after changing the
# nginx config. Also called by server-setup.sh.
set -euo pipefail

ROOT=/srv/bound
SRC="$ROOT/deploy/nginx-boundsolutions.conf"
DEST=/etc/nginx/sites-available/boundsolutions
BACKUP="$DEST.bak-$(date -u +%Y%m%d-%H%M%S)"

restore() {
  echo "!! failed - restoring $BACKUP"
  if [ -f "$BACKUP" ]; then
    cp "$BACKUP" "$DEST"
    nginx -t && systemctl reload nginx && echo "   previous config restored and reloaded"
  fi
  exit 1
}
trap restore ERR

sed -i 's/\r$//' "$SRC"

if [ -f "$DEST" ]; then
  cp "$DEST" "$BACKUP"
  echo "==> backup: $BACKUP"
fi

echo "==> installing $SRC"
cp "$SRC" "$DEST"
ln -sf "$DEST" /etc/nginx/sites-enabled/boundsolutions
nginx -t

# Re-install every existing certificate whose names are all *.boundsolutions.ge
# (covers boundsolutions.ge + www and portal, however the lineages are split).
echo "==> SSL (existing certificates, no certbot redirect)"
for dir in /etc/letsencrypt/live/*/; do
  [ -f "$dir/cert.pem" ] || continue
  name=$(basename "$dir")
  names=$(openssl x509 -in "$dir/cert.pem" -noout -ext subjectAltName 2>/dev/null \
    | grep -o 'DNS:[^, ]*' | sed 's/^DNS://' || true)
  [ -n "$names" ] || continue

  args=()
  ours=1
  for d in $names; do
    case "$d" in
      boundsolutions.ge|*.boundsolutions.ge) args+=(-d "$d") ;;
      *) ours=0 ;;
    esac
  done
  [ "$ours" = 1 ] && [ ${#args[@]} -gt 0 ] || continue

  echo "    $name: ${names//$'\n'/ }"
  certbot --nginx --cert-name "$name" "${args[@]}" \
    --reinstall --no-redirect --non-interactive
done

# Safety net: every certificate the old config served must be back in place,
# otherwise https at the origin is gone (Cloudflare would answer 52x). Roll back.
if [ -f "$BACKUP" ]; then
  before=$(grep -c '^[[:space:]]*ssl_certificate ' "$BACKUP" || true)
  after=$(grep -c '^[[:space:]]*ssl_certificate ' "$DEST" || true)
  if [ "$after" -lt "$before" ]; then
    echo "!! only $after of $before ssl_certificate directives were re-installed"
    restore
  fi
fi

nginx -t
systemctl reload nginx
trap - ERR
echo "==> nginx reloaded"

# ---- Origin-side checks (no Cloudflare in between) ----
check() { # label, curl args...
  local label=$1; shift
  printf '    %-44s %s\n' "$label" "$(curl -s -o /dev/null -m 10 -w '%{http_code} %{redirect_url}' "$@" || echo 'ERR')"
}
echo "==> checks (expected in brackets)"
check "https /services/        [200]"                      -k --resolve boundsolutions.ge:443:127.0.0.1 https://boundsolutions.ge/services/
check "https /services         [301 .../services/]"        -k --resolve boundsolutions.ge:443:127.0.0.1 https://boundsolutions.ge/services
check "https www /about        [301 https://boundsolutions.ge/about/]" -k --resolve www.boundsolutions.ge:443:127.0.0.1 https://www.boundsolutions.ge/about
check "http www /blog/x        [301 https://boundsolutions.ge/blog/x/]" -H 'Host: www.boundsolutions.ge' http://127.0.0.1/blog/x
check "https /index.html       [301 https://boundsolutions.ge/]" -k --resolve boundsolutions.ge:443:127.0.0.1 https://boundsolutions.ge/index.html
check "https /sitemap.xml      [200]"                      -k --resolve boundsolutions.ge:443:127.0.0.1 https://boundsolutions.ge/sitemap.xml
check "https /sitemap-vacancies.xml [200]"                 -k --resolve boundsolutions.ge:443:127.0.0.1 https://boundsolutions.ge/sitemap-vacancies.xml
check "https /api/vacancies    [200]"                      -k --resolve boundsolutions.ge:443:127.0.0.1 https://boundsolutions.ge/api/vacancies
check "portal https /          [302 .../admin/login]"      -k --resolve portal.boundsolutions.ge:443:127.0.0.1 https://portal.boundsolutions.ge/
check "portal http /admin/login [301 https://portal...]"    -H 'Host: portal.boundsolutions.ge' http://127.0.0.1/admin/login
