<div align="center">
  <img src="assets/brand/rn-logo.png" alt="RN OpenMail" width="260">
  <h1>RN OpenMail</h1>
  <p>A modern, open-source webmail experience for mailcow and SOGo.</p>

  [![CI](https://github.com/RubsNeto/rn-openmail/actions/workflows/ci.yml/badge.svg)](https://github.com/RubsNeto/rn-openmail/actions/workflows/ci.yml)
  [![CodeQL](https://github.com/RubsNeto/rn-openmail/actions/workflows/codeql.yml/badge.svg)](https://github.com/RubsNeto/rn-openmail/actions/workflows/codeql.yml)
  [![Release](https://img.shields.io/github/v/release/RubsNeto/rn-openmail)](https://github.com/RubsNeto/rn-openmail/releases)
  [![License](https://img.shields.io/badge/license-GPL--3.0%20%2F%20GPL--2.0-blue)](NOTICE.md)

  [Português do Brasil](README.pt-BR.md)
</div>

RN OpenMail gives an existing **mailcow: dockerized** installation a complete RN-designed experience: sign-in, user pages, administrator navigation, domain operations and SOGo webmail. It is a frontend integration layer, not a mail server distribution, and does not change mail transport or stored messages.

> [!IMPORTANT]
> This is an independent community project. It is not affiliated with or endorsed by mailcow or SOGo.

## Highlights

- Domain management is the administrator's primary destination, with direct navigation and focused actions.
- Responsive navigation aligns with the content frame instead of stretching edge to edge.
- Consistent RN visual system across login, user/admin pages and SOGo.
- Gmail-inspired focused reader that hides the inbox list immediately, without flashing the previous split view.
- Native profile photos with authenticated local storage, circular crop, drag and zoom.
- Refined composer with clearer recipient suggestions and honest internal/external address guidance.
- Centered sidebar brand, compact search/list chrome and a direct route back from Preferences.
- Accessible page landmarks, skip link, labels, focus states and reduced-motion support.
- Configurable product name, company, default login domain, logo and admin landing behavior.
- Backup-first installer, post-install validation and checksum-protected rollback.
- Isolated preview that uses example data only.
- CI integrity checks, CodeQL, dependency updates and secret scanning.

## Preview

Serve the repository root so relative assets load correctly:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/preview/`. The preview is a static administrator-domain workspace; it never connects to mailcow.

## Quick start

```bash
git clone https://github.com/RubsNeto/rn-openmail.git
cd rn-openmail
cp config/rn-config.example.js config/rn-config.js
editor config/rn-config.js
sudo ./scripts/install.sh
```

The default mailcow location is `/opt/mailcow-dockerized`. Set `RN_OPENMAIL_ROOT`, `RN_OPENMAIL_BACKUP_ROOT` or `RN_OPENMAIL_CONFIG_FILE` when yours differs:

```bash
sudo RN_OPENMAIL_ROOT=/srv/mailcow \
  RN_OPENMAIL_BACKUP_ROOT=/srv/backups/rn-openmail \
  RN_OPENMAIL_CONFIG_FILE="$PWD/config/rn-config.js" \
  ./scripts/install.sh
```

The legacy `RN_MAIL_*` variables remain accepted for upgrades from versions before 1.2.0.

The installer stops before making changes if it finds an unrelated `docker-compose.override.yml`; merge the SOGo volumes from [`examples/docker-compose.override.yml`](examples/docker-compose.override.yml) first. Full prerequisites and the smoke-test checklist are in [Installation](docs/INSTALLATION.md).

## Install with an AI agent

[`AGENTS.md`](AGENTS.md) is a purpose-built VPS installation runbook for coding agents. It defines the allowed scope, mandatory preflight checks, backup and rollback rules, secret-handling requirements, commands to run and the evidence the agent must return.

Give the agent SSH access through your normal secure mechanism, tell it the mailcow path and public mail URL, then use a prompt like:

> Read `AGENTS.md` completely and install the current stable RN OpenMail release on my VPS. mailcow is in `/opt/mailcow-dockerized` and the public URL is `https://mail.example.com`. Preserve existing data and configuration, create a verified backup before changes, run the full validation, and roll back automatically if validation fails.

Do not paste private keys, passwords, API tokens or `mailcow.conf` into the prompt or repository. The agent should use an already-authorized SSH session and keep credentials outside command output.

## Configuration

Local settings live in `config/rn-config.js`, which Git ignores:

```js
window.RN_OPENMAIL_CONFIG = Object.freeze({
  brand: 'RN OpenMail',
  company: 'Example Company',
  defaultDomain: 'example.com',
  directoryLabel: 'Internal directory',
  logoUrl: '/img/rn-logo.png',
  adminDomainsLanding: true
});
```

An empty `defaultDomain` requires users to enter a complete email address. `directoryLabel` names confirmed internal recipients in SOGo. Set `adminDomainsLanding` to `false` to retain mailcow's normal administrator landing page. See [Configuration](docs/CONFIGURATION.md) for rebranding and SOGo details.

## Validate and roll back

The installer prints the new backup directory. Validate local services and public assets with:

```bash
sudo RN_OPENMAIL_URL=https://mail.example.com \
  ./scripts/validate.sh /opt/rn-openmail-backups/TIMESTAMP-v1.2.0
```

Restore the exact pre-install interface state with:

```bash
sudo ./scripts/rollback.sh /opt/rn-openmail-backups/TIMESTAMP-v1.2.0
```

Rollback verifies the backup checksum and archive paths, restores previous files and removes only theme files recorded as previously absent.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/mailcow/` | Complete mailcow CSS, browser behavior and authenticated profile-photo endpoint. |
| `src/sogo/` | SOGo theme and integration files. |
| `assets/` | RN marks and locally served fonts. |
| `config/` | Safe public configuration example. |
| `scripts/` | Install, validate, rollback and repository checks. |
| `preview/` | Static administrator preview with reserved example domains. |
| `docs/` | Installation, configuration, architecture and upgrade guidance. |
| `AGENTS.md` | Safety contract and deterministic VPS installation runbook for AI agents. |

Read [Architecture](docs/ARCHITECTURE.md) for integration boundaries and [Upgrading](docs/UPGRADING.md) before changing mailcow or SOGo versions.

## Compatibility and security

This project relies on upstream markup and static-resource locations, so test every mailcow/SOGo update in staging. CI checks syntax and repository hygiene but cannot reproduce every upstream deployment.

Never commit `mailcow.conf`, certificates, `.env` files, dumps, logs, customer data or `config/rn-config.js`. Report vulnerabilities privately through GitHub Security as described in [SECURITY.md](SECURITY.md).

## Contributing and support

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and use [Discussions](https://github.com/RubsNeto/rn-openmail/discussions) for usage questions. See [SUPPORT.md](SUPPORT.md) for the right reporting channel.

## License and marks

Original mailcow-facing code and project tooling are GPL-3.0-only. SOGo-derived theme/integration files are GPL-2.0-only. Bundled fonts retain their OFL-1.1 and Apache-2.0 licenses. See [NOTICE.md](NOTICE.md) and `LICENSES/` for the precise file map and full texts.

RN names and visual marks have separate usage terms in [TRADEMARKS.md](TRADEMARKS.md). Replace them when publishing a differently branded derivative.
