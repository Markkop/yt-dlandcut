const path = require('node:path')
const { createReadStream, createWriteStream } = require('node:fs')
const {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  copyFile,
  chmod,
  rename,
  rm,
} = require('node:fs/promises')
const { createHash } = require('node:crypto')
const { Readable, Transform } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const { extractExecutables } = require('./zip')
const manifest = require('../tools-manifest.json')

async function fileHash(file) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

async function downloadVerified(asset, destination, { fetchImpl = fetch, signal } = {}) {
  const url = new URL(asset.url)
  if (url.protocol !== 'https:' || !/^[a-f0-9]{64}$/.test(asset.sha256))
    throw new Error('Invalid tool manifest entry.')
  const requestSignal = AbortSignal.any([
    AbortSignal.timeout(10 * 60_000),
    ...(signal ? [signal] : []),
  ])
  const response = await fetchImpl(url, { signal: requestSignal })
  if (!response.ok || !response.body)
    throw new Error(`Tool download failed: HTTP ${response.status}. Please try again.`)
  if (response.url && new URL(response.url).protocol !== 'https:')
    throw new Error('Tool download redirected to an insecure URL.')
  let size = 0
  const limit = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length
      callback(
        size > 512 * 1024 * 1024 ? new Error('Tool download exceeded the size limit.') : null,
        chunk,
      )
    },
  })
  try {
    await pipeline(
      Readable.fromWeb(response.body),
      limit,
      createWriteStream(destination, { flags: 'wx', mode: 0o600 }),
      { signal: requestSignal },
    )
    if ((await fileHash(destination)) !== asset.sha256)
      throw new Error('Tool checksum verification failed. Nothing was installed. Please try again.')
  } catch (error) {
    await rm(destination, { force: true })
    throw error
  }
}

async function ensureTools(
  root,
  status = () => {},
  {
    signal,
    platform = process.platform,
    arch = process.arch,
    entries = manifest.platforms[`${platform}-${arch}`],
    download = downloadVerified,
  } = {},
) {
  if (!entries?.length) throw new Error(`This platform is not supported: ${platform}-${arch}.`)
  const executables = Object.assign({}, ...entries.map((asset) => asset.executables))
  const names = Object.values(executables)
  if (names.some((name) => !/^[a-z0-9-]+(?:\.exe)?$/.test(name)))
    throw new Error('Invalid executable name in manifest.')
  signal?.throwIfAborted()
  await mkdir(root, { recursive: true, mode: 0o700 })
  const key = createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0, 20)
  const target = path.join(root, key)
  try {
    const receipt = JSON.parse(await readFile(path.join(target, 'receipt.json'), 'utf8'))
    for (const name of names) {
      if (receipt[name] !== (await fileHash(path.join(target, name))))
        throw new Error('Tool cache is incomplete.')
    }
  } catch {
    const temporary = await mkdtemp(path.join(root, '.install-'))
    try {
      const staged = path.join(temporary, 'ready')
      await mkdir(staged)
      for (let i = 0; i < entries.length; i++) {
        const asset = entries[i]
        signal?.throwIfAborted()
        status(
          `⬇️ Setting up ${Object.keys(asset.executables).join(' and ')} ${asset.version}. This may take a few minutes…`,
        )
        const payload = path.join(temporary, `payload-${i}`)
        await download(asset, payload, { signal })
        const expectedNames = Object.values(asset.executables)
        if (asset.archive) {
          await extractExecutables(payload, staged, expectedNames, signal)
        } else {
          if (expectedNames.length !== 1) throw new Error('Invalid executable manifest.')
          await copyFile(payload, path.join(staged, expectedNames[0]))
        }
        await rm(payload)
      }
      const receipt = {}
      for (const name of names) {
        const destination = path.join(staged, name)
        await chmod(destination, 0o700)
        receipt[name] = await fileHash(destination)
      }
      await writeFile(path.join(staged, 'receipt.json'), JSON.stringify(receipt), { mode: 0o600 })
      signal?.throwIfAborted()
      await rm(target, { recursive: true, force: true })
      await rename(staged, target)
      status('✅ Tools verified and ready.')
    } finally {
      await rm(temporary, { recursive: true, force: true })
    }
  }
  return Object.fromEntries(
    Object.entries(executables).map(([tool, name]) => [tool, path.join(target, name)]),
  )
}

module.exports = { fileHash, downloadVerified, ensureTools }
