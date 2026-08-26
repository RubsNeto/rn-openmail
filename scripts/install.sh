#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "${script_dir}/.." && pwd -P)"
mail_root_input="${RN_OPENMAIL_ROOT:-${RN_MAIL_ROOT:-/opt/mailcow-dockerized}}"
backup_root="${RN_OPENMAIL_BACKUP_ROOT:-${RN_MAIL_BACKUP_ROOT:-/opt/rn-openmail-backups}}"
config_file="${RN_OPENMAIL_CONFIG_FILE:-${RN_MAIL_CONFIG_FILE:-${repo_root}/config/rn-config.js}}"
backup_dir=""
mutation_started=0
sogo_script_tmp=""

cleanup_temp() {
  [[ -z "${sogo_script_tmp}" ]] || rm -f -- "${sogo_script_tmp}"
}
trap cleanup_temp EXIT

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || die 'run as root (sudo) so ownership and permissions are preserved'
[[ -d "${mail_root_input}" ]] || die "mailcow root not found: ${mail_root_input}"
mail_root="$(cd "${mail_root_input}" && pwd -P)"
[[ "${mail_root}" != '/' ]] || die 'refusing to use / as RN_OPENMAIL_ROOT'
[[ -f "${mail_root}/mailcow.conf" ]] || die "mailcow.conf not found under ${mail_root}"
[[ -f "${mail_root}/docker-compose.yml" ]] || die "docker-compose.yml not found under ${mail_root}"
command -v docker >/dev/null || die 'docker is required'
command -v tar >/dev/null || die 'tar is required'
command -v sha256sum >/dev/null || die 'sha256sum is required'
[[ -s "${config_file}" ]] || die "configuration not found: copy config/rn-config.example.js to config/rn-config.js and edit it"
grep -Eq 'window\.RN_(OPENMAIL|MAIL)_CONFIG' "${config_file}" || die "invalid configuration file: ${config_file}"

required_files=(
  assets/brand/custom-favicon.ico
  assets/brand/custom-fulllogo.svg
  assets/brand/custom-shortlogo.svg
  assets/brand/rn-glow.svg
  assets/brand/rn-icon.png
  assets/brand/rn-logo.png
  assets/fonts/rn-material-symbols-outlined.woff2
  assets/fonts/rn-montserrat.woff2
  examples/docker-compose.override.yml
  src/mailcow/rn-suite.css
  src/mailcow/rn-suite.js
  src/mailcow/rn-profile-photo.php
  src/sogo/custom-sogo.js
  src/sogo/custom-theme.css
  src/sogo/custom-theme.js
)

for relative_path in "${required_files[@]}"; do
  [[ -s "${repo_root}/${relative_path}" ]] || die "required project file is missing: ${relative_path}"
done

override_target="${mail_root}/docker-compose.override.yml"
override_source="${repo_root}/examples/docker-compose.override.yml"
if [[ -e "${override_target}" ]] && ! cmp -s "${override_source}" "${override_target}"; then
  if ! grep -Eq 'rn-(openmail|mail-theme) managed example' "${override_target}"; then
    die "an unmanaged docker-compose.override.yml already exists; merge examples/docker-compose.override.yml into it manually"
  fi
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root}/${stamp}-v$(tr -d '[:space:]' < "${repo_root}/VERSION")"
install -d -m 0700 "${backup_dir}"

managed_paths=(
  docker-compose.override.yml
  data/web/css/build/0081-rn-suite.css
  data/web/js/build/098-rn-config.js
  data/web/js/build/099-rn-suite.js
  data/web/rn-profile-photo.php
  data/web/img/rn-logo.png
  data/web/img/rn-glow.svg
  data/web/fonts/rn-montserrat.woff2
  data/web/favicon.png
  data/conf/sogo/custom-theme.css
  data/conf/sogo/custom-theme.js
  data/conf/sogo/custom-sogo.js
  data/conf/sogo/custom-favicon.ico
  data/conf/sogo/custom-fulllogo.svg
  data/conf/sogo/custom-fulllogo.png
  data/conf/sogo/custom-shortlogo.svg
  data/conf/sogo/rn-icon.png
  data/conf/sogo/rn-glow.svg
  data/conf/sogo/rn-montserrat.woff2
  data/conf/sogo/rn-material-symbols-outlined.woff2
)

cd "${mail_root}"
php_uid="$(docker compose exec -T php-fpm-mailcow id -u www-data)" || die 'unable to resolve the PHP-FPM user id'
php_gid="$(docker compose exec -T php-fpm-mailcow id -g www-data)" || die 'unable to resolve the PHP-FPM group id'
[[ "${php_uid}" =~ ^[0-9]+$ && "${php_gid}" =~ ^[0-9]+$ ]] || die 'invalid PHP-FPM user or group id'

sogo_script_tmp="$(mktemp)"
chmod 0600 "${sogo_script_tmp}"
{
  printf '%s\n' '/* Local public configuration; do not store secrets here. */'
  cat "${config_file}"
  printf '\n'
  cat "${repo_root}/src/sogo/custom-sogo.js"
} > "${sogo_script_tmp}"

: > "${backup_dir}/EXISTING_PATHS"
: > "${backup_dir}/MISSING_PATHS"
for relative_path in "${managed_paths[@]}"; do
  if [[ -e "${relative_path}" ]]; then
    printf '%s\n' "${relative_path}" >> "${backup_dir}/EXISTING_PATHS"
  else
    printf '%s\n' "${relative_path}" >> "${backup_dir}/MISSING_PATHS"
  fi
done

tar -czf "${backup_dir}/interface-before.tgz" --files-from "${backup_dir}/EXISTING_PATHS"
sha256sum "${backup_dir}/interface-before.tgz" > "${backup_dir}/SHA256SUMS"
docker compose ps --format json > "${backup_dir}/compose-before.json" || true
if docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q '^active$'; then
  docker stack ls --format '{{.Name}}\t{{.Services}}' > "${backup_dir}/stacks-before.txt"
  docker service ls --format '{{.Name}}\t{{.Replicas}}\t{{.Image}}' > "${backup_dir}/services-before.txt"
else
  printf 'Docker Swarm is not active.\n' > "${backup_dir}/stacks-before.txt"
  printf 'Docker Swarm is not active.\n' > "${backup_dir}/services-before.txt"
fi
chmod 0600 "${backup_dir}"/*

rollback_on_error() {
  local status=$?
  trap - ERR
  if [[ "${mutation_started}" -eq 1 ]]; then
    printf 'Installation failed; restoring %s\n' "${backup_dir}" >&2
    RN_OPENMAIL_ROOT="${mail_root}" RN_OPENMAIL_BACKUP_ROOT="${backup_root}" \
      "${script_dir}/rollback.sh" "${backup_dir}" || \
      printf 'Automatic rollback also failed. Restore manually from %s\n' "${backup_dir}" >&2
  fi
  exit "${status}"
}
trap rollback_on_error ERR

mutation_started=1
install -d -m 0755 \
  data/web/css/build data/web/js/build data/web/img data/web/fonts data/conf/sogo
install -d -o "${php_uid}" -g "${php_gid}" -m 0750 data/web/img/rn-profile-photos

install -m 0644 "${repo_root}/src/mailcow/rn-suite.css" data/web/css/build/0081-rn-suite.css
install -m 0644 "${config_file}" data/web/js/build/098-rn-config.js
install -m 0644 "${repo_root}/src/mailcow/rn-suite.js" data/web/js/build/099-rn-suite.js
install -m 0644 "${repo_root}/src/mailcow/rn-profile-photo.php" data/web/rn-profile-photo.php
install -m 0644 "${repo_root}/assets/brand/rn-logo.png" data/web/img/rn-logo.png
install -m 0644 "${repo_root}/assets/brand/rn-glow.svg" data/web/img/rn-glow.svg
install -m 0644 "${repo_root}/assets/fonts/rn-montserrat.woff2" data/web/fonts/rn-montserrat.woff2
install -m 0644 "${repo_root}/assets/brand/rn-icon.png" data/web/favicon.png

install -m 0644 "${repo_root}/src/sogo/custom-theme.css" data/conf/sogo/custom-theme.css
install -m 0644 "${repo_root}/src/sogo/custom-theme.js" data/conf/sogo/custom-theme.js
install -m 0644 "${sogo_script_tmp}" data/conf/sogo/custom-sogo.js
install -m 0644 "${repo_root}/assets/brand/custom-favicon.ico" data/conf/sogo/custom-favicon.ico
install -m 0644 "${repo_root}/assets/brand/custom-fulllogo.svg" data/conf/sogo/custom-fulllogo.svg
install -m 0644 "${repo_root}/assets/brand/rn-logo.png" data/conf/sogo/custom-fulllogo.png
install -m 0644 "${repo_root}/assets/brand/custom-shortlogo.svg" data/conf/sogo/custom-shortlogo.svg
install -m 0644 "${repo_root}/assets/brand/rn-icon.png" data/conf/sogo/rn-icon.png
install -m 0644 "${repo_root}/assets/brand/rn-glow.svg" data/conf/sogo/rn-glow.svg
install -m 0644 "${repo_root}/assets/fonts/rn-montserrat.woff2" data/conf/sogo/rn-montserrat.woff2
install -m 0644 "${repo_root}/assets/fonts/rn-material-symbols-outlined.woff2" data/conf/sogo/rn-material-symbols-outlined.woff2
install -m 0644 "${override_source}" docker-compose.override.yml

docker compose config --quiet
# `install` replaces bind-mounted file inodes, so SOGo must be recreated to
# mount the new assets instead of retaining the previous version.
docker compose up -d --force-recreate --no-deps sogo-mailcow
docker compose restart memcached-mailcow
docker compose ps --format json > "${backup_dir}/compose-after.json" || true
chmod 0600 "${backup_dir}/compose-after.json"

mutation_started=0
trap - ERR
printf 'RN OpenMail installed successfully.\n'
printf 'Backup: %s\n' "${backup_dir}"
printf 'Validate: RN_OPENMAIL_URL=https://mail.example.com sudo -E %s/validate.sh %s\n' "${script_dir}" "${backup_dir}"
