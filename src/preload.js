const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vibeshot', {
  capture: (mode) => ipcRenderer.invoke('capture', mode),
  copy: (id) => ipcRenderer.invoke('copy', id),
  reveal: (id) => ipcRenderer.invoke('reveal', id),
  remove: (id) => ipcRenderer.invoke('remove', id),
  clear: () => ipcRenderer.invoke('clear'),
  hide: () => ipcRenderer.invoke('hide'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  startDrag: (id) => ipcRenderer.send('start-drag', id),
  onState: (callback) => ipcRenderer.on('state', (_event, state) => callback(state))
});

