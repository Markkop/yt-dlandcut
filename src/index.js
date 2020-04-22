import { remote } from 'electron'
import { getDuration, formatFileName, openFile } from './helpers'
import { downloadFromYoutube, getVideoTitle, useWindowsBinary } from './download'
import { cutVideo, convertToMp3, useWindowsBinaryFfmpeg } from './convert'

/**
 * Runs this package
 */
export async function main(youtubeUrl, startTime, endTime, options) {
  try {
    if (!youtubeUrl || !startTime || !endTime) {
      throw new Error('Missing obrigatory argument')
    }

    // TO DO: refactor windows binaries usage
    useWindowsBinary()
    useWindowsBinaryFfmpeg()

    const { customFileName, openAtFinish, toMp3 } = options

    const title = await getVideoTitle(youtubeUrl)
    const formattedTitle = formatFileName(title)
    const fileName = customFileName ? formatFileName(customFileName) : formattedTitle

    // TO DO: use path from 'path' instead of string literals
    const homePath = remote.app.getPath('home')
    const basePath = `${homePath}/output`
    const downloadPath = `${basePath}/downloads/${formattedTitle}.mp4`
    const convertPath = `${basePath}/cuts/${fileName}.mp4`
    const audioPath = `${basePath}/audios/${fileName}.mp3`

    // TO DO: skip if it has already been downloaded
    // and offers to force download
    await downloadFromYoutube(youtubeUrl, downloadPath)

    const duration = getDuration(startTime, endTime)
    await cutVideo(downloadPath, convertPath, startTime, duration)

    let hasConvertedToMp3 = false
    if (toMp3) {
      await convertToMp3(convertPath, audioPath)
    }

    // TO DO: test this on windows
    if (openAtFinish) {
      const path = hasConvertedToMp3 ? audioPath : convertPath
      openFile(path)
    }
  } catch (error) {
    // TO DO: better error handling on all files
    console.error(error)
  }
}
