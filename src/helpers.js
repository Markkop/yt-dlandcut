import fs from 'fs'
import { shell } from 'electron'

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

  const previousText = status.innerText
  if (!previousText) {
    status.innerText = `[${time}] ${message}`
  } else {
    status.innerText = `${previousText}\n[${time}] ${message}`
  }
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
