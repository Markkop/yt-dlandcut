// Exercise the real Electron renderer/preload/main bridge through local DevTools.
// Run inside a desktop session or xvfb-run. No test hooks are added to the application.
const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const { spawn } = require('node:child_process')
const { mkdtemp, readFile, writeFile, mkdir, rm, stat } = require('node:fs/promises')
const { setTimeout: delay } = require('node:timers/promises')
const { parseArgs } = require('node:util')
const { ensureTools } = require('../src/tools')
const { runProcess } = require('../src/process')

const { values } = parseArgs({
  options: {
    binary: { type: 'string' },
    network: { type: 'boolean', default: false },
    'allow-no-sandbox': { type: 'boolean', default: false },
    screenshot: { type: 'string' },
  },
})

async function waitFor(operation, timeout = 30_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const value = await operation()
    if (value) return value
    await delay(150)
  }
  throw new Error('Desktop smoke-test condition timed out.')
}

async function connect(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  let sequence = 0
  const pending = new Map()
  const exceptions = []
  socket.addEventListener('message', (event) => {
    const response = JSON.parse(String(event.data))
    if (response.method === 'Runtime.exceptionThrown')
      exceptions.push(response.params.exceptionDetails)
    const request = pending.get(response.id)
    if (!request) return
    pending.delete(response.id)
    clearTimeout(request.timer)
    if (response.error) request.reject(new Error(response.error.message))
    else request.resolve(response.result)
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`DevTools timed out: ${method}`))
      }, 180_000)
      pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description || result.exceptionDetails.text,
      )
    return result.result.value
  }
  return { send, evaluate, exceptions, close: () => socket.close() }
}

async function smokeDesktop() {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'yt-dlandcut-desktop-'))
  const binary = values.binary ? path.resolve(values.binary) : require('electron')
  const args = values.binary ? [] : [path.join(__dirname, '..')]
  args.push(
    '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`,
    '--disable-gpu',
  )
  if (values['allow-no-sandbox']) {
    console.log(
      'TEST LIMITATION: Chromium OS sandbox disabled for this process only. Host settings are unchanged.',
    )
    args.push('--no-sandbox')
  }
  const app = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  let logs = ''
  let exitCode
  let connection
  app.stdout.on('data', (chunk) => {
    logs = `${logs}${chunk}`.slice(-16_000)
  })
  app.stderr.on('data', (chunk) => {
    logs = `${logs}${chunk}`.slice(-16_000)
  })
  app.once('error', (error) => {
    logs += error.message
    exitCode = -1
  })
  app.once('exit', (code) => {
    exitCode = code ?? -1
  })
  const videoFolder = path.join(os.homedir(), 'yt-dlandcut', 'me-at-the-zoo-jNQXAC9IVRw')
  const existed = await stat(videoFolder).then(
    () => true,
    () => false,
  )
  const createdClips = []
  const clipName = `desktop-smoke-${Date.now()}`
  try {
    const port = await waitFor(async () => {
      if (exitCode !== undefined) throw new Error(`Electron exited (${exitCode}):\n${logs}`)
      return readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').then(
        (text) => text.split('\n')[0],
        () => null,
      )
    })
    const page = await waitFor(async () => {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
        response.json(),
      )
      return targets.find(
        (target) => target.type === 'page' && target.url.endsWith('/public/index.html'),
      )
    })
    connection = await connect(page.webSocketDebuggerUrl)
    const { evaluate, send } = connection
    await send('Runtime.enable')
    await waitFor(() =>
      evaluate(
        `document.readyState === 'complete' && typeof window.downloadApp?.download === 'function' && !!document.querySelector('#status p')`,
      ),
    )
    const security = await evaluate(
      `({ require: typeof require, process: typeof process, bridgeFrozen: Object.isFrozen(window.downloadApp), fontLoaded: document.fonts.check('300 16px Roboto'), hasCancel: !!document.querySelector('#cancel') })`,
    )
    assert.equal(security.require, 'undefined')
    assert.equal(security.process, 'undefined')
    assert.equal(security.bridgeFrozen, true)
    assert.equal(security.fontLoaded, true)
    assert.equal(security.hasCancel, true)
    console.log(
      'PASS: real renderer loads, local font works, Node is absent, isolated bridge is frozen.',
    )

    const invalid = await evaluate(
      `window.downloadApp.download({youtubeUrl:'https://evil.example/watch?v=jNQXAC9IVRw',startTime:'00:00:01',endTime:'00:00:03'})`,
    )
    assert.equal(invalid.ok, false)
    const link = await evaluate(`window.downloadApp.openLink('file:///etc/passwd')`)
    assert.equal(link.ok, false)
    const reversed = await evaluate(
      `window.downloadApp.download({youtubeUrl:'https://youtu.be/jNQXAC9IVRw',startTime:'00:00:03',endTime:'00:00:01'})`,
    )
    assert.equal(reversed.ok, false)
    assert.match(reversed.error, /after/)
    console.log('PASS: real IPC rejects invalid video targets, external links and reversed ranges.')

    await evaluate(
      `document.querySelector('#url').value='https://youtu.be/jNQXAC9IVRw'; document.querySelector('#startTime').value='00:00:03'; document.querySelector('#endTime').value='00:00:01'; document.querySelector('form').requestSubmit(); true`,
    )
    await waitFor(() =>
      evaluate(
        `!document.querySelector('input[type=submit]').disabled && document.querySelector('#status').textContent.includes('after')`,
      ),
    )
    console.log('PASS: submitting the real form displays backend errors and restores its controls.')

    if (values.network) {
      // Each fresh profile tests first-run tool installation. Outputs use unique names and cleanup
      // preserves any pre-existing user directory/source; forced redownload is tested only if new.
      const submit = async (toMp3, overwriteDownload = false) => {
        const fileName = `${clipName}-${toMp3 ? 'audio' : 'video'}${overwriteDownload ? '-again' : ''}`
        createdClips.push(path.join(videoFolder, `${fileName}.${toMp3 ? 'mp3' : 'mp4'}`))
        await evaluate(
          `document.querySelector('#startTime').value='00:00:01'; document.querySelector('#endTime').value='00:00:03'; document.querySelector('#filename').value=${JSON.stringify(fileName)}; document.querySelector('#mp3').checked=${toMp3}; document.querySelector('#overwriteDownload').checked=${overwriteDownload}; document.querySelector('form').requestSubmit(); true`,
        )
        await waitFor(
          () => evaluate(`!document.querySelector('input[type=submit]').disabled`),
          180_000,
        )
        const status = await evaluate(`document.querySelector('#status').textContent`)
        assert.match(status, /Finished!/, status)
        return status
      }
      const videoStatus = await submit(false)
      assert.match(videoStatus, /Setting up/)
      const audioStatus = await submit(true)
      assert.match(audioStatus, /Reusing the completed/)
      if (!existed) {
        const redownload = await submit(false, true)
        assert.match(redownload, /Downloading video/)
      }
      const tools = await ensureTools(path.join(os.tmpdir(), 'yt-dlandcut-smoke-tools'))
      for (const file of createdClips) {
        const probe = JSON.parse(
          await runProcess(tools.ffprobe, [
            '-v',
            'error',
            '-show_entries',
            'format=duration:stream=codec_name,codec_type',
            '-of',
            'json',
            file,
          ]),
        )
        assert.ok(Math.abs(Number(probe.format.duration) - 2) < 0.2)
        assert.ok(
          probe.streams.some(
            (stream) => stream.codec_name === (file.endsWith('.mp3') ? 'mp3' : 'h264'),
          ),
        )
      }
      console.log(
        'PASS: UI-driven first-run tools, live MP4, cached MP3, and safe forced redownload; durations/codecs verified.',
      )

      await evaluate(
        `document.querySelector('#mp3').checked=false; document.querySelector('form').requestSubmit(); document.querySelector('#cancel').click(); true`,
      )
      await waitFor(() =>
        evaluate(
          `!document.querySelector('input[type=submit]').disabled && document.querySelector('#status').textContent.toLowerCase().includes('cancel')`,
        ),
      )
      console.log('PASS: UI cancellation returns to idle.')
    }
    const errors = connection.exceptions
    assert.deepEqual(errors, [], `Unexpected renderer exceptions: ${JSON.stringify(errors)}`)
    const screenshot = path.resolve(
      values.screenshot || path.join(__dirname, '../dist/desktop-smoke.png'),
    )
    await mkdir(path.dirname(screenshot), { recursive: true })
    const png = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(screenshot, Buffer.from(png.data, 'base64'))
    console.log(`Screenshot: ${screenshot}`)
    console.log(`Desktop smoke passed (${values.binary ? 'packaged' : 'development'} app).`)
  } catch (error) {
    console.error(logs)
    throw error
  } finally {
    if (connection) {
      await connection.evaluate('window.close(); true').catch(() => {})
      connection.close()
    }
    if (exitCode === undefined) {
      await Promise.race([new Promise((resolve) => app.once('exit', resolve)), delay(3000)])
      if (exitCode === undefined) {
        app.kill()
        await new Promise((resolve) => app.once('exit', resolve))
      }
    }
    if (!existed) await rm(videoFolder, { recursive: true, force: true })
    else for (const file of createdClips) await rm(file, { force: true })
    // Chromium subprocesses may take a moment to release profile locks.
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

smokeDesktop().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
