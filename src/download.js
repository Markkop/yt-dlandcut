import { remote } from 'electron'
import fs from 'fs'
import path from 'path'
import youtubedl from 'youtube-dl'
import { checkAndCreateFolder, updateStatus } from './helpers'

/**
 * Change youtube-dl binary to its exe version.
 * TO DO: Refactor this to merge it with the similar function at convert.js
 */
export function useWindowsBinaryYoutubeDl() {
  if (process.platform === 'win32') {
    const customBinaryPath = path.resolve(remote.app.getAppPath(), 'bin/youtube-dl.exe')
    youtubedl.setYtdlBinary(customBinaryPath)
    const message = `Windows detected: using youtube-dl.exe at ${youtubedl.getYtdlBinary()}`
    updateStatus(message)
  }
}

/**
 * Get Youtube's video title
 * @param { String } url
 * @returns { Promise<String> }
 */
export function getVideoTitle(url = '') {
  return new Promise((resolve, reject) => {
    function callback(err, info) {
      if (err) {
        reject(err)
      }
      const { title } = info

      resolve(title)
    }
    youtubedl.getInfo(url, callback)
  })
}

/**
 * Download youtube video
 * @param { String } youtubeUrl youtube video url
 * @param { String } downloadPath folder path
 * @param { String } fileName file name without extension
 * @returns { Promise<String|Boolean>} downloaded file path or false if fail
 */
export function downloadFromYoutube(youtubeUrl, downloadPath, fileName, overwriteFile) {
  return new Promise((resolve, reject) => {
    try {
      checkAndCreateFolder(downloadPath)
      const filePath = path.join(downloadPath, `${fileName}.mp4`)

      if (fs.existsSync(filePath) && !overwriteFile) {
        const message = `Skipping download: file exists and overwrite option was not checked`
        updateStatus(message)
        return resolve(filePath)
      }

      const video = youtubedl(youtubeUrl, ['--format=18'], { cwd: __dirname })
      video.on('info', function (info) {
        const message = `Starting download from ${youtubeUrl} named ${info._filename} with size ${info.size}KB`
        updateStatus(message)
      })

      video.pipe(fs.createWriteStream(filePath))

      video.on('end', function () {
        const message = `Video from ${youtubeUrl} has been downloaded to ${filePath}`
        updateStatus(message)
        resolve(filePath)
      })
    } catch (error) {
      updateStatus(`Download failed: ${error}`)
      reject(false)
    }
  })
}
