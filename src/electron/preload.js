const { downloadAndCut } = require('../../build')
const { openItem, checkUpdates, updateStatus } = require('../../build/helpers')
const { basePath } = require('../../build/settings')
const { shell } = require('electron')

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  updateStatus('💡 Progress will appear here ;)')
  listenAndHandleForm()
  listenFolderButton()
  attachLinks()
  checkUpdates()
})

/**
 * Enabled and disable submit button
 */
function toggleButton() {
  const button = document.querySelector('input[type=submit]')
  button.disabled = !button.disabled
  const isDisabled = button.disabled
  const buttonText = isDisabled ? 'Please wait' : 'Submit'
  button.value = buttonText
}

/**
 * Add a listener to form that
 * handles submissions
 */
function listenAndHandleForm() {
  const form = document.querySelector('form')
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    toggleButton()
    clearStatus()
    new FormData(form)
  })

  form.addEventListener('formdata', async (event) => {
    try {
      const data = event.formData
      const entries = [...data.entries()]
      const values = [...data.values()]

      const [youtubeUrl, startTime, endTime] = values
      const options = entries.reduce(reduceOptionsToObject, {})

      await downloadAndCut(youtubeUrl, startTime, endTime, options)
      toggleButton()
    } catch (error) {
      toggleButton()
      console.error(error)
    }
  })
}

/**
 * Converts formData entries to options object
 * @param { Object } options
 * @param { Array } entry
 * @returns { Object } options
 */
function reduceOptionsToObject(options, entry) {
  const [key, value] = entry

  if (key === 'filename') {
    options.customFileName = value
  }

  if (key === 'open') {
    options.openAtFinish = true
  }

  if (key === 'mp3') {
    options.toMp3 = true
  }

  if (key === 'overwriteDownload') {
    options.overwriteDownload = true
  }

  return options
}

/**
 * Add an event listener to folder button
 * that open output folder
 */
function listenFolderButton() {
  const button = document.querySelector('.open-folder-button')
  if (!button) {
    return
  }
  button.addEventListener('click', () => openItem(basePath))
}

/**
 * Clears status/log messages
 */
function clearStatus() {
  const status = document.querySelector('#status')
  if (!status) {
    return
  }
  status.innerText = ''
}

/**
 * Call attach link function for every class name in
 * mapLinks object
 */
function attachLinks() {
  const mapLinks = {
    '.github-icon': 'https://github.com/Markkop/yt-dlandcut',
    '.myblog': 'https://markkop.dev',
    '.github-personal': 'https://github.com/Markkop',
    '.twitter-personal': 'https://twitter.com/HeyMarkKop',
    '.linkedin-personal': 'https://www.linkedin.com/in/marcelo-kopmann/',
  }

  for (let className in mapLinks) {
    attachLinkToClassElement(className, mapLinks[className])
  }
}

/**
 * Attach a url opener to elements using class name
 * @param { String } className
 * @param { String } url
 */
function attachLinkToClassElement(className, url) {
  const element = document.querySelector(className)
  if (!element) {
    return
  }
  element.addEventListener('click', () => shell.openExternal(url))
}
