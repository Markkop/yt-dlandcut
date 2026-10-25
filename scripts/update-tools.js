// Run deliberately, review the resulting URLs/hashes, then test before releasing.
const { writeFile } = require('node:fs/promises')
const path = require('node:path')

async function json(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'yt-dlandcut' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  return response.json()
}

function githubAsset(release, name) {
  const asset = release.assets.find((item) => item.name === name)
  if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest || ''))
    throw new Error(`Missing SHA256 for ${name}`)
  return {
    version: release.tag_name,
    url: asset.browser_download_url,
    sha256: asset.digest.slice(7),
    archive: name.endsWith('.zip'),
  }
}

async function updateManifest() {
  const ytdlp = await json('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest')
  const deno = await json('https://api.github.com/repos/denoland/deno/releases/latest')
  // Pin an immutable dated build, never the mutable "latest" asset URL.
  const ffmpegReleases = await json(
    'https://api.github.com/repos/BtbN/FFmpeg-Builds/releases?per_page=10',
  )
  const windows = ffmpegReleases.find((release) => release.tag_name.startsWith('autobuild-'))
  if (!windows) throw new Error('No dated FFmpeg build found.')
  const page = await fetch('https://ffmpeg.martin-riedl.de/', {
    signal: AbortSignal.timeout(30_000),
  })
  if (!page.ok) throw new Error(`FFmpeg provider returned HTTP ${page.status}`)
  const html = await page.text()
  const releaseHtml = html.split('<h2>Download Release Build</h2>')[1]?.split('<h2>')[0]
  if (!releaseHtml) throw new Error('Could not find stable FFmpeg builds.')
  const manifest = { updatedAt: new Date().toISOString().slice(0, 10), platforms: {} }
  for (const platform of ['linux', 'darwin', 'win32']) {
    for (const arch of ['x64', 'arm64']) {
      const isWindows = platform === 'win32'
      const suffix = isWindows ? '.exe' : ''
      const downloaderName = isWindows
        ? arch === 'x64'
          ? 'yt-dlp.exe'
          : 'yt-dlp_arm64.exe'
        : platform === 'darwin'
          ? 'yt-dlp_macos'
          : arch === 'x64'
            ? 'yt-dlp_linux'
            : 'yt-dlp_linux_aarch64'
      const denoPlatform = {
        linux: 'unknown-linux-gnu',
        darwin: 'apple-darwin',
        win32: 'pc-windows-msvc',
      }[platform]
      const denoArch = arch === 'x64' ? 'x86_64' : 'aarch64'
      const tools = [
        { ...githubAsset(ytdlp, downloaderName), executables: { ytdlp: `yt-dlp${suffix}` } },
        {
          ...githubAsset(deno, `deno-${denoArch}-${denoPlatform}.zip`),
          executables: { deno: `deno${suffix}` },
        },
      ]
      if (isWindows) {
        const asset = windows.assets
          .filter((item) =>
            new RegExp(
              `^ffmpeg-n[0-9.]+-[^-]+-g[0-9a-f]+-${arch === 'x64' ? 'win64' : 'winarm64'}-gpl-[0-9.]+\\.zip$`,
            ).test(item.name),
          )
          .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))[0]
        if (!asset) throw new Error('No stable Windows FFmpeg asset found.')
        tools.push({
          ...githubAsset(windows, asset.name),
          executables: { ffmpeg: 'ffmpeg.exe', ffprobe: 'ffprobe.exe' },
        })
      } else {
        for (const tool of ['ffmpeg', 'ffprobe']) {
          const osName = platform === 'darwin' ? 'macos' : 'linux'
          const cpuName = arch === 'x64' ? 'amd64' : 'arm64'
          const href = new RegExp(
            `href="(/download/${osName}/${cpuName}/([0-9]+_([0-9.]+))/${tool}\\.zip)"`,
          ).exec(releaseHtml)
          if (!href) throw new Error(`No stable ${tool} build for ${platform}-${arch}`)
          const url = `https://ffmpeg.martin-riedl.de${href[1]}`
          const checksums = await fetch(`${url}.sha256`, { signal: AbortSignal.timeout(30_000) })
          if (!checksums.ok) throw new Error(`No checksum for ${url}`)
          const sha256 = /\b[a-f0-9]{64}\b/i.exec(await checksums.text())?.[0]?.toLowerCase()
          if (!sha256) throw new Error(`Invalid checksum for ${url}`)
          tools.push({
            version: href[3],
            url,
            sha256,
            archive: true,
            executables: { [tool]: tool },
          })
        }
      }
      manifest.platforms[`${platform}-${arch}`] = tools
    }
  }
  await writeFile(
    path.join(__dirname, '..', 'tools-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  console.log('Updated tools-manifest.json. Review all changes and smoke-test supported platforms.')
}

if (require.main === module)
  updateManifest().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
module.exports = { githubAsset, updateManifest }
