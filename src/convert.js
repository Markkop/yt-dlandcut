import ffmpeg from 'fluent-ffmpeg'

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
    const conv = new ffmpeg({ source: inputPath })
    conv
      .setStartTime(startTime)
      .setDuration(duration)
      .on('start', function (commandLine) {
        console.log('> Starting ffmpeg with command: \n>>', commandLine)
      })
      .on('error', function (err) {
        console.log('>> Error while converting: ', +err)
        reject(false)
      })
      .on('end', function (err) {
        if (!err) {
          console.log('>> Video converted with success')
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
    const conv = new ffmpeg({ source: inputPath })
    conv
      .toFormat('mp3')
      .on('start', function (commandLine) {
        console.log('> Starting ffmpeg with command: \n>>', commandLine)
      })
      .on('error', function (err) {
        console.log('>> Error while converting: ', +err)
        reject(false)
      })
      .on('end', function (err) {
        if (!err) {
          console.log('>> Video converted with success')
          resolve(true)
        }
      })
      .saveToFile(outputPath)
  })
}
