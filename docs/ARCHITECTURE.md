# Architecture

RN Mail Theme is a presentation and browser-behavior layer over an existing mailcow: dockerized installation.

```text
browser
├── mailcow PHP interface
│   ├── 0081-rn-suite.css
│   ├── 098-rn-config.js
│   └── 099-rn-suite.js
└── SOGo interface
    ├── custom-theme.css / custom-theme.js
    ├── custom-sogo.js
    └── mounted fonts and brand assets
```

The numbered mailcow files use the upstream build directories so configuration loads before behavior. The SOGo override mounts only theme resources into the container. The project does not proxy authentication, handle messages or replace any backend service.

The installer owns only the paths listed in `scripts/install.sh`. Before changing them it archives existing content and records which paths did not exist. That manifest makes rollback deterministic without touching unrelated files.

Because selectors and browser behavior integrate with upstream markup, compatibility is verified through local checks plus manual smoke testing. CI can prove project integrity and syntax, but it cannot replace testing against the exact mailcow/SOGo version you operate.
