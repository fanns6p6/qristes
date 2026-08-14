let qrisInterval = null;
let countdownInterval = null;
let currentEmail = "";

document.addEventListener('DOMContentLoaded', initApp);

// --- SISTEM GUI NOTIFIKASI (TOAST MODERN) ---
function showNotification(msg, type) {
    const toast = document.getElementById('gui-toast');
    const icon = type === 'success' ? '✔' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    toast.className = `global-toast ${type} show`;
    setTimeout(() => { toast.className = 'global-toast hidden'; }, 4000);
}

// --- UI TABS (PERBAIKAN TOMBOL LOGIN & DAFTAR) ---
function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-register').classList.toggle('hidden', isLogin);
    
    // Toggle class active agar warna abu-abu berpindah dengan benar ke tombol yang diklik
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-reg').classList.toggle('active', !isLogin);
}

function switchDashTab(tab) {
    document.getElementById('section-tool').classList.add('hidden');
    document.getElementById('section-time').classList.add('hidden');
    document.getElementById('section-history').classList.add('hidden');
    
    document.getElementById('tab-menu-tool').classList.remove('active');
    document.getElementById('tab-menu-time').classList.remove('active');
    document.getElementById('tab-menu-history').classList.remove('active');
    
    document.getElementById(`section-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-menu-${tab}`).classList.add('active');
}

// --- INITIALIZATION ---
function initApp() {
    const user = JSON.parse(localStorage.getItem('am_user'));
    if (user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-menu').classList.remove('hidden');
        document.getElementById('section-tool').classList.remove('hidden');
        
        document.getElementById('nav-user').innerHTML = `<button class="btn-outline" onclick="logout()">Logout</button>`;
        document.getElementById('target-email').value = user.email; 
        
        checkPremiumStatus(user);
        renderHistory(user.username);
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard-menu').classList.add('hidden');
        document.getElementById('section-tool').classList.add('hidden');
        document.getElementById('section-time').classList.add('hidden');
        document.getElementById('section-history').classList.add('hidden');
        document.getElementById('nav-user').innerHTML = `<button class="btn-outline">Guest</button>`;
    }
}

// --- AUTHENTICATION ---
function handleRegister(e) {
    e.preventDefault();
    const user = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    
    let db = JSON.parse(localStorage.getItem('am_db') || '[]');
    if (db.find(u => u.username === user || u.email === email)) {
        return showNotification("Daftar Gagal! Username/Email sudah terpakai.", "error");
    }
    
    db.push({ username: user, email, pass, premium_until: 0 });
    localStorage.setItem('am_db', JSON.stringify(db));
    showNotification("Daftar Berhasil! Silakan masuk.", "success");
    switchAuthTab('login');
}

function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('log-id').value.trim();
    const pass = document.getElementById('log-pass').value.trim();
    let db = JSON.parse(localStorage.getItem('am_db') || '[]');
    let user = db.find(u => (u.username === id || u.email === id) && u.pass === pass);
    
    if (user) {
        showNotification("Login Berhasil!", "success");
        localStorage.setItem('am_user', JSON.stringify(user));
        initApp();
    } else {
        showNotification("Login Gagal! Cek kembali data Anda.", "error");
    }
}

function logout() {
    localStorage.removeItem('am_user');
    location.reload();
}

// --- LOGIKA GEMBOK & COUNTDOWN ---
function checkPremiumStatus(user) {
    const lockScreen = document.getElementById('lock-screen');
    
    if(countdownInterval) clearInterval(countdownInterval);

    const updateTimer = () => {
        const now = new Date().getTime();
        const diff = user.premium_until - now;

        if (diff > 0) {
            lockScreen.classList.add('hidden'); 
            
            let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            hours = hours < 10 ? '0' + hours : hours;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            
            document.getElementById('time-display').textContent = `${hours}:${minutes}:${seconds}`;
        } else {
            lockScreen.classList.remove('hidden'); 
            document.getElementById('time-display').textContent = "AKSES HABIS";
            if(countdownInterval) clearInterval(countdownInterval);
        }
    };

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}

// --- LOGIKA PEMBAYARAN, PERPANJANG & HISTORY ---
function renderHistory(username) {
    const historyDb = JSON.parse(localStorage.getItem('am_history') || '[]');
    const userHistory = historyDb.filter(h => h.username === username);
    const container = document.getElementById('history-container');

    if(userHistory.length === 0) {
        container.innerHTML = `<li style="justify-content: center;">Belum ada riwayat pembelian.</li>`;
        return;
    }

    container.innerHTML = '';
    userHistory.reverse().forEach(item => {
        container.innerHTML += `
            <li>
                <div>
                    <div><strong>${item.item}</strong></div>
                    <div style="font-size:10px; margin-top:3px;">${item.date}</div>
                </div>
                <div style="text-align:right;">
                    <div>Rp 2.000</div>
                    <span class="success">✔ Berhasil</span>
                </div>
            </li>
        `;
    });
}

async function bayarQris() {
    const btn = document.getElementById('btn-unlock');
    btn.textContent = "Memuat Sistem Pembayaran...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/create-qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 2000 })
        });
        const data = await res.json();

        if (data && data.success && data.data) {
            btn.style.display = 'none';
            document.getElementById('qris-box').style.display = 'block';
            document.getElementById('qris-img').src = data.data.qrImage;
            
            pollQrisStatus(data.data.depositId, 'Beli Akses Baru');
        } else {
            showNotification("Sistem pembayaran gangguan.", "error");
            btn.textContent = "Beli Akses (Rp 2.000)";
            btn.disabled = false;
        }
    } catch (err) {
        showNotification("Error jaringan server.", "error");
        btn.textContent = "Beli Akses (Rp 2.000)";
        btn.disabled = false;
    }
}

// Fungsi Khusus Tombol Perpanjang Akses
async function perpanjangAkses() {
    try {
        const res = await fetch('/api/create-qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 2000 })
        });
        const data = await res.json();

        if (data && data.success && data.data) {
            // Arahkan otomatis ke tab alat agar user bisa scan QRIS di gembok layar
            switchDashTab('tool');
            
            const btn = document.getElementById('btn-unlock');
            btn.style.display = 'none';
            document.getElementById('qris-box').style.display = 'block';
            document.getElementById('qris-img').src = data.data.qrImage;
            
            pollQrisStatus(data.data.depositId, 'Perpanjangan Akses (3 Hari)');
        } else {
            showNotification("Gagal membuat QRIS perpanjangan.", "error");
        }
    } catch (err) {
        showNotification("Error jaringan server.", "error");
    }
}

// Auto-check jika lunas
function pollQrisStatus(trxId, labelItem) {
    if (qrisInterval) clearInterval(qrisInterval);

    qrisInterval = setInterval(async () => {
        try {
            const res = await fetch('/api/check-qris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trx_id: trxId })
            });
            const data = await res.json();

            if (data.status === true && data.data && (data.data.status === "success" || data.data.status === "already")) {
                clearInterval(qrisInterval);
                
                showNotification("Pembayaran Sukses! Waktu Akses Ditambahkan.", "success");
                document.getElementById('qris-status').textContent = "Pembayaran Berhasil!";

                // Update Waktu (+3 Hari dari waktu sekarang atau dari waktu sisa sebelumnya jika belum habis)
                let user = JSON.parse(localStorage.getItem('am_user'));
                let now = new Date().getTime();
                let baseTime = user.premium_until > now ? user.premium_until : now;
                user.premium_until = baseTime + 259200000; // Tambah 3 hari
                
                localStorage.setItem('am_user', JSON.stringify(user));
                
                let db = JSON.parse(localStorage.getItem('am_db'));
                let dbIndex = db.findIndex(u => u.username === user.username);
                if(dbIndex !== -1) { 
                    db[dbIndex] = user; 
                    localStorage.setItem('am_db', JSON.stringify(db)); 
                }

                // Catat ke History Pembelian
                let hDb = JSON.parse(localStorage.getItem('am_history') || '[]');
                hDb.push({
                    username: user.username,
                    item: labelItem,
                    date: new Date().toLocaleString('id-ID'),
                    status: 'success'
                });
                localStorage.setItem('am_history', JSON.stringify(hDb));

                setTimeout(() => {
                    initApp(); 
                    document.getElementById('btn-unlock').style.display = 'block';
                    document.getElementById('btn-unlock').disabled = false;
                    document.getElementById('btn-unlock').textContent = "Beli Akses (Rp 2.000)";
                    document.getElementById('qris-box').style.display = 'none';
                    document.getElementById('qris-status').textContent = "Status: Menunggu Pembayaran...";
                }, 2000);
            }
        } catch (e) {
            console.error("Gagal mengecek status pembayaran:", e);
        }
    }, 5000);
}

// --- LOGIKA TOOL UTAMA ---
function setToolOutput(msg, type) {
    const output = document.getElementById('tool-output');
    output.innerHTML = msg;
    output.className = `tool-output ${type}`; 
}

async function kirimEmail() {
    const email = document.getElementById('target-email').value.trim();
    const btn = document.getElementById('btn-send');
    if (!email) return showNotification("Masukkan email target terlebih dahulu.", "error");
    
    currentEmail = email;
    btn.textContent = "Mengirim...";
    setToolOutput("Mengirim email...", "success");

    try {
        const res = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        btn.textContent = "Kirim Link Verifikasi";
        
        if (res.ok) {
            setToolOutput(`Cek Inbox Gmail <b>${email}</b>, lalu salin link-nya ke form di bawah.`, "success");
        } else {
            setToolOutput(`Gagal mengirim: ${data.message || data.error}`, "error");
        }
    } catch (err) {
        btn.textContent = "Kirim Link Verifikasi";
        setToolOutput("Gagal mengirim email. Periksa koneksi.", "error");
    }
}

async function verifikasiLink() {
    const link = document.getElementById('target-link').value.trim();
    const btn = document.getElementById('btn-verify');
    if (!link) return showNotification("Tempel link verifikasi terlebih dahulu.", "error");
    
    btn.textContent = "Memproses...";
    setToolOutput("Mengeksekusi proses premium...", "success");

    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: link, email: currentEmail })
        });
        const data = await res.json();
        btn.textContent = "Proses & Aktifkan Premium";

        if (res.ok) {
            showNotification("Premium Berhasil Diaktifkan!", "success");
            setToolOutput(`
                🎉 <b>Berhasil Premium!</b><br><br>
                Silakan login ke aplikasi Alight Motion dengan email:<br>
                <b>${currentEmail || "yang Anda masukkan tadi"}</b>
            `, "success");
            document.getElementById('target-link').value = ''; 
        } else {
            setToolOutput(`❌ <b>Gagal Premium</b><br>Alasan: ${data.message || data.error || "Link Expired."}`, "error");
        }
    } catch (err) {
        btn.textContent = "Proses & Aktifkan Premium";
        setToolOutput(`❌ <b>Gagal Premium</b><br>Kesalahan jaringan server.`, "error");
    }
}