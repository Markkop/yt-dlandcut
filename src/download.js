const path = require('node:path')
const { stat, mkdir, mkdtemp, rename, rm } = require('node:fs/promises')
const { runProcess } = require('./process')

function downloaderArgs(tools) {
  return [
    '--ignore-config',
    '--no-playlist',
    '--no-update',
    '--no-colors',
    '--socket-timeout',
    '30',
    '--retries',
    '3',
    '--extractor-retries',
    '3',
    '--js-runtimes',
    `deno:${tools.deno}`,
    '--ffmpeg-location',
    path.dirname(tools.ffmpeg),
  ]
}

async function getVideoInfo(url, tools, run = runProcess, signal) {
  const output = await run(
    tools.ytdlp,
    [...downloaderArgs(tools), '--dump-single-json', '--skip-download', '--', url],
    { timeout: 120_000, signal },
  )
  let info
  try {
    info = JSON.parse(output)
  } catch {
    throw new Error('Could not read video information from YouTube.')
  }
  if (!/^[\w-]{11}$/.test(info.id || '') || typeof info.title !== 'string')
    throw new Error('YouTube returned invalid video information.')
  if (info.is_live || info.live_status === 'is_upcoming')
    throw new Error('Use a finished video instead of an ongoing or upcoming live stream.')
  if (!Number.isFinite(info.duration) || info.duration <= 0)
    throw new Error('Could not determine the video duration.')
  return { id: info.id, title: info.title, duration: info.duration }
}

async function downloadFromYoutube(
  url,
  outputPath,
  overwriteFile,
  tools,
  status,
  run = runProcess,
  signal,
) {
  await mkdir(outputPath, { recursive: true })
  const filePath = path.join(outputPath, 'source.mp4')
  if (
    !overwriteFile &&
    (await stat(filePath).then(
      (s) => s.isFile() && s.size > 0,
      () => false,
    ))
  ) {
    status('💡 Reusing the completed source download. Check Download again to replace it.')
    return filePath
  }
  const temporary = await mkdtemp(path.join(outputPath, '.download-'))
  try {
    status('⬇️ Downloading video…')
    const stagingFile = path.join(temporary, 'source.mp4')
    await run(
      tools.ytdlp,
      [
        ...downloaderArgs(tools),
        '--newline',
        '--progress',
        '--progress-delta',
        '1',
        '--format',
        'bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
        '--merge-output-format',
        'mp4',
        '--remux-video',
        'mp4',
        '--output',
        stagingFile,
        '--',
        url,
      ],
      {
        signal,
        onLine: (line) => {
          if (line.startsWith('[download]') || line.startsWith('WARNING:')) status(line)
        },
      },
    )
    const completed = await stat(stagingFile)
    if (!completed.isFile() || completed.size === 0)
      throw new Error('The downloaded video is empty.')
    await rename(stagingFile, filePath)
    status(`✅ Video downloaded to ${filePath}`)
    return filePath
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

module.exports = { downloaderArgs, getVideoInfo, downloadFromYoutube }
