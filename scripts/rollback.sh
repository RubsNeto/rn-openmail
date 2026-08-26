#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
set -Eeuo pipefail

mail_root_input="${RN_MAIL_ROOT:-/opt/mailcow-dockerized}"
backup_root_input="${RN_MAIL_BACKUP_ROOT:-/opt/rn-mail-theme-backups}"
backup_input="${1:-}"

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "${EUID}" -eq 0 ]] || die 'run as root (sudo)'
[[ -n "${backup_input}" ]] || die 'usage: rollback.sh /path/to/backup-directory'
[[ -d "${mail_root_input}" ]] || die "mailcow root not found: ${mail_root_input}"
[[ -d "${backup_root_input}" ]] || die "backup root not found: ${backup_root_input}"
[[ -d "${backup_input}" ]] || die "backup directory not found: ${backup_input}"

mail_root="$(cd "${mail_root_input}" && pwd -P)"
backup_root="$(cd "${backup_root_input}" && pwd -P)"
backup_dir="$(cd "${backup_input}" && pwd -P)"
[[ "${mail_root}" != '/' ]] || die 'refusing to use / as RN_MAIL_ROOT'
case "${backup_dir}" in
  "${backup_root}"/*) ;;
  *) die "backup must be located below ${backup_root}" ;;
esac

[[ -s "${backup_dir}/interface-before.tgz" ]] || die 'backup archive is missing'
[[ -s "${backup_dir}/SHA256SUMS" ]] || die 'backup checksum is missing'
[[ -f "${backup_dir}/MISSING_PATHS" ]] || die 'missing-path manifest is missing'
(cd "${backup_dir}" && sha256sum --check SHA256SUMS)

if tar -tzf "${backup_dir}/interface-before.tgz" | awk '
  /^\// { bad=1 }
  /(^|\/)\.\.($|\/)/ { bad=1 }
  END { exit bad ? 0 : 1 }
'; then
  die 'unsafe path found in backup archive'
fi

allowed_paths='|docker-compose.override.yml|data/web/css/build/0081-rn-suite.css|data/web/js/build/098-rn-config.js|data/web/js/build/099-rn-suite.js|data/web/rn-profile-photo.php|data/web/img/rn-logo.png|data/web/img/rn-glow.svg|data/web/fonts/rn-montserrat.woff2|data/web/favicon.png|data/conf/sogo/custom-theme.css|data/conf/sogo/custom-theme.js|data/conf/sogo/custom-sogo.js|data/conf/sogo/custom-favicon.ico|data/conf/sogo/custom-fulllogo.svg|data/conf/sogo/custom-fulllogo.png|data/conf/sogo/custom-shortlogo.svg|data/conf/sogo/rn-icon.png|data/conf/sogo/rn-glow.svg|data/conf/sogo/rn-montserrat.woff2|data/conf/sogo/rn-material-symbols-outlined.woff2|'

cd "${mail_root}"
while IFS= read -r relative_path; do
  [[ -n "${relative_path}" ]] || continue
  case "${allowed_paths}" in
    *"|${relative_path}|"*) rm -f -- "${relative_path}" ;;
    *) die "unexpected path in MISSING_PATHS: ${relative_path}" ;;
  esac
done < "${backup_dir}/MISSING_PATHS"

tar -xzf "${backup_dir}/interface-before.tgz"
docker compose config --quiet
docker compose up -d --force-recreate --no-deps sogo-mailcow
docker compose restart memcached-mailcow
printf 'Rollback completed from %s\n' "${backup_dir}"
