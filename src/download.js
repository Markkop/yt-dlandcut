import fs from 'fs'
import path from 'path'
import { checkAndCreateFolder, updateStatus } from './helpers'
import axios from 'axios'
import { binariesPath, ffmpegFilePath } from './settings'
import ytdl from 'ytdl-core'

/**
 * Get Youtube's video title
 * @param { String } url
 * @returns { Promise<String> }
 */
export async function getVideoTitle(url = '') {
  try {
    const info = await ytdl.getBasicInfo(url);
    const { title } = info.videoDetails;
    return title;
  } catch (error) {
    console.error(error);
    throw error;
  }
}


export async function downloadFromYoutube(youtubeUrl, downloadPath, fileName, overwriteFile) {
  return new Promise(async (resolve, reject) => {
    try {
      checkAndCreateFolder(downloadPath)
      const filePath = path.join(downloadPath, `${fileName}.mp4`)

      if (fs.existsSync(filePath) && !overwriteFile) {
        const message = `💡 Skipping download: file exists and overwrite option was not checked`
        updateStatus(message)
        return resolve(filePath)
      }

      const info = await ytdl.getInfo(youtubeUrl)
      const format = ytdl.chooseFormat(info.formats, {
        filter: "audioandvideo",
        quality: "highest"
      })

      updateStatus(`⬇️ Downloading from ${youtubeUrl}`)
      const video = ytdl.downloadFromInfo(info, {
        quality: format.itag
      })

      let lastPercent = 0;

      video.on('progress', (chunkLength, downloaded, total) => {
        const percent = Math.floor((downloaded / total) * 100);
        if (percent % 25 === 0 && percent !== lastPercent) {
          const message = `⬇️ Downloading video ${fileName}: ${percent}% downloaded`;
          updateStatus(message);
          lastPercent = percent;
        }
      });

      video.pipe(fs.createWriteStream(filePath))

      video.on('end', function () {
        const message = `✅ Video has been downloaded to ${filePath}`
        updateStatus(message)
        resolve(filePath)
      })

      video.on('error', function (error) {
        const message = `❌ Download failed: ${error}`
        updateStatus(message)
        reject(false)
      })
    } catch (error) {
      updateStatus(`❌ Download failed: ${error}`)
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

    const hasFfmpeg = fs.existsSync(ffmpegFilePath)

    if (!hasFfmpeg) {
      updateStatus(
        "💡 It looks like this is your first time running this app, I'll download the required files it needs to work. ;)"
      )
    }

    if (!hasFfmpeg) {
      updateStatus(`⬇️ File ${ffmpegFilePath} not found, downloading...`)
      // updateStatus('⌛️ This one is kinda big, it may take a while :o')
      const ffmpegDownloadName = `ffmpeg-${process.platform}-${process.arch}`
      const ffmpegUrl = `https://github.com/eugeneware/ffmpeg-static/releases/latest/download/${ffmpegDownloadName}`
      success = await downloadFile(ffmpegUrl, binariesPath, ffmpegFileName)
    }

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
  updateStatus(`⬇️ Downloading ${url} to ${downloadPath}`)

  const downloadFilePath = path.join(downloadPath, fileName)
  const writer = fs.createWriteStream(downloadFilePath)
  const response = await axios(url, {
    method: 'GET',
    responseType: 'stream',
  })
  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      updateStatus(`✅ Download finished`)
      if (process.platform === 'linux' || process.platform === 'darwin') {
        updateStatus(`✅ File permissions applied`)
        fs.chmodSync(downloadFilePath, 0o777)
      }
      resolve(path)
    })
    writer.on('error', (err) => {
      updateStatus(`❌ Error on download: ${err}`)
      reject(false)
    })
  })
}
