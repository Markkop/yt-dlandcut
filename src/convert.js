import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import { checkAndCreateFolder, updateStatus } from './helpers'
import { ffmpegFilePath } from './settings'

/**
 * Cut videos by it's start time and duration in seconds
 * @param { String } inputPath folder path
 * @param { String } onputPath folder path
 * @param { String } fileName file name without extension
 * @param { String } startTime in format 00:00:00
 * @param { String } duration in seconds
 * @returns { Promise<String|Boolean> } converted file path or false if fail
 */
export function cutVideo(inputPath, outputPath, fileName, startTime, duration) {
  return new Promise((resolve, reject) => {
    checkAndCreateFolder(outputPath)
    const outputFilePath = path.join(outputPath, `${fileName}.mp4`)

    const conv = new ffmpeg({ source: inputPath })
    conv
      .setStartTime(startTime)
      .setDuration(duration)
      .setFfmpegPath(ffmpegFilePath)
      .on('start', function (commandLine) {
        const message = `Starting ffmpeg with command:\n${commandLine}`
        updateStatus(message)
      })
      .on('error', function (err) {
        updateStatus(`>> Error while converting: ${err}`)
        reject(err)
      })
      .on('end', function (err) {
        if (!err) {
          const message = `Video ${inputPath} has been cut with success to ${outputFilePath}`
          updateStatus(message)
          resolve(outputFilePath)
        }
      })
      .saveToFile(outputFilePath)
  })
}

/**
 * Convert a video to mp3
 * @param { String } inputPath folder path
 * @param { String } onputPath folder path
 * @param { String } fileName file name without extension
 * @returns { Promise<String|Boolean> } converted file path or false if fail
 */
export function convertToMp3(inputPath, outputPath, fileName) {
  return new Promise((resolve, reject) => {
    checkAndCreateFolder(outputPath)
    const outputFilePath = path.join(outputPath, `${fileName}.mp3`)

    const conv = new ffmpeg({ source: inputPath })
    conv
      .toFormat('mp3')
      .setFfmpegPath(ffmpegFilePath)
      .on('start', function (commandLine) {
        const message = `Starting ffmpeg with command:\n${commandLine}`
        updateStatus(message)
      })
      .on('error', function (err) {
        updateStatus(`>> Error while converting: ${err}`)
        reject(false)
      })
      .on('end', function (err) {
        if (!err) {
          const message = `Video ${inputPath} converted with success to ${outputFilePath}`
          updateStatus(message)
          resolve(outputFilePath)
        }
      })
      .saveToFile(outputFilePath)
  })
}
