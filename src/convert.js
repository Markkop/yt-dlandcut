const path = require('node:path')
const { mkdir, mkdtemp, stat, rename, rm } = require('node:fs/promises')
const { runProcess } = require('./process')

async function convertClip(
  inputPath,
  outputPath,
  fileName,
  startTime,
  duration,
  toMp3,
  tools,
  status,
  run = runProcess,
  signal,
) {
  await mkdir(outputPath, { recursive: true })
  const extension = toMp3 ? 'mp3' : 'mp4'
  const finalPath = path.join(outputPath, `${fileName}.${extension}`)
  // A custom name such as "source" must never replace the cached source video.
  if (path.resolve(inputPath) === path.resolve(finalPath))
    throw new Error('Choose a file name other than source.')
  const temporary = await mkdtemp(path.join(outputPath, '.convert-'))
  const stagingFile = path.join(temporary, `clip.${extension}`)
  try {
    status(toMp3 ? '⚙️ Cutting and converting audio to MP3…' : '⚙️ Cutting video…')
    const encoding = toMp3
      ? ['-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-q:a', '2']
      : [
          '-map',
          '0:v:0',
          '-map',
          '0:a:0?',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '20',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
        ]
    await run(
      tools.ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostdin',
        '-y',
        '-ss',
        startTime,
        '-i',
        inputPath,
        '-t',
        String(duration),
        ...encoding,
        stagingFile,
      ],
      { signal },
    )
    if ((await stat(stagingFile)).size === 0) throw new Error('FFmpeg produced an empty clip.')
    await rename(stagingFile, finalPath)
    status(`✅ Clip saved to ${finalPath}`)
    return finalPath
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

module.exports = { convertClip }
