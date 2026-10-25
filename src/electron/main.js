const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { mkdir } = require('node:fs/promises')
const { downloadAndCut } = require('../index')
const { getSettings } = require('../settings')
const { checkUpdates } = require('../helpers')
const { stopChildren } = require('../process')
const { assertTrustedSender, externalLink } = require('./security')

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  startApplication()
}

function startApplication() {
  const pagePath = path.join(__dirname, '../../public/index.html')
  const pageUrl = pathToFileURL(pagePath).href
  let mainWindow
  let activeJob

  function status(message) {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed())
      mainWindow.webContents.send('app:status', String(message).slice(0, 4000))
  }

  function handle(channel, handler) {
    ipcMain.handle(channel, async (event, ...args) => {
      assertTrustedSender(event, mainWindow, pageUrl)
      try {
        return { ok: true, value: await handler(...args) }
      } catch (error) {
        return {
          ok: false,
          error: activeJob?.signal.aborted
            ? 'Operation cancelled.'
            : error.message || 'Operation failed.',
        }
      }
    })
  }

  function registerHandlers() {
    handle('app:download', async (request) => {
      if (activeJob) throw new Error('A download is already running.')
      const controller = new AbortController()
      activeJob = controller
      try {
        return await downloadAndCut(request, {
          ...getSettings(app),
          status,
          signal: controller.signal,
          openPath: (file) => shell.openPath(file),
        })
      } catch (error) {
        if (controller.signal.aborted) throw new Error('Operation cancelled.', { cause: error })
        throw error
      } finally {
        activeJob = undefined
      }
    })
    handle('app:cancel', () => {
      activeJob?.abort()
    })
    handle('app:open-output', async () => {
      const { basePath } = getSettings(app)
      await mkdir(basePath, { recursive: true })
      const error = await shell.openPath(basePath)
      if (error) throw new Error(error)
    })
    handle('app:open-link', (key) => shell.openExternal(externalLink(key)))
    handle('app:check-updates', async () => {
      try {
        return await checkUpdates(app.getVersion())
      } catch {
        status('⚠️ Could not check for updates. You can check Releases from the Source Code link.')
        return null
      }
    })
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 600,
      height: 600,
      minWidth: 480,
      minHeight: 500,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        webviewTag: false,
      },
    })
    const contents = mainWindow.webContents
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (event) => event.preventDefault())
    contents.on('will-attach-webview', (event) => event.preventDefault())
    contents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    )
    contents.session.setPermissionCheckHandler(() => false)
    mainWindow.on('closed', () => {
      activeJob?.abort()
      mainWindow = undefined
    })
    mainWindow.loadFile(pagePath).catch((error) => {
      dialog.showErrorBox('Unable to open application', error.message)
      app.quit()
    })
  }

  app
    .whenReady()
    .then(() => {
      registerHandlers()
      createWindow()
    })
    .catch((error) => {
      dialog.showErrorBox('Unable to start application', error.message)
      app.quit()
    })
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.on('before-quit', () => {
    activeJob?.abort()
    stopChildren()
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}
