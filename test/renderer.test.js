const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { JSDOM } = require('jsdom')
const html = readFileSync(require.resolve('../public/index.html'), 'utf8')
const script = readFileSync(require.resolve('../public/script.js'), 'utf8')
const tick = () => new Promise((resolve) => setImmediate(resolve))

async function renderer(t, overrides = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'file:///app/public/index.html' })
  t.after(() => dom.window.close())
  const calls = []
  const api = {
    onStatus: () => () => {},
    download: async (request) => {
      calls.push(request)
      return { ok: true }
    },
    openOutputFolder: async () => ({ ok: true }),
    openLink: async () => ({ ok: true }),
    checkUpdates: async () => ({ ok: true, value: null }),
    cancel: async () => ({ ok: true }),
    ...overrides,
  }
  dom.window.downloadApp = api
  dom.window.eval(script)
  await tick()
  return { window: dom.window, document: dom.window.document, calls }
}
function fill(document) {
  document.querySelector('#url').value = 'https://youtu.be/N9qjR6teBNw'
  document.querySelector('#startTime').value = '00:00:20'
  document.querySelector('#endTime').value = '00:00:22'
}

test('form collects options by name and restores controls after success', async (t) => {
  const { document, window, calls } = await renderer(t)
  fill(document)
  document.querySelector('#mp3').checked = true
  document.querySelector('#filename').value = 'My clip'
  document.querySelector('form').dispatchEvent(new window.Event('submit', { cancelable: true }))
  assert.equal(document.querySelector('input[type=submit]').disabled, true)
  assert.equal(document.querySelector('#cancel').hidden, false)
  await tick()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].options.toMp3, true)
  assert.equal(calls[0].options.customFileName, 'My clip')
  assert.equal(document.querySelector('input[type=submit]').disabled, false)
  assert.equal(document.querySelector('#cancel').hidden, true)
})
test('backend errors appear as text and restore controls', async (t) => {
  const { document, window } = await renderer(t, {
    download: async () => ({ ok: false, error: '<img src=x onerror=alert(1)>' }),
  })
  fill(document)
  document.querySelector('form').dispatchEvent(new window.Event('submit', { cancelable: true }))
  await tick()
  assert.match(document.querySelector('#status').textContent, /<img/)
  assert.equal(document.querySelector('#status img'), null)
  assert.equal(document.querySelector('input[type=submit]').disabled, false)
})
test('cancel calls the bridge while the job is pending', async (t) => {
  let finish
  let cancelled = false
  const { document, window } = await renderer(t, {
    download: () =>
      new Promise((resolve) => {
        finish = resolve
      }),
    cancel: async () => {
      cancelled = true
      return { ok: true }
    },
  })
  fill(document)
  document.querySelector('form').dispatchEvent(new window.Event('submit', { cancelable: true }))
  document.querySelector('#cancel').click()
  await tick()
  assert.equal(cancelled, true)
  finish({ ok: false, error: 'Operation cancelled.' })
  await tick()
  assert.equal(document.querySelector('input[type=submit]').disabled, false)
})
test('formats pasted timestamps without losing digits and makes source link keyboard accessible', async (t) => {
  let link
  const { document, window } = await renderer(t, {
    openLink: async (key) => {
      link = key
      return { ok: true }
    },
  })
  const input = document.querySelector('#startTime')
  input.value = '123456'
  input.dispatchEvent(new window.Event('input'))
  assert.equal(input.value, '12:34:56')
  const source = document.querySelector('.github-project')
  source.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }))
  await tick()
  assert.equal(source.getAttribute('tabindex'), '0')
  assert.equal(link, 'project')
})
test('renderer has a local-only CSP and no remote script or stylesheet dependencies', () => {
  const dom = new JSDOM(html)
  const document = dom.window.document
  const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]').content
  assert.match(csp, /default-src 'none'/)
  assert.match(csp, /connect-src 'none'/)
  for (const element of document.querySelectorAll('script[src],link[href]'))
    assert.ok(!/^https?:/.test(element.src || element.href))
  assert.equal(document.querySelector('#status').getAttribute('role'), 'log')
  dom.window.close()
})
