import inquirer from 'inquirer'
import { exec } from 'child_process'
import settings from './defaultSettings'

/**
 * @typedef UserOptions
 * @property { Boolean } openAtFinish
 * @property { String } youtubeUrl
 * @property { String } startTime HH:MM:SS
 * @property { String } endTime HH:MM:SS
 */

/**
 * Validate if time is in expected format
 * @param { String } value
 * @returns { true|String } success or error message
 */
function validateTime(value) {
  const expectedFormat = /\d{2}:\d{2}:\d{2}/
  if (expectedFormat.test(value)) {
    return true
  }
  return 'Wrong format'
}

/**
 * Validate if url is in expected format
 * @param { String } value
 * @returns { true|String } success or error message
 */
function validateYoutubeUrl(value) {
  const isYouTubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//
  if (isYouTubeRegex.test(value)) {
    return true
  }

  return 'Please enter a youtube url'
}

/**
 * Request user input
 * @returns { UserOptions }
 */
export function askOptions() {
  return new Promise((resolve, reject) => {
    const { startTime, endTime, url } = settings

    const questions = [
      {
        type: 'input',
        name: 'youtubeUrl',
        message: 'Please input the youtube video you wish to download and cut:',
        default: url,
        validate: validateYoutubeUrl,
      },
      {
        type: 'input',
        name: 'startTime',
        message: 'Please provide the startTime in the format HH:MM:SS',
        default: startTime,
        validate: validateTime,
      },
      {
        type: 'input',
        name: 'endTime',
        message: 'Please provide the endTime in the format HH:MM:SS',
        default: endTime,
        validate: validateTime,
      },
      {
        type: 'confirm',
        name: 'toMp3',
        message: 'Do you wish to convert this fragment to mp3?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'openAtFinish',
        message: 'Open file after finishing?',
        default: false,
      },
    ]

    inquirer.prompt(questions).then((answers) => resolve(answers))
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
 * Format a title to filename
 * @param { String } title
 * @returns { String } fileName
 */
export function formatFileName(title) {
  return title.replace(/\W/g, '_')
}

/**
 * Opens a file
 * @param { String } path
 */
export function openFile(path) {
  console.log('> Opening file with VLC Player')
  const command = `vlc ${path}`
  console.log(`>> ${command}`)
  exec(command)
}
