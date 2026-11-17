const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.send('settings:set', patch),
  setCompact: (on) => ipcRenderer.send('win:compact', on),
  setFullscreen: (on) => ipcRenderer.send('win:fullscreen', on),
  hide: () => ipcRenderer.send('win:hide'),
  quit: () => ipcRenderer.send('win:quit'),
  onCompactChanged: (fn) => ipcRenderer.on('compact-changed', (_e, on) => fn(on)),
  onFullscreenChanged: (fn) => ipcRenderer.on('fullscreen-changed', (_e, on) => fn(on)),
  onCommand: (fn) => ipcRenderer.on('command', (_e, cmd) => fn(cmd)),
  // YouTube page player, for videos that can't be embedded (see main.js)
  ytPage: {
    open: (videoId, show) => ipcRenderer.send('ytpage:open', videoId, show),
    close: () => ipcRenderer.send('ytpage:close'),
    cmd: (cmd, arg) => ipcRenderer.send('ytpage:cmd', cmd, arg),
    onState: (fn) => {
      const h = (_e, st) => fn(st);
      ipcRenderer.on('ytpage:state', h);
      return () => ipcRenderer.removeListener('ytpage:state', h);
    },
  },
});
