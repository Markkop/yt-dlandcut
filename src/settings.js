import { remote } from 'electron'
import os from 'os';
import path from 'path'

const isWin = process.platform === 'win32'
const isDev = process.env.DEV === 'true'
const homePath = isDev ? '' : (remote?.app.getPath('home') || os.homedir())
const basePath = path.resolve(homePath, 'yt-dlandcut')
const binariesPath = path.resolve(basePath, 'binaries')
const ffmpegFilePath = path.resolve(binariesPath, isWin ? 'ffmpeg.exe' : 'ffmpeg')

export { homePath, basePath, binariesPath, ffmpegFilePath }
