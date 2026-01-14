const { install, Browser, resolveBuildId } = require('@puppeteer/browsers');
const path = require('path');
const puppeteer = require('puppeteer');

async function run() {
    const buildId = '121.0.6167.85'; // Matching the version in puppeteer-chromium if possible, or use puppeteer's default
    // Actually, let's use the version puppeteer expects or a known good one. 
    // The user's windows one is 121.0.6167.85. Let's try to match it or get a compatible one.
    // Puppeteer 24.3.1 usually maps to a specific chrome version.

    console.log('Detecting Puppeteer preferred revision...');
    // We can try to use puppeteer's know-how, but installing specific build is safer for consistency.
    // Let's stick to 121.0.6167.85 to match Windows if possible, or just latest stable for automation.
    // Puppeteer 24 likely uses Chrome 133 or similar. 121 is quite old?
    // Wait, the file listing showed "121.0.6167.85.manifest".
    // If I mix versions, it might be fine.

    const outputDir = path.join(__dirname, '..', 'browsers_mac');

    console.log(`Downloading Chromium for macOS to ${outputDir}...`);

    // Using @puppeteer/browsers to install
    await install({
        browser: Browser.CHROME,
        buildId: '121.0.6167.85',
        cacheDir: outputDir,
        platform: 'mac',
        unpack: true
    });

    console.log('Done!');
}

run().catch(console.error);
