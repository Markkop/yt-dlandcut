import { shell } from 'electron'
import fs from 'fs'

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
  const message = `Opening ${path} `
  updateStatus(message)
}

/**
 * Removes a filename from a given path
 * and then check if this path exists.
 * If not, then creates it.
 * @param { String } path
 */
export function checkAndCreateFolder(path) {
  const pathWithFile = path.split('/')
  pathWithFile.pop()
  const pathWithoutFile = pathWithFile.join('/')
  if (!fs.existsSync(pathWithoutFile)) {
    fs.mkdirSync(pathWithoutFile, { recursive: true })
  }
}

/**
 * Updates shown status message
 * @param { String } message
 */
export function updateStatus(message) {
  const today = new Date()
  const time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds()
  console.log(message)
  if (!document) {
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
  return str
}
