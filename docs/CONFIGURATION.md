# Configuration

Copy `config/rn-config.example.js` to `config/rn-config.js`. The installer places it before the main theme script in mailcow's JavaScript build directory.

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

`RN_MAIL_CONFIG` remains a supported legacy alias for upgrades from releases before 1.2.0. New configurations should use `RN_OPENMAIL_CONFIG`.

| Option | Purpose |
| --- | --- |
| `brand` | Product name used in page titles and visible mailcow branding. |
| `company` | Company name used in login copy, logo alternatives and footer. |
| `defaultDomain` | Appended when a user signs in with only the local part. Use an empty string to require a complete email address. |
| `directoryLabel` | Label shown for recipients found in your internal SOGo directory. |
| `logoUrl` | Browser path for the mailcow login and navigation logo. |
| `adminDomainsLanding` | Redirects the first administrator dashboard visit in a session to domain management. |

Do not put secrets in this file: it is sent to every visitor's browser.

## Replacing the RN OpenMail brand

Replace the files in `assets/brand/` with equivalents using the same file names and formats, or change `logoUrl` for the mailcow interface. Keep reasonable dimensions and transparent backgrounds.

The installer prepends the same local configuration to SOGo's `custom-sogo.js`, so `brand`, `company`, `defaultDomain` and `directoryLabel` are shared by mailcow and webmail. For a derivative brand, replace the assets while preserving SPDX and upstream license notices.

## Interface behavior

The domain-first administrator experience is controlled by `adminDomainsLanding`. The direct **Domains** navigation item remains available throughout the administrator area. Set the option to `false` if your operators should land on mailcow's standard dashboard.

The theme intentionally keeps mailcow's technical identifiers inside data tables, code blocks and editable content. This reduces the risk of changing values that the upstream interface or administrators need.

## Profile photos and recipient checks

Profile photos are stored on your own host in `data/web/img/rn-profile-photos`. The endpoint accepts only authenticated same-origin requests, validates JPEG/PNG/WebP input, re-encodes a square JPEG and strips source metadata. Do not expose this directory through a shared or public filesystem.

The composer can confirm internal recipients returned by SOGo's directory and validate the syntax of external addresses. It cannot prove that an external Gmail or other mailbox exists before delivery; only the destination server can make that determination.
