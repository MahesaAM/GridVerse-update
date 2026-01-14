console.log('[Preload] Init...');
let contextBridge, ipcRenderer, webUtils;
try {
    const electron = require('electron');
    contextBridge = electron.contextBridge;
    ipcRenderer = electron.ipcRenderer;
    webUtils = electron.webUtils;
} catch (e) { console.error('[Preload] Require failed:', e); }

const path = require('path');

contextBridge.exposeInMainWorld('api', {
    send: (channel, data) => {
        // whitelist channels
        let validChannels = ['start-automation', 'stop-automation', 'minimize', 'maximize', 'close', 'save-accounts', 'get-accounts', 'login-accounts', 'install-update', 'set-next-download-name'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ['log-update', 'automation-status', 'accounts-data', 'item-status', 'account-update', 'update-available', 'update-downloaded', 'update-error', 'download-progress'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    removeListener: (channel, func) => {
        ipcRenderer.removeListener(channel, func);
    },
    invoke: (channel, data) => {
        let validChannels = [
            'open-directory-dialog', 'get-bios-serial', 'get-profiles-size', 'delete-all-profiles', 'clear-accounts', 'get-app-version',
            // New APIs
            'fetch-image-base64', 'generate-gemini-prompt', 'check-config', 'open-vectorizer-login', 'process-image', 'download-vector',
            'get-user-quota', 'update-user-generated-count', 'select-folder', 'rename-file', 'delete-file', 'read-file', 'write-file',
            'login-user', 'get-mac-address', 'write-metadata', 'open-detached-window'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    },
    getBiosSerial: () => ipcRenderer.invoke('get-bios-serial'),
    getFilePath: (file) => {
        try {
            return webUtils.getPathForFile(file);
        } catch (e) {
            return null;
        }
    },

    // New Methods Merged from electronAPI
    download: (url, filename) => ipcRenderer.send('download-file', { url, filename }),
    setDownloadPath: (path) => ipcRenderer.send('set-download-path', path),
    openFolderDialog: () => ipcRenderer.invoke('open-directory-dialog'),
    onDownloadPathChanged: (callback) => ipcRenderer.on('download-path-changed', (_event, value) => callback(value)),

    getWebviewPreloadPath: () => {
        return `file:///${path.resolve(__dirname, '../renderer/gridprompt/webview-preload.js').replace(/\\/g, '/')}`;
    },
    fetchImageBase64: (url) => ipcRenderer.invoke('fetch-image-base64', url),
    generateGeminiPrompt: (data) => ipcRenderer.invoke('generate-gemini-prompt', data),
    checkConfig: () => ipcRenderer.invoke('check-config'),
    getUserQuota: (data) => ipcRenderer.invoke('get-user-quota', data),
    updateUserGeneratedCount: (data) => ipcRenderer.invoke('update-user-generated-count', data),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    downloadVector: (data) => ipcRenderer.invoke('download-vector', data),
    renameFile: (data) => ipcRenderer.invoke('rename-file', data),
    deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    writeFile: (data) => ipcRenderer.invoke('write-file', data),
    openDetachedWindow: (appId) => ipcRenderer.invoke('open-detached-window', appId)
});

console.log('[Preload] API exposed successfully');

console.log('[Preload] API exposed successfully');

