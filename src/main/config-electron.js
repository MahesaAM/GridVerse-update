
const CONFIG = {
    // API Configuration
    API_BASE_URL: "http://localhost:3000",
    VECTORIZER_ENDPOINT: "/proxy/vectorizer",
    WEBSOCKET_URL: "wss://id.vectorizer.ai/internal/websocket",

    // Default Settings
    DEFAULT_LOCALE: "id-ID",
    DEFAULT_CHUNK_SIZE: 15536,
    DEFAULT_FORMAT: "svg",

    // File Constraints
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_IMAGE_PIXELS: 3145728, // Approximately 3.145 million pixels

    // Connection Settings
    WEBSOCKET_TIMEOUT: 10000, // 10 seconds

    // UI Settings
    TOAST_DURATION: 4000, // 4 seconds

    // Fallback Values
    FALLBACK_CSRF_TOKEN: "",

    // Image Processing
    IMAGE_RESIZE_QUALITY: 0.9,
    DPI: 72,
    IS_CMYK: false,

    // Chunk Size Limits
    MIN_CHUNK_SIZE: 1024,
    MAX_CHUNK_SIZE: 131072,

    // Cookie Configuration for Electron
    COOKIE_CONFIG: [
        {
            domain: ".vectorizer.ai",
            expirationDate: 1792037472.076305,
            hostOnly: false,
            httpOnly: true,
            name: "VK",
            path: "/",
            sameSite: "lax",
            secure: true,
            session: false,
            storeId: null,
            value:
                "eyJhbGciOiJIUzI1NiJ9.eyJkYXRhIjp7ImlkIjoidWRjZTNhMTJhN2FlMmQ4MTQ3ZjFiNTNmMzY0N2Q5NjdmIiwicHIiOiI1IiwiYWwiOiIxNzYwNTAxNDcyMDQ0IiwibHIiOiIxMzYifSwiZXhwIjoxNzkyMDM3NDcyLCJuYmYiOjE3NjA1MDE0NzIsImlhdCI6MTc2MDUwMTQ3Mn0.6_l06eiLQ1SCdGrrQpDZsz8VT-fXykAsEsDOkbZ1szQ",
        },
        {
            domain: "vectorizer.ai",
            expirationDate: 1760588106.484499,
            hostOnly: true,
            httpOnly: true,
            name: "MruImg",
            path: "/",
            sameSite: null,
            secure: true,
            session: false,
            storeId: null,
            value:
                "%7B%22t%22%3A%221760501676248-ed0220958a734d77-2066bf83a0045f19806c628125a2ca451fd2efac33b16a383fa94922cc0437c5%22%7D",
        },
    ],

    // HTTP Headers for API requests
    HTTP_HEADERS: {
        accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        pragma: "no-cache",
        priority: "u=0, i",
        "sec-ch-ua":
            '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
    },
};

module.exports = { CONFIG };
