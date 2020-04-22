import { remote } from 'electron'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import { checkAndCreateFolder, updateStatus } from './helpers'
import pathToFfmpeg from 'ffmpeg-static'
let ffmpegPath = pathToFfmpeg

/**
 * Change ffmpeg binary to its exe version.
 * TO DO: refactor this
 */
export function useWindowsBinaryFfmpeg() {
  if (process.platform === 'win32') {
    ffmpegPath = path.resolve(remote.app.getAppPath(), 'bin/ffmpeg.exe')
    const message = `Windows detected: using ffmpeg.exe at ${ffmpegPath}`
    updateStatus(message)
  }
}

/**
 * Cut videos by it's start time and duration in seconds
 * @param { String } inputPath file path
 * @param { String } onputPath file path
 * @param { String } startTime in format 00:00:00
 * @param { String } duration in seconds
 * @returns { Promise<Boolen> } has converted with success
 */
export function cutVideo(inputPath, outputPath, startTime, duration) {
  return new Promise((resolve, reject) => {
    checkAndCreateFolder(outputPath)

    const conv = new ffmpeg({ source: inputPath })
    conv
      .setStartTime(startTime)
      .setDuration(duration)
      .setFfmpegPath(ffmpegPath)
      .on('start', function (commandLine) {
        const message = `Starting ffmpeg with command: ${commandLine}`
        updateStatus(message)
      })
      .on('error', function (err) {
        console.log('>> Error while converting: ', err)
        reject(err)
      })
      .on('end', function (err) {
        if (!err) {
          const message = `Video ${inputPath} has been cut with success to ${outputPath}`
          updateStatus(message)
          resolve(true)
        }
      })
      .saveToFile(outputPath)
  })
}

/**
 * Convert a video to mp3
 * @param { String } inputPath file path
 * @param { String } onputPath file path
 * * @returns { Promise<Boolen> } has converted with success
 */
export function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    checkAndCreateFolder(outputPath)
    const conv = new ffmpeg({ source: inputPath })
    conv
      .toFormat('mp3')
      .setFfmpegPath(ffmpegPath)
      .on('start', function (commandLine) {
        const message = `Starting ffmpeg with command: ${commandLine}`
        updateStatus(message)
      })
      .on('error', function (err) {
        console.log('>> Error while converting: ', err)
        reject(false)
      })
      .on('end', function (err) {
        if (!err) {
          const message = `Video ${inputPath} converted with success to ${outputPath}`
          updateStatus(message)
          resolve(true)
        }
      })
      .saveToFile(outputPath)
  })
}
