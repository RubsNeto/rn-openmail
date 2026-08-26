# Contributing

Thanks for helping improve RN Mail Theme.

## Before you start

- Use [GitHub Discussions](https://github.com/RubsNeto/rn-mail-theme/discussions) for questions and proposals that are not yet actionable.
- Search existing issues before opening a new one.
- Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), never in a public issue.
- Keep production credentials, domains, customer data and mailcow configuration out of issues, screenshots and commits.

## Development workflow

1. Fork the repository and create a focused branch from `main`.
2. Copy `config/rn-config.example.js` to `config/rn-config.js` for local testing. The local file is ignored by Git.
3. Serve the repository root locally and open `preview/index.html`.
4. Run `node scripts/check-project.mjs` and `bash -n scripts/*.sh`.
5. Submit a pull request describing the problem, the change and how it was verified.

Please keep changes small, accessible and compatible with the current mailcow/SOGo DOM. If a selector depends on an upstream version, document it in the pull request.

By contributing, you agree that your contribution is licensed under the license applicable to the files you change. See [NOTICE.md](NOTICE.md).
