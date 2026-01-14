const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config-electron');
// Fix for image-size import acting differently in Electron/Node environments
const imageSizePkg = require('image-size');
const sizeOf = typeof imageSizePkg === 'function' ? imageSizePkg : (imageSizePkg.imageSize || imageSizePkg.default || imageSizePkg);

// Helper to delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processImage(data, cookies, progressCallback) {
    const { filePath, fileBuffer, fileName } = data;
    // console.log(`[VectorizerService] Processing: ${fileName}`);

    return new Promise(async (resolve, reject) => {
        let ws;

        // Clean up function
        const cleanup = () => {
            if (ws && ws.readyState === WebSocket.OPEN) ws.close();
        };

        try {
            let buffer;
            let len;
            let finalFileName = fileName || 'image.png';

            // 1. Prepare Data (Buffer vs File)
            if (fileBuffer) {
                buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
                len = buffer.length;
            } else if (filePath) {
                if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
                const stats = fs.statSync(filePath);
                len = stats.size;
                buffer = fs.readFileSync(filePath);
                if (!finalFileName) finalFileName = path.basename(filePath);
            } else {
                throw new Error("No file path or buffer provided for processing.");
            }

            // 2. Get Dimensions
            let dimensions;
            try {
                if (typeof sizeOf === 'function') {
                    dimensions = sizeOf(buffer);
                } else {
                    dimensions = { width: 1000, height: 1000 };
                }
            } catch (e) {
                // console.warn("Could not determine image dimensions:", e);
                dimensions = { width: 1000, height: 1000 };
            }
            const w = dimensions.width || 1000;
            const h = dimensions.height || 1000;

            // 3. Prepare Connection
            const lc = encodeURIComponent(CONFIG.DEFAULT_LOCALE || 'en-US');
            const encodedFilename = encodeURIComponent(finalFileName);
            // Use PUBLIC API URL for better compatibility
            const wsUrl = `wss://vectorizer.ai/api/v1/vectorize?lc=${lc}&len=${len}&w=${w}&h=${h}&filename=${encodedFilename}&v=0`;

            const cookieHeader = (cookies || []).map(c => `${c.name}=${c.value}`).join('; ');

            // console.log(`[Vectorizer] Connecting to ${wsUrl}`);

            ws = new WebSocket(wsUrl, {
                headers: {
                    'Cookie': cookieHeader,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://vectorizer.ai',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });

            // WebSocket Event Handlers
            ws.on('open', async () => {
                try {
                    // console.log('[Vectorizer] Connected');
                    progressCallback(10, 'Connected');

                    // Initial handshake
                    ws.send(JSON.stringify({ index: 0, command: 0 }));

                    // Metadata
                    const meta = {
                        index: 0,
                        command: 2,
                        body: {
                            jobId: 1,
                            h: "id.vectorizer.ai",
                            meta: {
                                width: w,
                                height: h,
                                dpi: CONFIG.DPI || 72,
                                isCmyk: CONFIG.IS_CMYK || false,
                            },
                        },
                    };
                    ws.send(JSON.stringify(meta));
                    progressCallback(20, 'Metadata sent');

                    // Upload Chunks
                    const chunkSize = CONFIG.MAX_CHUNK_SIZE || 65536;

                    let offset = 0;
                    let chunksSent = 0;
                    const totalChunks = Math.ceil(len / chunkSize);

                    progressCallback(30, 'Uploading...');

                    while (offset < len) {
                        if (ws.readyState !== WebSocket.OPEN) break;

                        const end = Math.min(offset + chunkSize, len);
                        const slice = buffer.subarray(offset, end);
                        ws.send(slice);

                        offset = end;
                        chunksSent++;

                        const uploadProgress = 30 + (chunksSent / totalChunks) * 40;
                        progressCallback(Math.round(uploadProgress), `Uploading ${Math.round((chunksSent / totalChunks) * 100)}%`);

                        await delay(5);
                    }

                    // Finish Upload
                    ws.send(JSON.stringify({ index: 0, command: 11, body: {} }));
                    progressCallback(70, 'Processing...');
                } catch (err) {
                    reject(err);
                    cleanup();
                }
            });

            ws.on('message', (data) => {
                try {
                    if (Buffer.isBuffer(data)) return;
                    const msg = JSON.parse(data.toString());

                    if (msg.command === 10 && msg.body?.unrecoverable) {
                        reject(new Error(msg.body.errorMessageTr || 'Unrecoverable error'));
                        cleanup();
                        return;
                    }

                    if (msg.command === 5 || msg.command === 6) {
                        progressCallback(80, 'Vectorizing...');
                    } else if (msg.command === 7) {
                        if (msg.body?.spec?.token) {
                            progressCallback(90, 'Finalizing...');
                            ws.token = msg.body.spec.token;
                        }
                    } else if (msg.command === 9) {
                        progressCallback(100, 'Complete');
                        resolve({ token: ws.token });
                        cleanup();
                    }
                } catch (e) {
                    // Ignore parse errors for binary
                }
            });

            ws.on('error', (err) => {
                console.error('[Vectorizer] WS Error:', err);
                reject(err);
            });

            ws.on('close', (code, reason) => {
                // If the promise isn't resolved yet, this is an error
                if (!ws.token && code !== 1000) {
                    // Code 1000 is normal closure, but if we have no token, it's still a failure for us.
                    reject(new Error(`Connection closed without result (Code: ${code})`));
                } else if (!ws.token) {
                    reject(new Error(`Connection closed prematurely (Code: ${code})`));
                }
            });

        } catch (err) {
            reject(err);
            cleanup();
        }
    });
}

module.exports = { processImage };
