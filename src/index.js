import { getDuration, askOptions, formatFileName, openFile } from './helpers'
import { downloadFromYoutube, getVideoTitle } from './download'
import { cutVideo, convertToMp3 } from './convert'

/**
 * Runs this package
 */
;(async function main() {
  try {
    const answers = await askOptions()
    const { youtubeUrl, startTime, endTime, openAtFinish, toMp3 } = answers

    const videoTitle = await getVideoTitle(youtubeUrl)
    const fileName = formatFileName(videoTitle)

    const downloadPath = `resources/downloads/${fileName}.mp4`
    const convertPath = `resources/cuts/${fileName}.mp4`
    const audioPath = `resources/audios/${fileName}.mp3`

    const hasDownloaded = await downloadFromYoutube(youtubeUrl, downloadPath)
    if (!hasDownloaded) {
      throw new Error('>> Video was not downloaded')
    }
    const duration = getDuration(startTime, endTime)
    const hasCut = await cutVideo(downloadPath, convertPath, startTime, duration)
    if (!hasCut) {
      throw new Error('>> Video was not cut')
    }

    let hasConvertedToMp3 = false
    if (toMp3) {
      hasConvertedToMp3 = await convertToMp3(convertPath, audioPath)
    }

    if (openAtFinish) {
      const path = hasConvertedToMp3 ? audioPath : convertPath
      openFile(path)
    }
  } catch (error) {
    console.error(error)
  }
})()
