import { remote } from 'electron'
import path from 'path'

const homePath = remote.app.getPath('home')
const outputPath = path.resolve(`${homePath}/yt-dlandcut`)

export { homePath, outputPath }
