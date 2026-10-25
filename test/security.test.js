const { test } = require('node:test')
const assert = require('node:assert/strict')
const { assertTrustedSender, externalLink } = require('../src/electron/security')

test('IPC requires the exact app window, main frame and local page', () => {
  const frame = { url: 'file:///app/index.html' }
  const contents = { mainFrame: frame }
  const window = { isDestroyed: () => false, webContents: contents }
  const event = { sender: contents, senderFrame: frame }
  assert.doesNotThrow(() => assertTrustedSender(event, window, frame.url))
  for (const bad of [
    { ...event, sender: {} },
    { ...event, senderFrame: { ...frame } },
    { ...event, senderFrame: null },
  ])
    assert.throws(() => assertTrustedSender(bad, window, frame.url), /Untrusted/)
  assert.throws(() => assertTrustedSender(event, window, 'https://evil.test'), /Untrusted/)
  assert.throws(
    () => assertTrustedSender(event, { ...window, isDestroyed: () => true }, frame.url),
    /Untrusted/,
  )
})
test('external URLs are selected from an own-property allowlist', () => {
  assert.equal(externalLink('project'), 'https://github.com/Markkop/yt-dlandcut')
  for (const key of ['file:///etc/passwd', 'https://evil.test', '__proto__', 'constructor', null])
    assert.throws(() => externalLink(key))
})
