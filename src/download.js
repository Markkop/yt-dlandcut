import fs from 'fs'
import youtubedl from 'youtube-dl'
import { checkAndCreateFolder } from './helpers'

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

      const video = youtubedl(youtubeUrl, ['--format=18'], { cwd: __dirname })

      video.on('info', function (info) {
        console.log(`> Starting download from ${youtubeUrl}`)
        console.log('>> filename: ' + info._filename)
        console.log('>> size: ' + info.size)
      })

      video.pipe(fs.createWriteStream(downloadPath))

      video.on('end', function () {
        console.log('> Download finished ')
        resolve(true)
      })
    } catch (error) {
      console.log('> Download failed', error)
      reject(false)
    }
  })
}
