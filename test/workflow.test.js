const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const { mkdtemp, rm, writeFile, readFile, readdir, mkdir } = require('node:fs/promises')
const { downloadAndCut } = require('../src')
const { downloadFromYoutube, getVideoInfo, downloaderArgs } = require('../src/download')
const { convertClip } = require('../src/convert')
const tools = { ytdlp: '/tools/yt-dlp', ffmpeg: '/tools/ffmpeg', deno: '/tools/deno' }
const request = {
  youtubeUrl: 'https://youtu.be/N9qjR6teBNw',
  startTime: '00:00:20',
  endTime: '00:00:22',
  options: { toMp3: true, openAtFinish: true },
}
async function temporary(t) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'yt-dlandcut-test-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  return folder
}

test('workflow selects ID-specific folder, cuts directly to MP3 and opens only the final file', async () => {
  const calls = []
  const result = await downloadAndCut(
    request,
    {
      basePath: '/output',
      binariesPath: '/cache',
      openPath: async (file) => {
        calls.push(['open', file])
        return ''
      },
    },
    {
      ensureTools: async () => tools,
      getVideoInfo: async () => ({ id: 'N9qjR6teBNw', title: 'Test', duration: 60 }),
      downloadFromYoutube: async (...args) => {
        calls.push(['download', ...args])
        return '/output/source.mp4'
      },
      convertClip: async (...args) => {
        calls.push(['convert', ...args])
        return '/output/clip.mp3'
      },
    },
  )
  assert.match(calls[0][2], /test-N9qjR6teBNw$/)
  assert.equal(calls[1][6], true)
  assert.deepEqual(calls[2], ['open', '/output/clip.mp3'])
  assert.deepEqual(result, { outputPath: '/output/clip.mp3' })
})
test('invalid ranges fail before network calls and duration overflow fails before download', async () => {
  let downloaded = false
  const services = {
    ensureTools: async () => tools,
    getVideoInfo: async () => ({ id: 'N9qjR6teBNw', title: 'Test', duration: 21 }),
    downloadFromYoutube: async () => {
      downloaded = true
    },
  }
  await assert.rejects(downloadAndCut({ ...request, startTime: '00:00:30' }, {}, services), /after/)
  await assert.rejects(downloadAndCut(request, {}, services), /exceeds/)
  assert.equal(downloaded, false)
})
test('metadata validation rejects live and invalid video information', async () => {
  for (const info of [
    {},
    { id: 'N9qjR6teBNw', title: 'Video', duration: 10, is_live: true },
    { id: 'N9qjR6teBNw', title: 'Video', duration: null },
  ]) {
    await assert.rejects(getVideoInfo(request.youtubeUrl, tools, async () => JSON.stringify(info)))
  }
  const args = downloaderArgs(tools)
  assert.ok(args.includes('--ignore-config'))
  assert.ok(args.includes('--no-playlist'))
  assert.ok(args.includes('deno:/tools/deno'))
})
test('failed and partial downloads cannot replace an existing cached video', async (t) => {
  const folder = await temporary(t)
  await writeFile(path.join(folder, 'source.mp4'), 'old-video')
  await assert.rejects(
    downloadFromYoutube(
      request.youtubeUrl,
      folder,
      true,
      tools,
      () => {},
      async (_command, args) => {
        await writeFile(args[args.indexOf('--output') + 1], 'partial-video')
        throw new Error('network failed')
      },
    ),
    /network failed/,
  )
  assert.equal(await readFile(path.join(folder, 'source.mp4'), 'utf8'), 'old-video')
  assert.deepEqual(await readdir(folder), ['source.mp4'])
})
test('successful downloads are reused and empty caches are downloaded again', async (t) => {
  const folder = await temporary(t)
  await writeFile(path.join(folder, 'source.mp4'), '')
  let calls = 0
  const run = async (_command, args) => {
    calls++
    await writeFile(args[args.indexOf('--output') + 1], 'complete-video')
  }
  await downloadFromYoutube(request.youtubeUrl, folder, false, tools, () => {}, run)
  await downloadFromYoutube(request.youtubeUrl, folder, false, tools, () => {}, run)
  assert.equal(calls, 1)
  assert.equal(await readFile(path.join(folder, 'source.mp4'), 'utf8'), 'complete-video')
})
test('conversion failure leaves old outputs intact and cleans temporary files', async (t) => {
  const folder = await temporary(t)
  const output = path.join(folder, 'clip.mp4')
  await writeFile(output, 'old-clip')
  await assert.rejects(
    convertClip(
      '/source.mp4',
      folder,
      'clip',
      '00:00:20',
      2,
      false,
      tools,
      () => {},
      async (_command, args) => {
        await writeFile(args.at(-1), 'partial-clip')
        throw new Error('encoder failed')
      },
    ),
    /encoder failed/,
  )
  assert.equal(await readFile(output, 'utf8'), 'old-clip')
  assert.deepEqual(await readdir(folder), ['clip.mp4'])
})
test('MP3 conversion has no intermediate video and source cannot be overwritten', async (t) => {
  const folder = await temporary(t)
  let args
  await convertClip(
    '/source.mp4',
    folder,
    'clip',
    '00:00:20',
    2,
    true,
    tools,
    () => {},
    async (_command, parameters) => {
      args = parameters
      await writeFile(args.at(-1), 'mp3-data')
    },
  )
  assert.ok(args.includes('libmp3lame'))
  assert.ok(args.includes('-vn'))
  assert.deepEqual(await readdir(folder), ['clip.mp3'])
  await assert.rejects(
    convertClip(
      path.join(folder, 'source.mp4'),
      folder,
      'source',
      '00:00:20',
      2,
      false,
      tools,
      () => {},
    ),
    /other than source/,
  )
  assert.deepEqual(await readdir(folder), ['clip.mp3'])
})
test('tool failures propagate and do not continue conversion', async () => {
  await assert.rejects(
    downloadAndCut(
      request,
      {},
      {
        ensureTools: async () => {
          throw new Error('checksum failed')
        },
      },
    ),
    /checksum failed/,
  )
})
test('existing folder named as a cache file is never reused', async (t) => {
  const folder = await temporary(t)
  await mkdir(path.join(folder, 'source.mp4'))
  let attempted = false
  await assert.rejects(
    downloadFromYoutube(
      request.youtubeUrl,
      folder,
      false,
      tools,
      () => {},
      async () => {
        attempted = true
        throw new Error('download attempted')
      },
    ),
    /download attempted/,
  )
  assert.equal(attempted, true)
})
