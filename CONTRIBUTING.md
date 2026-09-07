# Contributing

Thanks for helping improve Cut Picture. Changes should keep image processing in
the browser, remain usable without an account, and preserve the simple upload,
preview, and download workflow.

## Set Up Locally

Install Node.js 22, then run:

```bash
nvm use
npm ci
npm run dev
```

Do not commit `dist/`, `coverage/`, `artifacts/`, or `node_modules/`.

## Make a Change

1. Create a focused branch from `main`.
2. Keep behavior changes small and add tests for user-visible logic.
3. Run `npm run format` and `npm run check`.
4. Update `CHANGELOG.md` when users or contributors will notice the change.
5. Open a pull request using the repository template.

CI checks formatting, lint, test coverage, locale consistency, and the
production build. All four coverage categories must remain at or above 80%.

## Translation Changes

Locale files are stored in `public/lang/<locale>.json`. When adding or changing
messages:

1. Update `defaultMessages` in `src/i18n.js` and `public/lang/en.json`.
2. Add the same key to every locale file.
3. Preserve placeholders exactly, including braces such as `{name}`.
4. Run `npm run validate:locales`.

Add a locale to `supportedLocales` only when its JSON file contains the full
message set. Use the language's native name in the selector.

## Code Style

- Use ES modules and browser-native APIs where practical.
- Keep deterministic logic in `src/core.js` so it can be tested without a DOM.
- Avoid network requests that could expose an uploaded image or its contents.
- Use semantic HTML and preserve keyboard and screen-reader behavior.
- Let Prettier format JavaScript, JSON, CSS, Markdown, and YAML.

## Reporting Problems

Use the issue templates for reproducible bugs and feature proposals. Report
security-sensitive findings privately as described in [SECURITY.md](SECURITY.md).
