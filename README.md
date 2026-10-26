# <img alt="App icon" src="public/256x256.png" width="26"> YouTube - Download and Cut

Download a YouTube video, select a time range, and save an MP4 or MP3 clip.

![GitHub release](https://img.shields.io/github/v/release/Markkop/yt-dlandcut)

<kbd>
  <img border="1" alt="Demo" src="https://i.imgur.com/hx48SzZ.gif">
</kbd>

## Usage

1. Download the appropriate Linux **AppImage**, Windows **portable EXE**, or macOS **DMG** from [Releases](https://github.com/Markkop/yt-dlandcut/releases).
2. Enter a video URL and starting/ending times in **HH:MM:SS** format.
3. Optionally select **Convert to MP3**, **Download again**, **Open file on finish**, or enter a custom filename.
4. Click **Submit**. The first job downloads and verifies yt-dlp, Deno, FFmpeg, and FFprobe. This needs an internet connection and may take a few minutes. Later jobs reuse the verified tools.
5. Find clips in `~/yt-dlandcut/<video-title>-<video-id>/` or click **Open output folder**. A completed `source.mp4` is reused unless **Download again** is checked. **Cancel** stops the current job.

## First launch

These builds are not notarized or Authenticode-signed. Each system can warn once about the downloaded file. Allow this app only. Do not turn off Gatekeeper, SmartScreen, or other system protections.

**macOS.** Copy **YouTube - Download and Cut** from the disk image into **Applications**, then eject the image. Control-click **Open** no longer bypasses the check on current macOS. Open **System Settings → Privacy & Security**, scroll to the bottom, and choose **Open Anyway** after one failed launch. If that button is missing, clear the download mark on this copy and open it:

```sh
xattr -dr com.apple.quarantine "/Applications/YouTube - Download and Cut.app"
open "/Applications/YouTube - Download and Cut.app"
```

Use the Apple Silicon DMG (`mac-arm64`) or the Intel DMG (`mac-x64`) that matches the Mac. Repeat this only when you download a new copy.

**Windows.** SmartScreen may say Windows protected your PC. Choose **More info**, then **Run anyway**. That applies to the downloaded portable `.exe` only.

**Linux.** Mark the AppImage as executable, then start it. In a file manager this is **Allow executing file as a program**. From a terminal:

```sh
chmod +x yt-dlandcut-*-linux-*.AppImage
./yt-dlandcut-*-linux-*.AppImage
```

If it reports that `libfuse.so.2` is missing, install the distribution's FUSE 2 package (`libfuse2t64` on current Ubuntu) or start that copy without mounting it:

```sh
APPIMAGE_EXTRACT_AND_RUN=1 ./yt-dlandcut-*-linux-*.AppImage
```

Normal, shortened, Shorts, live replay, embed, and mobile YouTube video links are accepted. Ongoing live streams, upcoming streams, playlists, and channels are rejected. Only download content you have permission to use.

YouTube can change its extraction requirements at any time. Private, age-restricted, region-restricted, or bot-challenged videos may fail. The app does not import browser cookies or bypass account restrictions. Check the progress log and try **Download again** if a cached source is damaged.

The tool cache lives in Electron's per-user application-data directory, separate from your downloaded videos. Output folders include the video ID so two videos with the same title do not share a download. MP3 export creates an audio clip directly.

## Development

Use **Node.js 24 LTS, version 24.15 or newer**, and **npm 11**. `.nvmrc` selects the Node 24 line. No Babel compilation is needed.

```sh
npm ci
npm run check
npm start
```

`npm run check` runs ESLint, formatting checks, and the Node test suite. Tests cover input and IPC validation, download/conversion failures, cache repair, checksum enforcement, archive attacks, process cancellation, and renderer form behavior without launching a browser or Electron.

```sh
npm run test:media
```

The media smoke test downloads the pinned tools into the OS temporary directory, prints their versions, generates a four-second test video, exports two-second MP4/MP3 clips, and inspects them with FFprobe. It does not contact YouTube. The temporary media is removed afterward; the temporary tool cache can be reused.

```sh
npm run pack    # unpacked application in dist/, no publishing
npm run build   # installer for the current OS, no publishing
```

Desktop launch and installer builds require a graphical/native environment appropriate for Electron. Build each OS on its native runner. Release targets are Linux x64, Windows x64, macOS Intel, and macOS Apple Silicon. The tool manifest also includes Linux/Windows ARM64; those additional targets need their own native packaging and desktop checks before being offered as releases.

The Linux AppImage launcher does not disable the Chromium sandbox by default. It adds `--no-sandbox` only when user namespaces are unavailable, so normal desktops keep the sandbox. The empty `appImage.executableArgs` setting preserves that behavior.

## Dependencies and security

The application stays on Electron with plain JavaScript, HTML, and CSS. Privileged operations live in the main process behind a narrow, validated IPC bridge. The renderer is sandboxed, context-isolated, and has no Node access. Scripts, styles, and the Roboto font are local; the renderer's CSP blocks network connections. Files open through Electron's native API, and tools run with argument arrays instead of shell commands.

`package-lock.json` pins the npm dependency tree. `tools-manifest.json` separately pins HTTPS URLs and SHA256 checksums for first-run executables. Downloads are verified before installation, selected executables are extracted to fixed filenames, and incomplete installs are cleaned. Executable hashes are rechecked before a job. Both FFmpeg and FFprobe share a tool directory so yt-dlp can discover them. Downloaded tools are not self-updated at runtime.

To deliberately refresh external tools:

```sh
npm run tools:update
npm run check
npm run test:media
```

Review the manifest's versions, upstream URLs, checksums, and platform mappings; test live YouTube downloads and native installers before releasing. The manifest updater reads official yt-dlp/Deno releases, stable FFmpeg builds for macOS/Linux from Martin Riedl, and dated stable-branch Windows FFmpeg builds from BtbN. Upstream binary hosting is a trust dependency. A checksum pins the reviewed bytes; it does not independently prove the publisher's identity.

Dependabot checks npm packages and Actions weekly. Its dependency PRs should pass checks before merging. Tool updates require the deliberate manifest update above.

## Releasing

The [release review](docs/v4-review.md) records completed work, verification, and remaining launch checks.

- Pushes and pull requests run checks on Linux, Windows, and macOS without publishing.
- Manually running **Package v4** builds installers and uploads workflow artifacts without publishing to Releases.
- A `v<package.json version>` tag, for example `v4.0.0`, runs checks and media smoke tests, builds native installers, and uploads them to a **draft** GitHub release using the workflow's `GITHUB_TOKEN`. Publishing that draft is a separate maintainer action. The existing `v3.0.0` tag is the 2023 release and must not be reused.
- Release tag names must exactly match `package.json`. Artifact filenames include the OS and architecture.

Local publishing is explicit:

```sh
npm run release
```

That command requires `GH_TOKEN` in the environment and uploads to a draft release. Do not put tokens in files committed to this repository. Ordinary `pack` and `build` commands always pass `--publish never`.

For a public macOS release, configure Developer ID signing and notarization using [electron-builder v26's signing documentation](https://www.electron.build/v26/docs/features/code-signing/). Windows signing should also be configured for public distribution. The current workflow has no signing credentials configured. macOS builds instead restore an ad-hoc signature after Electron's fuses are flipped; without that, Gatekeeper reports the downloaded app as damaged. Generated artifacts must be treated as release candidates until signing and clean-machine checks are complete. Do not encourage users to disable OS security controls.

## License

GPL-3.0-or-later; see [LICENSE](LICENSE). Downloaded tools and the bundled font have their own notices; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
