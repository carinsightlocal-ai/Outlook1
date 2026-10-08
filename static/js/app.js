// ==========================================================================
// Animated Temp Outlook - OTP Fetcher Pro (Core Logic System)
// ==========================================================================

// Global Application State
let currentUserEmail = localStorage.getItem('temp_outlook_master_email') || null;
let currentUserApiKey = localStorage.getItem('temp_outlook_api_key') || null;
let currentAccount = null;
let allAccounts = [];
let filteredAccounts = [];
let selectedAccountIds = new Set();
let currentEmails = [];
let ws = null;
let countdown = 10;
let countdownTimer = null;
let latestOtp = null;
let sortAscending = true;
let filterOnlyOtps = false;
let isApiKeyVisible = false;
let soundEnabled = localStorage.getItem('temp_outlook_sound') !== 'false';

// DOM Elements Cache
const userProfileBtn = document.getElementById('userProfileBtn');
const userEmailBadge = document.getElementById('userEmailBadge');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidePanel = document.getElementById('sidePanel');
const sideBackdrop = document.getElementById('sideBackdrop');
const sideAccountsList = document.getElementById('sideAccountsList');
const sideAccountsCount = document.getElementById('sideAccountsCount');
const sideSearchInput = document.getElementById('sideSearchInput');
const btnSortAZ = document.getElementById('btnSortAZ');
const btnCloseSidebarMobile = document.getElementById('btnCloseSidebarMobile');

// Hero elements
const emailDisplay = document.getElementById('emailDisplay');
const heroPasswordDisplay = document.getElementById('heroPasswordDisplay');
const heroRecoveryWrapper = document.getElementById('heroRecoveryWrapper');
const heroRecoveryDisplay = document.getElementById('heroRecoveryDisplay');
const btnCopyEmail = document.getElementById('btnCopyEmail');
const btnHeroCopyPass = document.getElementById('btnHeroCopyPass');
const btnHeroCopyAll = document.getElementById('btnHeroCopyAll');
const btnHeroCopyRecMail = document.getElementById('btnHeroCopyRecMail');
const btnHeroCopyRecPass = document.getElementById('btnHeroCopyRecPass');
const btnHeroBulkImport = document.getElementById('btnHeroBulkImport');
const btnHeroAddCustom = document.getElementById('btnHeroAddCustom');
const btnAddCustom = document.getElementById('btnAddCustom');
const btnLaunchChrome = document.getElementById('btnLaunchChrome');
const btnRefresh = document.getElementById('btnRefresh');
const btnClearInbox = document.getElementById('btnClearInbox');
const refreshTimer = document.getElementById('refreshTimer');
const emailList = document.getElementById('emailList');
const inboxEmpty = document.getElementById('inboxEmpty');
const emailCount = document.getElementById('emailCount');
const unreadBadge = document.getElementById('unreadBadge');
const soundToggle = document.getElementById('soundToggle');
const soundIcon = document.getElementById('soundIcon');
const soundText = document.getElementById('soundText');
const toastContainer = document.getElementById('toastContainer');

// Spotlight Elements
const otpSpotlight = document.getElementById('otpSpotlight');
const spotlightCode = document.getElementById('spotlightCode');
const spotlightService = document.getElementById('spotlightService');
const spotlightSender = document.getElementById('spotlightSender');
const btnCopySpotlightOtp = document.getElementById('btnCopySpotlightOtp');

// Live Sync & Chips
const btnSyncNow = document.getElementById('btnSyncNow');
const syncSpinner = document.getElementById('syncSpinner');
const syncBtnText = document.getElementById('syncBtnText');
const btnSyncAllAccounts = document.getElementById('btnSyncAllAccounts');
const btnFilterOtpsOnly = document.getElementById('btnFilterOtpsOnly');
const allOtpsCount = document.getElementById('allOtpsCount');
const liveSyncStatusDot = document.getElementById('liveSyncStatusDot');
const liveSyncStatusText = document.getElementById('liveSyncStatusText');
const liveSyncStatusSub = document.getElementById('liveSyncStatusSub');
const realOtpsSummary = document.getElementById('realOtpsSummary');
const realOtpsChips = document.getElementById('realOtpsChips');

// Bulk Selection Bar
const bulkSelectionBar = document.getElementById('bulkSelectionBar');
const selectedCountText = document.getElementById('selectedCountText');
const btnBulkLaunchChrome = document.getElementById('btnBulkLaunchChrome');
const btnBulkDelete = document.getElementById('btnBulkDelete');
const btnDeselectAll = document.getElementById('btnDeselectAll');

// PIN Auth Modal
const pinAuthModal = document.getElementById('pinAuthModal');
const authEmailInput = document.getElementById('authEmailInput');
const pin1 = document.getElementById('pin1');
const pin2 = document.getElementById('pin2');
const pin3 = document.getElementById('pin3');
const pin4 = document.getElementById('pin4');
const authErrorMsg = document.getElementById('authErrorMsg');
const btnSubmitPinAuth = document.getElementById('btnSubmitPinAuth');

// Bulk Import Modal
const btnOpenBulkModal = document.getElementById('btnOpenBulkModal');
const bulkImportModal = document.getElementById('bulkImportModal');
const bulkInputArea = document.getElementById('bulkInputArea');
const bulkDetectCount = document.getElementById('bulkDetectCount');
const btnClearBulkText = document.getElementById('btnClearBulkText');
const btnCancelBulkModal = document.getElementById('btnCancelBulkModal');
const btnCloseBulkModal = document.getElementById('btnCloseBulkModal');
const btnDoBulkImport = document.getElementById('btnDoBulkImport');

// Email View Modal
const emailModal = document.getElementById('emailModal');
const modalSubject = document.getElementById('modalSubject');
const modalFrom = document.getElementById('modalFrom');
const modalTime = document.getElementById('modalTime');
const modalBody = document.getElementById('modalBody');
const modalOtpSection = document.getElementById('modalOtpSection');
const modalOtpCode = document.getElementById('modalOtpCode');
const btnCopyModalOtp = document.getElementById('btnCopyModalOtp');
const btnCloseModal = document.getElementById('btnCloseModal');

// Single Custom Modal
const customModal = document.getElementById('customModal');
const customEmailInput = document.getElementById('customEmailInput');
const customPasswordInput = document.getElementById('customPasswordInput');
const btnSaveCustomAccount = document.getElementById('btnSaveCustomAccount');
const btnCloseCustomModal = document.getElementById('btnCloseCustomModal');
const btnCancelCustomModal = document.getElementById('btnCancelCustomModal');

// API Key Modal Elements
const btnOpenApiKeyModal = document.getElementById('btnOpenApiKeyModal');
const apiKeyModal = document.getElementById('apiKeyModal');
const btnCloseApiKeyModal = document.getElementById('btnCloseApiKeyModal');
const btnCloseApiKeyBottom = document.getElementById('btnCloseApiKeyBottom');
const apiKeyUserEmailDisplay = document.getElementById('apiKeyUserEmailDisplay');
const apiKeyDisplayInput = document.getElementById('apiKeyDisplayInput');
const btnToggleApiKeyVis = document.getElementById('btnToggleApiKeyVis');
const eyeIcon = document.getElementById('eyeIcon');
const btnCopyApiKey = document.getElementById('btnCopyApiKey');
const btnRegenerateApiKey = document.getElementById('btnRegenerateApiKey');
const apiCodeDisplay = document.getElementById('apiCodeDisplay');
const btnCopyApiCode = document.getElementById('btnCopyApiCode');

// Bulk FB Checker Elements
const btnOpenFbChecker = document.getElementById('btnOpenFbChecker');
const fbCheckerModal = document.getElementById('fbCheckerModal');
const btnCloseFbChecker = document.getElementById('btnCloseFbChecker');
const btnCloseFbCheckerBottom = document.getElementById('btnCloseFbCheckerBottom');
const fbBulkInputArea = document.getElementById('fbBulkInputArea');
const fbInputCountBadge = document.getElementById('fbInputCountBadge');
const btnLoadCurrentToFb = document.getElementById('btnLoadCurrentToFb');
const btnClearFbInput = document.getElementById('btnClearFbInput');
const btnStartFbCheck = document.getElementById('btnStartFbCheck');
const btnStopFbCheck = document.getElementById('btnStopFbCheck');
const fbStartIcon = document.getElementById('fbStartIcon');
const fbStartText = document.getElementById('fbStartText');
const fbProgressBar = document.getElementById('fbProgressBar');
const fbStatTotal = document.getElementById('fbStatTotal');
const fbStatChecked = document.getElementById('fbStatChecked');
const fbStatWithout = document.getElementById('fbStatWithout');
const fbStatWith = document.getElementById('fbStatWith');
const fbColWithoutCount = document.getElementById('fbColWithoutCount');
const fbColWithCount = document.getElementById('fbColWithCount');
const listWithoutFb = document.getElementById('listWithoutFb');
const listWithFb = document.getElementById('listWithFb');
const searchWithoutFb = document.getElementById('searchWithoutFb');
const searchWithFb = document.getElementById('searchWithFb');
const btnDownloadWithoutFb = document.getElementById('btnDownloadWithoutFb');
const btnCopyWithoutFb = document.getElementById('btnCopyWithoutFb');
const btnDownloadWithFb = document.getElementById('btnDownloadWithFb');
const btnCopyWithFb = document.getElementById('btnCopyWithFb');

// ================= Audio Chime Synthesizer =================
function playDigitalChime() {
    if (!soundEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;
        
        // High harmonic bell tones
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now);
        osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.25); // A6

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
    } catch (e) {
        console.warn('Audio chime notice:', e);
    }
}

// ================= Toast Notification System =================
function showToast(message, type = 'info', icon = 'ℹ️') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span style="font-size: 16px;">${icon}</span>
        <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 3200);
}

// ================= Clipboard Utility =================
async function copyToClipboard(text, successMsg = 'Copied to clipboard!', elem = null) {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMsg, 'success', '📋');
        playDigitalChime();
        if (elem) {
            const originalText = elem.innerHTML;
            elem.innerHTML = `<span>✓</span> Copied!`;
            setTimeout(() => { elem.innerHTML = originalText; }, 1600);
        }
    } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(successMsg, 'success', '📋');
        playDigitalChime();
    }
}

// ================= Authentication & User Profile =================
function initUserProfile() {
    if (currentUserEmail) {
        userEmailBadge.textContent = currentUserEmail;
        userProfileBtn.title = `Current profile: ${currentUserEmail} (Click to switch)`;
        loadUserAccounts();
        loadUserApiKey();
    } else {
        openPinModal();
    }
}

function openPinModal() {
    pinAuthModal.classList.add('active');
    authEmailInput.value = currentUserEmail || '';
    pin1.value = ''; pin2.value = ''; pin3.value = ''; pin4.value = '';
    authErrorMsg.style.display = 'none';
    setTimeout(() => {
        if (!authEmailInput.value) {
            authEmailInput.focus();
        } else {
            pin1.focus();
        }
    }, 150);
}

function closePinModal() {
    pinAuthModal.classList.remove('active');
}

// PIN Digit Jump Setup
[pin1, pin2, pin3, pin4].forEach((input, idx, arr) => {
    input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && idx < arr.length - 1) {
            arr[idx + 1].focus();
        }
        if (idx === arr.length - 1 && e.target.value.length === 1) {
            submitPinAuth();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && idx > 0) {
            arr[idx - 1].focus();
        } else if (e.key === 'Enter') {
            submitPinAuth();
        }
    });
});

async function submitPinAuth() {
    const email = authEmailInput.value.trim().toLowerCase();
    const pin = `${pin1.value}${pin2.value}${pin3.value}${pin4.value}`.trim();

    if (!email || !email.includes('@')) {
        authErrorMsg.textContent = 'Please enter a valid Master Email address.';
        authErrorMsg.style.display = 'block';
        authEmailInput.focus();
        return;
    }

    if (pin.length !== 4 || isNaN(pin)) {
        authErrorMsg.textContent = 'PIN must be exactly 4 numeric digits.';
        authErrorMsg.style.display = 'block';
        pin1.focus();
        return;
    }

    btnSubmitPinAuth.disabled = true;
    btnSubmitPinAuth.innerHTML = '<span>⏳</span> Verifying PIN...';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });

        const data = await res.json();
        if (res.ok) {
            currentUserEmail = data.user.email;
            currentUserApiKey = data.user.api_key;
            localStorage.setItem('temp_outlook_master_email', currentUserEmail);
            if (currentUserApiKey) {
                localStorage.setItem('temp_outlook_api_key', currentUserApiKey);
            }
            userEmailBadge.textContent = currentUserEmail;
            closePinModal();
            showToast(data.message || 'Profile unlocked successfully!', 'success', '🔓');
            loadUserAccounts();
            loadUserApiKey();
        } else {
            authErrorMsg.textContent = data.detail || 'Incorrect PIN or authentication error.';
            authErrorMsg.style.display = 'block';
            pin1.value = ''; pin2.value = ''; pin3.value = ''; pin4.value = '';
            pin1.focus();
        }
    } catch (err) {
        authErrorMsg.textContent = 'Server connection error. Please retry.';
        authErrorMsg.style.display = 'block';
    } finally {
        btnSubmitPinAuth.disabled = false;
        btnSubmitPinAuth.innerHTML = '🔓 Unlock & Access Accounts';
    }
}

btnSubmitPinAuth.addEventListener('click', submitPinAuth);
userProfileBtn.addEventListener('click', openPinModal);

// ================= Accounts Management =================
async function loadUserAccounts() {
    if (!currentUserEmail) return;
    try {
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/accounts`);
        if (res.ok) {
            allAccounts = await res.json();
            sideAccountsCount.textContent = allAccounts.length;
            applyAccountFilterAndSort();

            if (allAccounts.length > 0) {
                if (!currentAccount || !allAccounts.some(a => a.id === currentAccount.id)) {
                    selectAccount(allAccounts[0]);
                } else {
                    currentAccount = allAccounts.find(a => a.id === currentAccount.id);
                    renderActiveAccountDetails();
                }
            } else {
                currentAccount = null;
                renderEmptyAccountState();
            }
        }
    } catch (err) {
        console.error('Failed to load accounts:', err);
    }
}

function applyAccountFilterAndSort() {
    const q = (sideSearchInput.value || '').trim().toLowerCase();
    filteredAccounts = allAccounts.filter(a => {
        return (a.email && a.email.toLowerCase().includes(q)) ||
               (a.name && a.name.toLowerCase().includes(q));
    });

    filteredAccounts.sort((a, b) => {
        const emailA = (a.email || '').toLowerCase();
        const emailB = (b.email || '').toLowerCase();
        return sortAscending ? emailA.localeCompare(emailB) : emailB.localeCompare(emailA);
    });

    renderSideAccountsList();
}

function renderSideAccountsList() {
    sideAccountsList.innerHTML = '';
    if (filteredAccounts.length === 0) {
        sideAccountsList.innerHTML = `
            <div style="text-align: center; padding: 24px 10px; color: var(--text-dim); font-size: 13px;">
                <div style="font-size: 24px; margin-bottom: 6px;">🔍</div>
                No Outlook accounts found.<br>Use "Bulk Import" or "Add 1" to get started!
            </div>
        `;
        return;
    }

    filteredAccounts.forEach(acc => {
        const isActive = currentAccount && currentAccount.id === acc.id;
        const isSelected = selectedAccountIds.has(acc.id);
        const item = document.createElement('div');
        item.className = `side-account-item ${isActive ? 'active' : ''}`;
        item.onclick = (e) => {
            if (e.target.closest('.account-checkbox') || e.target.closest('.btn-acc-action')) return;
            selectAccount(acc);
            if (window.innerWidth <= 1024) closeMobileSidebar();
        };

        item.innerHTML = `
            <div class="account-left-wrap">
                <input type="checkbox" class="account-checkbox" data-id="${acc.id}" ${isSelected ? 'checked' : ''}>
                <div class="account-info-text">
                    <div class="account-email-line" title="${acc.email}">${acc.email}</div>
                    <div class="account-meta-line">
                        <span>🔑 ${acc.password ? '••••••••' : 'No Pass'}</span>
                        ${acc.token ? '<span style="color: #38bdf8; font-weight: 700;">• Live API</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="account-quick-actions">
                <button class="btn-acc-action" title="Copy Mail" onclick="copyToClipboard('${acc.email}', 'Email copied!')">📋</button>
                <button class="btn-acc-action" title="Copy Pass" onclick="copyToClipboard('${acc.password || ''}', 'Password copied!')">🔑</button>
                <button class="btn-acc-action" style="color: #fb7185;" title="Delete Account" onclick="deleteSingleAccount('${acc.id}')">🗑️</button>
            </div>
        `;

        const chk = item.querySelector('.account-checkbox');
        chk.addEventListener('change', (e) => {
            if (e.target.checked) selectedAccountIds.add(acc.id);
            else selectedAccountIds.delete(acc.id);
            updateBulkSelectionBar();
        });

        sideAccountsList.appendChild(item);
    });
}

function selectAccount(acc) {
    currentAccount = acc;
    renderSideAccountsList();
    renderActiveAccountDetails();
    loadAccountInbox(acc.id);
    setupWebSocket(acc.id);
}

function renderActiveAccountDetails() {
    if (!currentAccount) {
        renderEmptyAccountState();
        return;
    }

    emailDisplay.textContent = currentAccount.email;
    heroPasswordDisplay.textContent = currentAccount.password || '••••••••';

    if (currentAccount.recovery_email) {
        heroRecoveryWrapper.style.display = 'flex';
        heroRecoveryDisplay.textContent = `${currentAccount.recovery_email} ${currentAccount.recovery_password ? `(${currentAccount.recovery_password})` : ''}`;
    } else {
        heroRecoveryWrapper.style.display = 'none';
    }

    if (currentAccount.token) {
        liveSyncStatusDot.textContent = '🟢';
        liveSyncStatusText.textContent = 'Real Outlook Sync Active';
        liveSyncStatusSub.textContent = '(Direct Microsoft API connected)';
    } else {
        liveSyncStatusDot.textContent = '🟡';
        liveSyncStatusText.textContent = 'IMAP Protocol Active';
        liveSyncStatusSub.textContent = '(Standard Office365 IMAP)';
    }
}

function renderEmptyAccountState() {
    emailDisplay.textContent = 'No Account Selected';
    heroPasswordDisplay.textContent = '••••••••';
    heroRecoveryWrapper.style.display = 'none';
    emailList.innerHTML = '';
    inboxEmpty.style.display = 'flex';
    emailCount.textContent = '0';
    unreadBadge.textContent = '0 unread';
    otpSpotlight.style.display = 'none';
    realOtpsSummary.style.display = 'none';
}

// Side Search & A-Z Sort
sideSearchInput.addEventListener('input', applyAccountFilterAndSort);
btnSortAZ.addEventListener('click', () => {
    sortAscending = !sortAscending;
    btnSortAZ.textContent = sortAscending ? '🔤 A-Z' : '🔤 Z-A';
    applyAccountFilterAndSort();
});

// Mobile Sidebar
sidebarToggleBtn.addEventListener('click', () => {
    sidePanel.classList.add('open');
    sideBackdrop.classList.add('active');
});

function closeMobileSidebar() {
    sidePanel.classList.remove('open');
    sideBackdrop.classList.remove('active');
}

sideBackdrop.addEventListener('click', closeMobileSidebar);
btnCloseSidebarMobile.addEventListener('click', closeMobileSidebar);

// Sound Toggle
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('temp_outlook_sound', soundEnabled);
    updateSoundUI();
    if (soundEnabled) playDigitalChime();
});

function updateSoundUI() {
    if (soundEnabled) {
        soundIcon.textContent = '🔔';
        soundText.textContent = 'Sound ON';
        soundToggle.style.color = 'var(--emerald-light)';
    } else {
        soundIcon.textContent = '🔕';
        soundText.textContent = 'Sound OFF';
        soundToggle.style.color = 'var(--text-dim)';
    }
}
updateSoundUI();

// ================= Copy Actions from Hero Card =================
btnCopyEmail.addEventListener('click', () => {
    if (currentAccount && currentAccount.email) {
        copyToClipboard(currentAccount.email, 'Email address copied!', btnCopyEmail);
    }
});

btnHeroCopyPass.addEventListener('click', () => {
    if (currentAccount && currentAccount.password) {
        copyToClipboard(currentAccount.password, 'Password copied!', btnHeroCopyPass);
    }
});

btnHeroCopyAll.addEventListener('click', () => {
    if (currentAccount && currentAccount.email) {
        const combo = `${currentAccount.email}|${currentAccount.password || ''}`;
        copyToClipboard(combo, 'Email|Password combo copied!', btnHeroCopyAll);
    }
});

btnHeroCopyRecMail.addEventListener('click', () => {
    if (currentAccount && currentAccount.recovery_email) {
        copyToClipboard(currentAccount.recovery_email, 'Recovery Email copied!', btnHeroCopyRecMail);
    }
});

btnHeroCopyRecPass.addEventListener('click', () => {
    if (currentAccount && currentAccount.recovery_password) {
        copyToClipboard(currentAccount.recovery_password, 'Recovery Password copied!', btnHeroCopyRecPass);
    }
});

// ================= Chrome Launchers =================
btnLaunchChrome.addEventListener('click', async () => {
    if (!currentUserEmail || !currentAccount) return;
    try {
        btnLaunchChrome.disabled = true;
        btnLaunchChrome.innerHTML = '<span>⏳</span> Opening Chrome...';
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/accounts/${currentAccount.id}/launch-chrome`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Chrome opened with dedicated profile for ${currentAccount.email}`, 'success', '🚀');
        } else {
            showToast(data.detail || 'Browser launch error', 'error', '⚠️');
        }
    } catch (e) {
        showToast('Failed to launch Chrome browser profile', 'error', '⚠️');
    } finally {
        btnLaunchChrome.disabled = false;
        btnLaunchChrome.innerHTML = '<span>🌐</span> Open in Chrome';
    }
});

// ================= Bulk Selection Actions =================
function updateBulkSelectionBar() {
    const count = selectedAccountIds.size;
    if (count > 0) {
        selectedCountText.textContent = `${count} Account${count > 1 ? 's' : ''} Selected`;
        bulkSelectionBar.classList.add('active');
    } else {
        bulkSelectionBar.classList.remove('active');
    }
}

btnDeselectAll.addEventListener('click', () => {
    selectedAccountIds.clear();
    applyAccountFilterAndSort();
    updateBulkSelectionBar();
});

btnBulkLaunchChrome.addEventListener('click', async () => {
    if (selectedAccountIds.size === 0 || !currentUserEmail) return;
    try {
        btnBulkLaunchChrome.disabled = true;
        btnBulkLaunchChrome.textContent = '⏳ Launching...';
        const res = await fetch('/api/accounts/bulk-launch-chrome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: currentUserEmail,
                account_ids: Array.from(selectedAccountIds)
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Launched ${data.count} Chrome browser profiles!`, 'success', '🚀');
        } else {
            showToast(data.detail || 'Launch error', 'error', '⚠️');
        }
    } catch (e) {
        showToast('Bulk launch failed', 'error', '⚠️');
    } finally {
        btnBulkLaunchChrome.disabled = false;
        btnBulkLaunchChrome.textContent = '🚀 Open Chrome (All Selected)';
    }
});

btnBulkDelete.addEventListener('click', async () => {
    if (selectedAccountIds.size === 0 || !currentUserEmail) return;
    if (!confirm(`Are you sure you want to delete ${selectedAccountIds.size} selected accounts?`)) return;

    try {
        btnBulkDelete.disabled = true;
        const res = await fetch('/api/accounts/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: currentUserEmail,
                account_ids: Array.from(selectedAccountIds)
            })
        });
        if (res.ok) {
            showToast('Accounts deleted successfully', 'success', '🗑️');
            selectedAccountIds.clear();
            updateBulkSelectionBar();
            loadUserAccounts();
        }
    } catch (e) {
        showToast('Bulk delete failed', 'error', '⚠️');
    } finally {
        btnBulkDelete.disabled = false;
    }
});

// ================= Inbox & Live Sync =================
async function loadAccountInbox(accountId, sync = true) {
    if (!currentUserEmail || !accountId) return;
    try {
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/inbox/${accountId}?sync=${sync}`);
        if (res.ok) {
            const data = await res.json();
            currentEmails = data.emails || [];
            renderEmailsList();
            checkAndRenderSpotlightOtp();
            renderRealOtpsChips();
        }
    } catch (e) {
        console.error('Failed to load inbox:', e);
    }
}

function renderEmailsList() {
    emailList.innerHTML = '';
    const displayList = filterOnlyOtps ? currentEmails.filter(e => e.otp_code) : currentEmails;
    
    emailCount.textContent = currentEmails.length;
    const unread = currentEmails.filter(e => !e.is_read).length;
    unreadBadge.textContent = `${unread} unread`;

    if (displayList.length === 0) {
        inboxEmpty.style.display = 'flex';
        return;
    }

    inboxEmpty.style.display = 'none';

    displayList.forEach(em => {
        const li = document.createElement('li');
        li.className = `email-item ${!em.is_read ? 'unread' : ''}`;
        li.onclick = () => openEmailModal(em);

        const timeStr = formatTimestamp(em.timestamp);

        li.innerHTML = `
            <div class="email-item-info">
                <div class="email-top-row">
                    <span class="email-sender">${escapeHtml(em.sender_name || 'Outlook')}</span>
                    ${em.service_tag ? `<span class="email-service-tag">${escapeHtml(em.service_tag)}</span>` : ''}
                </div>
                <div class="email-subject">${escapeHtml(em.subject || '(No Subject)')}</div>
                <div class="email-preview-snippet">${escapeHtml(em.body_text || '')}</div>
            </div>
            <div class="email-item-side">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="email-timestamp">${timeStr}</span>
                    <button class="btn-acc-action" style="color: #fb7185; width: 24px; height: 24px; font-size: 11px;" onclick="event.stopPropagation(); deleteSingleEmail('${em.id}')" title="Delete This Mail">🗑️</button>
                </div>
                ${em.otp_code ? `<span class="email-otp-badge" onclick="event.stopPropagation(); copyToClipboard('${em.otp_code}', 'OTP Copied!')">⚡ ${em.otp_code}</span>` : ''}
            </div>
        `;
        emailList.appendChild(li);
    });
}

function checkAndRenderSpotlightOtp() {
    let topOtp = null;
    let topMsg = null;

    for (const em of currentEmails) {
        if (em.otp_code) {
            topOtp = em.otp_code;
            topMsg = em;
            break;
        }
    }

    if (topOtp && topMsg) {
        latestOtp = topOtp;
        spotlightCode.textContent = topOtp;
        spotlightService.textContent = `${topMsg.service_tag || 'Outlook'} OTP Detected`;
        spotlightSender.textContent = `Received from: ${topMsg.sender_name || 'Verification Service'}`;
        otpSpotlight.style.display = 'flex';
    } else {
        otpSpotlight.style.display = 'none';
    }
}

function renderRealOtpsChips() {
    realOtpsChips.innerHTML = '';
    const otpsMap = new Map();

    currentEmails.forEach(e => {
        if (e.otp_code && !otpsMap.has(e.otp_code)) {
            otpsMap.set(e.otp_code, e.service_tag || 'OTP');
        }
    });

    allOtpsCount.textContent = otpsMap.size;

    if (otpsMap.size > 0) {
        realOtpsSummary.style.display = 'flex';
        otpsMap.forEach((svc, otp) => {
            const chip = document.createElement('div');
            chip.className = 'otp-chip';
            chip.title = `Click to copy OTP (${svc})`;
            chip.innerHTML = `<span>⚡</span> <span>${otp}</span> <span style="font-size: 10px; opacity: 0.7;">(${svc})</span>`;
            chip.onclick = () => copyToClipboard(otp, `OTP ${otp} copied!`);
            realOtpsChips.appendChild(chip);
        });
    } else {
        realOtpsSummary.style.display = 'none';
    }
}

btnCopySpotlightOtp.addEventListener('click', () => {
    if (latestOtp) copyToClipboard(latestOtp, 'Spotlight OTP copied!', btnCopySpotlightOtp);
});

// Live Sync Button
btnSyncNow.addEventListener('click', async () => {
    if (!currentUserEmail || !currentAccount) return;
    try {
        btnSyncNow.disabled = true;
        syncSpinner.classList.add('spin-icon-hover');
        syncBtnText.textContent = 'Fetching Live...';

        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/accounts/${currentAccount.id}/sync`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok) {
            currentEmails = data.emails || [];
            renderEmailsList();
            checkAndRenderSpotlightOtp();
            renderRealOtpsChips();
            if (data.new_count > 0) {
                showToast(`Found ${data.new_count} new email(s)!`, 'success', '⚡');
                playDigitalChime();
            } else {
                showToast('Inbox is already up to date!', 'info', '✓');
            }
        }
    } catch (e) {
        showToast('Sync error occurred', 'error', '⚠️');
    } finally {
        btnSyncNow.disabled = false;
        syncSpinner.classList.remove('spin-icon-hover');
        syncBtnText.textContent = 'Fetch Live Outlook Mails';
    }
});

btnSyncAllAccounts.addEventListener('click', async () => {
    if (!currentUserEmail) return;
    try {
        btnSyncAllAccounts.disabled = true;
        btnSyncAllAccounts.textContent = '🔄 Syncing All...';
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/sync-all`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(`Synced ${data.synced_accounts} accounts (${data.total_new_emails} new emails)!`, 'success', '🔄');
            if (currentAccount) loadAccountInbox(currentAccount.id, false);
        }
    } catch (e) {
        showToast('Sync all accounts failed', 'error', '⚠️');
    } finally {
        btnSyncAllAccounts.disabled = false;
        btnSyncAllAccounts.innerHTML = '<span>🔄</span> Sync All Accounts';
    }
});

btnFilterOtpsOnly.addEventListener('click', () => {
    filterOnlyOtps = !filterOnlyOtps;
    btnFilterOtpsOnly.style.borderColor = filterOnlyOtps ? 'var(--amber-light)' : 'rgba(245, 158, 11, 0.4)';
    btnFilterOtpsOnly.style.background = filterOnlyOtps ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.15)';
    renderEmailsList();
});

btnRefresh.addEventListener('click', () => {
    if (currentAccount) loadAccountInbox(currentAccount.id, true);
});

btnClearInbox.addEventListener('click', async () => {
    if (!currentUserEmail || !currentAccount) return;
    if (!confirm('Clear all emails in this mailbox?')) return;
    try {
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/accounts/${currentAccount.id}/clear-inbox`, { method: 'POST' });
        if (res.ok) {
            currentEmails = [];
            renderEmailsList();
            checkAndRenderSpotlightOtp();
            renderRealOtpsChips();
            showToast('Inbox cleared successfully', 'success', '🗑️');
        }
    } catch (e) {
        showToast('Clear inbox failed', 'error', '⚠️');
    }
});

// Auto-Refresh Countdown
function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdown = 10;
    refreshTimer.textContent = `${countdown}s`;
    countdownTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            countdown = 10;
            if (currentAccount && currentUserEmail) {
                loadAccountInbox(currentAccount.id, true);
            }
        }
        refreshTimer.textContent = `${countdown}s`;
    }, 1000);
}
startCountdown();

// ================= WebSocket Live Push =================
function setupWebSocket(accountId) {
    if (ws) {
        try { ws.close(); } catch (e) {}
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${accountId}`;
    
    try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'new_email' && data.email) {
                    currentEmails.unshift(data.email);
                    renderEmailsList();
                    checkAndRenderSpotlightOtp();
                    renderRealOtpsChips();
                    playDigitalChime();
                    showToast(`New email from ${data.email.sender_name || 'Outlook'}!`, 'success', '🔔');
                }
            } catch (e) {}
        };
    } catch (e) {}
}

// ================= Modals Logic =================
// 1. Email View Modal
function openEmailModal(em) {
    modalSubject.textContent = em.subject || '(No Subject)';
    modalFrom.textContent = em.sender_name ? `${em.sender_name} <${em.sender_email}>` : (em.sender_email || 'Unknown');
    modalTime.textContent = formatTimestamp(em.timestamp);

    if (em.otp_code) {
        modalOtpSection.style.display = 'flex';
        modalOtpCode.textContent = em.otp_code;
        btnCopyModalOtp.onclick = () => copyToClipboard(em.otp_code, 'OTP Code copied!');
    } else {
        modalOtpSection.style.display = 'none';
    }

    if (em.body_html) {
        modalBody.innerHTML = em.body_html;
    } else {
        modalBody.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(em.body_text || '')}</pre>`;
    }

    const btnDeleteCurrentEmail = document.getElementById('btnDeleteCurrentEmail');
    if (btnDeleteCurrentEmail) {
        btnDeleteCurrentEmail.onclick = async () => {
            if (!confirm('Are you sure you want to delete this email?')) return;
            await deleteSingleEmail(em.id);
            emailModal.classList.remove('active');
        };
    }

    emailModal.classList.add('active');
}

btnCloseModal.addEventListener('click', () => emailModal.classList.remove('active'));

// 2. Single Custom Modal
function openCustomModal() {
    customModal.classList.add('active');
    customEmailInput.value = '';
    customPasswordInput.value = '';
    setTimeout(() => customEmailInput.focus(), 100);
}

function closeCustomModal() {
    customModal.classList.remove('active');
}

btnAddCustom.addEventListener('click', openCustomModal);
btnHeroAddCustom.addEventListener('click', openCustomModal);
btnCloseCustomModal.addEventListener('click', closeCustomModal);
btnCancelCustomModal.addEventListener('click', closeCustomModal);

btnSaveCustomAccount.addEventListener('click', async () => {
    const email = customEmailInput.value.trim().toLowerCase();
    const password = customPasswordInput.value.trim();

    if (!email || !email.includes('@')) {
        showToast('Please enter a valid Outlook email address', 'error', '⚠️');
        return;
    }

    try {
        btnSaveCustomAccount.disabled = true;
        const res = await fetch('/api/accounts/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: currentUserEmail, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('Account added successfully!', 'success', '➕');
            closeCustomModal();
            await loadUserAccounts();
            selectAccount(data);
        } else {
            showToast(data.detail || 'Failed to add account', 'error', '⚠️');
        }
    } catch (e) {
        showToast('Server error while saving account', 'error', '⚠️');
    } finally {
        btnSaveCustomAccount.disabled = false;
    }
});

// 3. Bulk Import Modal
function openBulkModal() {
    bulkImportModal.classList.add('active');
    bulkInputArea.value = '';
    bulkDetectCount.textContent = '0 accounts detected';
    setTimeout(() => bulkInputArea.focus(), 100);
}

function closeBulkModal() {
    bulkImportModal.classList.remove('active');
}

btnOpenBulkModal.addEventListener('click', openBulkModal);
btnHeroBulkImport.addEventListener('click', openBulkModal);
btnCloseBulkModal.addEventListener('click', closeBulkModal);
btnCancelBulkModal.addEventListener('click', closeBulkModal);
btnClearBulkText.addEventListener('click', () => {
    bulkInputArea.value = '';
    bulkDetectCount.textContent = '0 accounts detected';
});

bulkInputArea.addEventListener('input', () => {
    const lines = bulkInputArea.value.split('\n').filter(l => l.includes('@'));
    bulkDetectCount.textContent = `${lines.length} accounts detected`;
});

btnDoBulkImport.addEventListener('click', async () => {
    const raw_text = bulkInputArea.value.trim();
    if (!raw_text) {
        showToast('Please paste accounts text to import', 'error', '⚠️');
        return;
    }

    try {
        btnDoBulkImport.disabled = true;
        btnDoBulkImport.innerHTML = '<span>⏳</span> Importing...';
        const res = await fetch('/api/accounts/bulk-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: currentUserEmail, raw_text })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`Imported ${data.imported_count} Outlook accounts!`, 'success', '🚀');
            closeBulkModal();
            loadUserAccounts();
        } else {
            showToast(data.detail || 'Import error', 'error', '⚠️');
        }
    } catch (e) {
        showToast('Bulk import failed', 'error', '⚠️');
    } finally {
        btnDoBulkImport.disabled = false;
        btnDoBulkImport.innerHTML = '🚀 Import All Accounts';
    }
});

// 4. Developer API Key & Docs Modal
function openApiKeyModal() {
    apiKeyModal.classList.add('active');
    loadUserApiKey();
    renderApiCodeSnippets('curl');
}

function closeApiKeyModal() {
    apiKeyModal.classList.remove('active');
}

btnOpenApiKeyModal.addEventListener('click', openApiKeyModal);
btnCloseApiKeyModal.addEventListener('click', closeApiKeyModal);
btnCloseApiKeyBottom.addEventListener('click', closeApiKeyModal);

async function loadUserApiKey() {
    if (!currentUserEmail) return;
    try {
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/api-key`);
        if (res.ok) {
            const data = await res.json();
            currentUserApiKey = data.api_key;
            localStorage.setItem('temp_outlook_api_key', currentUserApiKey);
            apiKeyUserEmailDisplay.textContent = currentUserEmail;
            apiKeyDisplayInput.value = currentUserApiKey;
        }
    } catch (e) {}
}

btnToggleApiKeyVis.addEventListener('click', () => {
    isApiKeyVisible = !isApiKeyVisible;
    apiKeyDisplayInput.type = isApiKeyVisible ? 'text' : 'password';
    eyeIcon.textContent = isApiKeyVisible ? '🙈' : '👁️';
});

btnCopyApiKey.addEventListener('click', () => {
    if (currentUserApiKey) {
        copyToClipboard(currentUserApiKey, 'API Key copied to clipboard!', btnCopyApiKey);
    }
});

btnRegenerateApiKey.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to regenerate your API key? The old key will stop working.')) return;
    try {
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/api-key/regenerate`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            currentUserApiKey = data.api_key;
            localStorage.setItem('temp_outlook_api_key', currentUserApiKey);
            apiKeyDisplayInput.value = currentUserApiKey;
            showToast('New API Key generated successfully!', 'success', '🔑');
            renderApiCodeSnippets(document.querySelector('.api-tab.active')?.dataset.tab || 'curl');
        }
    } catch (e) {
        showToast('Failed to regenerate API key', 'error', '⚠️');
    }
});

// API Code Tabs
document.querySelectorAll('.api-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.api-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderApiCodeSnippets(tab.dataset.tab);
    });
});

function renderApiCodeSnippets(lang) {
    const key = currentUserApiKey || 'YOUR_API_KEY';
    const host = window.location.origin;
    const testEmail = currentAccount ? currentAccount.email : 'example@outlook.com';
    let code = '';

    if (lang === 'curl') {
        code = `# 1. Fetch Latest OTP for Outlook Account
curl -X GET "${host}/api/v1/otp?email=${testEmail}" \\
  -H "X-API-Key: ${key}"

# 2. Get All User Accounts
curl -X GET "${host}/api/v1/accounts" \\
  -H "X-API-Key: ${key}"`;
    } else if (lang === 'python') {
        code = `import requests

API_KEY = "${key}"
BASE_URL = "${host}"

headers = {"X-API-Key": API_KEY}

# Fetch latest OTP
response = requests.get(
    f"{BASE_URL}/api/v1/otp",
    headers=headers,
    params={"email": "${testEmail}"}
)
data = response.json()
if data.get("has_otp"):
    print("Found OTP:", data["otp"])
else:
    print("No OTP yet.")`;
    } else if (lang === 'js') {
        code = `const API_KEY = "${key}";
const BASE_URL = "${host}";

async function fetchLatestOtp(accountEmail) {
  const res = await fetch(\`\${BASE_URL}/api/v1/otp?email=\${accountEmail}\`, {
    headers: { "X-API-Key": API_KEY }
  });
  const data = await res.json();
  if (data.has_otp) {
    console.log("OTP Code:", data.otp);
    return data.otp;
  }
}

fetchLatestOtp("${testEmail}");`;
    } else if (lang === 'node') {
        code = `const axios = require('axios');

const API_KEY = "${key}";
const BASE_URL = "${host}";

async function getOtp() {
  try {
    const res = await axios.get(\`\${BASE_URL}/api/v1/otp\`, {
      headers: { 'X-API-Key': API_KEY },
      params: { email: '${testEmail}' }
    });
    console.log('Result:', res.data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

getOtp();`;
    }

    apiCodeDisplay.textContent = code;
}

btnCopyApiCode.addEventListener('click', () => {
    copyToClipboard(apiCodeDisplay.textContent, 'Code snippet copied!', btnCopyApiCode);
});

// ================= Bulk Facebook OTP Checker Tool =================
let isFbChecking = false;
let stopFbCheckFlag = false;
let fbAccountsToProcess = [];
let fbWithoutList = [];
let fbWithList = [];

function openFbChecker() {
    fbCheckerModal.classList.add('active');
    updateFbStats();
}

function closeFbChecker() {
    if (isFbChecking) {
        if (!confirm('Facebook OTP check is in progress. Stop check and close?')) return;
        stopFbCheckFlag = true;
    }
    fbCheckerModal.classList.remove('active');
}

btnOpenFbChecker.addEventListener('click', openFbChecker);
btnCloseFbChecker.addEventListener('click', closeFbChecker);
btnCloseFbCheckerBottom.addEventListener('click', closeFbChecker);

btnLoadCurrentToFb.addEventListener('click', () => {
    if (allAccounts.length === 0) {
        showToast('No accounts currently loaded to load', 'info', 'ℹ️');
        return;
    }
    const lines = allAccounts.map(a => a.raw_line || `${a.email}|${a.password || ''}`);
    fbBulkInputArea.value = lines.join('\n');
    fbInputCountBadge.textContent = `${lines.length} accounts detected`;
    showToast(`Loaded ${lines.length} accounts into checker!`, 'success', '📋');
});

btnClearFbInput.addEventListener('click', () => {
    fbBulkInputArea.value = '';
    fbInputCountBadge.textContent = '0 accounts detected';
});

fbBulkInputArea.addEventListener('input', () => {
    const lines = fbBulkInputArea.value.split('\n').filter(l => l.includes('@'));
    fbInputCountBadge.textContent = `${lines.length} accounts detected`;
});

btnStartFbCheck.addEventListener('click', async () => {
    const text = fbBulkInputArea.value.trim();
    if (!text) {
        showToast('Please paste accounts to check!', 'error', '⚠️');
        return;
    }

    // Parse accounts via backend parser
    try {
        const pRes = await fetch('/api/tools/parse-bulk-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_text: text })
        });
        const pData = await pRes.json();
        fbAccountsToProcess = pData.accounts || [];
    } catch (e) {
        showToast('Parsing failed', 'error', '⚠️');
        return;
    }

    if (fbAccountsToProcess.length === 0) {
        showToast('No valid Outlook email addresses detected!', 'error', '⚠️');
        return;
    }

    isFbChecking = true;
    stopFbCheckFlag = false;
    fbWithoutList = [];
    fbWithList = [];
    renderFbColumns();

    btnStartFbCheck.disabled = true;
    btnStopFbCheck.disabled = false;
    fbStartIcon.textContent = '⏳';
    fbStartText.textContent = 'Checking FB OTPs...';

    const total = fbAccountsToProcess.length;
    let checked = 0;

    for (const acc of fbAccountsToProcess) {
        if (stopFbCheckFlag) break;

        try {
            const res = await fetch('/api/tools/check-fb-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(acc)
            });
            const data = await res.json();

            if (data.has_fb_otp) {
                fbWithList.push(data);
                playDigitalChime();
            } else {
                fbWithoutList.push(data);
            }
        } catch (e) {
            fbWithoutList.push({ ...acc, has_fb_otp: false, otp_code: null });
        }

        checked++;
        fbStatTotal.textContent = total;
        fbStatChecked.textContent = checked;
        fbStatWithout.textContent = fbWithoutList.length;
        fbStatWith.textContent = fbWithList.length;
        fbColWithoutCount.textContent = fbWithoutList.length;
        fbColWithCount.textContent = fbWithList.length;

        const pct = Math.round((checked / total) * 100);
        fbProgressBar.style.width = `${pct}%`;

        renderFbColumns();
    }

    isFbChecking = false;
    btnStartFbCheck.disabled = false;
    btnStopFbCheck.disabled = true;
    fbStartIcon.textContent = '🚀';
    fbStartText.textContent = 'Start FB OTP Check';
    showToast(`Check finished! Checked ${checked}/${total} accounts.`, 'success', '🏁');
});

btnStopFbCheck.addEventListener('click', () => {
    stopFbCheckFlag = true;
    btnStopFbCheck.disabled = true;
    showToast('Stopping check...', 'info', '⏹️');
});

function updateFbStats() {
    fbStatTotal.textContent = fbAccountsToProcess.length;
    fbStatChecked.textContent = fbWithoutList.length + fbWithList.length;
    fbStatWithout.textContent = fbWithoutList.length;
    fbStatWith.textContent = fbWithList.length;
    fbColWithoutCount.textContent = fbWithoutList.length;
    fbColWithCount.textContent = fbWithList.length;
}

function renderFbColumns() {
    const qWithout = (searchWithoutFb.value || '').trim().toLowerCase();
    const qWith = (searchWithFb.value || '').trim().toLowerCase();

    // Render Left Column (Without FB Mail)
    const filteredWithout = fbWithoutList.filter(a => a.email && a.email.toLowerCase().includes(qWithout));
    if (filteredWithout.length === 0) {
        listWithoutFb.innerHTML = `
            <div class="fb-empty-state">
                <div class="empty-state-icon">📭</div>
                <p>No accounts checked yet.</p>
                <span>Accounts without FB OTP will appear here.</span>
            </div>
        `;
    } else {
        listWithoutFb.innerHTML = filteredWithout.map(a => `
            <div class="fb-account-row">
                <span style="font-weight: 600; color: #fff;">${escapeHtml(a.email)}</span>
                <span style="color: var(--text-dim); font-size: 11px;">Pass: ${escapeHtml(a.password || '')}</span>
            </div>
        `).join('');
    }

    // Render Right Column (With FB OTP)
    const filteredWith = fbWithList.filter(a => a.email && a.email.toLowerCase().includes(qWith));
    if (filteredWith.length === 0) {
        listWithFb.innerHTML = `
            <div class="fb-empty-state">
                <div class="empty-state-icon">🔔</div>
                <p>No FB OTPs found yet.</p>
                <span>Accounts receiving FB verification code will pop up here!</span>
            </div>
        `;
    } else {
        listWithFb.innerHTML = filteredWith.map(a => `
            <div class="fb-account-row" style="border-left: 3px solid var(--emerald-light);">
                <div>
                    <div style="font-weight: 700; color: #fff;">${escapeHtml(a.email)}</div>
                    <div style="font-size: 11px; color: var(--emerald-light); font-weight: 700;">OTP: ${escapeHtml(a.otp_code || '')}</div>
                </div>
                <button class="btn-acc-action" onclick="copyToClipboard('${a.otp_code}', 'FB OTP Copied!')" title="Copy OTP">📋</button>
            </div>
        `).join('');
    }
}

searchWithoutFb.addEventListener('input', renderFbColumns);
searchWithFb.addEventListener('input', renderFbColumns);

// Download Text Helpers
function downloadTextFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

btnDownloadWithoutFb.addEventListener('click', () => {
    if (fbWithoutList.length === 0) return showToast('No accounts to download!', 'info', 'ℹ️');
    const content = fbWithoutList.map(a => a.raw_line || `${a.email}|${a.password || ''}`).join('\n');
    downloadTextFile('outlook_without_fb.txt', content);
    showToast('Downloaded clean unused Outlook accounts!', 'success', '📥');
});

btnCopyWithoutFb.addEventListener('click', () => {
    if (fbWithoutList.length === 0) return showToast('No accounts to copy!', 'info', 'ℹ️');
    const content = fbWithoutList.map(a => a.raw_line || `${a.email}|${a.password || ''}`).join('\n');
    copyToClipboard(content, 'All accounts without FB copied!', btnCopyWithoutFb);
});

btnDownloadWithFb.addEventListener('click', () => {
    if (fbWithList.length === 0) return showToast('No accounts with OTP to download!', 'info', 'ℹ️');
    const content = fbWithList.map(a => `${a.email}|${a.password || ''}|OTP:${a.otp_code || ''}`).join('\n');
    downloadTextFile('facebook_otp_accounts.txt', content);
    showToast('Downloaded Facebook accounts with OTP!', 'success', '📥');
});

btnCopyWithFb.addEventListener('click', () => {
    if (fbWithList.length === 0) return showToast('No accounts with OTP to copy!', 'info', 'ℹ️');
    const content = fbWithList.map(a => `${a.email}|${a.password || ''}|OTP:${a.otp_code || ''}`).join('\n');
    copyToClipboard(content, 'All accounts with FB OTP copied!', btnCopyWithFb);
});

// ================= Formatting & Escape Helpers =================
function formatTimestamp(ts) {
    if (!ts) return '';
    try {
        const d = new Date(ts * 1000);
        const now = new Date();
        const diffSec = Math.floor((now - d) / 1000);

        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

        return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(str).replace(/[&<>"']/g, m => map[m]);
}

// ================= Single Delete Operations =================
async function deleteSingleEmail(emailId) {
    if (!currentUserEmail || !currentAccount || !emailId) return;
    try {
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/accounts/${currentAccount.id}/emails/${emailId}/delete`, {
            method: 'POST'
        });
        if (res.ok) {
            currentEmails = currentEmails.filter(e => e.id !== emailId);
            renderEmailsList();
            checkAndRenderSpotlightOtp();
            renderRealOtpsChips();
            showToast('Email deleted successfully', 'success', '🗑️');
        } else {
            showToast('Failed to delete email', 'error', '⚠️');
        }
    } catch (e) {
        showToast('Error deleting email', 'error', '⚠️');
    }
}

async function deleteSingleAccount(accountId) {
    if (!currentUserEmail || !accountId) return;
    if (!confirm('Are you sure you want to delete this Outlook account?')) return;
    try {
        const res = await fetch(`/api/user/${encodeURIComponent(currentUserEmail)}/accounts/${accountId}/delete`, {
            method: 'POST'
        });
        if (res.ok) {
            showToast('Account deleted successfully', 'success', '🗑️');
            if (currentAccount && currentAccount.id === accountId) {
                currentAccount = null;
            }
            selectedAccountIds.delete(accountId);
            updateBulkSelectionBar();
            loadUserAccounts();
        } else {
            showToast('Failed to delete account', 'error', '⚠️');
        }
    } catch (e) {
        showToast('Error deleting account', 'error', '⚠️');
    }
}

// Ad Dismiss Handler
function setupAdDismiss() {
    const btnCloseAd = document.getElementById('btnCloseAd');
    const adsPromoCard = document.getElementById('adsPromoCard');
    if (btnCloseAd && adsPromoCard) {
        btnCloseAd.addEventListener('click', () => {
            adsPromoCard.style.transition = 'all 0.3s ease';
            adsPromoCard.style.opacity = '0';
            adsPromoCard.style.transform = 'translateY(-15px)';
            setTimeout(() => { adsPromoCard.style.display = 'none'; }, 300);
            showToast('Ad dismissed', 'info', '✕');
        });
    }
}

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

// Boot Application
window.addEventListener('DOMContentLoaded', () => {
    initUserProfile();
    setupAdDismiss();
});
