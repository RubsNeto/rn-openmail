#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
set -Eeuo pipefail

mail_root_input="${RN_OPENMAIL_ROOT:-${RN_MAIL_ROOT:-/opt/mailcow-dockerized}}"
backup_input="${1:-}"
base_url="${RN_OPENMAIL_URL:-${RN_MAIL_URL:-}}"

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -d "${mail_root_input}" ]] || die "mailcow root not found: ${mail_root_input}"
mail_root="$(cd "${mail_root_input}" && pwd -P)"
[[ "${mail_root}" != '/' ]] || die 'refusing to use / as RN_OPENMAIL_ROOT'
cd "${mail_root}"

required_local=(
  data/web/css/build/0081-rn-suite.css
  data/web/js/build/098-rn-config.js
  data/web/js/build/099-rn-suite.js
  data/web/rn-profile-photo.php
  data/web/img/rn-logo.png
  data/conf/sogo/custom-theme.css
  data/conf/sogo/custom-sogo.js
)
for relative_path in "${required_local[@]}"; do
  [[ -s "${relative_path}" ]] || die "installed file missing: ${relative_path}"
done
[[ -d data/web/img/rn-profile-photos ]] || die 'profile-photo directory is missing'

grep -q 'SPDX-License-Identifier: GPL-3.0-only' data/web/css/build/0081-rn-suite.css
grep -Eq 'window\.RN_(OPENMAIL|MAIL)_CONFIG' data/web/js/build/098-rn-config.js
grep -q 'ADMIN_DOMAINS_LANDING' data/web/js/build/099-rn-suite.js
grep -q 'rn-mail-theme' data/conf/sogo/custom-sogo.js
grep -q 'function syncMessageRouteState' data/conf/sogo/custom-sogo.js
grep -q 'rn-message-loading' data/conf/sogo/custom-theme.css
grep -q 'rn_photo_same_origin' data/web/rn-profile-photo.php
docker compose exec -T php-fpm-mailcow php -l /web/rn-profile-photo.php >/dev/null
php_uid="$(docker compose exec -T php-fpm-mailcow id -u www-data)"
php_gid="$(docker compose exec -T php-fpm-mailcow id -g www-data)"
photo_owner="$(stat -c '%u:%g' data/web/img/rn-profile-photos)"
[[ "${photo_owner}" == "${php_uid}:${php_gid}" ]] || die "unexpected profile-photo directory owner: ${photo_owner}"
docker compose exec -T --user "${php_uid}:${php_gid}" php-fpm-mailcow test -w /web/img/rn-profile-photos
docker compose config --quiet

running_services="$(docker compose ps --status running --services)"
for service in sogo-mailcow memcached-mailcow nginx-mailcow php-fpm-mailcow; do
  grep -qx "${service}" <<< "${running_services}" || die "service is not running: ${service}"
done
printf 'Local files, Compose configuration and services: OK\n'

if [[ -n "${base_url}" ]]; then
  base_url="${base_url%/}"
  urls=(
    "${base_url}/"
    "${base_url}/css/build/0081-rn-suite.css"
    "${base_url}/js/build/098-rn-config.js"
    "${base_url}/js/build/099-rn-suite.js"
    "${base_url}/img/rn-logo.png"
    "${base_url}/SOGo.woa/WebServerResources/css/theme-default.css"
    "${base_url}/SOGo.woa/WebServerResources/js/custom-sogo.js"
  )
  for url in "${urls[@]}"; do
    status="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' "${url}")"
    [[ "${status}" == '200' ]] || die "unexpected HTTP ${status}: ${url}"
    printf '200 %s\n' "${url}"
  done

  photo_status="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' "${base_url}/rn-profile-photo.php")"
  [[ "${photo_status}" == '401' ]] || die "unexpected unauthenticated profile-photo HTTP ${photo_status}"
  printf '401 %s/rn-profile-photo.php (authentication required)\n' "${base_url}"
else
  printf 'Remote checks skipped. Set RN_OPENMAIL_URL=https://mail.example.com to enable them.\n'
fi

if [[ -n "${backup_input}" ]]; then
  [[ -d "${backup_input}" ]] || die "backup not found: ${backup_input}"
  (cd "${backup_input}" && sha256sum --check SHA256SUMS)
  if [[ -f "${backup_input}/compose-before.json" && -f "${backup_input}/compose-after.json" ]]; then
    printf 'Before/after Compose snapshots are present.\n'
  fi
fi

printf 'Recent SOGo errors (informational):\n'
docker compose logs --since 10m sogo-mailcow 2>&1 \
  | grep -Ei 'fatal|panic|permission denied|connection refused|failed' \
  | tail -n 30 || true
printf 'RN OpenMail validation passed.\n'
