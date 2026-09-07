# Cut Picture

[![CI](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/ci.yml/badge.svg)](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/pages.yml/badge.svg)](https://github.com/doctorlai-msrc/cut-picture/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/github/license/doctorlai-msrc/cut-picture)](./LICENSE)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=black)

A fully client-side web app for cutting a picture into a customizable grid.
Drop or upload an image, choose the number of rows and columns, preview the
tiles, and download every piece with one click. Your preferences stay in local
storage and images never leave your browser.

## Features

- Upload with a file picker or drag and drop.
- Default **3 × 3** grid with customizable rows and columns.
- Local storage for grid size and dark-mode preference.
- Client-side canvas slicing with individual tile previews.
- One-click download for all generated pieces.
- Responsive layout with light and dark themes.

## Live Demo

Once GitHub Pages is enabled for this repository, the app is published at:

**https://doctorlai-msrc.github.io/cut-picture/**

## Usage

1. Open the app in a browser.
2. Drop an image onto the upload area or choose one with the file picker.
3. Adjust rows and columns if needed.
4. Click **Download all pieces** to save the generated image tiles.

## Development

This project is intentionally dependency-free. Open `index.html` directly or
serve the repository root with any static web server:

```bash
python3 -m http.server 5173
```

Then visit <http://localhost:5173/>.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
