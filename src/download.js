import { remote } from 'electron'
import fs from 'fs'
import path from 'path'
import youtubedl from 'youtube-dl'
import { checkAndCreateFolder, updateStatus } from './helpers'

/**
 * Change youtube-dl binary to its exe version.
 * TO DO: Refactor this to merge it with the similar function at convert.js
 */
export function useWindowsBinary() {
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
 * @param { String } downloadPath such as './videos/downloaded.mp4'
 * @returns { Promise<Boolean>} download sucess
 */
export function downloadFromYoutube(youtubeUrl, downloadPath) {
  return new Promise((resolve, reject) => {
    try {
      checkAndCreateFolder(downloadPath)

      if (fs.existsSync(downloadPath) && !overwriteFile) {
        const message = `Skipping download: file exists and overwrite option was not checked`
        updateStatus(message)
        return resolve(true)
      }

      const video = youtubedl(youtubeUrl, ['--format=18'], { cwd: __dirname })
      video.on('info', function (info) {
        const message = `Starting download from ${youtubeUrl} named ${info._filename} with size ${info.size}KB`
        updateStatus(message)
      })

      video.pipe(fs.createWriteStream(downloadPath))

      video.on('end', function () {
        const message = `Video from ${youtubeUrl} has been downloaded to ${downloadPath}`
        updateStatus(message)
        resolve(true)
      })
    } catch (error) {
      console.log('Download failed', error)
      reject(false)
    }
  })
}
