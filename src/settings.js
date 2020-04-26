import { remote } from 'electron'
import path from 'path'

const isWin = process.platform === 'win32'

const homePath = remote.app.getPath('home')
const basePath = path.resolve(homePath, 'yt-dlandcut')
const binariesPath = path.resolve(basePath, 'binaries')
const youtubeDlFilePath = path.resolve(binariesPath, isWin ? 'youtube-dl.exe' : 'youtube-dl')
const ffmpegFilePath = path.resolve(binariesPath, isWin ? 'ffmpeg.exe' : 'ffmpeg')

export { homePath, basePath, binariesPath, youtubeDlFilePath, ffmpegFilePath }
