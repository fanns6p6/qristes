let qrisInterval = null;
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', initApp);

// --- GUI NOTIFIKASI & POPUP MODERN ---
function showNotification(msg, type) {
    const toast = document.getElementById('gui-toast');
    const icon = type === 'success' ? '✔' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    toast.className = `global-toast ${type} show`;
    setTimeout(() => { toast.className = 'global-toast hidden'; }, 4000);
}

function showModal(title, desc) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = desc;
    document.getElementById('modern-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modern-modal').classList.remove('show');
}

// --- UI TABS AUTH & PRE-LOGIN ---
function switchAuthTab(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');
    document.getElementById('form-tutor').classList.toggle('hidden', tab !== 'tutor');
    
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-reg').classList.toggle('active', tab === 'register');
    document.getElementById('tab-tutor').classList.toggle('active', tab === 'tutor');
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
        if (authSection) authSection.classList.add('hidden');
        if (dashboardMenu) dashboardMenu.classList.remove('hidden');
        if (sectionDashboard) sectionDashboard.classList.remove('hidden');
        
        if (navUser) navUser.innerHTML = `<button class="btn-outline" onclick="logout()">Logout</button>`;
        
        const profileUsernameInput = document.getElementById('profile-username');
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
        document.getElementById('section-profil').classList.add('hidden');
        document.getElementById('section-history').classList.add('hidden');
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
        return showNotification("Username / Email sudah terpakai.", "error");
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
        showNotification("Cek kembali data Anda.", "error");
    }
}

function logout() {
    localStorage.removeItem('am_user');
    location.reload();
}

// --- PROFILE MANAGEMENT ---
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
        showNotification("Foto profil diperbarui!", "success");
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
        return showNotification("Username sudah digunakan.", "error");
    }

    user.username = newUsername;
    if (newPass) user.pass = newPass;

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
    const perpanjangContainer = document.getElementById('dashboard-perpanjang-container');
    
    if (countdownInterval) clearInterval(countdownInterval);

    const updateTimer = () => {
        const now = new Date().getTime();
        const diff = user.premium_until - now;
        const timeDisplay = document.getElementById('time-display');

        if (diff > 0) {
            // Aktif: Sembunyikan lock, tampilkan tombol perpanjang
            if (lockScreen) lockScreen.classList.add('hidden'); 
            if (perpanjangContainer) perpanjangContainer.classList.remove('hidden'); 
            
            let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            hours = hours < 10 ? '0' + hours : hours;
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            
            if (timeDisplay) timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        } else {
            // Habis: Tampilkan lock, sembunyikan tombol perpanjang
            if (lockScreen) lockScreen.classList.remove('hidden'); 
            if (perpanjangContainer) perpanjangContainer.classList.add('hidden'); 
            
            if (timeDisplay) timeDisplay.textContent = "AKSES HABIS";
            if (countdownInterval) clearInterval(countdownInterval);
        }
    };

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}

// --- LOGIKA ALAT GENERATOR & VALIDASI ---
function prosesPembuatanAkun() {
    const tipeLayanan = document.getElementById('tipe-layanan').value;
    const emailTarget = document.getElementById('target-email').value.trim();

    // Validasi Popup Modern: Wajib Gmail Fresh untuk Private (VANNZ STORE requirement)
    if (tipeLayanan === 'private' && !emailTarget) {
        showModal("Format Tidak Valid", "Setiap memasukkan email wajib Gmail fresh. Harap isi email untuk pembelian tipe Private agar sistem dapat memprosesnya.");
        return;
    }

    if (!emailTarget.includes('@gmail.com') && emailTarget !== "") {
        showModal("Kesalahan Provider", "Sistem hanya menerima pendaftaran menggunakan domain @gmail.com.");
        return;
    }

    const btn = document.getElementById('btn-proses');
    btn.textContent = "Memproses Permintaan...";
    btn.disabled = true;

    // Simulasi Proses Backend
    setTimeout(() => {
        let isSuccess = Math.random() > 0.3; // 70% success rate simulasi
        let user = JSON.parse(localStorage.getItem('am_user'));
        let dateStr = new Date().toLocaleString('id-ID');

        // Log Creat Akun
        saveHistory('am_history_create', { username: user.username, email: emailTarget || 'Akun Sharing', status: isSuccess ? 'success' : 'failed', date: dateStr });

        if (isSuccess) {
            showNotification("Akun Premium Berhasil Dibuat!", "success");
            saveHistory('am_history_success', { username: user.username, email: emailTarget || 'Akun Sharing', date: dateStr });
        } else {
            showModal("Proses Gagal", "Gagal melakukan generate. Pastikan Gmail belum terdaftar atau coba lagi nanti.");
            saveHistory('am_history_failed', { username: user.username, email: emailTarget || 'Akun Sharing', reason: 'Timeout limit exceeded', date: dateStr });
        }

        btn.textContent = "Proses & Buat Akun";
        btn.disabled = false;
        document.getElementById('target-email').value = "";
    }, 2000);
}

function saveHistory(key, data) {
    let history = JSON.parse(localStorage.getItem(key) || '[]');
    history.push(data);
    localStorage.setItem(key, JSON.stringify(history));
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
        if (historyTrx.length === 0) cTrx.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada riwayat transaksi.</li>`;
        else {
            cTrx.innerHTML = '';
            historyTrx.slice().reverse().forEach(item => {
                cTrx.innerHTML += `<li class="history-item"><div><div><strong>${item.item}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div style="text-align:right;"><div>Rp 2.000</div><span class="success">✔ Berhasil</span></div></li>`;
            });
        }
    }

    // 2. Pembuatan Akun
    const cCreate = document.getElementById('history-create-container');
    if (cCreate) {
        if (historyCreate.length === 0) cCreate.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada riwayat pembuatan akun.</li>`;
        else {
            cCreate.innerHTML = '';
            historyCreate.slice().reverse().forEach(item => {
                cCreate.innerHTML += `<li class="history-item"><div><div><strong>Target: ${item.email}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div><span class="${item.status === 'success' ? 'success' : 'failed'}">${item.status === 'success' ? '✔ Sukses' : '❌ Gagal'}</span></div></li>`;
            });
        }
    }

    // 3. Email Berhasil Premium
    const cSuccess = document.getElementById('history-success-container');
    if (cSuccess) {
        if (historySuccess.length === 0) cSuccess.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada email berhasil.</li>`;
        else {
            cSuccess.innerHTML = '';
            historySuccess.slice().reverse().forEach(item => {
                cSuccess.innerHTML += `<li class="history-item"><div><div><strong>${item.email}</strong></div><div style="font-size:10px; margin-top:3px;">${item.date}</div></div><div><span class="success">✔ Aktif</span></div></li>`;
            });
        }
    }

    // 4. Email Gagal Premium
    const cFailed = document.getElementById('history-failed-container');
    if (cFailed) {
        if (historyFailed.length === 0) cFailed.innerHTML = `<li class="history-item" style="justify-content: center;">Belum ada email gagal.</li>`;
        else {
            cFailed.innerHTML = '';
            historyFailed.slice().reverse().forEach(item => {
                cFailed.innerHTML += `<li class="history-item"><div><div><strong>${item.email}</strong></div><div style="font-size:10px; margin-top:3px; color:#aaa;">Alasan: ${item.reason}</div></div><div><span class="failed">❌ Gagal</span></div></li>`;
            });
        }
    }
}

// --- PEMBAYARAN & QRIS ---
function bayarQris() {
    const btn = document.getElementById('btn-unlock');
    if (!btn) return;
    
    document.getElementById('qris-box').style.display = 'block';
    btn.style.display = 'none';

    // Simulasi dummy pembayaran sukses dalam 5 detik
    setTimeout(() => {
        selesaikanPembayaran();
    }, 5000);
}

function perpanjangAkses() {
    showNotification("Memproses sistem pembayaran...", "success");
    setTimeout(() => {
        selesaikanPembayaran();
    }, 2000);
}

function selesaikanPembayaran() {
    let user = JSON.parse(localStorage.getItem('am_user'));
    let db = JSON.parse(localStorage.getItem('am_db') || '[]');
    
    const timeToAdd = 3 * 24 * 60 * 60 * 1000; // 3 Hari
    const now = new Date().getTime();
    
    if(user.premium_until > now) {
        user.premium_until += timeToAdd; // Perpanjang
    } else {
        user.premium_until = now + timeToAdd; // Berlangganan baru
    }

    localStorage.setItem('am_user', JSON.stringify(user));
    
    let idx = db.findIndex(u => u.email === user.email);
    if (idx !== -1) {
        db[idx].premium_until = user.premium_until;
        localStorage.setItem('am_db', JSON.stringify(db));
    }

    saveHistory('am_history_trx', { 
        username: user.username, 
        item: 'Langganan Generator 3 Hari', 
        date: new Date().toLocaleString('id-ID') 
    });

    showNotification("Pembayaran Berhasil! Akses Terbuka.", "success");
    
    const btnUnlock = document.getElementById('btn-unlock');
    if(btnUnlock) btnUnlock.style.display = 'block';
    document.getElementById('qris-box').style.display = 'none';

    initApp();
}