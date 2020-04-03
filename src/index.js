import { getDuration, askOptions, formatFileName, openFile } from './helpers'
import { downloadFromYoutube, getVideoTitle } from './download'
import { cutVideo } from './cut'

/**
 * Runs this package
 */
;(async function main() {
  try {
    const answers = await askOptions()
    const { openAtFinish, youtubeUrl, startTime, endTime } = answers

    const videoTitle = await getVideoTitle(youtubeUrl)
    const fileName = formatFileName(videoTitle)
    const downloadPath = `videos/full_${fileName}`
    const convertPath = `videos/${fileName}`

    const hasDownloaded = await downloadFromYoutube(youtubeUrl, downloadPath)
    if (!hasDownloaded) {
      throw new Error('>> Video was not downloaded')
    }
    const duration = getDuration(startTime, endTime)
    const hasCut = await cutVideo(downloadPath, convertPath, startTime, duration)
    if (!hasCut) {
      throw new Error('>> Video was not cut')
    }

    if (openAtFinish) {
      openFile(convertPath)
    }
  } catch (error) {
    console.error(error)
  }
})()
