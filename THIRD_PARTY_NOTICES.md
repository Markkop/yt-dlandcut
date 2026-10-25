# Third-party components

The app is licensed under GPL-3.0-or-later. npm dependency licenses are retained in their installed packages. Electron bundles Chromium and Node.js and includes its own license notices.

## Local font

`public/fonts/roboto-latin-300-normal.woff2` is the Roboto Latin 300 normal font distributed by [Fontsource Roboto 5.3.0](https://www.npmjs.com/package/@fontsource/roboto/v/5.3.0). Its license is included at `public/fonts/LICENSE`. The font is loaded locally to preserve the original appearance without contacting Google Fonts.

## Downloaded tools

Executables are fetched from upstream when first needed, rather than shipped inside the app's installer. `tools-manifest.json` records the exact versions, source URLs, and archive SHA256 values for each platform.

- **yt-dlp**: [source and notices](https://github.com/yt-dlp/yt-dlp). Its source is Unlicense; standalone PyInstaller executables contain GPLv3+ components. See upstream's `THIRD_PARTY_LICENSES.txt` for included components, including EJS dependencies.
- **Deno**: [source and license](https://github.com/denoland/deno), MIT, with third-party component notices in the upstream distribution/source tree.
- **FFmpeg and FFprobe**: [FFmpeg source](https://ffmpeg.org/), [licensing](https://ffmpeg.org/legal.html). Builds used here enable GPL components such as x264 and LAME. The build provider and exact build are recorded by each manifest entry. macOS/Linux builds are provided by [Martin Riedl's build project](https://ffmpeg.martin-riedl.de/) ([build scripts](https://git.martin-riedl.de/ffmpeg/build-script)); Windows builds are provided by [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds).

If distributing these executables yourself or bundling them in an installer, retain all upstream license/copyright notices and provide the corresponding source and build information required by their licenses. The current installer configuration does not redistribute the downloaded executables.
