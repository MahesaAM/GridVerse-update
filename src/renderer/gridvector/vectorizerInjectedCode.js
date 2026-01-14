
export const VECTORIZER_INJECTED_CODE = `
console.log("Vectorizer Content Script Loaded via Injection");

async function waitForCondition(predicate, timeout = 30000) {
    return new Promise((resolve, reject) => {
        if (predicate()) return resolve();
        const interval = setInterval(() => {
            if (predicate()) {
                clearInterval(interval);
                resolve();
            }
        }, 500);
        setTimeout(() => {
            clearInterval(interval);
            reject(new Error("Timeout waiting for condition"));
        }, timeout);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isVisible(el) {
    // Robust visibility check
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
}

async function prepareDownload(format) {
    console.log("Preparing download for...", format);

    const modalBtnSelector = '#Options-Submit, #Options-SubmitRecaptcha, a.btn-primary.btn-lg';
    
    // Helper to try opening the modal if not visible
    const ensureModalOpen = async () => {
        let btn = document.querySelector(modalBtnSelector);
        if (isVisible(btn)) return true;

        console.log("Export Modal closed. Attempting to open...");
        
        // 1. Try #App-DownloadLink (The text link)
        const mainLink = document.querySelector('#App-DownloadLink');
        if (isVisible(mainLink)) {
            console.log("Clicking #App-DownloadLink");
            mainLink.click();
            await sleep(1000);
            return true;
        }

        // 2. Try Header/Toolbar "Download" button
        console.log("Searching for header download button...");
        const candidates = Array.from(document.querySelectorAll('button, a'));
        const downloadBtn = candidates.find(el => {
            if (!isVisible(el)) return false;
            // Check context: inside header, toolbar, nav
            const context = el.closest('header, nav, .toolbar, .navbar, .row'); 
            if (!context) return false;
            
            const text = (el.innerText || '').trim().toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            return text.includes('download') || aria.includes('download');
        });

        if (downloadBtn) {
            console.log("Clicking generic download button:", downloadBtn);
            downloadBtn.click();
            await sleep(1000);
            return true;
        }
        
        return false;
    };

    await ensureModalOpen();

    // 1. Select format
    if (format) {
        console.log(\`Attempting to select format: \${format}\`);
        await sleep(500);
        let formatInput = document.querySelector(\`input[value="\${format}"]\`);
        if (!formatInput) {
            const labels = Array.from(document.querySelectorAll('label, div.option, span'));
            const targetLabel = labels.find(l => l.innerText.trim().toUpperCase() === format.toUpperCase());
            if (targetLabel) targetLabel.click();
        } else {
            formatInput.click();
            if (formatInput.parentElement && formatInput.parentElement.tagName === 'LABEL') {
                formatInput.parentElement.click();
            }
        }
        await sleep(500);
    }

    // Check for re-auth
    const reauthSelector = '#ReauthenticateModal';
    const start = Date.now();
    let btn = null;

    while (Date.now() - start < 30000) {
        const modal = document.querySelector(reauthSelector);
        if (modal && isVisible(modal)) {
             // In Electron, we might just fail here or try to notify main
            throw new Error("REAUTH_REQUIRED");
        }
        
        const els = document.querySelectorAll(modalBtnSelector);
        for(let el of els) {
            if(isVisible(el)) {
                btn = el; break;
            }
        }
        if (btn) break;
        await sleep(500);
    }

    if (!btn) throw new Error("Download button not found in modal");
    return btn;
}

window.handleUpload = async function(base64Data, fileName, mimeType) {
    console.log("Handling upload for", fileName);
    
    // Upload Logic
    let input = document.querySelector('input[type="file"]');
    if(!input) {
        const dropZone = document.body;
        const res = await fetch(base64Data);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: mimeType });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        dropZone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
        dropZone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    } else {
        const res = await fetch(base64Data);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: mimeType });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Wait for progress modal (START)
    try {
        await waitForCondition(() => {
            const el = document.querySelector('#App-Progress-Pane');
            return isVisible(el);
        }, 10000);
    } catch(e) { }

    // --- Monitor during processing (Pre-Crop + Generic OK) ---
    const cropCheckInterval = setInterval(() => {
        // Specific Pre-Crop
        const specificBtn = document.querySelector('.PreCrop-Sidebar-crop_button');
        if (isVisible(specificBtn)) {
            console.log("Pre-Crop button detected. Clicking.");
            specificBtn.click();
            return;
        }

        // Generic OK in Modals
        const buttons = Array.from(document.querySelectorAll('button'));
        const okBtn = buttons.find(b => {
             return isVisible(b) && b.innerText.trim().toUpperCase() === "OK";
        });
        if (okBtn) {
            console.log("Generic OK button detected. Clicking.");
            okBtn.click();
        }
    }, 1000);

    // Wait for Progress Pane to Disappear (FINISHED)
    try {
        await waitForCondition(() => {
            const el = document.querySelector('#App-Progress-Pane');
            return !isVisible(el);
        }, 180000); 
    } finally {
        clearInterval(cropCheckInterval);
    }
    
    // --- FORCE TRANSITION TO DOWNLOAD PAGE ---
    console.log("Processing done. Checking for download state...");
    await sleep(2000);

    // If "App-DownloadLink" is already visible, we are good.
    const link = document.querySelector('#App-DownloadLink');
    if (isVisible(link)) {
        return "Ready";
    }

    // Otherwise, we are likely on the Result screen and need to click "Download"
    console.log("Not yet in download state. Hunting for 'Download' button...");
    
    const clickDownloadTrigger = () => {
        const candidates = Array.from(document.querySelectorAll('a, button'));
        // Find buttons in header/toolbar that look like download
        const trigger = candidates.find(el => {
            if (!isVisible(el)) return false;
            if (!el.closest('header, nav, .toolbar, .navbar')) return false; // Restrict to top areas
            
            const text = el.innerText.trim().toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            // Check text or icon
            const hasIcon = !!el.querySelector('svg, i');
            
            return text === 'download' || aria.includes('download') || (hasIcon && text.includes('download'));
        });
        
        if (trigger) {
            console.log("Clicking found trigger:", trigger);
            trigger.click();
            return true;
        }
        
        // Fallback: Just look for ANY button saying "Download" visible on screen
        const anyDl = candidates.find(el => isVisible(el) && el.innerText.trim().toLowerCase() === 'download');
        if(anyDl) {
             console.log("Clicking fallback trigger:", anyDl);
             anyDl.click();
             return true;
        }
        
        return false;
    };

    clickDownloadTrigger();

    // Wait for link
    await waitForCondition(() => {
        const el = document.querySelector('#App-DownloadLink');
        const href = el ? el.getAttribute('href') : null;
        return isVisible(el) && href && href.length > 1;
    }, 20000);
    
    return "Ready";
};

window.handleDownload = async function(format) {
    const btn = await prepareDownload(format);
    btn.click();
    return "Clicked";
};

"Injected";
`;

export const LOGIN_INJECTED_CODE = `
console.log("Login Script Injected");

function setNativeValue(element, value) {
    const lastValue = element.value;
    element.value = value;
    const event = new Event('input', { bubbles: true });
    // Hack for React 15/16
    const tracker = element._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error("Element not found: " + selector));
        }, timeout);
    });
}

window.performLogin = async function(email, password) {
    console.log("Attempting auto-login...", window.location.href);

    try {
        const emailInput = await waitForElement('#login_email', 15000);
        const passwordInput = await waitForElement('#login_password', 15000);

        setNativeValue(emailInput, email);
        setNativeValue(passwordInput, password);

        // Find login button
        const buttons = Array.from(document.querySelectorAll('button.btn.btn-primary'));
        const loginBtn = buttons.find(b => b.innerText.includes("Log In"));

        if (loginBtn) {
            console.log("Clicking login button...");
            loginBtn.click();
            return "Clicked";
        } else {
            throw new Error("Login button not found");
        }
    } catch(e) {
        console.error("Login Error:", e);
        throw e;
    }
};
"LoginInjected";
`;
