const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeYoutubeUrl,
  parseTime,
  getDuration,
  slugify,
  validateRequest,
  isNewVersion,
  checkUpdates,
} = require('../src/helpers')

const valid = {
  youtubeUrl: 'https://youtu.be/N9qjR6teBNw',
  startTime: '00:00:20',
  endTime: '00:00:22',
}

test('normalizes supported YouTube video links without forwarding arbitrary parameters', () => {
  for (const url of [
    'youtu.be/N9qjR6teBNw?t=20',
    'https://www.youtube.com/watch?v=N9qjR6teBNw&list=abc',
    'https://m.youtube.com/shorts/N9qjR6teBNw',
    'https://music.youtube.com/watch?v=N9qjR6teBNw',
    'https://youtube.com/live/N9qjR6teBNw',
  ]) {
    assert.equal(normalizeYoutubeUrl(url), 'https://www.youtube.com/watch?v=N9qjR6teBNw')
  }
})
test('rejects non-YouTube targets, credentials, malformed video IDs and playlists', () => {
  for (const url of [
    'https://youtube.com.evil.test/watch?v=N9qjR6teBNw',
    'file:///etc/passwd',
    '--exec=calc',
    'https://user@youtube.com/watch?v=N9qjR6teBNw',
    'https://youtube.com/playlist?list=abc',
    'https://youtu.be/not-an-id',
    'https://youtu.be/N9qjR6teBNw/extra',
    null,
    {},
    'https://youtube.com:8080/watch?v=N9qjR6teBNw',
  ])
    assert.throws(() => normalizeYoutubeUrl(url))
})
test('validates strict times and supports intervals longer than a day', () => {
  assert.equal(parseTime('99:59:59'), 359999)
  assert.equal(getDuration('23:59:58', '24:00:03'), 5)
  for (const time of ['00:60:00', '00:00:60', '1:00:00', '00:00:00junk', '-1:00:00', null])
    assert.throws(() => parseTime(time))
  assert.throws(() => getDuration('00:00:02', '00:00:01'), /after/)
  assert.throws(() => getDuration('00:00:02', '00:00:02'), /after/)
})
test('validates IPC request types and gives explicit option defaults', () => {
  assert.deepEqual(validateRequest(valid).options, {
    customFileName: '',
    toMp3: false,
    openAtFinish: false,
    overwriteDownload: false,
  })
  for (const request of [
    null,
    [],
    { ...valid, options: [] },
    { ...valid, options: { toMp3: 'true' } },
    { ...valid, options: { customFileName: '../../' } },
    { ...valid, options: { customFileName: 'x'.repeat(201) } },
  ])
    assert.throws(() => validateRequest(request))
})
test('creates bounded filenames safe on Windows and Unix', () => {
  assert.equal(slugify('Olá World! ../../$(`whoami`)'), 'ola-world-whoami')
  assert.equal(slugify('CON'), 'video-con')
  assert.equal(slugify('LPT1'), 'video-lpt1')
  assert.equal(slugify('💛'), '')
  assert.ok(slugify('a'.repeat(500)).length <= 100)
})
test('update comparison handles patch, minor and major releases correctly', () => {
  for (const version of ['v3.0.1', '3.1.0', '4.0.0'])
    assert.equal(isNewVersion('3.0.0', version), true)
  for (const version of ['v3.0.0', '2.99.99', '3.0.1-beta.1', 'invalid'])
    assert.equal(isNewVersion('3.0.0', version), false)
  assert.equal(isNewVersion('3.1.9', '3.0.99'), false)
})
test('update checks tolerate no release and ignore prereleases', async () => {
  assert.equal(await checkUpdates('3.0.0', async () => ({ status: 404 })), null)
  assert.equal(
    await checkUpdates('3.0.0', async () => ({
      ok: true,
      json: async () => ({ tag_name: 'v3.0.1' }),
    })),
    'v3.0.1',
  )
  assert.equal(
    await checkUpdates('3.0.0', async () => ({
      ok: true,
      json: async () => ({ tag_name: 'v4.0.0', prerelease: true }),
    })),
    null,
  )
  await assert.rejects(
    checkUpdates('3.0.0', async () => ({ status: 403 })),
    /403/,
  )
})
