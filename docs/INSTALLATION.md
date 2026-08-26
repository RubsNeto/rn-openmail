# Installation

RN Mail Theme changes interface files and restarts only the SOGo and memcached services. It does not modify mail data, mailcow databases, certificates or the mail transport topology. Even so, test on a staging instance first and keep an independent mailcow backup.

## Requirements

- A working Linux installation of mailcow: dockerized using Docker Compose v2.
- Root access to the mailcow host.
- `bash`, `tar`, `sha256sum`, `curl` and the Docker CLI.
- The standard mailcow PHP-FPM image with GD enabled (used to validate and re-encode profile photos).
- A clean copy of this repository on the host.

The theme depends on upstream HTML and Angular Material structure. Review [UPGRADING.md](UPGRADING.md) after every mailcow or SOGo upgrade.

## 1. Prepare local configuration

```bash
git clone https://github.com/RubsNeto/rn-mail-theme.git
cd rn-mail-theme
cp config/rn-config.example.js config/rn-config.js
editor config/rn-config.js
```

`config/rn-config.js` is ignored by Git. See [CONFIGURATION.md](CONFIGURATION.md).

## 2. Check an existing Compose override

The SOGo assets require the volume mounts in `examples/docker-compose.override.yml`.

- If the mailcow root has no `docker-compose.override.yml`, the installer creates it.
- If it was previously created by this project, the installer updates it.
- If it is your own file, the installer stops without changing anything. Merge the `sogo-mailcow` volumes from the example manually, keep the marker comment, then rerun.

Validate your merged file with `docker compose config --quiet` from the mailcow root.

## 3. Install

For the default `/opt/mailcow-dockerized` location:

```bash
sudo ./scripts/install.sh
```

For a different mailcow or backup location:

```bash
sudo RN_MAIL_ROOT=/srv/mailcow \
  RN_MAIL_BACKUP_ROOT=/srv/backups/rn-mail-theme \
  RN_MAIL_CONFIG_FILE="$PWD/config/rn-config.js" \
  ./scripts/install.sh
```

The installer validates every source file, records existing and previously missing paths, creates a checksum-protected backup, installs the assets, creates the private profile-photo directory with the PHP-FPM user, validates Compose, recreates `sogo-mailcow` and restarts `memcached-mailcow`. If a post-change command fails, it attempts an automatic rollback.

## 4. Validate

Use the backup path printed by the installer:

```bash
sudo RN_MAIL_URL=https://mail.example.com \
  ./scripts/validate.sh /opt/rn-mail-theme-backups/TIMESTAMP-v1.1.0
```

Without `RN_MAIL_URL`, the script performs only local file, Compose, service and backup checks.

Then verify manually:

- user login and domain completion;
- administrator login redirects to Domains when enabled;
- add/edit domain modal, mailboxes, aliases and quarantine;
- SOGo mailbox, message composer, calendar and logout;
- open a message and confirm that the inbox list never flashes beside the focused reader;
- Preferences return-to-mail action and profile-photo upload/crop/remove flow;
- internal recipient confirmation and external-address guidance in the composer;
- desktop and mobile navigation;
- browser console and network panel contain no new errors.

## Rollback

```bash
sudo ./scripts/rollback.sh /opt/rn-mail-theme-backups/TIMESTAMP-v1.1.0
```

Rollback accepts only a directory below `RN_MAIL_BACKUP_ROOT`, verifies SHA-256 and archive paths, restores previous files, removes files that did not exist before installation and restarts the affected services.

Uploaded profile photos are user data and are intentionally preserved by theme rollback. Back up `data/web/img/rn-profile-photos` with your normal mailcow backup policy before moving or removing the installation.
