interface ElectronAPI {
  download: (url: string, filename: string) => void;
  downloadBase64: (url: string, filename: string) => Promise<{ success: boolean; error?: string }>;
  openFolderDialog: () => Promise<string | undefined>;
  onDownloadPathChanged: (callback: (path: string) => void) => void;
  setDownloadPath?: (path: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
