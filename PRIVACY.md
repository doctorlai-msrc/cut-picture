# Privacy

Cut Picture is designed to process images locally in the browser.

## Image Data

- Selected images are decoded with browser APIs on the user's device.
- Image pixels are drawn to in-memory canvas elements.
- PNG tiles and ZIP archives are created locally.
- The application does not upload images, filenames, or generated tiles.
- Temporary object URLs are revoked after loading or downloading.

Closing or refreshing the page clears the selected image and generated tiles.

## Stored Preferences

The application stores only row count, column count, theme, and language in
browser local storage under the key `cut-picture:settings`. It does not use
cookies, analytics, advertising trackers, or user accounts.

Clearing site data in the browser removes these preferences. Browsers may also
block or discard local storage in private browsing modes.

## Network Requests

The deployed app loads its JavaScript, CSS, and selected language dictionary
from the same GitHub Pages site. Runtime dependencies are included in the
production bundle. The app does not contact third-party services while cutting
or downloading an image.

GitHub Pages may process standard request metadata, such as IP address and user
agent, under [GitHub's Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-privacy-statement).
Badges displayed on the GitHub README are repository documentation and are not
loaded by the image cutter itself.

The footer includes an external Buy Me a Coffee link. No request is sent to
that service unless the link is opened; its own privacy policy applies after
leaving the app.

## Questions

Open a GitHub issue for general privacy questions without including personal or
sensitive data. Use the private process in [SECURITY.md](SECURITY.md) for a
potential vulnerability.
