# Upgrading

## Upgrade this theme

1. Read [CHANGELOG.md](../CHANGELOG.md) and the release notes.
2. Update the repository with `git pull --ff-only` or check out a signed/reviewed release tag.
3. Review changes to `examples/docker-compose.override.yml` and your local `config/rn-config.js`.
4. Run `node scripts/check-project.mjs` on a workstation.
5. Run `sudo ./scripts/install.sh` on staging, then `scripts/validate.sh` and the manual checklist in [INSTALLATION.md](INSTALLATION.md).
6. Repeat in production only after staging passes. Keep the newly printed backup path.

Each installation creates a separate timestamped backup; it does not overwrite earlier backups.

### From 1.0.x to 1.1.x

Version 1.1 adds the authenticated profile-photo endpoint and persistent storage directory. The installer creates the directory with the PHP-FPM UID/GID discovered from your running mailcow container and recreates SOGo so updated bind-mounted files are guaranteed to load. Existing theme backups remain valid; profile photos are user data and are not deleted by rollback.

## Upgrade mailcow or SOGo

Upstream updates can replace or restructure the DOM and static asset pipeline. Before a production upgrade:

1. Take the normal mailcow backup in addition to the theme backup.
2. Test the upstream update and current theme together on staging.
3. Verify login, administrator domains, mailbox/alias tabs, focused message reader, profile photo, SOGo composer/calendar and mobile navigation.
4. Inspect browser console errors and failed asset requests.
5. Re-run the theme installer if upstream maintenance removed build files.

If the interface is broken, use `scripts/rollback.sh` for theme-managed files. Follow mailcow's own rollback documentation for the upstream platform itself.

## Compatibility reports

When reporting an incompatibility, include the exact theme release, mailcow commit/version, SOGo version, browser and sanitized reproduction steps. Never attach `mailcow.conf`, private configuration, customer data or raw message content.
