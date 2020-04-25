import fs from 'fs'
import path from 'path'
import youtubedl from 'youtube-dl'
import { checkAndCreateFolder, updateStatus } from './helpers'
import axios from 'axios'
import { binariesPath, youtubeDlFilePath, ffmpegFilePath } from './settings'

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

      const video = youtubedl(youtubeUrl, ['--format=18', '--no-cache-dir'], { cwd: __dirname })
      video.on('info', function (info) {
        const size = info.size / 1000000
        const message = `Starting download video ${info.title} with size ${size.toFixed(2)}MB`
        updateStatus(message)
      })

      video.pipe(fs.createWriteStream(filePath))

      video.on('end', function () {
        const message = `Video has been downloaded to ${filePath}`
        updateStatus(message)
        resolve(filePath)
      })
    } catch (error) {
      updateStatus(`Download failed: ${error}`)
      reject(false)
    }
  })
}

/**
 * Check and download required binaries according to os
 * @param { String } basePath
 * @returns { Promise<Bollean> } success
 */
export function checkAndDownloadBinaries() {
  return new Promise(async (resolve, reject) => {
    let success = true
    const isWin = process.platform === 'win32'
    const ffmpegFileName = isWin ? 'ffmpeg.exe' : 'ffmpeg'
    const youtubeDlFileName = isWin ? 'youtube-dl.exe' : 'youtube-dl'

    const hasYoutubeDl = fs.existsSync(youtubeDlFilePath)
    const hasFfmpeg = fs.existsSync(ffmpegFilePath)

    if (!hasYoutubeDl && !hasFfmpeg) {
      updateStatus(
        "It looks like this is your first time running this app, I'll download the required files it needs to work. ;)"
      )
    }
    if (!hasYoutubeDl) {
      updateStatus(`File ${youtubeDlFilePath} not found, downloading...`)
      const youtubeDlUrl = `https://github.com/ytdl-org/youtube-dl/releases/latest/download/${youtubeDlFileName}`
      success = await downloadFile(youtubeDlUrl, binariesPath, youtubeDlFileName)
    }

    if (!hasFfmpeg) {
      updateStatus(`File ${ffmpegFilePath} not found, downloading...`)
      updateStatus('This one is kinda big, it may take a while :o')
      const ffmpegDownloadName = `${process.platform}-${process.arch}`
      const ffmpegUrl = `https://github.com/eugeneware/ffmpeg-static/releases/latest/download/${ffmpegDownloadName}`
      success = await downloadFile(ffmpegUrl, binariesPath, ffmpegFileName)
    }

    youtubedl.setYtdlBinary(youtubeDlFilePath)
    if (success) {
      return resolve(true)
    } else {
      return reject(false)
    }
  })
}

/**
 * Downloads a file
 * @param { String } url
 * @param { String } downloadPath
 * @param { String } fileName
 * @returns { Promise<String|false> } downloaded file path or false
 */
async function downloadFile(url, downloadPath, fileName) {
  axios.defaults.adapter = require('axios/lib/adapters/http')

  checkAndCreateFolder(downloadPath)
  updateStatus(`Downloading ${url} to ${downloadPath}`)

  const downloadFilePath = path.join(downloadPath, fileName)
  const writer = fs.createWriteStream(downloadFilePath)
  const response = await axios(url, {
    method: 'GET',
    responseType: 'stream',
  })
  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      updateStatus(`Download finished`)
      if (process.platform === 'linux') {
        fs.chmodSync(downloadFilePath, 0o755)
      }
      resolve(path)
    })
    writer.on('error', (err) => {
      updateStatus(`Error on download: ${err}`)
      reject(false)
    })
  })
}
