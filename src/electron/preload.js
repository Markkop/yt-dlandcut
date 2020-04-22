const main = require('../../build').main

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }

  const form = document.querySelector('form')
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    new FormData(form)
  })

  form.addEventListener('formdata', (event) => {
    const data = event.formData
    const entries = [...data.entries()]
    const values = [...data.values()]

    const [youtubeUrl, startTime, endTime] = values
    const options = entries.reduce((options, entry) => {
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

      return options
    }, {})

    main(youtubeUrl, startTime, endTime, options)
  })
})
