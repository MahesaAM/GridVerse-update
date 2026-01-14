const { ipcRenderer } = require('electron');

console.log('GridPrompt Preload Script Loaded');

// --- Utilities ---

const getBestMediaSrc = (media) => {
    if (media.tagName === 'IMG') {
        // Try various sources
        return media.currentSrc || media.src || media.dataset.src || media.getAttribute('data-src') || media.getAttribute('data-original');
    }
    if (media.tagName === 'VIDEO') {
        const poster = media.poster;
        if (poster) return poster;
        return media.currentSrc || media.src;
    }
    return null;
};

// Compute absolute URL safely
const makeAbsoluteUrl = (url, base) => {
    try {
        return new URL(url, base).href;
    } catch (e) {
        return null;
    }
};

// Check if element is visible
const isVisible = (elem) => {
    if (!elem) return false;
    const style = window.getComputedStyle(elem);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    if (elem.offsetWidth === 0 && elem.offsetHeight === 0) return false;
    return true;
};

// --- Scraping Logic ---

const scanMedia = () => {
    const images = [];
    const seenUrls = new Set();
    const minSize = 50; // Minimum dimension to ignore icons

    // 1. Selector-based scraping
    // Expanded selectors based on common stock sites and extension logic
    const selectors = [
        'img',
        'video',
        '.js-video-thumbnail-placeholder',
        'img[class*="video-thumbnail-placeholder"]',
        'img[class*="video"][class*="thumbnail"]',
        '[style*="background-image"]', // Catch div backgrounds
        '.thumb', '.preview', '.media-item' // Generic classes often used
    ];

    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            if (!isVisible(el)) return;

            let type = 'image';
            let src = null;
            let width = el.offsetWidth;
            let height = el.offsetHeight;

            // Handle background images
            const bgImage = window.getComputedStyle(el).backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
                src = bgImage.slice(4, -1).replace(/["']/g, '');
            } else if (el.tagName === 'VIDEO') {
                type = 'video';
                src = getBestMediaSrc(el);
                width = el.videoWidth || width;
                height = el.videoHeight || height;
            } else {
                // IMG or other
                src = getBestMediaSrc(el);
            }

            if (!src) return;

            // Filter by size
            if (width < minSize || height < minSize) return;

            const absoluteUrl = makeAbsoluteUrl(src, window.location.href);
            if (!absoluteUrl) return;

            // Simple robust deduplication
            if (seenUrls.has(absoluteUrl)) return;
            seenUrls.add(absoluteUrl);

            images.push({
                url: absoluteUrl,
                type: type,
                width: width,
                height: height,
                resolution: `${Math.round(width)}x${Math.round(height)}`,
                alt: el.getAttribute('alt') || '',
                title: el.getAttribute('title') || ''
            });
        });
    });

    // 2. Iframe Scanning (limited to same-origin due to security)
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc) {
                // Simplified scan for iframes
                doc.querySelectorAll('img').forEach(img => {
                    if (img.width < minSize || img.height < minSize) return;
                    const src = getBestMediaSrc(img);
                    if (src) {
                        const absUrl = makeAbsoluteUrl(src, doc.location.href);
                        if (absUrl && !seenUrls.has(absUrl)) {
                            seenUrls.add(absUrl);
                            images.push({
                                url: absUrl,
                                type: 'image',
                                width: img.width,
                                height: img.height, /*iframe special mark*/
                                resolution: `${img.width}x${img.height}`,
                                isFromIframe: true
                            });
                        }
                    }
                });
            }
        } catch (e) {
            // Ignore cross-origin errors
        }
    });

    // Send only if we found something or if explicit update requested
    console.log(`Scanning complete. Found ${images.length} images.`);
    ipcRenderer.sendToHost('media-found', images);
};

// --- Initialization ---

// Initial scan
window.addEventListener('DOMContentLoaded', () => {
    scanMedia();

    // Observer for dynamic content (Infinite scroll support)
    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) shouldScan = true;
        });

        if (shouldScan) {
            // Debounce
            if (window.scanTimeout) clearTimeout(window.scanTimeout);
            window.scanTimeout = setTimeout(scanMedia, 1000);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Periodic check for lazy loaded images that change src attributes
    setInterval(scanMedia, 3000);
});

// Listen for commands from host
ipcRenderer.on('scan-images', () => {
    scanMedia();
});
