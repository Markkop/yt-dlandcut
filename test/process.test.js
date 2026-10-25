const { test } = require('node:test')
const assert = require('node:assert/strict')
const { runProcess } = require('../src/process')

test('executes arguments literally, without a shell', async () => {
  const value = '"; $(echo unsafe) & < > `echo unsafe`'
  const result = await runProcess(process.execPath, [
    '-e',
    'process.stdout.write(process.argv[1])',
    value,
  ])
  assert.equal(result, value)
})
test('propagates process startup failures and nonzero exits', async () => {
  await assert.rejects(runProcess('yt-dlandcut-missing-executable', []), /ENOENT/)
  await assert.rejects(
    runProcess(process.execPath, ['-e', 'console.error("failure"); process.exit(2)']),
    /failure/,
  )
})
test('times out stuck processes and rejects cancelled requests', async () => {
  await assert.rejects(
    runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeout: 100 }),
    /timed out/,
  )
  const controller = new AbortController()
  const pending = runProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    signal: controller.signal,
  })
  controller.abort()
  await assert.rejects(pending, /cancelled/i)
})
test('enforces stdout size limits', async () => {
  await assert.rejects(
    runProcess(process.execPath, ['-e', 'console.log("x".repeat(2000))'], { maxOutput: 100 }),
    /too much/,
  )
})

test('cancellation terminates child tool processes as well as their parent', async (t) => {
  const path = require('node:path')
  const os = require('node:os')
  const { mkdtemp, rm, readFile } = require('node:fs/promises')
  const folder = await mkdtemp(path.join(os.tmpdir(), 'yt-dlandcut-tree-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const marker = path.join(folder, 'orphan-output')
  const grandchild = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'orphan'), 1500)`
  const parent = `const {spawn} = require('node:child_process'); const child = spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], {stdio:'inherit'}); child.on('spawn', () => console.log('ready')); setInterval(()=>{},1000)`
  const controller = new AbortController()
  const pending = runProcess(process.execPath, ['-e', parent], {
    signal: controller.signal,
    onLine: (line) => {
      if (line === 'ready') controller.abort()
    },
    timeout: 5000,
  })
  await assert.rejects(pending, /cancelled/)
  await assert.rejects(readFile(marker), /ENOENT/)
})
