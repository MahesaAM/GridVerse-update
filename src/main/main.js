const { app, BrowserWindow, ipcMain, net, session, dialog } = require('electron'); // Added session, dialog
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const https = require('https'); // Added
const express = require('express'); // Added
const cors = require('cors'); // Added
const { networkInterfaces } = require('os'); // Added

const { runGenerate, stopGenerate } = require('../automation/generator');
const { runLoginAll } = require('../automation/loginallaccount');
const fsPromises = fs.promises;

// GridVector Config
const { CONFIG } = require('./config-electron');
// Load persistent config
const VECTORIZER_CONFIG_PATH = path.join(app.getPath('userData'), 'vectorizer-config.json');
try {
    if (fs.existsSync(VECTORIZER_CONFIG_PATH)) {
        const savedConfig = JSON.parse(fs.readFileSync(VECTORIZER_CONFIG_PATH, 'utf8'));
        if (savedConfig.cookieConfig) {
            CONFIG.COOKIE_CONFIG = savedConfig.cookieConfig;
            console.log("Loaded GridVector cookie config from storage.");
        }
    }
} catch (e) {
    console.error("Error loading vectorizer config:", e);
}

let proxyServer; // Track proxy server

async function loadConfigFromSupabase() {
    try {
        const { createClient } = require("@supabase/supabase-js");
        // Use env vars or hardcoded keys if needed, for now assuming env or default
        // In GridVidReborn, env might be different. Let's try to load from process.env if available, 
        // or maybe we rely on the client side config loading?
        // The original main.js uses VITE_... but main process might not see them without dotenv
        // Let's rely on the hardcoded keys from GridVectorApp.jsx if env fails, or just skip if no env.
        // Actually, let's skip rigorous config loading for now and use default CONFIG to avoid breakage.
        console.log("Using default GridVector CONFIG.");
    } catch (err) {
        console.error("Failed to load config from Supabase:", err);
    }
}


function startProxyServer() {
    const proxyApp = express();
    proxyApp.use(cors());
    proxyApp.use(express.json());

    proxyApp.post("/proxy/vectorizer", async (req, res) => {
        const { imageId, format } = req.body;
        let csrfToken = req.body.csrfToken;

        // Construct cookies first
        const mruImgEncoded = encodeURIComponent(JSON.stringify({ t: imageId }));
        const cookieParts = (CONFIG.COOKIE_CONFIG || []).map(c => `${c.name}=${c.value}`);
        cookieParts.push(`MruImg=${mruImgEncoded}`);
        const cookie = cookieParts.join("; ");

        if (!csrfToken) {
            try {
                const tokenUrl = `https://vectorizer.ai/images/${imageId}`;
                const tokenHeaders = {
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "en-US,en;q=0.9,id;q=0.8",
                    "cache-control": "no-cache",
                    pragma: "no-cache",
                    priority: "u=0, i",
                    "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "document",
                    "sec-fetch-mode": "navigate",
                    "sec-fetch-site": "none",
                    "sec-fetch-user": "?1",
                    "upgrade-insecure-requests": "1",
                    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
                    cookie: cookie // Add cookies here
                };

                const fetch = (await import("node-fetch")).default;
                const tokenResponse = await fetch(tokenUrl, { headers: tokenHeaders });
                const tokenHtml = await tokenResponse.text();
                const tokenRegex = /var csrfToken = \{name:"csrfToken", value: "([^"]+)"\};/;
                const tokenMatch = tokenHtml.match(tokenRegex);

                if (tokenMatch && tokenMatch[1]) {
                    csrfToken = tokenMatch[1];
                } else {
                    console.error("Failed to find CSRF token in HTML. Response length:", tokenHtml.length);
                    // console.log("HTML:", tokenHtml); // Debug if needed
                    return res.status(500).json({ error: "Failed to fetch CSRF token: Token not found. Are you logged in?" });
                }
            } catch (e) {
                return res.status(500).json({ error: "Token fetch error: " + e.message });
            }
        }

        const url = `https://vectorizer.ai/images/${imageId}/download?csrfToken=${csrfToken}`;

        // Full options
        const formData = `file_format=${format}&svg.version=svg_1_1&dxf.compatibility_level=lines_and_arcs&draw_style=fill_shapes&shape_stacking=cutouts&group_by=none&curves.allowed.quadratic_bezier=true&curves.allowed.quadratic_bezier=false&curves.allowed.cubic_bezier=true&curves.allowed.cubic_bezier=false&curves.allowed.circular_arc=true&curves.allowed.circular_arc=false&curves.allowed.elliptical_arc=true&curves.allowed.elliptical_arc=false&curves.line_fit_tolerance=0.1&gap_filler.enabled=true&gap_filler.enabled=false&gap_filler.non_scaling_stroke=true&gap_filler.non_scaling_stroke=false&gap_filler.stroke_width=2&strokes.non_scaling_stroke=true&strokes.non_scaling_stroke=false&strokes.override_color=%23000000&strokes.stroke_width=1&pdf.version=PDF_1_4&eps.version=PS_3_0_EPSF_3_0`;

        try {
            const response = await new Promise((resolve, reject) => {
                const req = https.request(url, {
                    method: "POST",
                    headers: {
                        ...CONFIG.HTTP_HEADERS,
                        referer: `https://vectorizer.ai/images/${imageId}`,
                        cookie: CONFIG.COOKIE_CONFIG ? CONFIG.COOKIE_CONFIG.map(c => `${c.name}=${c.value}`).join('; ') : cookie,
                    },
                }, (response) => resolve(response));
                req.on("error", reject);
                req.write(formData);
                req.end();
            });

            if (response.statusCode === 303) {
                const location = response.headers.location;
                const redirectUrl = location.startsWith("http") ? location : `https://vectorizer.ai${location}`;
                const redirectResponse = await new Promise((resolve, reject) => {
                    const r = https.request(redirectUrl, {
                        method: "GET",
                        headers: {
                            ...CONFIG.HTTP_HEADERS,
                            referer: `https://vectorizer.ai/images/${imageId}`,
                            cookie: CONFIG.COOKIE_CONFIG ? CONFIG.COOKIE_CONFIG.map(c => `${c.name}=${c.value}`).join('; ') : cookie,
                        }
                    }, resolve);
                    r.on("error", reject);
                    r.end();
                });
                res.status(redirectResponse.statusCode);
                redirectResponse.pipe(res);
            } else {
                res.status(response.statusCode);
                response.pipe(res);
            }
        } catch (err) {
            console.error("Proxy error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    proxyServer = proxyApp.listen(3000, () => {
        console.log("Proxy server running on http://localhost:3000");
    });
}



async function getDirSize(dirPath) {


    let size = 0;
    try {
        const files = await fsPromises.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fsPromises.stat(filePath);
            if (stats.isDirectory()) {
                size += await getDirSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {
        // ignore missing dir or permissions for now
    }
    return size;
}

let mainWindow;

function createWindow() {
    const iconPath = process.platform === 'win32'
        ? path.join(__dirname, '../../assets/logo.ico')
        : path.join(__dirname, '../../assets/logo1.png');

    // ROBUST PRELOAD PATH RESOLUTION
    // 1. Try resolving relative to __dirname (Development/Default)
    let preloadPath = path.resolve(__dirname, '../preload/preload.js');

    // 2. Fallback: Resolve relative to app root if above fails or for packed app
    if (!require('fs').existsSync(preloadPath)) {
        console.log('[Main] Preload not found at relative path, trying app root...');
        preloadPath = path.resolve(app.getAppPath(), 'src/preload/preload.js');
    }

    console.log('[Main] Final Preload Path:', preloadPath);
    console.log('[Main] Preload Exists:', require('fs').existsSync(preloadPath));

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#0f172a',
        icon: iconPath,
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            sandbox: false, // Adding this to reduce strictness for debugging
            webSecurity: false // Temporary: Disable web security to rule out CORs blocking local files
        },
        frame: false, // Frameless window
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: -100, y: -100 }, // Hide default traffic light controls
    });

    // DEBUGGING: Monitor Renderer Process
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[Main] Window failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('crashed', (event) => {
        console.error('[Main] Renderer process CRASHED!');
    });

    mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
        console.error('[Main] Preload Error:', error);
    });

    // Check if we are in dev mode (env var or argv)
    // Simple check: if we can connect to localhost:5173
    // But for now, let's assume if 'npm start' is run while 'vite' is running, we load url
    // Or we can just try to load the file if url fails? 
    // Standard electron-vite usually uses an env var.

    // For this simple setup:
    // We can default to file, but if env.VITE_DEV_SERVER_URL is set (by some runner), use it.
    // Or just hardcode for this demo or check arg.

    // Check for explicit dev environment
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
}

app.whenReady().then(async () => {
    createWindow();

    // Restore cookies to session
    if (CONFIG.COOKIE_CONFIG && CONFIG.COOKIE_CONFIG.length > 0) {
        console.log("Restoring cookies to session...");
        for (const cookie of CONFIG.COOKIE_CONFIG) {
            try {
                // Electron cookie needs url, usually derived from domain
                const url = cookie.domain.startsWith('.')
                    ? `https://www${cookie.domain}`
                    : `https://${cookie.domain}`;

                await session.defaultSession.cookies.set({
                    url: url,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    expirationDate: cookie.expirationDate
                });
            } catch (e) {
                console.error(`Failed to restore cookie ${cookie.name}:`, e.message);
            }
        }
        console.log(`Restored ${CONFIG.COOKIE_CONFIG.length} cookies.`);
    }

    loadConfigFromSupabase(); // Load config
    startProxyServer(); // Start proxy

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ——— Auto-Updater Logic ———
function setupAutoUpdater() {
    autoUpdater.logger = require("electron-log");
    autoUpdater.logger.transports.file.level = "info";
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates and notify
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', (info) => {
        // Inject current version into info
        info.currentVersion = app.getVersion();
        if (mainWindow) mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        if (mainWindow) mainWindow.webContents.send('update-not-available', info);
    });

    autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow) mainWindow.webContents.send('download-progress', progressObj);
    });

    autoUpdater.on('error', (err) => {
        console.error('AutoUpdater Error:', err);
        if (mainWindow) mainWindow.webContents.send('update-error', err.toString());
    });
}

// Trigger check on startup
app.whenReady().then(() => {
    setupAutoUpdater();
});

ipcMain.on('install-update', () => {
    // Silent install (no wizard), force run after
    autoUpdater.quitAndInstall(true, true);
});

ipcMain.on('check-for-update', () => {
    console.log('[Main] Manual check for updates triggered...');
    autoUpdater.checkForUpdates().then((res) => {
        console.log('[Main] Check for updates promise resolved:', res);
        // If res is null/undefined in some cases, we might need to handle it, 
        // but usually events fire.
    }).catch(err => {
        console.error('[Main] Check for updates failed:', err);
        if (mainWindow) mainWindow.webContents.send('update-error', err.toString());
    });
});


// ——— IPC Handlers ———

ipcMain.on('minimize', () => mainWindow.minimize());
ipcMain.on('maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
});
ipcMain.on('close', () => mainWindow.close());

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Helper to get profiles path based on OS
// Helper to get profiles path based on OS
function getProfilesRoot() {
    return path.join(app.getPath('userData'), 'profiles');
}

let isAutomationRunning = false;

ipcMain.on('start-automation', async (event, config) => {
    if (isAutomationRunning) {
        event.sender.send('log-update', 'Automation is already running!');
        return;
    }

    isAutomationRunning = true;
    event.sender.send('automation-status', 'running');
    event.sender.send('log-update', 'Starting automation...');
    console.log('[Main] Received config:', JSON.stringify(config, null, 2)); // DEBUG
    console.log('[Main] Duration:', config.duration); // DEBUG

    try {
        // Read accounts from file
        let accounts = [];
        if (fs.existsSync(ACCOUNTS_FILE)) {
            try {
                accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
            } catch (e) {
                event.sender.send('log-update', 'Error reading accounts file.');
            }
        }

        if (accounts.length === 0) {
            event.sender.send('log-update', 'No accounts found. Please add accounts in the Accounts tab.');
            event.sender.send('automation-status', 'stopped');
            isAutomationRunning = false;
            return;
        }

        const params = {
            ...config,
            images: config.imagePaths, // Map config.imagePaths to params.images
            accounts: accounts,
            userDataPath: app.getPath('userData'),
            profilesRoot: getProfilesRoot()
        };

        event.sender.send('log-update', `Mode: ${config.mode.toUpperCase()}`);
        event.sender.send('log-update', `Prompts: ${config.prompts.length}`);
        if (config.mode === 'image') {
            event.sender.send('log-update', `Images: ${config.imagePaths.length}`);
        }

        // Run the generator
        // Run the generator
        // We pass a log callback that sends IPC messages back to renderer
        await runGenerate(
            params,
            (msg) => event.sender.send('log-update', msg),
            (idx, status) => event.sender.send('item-status', { index: idx, status: status }),
            (data) => event.sender.send('account-update', data)
        );

        event.sender.send('log-update', 'Automation finished.');
        event.sender.send('automation-status', 'stopped');

    } catch (err) {
        event.sender.send('log-update', `Error: ${err.message}`);
        event.sender.send('automation-status', 'stopped');
    } finally {
        isAutomationRunning = false;
        event.sender.send('automation-status', 'stopped');
    }
});

ipcMain.on('stop-automation', () => {
    stopGenerate();
    isAutomationRunning = false;
    if (mainWindow) {
        mainWindow.webContents.send('log-update', 'Stopping automation...');
        mainWindow.webContents.send('automation-status', 'stopped');
    }
});

// --- GridVector IPC ---
ipcMain.handle("check-config", async () => {
    return { success: true, cookieConfig: CONFIG.COOKIE_CONFIG, httpHeaders: CONFIG.HTTP_HEADERS };
});

ipcMain.handle("open-vectorizer-login", async (event) => {
    const loginWindow = new BrowserWindow({
        width: 800,
        height: 700,
        parent: mainWindow,
        modal: true,
        title: "Login to Vectorizer.ai",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    loginWindow.loadURL("https://vectorizer.ai/login");

    // Monitor cookies
    const checkCookies = async () => {
        try {
            const cookies = await session.defaultSession.cookies.get({ domain: "vectorizer.ai" });
            const vkCookie = cookies.find(c => c.name === "VK");

            if (vkCookie) {
                console.log("Vectorizer VK cookie found!", vkCookie);
                CONFIG.COOKIE_CONFIG = cookies;

                // Save to file
                fs.writeFileSync(VECTORIZER_CONFIG_PATH, JSON.stringify({ cookieConfig: cookies }, null, 2));

                // Notify renderer
                if (mainWindow) {
                    mainWindow.webContents.send('login-success', { cookieCount: cookies.length });
                }

                // Close login window
                loginWindow.close();
            }
        } catch (e) {
            console.error("Error checking cookies:", e);
        }
    };

    const interval = setInterval(checkCookies, 2000);

    loginWindow.on('closed', () => {
        clearInterval(interval);
    });

    return { success: true };
});

const { processImage } = require('./vectorizer-service');

ipcMain.handle("process-image", async (event, { filePath, fileBuffer, fileName }) => {
    try {
        console.log(`[Main] Processing image: ${fileName || filePath}`);

        // Pass a callback to send progress to renderer
        const progressCallback = (percent, status) => {
            event.sender.send('processing-progress', { filePath: filePath || fileName, percent, status });
        };

        const result = await processImage({ filePath, fileBuffer, fileName }, CONFIG.COOKIE_CONFIG, progressCallback);
        return { success: true, token: result.token };
    } catch (e) {
        console.error(`[Main] Process image error:`, e);
        return { success: false, error: e.message };
    }
});


// Cache node-fetch import
let fetch;
(async () => {
    fetch = (await import("node-fetch")).default;
})();

ipcMain.handle("download-vector", async (event, { imageId, format, csrfToken, savePath }) => {
    const https = require('https');
    const fs = require('fs');
    const { URL } = require('url');

    // Helper to handle redirects recursively
    const downloadWithRedirects = (requestUrl, method, postData, headers, attempt = 0) => {
        return new Promise((resolve, reject) => {
            if (attempt > 5) {
                return reject(new Error("Too many redirects"));
            }

            const parsedUrl = new URL(requestUrl);
            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: method,
                headers: headers
            };

            // Adjust Content-Length for POST
            if (postData && method === 'POST') {
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            } else {
                delete options.headers['Content-Length'];
            }

            const req = https.request(options, (res) => {
                // Handle Redirects (3xx)
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const newLocation = new URL(res.headers.location, requestUrl).href;
                    // 303 "See Other" always switches to GET and drops body
                    const newMethod = res.statusCode === 303 ? 'GET' : method;
                    const newPostData = res.statusCode === 303 ? null : postData;

                    console.log(`[Main] Following redirect ${res.statusCode} to: ${newLocation}`);

                    downloadWithRedirects(newLocation, newMethod, newPostData, headers, attempt + 1)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (res.statusCode !== 200) {
                    let errData = '';
                    res.on('data', c => errData += c);
                    res.on('end', () => {
                        console.error(`Download failed: ${res.statusCode} ${errData.substring(0, 200)}`);
                        reject(new Error(`Status ${res.statusCode}`));
                    });
                    return;
                }

                // Success - Pipe to file
                const fileStream = fs.createWriteStream(savePath);
                res.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    console.log(`[Main] Download complete: ${savePath}`);
                    resolve({ success: true, path: savePath });
                });

                fileStream.on('error', (err) => {
                    console.error("File write error:", err);
                    reject(err);
                });
            });

            req.on('error', (e) => reject(e));

            if (postData && method === 'POST') {
                req.write(postData);
            }
            req.end();
        });
    };

    try {
        let finalCsrfToken = csrfToken;
        const cookieString = CONFIG.COOKIE_CONFIG ? CONFIG.COOKIE_CONFIG.map(c => `${c.name}=${c.value}`).join('; ') : "";

        // Fallback Scraper Logic
        if (!finalCsrfToken) {
            console.log(`[Main] No CSRF token provided for ${imageId}, attempting to scrape...`);
            await new Promise((resolve) => {
                const tokenHeaders = {
                    'accept': 'text/html,application/xhtml+xml',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'cookie': cookieString
                };
                https.get(`https://vectorizer.ai/images/${imageId}`, { headers: tokenHeaders }, (res) => {
                    let data = '';
                    res.on('data', c => data += c);
                    res.on('end', () => {
                        const match = data.match(/var csrfToken = \{name:"csrfToken", value: "([^"]+)"\};/);
                        if (match && match[1]) {
                            finalCsrfToken = match[1];
                            console.log(`[Main] Scraped CSRF: ${finalCsrfToken.substring(0, 10)}...`);
                        }
                        resolve();
                    });
                }).on('error', () => resolve()); // Ignore error and try anyway
            });
        }

        const initialUrl = `https://vectorizer.ai/images/${imageId}/download?csrfToken=${finalCsrfToken}`;
        const formData = `file_format=${format}&svg.version=svg_1_1&dxf.compatibility_level=lines_and_arcs&draw_style=fill_shapes&shape_stacking=cutouts&group_by=none&curves.allowed.quadratic_bezier=true&curves.allowed.quadratic_bezier=false&curves.allowed.cubic_bezier=true&curves.allowed.cubic_bezier=false&curves.allowed.circular_arc=true&curves.allowed.circular_arc=false&curves.allowed.elliptical_arc=true&curves.allowed.elliptical_arc=false&curves.line_fit_tolerance=0.1&gap_filler.enabled=true&gap_filler.enabled=false&gap_filler.non_scaling_stroke=true&gap_filler.non_scaling_stroke=false&gap_filler.stroke_width=2&strokes.non_scaling_stroke=true&strokes.non_scaling_stroke=false&strokes.override_color=%23000000&strokes.stroke_width=1&pdf.version=PDF_1_4&eps.version=PS_3_0_EPSF_3_0`;

        console.log(`[Main] Starting download (POST): ${initialUrl}`);

        const result = await downloadWithRedirects(initialUrl, 'POST', formData, {
            'Cookie': cookieString,
            'Content-Type': 'application/x-www-form-urlencoded',
            ...CONFIG.HTTP_HEADERS
        });

        return result;

    } catch (e) {
        console.error("Download execution error:", e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle("get-user-quota", async (event, userData) => {
    // Stub for now or impl if Supabase key avail
    return { success: true, quota: 9999, generated_count: 0, type: 'pro' };
});

ipcMain.handle("update-user-generated-count", async (event, userData) => {
    return { success: true };
});

ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle("rename-file", async (event, { oldPath, newPath }) => {
    try {
        await fsPromises.rename(oldPath, newPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("delete-file", async (event, path) => {
    try {
        await fsPromises.unlink(path);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// For reading/writing binary files (e.g. images for conversion)
ipcMain.handle("read-file", async (event, path) => {
    try {
        const buffer = await fsPromises.readFile(path);
        return buffer; // Returns buffer (Uint8Array)
    } catch (error) {
        throw error;
    }
});

ipcMain.handle("write-file", async (event, { path, data }) => {
    try {
        // data comes as ArrayBuffer or Buffer
        await fsPromises.writeFile(path, Buffer.from(data));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("get-mac-address", () => {
    const interfaces = networkInterfaces();
    let macAddress = "00:00:00:00:00:00";

    // Find the first non-internal interface with a MAC address
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
                return iface.mac; // Return the first valid one
            }
        }
    }
    return macAddress;
});

ipcMain.handle("login-user", async (event, { username, password }) => {
    // Mock login or use Supabase if configured
    if (username === "admin" && password === "admin") {
        return { success: true, token: "admin-token", user: { id: "admin", username: "admin", isAdmin: true } };
    }
    return { success: true, token: "user-token", user: { id: "user", username: username, isAdmin: false, qouta: 5, type: 'trial' }, expiresAt: new Date(Date.now() + 86400000).toISOString() };
});
// ----------------------


// Accounts Management
const ACCOUNTS_FILE = path.join(app.getPath('userData'), 'accounts.json');

ipcMain.on('get-accounts', (event) => {
    try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
            const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
            event.sender.send('accounts-data', JSON.parse(data));
        } else {
            event.sender.send('accounts-data', []);
        }
    } catch (err) {
        event.sender.send('accounts-data', []);
    }
});

ipcMain.on('save-accounts', (event, accounts) => {
    try {
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
        event.sender.send('log-update', 'Accounts saved successfully.');
    } catch (err) {
        event.sender.send('log-update', `Error saving accounts: ${err.message}`);
    }
});

ipcMain.on('login-accounts', async (event) => {
    event.sender.send('log-update', 'Starting login process for all accounts...');

    try {
        let accounts = [];
        if (fs.existsSync(ACCOUNTS_FILE)) {
            accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
        }

        if (accounts.length === 0) {
            event.sender.send('log-update', 'No accounts to login.');
            event.sender.send('log-update', 'Please add accounts first.');
            return;
        }

        const profilesRoot = getProfilesRoot();

        // Ensure directory exists
        if (!fs.existsSync(profilesRoot)) {
            fs.mkdirSync(profilesRoot, { recursive: true });
        }

        event.sender.send('log-update', `Profiles location: ${profilesRoot}`);

        const results = await runLoginAll(
            accounts,
            (msg) => event.sender.send('log-update', msg),
            {
                profilesRoot,
                keepBrowserOpen: false,
                accountCallback: (data) => event.sender.send('account-update', data)
            }
        );

        // Update accounts status based on results
        const updatedAccounts = accounts.map(acc => {
            const res = results.find(r => r.email === acc.email);
            if (res) {
                return { ...acc, status: res.success ? 'Active' : 'Error' };
            }
            return acc;
        });

        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(updatedAccounts, null, 2));
        event.sender.send('accounts-data', updatedAccounts);
        event.sender.send('log-update', 'Login process completed.');

    } catch (err) {
        event.sender.send('log-update', `Login Error: ${err.message}`);
    }
});


ipcMain.handle('open-directory-dialog', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

ipcMain.handle('get-bios-serial', async () => {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32'
            ? 'wmic bios get serialnumber'
            : 'system_profiler SPHardwareDataType | grep "Serial Number (system)"';

        // Set a hard timeout of 3 seconds to prevent Infinite Loading
        const timeout = setTimeout(() => {
            console.log("BIOS Serial fetch timed out, using fallback.");
            resolve('UNKNOWN_DEVICE_ID_' + require('os').hostname());
        }, 3000);

        exec(cmd, (error, stdout) => {
            clearTimeout(timeout);
            if (error) {
                console.error("Failed to get BIOS serial:", error);
                resolve('UNKNOWN_DEVICE_ID_' + require('os').hostname());
                return;
            }

            let serial = '';
            if (process.platform === 'darwin') {
                // Output format: "Serial Number (system): C02..."
                const parts = stdout.trim().split(':');
                serial = parts.length > 1 ? parts[parts.length - 1].trim() : stdout.trim();
            } else {
                // Windows WMIC output: Header \n Value
                const lines = stdout.trim().split('\n');
                serial = lines.length > 1 ? lines[1].trim() : lines[0].trim();
            }

            resolve(serial || 'UNKNOWN_DEVICE_ID_' + require('os').hostname());
        });
    });
});

// Helper function to get directory size recursively
async function getDirSize(dirPath) {
    let totalSize = 0;
    try {
        const files = await fsPromises.readdir(dirPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                totalSize += await getDirSize(fullPath);
            } else {
                const stats = await fsPromises.stat(fullPath);
                totalSize += stats.size;
            }
        }
    } catch (error) {
        // Ignore errors for inaccessible files/directories, treat as 0 size
        if (error.code === 'ENOENT') {
            return 0; // Directory does not exist
        }
        console.warn(`Error getting size for ${dirPath}: ${error.message}`);
    }
    return totalSize;
}

// Profile & Account Management Handlers
ipcMain.handle('get-profiles-size', async () => {
    const root = getProfilesRoot();
    const sizeBytes = await getDirSize(root);
    // Convert to readable format
    if (sizeBytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(sizeBytes) / Math.log(k));
    return parseFloat((sizeBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

ipcMain.handle('delete-all-profiles', async (event) => {
    // 1. Force stop automation if running
    if (isAutomationRunning) {
        console.log('[DeleteProfiles] Automation is running, stopping it first...');
        stopGenerate();
        isAutomationRunning = false;
        if (mainWindow) {
            mainWindow.webContents.send('automation-status', 'stopped');
            mainWindow.webContents.send('log-update', 'Automation stopped for profile cleanup.');
        }
        // Give it a moment to cleanup
        await new Promise(r => setTimeout(r, 1000));
    }

    const root = getProfilesRoot();
    console.log(`[DeleteProfiles] Starting deletion of: ${root}`);

    // Helper to kill chrome/chromedriver processes that might lock files
    const killBrowsers = async () => {
        return new Promise((resolve) => {
            // Only kill chromedriver first, killing chrome.exe globally is risky for user's browser
            // But we need to kill the instances spawned by puppeteer.
            // We'll try to kill chromedriver which should close its children.
            const cmd = process.platform === 'win32'
                ? 'taskkill /F /IM chromedriver.exe /T'
                : 'pkill -f "chromedriver"; pkill -f "Google Chrome for Testing"';

            exec(cmd, (err) => {
                // If that's done, maybe try to kill chrome processes strictly associated with our app data?
                // Too complex for now. If locks persist, we might need the nuclear option.
                // Let's add the nuclear option back BUT only if deletion fails? 

                // For now, let's just stick to chromedriver to avoid killing the App or User Browser.
                // If the user complains about "files locked", we can advise manual close.
                resolve();
            });
        });
    };

    try {
        await killBrowsers();
        // Give a short grace period for OS to release locks
        await new Promise(r => setTimeout(r, 1000));

        // Retry logic for deletion
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                if (fs.existsSync(root)) {
                    // Use specific simplified recursive delete
                    await fsPromises.rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
                }
                console.log('[DeleteProfiles] Deletion successful.');
                return { success: true };
            } catch (err) {
                console.warn(`[DeleteProfiles] Attempt ${attempts + 1} failed: ${err.message}`);

                // If it's the last attempt, try a "best effort" cleanup
                if (attempts === maxAttempts - 1) {
                    console.log('[DeleteProfiles] Performing best-effort cleanup...');
                    try {
                        const items = await fsPromises.readdir(root);
                        for (const item of items) {
                            try {
                                await fsPromises.rm(path.join(root, item), { recursive: true, force: true });
                            } catch (e) {
                                console.warn(`Skipping locked item: ${item}`);
                            }
                        }
                        return { success: true, warning: "Some files were locked but most data was cleared." };
                    } catch (e) { }
                }

                attempts++;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        throw new Error("Timed out waiting for file locks to release.");

    } catch (error) {
        console.error('[DeleteProfiles] Fatal error:', error);
        return { success: false, error: `Could not delete profiles: ${error.message} (Try restarting the app)` };
    }
});

ipcMain.handle('clear-accounts', async () => {
    try {
        await fsPromises.writeFile(ACCOUNTS_FILE, JSON.stringify([], null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

let userDownloadPath = '';

ipcMain.on('set-download-path', (event, path) => {
    userDownloadPath = path;
    // Persist this choice if needed, but for now runtime is enough or client sends it
    console.log('[Main] Download path set to:', userDownloadPath);
});

ipcMain.on('download-file', async (event, { url, filename }) => {
    try {
        const targetFolder = userDownloadPath || app.getPath('downloads');
        // Ensure folder exists
        if (!fs.existsSync(targetFolder)) {
            await fsPromises.mkdir(targetFolder, { recursive: true });
        }

        const filePath = path.join(targetFolder, filename);

        if (url.startsWith('data:')) {
            const base64Data = url.split(';base64,').pop();
            await fsPromises.writeFile(filePath, base64Data, { encoding: 'base64' });
            // Notify success if needed, or just let it be silent
            // Maybe show a small notification or flash the taskbar?
            // event.sender.send('download-complete', filePath); 
        } else {
            // For http URLs, use downloadURL but handle save path
            const win = BrowserWindow.fromWebContents(event.sender);
            win.webContents.downloadURL(url);
            // We need to set the save path in 'will-download'
        }
    } catch (err) {
        console.error('[Main] Download error:', err);
    }
});

// Whisk Proxy
ipcMain.handle('fetch-with-cookie', async (event, config) => {
    return new Promise((resolve, reject) => {
        const request = net.request({
            method: config.method,
            url: config.url
        });

        if (config.headers) {
            for (const [key, value] of Object.entries(config.headers)) {
                request.setHeader(key, value);
            }
        }

        request.on('response', (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                const body = Buffer.concat(chunks).toString();
                resolve({
                    status: response.statusCode,
                    data: body ? JSON.parse(body) : {}
                });
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        if (config.body) {
            request.write(config.body);
        }
        request.end();
    });
});

// Handle standard downloads
let nextDownloadName = null;

ipcMain.on('set-next-download-name', (event, name) => {
    nextDownloadName = name;
});

app.on('session-created', (session) => {
    session.on('will-download', (event, item, webContents) => {
        if (userDownloadPath) {
            let filename = item.getFilename();
            // If we have a specific name override
            if (nextDownloadName) {
                const ext = path.extname(filename); // preserve extension if needed, or user provided it?
                // The extension logic: input basename + download extension
                // Logic: if nextDownloadName does not have ext, append item's ext
                if (path.extname(nextDownloadName) === '') {
                    filename = `${nextDownloadName}${ext}`;
                } else {
                    filename = nextDownloadName;
                }
                // Reset for next file (unless batch? but usually 1 by 1)
                // We reset it after use to avoid naming collisions if multiple downloads happen
                // But GridVector downloads sequentially.
                // However, wait... vectorizer might download 2 files (SVG + PNG).
                // We need to be careful. The extension sets `currentTargetBasename` global.
                // We should probably rely on `currentTargetBasename` valid for the "current processing item".
            }
            item.setSavePath(path.join(userDownloadPath, filename));
        } else if (nextDownloadName) {
            // Even if no userDownloadPath, we might want to rename in default Downloads
            let filename = item.getFilename();
            const ext = path.extname(filename);
            if (path.extname(nextDownloadName) === '') {
                filename = `${nextDownloadName}${ext}`;
            } else {
                filename = nextDownloadName;
            }
            item.setSavePath(path.join(app.getPath('downloads'), filename));
        }
        // IMPORTANT: Reset it? If we download SVG then PNG, we want both to have same basename?
        // The extension logic:
        // let ext = item.filename.split('.').pop();
        // const newFilename = `${currentTargetBasename}.${ext}`;
        // So yes, we maintain `nextDownloadName` as the BASENAME.
    });
});

ipcMain.handle('fetch-image-base64', async (event, url) => {
    console.log('[Main] fetching image:', url);
    try {
        // Native fetch
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const base64 = buffer.toString('base64');
        const mimeType = response.headers.get('content-type');
        console.log('[Main] Image fetched successfully. Mime:', mimeType, 'Length:', base64.length);
        return { success: true, base64, mimeType };
    } catch (error) {
        console.error('[Main] Error fetching image base64:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('generate-gemini-prompt', async (event, { apiKey, base64, mimeType, prompt }) => {
    try {
        // Native fetch fallback
        console.log('[Main] Generating Gemini Prompt...');
        // Match reference structure from GridPrompts extension
        const model = 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt || "Describe this image in detail for an AI art generator." },
                        {
                            inline_data: {
                                mime_type: mimeType || 'image/jpeg',
                                data: base64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 32,
                topP: 1,
                maxOutputTokens: 1024
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Gemini API Error Response:', err);
            return { success: false, error: `Gemini API Failed: ${err}` };
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return { success: false, error: 'Invalid response structure from Gemini API' };
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        console.log('[Main] Gemini Prompt Generated (len):', generatedText.length);
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return { success: false, error: error.message };
    }
});

// Metadata Writing
const { exiftool } = require('exiftool-vendored');

ipcMain.handle('write-metadata', async (event, { filePath, metadata }) => {
    try {
        console.log('[Main] Writing metadata to:', filePath);

        // Map simplified metadata to ExifTool tags
        const tags = {
            'Title': metadata.title,
            'XPTitle': metadata.title,
            'Description': metadata.description,
            'ImageDescription': metadata.description,
            'Caption-Abstract': metadata.description,
            'XPComment': metadata.description,
            'Keywords': Array.isArray(metadata.keywords) ? metadata.keywords : metadata.keywords.split(',').map(k => k.trim()),
            'Subject': Array.isArray(metadata.keywords) ? metadata.keywords : metadata.keywords.split(',').map(k => k.trim()),
            'XPKeywords': metadata.keywords
        };

        // Clean up empty values
        Object.keys(tags).forEach(key => (tags[key] === undefined || tags[key] === '') && delete tags[key]);

        await exiftool.write(filePath, tags, ['-overwrite_original']);
        console.log('[Main] Metadata written successfully.');
        return { success: true };

    } catch (error) {
        console.error('[Main] Error writing metadata:', error);
        return { success: false, error: error.message };
    }
});

// Ensure ExifTool is properly closed when app exits
app.on('before-quit', () => exiftool.end());
