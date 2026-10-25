# Changelog

## 4.0.0

The 2023 public release stays at v3.0.0. This version replaces the downloader, toolchain, and output-folder names.

- Keep the original desktop layout and options, with local fonts, accessible links/progress, and a Cancel button.
- Update Electron and packaging tools; remove obsolete Babel, Axios, ytdl-core, fluent-ffmpeg, and Travis setup.
- Download using current yt-dlp, with a managed Deno runtime and FFmpeg/FFprobe. Verify pinned checksums before installing tools.
- Isolate and sandbox the UI, validate messages and inputs, and remove shell-based file opening.
- Fix invalid time ranges, patch-update detection, failed-download caching, output collisions, and incomplete output files.
- Include the video ID in output-folder names. Existing v2 and v3.0.0 folders remain intact; v4 downloads use the new folders.
- Export MP3 clips directly; retain completed source downloads for reuse. Download again replaces the source only after a successful download.
- Add automated checks, security/maintenance documentation, and native CI packaging to draft GitHub releases.

Linux x64 desktop and AppImage checks passed in this workspace before the version number was set to 4.0.0. Public release still needs Windows and macOS verification, configured signing, and a hosted workflow run. See `docs/v4-review.md`.

## 3.0.0

Published 2023-08-05: new YouTube download method and Mac support.
