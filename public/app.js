function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

let dbTokens = JSON.parse(localStorage.getItem('db_tokens') || '[]'); 
let deviceExpiredAt = parseInt(localStorage.getItem('device_expired_at') || '0');

window.onload = () => {
    checkAccessStatus();
};

function checkAccessStatus() {
    const now = Date.now();
    if (deviceExpiredAt > now) {
        openDashboard();
    } else {
        switchView('view-activation');
        document.getElementById('main-header').classList.add('hidden');
    }
}

function redeemFirstToken() {
    const kode = document.getElementById('input-first-redeem').value.trim();
    if(!kode) return showToast("Masukkan kode token!");
    processRedeem(kode, () => {
        document.getElementById('input-first-redeem').value = '';
        openDashboard();
    });
}

function redeemToken() {
    const kode = document.getElementById('input-redeem').value.trim();
    if(!kode) return showToast("Masukkan kode token!");
    processRedeem(kode, () => {
        document.getElementById('input-redeem').value = '';
        updateTokenUI();
    });
}

function processRedeem(kode, onSuccess) {
    // Ambil data token terbaru dari localStorage agar sinkron dengan admin.html
    dbTokens = JSON.parse(localStorage.getItem('db_tokens') || '[]');
    const tokenIndex = dbTokens.findIndex(t => t.code === kode);
    
    if(tokenIndex !== -1) {
        const durationDays = dbTokens[tokenIndex].duration;
        const durationMs = durationDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        if (deviceExpiredAt > now) {
            deviceExpiredAt += durationMs;
        } else {
            deviceExpiredAt = now + durationMs;
        }
        
        dbTokens.splice(tokenIndex, 1);
        localStorage.setItem('db_tokens', JSON.stringify(dbTokens));
        localStorage.setItem('device_expired_at', deviceExpiredAt);
        
        showToast(`Berhasil! Masa aktif ditambah ${durationDays} Hari.`);
        if(onSuccess) onSuccess();
    } else {
        showToast("Kode Token Tidak Valid / Sudah Terpakai!");
    }
}

function beliToken() {
    const nomorWA = "6285895559738";
    const pesan = `Halo Admin, saya mau beli kode token perpanjangan AlightMotion.`;
    window.open(`https://wa.me/${nomorWA}?text=${encodeURIComponent(pesan)}`, '_blank');
}

function openDashboard() {
    document.getElementById('main-header').classList.remove('hidden');
    switchView('view-dashboard');
    updateTokenUI();
    document.getElementById('email-input').value = "";
}

function updateTokenUI() {
    const now = Date.now();
    const displayElement = document.getElementById('user-token-display');
    
    if (deviceExpiredAt > now) {
        const dateObj = new Date(deviceExpiredAt);
        const dateStr = dateObj.toLocaleDateString('id-ID') + ' ' + dateObj.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        displayElement.textContent = `⏳ Aktif s/d: ${dateStr}`;
    } else {
        displayElement.textContent = `⚠️ Akses Habis`;
        switchView('view-activation');
        document.getElementById('main-header').classList.add('hidden');
        showToast("Masa aktif perangkat telah habis!");
    }
}

async function callInternalApi(endpoint, payload) {
    const outputBox = document.getElementById('response-output');
    outputBox.textContent = `Memproses request ke ${endpoint}...\nMohon tunggu...`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get("content-type") || "";
        let data;
        if (contentType.includes("application/json")) {
            data = await response.json();
            outputBox.textContent = JSON.stringify(data, null, 2);
        } else {
            data = await response.text();
            outputBox.textContent = data;
        }
    } catch (error) {
        outputBox.textContent = `Error: ${error.message}`;
    }
}

document.getElementById('btn-send').addEventListener('click', () => {
    const emailValue = document.getElementById('email-input').value.trim();
    if (!emailValue) return showToast("Harap masukkan email!");
    sessionStorage.setItem('last_sent_email', emailValue);
    callInternalApi('/api/send', { email: emailValue });
});

document.getElementById('btn-verify').addEventListener('click', () => {
    const linkValue = document.getElementById('verify-input').value.trim();
    let emailValue = sessionStorage.getItem('last_sent_email') || document.getElementById('email-input').value.trim();
    
    if (!linkValue) return showToast("Harap tempel link verifikasi!");
    if (!emailValue) return showToast("Email tidak ditemukan. Kirim email dulu!");

    if (Date.now() > deviceExpiredAt) {
        showToast("Masa Aktif Habis! Silakan perpanjang.");
        document.getElementById('response-output').textContent = "ERROR: Masa aktif perangkat Anda telah habis.";
        switchView('view-activation');
        document.getElementById('main-header').classList.add('hidden');
        return;
    }

    callInternalApi('/api/verify', { link: linkValue, email: emailValue });
});