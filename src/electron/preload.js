const { downloadAndCut } = require('../../build')
const { openItem } = require('../../build/helpers')
const { outputPath } = require('../../build/settings')
const { shell } = require('electron')

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  listenAndHandleForm()
  listenFolderButton()
  attachLinks()
})

function toggleButton() {
  const button = document.querySelector('input[type=submit]')
  button.disabled = !button.disabled
  const isDisabled = button.disabled
  const buttonText = isDisabled ? 'Please wait' : 'Submit'
  button.value = buttonText
}

function listenAndHandleForm() {
  const form = document.querySelector('form')
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    toggleButton()
    clearStatus()
    new FormData(form)
  })

  form.addEventListener('formdata', async (event) => {
    const data = event.formData
    const entries = [...data.entries()]
    const values = [...data.values()]

    const [youtubeUrl, startTime, endTime] = values
    const options = entries.reduce(reduceOptionsToObject, {})

    await downloadAndCut(youtubeUrl, startTime, endTime, options)
    toggleButton()
  })
}

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

function listenFolderButton() {
  const button = document.querySelector('.open-folder-button')
  if (!button) {
    return
  }
  button.addEventListener('click', () => openItem(outputPath))
}

function clearStatus() {
  const status = document.querySelector('#status')
  if (!status) {
    return
  }
  status.innerText = ''
}

const mapLinks = {
  '.github-icon': 'https://github.com/Markkop/yt-dlandcut',
  '.myblog': 'https://markkop.dev',
  '.dayu-twitter': 'https://twitter.com/dayuwastaken',
  '.github-personal': 'https://github.com/Markkop',
  '.twitter-personal': 'https://twitter.com/HeyMarkKop',
  '.linkedin-personal': 'https://www.linkedin.com/in/marcelo-kopmann/',
}

function attachLinks() {
  for (let className in mapLinks) {
    attachLinkToClassElement(className, mapLinks[className])
  }
}

function attachLinkToClassElement(className, url) {
  const element = document.querySelector(className)
  if (!element) {
    return
  }
  element.addEventListener('click', () => shell.openExternal(url))
}
