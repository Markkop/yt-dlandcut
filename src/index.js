import path from 'path'
import { getDuration, openItem, slugify, updateStatus } from './helpers'
import { downloadFromYoutube, getVideoTitle, useWindowsBinaryYoutubeDl } from './download'
import { cutVideo, convertToMp3, useWindowsBinaryFfmpeg } from './convert'
import { basePath } from './settings'

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

    const outputPath = path.join(basePath, downloadFileName)
    const downlodedFile = await downloadFromYoutube(
      youtubeUrl,
      outputPath,
      downloadFileName,
      overwriteDownload
    )

    const duration = getDuration(startTime, endTime)
    let convertedFile = await cutVideo(downlodedFile, outputPath, cutFileName, startTime, duration)

    if (toMp3) {
      convertedFile = await convertToMp3(convertedFile, outputPath, cutFileName)
    }

    if (openAtFinish) {
      openItem(convertedFile)
    }

    updateStatus('Finished! Check your files in your home folder.')
  } catch (error) {
    // TO DO: better error handling on all files
    console.error(error)
  }
}
