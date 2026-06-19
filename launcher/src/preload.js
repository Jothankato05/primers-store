const { contextBridge, ipcRenderer } = require('electron');

// Tell React it's running inside Primers Store desktop app
// and where to find the API
contextBridge.exposeInMainWorld('__PRIMERS__', {
  isElectron: true,
  apiUrl: 'https://primers-store.onrender.com/api',

  // Native install — real download + silent installer run
  install: (payload) => ipcRenderer.invoke('native:install', payload),
  uninstall: (payload) => ipcRenderer.invoke('native:uninstall', payload),

  // Progress/status events from main process
  onProgress: (cb) => {
    ipcRenderer.on('native:progress', (_, d) => cb(d));
    return () => ipcRenderer.removeAllListeners('native:progress');
  },
  onInstalled: (cb) => {
    ipcRenderer.on('native:installed', (_, d) => cb(d));
    return () => ipcRenderer.removeAllListeners('native:installed');
  },
  onUninstalled: (cb) => {
    ipcRenderer.on('native:uninstalled', (_, d) => cb(d));
    return () => ipcRenderer.removeAllListeners('native:uninstalled');
  },
  onError: (cb) => {
    ipcRenderer.on('native:error', (_, d) => cb(d));
    return () => ipcRenderer.removeAllListeners('native:error');
  },

  // Window controls (frameless window)
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
});
