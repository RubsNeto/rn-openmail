# RN OpenMail — VPS installation contract for AI agents

This file is the authoritative runbook for an AI coding agent asked to install or upgrade RN OpenMail on a VPS. Read it completely before running commands. Repository instructions closer to a changed file may add constraints, but must never weaken the safety rules below.

## Objective

Install the stable RN OpenMail interface over an existing, healthy **mailcow: dockerized** deployment, validate it, and return evidence. RN OpenMail is a frontend integration only. It must not alter mail transport, stored messages, databases, DNS, certificates, spam policy, mailbox contents or mailcow credentials.

## Required input

Obtain or safely discover:

- the SSH host/session already authorized by the operator;
- the absolute mailcow root, normally `/opt/mailcow-dockerized`;
- the public HTTPS mail URL, such as `https://mail.example.com`;
- the desired public brand, company, default login domain and internal-directory label;
- the release to install. Use the latest non-prerelease GitHub release unless the operator pins one.

Never request that secrets be pasted into chat, committed to Git, or printed in command output. Use the operator's existing SSH authentication. Do not read or display private keys, `.env`, certificates, mailbox data, database dumps or the contents of `mailcow.conf`.

## Non-negotiable safety rules

1. Start with read-only discovery. Resolve every path to an absolute path and refuse `/`, a home directory or an unverified computed path.
2. Confirm the target contains both `mailcow.conf` and `docker-compose.yml` before installation. Checking that the files exist is sufficient; do not print their contents.
3. Require a clean, healthy baseline: Docker responds, `docker compose config --quiet` passes, and the affected services are running.
4. Do not use `git reset --hard`, destructive recursive deletion, broad globs, `docker compose down`, volume removal or database commands.
5. Do not overwrite an unrelated `docker-compose.override.yml`. Stop and report the manual merge requirement printed by the installer.
6. Use only the repository's `scripts/install.sh`, `scripts/validate.sh` and `scripts/rollback.sh` for mutations. Do not copy files into mailcow by hand.
7. Preserve the backup path printed by the installer. Never delete RN OpenMail backups or `data/web/img/rn-profile-photos`.
8. Restart only what the installer manages: `sogo-mailcow` and `memcached-mailcow`. A wider restart requires explicit operator approval.
9. If installation or validation fails, use the exact backup produced by that attempt and run rollback. Do not improvise a repair that expands scope.
10. Redact hostnames, usernames, addresses and identifiers from public logs or issues. Report sensitive operational details only to the operator.

## Installation procedure

Commands below run on the VPS. Replace the example URL and paths only with values verified for that VPS.

### 1. Read-only preflight

```bash
set -Eeuo pipefail
mailcow_root=/opt/mailcow-dockerized
test -d "$mailcow_root"
test -f "$mailcow_root/mailcow.conf"
test -f "$mailcow_root/docker-compose.yml"
command -v git
command -v docker
command -v curl
command -v python3
cd "$mailcow_root"
docker compose config --quiet
docker compose ps
```

Do not continue if the baseline is unhealthy. Report the failing check without exposing configuration values.

### 2. Obtain a stable release

Use `/opt/rn-openmail` unless the operator specifies another dedicated directory. If it already exists, preserve local work: inspect `git status`, remote and current ref. Never discard changes.

```bash
install_root=/opt/rn-openmail
if test -d "$install_root/.git"; then
  cd "$install_root"
  git status --short
  test -z "$(git status --porcelain)"
  git fetch --tags --prune origin
else
  git clone https://github.com/RubsNeto/rn-openmail.git "$install_root"
  cd "$install_root"
fi

release_json="$(mktemp)"
trap 'rm -f -- "$release_json"' EXIT
curl --fail --silent --show-error --location \
  https://api.github.com/repos/RubsNeto/rn-openmail/releases/latest \
  --output "$release_json"
stable_tag="$(python3 -c 'import json,sys; data=json.load(sys.stdin); assert not data["draft"] and not data["prerelease"]; print(data["tag_name"])' < "$release_json")"
test -n "$stable_tag"
git switch --detach "$stable_tag"
git status --short
```

The API query above selects GitHub's latest published, non-prerelease release. If GitHub metadata cannot be checked, stop and report the limitation instead of installing an unverified branch.

### 3. Create local public configuration

`config/rn-config.js` is browser-visible and Git-ignored. It must contain no secrets.

```bash
cd /opt/rn-openmail
if ! test -f config/rn-config.js; then
  cp config/rn-config.example.js config/rn-config.js
  chmod 0600 config/rn-config.js
fi
```

Edit only these public values: `brand`, `company`, `defaultDomain`, `directoryLabel`, `logoUrl` and `adminDomainsLanding`. Keep the `RN_OPENMAIL_CONFIG` object valid JavaScript. Do not invent the organization's values; obtain them from the operator. Run:

```bash
if command -v node >/dev/null; then
  node --check config/rn-config.js
  node scripts/check-project.mjs
else
  printf 'Node.js is unavailable; record that local JavaScript checks were skipped.\n'
fi
```

### 4. Install with automatic backup

```bash
cd /opt/rn-openmail
sudo RN_OPENMAIL_ROOT=/opt/mailcow-dockerized \
  RN_OPENMAIL_CONFIG_FILE=/opt/rn-openmail/config/rn-config.js \
  ./scripts/install.sh
```

Capture the exact `Backup:` path from stdout. The installer owns backup creation, checksum generation, file placement, permissions and service recreation.

### 5. Validate

```bash
backup_dir=/opt/rn-openmail-backups/REPLACE_WITH_THE_PRINTED_DIRECTORY
sudo RN_OPENMAIL_ROOT=/opt/mailcow-dockerized \
  RN_OPENMAIL_URL=https://mail.example.com \
  ./scripts/validate.sh "$backup_dir"
```

Validation must pass local files, Compose configuration, service state, PHP syntax, profile-photo permissions, public assets, unauthenticated endpoint protection and backup checksum. Then perform the manual smoke checks from `docs/INSTALLATION.md` using an authorized account; never expose credentials or mailbox content in screenshots or logs.

### 6. Roll back on failure

If installation does not automatically roll back, or any required validation fails:

```bash
sudo RN_OPENMAIL_ROOT=/opt/mailcow-dockerized \
  RN_OPENMAIL_BACKUP_ROOT=/opt/rn-openmail-backups \
  ./scripts/rollback.sh "$backup_dir"
```

Run the read-only baseline checks again after rollback. Stop and request operator direction if rollback fails; do not perform broader recovery actions.

## Required final report

Return a concise report containing:

- installed RN OpenMail tag and commit SHA;
- verified mailcow root and public URL, redacted if the report is public;
- backup directory and checksum result;
- installer and validator result;
- state of `sogo-mailcow`, `memcached-mailcow`, `nginx-mailcow` and `php-fpm-mailcow`;
- manual smoke checks completed or still requiring the operator;
- whether rollback ran and its result;
- any deviations, warnings or follow-up work.

Never claim success if validation or required smoke checks were skipped. Never include tokens, passwords, configuration contents, message data or private keys in the report.
