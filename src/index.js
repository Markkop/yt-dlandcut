import path from 'path'
import { getDuration, openItem, slugify, updateStatus } from './helpers'
import { downloadFromYoutube, getVideoTitle, useWindowsBinaryYoutubeDl } from './download'
import { cutVideo, convertToMp3, useWindowsBinaryFfmpeg } from './convert'
import { outputPath } from './settings'

/**
 * Runs this package
 */
export async function downloadAndCut(youtubeUrl, startTime, endTime, options) {
  try {
    if (!youtubeUrl || !startTime || !endTime) {
      throw new Error('Missing obrigatory argument')
    }
    updateStatus('Starting...')

    // TO DO: refactor windows binaries usage
    useWindowsBinaryYoutubeDl()
    useWindowsBinaryFfmpeg()

    const { customFileName, openAtFinish, toMp3, overwriteDownload } = options

    const title = await getVideoTitle(youtubeUrl)
    const downloadFileName = slugify(title)
    const cutFileName = slugify(customFileName || `${downloadFileName}-${startTime}-${endTime}`)

    const videoPath = path.join(outputPath, downloadFileName)
    const downloadFilePath = path.join(videoPath, `${downloadFileName}.mp4`)
    const cutFilePath = path.join(videoPath, `${cutFileName}.mp4`)
    const audioFilePath = path.join(videoPath, `${cutFileName}.mp3`)

    await downloadFromYoutube(youtubeUrl, downloadFilePath, overwriteDownload)

    const duration = getDuration(startTime, endTime)
    await cutVideo(downloadFilePath, cutFilePath, startTime, duration)

    if (toMp3) {
      await convertToMp3(cutFilePath, audioFilePath)
    }

    // TO DO: test this on windows
    if (openAtFinish) {
      const path = toMp3 ? audioFilePath : cutFilePath
      openItem(path)
    }

    updateStatus('Finished! Check your files in your home folder.')
  } catch (error) {
    // TO DO: better error handling on all files
    console.error(error)
  }
}
