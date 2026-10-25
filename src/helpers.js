const { mkdir } = require('node:fs/promises')

function parseTime(value) {
  if (typeof value !== 'string' || !/^\d{2}:[0-5]\d:[0-5]\d$/.test(value)) {
    throw new Error('Enter times as HH:MM:SS, with minutes and seconds between 00 and 59.')
  }
  const [hours, minutes, seconds] = value.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

function getDuration(startTime, endTime) {
  const duration = parseTime(endTime) - parseTime(startTime)
  if (duration <= 0) throw new Error('Ending time must be after starting time.')
  return duration
}

function normalizeYoutubeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048)
    throw new Error('Enter a YouTube video URL.')
  let url
  try {
    url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`)
  } catch {
    throw new Error('Enter a valid YouTube video URL.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error('Enter a valid YouTube video URL.')
  }
  const host = url.hostname.toLowerCase()
  let id
  if (host === 'youtu.be') id = url.pathname.slice(1)
  else if (
    ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)
  ) {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else id = /^\/(?:shorts|live|embed)\/([^/]+)\/?$/.exec(url.pathname)?.[1]
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || ''))
    throw new Error('Enter a YouTube video URL, not a playlist or channel.')
  return `https://www.youtube.com/watch?v=${id}`
}

function validateRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request))
    throw new Error('Invalid download request.')
  const youtubeUrl = normalizeYoutubeUrl(request.youtubeUrl)
  const startTime = request.startTime
  const endTime = request.endTime
  const duration = getDuration(startTime, endTime)
  const options = request.options ?? {}
  if (typeof options !== 'object' || options === null || Array.isArray(options))
    throw new Error('Invalid options.')
  for (const key of ['toMp3', 'openAtFinish', 'overwriteDownload']) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean')
      throw new Error(`Invalid option: ${key}.`)
  }
  if (
    options.customFileName !== undefined &&
    (typeof options.customFileName !== 'string' || options.customFileName.length > 200)
  ) {
    throw new Error('Custom file name must be at most 200 characters.')
  }
  const customFileName = options.customFileName?.trim() || ''
  if (customFileName && !slugify(customFileName))
    throw new Error('Custom file name needs letters or numbers.')
  return {
    youtubeUrl,
    startTime,
    endTime,
    duration,
    options: {
      customFileName,
      toMp3: options.toMp3 === true,
      openAtFinish: options.openAtFinish === true,
      overwriteDownload: options.overwriteDownload === true,
    },
  }
}

function slugify(value) {
  let result = String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '')
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(result)) result = `video-${result}`
  return result
}

function isNewVersion(current, detected) {
  const stable = /^v?(\d+)\.(\d+)\.(\d+)$/
  const a = stable.exec(current)?.slice(1).map(Number)
  const b = stable.exec(detected)?.slice(1).map(Number)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return b[i] > a[i]
  }
  return false
}

async function checkUpdates(currentVersion, fetchImpl = fetch) {
  const response = await fetchImpl(
    'https://api.github.com/repos/Markkop/yt-dlandcut/releases/latest',
    {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'yt-dlandcut' },
      signal: AbortSignal.timeout(10_000),
    },
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Update service returned HTTP ${response.status}.`)
  const release = await response.json()
  return !release.draft && !release.prerelease && isNewVersion(currentVersion, release.tag_name)
    ? release.tag_name
    : null
}

module.exports = {
  parseTime,
  getDuration,
  normalizeYoutubeUrl,
  validateRequest,
  slugify,
  isNewVersion,
  checkUpdates,
  checkAndCreateFolder: (folder) => mkdir(folder, { recursive: true }),
}
