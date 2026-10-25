const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const { createHash } = require('node:crypto')
const { mkdtemp, rm, readFile, writeFile, mkdir, readdir } = require('node:fs/promises')
const { downloadVerified, ensureTools } = require('../src/tools')
const { extractExecutables } = require('../src/zip')
const { zipFixture } = require('./zip-fixture')
const manifest = require('../tools-manifest.json')
async function temporary(t) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'yt-dlandcut-tools-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  return folder
}
const asset = {
  url: 'https://example.test/tool',
  version: '1',
  sha256: createHash('sha256').update('tool-data').digest('hex'),
  archive: false,
  executables: { ffmpeg: 'ffmpeg' },
}

test('only accepts downloads matching the pinned checksum', async (t) => {
  const folder = await temporary(t)
  const destination = path.join(folder, 'tool')
  await downloadVerified(asset, destination, { fetchImpl: async () => new Response('tool-data') })
  assert.equal(await readFile(destination, 'utf8'), 'tool-data')
  await rm(destination)
  await assert.rejects(
    downloadVerified(asset, destination, { fetchImpl: async () => new Response('tampered') }),
    /checksum/,
  )
  assert.deepEqual(await readdir(folder), [])
})
test('HTTP errors, insecure URLs and aborts never install a tool', async (t) => {
  const folder = await temporary(t)
  const destination = path.join(folder, 'tool')
  await assert.rejects(
    downloadVerified(asset, destination, {
      fetchImpl: async () => new Response('missing', { status: 404 }),
    }),
    /404/,
  )
  await assert.rejects(
    downloadVerified({ ...asset, url: 'http://example.test' }, destination),
    /Invalid/,
  )
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    downloadVerified(asset, destination, {
      signal: controller.signal,
      fetchImpl: async () => new Response('tool-data'),
    }),
    /abort/i,
  )
  assert.deepEqual(await readdir(folder), [])
})
test('tool installation reuses verified cache and repairs corrupted executables', async (t) => {
  const folder = await temporary(t)
  let downloads = 0
  const options = {
    entries: [asset],
    download: async (_asset, file) => {
      downloads++
      await writeFile(file, 'tool-data')
    },
  }
  const tools = await ensureTools(folder, undefined, options)
  await ensureTools(folder, undefined, options)
  assert.equal(downloads, 1)
  await writeFile(tools.ffmpeg, 'corrupted')
  await ensureTools(folder, undefined, options)
  assert.equal(downloads, 2)
  assert.equal(await readFile(tools.ffmpeg, 'utf8'), 'tool-data')
  assert.equal(
    (await readdir(folder)).some((name) => name.startsWith('.install-')),
    false,
  )
})
test('failed tool installation is cleaned and cannot become a completed cache', async (t) => {
  const folder = await temporary(t)
  await assert.rejects(
    ensureTools(folder, undefined, {
      entries: [asset],
      download: async (_asset, file) => {
        await writeFile(file, 'partial')
        throw new Error('connection lost')
      },
    }),
    /connection lost/,
  )
  assert.deepEqual(await readdir(folder), [])
})
test('only selected archive executables are written using fixed basenames', async (t) => {
  const folder = await temporary(t)
  const archive = path.join(folder, 'tool.zip')
  const output = path.join(folder, 'output')
  await mkdir(output)
  await writeFile(
    archive,
    zipFixture([
      { name: 'build/bin/ffmpeg', body: 'verified-tool' },
      { name: 'build/README', body: 'ignore' },
    ]),
  )
  await extractExecutables(archive, output, ['ffmpeg'])
  assert.deepEqual(await readdir(output), ['ffmpeg'])
  assert.equal(await readFile(path.join(output, 'ffmpeg'), 'utf8'), 'verified-tool')
})
test('rejects symlinks, traversal entries, duplicate executables and missing tools', async (t) => {
  const folder = await temporary(t)
  const attacks = [
    [{ name: 'ffmpeg', body: '../outside', mode: 0o120777 }],
    [{ name: '../ffmpeg' }],
    [{ name: 'one/ffmpeg' }, { name: 'two/ffmpeg' }],
    [{ name: 'another-tool' }],
  ]
  for (let i = 0; i < attacks.length; i++) {
    const archive = path.join(folder, `${i}.zip`)
    const output = path.join(folder, `output-${i}`)
    await mkdir(output)
    await writeFile(archive, zipFixture(attacks[i]))
    await assert.rejects(extractExecutables(archive, output, ['ffmpeg']))
  }
  await assert.rejects(readFile(path.join(folder, 'ffmpeg')), /ENOENT/)
})
test('all supported platform manifests pin HTTPS assets, SHA256 and the full toolset', () => {
  assert.equal(Object.keys(manifest.platforms).length, 6)
  for (const entries of Object.values(manifest.platforms)) {
    const tools = Object.assign({}, ...entries.map((entry) => entry.executables))
    assert.deepEqual(Object.keys(tools).sort(), ['deno', 'ffmpeg', 'ffprobe', 'ytdlp'])
    for (const entry of entries) {
      assert.match(entry.sha256, /^[a-f0-9]{64}$/)
      assert.equal(new URL(entry.url).protocol, 'https:')
      assert.ok(!entry.url.includes('/latest/'))
    }
  }
})

test('cancelling archive extraction closes its output before cleanup', async (t) => {
  const { watch } = require('node:fs')
  const folder = await temporary(t)
  const archive = path.join(folder, 'tool.zip')
  const output = path.join(folder, 'output')
  await mkdir(output)
  await writeFile(archive, zipFixture([{ name: 'ffmpeg', body: 'x'.repeat(2 * 1024 * 1024) }]))
  const controller = new AbortController()
  const watcher = watch(output, () => controller.abort())
  try {
    await assert.rejects(
      extractExecutables(archive, output, ['ffmpeg'], controller.signal),
      /abort|cancel/i,
    )
    await rm(output, { recursive: true, force: true })
  } finally {
    watcher.close()
  }
})
