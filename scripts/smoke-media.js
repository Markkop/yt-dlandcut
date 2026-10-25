// Downloads the same verified toolset used by the app, then tests real media offline.
const os = require('node:os')
const path = require('node:path')
const { mkdtemp, rm } = require('node:fs/promises')
const assert = require('node:assert/strict')
const { ensureTools } = require('../src/tools')
const { convertClip } = require('../src/convert')
const { runProcess } = require('../src/process')

async function smokeMedia() {
  const tools = await ensureTools(path.join(os.tmpdir(), 'yt-dlandcut-smoke-tools'), console.log)
  for (const [name, executable] of Object.entries(tools)) {
    const output = await runProcess(executable, [
      name === 'ffmpeg' || name === 'ffprobe' ? '-version' : '--version',
    ])
    console.log(output.split('\n')[0])
  }
  const folder = await mkdtemp(path.join(os.tmpdir(), 'yt-dlandcut-media-'))
  try {
    const source = path.join(folder, 'source.mp4')
    await runProcess(tools.ffmpeg, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=160x90:rate=10',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:sample_rate=44100',
      '-t',
      '4',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      source,
    ])
    for (const toMp3 of [false, true]) {
      const clip = await convertClip(
        source,
        folder,
        toMp3 ? 'audio' : 'video',
        '00:00:01',
        2,
        toMp3,
        tools,
        console.log,
      )
      const output = await runProcess(tools.ffprobe, [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=codec_type,codec_name',
        '-of',
        'json',
        clip,
      ])
      const probe = JSON.parse(output)
      assert.ok(Math.abs(Number(probe.format.duration) - 2) < 0.2, 'Clip must be two seconds long')
      assert.ok(probe.streams.some((stream) => stream.codec_type === 'audio'))
      assert.equal(
        probe.streams.some((stream) => stream.codec_type === 'video'),
        !toMp3,
      )
      assert.ok(probe.streams.some((stream) => stream.codec_name === (toMp3 ? 'mp3' : 'h264')))
    }
    console.log('Real FFmpeg video and MP3 smoke tests passed.')
  } finally {
    await rm(folder, { recursive: true, force: true })
  }
}

smokeMedia().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
