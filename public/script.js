function updateStatus(message) {
  const status = document.querySelector('#status')
  const line = document.createElement('p')
  line.textContent = `[${new Date().toLocaleTimeString()}] ${String(message)}`
  status.appendChild(line)
  while (status.childElementCount > 300) status.firstElementChild.remove()
}

function formatTimeInput(event) {
  const input = event.target
  const digits = input.value.replace(/\D/g, '').slice(0, 6)
  input.value = digits.match(/.{1,2}/g)?.join(':') || ''
  input.setCustomValidity('')
}

function setBusy(busy) {
  document.querySelector('input[type=submit]').value = busy ? 'Please wait' : 'Submit'
  for (const input of document.querySelectorAll('form input:not(.open-folder-button)'))
    input.disabled = busy
  document.querySelector('#cancel').hidden = !busy
  document.querySelector('#cancel').disabled = false
}

async function invoke(operation) {
  const result = await operation
  if (!result?.ok) throw new Error(result?.error || 'Operation failed.')
  return result.value
}

function attachLinks(api) {
  const links = {
    '.github-project': 'project',
    '.myblog': 'blog',
    '.github-personal': 'github',
    '.twitter-personal': 'twitter',
    '.linkedin-personal': 'linkedin',
  }
  for (const [selector, key] of Object.entries(links)) {
    const element = document.querySelector(selector)
    if (!element) continue
    element.setAttribute('role', 'link')
    element.setAttribute('tabindex', '0')
    element.setAttribute(
      'aria-label',
      {
        project: 'Source code',
        blog: 'Author website',
        github: 'Author GitHub',
        twitter: 'Author Twitter',
        linkedin: 'Author LinkedIn',
      }[key],
    )
    const open = () => invoke(api.openLink(key)).catch((error) => updateStatus(error.message))
    element.addEventListener('click', open)
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') open()
    })
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const api = window.downloadApp
  updateStatus('💡 Progress will appear here ;)')
  if (!api) {
    updateStatus('Open this application through Electron to download videos.')
    return
  }
  const unsubscribe = api.onStatus(updateStatus)
  window.addEventListener('beforeunload', unsubscribe, { once: true })
  document
    .querySelectorAll('.time-input')
    .forEach((input) => input.addEventListener('input', formatTimeInput))
  document.querySelector('#url').addEventListener('input', (event) => {
    if (event.target.value === 'demo') {
      for (const input of document.querySelectorAll('input[type=text]:not(#filename)'))
        input.value = input.placeholder
    }
  })
  const form = document.querySelector('form')
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const request = {
      youtubeUrl: data.get('url'),
      startTime: data.get('startTime'),
      endTime: data.get('endTime'),
      options: {
        customFileName: data.get('filename'),
        toMp3: data.has('mp3'),
        openAtFinish: data.has('open'),
        overwriteDownload: data.has('overwriteDownload'),
      },
    }
    document.querySelector('#status').replaceChildren()
    setBusy(true)
    try {
      await invoke(api.download(request))
    } catch (error) {
      updateStatus(`❌ ${error.message}`)
    } finally {
      setBusy(false)
    }
  })
  document.querySelector('#cancel').addEventListener('click', async (event) => {
    event.target.disabled = true
    try {
      await invoke(api.cancel())
      updateStatus('Cancelling…')
    } catch (error) {
      updateStatus(error.message)
      event.target.disabled = false
    }
  })
  document
    .querySelector('.open-folder-button')
    .addEventListener('click', () =>
      invoke(api.openOutputFolder()).catch((error) => updateStatus(error.message)),
    )
  attachLinks(api)
  invoke(api.checkUpdates())
    .then((version) => {
      if (version) {
        updateStatus(`🔥 Version ${version} is available.`)
        const link = document.createElement('button')
        link.type = 'button'
        link.textContent = 'Download latest release'
        link.addEventListener('click', () =>
          invoke(api.openLink('releases')).catch((error) => updateStatus(error.message)),
        )
        document.querySelector('#status').appendChild(link)
      }
    })
    .catch(() => updateStatus('⚠️ Could not check for updates.'))
})
