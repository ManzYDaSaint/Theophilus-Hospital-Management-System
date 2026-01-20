const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getApiPort: () => ipcRenderer.invoke('get-api-port')
});
