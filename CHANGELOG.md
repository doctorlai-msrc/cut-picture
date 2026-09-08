# Changelog

All notable user-facing changes are recorded here. This project uses a
date-based version because it is deployed directly as a static site.

## Unreleased

### Added

- Shareable `lang`, `width`, and `height` URL settings that stay synchronized
  with language and grid changes.
- A localized Buy Me a Coffee support link in the application footer.

### Changed

- Reduced ZIP preparation time by storing already-compressed PNG tiles without
  redundant recompression.
- Improved screen-reader feedback with concise settings and piece-count status
  announcements.

### Fixed

- Reported unavailable browser storage immediately instead of claiming
  settings were saved.
- Avoided duplicate delayed saves and grid renders after row or column changes.

## 2026.9.7 - 2026-09-07

### Added

- Private, browser-based image slicing with 1–20 rows and columns.
- Pixel-complete tile previews and individual PNG downloads.
- Single ZIP download containing every generated tile.
- Drag-and-drop input, persisted preferences, and light/dark themes.
- 25 interface languages with RTL support for Arabic and Persian.
- Date-based release version and commit revision in the interface.
- Vitest coverage enforcement, pull-request coverage reports, and CI checks.
- GitHub Pages deployment and a protected-branch-safe language badge workflow.
- Contributor, support, security, and privacy documentation.

### Changed

- Replaced simultaneous multi-file downloads with one ZIP archive.
- Reduced grid dimensions automatically when an image has fewer pixels than
  the selected row or column count.

### Fixed

- Ignored stale image load callbacks after a newer file is selected.
- Handled invalid files, image decode failures, unavailable canvas contexts,
  failed tile conversion, and ZIP generation errors without leaving controls
  in an unusable state.
