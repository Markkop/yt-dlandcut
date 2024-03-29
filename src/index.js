import path from 'path'
import { getDuration, openItem, slugify, updateStatus } from './helpers'
import { downloadFromYoutube, getVideoTitle, checkAndDownloadBinaries } from './download'
import { cutVideo, convertToMp3 } from './convert'
import { basePath, binariesPath } from './settings'

/**
 * Runs this package
 */
export async function downloadAndCut(youtubeUrl, startTime, endTime, options) {
  try {
    if (!youtubeUrl || !startTime || !endTime) {
      throw new Error('Missing obrigatory argument')
    }
    updateStatus('✨ Starting...')

    await checkAndDownloadBinaries(binariesPath)

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

    updateStatus(`🎉 Finished! Check your files in your ${outputPath} folder.`)
  } catch (error) {
    updateStatus(`🤕 Something bad happened :c. Here's what you can try:
    - Clean your ${binariesPath} folder and try again
    - Delete video folder and/or check "Download again" option
    - Check youtube url and time interval provided
    - Lay down and cry :'(
    - Make sure you're using the latest version
    - Ask me for help on Twitter: @HeyMarkKop (send a print!)
    - Check the error informed, it might have something useful`)
    updateStatus(error)
  }
}
