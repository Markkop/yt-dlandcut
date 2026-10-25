const { contextBridge, ipcRenderer } = require('electron')

// Only specific capabilities cross the isolation boundary; IPC events and file paths do not.
contextBridge.exposeInMainWorld('downloadApp', {
  download: (request) => ipcRenderer.invoke('app:download', request),
  cancel: () => ipcRenderer.invoke('app:cancel'),
  openOutputFolder: () => ipcRenderer.invoke('app:open-output'),
  openLink: (key) => ipcRenderer.invoke('app:open-link', key),
  checkUpdates: () => ipcRenderer.invoke('app:check-updates'),
  onStatus: (callback) => {
    if (typeof callback !== 'function') throw new TypeError('Expected a status callback.')
    const listener = (_event, message) => callback(message)
    ipcRenderer.on('app:status', listener)
    return () => ipcRenderer.removeListener('app:status', listener)
  },
})
