# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest `1.x` release | Yes |
| Older releases | No |

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** button on the repository Security page. This creates a private security advisory visible only to the maintainers.

Please include the affected version, impact, reproduction steps and any suggested mitigation. Remove domains, addresses, credentials, messages and customer data before attaching logs or screenshots.

Do not open a public issue for an unpatched vulnerability. We aim to acknowledge complete reports within seven days and will coordinate disclosure after a fix is available.

This theme modifies presentation and browser behavior; it does not replace mailcow or SOGo security controls. Keep both upstream products patched and review the generated backup before sharing it.

The profile-photo endpoint relies on mailcow's authenticated user session, same-origin browser headers, MIME/dimension checks and server-side JPEG re-encoding. Treat `data/web/img/rn-profile-photos` as private user data, include it in your backup/access-control policy and never publish its contents in bug reports.
