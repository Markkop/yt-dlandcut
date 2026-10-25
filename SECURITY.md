# Security

Security fixes target the current v4 release line. Older versions use obsolete Electron/backend libraries and should be upgraded.

Please report security issues privately using the repository's GitHub Security reporting feature if enabled, or contact the maintainer through the website linked in the repository profile. Avoid including credentials, private video URLs, cookies, or personal paths in public reports.

The main process accepts only local main-frame IPC from the application window. Renderer operations are restricted to starting/cancelling a job, opening the fixed output folder, opening allowlisted project links, and checking the fixed release endpoint. Arbitrary filesystem paths, external URLs, and shell commands are not exposed to renderer code.

External executable versions and SHA256 checksums are pinned in `tools-manifest.json`. New tools should be reviewed and tested before release. Do not use yt-dlp's self-updater to change the app-managed tool cache. The updater script changes the manifest only; it does not publish or install a release.
