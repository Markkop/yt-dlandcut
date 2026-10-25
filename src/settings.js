const path = require('node:path')

function getSettings(app) {
  return {
    basePath: path.join(app.getPath('home'), 'yt-dlandcut'),
    binariesPath: path.join(app.getPath('userData'), 'tools'),
  }
}

module.exports = { getSettings }
