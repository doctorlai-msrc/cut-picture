# Security Policy

## Supported Version

The current version deployed from `main` receives security fixes. Older dated
builds and downloaded archives are not maintained.

## Report a Vulnerability

Use GitHub's **Security** tab to submit a private vulnerability report. Do not
open a public issue for a finding that could expose user data or enable code
execution.

Include the affected browser and version, reproduction steps, expected impact,
and a minimal proof of concept when possible. Do not include personal images,
credentials, or other sensitive data.

## Security Boundaries

Cut Picture is a client-side application. It does not provide authentication,
server-side storage, or an upload API. Security reports are still relevant for
dependency vulnerabilities, unsafe file handling, script injection, supply
chain risks, and behavior that sends image data off-device.
