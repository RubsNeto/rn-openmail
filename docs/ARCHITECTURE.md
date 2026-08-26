# Architecture

RN Mail Theme is a presentation and browser-behavior layer over an existing mailcow: dockerized installation.

```text
browser
├── mailcow PHP interface
│   ├── 0081-rn-suite.css
│   ├── 098-rn-config.js
│   ├── 099-rn-suite.js
│   └── rn-profile-photo.php
└── SOGo interface
    ├── custom-theme.css / custom-theme.js
    ├── custom-sogo.js
    └── mounted fonts and brand assets
```

The numbered mailcow files use the upstream build directories so configuration loads before behavior. During installation, the same public configuration is prepended to SOGo's browser script. The SOGo override mounts only theme resources into the container.

`rn-profile-photo.php` is the only server-side feature added by the theme. It reuses mailcow's authenticated user session, enforces same-origin mutations and stores re-encoded JPEGs under `data/web/img/rn-profile-photos`. It does not proxy authentication, inspect messages or replace any mail backend service.

The installer owns only the paths listed in `scripts/install.sh`. Before changing them it archives existing content and records which paths did not exist. That manifest makes rollback deterministic without touching unrelated files. The profile-photo storage directory is deliberately excluded from rollback because it contains user data.

The focused message reader derives its critical layout state directly from the SOGo hash route. This hides the inbox before asynchronous message rendering begins and neutralizes upstream split-view transitions, avoiding a flash of the previous layout. A static, geometry-matched loading card is used until the message DOM is ready.

Because selectors and browser behavior integrate with upstream markup, compatibility is verified through local checks plus manual smoke testing. CI can prove project integrity and syntax, but it cannot replace testing against the exact mailcow/SOGo version you operate.
