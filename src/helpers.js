import fs from 'fs'
import { shell } from 'electron'
import { version as currentVersion } from '../package.json'
import axios from 'axios'

/**
 * Check if a detected version is newer than current
 * TO DO: refactor this, perhaps recursively?
 * @param { String } curr
 * @param { String } detected
 * @returns { Boolean } true if detected is newer
 */
function isNewVersion(curr, detected) {
  const [currMajor, currMinor, currPatch] = curr.split('.').map(Number)
  const [detectedMajor, detectedMinor, detectedPatch] = detected.split('.').map(Number)

  if (detectedMajor === currMajor) {
    if (detectedMinor === currMinor) {
      if (detectedPatch === currPatch) {
        return false
      } else {
        return detectedMinor > currMinor
      }
    } else {
      return detectedMinor > currMinor
    }
  } else {
    return detectedMajor > currMajor
  }
}

/**
 * Check if there's a new version released
 * @returns { Promise<Boolean> } true if there is
 */
export function checkUpdates() {
  return new Promise(async (resolve, reject) => {
    try {
      axios.defaults.adapter = require('axios/lib/adapters/http')
      const infoUrl = 'https://github.com/Markkop/yt-dlandcut/releases/latest/download/latest-linux.yml'
      const response = await axios.get(infoUrl)
      const data = response.data
      const [fullMatch, detectedVersion] = data.match(/version: (.*?)\s/)
      if (!detectedVersion) {
        return resolve(false)
      }

      if (isNewVersion(currentVersion, detectedVersion)) {
        updateStatus(
          `🔥 New version ${detectedVersion} available! Current is ${currentVersion}.\nDownload at https://github.com/Markkop/yt-dlandcut/releases/latest/ `
        )
        return resolve(true)
      }
      return resolve(false)
    } catch (error) {
      updateStatus(`⚠ Update checking failed: ${error}`)
      reject(false)
    }
  })
}

/**
 * Get the time duration betweet two dates
 * @param { String } startTime
 * @param { String } endTime
 * @returns { Number } seconds
 */
export function getDuration(startTime, endTime) {
  const startDate = new Date(`2020-03-04T${startTime}Z`)
  const endDate = new Date(`2020-03-04T${endTime}Z`)
  const seconds = (endDate.getTime() - startDate.getTime()) / 1000
  return seconds
}

/**
 * Opens a file or a folder
 * @param { String } path
 */
export function openItem(path) {
  shell.openItem(path)
  const message = `⚙️ Opening ${path} `
  updateStatus(message)
}

/**
 * Check if path exists and if doesn't,
 * then creates it.
 * @param { String } path
 */
export function checkAndCreateFolder(path) {
  if (!fs.existsSync(path)) {
    updateStatus(`⚙️ Path ${path} not found, creating one`)
    fs.mkdirSync(path, { recursive: true })
  }
}

/**
 * Updates shown status message
 * @param { String } message
 */
export function updateStatus(message) {
  const today = new Date()
  const hours = (today.getHours() < 10 ? '0' : '') + today.getHours()
  const minutes = (today.getMinutes() < 10 ? '0' : '') + today.getMinutes()
  const seconds = (today.getSeconds() < 10 ? '0' : '') + today.getSeconds()
  const time = `${hours}:${minutes}:${seconds}`
  console.log(message)
  if (typeof document === 'undefined') {
    return
  }

  const status = document.querySelector('#status')
  if (!status) {
    return
  }

  const p = document.createElement('p')
  const text = `[${time}] ${message}`
  p.innerText = text
  twemoji.parse(p)
  status.appendChild(p)
}

/**
 * Replace or remove all characters that might cause problems
 * @param { String } str
 */
export function slugify(str) {
  const map = {
    '-': ':| |_',
    a: 'á|à|ã|â|À|Á|Ã|Â',
    e: 'é|è|ê|É|È|Ê',
    i: 'í|ì|î|Í|Ì|Î',
    o: 'ó|ò|ô|õ|Ó|Ò|Ô|Õ',
    u: 'ú|ù|û|ü|Ú|Ù|Û|Ü',
    c: 'ç|Ç',
    n: 'ñ|Ñ',
  }
  str = str.toLowerCase()
  for (let pattern in map) {
    str = str.replace(new RegExp(map[pattern], 'g'), pattern)
  }
  str = str.replace(/[^a-zA-Z0-9-]/g, '') // Remove non letters and numbers, except for "-"
  str = str.replace(/-{2,}/g, '-') // If there's more than one "-" consecutive, remove them
  str = str.replace(/^-/g, '') // Can't start with "-" or youtube-dl throws error
  return str
}
