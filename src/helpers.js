import fs from 'fs'
import { exec } from 'child_process'

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
 * Format a title to filename
 * @param { String } title
 * @returns { String } fileName
 */
export function formatFileName(title = '') {
  return title.replace(/\W/g, '_')
}

/**
 * Opens a file
 * @param { String } path
 */
export function openFile(path) {
  const command = `vlc ${path}`
  const message = `Opening file with command: ${command}`
  console.log(message)
  updateStatus(message)
  exec(command)
}

/**
 * Removes a filename from a given path
 * and then check if this path exists.
 * If not, then creates it.
 * TO DO: remove filename from path at index.js
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
  console.log(message)
  if (!document) {
    return
  }

  const status = document.querySelector('#status')
  if (!status) {
    return
  }

  const previousText = status.innerText
  status.innerText = `${previousText}\n${message}`
}
