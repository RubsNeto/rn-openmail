# Changelog

All notable changes are documented here. This project follows [Semantic Versioning](https://semver.org/) and the structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.1.0] - 2026-08-26

### Added

- Focused Gmail-inspired message reader with back, reply and forward actions.
- Route-synchronous loading state that prevents the previous split view from flashing.
- Authenticated native profile-photo upload, circular crop, local storage and removal.
- Refined composer, recipient avatars and internal/external address guidance.
- Centered sidebar brand, compact inbox chrome and direct Preferences return action.

### Changed

- Local public configuration is now shared with the SOGo browser integration.
- Installer discovers the PHP-FPM UID/GID, validates photo storage and force-recreates SOGo after bind-mounted asset updates.
- Validation and rollback cover the new endpoint while preserving uploaded photos as user data.

### Security

- Profile images are MIME/dimension checked, re-encoded as JPEG and stripped of source metadata.
- Upload and deletion require an authenticated mailcow user session and same-origin mutation headers.

## [1.0.0] - 2026-08-26

### Added

- Complete responsive RN interface for mailcow login, user and administration areas.
- Domain management as the primary administrator destination.
- RN-themed SOGo webmail experience.
- Local configuration for brand, company, login domain, logo and admin landing behavior.
- Safe install, validation and rollback scripts with pre-change backups.
- Standalone administrator preview.
- CI, CodeQL, secret scanning and community health files.

[Unreleased]: https://github.com/RubsNeto/rn-mail-theme/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/RubsNeto/rn-mail-theme/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/RubsNeto/rn-mail-theme/releases/tag/v1.0.0
