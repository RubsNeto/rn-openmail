# Configuration

Copy `config/rn-config.example.js` to `config/rn-config.js`. The installer places it before the main theme script in mailcow's JavaScript build directory.

```js
window.RN_MAIL_CONFIG = Object.freeze({
  brand: 'RN Mail',
  company: 'Example Company',
  defaultDomain: 'example.com',
  logoUrl: '/img/rn-logo.png',
  adminDomainsLanding: true
});
```

| Option | Purpose |
| --- | --- |
| `brand` | Product name used in page titles and visible mailcow branding. |
| `company` | Company name used in login copy, logo alternatives and footer. |
| `defaultDomain` | Appended when a user signs in with only the local part. Use an empty string to require a complete email address. |
| `logoUrl` | Browser path for the mailcow login and navigation logo. |
| `adminDomainsLanding` | Redirects the first administrator dashboard visit in a session to domain management. |

Do not put secrets in this file: it is sent to every visitor's browser.

## Replacing the RN brand

Replace the files in `assets/brand/` with equivalents using the same file names and formats, or change `logoUrl` for the mailcow interface. Keep reasonable dimensions and transparent backgrounds.

The SOGo interface uses static assets and text from `assets/brand/` and `src/sogo/custom-sogo.js`. For a derivative brand, replace the assets and update the visible product/company strings in that file. Preserve its SPDX and upstream license notices.

## Interface behavior

The domain-first administrator experience is controlled by `adminDomainsLanding`. The direct **Domains** navigation item remains available throughout the administrator area. Set the option to `false` if your operators should land on mailcow's standard dashboard.

The theme intentionally keeps mailcow's technical identifiers inside data tables, code blocks and editable content. This reduces the risk of changing values that the upstream interface or administrators need.
