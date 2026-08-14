let qrisInterval = null;
let countdownInterval = null;
let currentEmail = "";

document.addEventListener('DOMContentLoaded', initApp);

// --- GUI NOTIFIKASI TOAST ---
function showNotification(msg, type) {
    const toast = document.getElementById('gui-toast');
    const icon = type === 'success' ? '✔' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    toast.className = `global-toast ${type} show`;
    setTimeout(() => { toast.className = 'global-toast hidden'; }, 4000);
}

// --- UI TABS ---
function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-register').classList.toggle('hidden', isLogin);
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-reg').classList.toggle('active', !isLogin);
}

function switchDashTab(tab) {
    const sections = ['dashboard', 'tutor', 'profil', 'history'];
    sections.forEach(s => {
        document.getElementById(`section-${s}`).classList.add('hidden');
        document.getElementById(`tab-menu-${s}`).classList.remove('active');
    });
    
    document.getElementById(`section-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-menu-${tab}`).classList.add('active');
}

// --- INITIALIZATION ---
function initApp() {
    const user = JSON.parse(localStorage.getItem('am_user'));
    if (user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-menu').classList.remove('hidden');
        document.getElementById('section-dashboard').classList.remove('hidden');
        
        document.getElementById('nav-user').innerHTML = `<button class="btn-outline" onclick="logout()">Logout</button>`;
        document.getElementById('target-email').value = user.email || ''; 
        document.getElementById('profile-username').value = user.username || '';
        
        // Render PP
        if (user.avatar) {
            document.getElementById('avatar-preview').innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            document.getElementById('avatar-preview').textContent = user.username ? user.username.charAt(0).toUpperCase() : 'U';
        }
        
        checkPremiumStatus(user);
        renderAllHistories(user.username);
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard-menu').classList.add('hidden');
        document.getElementById('section-dashboard').classList.add('hidden');
        document.getElementById('section-tutor').classList.add('hidden');
        document.getElementById('section-profil').classList.add('hidden');
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
    
    db.push({ username: user, email, pass, premium_until: 0, avatar: "" });
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

// --- PROFILE MANAGEMENT (PP, USERNAME, PW) ---
function updateProfilePic(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(uploadEvent) {
        let base64Image = uploadEvent.target.result;
        let user = JSON.parse(localStorage.getItem('am_user'));
        user.avatar = base64Image;
        localStorage.setItem('am_user', JSON.stringify(user));

        // Update DB
        let db = JSON.parse(localStorage.getItem('am_db') || '[]');
        let idx = db.findIndex(u => u.username === user.username);
        if (idx !== -1) {
            db[idx].avatar = base64Image;
            localStorage.setItem('am_db', JSON.stringify(db));
        }

        document.getElementById('avatar-preview').innerHTML = `<img src="${base64Image}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        showNotification("Foto profil berhasil diperbarui!", "success");
    };
    reader.readAsDataURL(file);
}

function handleUpdateProfile(e) {
    e.preventDefault();
    let user = JSON.parse(localStorage.getItem('am_user'));
    let newUsername = document.getElementById('profile-username').value.trim();
    let newPass = document.getElementById('profile-password').value.trim();

    let db = JSON.parse(localStorage.getItem('am_db') || '[]');
    
    // Check if username taken by another user
    if (db.find(u => u.username === newUsername && u.username !== user.username)) {
        return showNotification("Username sudah digunakan orang lain.", "error");
    }

    user.username = newUsername;
    if (newPass) {
        user.pass = newPass;
    }

    localStorage.setItem('am_user', JSON.stringify(user));

    let idx = db.findIndex(u => u.email === user.email);
    if (idx !== -1) {
        db[idx] = user;
        localStorage.setItem('am_db', JSON.stringify(db));
    }

    showNotification("Profil berhasil diperbarui!", "success");
    document.getElementById('profile-password').value = '';
    initApp();
}

// --- STATUS & COUNTDOWN ---
function checkPremiumStatus(user) {
    const lockScreen = document.getElementById('lock-screen');
    const perpanjangContainer = document.getElementById('perpanjang-container');
    
    if(countdownInterval) clearInterval(countdownInterval);

    const updateTimer = () => {
        const now = new Date().getTime();
        const diff = user.premium_until - now;

        if (diff > 0) {
            lockScreen.classList.add('hidden'); 
            perpanjangContainer.classList.remove('hidden'); // Muncul jika udah berlangganan
            
            let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            hours = hours < 10 ? '0' + hours : hours;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            
            let timeStr = `${hours}:${minutes}:${seconds}`;
            document.getElementById('time-display').textContent = timeStr;
        } else {
            lockScreen.classList.remove('hidden'); 
            perpanjangContainer.classList.add('hidden'); // Sembunyikan jika belum berlangganan/habis
            document.getElementById('time-display').textContent = "AKSES HABIS";
            if(countdownInterval) clearInterval(countdownInterval);
        }
    };

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}

// --- HISTORIES RENDERING ---
function renderAllHistories(username) {
    const historyTrx = JSON.parse(localStorage.getItem('am_history_trx') || '[]').filter(h => h.username === username);
    const historyCreate = JSON.parse(localStorage.getItem('am_history_create') || '[]').filter(h => h.username === username);
    const historySuccess = JSON.parse(localStorage.getItem('am_history_success') || '[]').filter(h => h.username === username);
    const historyFailed = JSON.parse(localStorage.getItem('am_history_failed') || '[]').filter(h => h.username === username);

    // 1. Transaksi
    const cTrx = document.getElementById('history-trx-container');
    cTrx.innerHTML = historyTrx.length === lightArrayEmpty(cTrx, historyTrx) ? `<li class="history-item" style="justify-content: center;">Belum ada riwayat transaksi.</li>` : '';
    historyTrx.slice().reverse().forEach(item => {
        cTrx.innerHTML += `<li class="history-item"><div><div><strong>${item.item}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div style="text-align:right;"><div>Rp 2.000</div><span class="success">✔ Berhasil</span></div></li>`;
    });

    // 2. Pembuatan Akun
    const cCreate = document.getElementById('history-create-container');
    cCreate.innerHTML = historyCreate.length === 0 ? `<li class="history-item" style="justify-content: center;">Belum ada riwayat pembuatan akun.</li>` : '';
    historyCreate.slice().reverse().forEach(item => {
        cCreate.innerHTML += `<li class="history-item"><div><div><strong>Target: ${item.email}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div><span class="${item.status}">${item.status === 'success' ? '✔ Sukses' : '❌ Gagal'}</span></div></li>`;
    });

    // 3. Email Berhasil Premium
    const cSuccess = document.getElementById('history-success-container');
    cSuccess.innerHTML = historySuccess.length === 0 ? `<li class="history-item" style="justify-content: center;">Belum ada email berhasil.</li>` : '';
    historySuccess.slice().reverse().forEach(item => {
        cSuccess.innerHTML += `<li class="history-item"><div><div><strong>${item.email}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div><span class="success">✔ Aktif</span></div></li>`;
    });

    // 4. Email Gagal Premium
    const cFailed = document.getElementById('history-failed-container');
    cFailed.innerHTML = historyFailed.length === 0 ? `<li class="history-item" style="justify-content: center;">Belum ada email gagal.</li>` : '';
    historyFailed.slice().reverse().forEach(item => {
        cFailed.innerHTML += `<li class="history-item"><div><div><strong>${item.email}</strong></div><div style="font-size:10px; margin-top:3px; color:#ff4d4d;">Alasan: ${item.reason}</div></div><div><span class="failed">❌ Gagal</span></div></li>`;
    });
}

function lightArrayEmpty(el, arr) { return arr.length === 0; }

// --- PEMBAYARAN & QRIS ---
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

async function perpanjangAkses() {
    try {
        const res = await fetch('/api/create-qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 2000 })
        });
        const data = await res.json();

        if (data && data.success && data.data) {
            switchDashTab('dashboard');
            
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
                
                showNotification("Pembayaran Sukses! Akses Terbuka.", "success");
                document.getElementById('qris-status').textContent = "Pembayaran Berhasil!";

                let user = JSON.parse(localStorage.getItem('am_user'));
                let now = new Date().getTime();
                let baseTime = user.premium_until > now ? user.premium_until : now;
                user.premium_until = baseTime + 259200000; // +3 Hari
                
                localStorage.setItem('am_user', JSON.stringify(user));
                
                let db = JSON.parse(localStorage.getItem('am_db') || '[]');
                let dbIndex = db.findIndex(u => u.username === user.username);
                if(dbIndex !== -1) { 
                    db[dbIndex] = user; 
                    localStorage.setItem('am_db', JSON.stringify(db)); 
                }

                // Push Transaksi History
                let hTrx = JSON.parse(localStorage.getItem('am_history_trx') || '[]');
                hTrx.push({
                    username: user.username,
                    item: labelItem,
                    date: new Date().toLocaleString('id-ID'),
                    status: 'success'
                });
                localStorage.setItem('am_history_trx', JSON.stringify(hTrx));

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

// --- ALAT UTAMA & HISTORY CREATION ---
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

    let user = JSON.parse(localStorage.getItem('am_user'));
    let dateStr = new Date().toLocaleString('id-ID');

    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: link, email: currentEmail })
        });
        const data = await res.json();
        btn.textContent = "Proses & Aktifkan Premium";

        let hCreate = JSON.parse(localStorage.getItem('am_history_create') || '[]');

        if (res.ok) {
            showNotification("Premium Berhasil Diaktifkan!", "success");
            setToolOutput(`
                🎉 <b>Berhasil Premium!</b><br><br>
                Silakan login ke aplikasi Alight Motion dengan email:<br>
                <b>${currentEmail || "yang Anda masukkan tadi"}</b>
            `, "success");

            // Catat history sukses
            hCreate.push({ username: user.username, email: currentEmail, date: dateStr, status: 'success' });
            localStorage.setItem('am_history_create', JSON.stringify(hCreate));

            let hSuccess = JSON.parse(localStorage.getItem('am_history_success') || '[]');
            hSuccess.push({ username: user.username, email: currentEmail, date: dateStr });
            localStorage.setItem('am_history_success', JSON.stringify(hSuccess));

            document.getElementById('target-link').value = ''; 
        } else {
            let reason = data.message || data.error || "Link Expired.";
            setToolOutput(`❌ <b>Gagal Premium</b><br>Alasan: ${reason}`, "error");

            // Catat history gagal
            hCreate.push({ username: user.username, email: currentEmail || "Unknown", date: dateStr, status: 'failed' });
            localStorage.setItem('am_history_create', JSON.stringify(hCreate));

            let hFailed = JSON.parse(localStorage.getItem('am_history_failed') || '[]');
            hFailed.push({ username: user.username, email: currentEmail || "Unknown", date: dateStr, reason: reason });
            localStorage.setItem('am_history_failed', JSON.stringify(hFailed));
        }
        renderAllHistories(user.username);
    } catch (err) {
        btn.textContent = "Proses & Aktifkan Premium";
        setToolOutput(`❌ <b>Gagal Premium</b><br>Kesalahan jaringan server.`, "error");
    }
}