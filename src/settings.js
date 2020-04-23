import { remote } from 'electron'
import path from 'path'

const homePath = remote.app.getPath('home')
const basePath = path.resolve(`${homePath}/yt-dlandcut`)

export { homePath, basePath }
