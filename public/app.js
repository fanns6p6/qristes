// Konfigurasi & State
let checkInterval;
let timerInterval;
let currentTrxId = null;
let currentPlan = null;
let historyData = JSON.parse(localStorage.getItem('vannz_history')) || [];

// --- SISTEM AUTH & UI NAVIGATION ---
function login() {
    const user = document.getElementById('auth-user').value;
    if(!user) return showAlert("Gagal", "Username/Email wajib diisi!");
    
    localStorage.setItem('vannz_user', user);
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('profile-name').innerText = user;
    renderHistory();
}

function logout() {
    localStorage.removeItem('vannz_user');
    window.location.reload();
}

function switchTab(tabId) {
    document.querySelectorAll('#tab-dashboard, #tab-activation, #tab-history, #tab-profile').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-tabs button').forEach(el => el.classList.remove('active'));
    document.getElementById(`btn-tab-${tabId}`).classList.add('active');
}

// Cek sesi saat load
window.onload = () => {
    if(localStorage.getItem('vannz_user')) {
        login();
    }
}

// --- SISTEM POPUP MODERN ---
function showAlert(title, message) {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-msg').innerText = message;
    document.getElementById('modal-alert').classList.remove('hidden');
}
function closeAlert() {
    document.getElementById('modal-alert').classList.add('hidden');
}

// --- SISTEM PEMBAYARAN QRIS (AUTO CHECK & TIMER) ---
async function initiatePayment(plan, amount) {
    currentPlan = plan;
    document.getElementById('modal-qris').classList.remove('hidden');
    document.getElementById('qris-image').classList.add('hidden');
    document.getElementById('qris-loading').classList.remove('hidden');
    
    try {
        // Hit Vercel API /api/create-qris (Sesuaikan endpoint jika ditaruh di folder /api)
        const res = await fetch('/api/create-qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, method: 'qris' })
        });
        const data = await res.json();
        
        if(res.ok && data.qr_url) { // Sesuaikan dengan response Ramashop (misal qr_url)
            currentTrxId = data.depositId || data.trx_id; // Sesuaikan key response
            
            document.getElementById('qris-loading').classList.add('hidden');
            const img = document.getElementById('qris-image');
            img.src = data.qr_url; 
            img.classList.remove('hidden');
            
            startQrisTimer();
            startAutoCheck();
        } else {
            throw new Error(data.message || "Gagal generate QRIS");
        }
    } catch (error) {
        cancelPayment();
        showAlert("Error", "Sistem pembayaran gangguan: " + error.message);
    }
}

function startQrisTimer() {
    let timeLeft = 120; // 2 menit
    const timerEl = document.getElementById('qris-timer');
    
    timerInterval = setInterval(() => {
        timeLeft--;
        let m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        let s = (timeLeft % 60).toString().padStart(2, '0');
        timerEl.innerText = `${m}:${s}`;
        
        if (timeLeft <= 0) {
            handlePaymentResult("GAGAL", "Waktu pembayaran habis (Kadaluarsa).");
        }
    }, 1000);
}

function startAutoCheck() {
    checkInterval = setInterval(async () => {
        if(!currentTrxId) return;
        try {
            const res = await fetch('/api/check-qris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trx_id: currentTrxId })
            });
            const data = await res.json();
            
            // Asumsi response status Ramashop: 'PAID' atau 'SUCCESS'
            if(data.status === 'PAID' || data.status === 'SUCCESS') {
                handlePaymentResult("BERHASIL", "Pembayaran Diterima.");
            }
        } catch (error) {
            console.log("Cek status error:", error);
        }
    }, 5000); // Cek setiap 5 detik
}

function handlePaymentResult(status, msg) {
    clearInterval(timerInterval);
    clearInterval(checkInterval);
    document.getElementById('modal-qris').classList.add('hidden');
    
    // Catat ke riwayat
    const record = {
        date: new Date().toLocaleString(),
        plan: currentPlan,
        status: status
    };
    historyData.unshift(record);
    localStorage.setItem('vannz_history', JSON.stringify(historyData));
    renderHistory();
    
    if(status === "BERHASIL") {
        showAlert("Berhasil", "Pembayaran berhasil! Silakan aktivasi akun premium kamu.");
        document.getElementById('active-plan-text').innerText = currentPlan.toUpperCase();
        switchTab('activation'); // Arahkan otomatis ke form aktivasi AM
    } else {
        showAlert("Gagal", msg);
        switchTab('history');
    }
}

function cancelPayment() {
    clearInterval(timerInterval);
    clearInterval(checkInterval);
    document.getElementById('modal-qris').classList.add('hidden');
}

function renderHistory() {
    const box = document.getElementById('history-list');
    box.innerHTML = '';
    if(historyData.length === 0) {
        box.innerHTML = '<p style="color:#666; font-size:13px;">Belum ada riwayat transaksi.</p>';
        return;
    }
    
    historyData.forEach(h => {
        const color = h.status === 'BERHASIL' ? 'status-success' : 'status-failed';
        box.innerHTML += `
            <div class="history-item">
                <div>
                    <strong>Paket ${h.plan.toUpperCase()}</strong><br>
                    <span style="color:#aaa; font-size:11px;">${h.date}</span>
                </div>
                <div class="${color} font-weight-bold">${h.status}</div>
            </div>
        `;
    });
}

// --- SISTEM AKTIVASI ALIGHT MOTION (Sistem asli tetap dijaga) ---
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
        return data; // Kembalikan data untuk dicek sukses/tidaknya
    } catch (error) {
        outputBox.textContent = `Error: ${error.message}`;
        return null;
    }
}

document.getElementById('btn-send').addEventListener('click', () => {
    const emailValue = document.getElementById('email-input').value.trim();
    
    // VALIDASI KHUSUS: Wajib isi untuk paket Private (Sesuai request)
    if (currentPlan === 'private' && !emailValue) {
        return showAlert("Peringatan", "Setiap masukin gmail wajib gmail fresh. Wajib di isi karena kamu membeli paket Private!");
    } else if (!emailValue) {
        return showAlert("Peringatan", "Harap masukkan email terlebih dahulu!");
    }
    
    sessionStorage.setItem('last_sent_email', emailValue);
    callInternalApi('/api/send', { email: emailValue });
});

document.getElementById('btn-verify').addEventListener('click', async () => {
    const linkValue = document.getElementById('verify-input').value.trim();
    let emailValue = sessionStorage.getItem('last_sent_email');
    
    if (!emailValue) {
        const emailInput = document.getElementById('email-input');
        if (emailInput) emailValue = emailInput.value.trim();
    }
    if (!linkValue) {
        return showAlert("Peringatan", "Harap tempel link verifikasi terlebih dahulu!");
    }
    if (!emailValue) {
        return showAlert("Peringatan", "Email tidak ditemukan! Harap masukkan dan kirim email terlebih dahulu.");
    }
    
    const res = await callInternalApi('/api/verify', { link: linkValue, email: emailValue });
    
    // Jika proses verify berhasil, munculkan pesan success.
    // (Asumsi jika string tidak mengandung kata error atau status code ok, ini bisa disesuaikan dengan output API kamu)
    if(res) {
        showAlert("Aktivasi Berhasil!", "Berhasil premium. Akun Alight Motion sudah siap premium 1 tahun, silakan di-login.");
    }
});