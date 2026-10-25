const links = Object.freeze({
  project: 'https://github.com/Markkop/yt-dlandcut',
  releases: 'https://github.com/Markkop/yt-dlandcut/releases/latest',
  blog: 'https://markkop.dev',
  github: 'https://github.com/Markkop',
  twitter: 'https://twitter.com/HeyMarkKop',
  linkedin: 'https://www.linkedin.com/in/marcelo-kopmann/',
})

function assertTrustedSender(event, window, pageUrl) {
  if (
    !window ||
    window.isDestroyed() ||
    event.sender !== window.webContents ||
    !event.senderFrame ||
    event.senderFrame !== window.webContents.mainFrame ||
    event.senderFrame.url !== pageUrl
  ) {
    throw new Error('Untrusted IPC sender.')
  }
}

function externalLink(key) {
  if (typeof key !== 'string' || !Object.hasOwn(links, key))
    throw new Error('Unknown external link.')
  return links[key]
}

module.exports = { assertTrustedSender, externalLink }
