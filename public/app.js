let qrisInterval = null;
let currentEmail = "";

document.addEventListener('DOMContentLoaded', initApp);

// --- SISTEM GUI NOTIFIKASI (TOAST MODERN) ---
function showNotification(msg, type) {
    const toast = document.getElementById('gui-toast');
    
    // Ikon berdasarkan tipe (Sukses / Error)
    const icon = type === 'success' ? '✔' : '❌';
    
    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    toast.className = `global-toast ${type} show`;

    // Hilang otomatis setelah 3.5 detik
    setTimeout(() => {
        toast.className = 'global-toast hidden';
    }, 3500);
}

// --- UI & AUTH ---
function switchTab(tab) {
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab === 'login');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-reg').classList.toggle('active', tab === 'login');
}

function initApp() {
    const user = JSON.parse(localStorage.getItem('am_user'));
    if (user) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('nav-user').innerHTML = `
            <button class="btn-outline" onclick="logout()">Logout (${user.username})</button>
        `;
        document.getElementById('target-email').value = user.email; // Autofill
        checkPremiumStatus(user);
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard-section').classList.add('hidden');
        document.getElementById('nav-user').innerHTML = `<button class="btn-outline">Guest</button>`;
    }
}

function handleRegister(e) {
    e.preventDefault();
    const user = document.getElementById('reg-user').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    
    let db = JSON.parse(localStorage.getItem('am_db') || '[]');
    
    // Jika Username / Email sudah ada
    if (db.find(u => u.username === user || u.email === email)) {
        return showNotification("Daftar Gagal! Username atau Email sudah terpakai.", "error");
    }
    
    // Jika berhasil daftar
    db.push({ username: user, email, pass, premium_until: 0 });
    localStorage.setItem('am_db', JSON.stringify(db));
    
    showNotification("Daftar Berhasil! Silakan masuk.", "success");
    switchTab('login');
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
        showNotification("Login Gagal! Username/Email atau Password salah.", "error");
    }
}

function logout() {
    localStorage.removeItem('am_user');
    location.reload();
}

// --- LOGIKA GEMBOK & QRIS ---
function checkPremiumStatus(user) {
    const now = new Date().getTime();
    const lockScreen = document.getElementById('lock-screen');
    
    if (user.premium_until > now) {
        lockScreen.classList.add('hidden'); 
    } else {
        lockScreen.classList.remove('hidden'); 
    }
}

async function bayarQris() {
    const btn = document.getElementById('btn-unlock');
    btn.textContent = "Loading QRIS...";
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
            document.getElementById('qris-amount').textContent = `Rp ${data.data.totalAmount.toLocaleString('id-ID')}`;
            
            pollQrisStatus(data.data.depositId);
        } else {
            showNotification("Sistem pembayaran gangguan.", "error");
            btn.textContent = "Buka Akses (Rp 2.000)";
            btn.disabled = false;
        }
    } catch (err) {
        showNotification("Error jaringan: " + err.message, "error");
        btn.textContent = "Buka Akses (Rp 2.000)";
        btn.disabled = false;
    }
}

function pollQrisStatus(trxId) {
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
                document.getElementById('qris-status').textContent = "Lunas! Membuka akses...";
                showNotification("Pembayaran Berhasil! Akses dibuka.", "success");
                
                let user = JSON.parse(localStorage.getItem('am_user'));
                user.premium_until = new Date().getTime() + 259200000; // 3 hari
                localStorage.setItem('am_user', JSON.stringify(user));
                
                let db = JSON.parse(localStorage.getItem('am_db'));
                let dbIndex = db.findIndex(u => u.username === user.username);
                if(dbIndex !== -1) { db[dbIndex] = user; localStorage.setItem('am_db', JSON.stringify(db)); }

                setTimeout(() => {
                    document.getElementById('lock-screen').classList.add('hidden');
                }, 1000);
            }
        } catch (e) {
            console.error(e);
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
            setToolOutput(`❌ <b>Gagal Premium</b><br>Alasan: ${data.message || data.error || "Sistem menolak link ini."}`, "error");
        }
    } catch (err) {
        btn.textContent = "Proses & Aktifkan Premium";
        setToolOutput(`❌ <b>Gagal Premium</b><br>Kesalahan jaringan server.`, "error");
    }
}