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

// --- UI TABS AUTH ---
function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-register').classList.toggle('hidden', isLogin);
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-reg').classList.toggle('active', !isLogin);
}

// --- UI TABS DASHBOARD ---
function switchDashTab(tab) {
    const sections = ['dashboard', 'profil', 'history'];
    sections.forEach(s => {
        const sec = document.getElementById(`section-${s}`);
        const tabEl = document.getElementById(`tab-menu-${s}`);
        if (sec) sec.classList.add('hidden');
        if (tabEl) tabEl.classList.remove('active');
    });
    
    const targetSec = document.getElementById(`section-${tab}`);
    const targetTab = document.getElementById(`tab-menu-${tab}`);
    if (targetSec) targetSec.classList.remove('hidden');
    if (targetTab) targetTab.classList.add('active');

    // Refresh history if history tab selected
    if (tab === 'history') {
        const user = JSON.parse(localStorage.getItem('am_user'));
        if (user) renderAllHistories(user.username);
    }
}

// --- INITIALIZATION ---
function initApp() {
    const user = JSON.parse(localStorage.getItem('am_user'));
    const authSection = document.getElementById('auth-section');
    const dashboardMenu = document.getElementById('dashboard-menu');
    const sectionDashboard = document.getElementById('section-dashboard');
    const navUser = document.getElementById('nav-user');

    if (user) {
        // Hide login card completely
        if (authSection) authSection.classList.add('hidden');
        if (dashboardMenu) dashboardMenu.classList.remove('hidden');
        if (sectionDashboard) sectionDashboard.classList.remove('hidden');
        
        if (navUser) navUser.innerHTML = `<button class="btn-outline" onclick="logout()">Logout</button>`;
        
        const targetEmailInput = document.getElementById('target-email');
        const profileUsernameInput = document.getElementById('profile-username');
        if (targetEmailInput) targetEmailInput.value = user.email || ''; 
        if (profileUsernameInput) profileUsernameInput.value = user.username || '';
        
        // Render PP
        const avatarPreview = document.getElementById('avatar-preview');
        if (avatarPreview) {
            if (user.avatar) {
                avatarPreview.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                avatarPreview.textContent = user.username ? user.username.charAt(0).toUpperCase() : 'U';
            }
        }
        
        checkPremiumStatus(user);
        renderAllHistories(user.username);
    } else {
        if (authSection) authSection.classList.remove('hidden');
        if (dashboardMenu) dashboardMenu.classList.add('hidden');
        if (sectionDashboard) sectionDashboard.classList.add('hidden');
        const sectionProfil = document.getElementById('section-profil');
        const sectionHistory = document.getElementById('section-history');
        if (sectionProfil) sectionProfil.classList.add('hidden');
        if (sectionHistory) sectionHistory.classList.add('hidden');
        if (navUser) navUser.innerHTML = `<button class="btn-outline">Guest</button>`;
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

        let db = JSON.parse(localStorage.getItem('am_db') || '[]');
        let idx = db.findIndex(u => u.username === user.username);
        if (idx !== -1) {
            db[idx].avatar = base64Image;
            localStorage.setItem('am_db', JSON.stringify(db));
        }

        const avatarPreview = document.getElementById('avatar-preview');
        if (avatarPreview) {
            avatarPreview.innerHTML = `<img src="${base64Image}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }
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
    const passInput = document.getElementById('profile-password');
    if (passInput) passInput.value = '';
    initApp();
}

// --- STATUS & COUNTDOWN ---
function checkPremiumStatus(user) {
    const lockScreen = document.getElementById('lock-screen');
    const perpanjangContainer = document.getElementById('dashboard-perpanjang-container');
    
    if (countdownInterval) clearInterval(countdownInterval);

    const updateTimer = () => {
        const now = new Date().getTime();
        const diff = user.premium_until - now;

        if (diff > 0) {
            if (lockScreen) lockScreen.classList.add('hidden'); 
            if (perpanjangContainer) perpanjangContainer.classList.remove('hidden'); 
            
            let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            hours = hours < 10 ? '0' + hours : hours;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        } else {
            if (lockScreen) lockScreen.classList.remove('hidden'); 
            if (perpanjangContainer) perpanjangContainer.classList.add('hidden'); 
            const timeDisplay = document.getElementById('time-display');
            if (timeDisplay) timeDisplay.textContent = "AKSES HABIS";
            if (countdownInterval) clearInterval(countdownInterval);
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
    if (cTrx) {
        if (historyTrx.length === 0) {
            cTrx.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada riwayat transaksi.</li>`;
        } else {
            cTrx.innerHTML = '';
            historyTrx.slice().reverse().forEach(item => {
                cTrx.innerHTML += `<li class="history-item"><div><div><strong>${item.item}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div style="text-align:right;"><div>Rp 2.000</div><span class="success">✔ Berhasil</span></div></li>`;
            });
        }
    }

    // 2. Pembuatan Akun
    const cCreate = document.getElementById('history-create-container');
    if (cCreate) {
        if (historyCreate.length === 0) {
            cCreate.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada riwayat pembuatan akun.</li>`;
        } else {
            cCreate.innerHTML = '';
            historyCreate.slice().reverse().forEach(item => {
                cCreate.innerHTML += `<li class="history-item"><div><div><strong>Target: ${item.email}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div><span class="${item.status}">${item.status === 'success' ? '✔ Sukses' : '❌ Gagal'}</span></div></li>`;
            });
        }
    }

    // 3. Email Berhasil Premium
    const cSuccess = document.getElementById('history-success-container');
    if (cSuccess) {
        if (historySuccess.length === 0) {
            cSuccess.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada email berhasil.</li>`;
        } else {
            cSuccess.innerHTML = '';
            historySuccess.slice().reverse().forEach(item => {
                cSuccess.innerHTML += `<li class="history-item"><div><div><strong>${item.email}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div><span class="success">✔ Aktif</span></div></li>`;
            });
        }
    }

    // 4. Email Gagal Premium
    const cFailed = document.getElementById('history-failed-container');
    if (cFailed) {
        if (historyFailed.length === 0) {
            cFailed.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada email gagal.</li>`;
        } else {
            cFailed.innerHTML = '';
            historyFailed.slice().reverse().forEach(item => {
                cFailed.innerHTML += `<li class="history-item"><div><div><strong>${item.email}</strong></div><div style="font-size:10px; margin-top:3px; color:#ff4d4d;">Alasan: ${item.reason}</div></div><div><span class="failed">❌ Gagal</span></div></li>`;
            });
        }
    }
}

// --- PEMBAYARAN & QRIS ---
async function bayarQris() {
    const btn = document.getElementById('btn-unlock');
    if (!btn) return;
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
            
            pollQrisStatus(data.data.depositId, 'Berlangganan Baru (Akses 3 Hari)');
        } else {
            showNotification("Sistem pembayaran gangguan.", "error");
            btn.textContent = "Berlangganan Sekarang (Rp 2.000)";
            btn.disabled = false;
        }
    } catch (err) {
        showNotification("Error jaringan server.", "error");
        btn.textContent = "Berlangganan Sekarang (Rp 2.000)";
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
            const lockScreen = document.getElementById('lock-screen');
            if (lockScreen) lockScreen.classList.remove('hidden');
            
            const btn = document.getElementById('btn-unlock');
            if (btn) btn.style.display = 'none';
            document.getElementById('qris-box').style.display = 'block';
            document.getElementById('qris-img').src = data.data.qrImage;
            
            pollQrisStatus(data.data.depositId, 'Perpanjangan Akses (+3 Hari)');
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
                
                showNotification("Pembayaran Sukses! Akses Diperbarui.", "success");
                const qrisStatusEl = document.getElementById('qris-status');
                if (qrisStatusEl) qrisStatusEl.textContent = "Pembayaran Berhasil!";

                let user = JSON.parse(localStorage.getItem('am_user'));
                let now = new Date().getTime();
                let baseTime = user.premium_until > now ? user.premium_until : now;
                user.premium_until = baseTime + 259200000; // +3 Hari
                
                localStorage.setItem('am_user', JSON.stringify(user));
                
                let db = JSON.parse(localStorage.getItem('am_db') || '[]');
                let dbIndex = db.findIndex(u => u.username === user.username);
                if (dbIndex !== -1) { 
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
                    const btnUnlock = document.getElementById('btn-unlock');
                    if (btnUnlock) {
                        btnUnlock.style.display = 'block';
                        btnUnlock.disabled = false;
                        btnUnlock.textContent = "Berlangganan Sekarang (Rp 2.000)";
                    }
                    document.getElementById('qris-box').style.display = 'none';
                    if (qrisStatusEl) qrisStatusEl.textContent = "Status: Menunggu Pembayaran...";
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
    if (!output) return;
    output.innerHTML = msg;
    output.className = `tool-output ${type}`; 
}

async function kirimEmail() {
    const email = document.getElementById('target-email').value.trim();
    const btn = document.getElementById('btn-send');
    if (!email) return showNotification("Masukkan email target terlebih dahulu.", "error");
    
    currentEmail = email;
    if (btn) btn.textContent = "Mengirim...";
    setToolOutput("Mengirim email...", "success");

    try {
        const res = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (btn) btn.textContent = "Kirim Link Verifikasi";
        
        if (res.ok) {
            setToolOutput(`Cek Inbox Gmail <b>${email}</b>, lalu salin link-nya ke form di bawah.`, "success");
        } else {
            setToolOutput(`Gagal mengirim: ${data.message || data.error}`, "error");
        }
    } catch (err) {
        if (btn) btn.textContent = "Kirim Link Verifikasi";
        setToolOutput("Gagal mengirim email. Periksa koneksi.", "error");
    }
}

async function verifikasiLink() {
    const link = document.getElementById('target-link').value.trim();
    const btn = document.getElementById('btn-verify');
    if (!link) return showNotification("Tempel link verifikasi terlebih dahulu.", "error");
    
    if (btn) btn.textContent = "Memproses...";
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
        if (btn) btn.textContent = "Proses & Aktifkan Premium";

        let hCreate = JSON.parse(localStorage.getItem('am_history_create') || '[]');

        if (res.ok) {
            showNotification("Premium Berhasil Diaktifkan!", "success");
            setToolOutput(`
                🎉 <b>Berhasil Premium!</b><br><br>
                Silakan login ke aplikasi Alight Motion dengan email:<br>
                <b>${currentEmail || "yang Anda masukkan tadi"}</b>
            `, "success");

            hCreate.push({ username: user.username, email: currentEmail, date: dateStr, status: 'success' });
            localStorage.setItem('am_history_create', JSON.stringify(hCreate));

            let hSuccess = JSON.parse(localStorage.getItem('am_history_success') || '[]');
            hSuccess.push({ username: user.username, email: currentEmail, date: dateStr });
            localStorage.setItem('am_history_success', JSON.stringify(hSuccess));

            document.getElementById('target-link').value = ''; 
        } else {
            let reason = data.message || data.error || "Link Expired.";
            setToolOutput(`❌ <b>Gagal Premium</b><br>Alasan: ${reason}`, "error");

            hCreate.push({ username: user.username, email: currentEmail || "Unknown", date: dateStr, status: 'failed' });
            localStorage.setItem('am_history_create', JSON.stringify(hCreate));

            let hFailed = JSON.parse(localStorage.getItem('am_history_failed') || '[]');
            hFailed.push({ username: user.username, email: currentEmail || "Unknown", date: dateStr, reason: reason });
            localStorage.setItem('am_history_failed', JSON.stringify(hFailed));
        }
        renderAllHistories(user.username);
    } catch (err) {
        if (btn) btn.textContent = "Proses & Aktifkan Premium";
        setToolOutput(`❌ <b>Gagal Premium</b><br>Kesalahan jaringan server.`, "error");
    }
}