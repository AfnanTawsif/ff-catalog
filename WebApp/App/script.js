// ================================================================
//  🚀  CONFIGURATION  –  Edit these to point to your own fork
// ================================================================

const CONFIG = {
    WEBSITE_URL: '',
    CDN_BASE_URL: 'https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/PNG/',
    DATABASE_URL: 'https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/database.msgpack.gz',
    FALLBACK_IMAGE_URL: 'icons/error.svg',
    GITHUB_REPO_URL: 'https://github.com/AfnanTawsif/ff-catalog',
    GITHUB_API_TREE_URL: 'https://api.github.com/repos/AfnanTawsif/ff-catalog/git/trees/main?recursive=1',
    WHATS_NEW_URL: 'https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/WebApp/Online/whats_new.json',
    AUTHOR_IMAGE_URL: 'https://cdn.jsdelivr.net/gh/AfnanTawsif/ff-catalog@main/WebApp/Online/author.jpg',
    CONTACT: {
        facebook: 'https://www.facebook.com/not.tawsif',
        instagram: 'https://www.instagram.com/_hey_tawsif_',
        email: 'mailto:acer.only2001@gmail.com',
        devName: 'AfnanTawsif'
    }
};

// ================================================================
//  END OF CONFIGURATION
// ================================================================

// --------------------------------------------------------------
//  SETTINGS TAB LOGIC
// --------------------------------------------------------------
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

        if (btn.dataset.tab === 'contact') {
            loadAuthorImageWithCache();
        }
    });
});

// --------------------------------------------------------------
//  APP CONSTANTS & SERVICE WORKER
// --------------------------------------------------------------
let WEBAPP_VERSION = 'Unknown';
let swRegistration = null;

const WEBSITE_URL = CONFIG.WEBSITE_URL || (window.location.origin + window.location.pathname).replace(/\/+$/, '');

document.getElementById('sourceCodeLink').href = CONFIG.GITHUB_REPO_URL;

document.getElementById('contactFacebook').href = CONFIG.CONTACT.facebook;
document.getElementById('contactInstagram').href = CONFIG.CONTACT.instagram;
document.getElementById('contactEmail').href = CONFIG.CONTACT.email;
document.getElementById('devNameUI').textContent = CONFIG.CONTACT.devName;
document.getElementById('profileAuthorName').textContent = CONFIG.CONTACT.devName;

// --------------------------------------------------------------
//  FLAGS FOR CREDIT TOAST MANAGEMENT
// --------------------------------------------------------------
let initialLoadDone = false;
let isWebAppUpdated = false;
let creditToastShown = false;
let isFirstVisit = !localStorage.getItem('ff_visited');
let pendingUpdateToast = false;

// ─── CHECK FOR UPDATE FLAG IMMEDIATELY (SYNCHRONOUS) ────────────
if (sessionStorage.getItem('webapp_updated') === 'true') {
    pendingUpdateToast = true;
    isWebAppUpdated = true;
}

// ─── Settings Bubble Logic for First Visit ───────────────────────
let hasShownSettingsBubble = false;

window.addEventListener('DOMContentLoaded', () => {
    const reportModal = document.getElementById('reportModal');
    const settingsBtn = document.getElementById('openSettings');
    const settingsBubble = document.getElementById('settingsBubble');
    const bubbleCloseBtn = document.getElementById('settingsBubbleClose');

    if (reportModal && settingsBtn && settingsBubble) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isHidden = reportModal.classList.contains('hidden');

                    if (isHidden && isFirstVisit && !hasShownSettingsBubble) {
                        hasShownSettingsBubble = true;

                        setTimeout(() => {
                            settingsBtn.classList.add('pulse-inward');
                            settingsBubble.classList.add('show');

                            const dismissSpecialState = () => {
                                settingsBtn.classList.remove('pulse-inward');
                                settingsBubble.classList.remove('show');
                            };

                            bubbleCloseBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                dismissSpecialState();
                            }, { once: true });

                            settingsBtn.addEventListener('click', dismissSpecialState, { once: true });

                        }, 1000);
                    }
                }
            });
        });
        observer.observe(reportModal, { attributes: true });
    }
});

// --------------------------------------------------------------
//  FETCH SERVICE WORKER VERSION (deferred update handling)
// --------------------------------------------------------------
async function fetchSWVersion() {
    try {
        const res = await fetch('sw.js?nocache=' + Date.now());
        if (!res.ok) throw new Error('Network error');
        const text = await res.text();
        let version = null;
        const patterns = [
            /CACHE_NAME\s*=\s*['"][^'"]*-(v[\d\.]+)['"]/,
            /version\s*[:=]\s*['"](v[\d\.]+)['"]/,
            /CACHE_NAME\s*=\s*['"]([^'"]*)['"]/
        ];
        for (const pat of patterns) {
            const match = text.match(pat);
            if (match) {
                version = match[1] || match[0];
                break;
            }
        }
        if (version) {
            WEBAPP_VERSION = version;
        } else {
            console.warn('Could not extract version from sw.js');
        }
    } catch (e) {
        console.error("Could not fetch SW version", e);
    }

    document.getElementById('webappVersionUI').textContent = WEBAPP_VERSION;
}
fetchSWVersion();

// --------------------------------------------------------------
//  SERVICE WORKER REGISTRATION (with retry)
// --------------------------------------------------------------
function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service workers not supported');
        return Promise.reject('Service workers not supported');
    }

    return navigator.serviceWorker.register('sw.js')
        .then(reg => {
            swRegistration = reg;
            console.log('Service Worker registered successfully');
            reg.update().catch(() => {});
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        sessionStorage.setItem('webapp_updated', 'true');
                        sessionStorage.setItem('clear_url_on_load', 'true');
                    }
                });
            });
            return reg;
        })
        .catch(err => {
            console.error('SW Registration failed:', err);
            swRegistration = null;
            return Promise.reject(err);
        });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        registerServiceWorker();

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}

// --------------------------------------------------------------
//  STATE & STACK
// --------------------------------------------------------------
let allItems = [];
let filteredItems = [];
let itemsById = new Map();
let rawDbUpdatedOnText = "Unknown";
let dbUpdatedOnText = "Unknown";
let currentPage = 1;
const ITEMS_PER_PAGE = 80;
let totalPages = 1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let activeModalStack = [];
let currentItemModalId = null;

let displayMode = 'multi';
let infiniteRenderedCount = 0;
const INFINITE_BATCH = 80;
let isInfiniteLoading = false;
let infiniteAllLoaded = false;
let infiniteObserver = null;
let infiniteSentinelEl = null;
let toastTimeout = null;

const rarityMap = {
    'NONE': 'None',
    'WHITE': 'Common',
    'GREEN': 'Uncommon',
    'BLUE': 'Rare',
    'PURPLE': 'Epic',
    'PURPLE_PLUS': 'Epic++',
    'ORANGE': 'Mythic',
    'ORANGE_PLUS': 'Mythic++',
    'RED': 'Artifact'
};

// --------------------------------------------------------------
//  FAVORITES SYSTEM
// --------------------------------------------------------------
const FAV_STORAGE_KEY = 'ff_favorites';

function getFavorites() {
    try {
        const raw = localStorage.getItem(FAV_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveFavorites(list) {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(list));
}

function isFavorited(id) {
    return getFavorites().some(f => f.id === String(id));
}

function toggleFavorite(id) {
    let favs = getFavorites();
    const strId = String(id);
    const idx = favs.findIndex(f => f.id === strId);
    if (idx > -1) {
        favs.splice(idx, 1);
    } else {
        favs.push({ id: strId, timestamp: Date.now() });
    }
    saveFavorites(favs);
    updateFavUI();
    // If we are currently in favorites filter, re-apply to refresh the list
    if (favFilterActive) {
        applyFilters();
    }
}

function getFavoritedItems() {
    const favs = getFavorites();
    // Sort by timestamp descending (newest first)
    favs.sort((a, b) => b.timestamp - a.timestamp);
    const items = [];
    favs.forEach(f => {
        const item = itemsById.get(f.id);
        if (item) items.push(item);
    });
    return items;
}

// --------------------------------------------------------------
//  FAVORITES UI STATE
// --------------------------------------------------------------
let favFilterActive = false; // will be loaded from localStorage

function loadFavState() {
    const stored = localStorage.getItem('favFilterActive');
    if (stored !== null) {
        favFilterActive = stored === 'true';
    } else {
        favFilterActive = false;
    }
}

function saveFavState() {
    localStorage.setItem('favFilterActive', String(favFilterActive));
}

function updateFavUI() {
    const favs = getFavorites();
    const count = favs.length;

    // Update toggle button
    const toggle = document.getElementById('favToggle');
    const starEl = document.getElementById('favStar');
    const countEl = document.getElementById('favCount');
    if (favFilterActive) {
        toggle.classList.add('active');
        starEl.textContent = '★';
    } else {
        toggle.classList.remove('active');
        starEl.textContent = '☆';
    }
    countEl.textContent = count;

    // Update toolbar
    const toolbar = document.getElementById('favToolbar');
    const toolbarCount = document.getElementById('favToolbarCount');
    if (favFilterActive) {
        toolbar.classList.add('visible');
        toolbarCount.textContent = count;
    } else {
        toolbar.classList.remove('visible');
    }

    // Update all card stars (including those not yet rendered, but we'll do that in buildItemCards)
    document.querySelectorAll('.star-btn').forEach(btn => {
        const id = btn.dataset.id;
        if (id) {
            const favorited = isFavorited(id);
            btn.innerHTML = favorited ? '★' : '☆';
            btn.classList.toggle('favorited', favorited);
        }
    });
}

// --------------------------------------------------------------
//  DOM REFS
// --------------------------------------------------------------
const grid = document.getElementById('itemGrid');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchIcon = document.getElementById('searchIcon');
const tagFilter = document.getElementById('tagFilter');
const typeFilter = document.getElementById('typeFilter');
const rareFilter = document.getElementById('rareFilter');

const rangeName = document.getElementById('rangeName');
const rangeID = document.getElementById('rangeID');
const rangeDesc = document.getElementById('rangeDesc');
const rangeIcon = document.getElementById('rangeIcon');
const clickAction = document.getElementById('clickAction');
const downloadAs = document.getElementById('downloadAs');
const reqDataBtns = document.querySelectorAll('.req-data-btn');

const paginationContainer = document.getElementById('paginationContainer');
const jumpInput = document.getElementById('jumpInput');
const searchPageBtn = document.getElementById('searchPageBtn');
const totalPagesUI = document.getElementById('totalPagesUI');
const pageNumbersEl = document.getElementById('pageNumbers');
const toast = document.getElementById('toast');

const displayModeSelect = document.getElementById('displayModeSelect');

const iconLimitInput = document.getElementById('iconLimitInput');
const iconLimitTick = document.getElementById('iconLimitTick');
const storageBarFill = document.getElementById('storageBarFill');
const storageBarText = document.getElementById('storageBarText');
const cleanStorageBtn = document.getElementById('cleanStorageBtn');

infiniteSentinelEl = document.getElementById('infiniteSentinel');

const modalShareBtn = document.getElementById('modalShareBtn');

const reloadBtn = document.getElementById('reloadBtn');
const mainTitle = document.getElementById('mainTitle');

const viewChangelogsBtn = document.getElementById('viewChangelogsBtn');

const authorImg = document.getElementById('authorImage');
const authorLoader = document.getElementById('authorImageLoader');

// --------------------------------------------------------------
//  SEARCH CLEAR BUTTON LOGIC
// --------------------------------------------------------------
searchInput.addEventListener('input', function() {
    const hasValue = this.value.length > 0;
    searchClear.style.display = hasValue ? 'flex' : 'none';
    searchIcon.style.display = hasValue ? 'none' : 'flex';
});

searchClear.addEventListener('click', function() {
    searchInput.value = '';
    searchClear.style.display = 'none';
    searchIcon.style.display = 'flex';
    searchInput.focus();
    applyFilters();
});

searchClear.style.display = 'none';
searchIcon.style.display = 'flex';

// --------------------------------------------------------------
//  DATE FORMATTING
// --------------------------------------------------------------
function formatDatabaseDate(dateStr) {
    if (!dateStr || dateStr === "Unknown") return "Unknown";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
        "November", "December"
    ];
    const monthName = months[monthNum - 1];
    if (!monthName || isNaN(day)) return dateStr;
    return `${day} ${monthName}, ${year}`;
}

function showToast(msg) {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeout = null;
    }, 3500);
}

function showCreditToastIfNeeded() {
    if (creditToastShown || isWebAppUpdated) return;
    creditToastShown = true;
    setTimeout(() => {
        showToast("🛠️ Dev: @AfnanTawsif");
    }, 800);
}

// --------------------------------------------------------------
//  WHAT'S NEW? DIALOG
// --------------------------------------------------------------
async function showWhatsNew() {
    const reportTitle = document.getElementById('reportTitle');
    const reportContent = document.getElementById('reportContent');

    if (!reportTitle || !reportContent) {
        console.warn('Report modal elements not found');
        return;
    }

    reportTitle.textContent = "What's New?";
    reportContent.innerHTML = `
        <div class="whatsnew-loading">
            <div class="spinner"></div>
            <p>Loading changelogs...</p>
        </div>
    `;

    const modal = document.getElementById('reportModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (!activeModalStack.includes('reportModal')) {
        activeModalStack.push('reportModal');
    }

    const baseUrl = CONFIG.WHATS_NEW_URL;
    const cacheKey = baseUrl;
    const fetchUrl = baseUrl + '?nocache=' + Date.now();

    let cache = null;
    let cachedData = null;

    try {
        cache = await caches.open('ff-whatsnew');
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
            cachedData = await cachedResponse.json();
        }
    } catch (e) { /* ignore */ }

    let freshData = null;
    let fetchFailed = false;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(fetchUrl, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        freshData = await response.json();
        if (cache) {
            try {
                await cache.put(cacheKey, new Response(JSON.stringify(freshData), {
                    headers: { 'Content-Type': 'application/json' }
                }));
            } catch (e) { /* ignore */ }
        }
    } catch (err) {
        fetchFailed = true;
        console.warn('Failed to fetch fresh changelogs:', err);
    }

    if (freshData && Array.isArray(freshData) && freshData.length > 0) {
        renderWhatsNewData(freshData, reportContent);
    } else if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
        renderWhatsNewData(cachedData, reportContent);
        if (fetchFailed) {
            showToast("Failed to refresh. Showing cached data");
        }
    } else {
        reportContent.innerHTML = `<p class="whatsnew-error">Failed to load from online and cache</p>`;
    }
}

function renderWhatsNewData(data, container) {
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = `<p class="whatsnew-error">No version history found.</p>`;
        return;
    }
    let html = '';
    data.forEach(item => {
        html += `<div class="whatsnew-version">`;
        html += `<h3>${item.version}</h3>`;
        let logs = item.logs;
        // If logs is a string, split by newline and filter empty lines
        if (typeof logs === 'string') {
            logs = logs.split(/\n/).filter(line => line.trim().length > 0);
        }
        if (Array.isArray(logs) && logs.length > 0) {
            html += `<ul>`;
            logs.forEach(log => {
                html += `<li>${log}</li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p>No logs available.</p>`;
        }
        html += `</div>`;
    });
    container.innerHTML = html;
}

// --------------------------------------------------------------
//  AUTHOR IMAGE LOADING
// --------------------------------------------------------------
function getFallbackAuthorSVG() {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="130" height="130">
            <circle cx="50" cy="50" r="48" fill="#2a2a2a" stroke="#444" stroke-width="2"/>
            <circle cx="50" cy="35" r="20" fill="#555"/>
            <circle cx="50" cy="35" r="18" fill="#666"/>
            <ellipse cx="50" cy="80" rx="30" ry="22" fill="#555"/>
            <ellipse cx="50" cy="80" rx="28" ry="20" fill="#666"/>
        </svg>
    `)}`;
}

async function loadAuthorImageWithCache() {
    const img = authorImg;
    const loader = authorLoader;
    const baseUrl = CONFIG.AUTHOR_IMAGE_URL;
    const cacheKey = baseUrl;
    const fetchUrl = baseUrl + '?nocache=' + Date.now();

    loader.classList.remove('hidden');

    let cache = null;
    let cachedBlob = null;
    let cacheTimestamp = 0;

    try {
        cache = await caches.open('ff-author');
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
            cachedBlob = await cachedResponse.blob();
            cacheTimestamp = parseInt(localStorage.getItem('ff-author-timestamp')) || 0;
        }
    } catch (e) { /* ignore */ }

    if (cachedBlob) {
        const objectUrl = URL.createObjectURL(cachedBlob);
        img.src = objectUrl;
        img.classList.add('loaded');
        loader.classList.add('hidden');
    } else {
        img.src = getFallbackAuthorSVG();
        img.classList.add('loaded');
    }

    const now = Date.now();
    const shouldRefresh = !cachedBlob || (now - cacheTimestamp > ONE_DAY_MS);

    if (shouldRefresh) {
        try {
            loader.classList.remove('hidden');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(fetchUrl, { signal: controller.signal, cache: 'no-store' });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Network error');

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            img.src = objectUrl;
            img.classList.add('loaded');
            if (cache) {
                try {
                    await cache.put(cacheKey, new Response(blob, {
                        headers: { 'Content-Type': 'image/jpeg' }
                    }));
                    localStorage.setItem('ff-author-timestamp', String(now));
                } catch (e) { /* ignore */ }
            }
        } catch (err) {
            console.warn('Failed to refresh author image:', err);
            if (cachedBlob) {
                showToast("Failed to refresh. Showing cached data");
            } else {
                showToast("Failed to load author image from online and cache");
            }
        } finally {
            loader.classList.add('hidden');
        }
    } else {
        loader.classList.add('hidden');
    }
}

// --------------------------------------------------------------
//  URL / HISTORY MANAGEMENT
// --------------------------------------------------------------
function getCleanPath() {
    return window.location.pathname;
}

function updateUrlFromStack(method = 'replace') {
    const params = new URLSearchParams();
    for (const id of activeModalStack) {
        if (id === 'itemModal') {
            if (currentItemModalId) {
                params.set('item', currentItemModalId);
            }
        } else if (id === 'settingsModal') {
            params.set('settings', 'true');
        }
    }
    const newUrl = getCleanPath() + (params.toString() ? '?' + params.toString() : '');
    if (method === 'push') {
        history.pushState({}, '', newUrl);
    } else {
        history.replaceState({}, '', newUrl);
    }
}

function syncModalsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('item');
    const settings = params.get('settings');

    const desired = [];
    if (settings !== null) desired.push('settingsModal');
    if (itemId !== null) desired.push('itemModal');

    for (let i = activeModalStack.length - 1; i >= 0; i--) {
        const id = activeModalStack[i];
        if (!desired.includes(id)) {
            const modal = document.getElementById(id);
            if (modal) modal.classList.add('hidden');
            activeModalStack.splice(i, 1);
            if (id === 'itemModal') currentItemModalId = null;
        }
    }

    for (const id of desired) {
        if (!activeModalStack.includes(id)) {
            const modal = document.getElementById(id);
            if (modal) modal.classList.remove('hidden');
            activeModalStack.push(id);

            if (id === 'itemModal') {
                currentItemModalId = itemId;
                const item = itemsById.get(String(itemId));
                if (item) {
                    populateItemModal(item);
                } else {
                    showToast(`Item #${itemId} not found.`);
                    const idx = activeModalStack.indexOf(id);
                    if (idx > -1) {
                        activeModalStack.splice(idx, 1);
                        const m = document.getElementById(id);
                        if (m) m.classList.add('hidden');
                    }
                    currentItemModalId = null;
                    updateUrlFromStack('replace');
                }
            }
        }
    }

    if (activeModalStack.length === 0) {
        document.body.style.overflow = '';
    } else {
        document.body.style.overflow = 'hidden';
    }
}

// --------------------------------------------------------------
//  MODAL SYSTEM
// --------------------------------------------------------------
function openModal(id, data = null) {
    const modal = document.getElementById(id);
    if (!modal) return;

    if (activeModalStack.includes(id)) {
        modal.classList.remove('hidden');
        return;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    activeModalStack.push(id);

    if (id === 'itemModal' && data && data.itemId) {
        currentItemModalId = data.itemId;
    }

    updateUrlFromStack('push');
}

function closeModal(id, isPopState = false) {
    if (isPopState) {
        forceHideModal(id);
        return;
    }

    forceHideModal(id);
    updateUrlFromStack('replace');
    if (activeModalStack.length === 0) {
        document.body.style.overflow = '';
    }
}

function forceHideModal(id) {
    const modal = document.getElementById(id);
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        const index = activeModalStack.indexOf(id);
        if (index > -1) {
            activeModalStack.splice(index, 1);
        }
        setTimeout(() => resetInternalScrolls(modal), 250);
        if (activeModalStack.length === 0) {
            document.body.style.overflow = '';
        }
        if (id === 'itemModal') {
            const modalImg = document.getElementById('modalImg');
            const modalEl = document.getElementById('itemModal');

            // Delay cleanup to allow CSS transition to finish (0.25s)
            setTimeout(() => {
                // Only clean if the modal is still hidden (not reopened)
                if (modalEl && modalEl.classList.contains('hidden')) {
                    if (modalImg && modalImg.dataset.objectUrl) {
                        URL.revokeObjectURL(modalImg.dataset.objectUrl);
                        delete modalImg.dataset.objectUrl;
                    }
                    if (modalImg) {
                        modalImg.removeAttribute('src');
                        modalImg.classList.remove('loaded');
                    }
                }
            }, 300);

            currentItemModalId = null;
        }
    }
}

function resetInternalScrolls(container) {
    const scrollables = container.querySelectorAll('.item-modal-bottom, .modal-icon-name, .settings-body, .report-body, div');
    scrollables.forEach(el => {
        if (el.scrollTop) el.scrollTop = 0;
        if (el.scrollLeft) el.scrollLeft = 0;
    });
}

window.addEventListener('popstate', (e) => {
    if (dlDbMenu.classList.contains('show')) dlDbMenu.classList.remove('show');
    syncModalsFromUrl();
});

document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => {
        if (e.target === m) {
            const id = m.id;
            if (activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === id) {
                closeModal(id);
            }
        }
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (dlDbMenu.classList.contains('show')) {
            dlDbMenu.classList.remove('show');
        } else if (activeModalStack.length > 0) {
            const topId = activeModalStack[activeModalStack.length - 1];
            closeModal(topId);
        }
    }
});

// --------------------------------------------------------------
//  ITEM MODAL POPULATION
// --------------------------------------------------------------
let currentShareItemId = null;

async function populateItemModal(item) {
    const iconUrl = CONFIG.CDN_BASE_URL + item.itemID + '.png';
    const fallbackUrl = CONFIG.FALLBACK_IMAGE_URL;
    const modalImg = document.getElementById('modalImg');
    const dlFileName = downloadAs.value === 'name' ? (item.icon ? `${item.icon}.png` : `${item.itemID}.png`) :
        `${item.itemID}.png`;

    currentShareItemId = item.itemID;

    if (modalImg.dataset.objectUrl) {
        URL.revokeObjectURL(modalImg.dataset.objectUrl);
        delete modalImg.dataset.objectUrl;
    }
    modalImg.removeAttribute('src');
    modalImg.classList.remove('loaded');
    modalImg.dataset.failed = "false";

    try {
        const cache = await caches.open('ff-icons');
        let response = await cache.match(iconUrl);

        if (!response) {
            response = await fetch(iconUrl);
            if (!response.ok) throw new Error('Image fetch failed');
            cache.put(iconUrl, response.clone());
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        modalImg.src = objectUrl;
        modalImg.dataset.objectUrl = objectUrl;
        modalImg.classList.add('loaded');

    } catch (err) {
        console.warn(`Failed to load icon for ${item.itemID}:`, err);
        modalImg.src = fallbackUrl;
        modalImg.classList.add('loaded');
    }

    document.getElementById('modalName').textContent = item.name || 'Unnamed';

    const iconNameEl = document.getElementById('modalIconName');
    iconNameEl.textContent = item.icon || 'Undefined';

    let badgesHTML = `<span class="badge badge-id">ID: ${item.itemID}</span>`;
    if (item.type) {
        let displayType = item.type;
        if (displayType.toLowerCase().endsWith('s')) displayType = displayType.slice(0, -1);
        badgesHTML += `<span class="badge badge-type">${displayType}</span>`;
    }
    if (item.Rare) {
        const mappedName = rarityMap[item.Rare] || item.Rare;
        badgesHTML += `<span class="badge rare-${item.Rare}">${mappedName}</span>`;
    }
    if (item.tag) {
        const tags = item.tag.split(',').map(t => t.trim());
        tags.forEach(t => {
            if (t) badgesHTML += `<span class="badge badge-tag">${t}</span>`;
        });
    }

    document.getElementById('modalBadges').innerHTML = badgesHTML;
    document.getElementById('modalDesc').textContent = item.description || 'No description available.';

    const dlBtn = document.getElementById('modalDlBtn');
    dlBtn.onclick = () => triggerDownload(iconUrl, dlFileName);

    // Update modal star
    const modalStar = document.getElementById('modalStarBtn');
    if (modalStar) {
        modalStar.dataset.id = String(item.itemID);
        const favorited = isFavorited(item.itemID);
        modalStar.innerHTML = favorited ? '★' : '☆';
        modalStar.classList.toggle('favorited', favorited);
        modalStar.onclick = (e) => {
            e.stopPropagation();
            toggleFavorite(item.itemID);
            // Update card stars as well
            document.querySelectorAll(`.star-btn[data-id="${item.itemID}"]`).forEach(btn => {
                const fav = isFavorited(item.itemID);
                btn.innerHTML = fav ? '★' : '☆';
                btn.classList.toggle('favorited', fav);
            });
        };
    }
}

function openItemModalWithData(item) {
    populateItemModal(item);
    openModal('itemModal', { itemId: item.itemID });
}

// --------------------------------------------------------------
//  HELPER: Fetch image as PNG blob (converts SVG if needed)
// --------------------------------------------------------------
async function fetchImageAsPNGBlob(imgUrl) {
    const fallbackUrl = CONFIG.FALLBACK_IMAGE_URL;
    let response = await fetch(imgUrl);
    if (!response.ok) {
        response = await fetch(fallbackUrl);
    }
    let blob = await response.blob();

    if (blob.type === 'image/svg+xml' || imgUrl.endsWith('.svg') || imgUrl.endsWith('.svg?') || imgUrl.includes('.svg')) {
        try {
            blob = await svgToPng(blob);
        } catch (svgErr) {
            console.warn('SVG to PNG conversion failed, using raw blob', svgErr);
        }
    }
    return blob;
}

// --------------------------------------------------------------
//  DOWNLOAD & COPY IMAGE LOGIC
// --------------------------------------------------------------
function triggerDownload(primaryUrl, filename) {
    fetchImageAsPNGBlob(primaryUrl)
        .then(blob => executeBlobDownload(blob, filename))
        .catch(() => alert('Failed to download image.'));
}

function executeBlobDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
}

function svgToPng(svgBlob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            const width = img.naturalWidth || 256;
            const height = img.naturalHeight || 256;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to decode SVG'));
        };
        img.src = url;
    });
}

async function copyImageToClipboard(imgUrl, customBtn, cardItemID) {
    try {
        const blob = await fetchImageAsPNGBlob(imgUrl);
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);

        if (customBtn) {
            const originalHTML = customBtn.innerHTML;
            customBtn.innerHTML =
                `<svg viewBox="0 0 24 24" style="fill: #2196F3; transform: scale(1.3);"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
            setTimeout(() => { customBtn.innerHTML = originalHTML; }, 2000);
        }

        if (cardItemID) {
            const tick = document.getElementById(`tick-${cardItemID}`);
            if (tick) {
                tick.classList.add('blue-tick');
                tick.classList.add('show');
                setTimeout(() => {
                    tick.classList.remove('show');
                    setTimeout(() => tick.classList.remove('blue-tick'), 300);
                }, 2000);
            }
        }
    } catch (err) {
        console.error("Failed to copy image", err);
        showToast("Failed to copy image. Your browser might not support it.");
    }
}

document.getElementById('modalCopyImgBtn').addEventListener('click', function() {
    copyImageToClipboard(document.getElementById('modalImg').src, this, null);
});

modalShareBtn.addEventListener('click', function() {
    if (!currentShareItemId) {
        showToast("No item selected.");
        return;
    }
    const shareUrl = WEBSITE_URL + '?item=' + currentShareItemId;
    const itemName = document.getElementById('modalName').textContent || 'Free Fire Item';

    const shareData = {
        title: 'Free Fire Item',
        text: `Check out this Free Fire item: ${itemName}`,
        url: shareUrl
    };

    if (navigator.share) {
        navigator.share(shareData).then(() => {
            showToast("Shared successfully!");
        }).catch((err) => {
            if (err.name !== 'AbortError') {
                showToast("Failed to share.");
            }
        });
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("Item link copied. Ready to share!");
            const originalHTML = this.innerHTML;
            this.innerHTML =
                `<svg viewBox="0 0 24 24" style="fill: #4CAF50; transform: scale(1.3);"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
            setTimeout(() => { this.innerHTML = originalHTML; }, 2000);
        }).catch(() => {
            showToast("Failed to copy link.");
        });
    }
});

// --------------------------------------------------------------
//  ITEM CLICK HANDLER
// --------------------------------------------------------------
function handleItemClick(item) {
    const iconUrl = CONFIG.CDN_BASE_URL + item.itemID + '.png';
    const dlFileName = downloadAs.value === 'name' ? (item.icon ? `${item.icon}.png` : `${item.itemID}.png`) :
        `${item.itemID}.png`;

    currentShareItemId = item.itemID;

    if (clickAction.value === 'details') {
        openItemModalWithData(item);
    } else if (clickAction.value === 'download') {
        triggerDownload(iconUrl, dlFileName);
    } else if (clickAction.value === 'copyIcon') {
        copyImageToClipboard(iconUrl, null, item.itemID);
    } else {
        navigator.clipboard.writeText(String(item.itemID)).then(() => {
            const tick = document.getElementById(`tick-${item.itemID}`);
            if (tick) {
                tick.classList.remove('blue-tick');
                tick.classList.add('show');
                setTimeout(() => tick.classList.remove('show'), 2000);
            }
        }).catch(() => {});
    }
}

// --------------------------------------------------------------
//  HOME / RELOAD BUTTON
// --------------------------------------------------------------
function goHome() {
    while (activeModalStack.length > 0) {
        const id = activeModalStack.pop();
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
        if (id === 'itemModal') currentItemModalId = null;
    }
    document.body.style.overflow = '';
    const cleanUrl = getCleanPath();
    history.replaceState({}, '', cleanUrl);

    searchInput.value = '';
    tagFilter.value = '';
    typeFilter.value = '';
    rareFilter.value = '';

    searchClear.style.display = 'none';
    searchIcon.style.display = 'flex';

    // Reset favorites filter? No, keep state.
    currentPage = 1;
    applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("🏠 Back to home");
}

reloadBtn.addEventListener('click', goHome);
mainTitle.addEventListener('click', goHome);

// --------------------------------------------------------------
//  SETTINGS BUTTON
// --------------------------------------------------------------
document.getElementById('openSettings').addEventListener('click', () => {
    if (activeModalStack.includes('settingsModal')) {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.remove('hidden');
        return;
    }
    openModal('settingsModal');
});

// --------------------------------------------------------------
//  VIEW CHANGELOGS BUTTON
// --------------------------------------------------------------
viewChangelogsBtn.addEventListener('click', () => {
    showWhatsNew();
});

// --------------------------------------------------------------
//  RESYNC BUTTON
// --------------------------------------------------------------
document.getElementById('resyncBtn').addEventListener('click', () => {
    initDatabase(true);
});

// --------------------------------------------------------------
//  UPDATE WEBAPP BUTTON (improved)
// --------------------------------------------------------------
document.getElementById('updateWebAppBtn').addEventListener('click', async () => {
    const btn = document.getElementById('updateWebAppBtn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = 'Checking...';
    btn.disabled = true;

    try {
        if (!swRegistration) {
            try {
                await registerServiceWorker();
                if (!swRegistration) {
                    showToast('Service worker still not registered. Check console.');
                    return;
                }
            } catch (err) {
                showToast('Service worker registration failed. Check console.');
                return;
            }
        }

        const res = await fetch('sw.js?nocache=' + Date.now());
        if (!res.ok) throw new Error('Network error');
        const text = await res.text();

        let newVersion = null;
        const patterns = [
            /CACHE_NAME\s*=\s*['"][^'"]*-(v[\d\.]+)['"]/,
            /version\s*[:=]\s*['"](v[\d\.]+)['"]/,
            /CACHE_NAME\s*=\s*['"]([^'"]*)['"]/
        ];
        for (const pat of patterns) {
            const match = text.match(pat);
            if (match) {
                newVersion = match[1] || match[0];
                break;
            }
        }

        if (!newVersion) {
            showToast('Could not detect version in sw.js');
            return;
        }

        if (newVersion === WEBAPP_VERSION) {
            showToast('No WebApp update found (same version)');
            return;
        }

        sessionStorage.setItem('webapp_updated', 'true');
        sessionStorage.setItem('clear_url_on_load', 'true');

        await swRegistration.update();
        showToast(`Updating to ${newVersion}...`);

        setTimeout(() => {
            if (sessionStorage.getItem('webapp_updated') === 'true') {
                window.location.reload();
            }
        }, 3000);

    } catch (err) {
        console.error(err);
        showToast('WebApp update failed. Check console.');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
});

// --------------------------------------------------------------
//  DOWNLOAD MENU LOGIC
// --------------------------------------------------------------
const dlDbBtn = document.getElementById('dlDbBtn');
const dlDbMenu = document.getElementById('dlDbMenu');

dlDbBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dlDbMenu.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!dlDbBtn.contains(e.target) && !dlDbMenu.contains(e.target)) {
        dlDbMenu.classList.remove('show');
    }
});

function triggerLocalDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    dlDbMenu.classList.remove('show');
}

document.getElementById('dlJson').addEventListener('click', () => {
    if (!allItems.length) return;
    triggerLocalDownload(new Blob([JSON.stringify(allItems, null, 2)], { type: 'application/json' }),
        'ff-catalog.json');
});

document.getElementById('dlMsgpack').addEventListener('click', async () => {
    if (!allItems.length) return;
    const cache = await getLocalCache();
    if (cache && cache.rawData) {
        triggerLocalDownload(new Blob([cache.rawData], { type: 'application/octet-stream' }),
            'ff-catalog.msgpack');
    } else {
        triggerLocalDownload(new Blob([MessagePack.encode(allItems)], { type: 'application/octet-stream' }),
            'ff-catalog.msgpack');
    }
});

// --------------------------------------------------------------
//  REPORT COPY LOGIC
// --------------------------------------------------------------
document.getElementById('reportContent').addEventListener('click', (e) => {
    const box = e.target.closest('.copyable-box');
    if (!box) return;
    const textToCopy = box.innerText.replace('Copied!', '').trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
        box.classList.add('copied');
        setTimeout(() => box.classList.remove('copied'), 2000);
    }).catch(err => console.error('Failed to copy', err));
});

// --------------------------------------------------------------
//  SUMMARIZE DATABASE
// --------------------------------------------------------------
document.getElementById('summarizeBtn').addEventListener('click', () => {
    if (!allItems.length) return;

    let reportHTML = `<h3 class="report-title">Overview</h3>`;
    reportHTML += `<p><strong>Updated on:</strong> ${dbUpdatedOnText}</p>`;
    reportHTML += `<p><strong>Total Items Found:</strong> ${allItems.length}</p>`;

    let typeCounts = {};
    let rareCounts = {};

    allItems.forEach(item => {
        const t = item.type || 'Undefined';
        const r = item.Rare || 'Undefined';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
        rareCounts[r] = (rareCounts[r] || 0) + 1;
    });

    reportHTML += `<h3 class="report-title">By Type</h3><div class="summary-section">`;
    Object.keys(typeCounts).sort().forEach(k => {
        reportHTML += `<div class="summary-row copyable-box"><span>${k}</span> <span>${typeCounts[k]}</span></div>`;
    });
    reportHTML += `</div>`;

    reportHTML += `<h3 class="report-title">By Rarity</h3><div class="summary-section">`;
    Object.keys(rareCounts).sort().forEach(k => {
        const mappedName = rarityMap[k] || k;
        reportHTML += `<div class="summary-row copyable-box"><span>${mappedName}</span> <span>${rareCounts[k]}</span></div>`;
    });
    reportHTML += `</div>`;

    const extraKeys = new Set();
    allItems.forEach(item => {
        Object.keys(item).forEach(k => {
            if (!['icon', 'itemID', 'name', 'description'].includes(k)) {
                extraKeys.add(k);
            }
        });
    });
    reportHTML += `<h3 class="report-title">Extra tags</h3>`;
    if (extraKeys.size === 0) {
        reportHTML += `<p>No extra tags found.</p>`;
    } else {
        reportHTML += `<p>These tags were found except the primary (name, itemID, icon, description) tags:</p><ul>`;
        extraKeys.forEach(tag => {
            reportHTML += `<li class="copyable-box">${tag}</li>`;
        });
        reportHTML += `</ul>`;
    }

    document.getElementById('reportTitle').textContent = "Database info";
    document.getElementById('reportContent').innerHTML = reportHTML;
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (!activeModalStack.includes('reportModal')) {
            activeModalStack.push('reportModal');
        }
    }
});

// --------------------------------------------------------------
//  FIND MISSING FILTERS & ICONS
// --------------------------------------------------------------
document.getElementById('findFiltersBtn').addEventListener('click', async () => {
    if (!allItems.length) return;

    loadingText.textContent = 'Checking missing icons...';
    loadingOverlay.classList.add('active');

    try {
        const ignoredKeys = ['icon', 'itemID', 'name', 'description'];
        let allKeys = new Set();
        let dbTags = new Set();
        let dbTypes = new Set();
        let dbRares = new Set();

        allItems.forEach(item => {
            Object.keys(item).forEach(k => allKeys.add(k));
            if (item.tag) dbTags.add(item.tag);
            if (item.type) dbTypes.add(item.type);
            if (item.Rare) dbRares.add(item.Rare);
        });

        const extraFields = Array.from(allKeys).filter(k => !ignoredKeys.includes(k));
        const htmlTags = Array.from(document.querySelectorAll('#tagFilter option')).map(o => o.value).filter(v => v);
        const htmlTypes = Array.from(document.querySelectorAll('#typeFilter option:not([disabled])')).map(o => o.value).filter(v => v);
        const htmlRares = Array.from(document.querySelectorAll('#rareFilter option:not([disabled])')).map(o => o.value).filter(v => v);

        const missingTags = Array.from(dbTags).filter(t => !htmlTags.includes(t));
        const missingTypes = Array.from(dbTypes).filter(t => !htmlTypes.includes(t));
        const missingRares = Array.from(dbRares).filter(r => !htmlRares.includes(r));

        let missingIconIds = [];
        let iconCheckError = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(CONFIG.GITHUB_API_TREE_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                if (res.status === 403) throw new Error("GitHub API rate limit exceeded. Try again later or use VPN.");
                if (res.status === 404) throw new Error("Repository or branch not found");
                throw new Error(`HTTP Error ${res.status}`);
            }

            const data = await res.json();
            let repoImages = new Set();

            if (data.tree && Array.isArray(data.tree)) {
                data.tree.forEach(file => {
                    if (file.path.startsWith('PNG/') && file.path.endsWith('.png')) {
                        const filename = file.path.replace('PNG/', '').replace('.png', '');
                        repoImages.add(filename);
                    }
                });

                allItems.forEach(item => {
                    if (!repoImages.has(String(item.itemID))) {
                        missingIconIds.push(item.itemID);
                    }
                });
            } else {
                throw new Error("Invalid API response format");
            }
        } catch (e) {
            iconCheckError = e.name === 'AbortError' ? "Request timed out (10 seconds)" : e.message;
        }

        let reportHTML = "";

        if (missingTags.length === 0 && missingTypes.length === 0 && missingRares.length === 0) {
            reportHTML +=
                "<h3 class='report-title'>Missing Filters</h3><p>No missing filters found. HTML is up to date with database.</p>";
        } else {
            reportHTML += "<h3 class='report-title'>Missing Filters</h3>";
            if (missingTags.length > 0) reportHTML +=
                `<h4>Tag filters:</h4><ul><li class="copyable-box">${missingTags.join('</li><li class="copyable-box">')}</li></ul>`;
            if (missingTypes.length > 0) reportHTML +=
                `<h4>Type filters:</h4><ul><li class="copyable-box">${missingTypes.join('</li><li class="copyable-box">')}</li></ul>`;
            if (missingRares.length > 0) reportHTML +=
                `<h4>Rarity filters:</h4><ul><li class="copyable-box">${missingRares.join('</li><li class="copyable-box">')}</li></ul>`;
        }

        reportHTML += "<h3 class='report-title'>Missing Icons</h3>";
        if (iconCheckError) {
            reportHTML += `<p style="color: #ff4c4c;">Error checking icons: ${iconCheckError}</p>`;
        } else if (missingIconIds.length === 0) {
            reportHTML += "<p>All items in the database have their corresponding PNG icons on the repository.</p>";
        } else {
            reportHTML += `<p>Found ${missingIconIds.length} missing icons on repository:</p><ul>`;
            reportHTML += missingIconIds.map(id => `<li class="copyable-box">${id}</li>`).join('');
            reportHTML += "</ul>";
        }

        document.getElementById('reportTitle').textContent = "Diagnostic Report";
        document.getElementById('reportContent').innerHTML = reportHTML;
        const modal = document.getElementById('reportModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (!activeModalStack.includes('reportModal')) {
                activeModalStack.push('reportModal');
            }
        }

    } catch (err) {
        loadingOverlay.classList.remove('active');
        showToast("An error occurred during analysis.");
        console.error(err);
    } finally {
        loadingOverlay.classList.remove('active');
    }
});

// --------------------------------------------------------------
//  LOAD & SAVE SETTINGS
// --------------------------------------------------------------
function loadSettings() {
    if (localStorage.getItem('rangeName') !== null) rangeName.checked = localStorage.getItem('rangeName') === 'true';
    if (localStorage.getItem('rangeID') !== null) rangeID.checked = localStorage.getItem('rangeID') === 'true';
    if (localStorage.getItem('rangeDesc') !== null) rangeDesc.checked = localStorage.getItem('rangeDesc') === 'true';
    if (localStorage.getItem('rangeIcon') !== null) rangeIcon.checked = localStorage.getItem('rangeIcon') === 'true';
    if (localStorage.getItem('clickAction')) clickAction.value = localStorage.getItem('clickAction');
    if (localStorage.getItem('downloadAs')) downloadAs.value = localStorage.getItem('downloadAs');

    const savedMode = localStorage.getItem('displayMode') || 'multi';
    displayModeSelect.value = savedMode;
    displayMode = savedMode;

    iconLimitInput.value = localStorage.getItem('iconLimitMB') || '15';
    updateSearchHint();
    applyDisplayMode();
}

function saveSettings() {
    localStorage.setItem('rangeName', rangeName.checked);
    localStorage.setItem('rangeID', rangeID.checked);
    localStorage.setItem('rangeDesc', rangeDesc.checked);
    localStorage.setItem('rangeIcon', rangeIcon.checked);
    localStorage.setItem('clickAction', clickAction.value);
    localStorage.setItem('downloadAs', downloadAs.value);
    localStorage.setItem('displayMode', displayMode);
}

[rangeName, rangeID, rangeDesc, rangeIcon].forEach(cb => cb.addEventListener('change', () => {
    updateSearchHint();
    saveSettings();
}));
clickAction.addEventListener('change', saveSettings);
downloadAs.addEventListener('change', saveSettings);

displayModeSelect.addEventListener('change', function() {
    displayMode = this.value;
    saveSettings();
    applyDisplayMode();
    applyFilters();
});

function applyDisplayMode() {
    if (displayMode === 'infinite') {
        paginationContainer.style.display = 'none';
        infiniteSentinelEl.style.display = 'block';
    } else {
        paginationContainer.style.display = 'flex';
        infiniteSentinelEl.style.display = 'none';
        if (infiniteObserver) {
            infiniteObserver.disconnect();
            infiniteObserver = null;
        }
        infiniteAllLoaded = false;
        infiniteRenderedCount = 0;
        isInfiniteLoading = false;
    }
}

// --------------------------------------------------------------
//  STORAGE/IMAGE CACHE TRACKING — OPTIMIZED WITH DEBOUNCE & PERSISTENCE
// --------------------------------------------------------------
const STORAGE_CACHE_VERSION = 1;
const STORAGE_DEBOUNCE_MS = 1000;
const STORAGE_KEY = 'ff_storage_info';

let currentIconStorageSize = 0;
let iconStorageLimitMB = parseFloat(localStorage.getItem('iconLimitMB')) || 15;
let pendingSizeAdd = 0;
let storageFlushTimer = null;
let isStorageDirty = false;

// ─── Persistence helpers ──────────────────────────────────────────
function loadStorageInfo() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_) { return null; }
}

function saveStorageInfo(totalBytes, keyCount) {
    try {
        const info = {
            totalBytes: totalBytes,
            keyCount: keyCount,
            timestamp: Date.now(),
            cacheVersion: STORAGE_CACHE_VERSION
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
    } catch (_) { /* ignore */ }
}

function clearStorageInfo() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (_) { /* ignore */ }
}

// ─── Debounced storage flush ──────────────────────────────────────
function scheduleStorageFlush() {
    if (storageFlushTimer) {
        clearTimeout(storageFlushTimer);
        storageFlushTimer = null;
    }
    storageFlushTimer = setTimeout(() => {
        flushStorageUpdate();
        storageFlushTimer = null;
    }, STORAGE_DEBOUNCE_MS);
}

function flushStorageUpdate() {
    if (pendingSizeAdd === 0 && !isStorageDirty) return;

    if (pendingSizeAdd > 0) {
        currentIconStorageSize += pendingSizeAdd;
        pendingSizeAdd = 0;
        isStorageDirty = true;
    }

    renderStorageBar();

    // Persist the new total alongside a fresh key count
    updatePersistedStorageInfo();
    isStorageDirty = false;
}

async function updatePersistedStorageInfo() {
    try {
        const cache = await caches.open('ff-icons');
        const keys = await cache.keys();
        saveStorageInfo(currentIconStorageSize, keys.length);
    } catch (_) {
        // If we can't read the cache, still persist the size (keyCount will be stale, but we'll re-scan on next load)
        saveStorageInfo(currentIconStorageSize, 0);
    }
}

// ─── Initialise storage tracking (with cache) ─────────────────────
async function initStorageTracking() {
    const stored = loadStorageInfo();
    const now = Date.now();
    const isRecent = stored && (now - stored.timestamp < 6 * 60 * 60 * 1000);
    const versionMatch = stored && stored.cacheVersion === STORAGE_CACHE_VERSION;

    let cache = null;
    let keyCount = 0;

    try {
        cache = await caches.open('ff-icons');
        const keys = await cache.keys();
        keyCount = keys.length;
    } catch (_) {
        // Cache unavailable — fallback to full scan later
    }

    // If we have recent, version-matched storage info and the key count matches, trust it.
    if (stored && isRecent && versionMatch && stored.keyCount === keyCount) {
        currentIconStorageSize = stored.totalBytes;
        renderStorageBar();
        return;
    }

    // Otherwise, do a full scan (legacy behaviour)
    await fullStorageScan();
}

async function fullStorageScan() {
    try {
        const cache = await caches.open('ff-icons');
        const requests = await cache.keys();
        let total = 0;
        for (let req of requests) {
            const res = await cache.match(req);
            if (res) {
                const blob = await res.blob();
                total += blob.size;
            }
        }
        currentIconStorageSize = total;
        // Persist the scan result
        saveStorageInfo(total, requests.length);
        renderStorageBar();
    } catch (e) {
        console.warn("Storage tracking unavailable", e);
        currentIconStorageSize = 0;
        renderStorageBar();
    }
}

// ─── Render the storage bar ──────────────────────────────────────
function renderStorageBar() {
    const limitBytes = iconStorageLimitMB * 1024 * 1024;
    const pct = Math.min((currentIconStorageSize / limitBytes) * 100, 100);

    storageBarFill.style.width = pct + '%';
    if (pct > 90) { storageBarFill.className = 'storage-bar-fill danger'; } else if (pct > 70) { storageBarFill
        .className = 'storage-bar-fill warning'; } else { storageBarFill.className = 'storage-bar-fill'; }

    const usedMB = (currentIconStorageSize / (1024 * 1024)).toFixed(1);
    storageBarText.textContent = `${usedMB}MB / ${iconStorageLimitMB}MB`;
}

// ─── Check and auto-clean ────────────────────────────────────────
async function checkAndCleanStorage() {
    const limitBytes = iconStorageLimitMB * 1024 * 1024;
    if (currentIconStorageSize >= limitBytes) {
        await caches.delete('ff-icons');
        currentIconStorageSize = 0;
        pendingSizeAdd = 0;
        clearStorageInfo();
        renderStorageBar();
        showToast("Auto cleaned icon storage");
    }
}

// ─── UI event bindings ────────────────────────────────────────────
iconLimitInput.addEventListener('input', function() {
    if (this.value.length > 4) this.value = this.value.slice(0, 4);
    const val = parseFloat(this.value);
    if (!isNaN(val) && val !== iconStorageLimitMB) {
        iconLimitTick.disabled = false;
    } else {
        iconLimitTick.disabled = true;
    }
});

iconLimitInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !iconLimitTick.disabled) {
        iconLimitTick.click();
    }
});

iconLimitTick.addEventListener('click', () => {
    let val = parseFloat(iconLimitInput.value);
    if (isNaN(val) || val < 0) val = 15;
    iconStorageLimitMB = val;
    localStorage.setItem('iconLimitMB', iconStorageLimitMB);
    iconLimitInput.value = val;
    iconLimitTick.disabled = true;
    renderStorageBar();
    checkAndCleanStorage();
    showToast(`Icon storage limit set to ${iconStorageLimitMB}MB`);
});

cleanStorageBtn.addEventListener('click', async () => {
    await caches.delete('ff-icons');
    currentIconStorageSize = 0;
    pendingSizeAdd = 0;
    clearStorageInfo();
    renderStorageBar();
    showToast("Cleaned icon storage");
});

// ─── Hook: add image size to pending batch ──────────────────────
function recordImageSize(bytes) {
    pendingSizeAdd += bytes;
    scheduleStorageFlush();
}

// --------------------------------------------------------------
//  INDEXEDDB HELPER
// --------------------------------------------------------------
const DB_NAME = 'FF_Catalog_Storage';
const DB_STORE = 'database_cache';

function openIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getLocalCache() {
    try {
        const db = await openIDB();
        return new Promise((resolve) => {
            const tx = db.transaction(DB_STORE, 'readonly');
            const store = tx.objectStore(DB_STORE);
            const req = store.get('cached_db');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

async function saveLocalCache(rawData) {
    try {
        const db = await openIDB();
        return new Promise((resolve) => {
            const tx = db.transaction(DB_STORE, 'readwrite');
            const store = tx.objectStore(DB_STORE);
            store.put({
                rawData: rawData,
                timestamp: Date.now()
            }, 'cached_db');
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (e) {
        console.error("IDB save error:", e);
    }
}

// --------------------------------------------------------------
//  ROBUST IMAGE LOADER: timeout + retry + cache invalidation
// --------------------------------------------------------------
async function loadImageWithRetry(url) {
    const CACHE_TIMEOUT = 2000;
    const RETRY_DELAY = 500;

    async function attemptCache() {
        try {
            const cache = await caches.open('ff-icons');
            const response = await cache.match(url);
            if (!response) return null;
            const blob = await response.blob();
            if (blob && blob.size > 0) return blob;
            return null;
        } catch (_) {
            return null;
        }
    }

    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
    }

    async function loadFromNetworkAndCache() {
        const cache = await caches.open('ff-icons');
        await cache.delete(url);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network fetch failed: ${response.status}`);
        cache.put(url, response.clone());
        const blob = await response.blob();
        if (!blob || blob.size === 0) throw new Error('Empty blob from network');
        return blob;
    }

    try {
        let blob = await withTimeout(attemptCache(), CACHE_TIMEOUT);
        if (blob) return blob;

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        blob = await withTimeout(attemptCache(), CACHE_TIMEOUT);
        if (blob) return blob;

        return await loadFromNetworkAndCache();
    } catch (err) {
        throw err;
    }
}

// --------------------------------------------------------------
//  MEMORY EFFICIENT LAZY LOADER (with debounced storage updates)
// --------------------------------------------------------------
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(async entry => {
        const img = entry.target;
        if (entry.isIntersecting) {
            if (!img.dataset.loading && !img.getAttribute('src')) {
                img.dataset.loading = "true";
                try {
                    const url = img.dataset.src;
                    const blob = await loadImageWithRetry(url);
                    const objectUrl = URL.createObjectURL(blob);
                    img.src = objectUrl;
                    img.dataset.objectUrl = objectUrl;
                    img.classList.add('loaded');

                    // Use debounced storage update
                    recordImageSize(blob.size);

                    // Check limit after scheduling the flush
                    if (currentIconStorageSize + pendingSizeAdd > (iconStorageLimitMB * 1024 * 1024)) {
                        // Flush immediately before checking so the bar reflects the new total
                        flushStorageUpdate();
                        checkAndCleanStorage();
                    }
                } catch (e) {
                    console.warn('Failed to load image:', img.dataset.src, e);
                    img.src = CONFIG.FALLBACK_IMAGE_URL;
                    img.classList.add('loaded');
                } finally {
                    img.dataset.loading = "false";
                }
            }
        } else {
            if (img.dataset.objectUrl) {
                URL.revokeObjectURL(img.dataset.objectUrl);
                img.removeAttribute('src');
                img.classList.remove('loaded');
                delete img.dataset.objectUrl;
                delete img.dataset.loading;
            }
        }
    });
}, { rootMargin: '400px' });

// --------------------------------------------------------------
//  ANIMATION PAUSE OBSERVER (off-screen card animations)
// --------------------------------------------------------------
let animationObserver = null;

function initAnimationObserver() {
    if (animationObserver) {
        animationObserver.disconnect();
    }
    animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const imgContainer = entry.target.querySelector('.img-container');
            if (!imgContainer) return;
            if (entry.isIntersecting) {
                imgContainer.classList.remove('paused');
            } else {
                imgContainer.classList.add('paused');
            }
        });
    }, { rootMargin: '500px' });
}
initAnimationObserver();

// --------------------------------------------------------------
//  WEB WORKER FOR DATABASE PARSING
// --------------------------------------------------------------
let dbWorker = null;
let dbWorkerProgressHandler = null;

function initWorker() {
    if (window.Worker) {
        try {
            dbWorker = new Worker('db-worker.js');
            dbWorker.onerror = (e) => {
                console.error('Worker error:', e);
            };
            return true;
        } catch (e) {
            console.warn('Failed to create Web Worker, falling back to main-thread parsing.', e);
            return false;
        }
    }
    return false;
}

function parseDatabaseWithWorker(url, nocache = false) {
    return new Promise((resolve, reject) => {
        if (!dbWorker) {
            reject(new Error('Worker not available'));
            return;
        }
        if (dbWorkerProgressHandler) {
            dbWorker.removeEventListener('message', dbWorkerProgressHandler);
            dbWorkerProgressHandler = null;
        }
        const handler = (e) => {
            const { type, rawData, items, updatedOn, message } = e.data;
            if (type === 'success') {
                dbWorker.removeEventListener('message', handler);
                resolve({ rawData, items, updatedOn });
            } else if (type === 'error') {
                dbWorker.removeEventListener('message', handler);
                reject(new Error(message || 'Worker error'));
            }
        };
        dbWorker.addEventListener('message', handler);
        dbWorker.postMessage({ type: 'load', url, nocache });
    });
}

// --------------------------------------------------------------
//  HELPER TO REBUILD THE ID MAP
// --------------------------------------------------------------
function rebuildItemsMap() {
    itemsById = new Map();
    for (const item of allItems) {
        if (item && item.itemID !== undefined) {
            itemsById.set(String(item.itemID), item);
        }
    }
}

// --------------------------------------------------------------
//  DATABASE SYNC & PARSING LOGIC
// --------------------------------------------------------------
function parseAndSetDatabase(uint8Array) {
    try {
        const decoded = MessagePack.decode(uint8Array);
        if (Array.isArray(decoded)) {
            if (decoded.length > 0 && typeof decoded[0] === 'object' && decoded[0] !== null && (decoded[0]
                    .updated_on || decoded[0].version || decoded[0]._metadata)) {
                rawDbUpdatedOnText = decoded[0].updated_on || decoded[0].version || "Unknown";
                allItems = decoded.slice(1);
            } else {
                allItems = decoded;
                rawDbUpdatedOnText = "Unknown";
            }
        } else if (typeof decoded === 'object' && decoded !== null) {
            allItems = decoded.items || decoded.data || [];
            rawDbUpdatedOnText = decoded.updated_on || "Unknown";
        } else {
            allItems = [];
            rawDbUpdatedOnText = "Unknown";
        }

        rebuildItemsMap();

        dbUpdatedOnText = formatDatabaseDate(rawDbUpdatedOnText);
        document.getElementById('dbVersionUI').textContent = rawDbUpdatedOnText;

        applyFilters();
        return true;
    } catch (err) {
        console.error("Parsing Msgpack error:", err);
        return false;
    }
}

async function initDatabase(forceSync = false) {
    grid.innerHTML = '';
    paginationContainer.style.display = 'none';
    infiniteSentinelEl.style.display = 'none';
    loadingOverlay.classList.add('active');

    reqDataBtns.forEach(b => b.disabled = true);
    document.getElementById('syncIconNormal').style.display = 'none';
    document.getElementById('syncIconSpinner').style.display = 'block';
    document.getElementById('dlDbNormal').style.display = 'none';
    document.getElementById('dlDbSpinner').style.display = 'block';

    const cache = await getLocalCache();
    const now = Date.now();
    const isFresh = cache && cache.timestamp && (now - cache.timestamp < ONE_DAY_MS);
    const oldVersion = rawDbUpdatedOnText;

    if (!forceSync && isFresh && cache.rawData) {
        loadingText.textContent = 'Loading data...';
        parseAndSetDatabase(cache.rawData);
        loadingOverlay.classList.remove('active');
        restoreButtons();

        if (!initialLoadDone) {
            initialLoadDone = true;
            showCreditToastIfNeeded();
            if (isFirstVisit) {
                localStorage.setItem('ff_visited', 'true');
                setTimeout(() => showWhatsNew(), 1200);
            }
        }

        syncModalsFromUrl();
        return;
    }

    const useWorker = dbWorker !== null;
    loadingText.textContent = 'Getting latest database...';

    let progressListener = null;
    if (useWorker) {
        progressListener = (e) => {
            const { type, stage } = e.data;
            if (type === 'progress') {
                switch (stage) {
                    case 'fetching': loadingText.textContent = 'Getting latest database...'; break;
                    case 'decompressing': loadingText.textContent = 'Extracting data...'; break;
                    case 'parsing': loadingText.textContent = 'Parsing data...'; break;
                    default: break;
                }
            }
        };
        dbWorker.addEventListener('message', progressListener);
    }

    try {
        let rawData = null;
        let items = null;
        let updatedOn = null;

        if (useWorker) {
            const result = await parseDatabaseWithWorker(CONFIG.DATABASE_URL, true);
            rawData = result.rawData;
            items = result.items;
            updatedOn = result.updatedOn;
        } else {
            loadingText.textContent = 'Getting latest database...';
            const dbUrl = CONFIG.DATABASE_URL + '?nocache=' + Date.now();
            const response = await fetch(dbUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            loadingText.textContent = 'Extracting data...';
            const ds = new DecompressionStream('gzip');
            const decompressed = response.body.pipeThrough(ds);
            const arrayBuffer = await new Response(decompressed).arrayBuffer();
            rawData = new Uint8Array(arrayBuffer);

            loadingText.textContent = 'Loading data...';
            const decoded = MessagePack.decode(rawData);
            if (Array.isArray(decoded)) {
                if (decoded.length > 0 && typeof decoded[0] === 'object' && decoded[0] !== null && (decoded[0].updated_on || decoded[0].version || decoded[0]._metadata)) {
                    updatedOn = decoded[0].updated_on || decoded[0].version || "Unknown";
                    items = decoded.slice(1);
                } else {
                    items = decoded;
                    updatedOn = "Unknown";
                }
            } else if (typeof decoded === 'object' && decoded !== null) {
                items = decoded.items || decoded.data || [];
                updatedOn = decoded.updated_on || "Unknown";
            } else {
                items = [];
                updatedOn = "Unknown";
            }
        }

        if (!items || !rawData) throw new Error('Failed to get data');

        loadingText.textContent = 'Loading data...';
        rawDbUpdatedOnText = updatedOn || "Unknown";
        allItems = items;
        rebuildItemsMap();
        dbUpdatedOnText = formatDatabaseDate(rawDbUpdatedOnText);
        document.getElementById('dbVersionUI').textContent = rawDbUpdatedOnText;

        await saveLocalCache(rawData);

        if (forceSync) {
            if (oldVersion !== "Unknown" && oldVersion === rawDbUpdatedOnText) {
                showToast("Latest database is same as before");
            } else {
                showToast(`Database updated to version: ${rawDbUpdatedOnText}`);
            }
        }

        if (!initialLoadDone && !forceSync) {
            initialLoadDone = true;
            showCreditToastIfNeeded();
            if (isFirstVisit) {
                localStorage.setItem('ff_visited', 'true');
                setTimeout(() => showWhatsNew(), 1200);
            }
        }

        applyFilters();
    } catch (err) {
        console.warn("Failed to fetch fresh database:", err);
        if (forceSync) showToast("Database offline");
        if (cache && cache.rawData) {
            parseAndSetDatabase(cache.rawData);
        } else {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:#ff4c4c;">⚠️ Failed to load database. Please check connection.</p>';
        }
    } finally {
        if (useWorker && progressListener) {
            dbWorker.removeEventListener('message', progressListener);
        }
        loadingOverlay.classList.remove('active');
        restoreButtons();
        applyDisplayMode();
        syncModalsFromUrl();
    }
}

function restoreButtons() {
    reqDataBtns.forEach(b => b.disabled = false);
    document.getElementById('syncIconSpinner').style.display = 'none';
    document.getElementById('syncIconNormal').style.display = 'block';
    document.getElementById('dlDbSpinner').style.display = 'none';
    document.getElementById('dlDbNormal').style.display = 'block';
}

// --------------------------------------------------------------
//  FILTER & SEARCH LOGIC
// --------------------------------------------------------------
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const tag = tagFilter.value;
    const type = typeFilter.value;
    const rare = rareFilter.value;

    const rName = rangeName.checked;
    const rID = rangeID.checked;
    const rDesc = rangeDesc.checked;
    const rIcon = rangeIcon.checked;

    // Start with all items, but if favorites filter is active, use only favorited items
    let sourceItems = allItems;
    if (favFilterActive) {
        const favIds = getFavorites().map(f => f.id);
        sourceItems = allItems.filter(item => favIds.includes(String(item.itemID)));
        // Sort by favorite order (newest first) - we'll re-sort after filtering
    }

    filteredItems = sourceItems.filter(item => {
        let matchQuery = false;
        if (!query) {
            matchQuery = true;
        } else {
            if (rName && item.name && item.name.toLowerCase().includes(query)) matchQuery = true;
            if (rID && item.itemID && String(item.itemID).includes(query)) matchQuery = true;
            if (rDesc && item.description && item.description.toLowerCase().includes(query)) matchQuery = true;
            if (rIcon && item.icon && item.icon.toLowerCase().includes(query)) matchQuery = true;
        }
        const matchTag = !tag || item.tag === tag;
        const matchType = !type || item.type === type;
        const matchRare = !rare || item.Rare === rare;
        return matchQuery && matchTag && matchType && matchRare;
    });

    // If in favorites mode, sort by timestamp descending (newest first)
    if (favFilterActive) {
        const favs = getFavorites();
        const orderMap = {};
        favs.forEach((f, idx) => { orderMap[f.id] = idx; });
        filteredItems.sort((a, b) => {
            const idxA = orderMap[String(a.itemID)] ?? Infinity;
            const idxB = orderMap[String(b.itemID)] ?? Infinity;
            return idxA - idxB;
        });
    }

    totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    if (totalPages === 0) totalPages = 1;

    infiniteRenderedCount = 0;
    infiniteAllLoaded = false;
    isInfiniteLoading = false;
    if (infiniteObserver) {
        infiniteObserver.disconnect();
        infiniteObserver = null;
    }

    currentPage = 1;
    totalPagesUI.textContent = totalPages;

    renderItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update UI after filter
    updateFavUI();
}

function updateSearchHint() {
    const arr = [];
    if (rangeName.checked) arr.push('Name');
    if (rangeID.checked) arr.push('ID');
    if (rangeDesc.checked) arr.push('Desc');
    if (rangeIcon.checked) arr.push('Icon');
    searchInput.placeholder = arr.length > 0 ? `Search by ${arr.join(', ')}...` : 'Search disabled (check boxes)';
    applyFilters();
}

// --------------------------------------------------------------
//  RENDER ITEMS (unified entry point)
// --------------------------------------------------------------
function renderItems() {
    if (displayMode === 'multi') {
        renderPage();
    } else {
        renderInfinite();
    }
}

// --------------------------------------------------------------
//  MULTI-PAGE RENDER
// --------------------------------------------------------------
function renderPage() {
    if (infiniteObserver) {
        infiniteObserver.disconnect();
        infiniteObserver = null;
    }
    infiniteSentinelEl.style.display = 'none';

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, filteredItems.length);
    const pageItems = filteredItems.slice(start, end);

    if (animationObserver) {
        animationObserver.disconnect();
    }
    imageObserver.disconnect();
    grid.innerHTML = '';

    if (pageItems.length === 0) {
        if (favFilterActive && getFavorites().length === 0) {
            grid.innerHTML = `
                <div class="fav-empty-state">
                    <span class="big-icon">☆</span>   <!-- Unfilled star -->
                    <h3>No favorites yet</h3>
                    <p>Click the <strong>☆</strong> star on any item card to add it to your favorites collection.</p>
                    <div style="display: flex; justify-content: center;">
                        <button id="favEmptyImportBtn" class="action-btn-small">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 9h-4v7H9v-7H5l7-7 7 7zM5 18v2h14v-2H5z"/></svg>
                            Import Favorites
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('favEmptyImportBtn')?.addEventListener('click', triggerFavImport);
        } else {
            grid.innerHTML = `
                <div class="empty-search-state">
                    <span class="empty-icon">❓</span>
                    <h3>No items found</h3>
                    <p>Try adjusting your search or filters.</p>
                </div>
            `;
        }
        paginationContainer.style.display = 'none';
        return;
    }

    const frag = buildItemCards(pageItems);
    grid.appendChild(frag);
    paginationContainer.style.display = 'flex';
    updatePaginationUI();
    applyDisplayMode();

    initAnimationObserver();
    document.querySelectorAll('.card').forEach(card => animationObserver.observe(card));
}

// --------------------------------------------------------------
//  INFINITE SCROLL RENDER
// --------------------------------------------------------------
function renderInfinite() {
    paginationContainer.style.display = 'none';
    infiniteSentinelEl.style.display = 'block';

    if (infiniteObserver) {
        infiniteObserver.disconnect();
        infiniteObserver = null;
    }

    infiniteRenderedCount = 0;
    infiniteAllLoaded = false;
    isInfiniteLoading = false;

    if (animationObserver) {
        animationObserver.disconnect();
    }
    imageObserver.disconnect();
    grid.innerHTML = '';

    if (filteredItems.length === 0) {
        if (favFilterActive && getFavorites().length === 0) {
            grid.innerHTML = `
                <div class="fav-empty-state">
                    <span class="big-icon">☆</span>
                    <h3>No favorites yet</h3>
                    <p>Click the <strong>☆</strong> star on any item card to add it to your favorites collection.</p>
                    <div style="display: flex; justify-content: center;">
                        <button id="favEmptyImportBtn" class="action-btn-small">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 9h-4v7H9v-7H5l7-7 7 7zM5 18v2h14v-2H5z"/></svg>
                            Import Favorites
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('favEmptyImportBtn')?.addEventListener('click', triggerFavImport);
        } else {
            grid.innerHTML = `
                <div class="empty-search-state">
                    <span class="empty-icon">❓</span>
                    <h3>No items found</h3>
                    <p>Try adjusting your search or filters.</p>
                </div>
            `;
        }
        infiniteSentinelEl.style.display = 'none';
        return;
    }

    loadInfiniteBatch();
    setupInfiniteObserver();
}

function loadInfiniteBatch() {
    if (isInfiniteLoading) return;
    if (infiniteAllLoaded) return;
    if (infiniteRenderedCount >= filteredItems.length) {
        infiniteAllLoaded = true;
        updateSentinelState();
        return;
    }

    isInfiniteLoading = true;
    updateSentinelState(true);

    const start = infiniteRenderedCount;
    const end = Math.min(start + INFINITE_BATCH, filteredItems.length);
    const batch = filteredItems.slice(start, end);

    const frag = buildItemCards(batch);
    grid.appendChild(frag);

    infiniteRenderedCount = end;

    if (infiniteRenderedCount >= filteredItems.length) {
        infiniteAllLoaded = true;
        updateSentinelState(false, true);
    } else {
        updateSentinelState(false);
    }

    isInfiniteLoading = false;
}

function buildItemCards(items) {
    const frag = document.createDocumentFragment();
    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${Math.min(index * 0.015, 0.3)}s`;

        const imgContainer = document.createElement('div');
        imgContainer.className = 'img-container';

        const img = document.createElement('img');
        img.dataset.src = CONFIG.CDN_BASE_URL + item.itemID + '.png';
        img.alt = item.name || 'Unnamed';

        imageObserver.observe(img);
        imgContainer.appendChild(img);

        // STAR BUTTON (top-right, pure star)
        const starBtn = document.createElement('button');
        starBtn.className = 'star-btn';
        starBtn.dataset.id = String(item.itemID);
        const favorited = isFavorited(item.itemID);
        starBtn.innerHTML = favorited ? '★' : '☆';
        starBtn.classList.toggle('favorited', favorited);
        starBtn.setAttribute('aria-label', 'Toggle favorite');
        starBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item.itemID);
            // Update this star and the modal star if open
            const modalStar = document.getElementById('modalStarBtn');
            if (modalStar && modalStar.dataset.id === String(item.itemID)) {
                const fav = isFavorited(item.itemID);
                modalStar.innerHTML = fav ? '★' : '☆';
                modalStar.classList.toggle('favorited', fav);
            }
        });
        imgContainer.appendChild(starBtn);

        const copyTick = document.createElement('div');
        copyTick.className = 'copy-tick';
        copyTick.id = `tick-${item.itemID}`;
        copyTick.textContent = '✓';

        const h3 = document.createElement('h3');
        h3.textContent = item.name || 'Unnamed';

        const small = document.createElement('small');
        let displayType = item.type || '';
        if (displayType.toLowerCase().endsWith('s')) displayType = displayType.slice(0, -1);
        small.textContent = displayType;

        card.appendChild(imgContainer);
        card.appendChild(copyTick);
        card.appendChild(h3);
        card.appendChild(small);

        card.addEventListener('click', () => handleItemClick(item));
        frag.appendChild(card);

        if (animationObserver) {
            animationObserver.observe(card);
        }
    });
    return frag;
}

function setupInfiniteObserver() {
    if (infiniteObserver) {
        infiniteObserver.disconnect();
    }
    infiniteObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isInfiniteLoading && !infiniteAllLoaded) {
            loadInfiniteBatch();
        }
    }, { rootMargin: '200px' });

    if (infiniteSentinelEl) {
        infiniteObserver.observe(infiniteSentinelEl);
    }
}

function updateSentinelState(loading = false, done = false) {
    if (!infiniteSentinelEl) return;
    if (done) {
        infiniteSentinelEl.className = 'infinite-sentinel done';
        infiniteSentinelEl.innerHTML = '✨ All items loaded';
        return;
    }
    if (loading) {
        infiniteSentinelEl.className = 'infinite-sentinel';
        infiniteSentinelEl.innerHTML = '<span class="spinner-small"></span> Loading more...';
        return;
    }
    if (infiniteAllLoaded) {
        infiniteSentinelEl.className = 'infinite-sentinel done';
        infiniteSentinelEl.innerHTML = '✨ All items loaded';
        return;
    }
    infiniteSentinelEl.className = 'infinite-sentinel';
    infiniteSentinelEl.innerHTML = '<span class="spinner-small"></span> Scroll for more';
}

// --------------------------------------------------------------
//  PAGINATION UI
// --------------------------------------------------------------
function updatePaginationUI() {
    pageNumbersEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => goToPage(i));
        pageNumbersEl.appendChild(btn);
    }
}

function goToPage(pageNum) {
    if (pageNum < 1 || pageNum > totalPages) return;
    if (pageNum !== currentPage) {
        currentPage = pageNum;
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const activeBtn = pageNumbersEl.children[pageNum - 1];
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
}

document.getElementById('btnPrev').addEventListener('click', () => {
    pageNumbersEl.scrollBy({ left: -pageNumbersEl.clientWidth + 20, behavior: 'smooth' });
});
document.getElementById('btnNext').addEventListener('click', () => {
    pageNumbersEl.scrollBy({ left: pageNumbersEl.clientWidth - 20, behavior: 'smooth' });
});

let isDown = false,
    startX, scrollLeft;
pageNumbersEl.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - pageNumbersEl.offsetLeft;
    scrollLeft = pageNumbersEl.scrollLeft;
});
pageNumbersEl.addEventListener('mouseleave', () => isDown = false);
pageNumbersEl.addEventListener('mouseup', () => isDown = false);
pageNumbersEl.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - pageNumbersEl.offsetLeft;
    const walk = (x - startX) * 2;
    pageNumbersEl.scrollLeft = scrollLeft - walk;
});
pageNumbersEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    pageNumbersEl.scrollBy({ left: e.deltaY > 0 ? 60 : -60, behavior: 'auto' });
});

searchPageBtn.addEventListener('click', () => {
    searchPageBtn.style.display = 'none';
    jumpInput.style.display = 'inline-block';
    jumpInput.value = currentPage;
    jumpInput.focus();
});

jumpInput.addEventListener('blur', () => {
    jumpInput.style.display = 'none';
    searchPageBtn.style.display = 'inline-flex';
});

jumpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let val = parseInt(jumpInput.value, 10);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            goToPage(val);
        }
        jumpInput.blur();
    }
});

// --------------------------------------------------------------
//  FAVORITES IMPORT / EXPORT / CLEAR
// --------------------------------------------------------------
function triggerFavImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (Array.isArray(data)) {
                    if (data.length > 0 && confirm(`Import ${data.length} favorites? This will replace your current list.`)) {
                        saveFavorites(data);
                    } else if (data.length === 0) {
                        saveFavorites([]);
                    } else {
                        return; // cancelled
                    }
                    updateFavUI();
                    applyFilters();
                    showToast(`Imported ${data.length} favorites!`);
                } else {
                    showToast('Invalid JSON format.');
                }
            } catch (err) {
                showToast('Failed to parse file.');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

document.getElementById('favImportBtn').addEventListener('click', triggerFavImport);

document.getElementById('favExportBtn').addEventListener('click', () => {
    const favs = getFavorites();
    if (favs.length === 0) {
        showToast('No favorites to export.');
        return;
    }
    const data = JSON.stringify(favs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ff_favorites_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Favorites exported!');
});

document.getElementById('favClearBtn').addEventListener('click', () => {
    if (getFavorites().length === 0) {
        showToast('No favorites to clear.');
        return;
    }
    if (confirm('Remove all favorites?')) {
        saveFavorites([]);
        updateFavUI();
        applyFilters();
        showToast('Favorites cleared.');
    }
});

// --------------------------------------------------------------
//  FAVORITES TOGGLE IN FILTER ROW
// --------------------------------------------------------------
document.getElementById('favToggle').addEventListener('click', function() {
    favFilterActive = !favFilterActive;
    saveFavState();
    updateFavUI();
    applyFilters();
});

// --------------------------------------------------------------
//  STARTUP INITIALIZATION
// --------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
    // Load favorites filter state
    loadFavState();

    if (pendingUpdateToast) {
        sessionStorage.removeItem('webapp_updated');
        setTimeout(() => {
            const versionMsg = WEBAPP_VERSION !== 'Unknown' ? WEBAPP_VERSION : 'latest';
            showToast(`Updated to WebApp version: ${versionMsg}`);
            showWhatsNew();
        }, 1000);
        pendingUpdateToast = false;
    }

    loadSettings();
    initStorageTracking();
    const workerSupported = initWorker();
    if (!workerSupported) {
        console.warn('Web Worker not available, falling back to main-thread parsing.');
    }
    initDatabase();

    loadAuthorImageWithCache();

    searchInput.addEventListener('input', applyFilters);
    tagFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    rareFilter.addEventListener('change', applyFilters);

    // Initial favorites UI update after database loads
    // Will be called after applyFilters in initDatabase
});

// Override updateFavUI to be called after initial load
// We'll also call it after database loads
const origInitDatabase = initDatabase;
initDatabase = async function(forceSync) {
    await origInitDatabase(forceSync);
    updateFavUI();
};
