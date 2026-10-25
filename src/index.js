const path = require('node:path')
const { validateRequest, parseTime, slugify } = require('./helpers')
const { ensureTools } = require('./tools')
const { getVideoInfo, downloadFromYoutube } = require('./download')
const { convertClip } = require('./convert')

async function downloadAndCut(
  request,
  { basePath, binariesPath, status = () => {}, openPath, signal },
  services = {},
) {
  const input = validateRequest(request)
  const ensure = services.ensureTools || ensureTools
  const getInfo = services.getVideoInfo || getVideoInfo
  const download = services.downloadFromYoutube || downloadFromYoutube
  const convert = services.convertClip || convertClip
  status('✨ Starting…')
  const tools = await ensure(binariesPath, status, { signal })
  const info = await getInfo(input.youtubeUrl, tools, undefined, signal)
  if (parseTime(input.endTime) > info.duration)
    throw new Error(
      `Ending time exceeds the video duration (${Math.floor(info.duration)} seconds).`,
    )
  const videoName = `${slugify(info.title) || 'video'}-${info.id}`
  const fileName = slugify(
    input.options.customFileName ||
      `${slugify(info.title) || 'video'}-${input.startTime}-${input.endTime}`,
  )
  const outputPath = path.join(basePath, videoName)
  const source = await download(
    input.youtubeUrl,
    outputPath,
    input.options.overwriteDownload,
    tools,
    status,
    undefined,
    signal,
  )
  const output = await convert(
    source,
    outputPath,
    fileName,
    input.startTime,
    input.duration,
    input.options.toMp3,
    tools,
    status,
    undefined,
    signal,
  )
  status(`🎉 Finished! Check your files in ${outputPath}.`)
  if (input.options.openAtFinish && openPath) {
    const error = await openPath(output)
    if (error) status(`⚠️ Clip saved, but could not open it: ${error}`)
  }
  return { outputPath: output }
}

module.exports = { downloadAndCut }
