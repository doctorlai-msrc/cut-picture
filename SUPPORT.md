# Support

## Getting Help

Check the [README](README.md) for usage and development commands. For a
reproducible defect, open a GitHub issue with the bug report template. For a new
workflow or feature, use the feature request template.

Please include:

- Browser, browser version, and operating system.
- Image format and approximate dimensions, without attaching a private image.
- Selected row and column counts.
- Exact steps and any visible error message.

## Common Problems

**The image cannot be read.** The file extension alone does not guarantee that
the browser can decode the format. Convert the file to PNG, JPEG, or WebP and
try again.

**A large grid is slow.** Slicing and ZIP creation happen in memory. Reduce the
source image dimensions or the number of rows and columns.

**A download does not start.** Check browser download permissions and available
disk space. Individual tile downloads can help isolate ZIP-related failures.

**Preferences are not retained.** Private browsing modes and strict storage
settings may block local storage. The cutter still works, but settings reset
when the page closes.

Security-sensitive reports belong in the private channel described in
[SECURITY.md](SECURITY.md), not in public issues.
