# Cut Picture

[![CI](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/ci.yml/badge.svg)](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/ci.yml)
[![Deploy](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/deploy.yaml/badge.svg)](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/deploy.yaml)
[![Last commit](https://img.shields.io/github/last-commit/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture/commits/main)
[![Commit activity](https://img.shields.io/github/commit-activity/m/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture/graphs/commit-activity)
[![License](https://img.shields.io/github/license/doctorlai-msrc/cut-picture)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Code style: Prettier](https://img.shields.io/badge/code_style-Prettier-f7b93e.svg?logo=prettier)](https://prettier.io/)
[![Node.js 22.13+](https://img.shields.io/badge/Node.js-22.13%2B-339933?logo=nodedotjs&logoColor=white)](.nvmrc)
[![JavaScript](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fdoctorlai-msrc%2Fcut-picture%2Fbadges%2F.github%2Fbadges%2Fjavascript.json)](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/language-badge.yml)
[![Top language](https://img.shields.io/github/languages/top/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture)
[![Repository size](https://img.shields.io/github/repo-size/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture)
[![Stars](https://img.shields.io/github/stars/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture/stargazers)
[![Watchers](https://img.shields.io/github/watchers/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture/watchers)
[![Forks](https://img.shields.io/github/forks/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture/forks)
[![Open issues](https://img.shields.io/github/issues/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture/issues)
[![Open pull requests](https://img.shields.io/github/issues-pr/doctorlai-msrc/cut-picture)](https://github.com/doctorlai-msrc/cut-picture/pulls)
[![Privacy: local processing](https://img.shields.io/badge/privacy-local_processing-096b55)](PRIVACY.md)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/doctorlai-msrc/cut-picture)

Cut Picture splits an image into a precise row-by-column grid in the browser.
Preview each tile, download individual PNG files, or package the complete grid
into one ZIP. Images are processed locally and are never uploaded by the app.

**Live app:** <https://doctorlai-msrc.github.io/cut-picture/>

## Features

- File picker and drag-and-drop input for browser-supported image formats.
- Configurable 1–20 row and column grid with a one-click swap control.
- Pixel-complete slicing for dimensions that do not divide evenly.
- Individual PNG downloads or one ZIP containing every named tile.
- Automatic grid clamping for images smaller than the selected grid.
- Persistent grid, language, and light/dark theme preferences.
- Responsive keyboard-accessible interface with RTL language support.
- 25 interface languages, including Simplified and Traditional Chinese.
- Release date and commit revision shown in the deployed interface.

## Use

1. Open the [live app](https://doctorlai-msrc.github.io/cut-picture/).
2. Drop an image onto the upload area or choose one with the file picker.
3. Set the row and column counts. The preview updates automatically.
4. Download one tile or select **Download all as ZIP**.

Large source images and grids use more browser memory because every tile is
held locally while the ZIP is created. The grid is capped at 20 × 20.

### Share Settings

The address bar updates when the language or grid changes, so the current setup
can be shared as a link:

```text
https://doctorlai-msrc.github.io/cut-picture/?lang=zh-CN&width=4&height=3
```

`width` is the number of columns and `height` is the number of rows. Each value
is limited to 1–20. URL values take precedence over the corresponding browser
preference; omitted or invalid parameters fall back to local storage. Other
query parameters and URL fragments are preserved.

## Languages

The interface supports Arabic, Bengali, Chinese (Simplified and Traditional),
Dutch, English, Filipino, French, German, Hindi, Indonesian, Italian, Japanese,
Korean, Persian, Polish, Portuguese (Brazil), Punjabi, Russian, Spanish,
Swahili, Thai, Turkish, Ukrainian, and Vietnamese.

Translations live in [`public/lang`](public/lang). Every locale is checked
against the English message keys and interpolation placeholders during tests.

## Development

Use Node.js 22 LTS (22.13 or newer). Compatible Node.js 24 and 26+ releases are
also accepted by the package manifest.

```bash
nvm use
npm ci
npm run dev
```

The development server prints its local URL. Production output is written to
`dist/`, and a dated static-site archive is written to `artifacts/`.

| Command                    | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `npm run dev`              | Start the Vite development server                      |
| `npm run format`           | Format source and documentation                        |
| `npm run format:check`     | Verify formatting without changing files               |
| `npm run lint`             | Run ESLint                                             |
| `npm run test`             | Run the Vitest suite once                              |
| `npm run test:watch`       | Run Vitest in watch mode                               |
| `npm run coverage`         | Run tests with the enforced 80% coverage thresholds    |
| `npm run validate:locales` | Validate all locale dictionaries                       |
| `npm run build`            | Build `dist/` and the dated ZIP artifact               |
| `npm run preview`          | Preview the production build                           |
| `npm run badge`            | Generate the JavaScript percentage badge data          |
| `npm run check`            | Check formatting, lint, coverage, and production build |

## Automation

CI runs `npm run check` for pushes and pull requests targeting `main`. Pull
requests from this repository receive an updated Vitest coverage comment with
summary and file-level results. The minimum threshold is 80% for lines,
statements, functions, and branches.

GitHub Pages deploys the tested `dist/` build from `main`. A separate workflow
calculates the JavaScript source percentage and commits only its Shields JSON
endpoint to the `badges` branch, so protected-branch rules remain intact.

Repository administrators must select **Settings → Pages → Build and
deployment → Source: GitHub Actions** once before the first Pages deployment.

## Project Policies

- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Support](SUPPORT.md)
- [Privacy](PRIVACY.md)
- [Changelog](CHANGELOG.md)

## License

Licensed under the [MIT License](LICENSE).

Development is supported through [Buy Me a Coffee](https://www.buymeacoffee.com/y0BtG5R).
