let checkInterval = null;
let currentSessionEmail = "";

// ----------------------------------------------------
// 1. SISTEM AUTENTIKASI (Local Client Session)
// ----------------------------------------------------

// Inisialisasi awal
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
});

function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.classList.add('active');
        tabReg.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabReg.classList.add('active');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    
    // Cek duplikasi
    const exists = users.find(u => u.username === username || u.email === email);
    if (exists) {
        alert("Username atau Email sudah terdaftar!");
        return;
    }

    users.push({ username, email, password });
    localStorage.setItem('registered_users', JSON.stringify(users));

    alert("Pendaftaran berhasil! Silakan login.");
    switchAuthTab('login');
}

function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
    const user = users.find(u => (u.username === identifier || u.email === identifier) && u.password === password);

    if (!user) {
        alert("Username/Email atau Password salah!");
        return;
    }

    // Save Active Session
    localStorage.setItem('active_user', JSON.stringify(user));
    checkUserSession();
}

function handleLogout() {
    localStorage.removeItem('active_user');
    location.reload();
}

function checkUserSession() {
    const activeUser = JSON.parse(localStorage.getItem('active_user'));
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const navUserArea = document.getElementById('nav-user-area');

    if (activeUser) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');

        // Autofill target email dari email pendaftaran
        document.getElementById('target-email').value = activeUser.email;

        navUserArea.innerHTML = `
            <span style="font-size: 13px; color: var(--text-muted);">Hi, <b style="color: #fff;">${activeUser.username}</b></span>
            <button class="btn btn-outline btn-sm" onclick="handleLogout()">Logout</button>
        `;
    } else {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        navUserArea.innerHTML = `
            <button class="btn btn-outline btn-sm" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">Login / Daftar</button>
        `;
    }
}

// ----------------------------------------------------
// 2. LOGIKA SEWA & PEMBAYARAN QRIS (RAMASHOP API)
// ----------------------------------------------------

async function processQrisPayment() {
    const btnPay = document.getElementById('btn-create-qris');
    btnPay.disabled = true;
    btnPay.textContent = "Memproses QRIS...";

    try {
        const res = await fetch('/api/create-qris', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 2000 })
        });
        
        const data = await res.json();

        if (data && data.success === true && data.data) {
            const qrisBox = document.getElementById('qris-box');
            const qrisImg = document.getElementById('qris-img');
            const amountText = document.getElementById('qris-amount-display');
            const statusText = document.getElementById('qris-status-text');

            qrisImg.src = data.data.qrImage;
            amountText.textContent = `Total: Rp ${data.data.totalAmount.toLocaleString('id-ID')}`;
            statusText.textContent = "Menunggu pembayaran...";
            qrisBox.style.display = "block";

            // Polling status deposit tiap 5 detik
            const depositId = data.data.depositId;
            if (checkInterval) clearInterval(checkInterval);

            checkInterval = setInterval(async () => {
                const checkRes = await fetch('/api/check-qris', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trx_id: depositId })
                });
                const checkData = await checkRes.json();

                if (checkData.status === true && checkData.data && (checkData.data.status === "success" || checkData.data.status === "already")) {
                    clearInterval(checkInterval);
                    statusText.innerHTML = "<b style='color: #34c759;'> Pembayaran Berhasil! Akses 3 Hari Ditambahkan.</b>";
                    
                    // Buka Langkah 2
                    document.getElementById('process-step').classList.remove('hidden');
                    btnPay.textContent = "Sewa Aktif (Lunas)";
                }
            }, 5000);

        } else {
            alert("Gagal membuat QRIS. Pastikan API Key RamaShop aktif.");
            btnPay.disabled = false;
            btnPay.textContent = "Bayar Rp 2.000 via QRIS";
        }

    } catch (err) {
        alert("Terjadi kesalahan sistem: " + err.message);
        btnPay.disabled = false;
        btnPay.textContent = "Bayar Rp 2.000 via QRIS";
    }
}

// ----------------------------------------------------
// 3. LOGIKA SEND EMAIL & VERIFY LINK
// ----------------------------------------------------

async function executeSendEmail() {
    const emailInput = document.getElementById('target-email').value.trim();
    const resultBox = document.getElementById('result-status');

    if (!emailInput) {
        alert("Harap masukkan email target terlebih dahulu!");
        return;
    }

    currentSessionEmail = emailInput;
    resultBox.style.display = "block";
    resultBox.className = "status-box";
    resultBox.textContent = "Mengirim link verifikasi ke email...";

    try {
        const res = await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput })
        });

        const data = await res.json();
        resultBox.textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    } catch (err) {
        resultBox.className = "status-box failed";
        resultBox.textContent = "Gagal mengirim email: " + err.message;
    }
}

async function executeVerifyLink() {
    const linkInput = document.getElementById('verify-link').value.trim();
    const emailInput = currentSessionEmail || document.getElementById('target-email').value.trim();
    const resultBox = document.getElementById('result-status');

    if (!linkInput) {
        alert("Harap tempel link verifikasi terlebih dahulu!");
        return;
    }

    resultBox.style.display = "block";
    resultBox.className = "status-box";
    resultBox.textContent = "Memproses verifikasi link...";

    try {
        const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: linkInput, email: emailInput })
        });

        const data = await res.json();

        // Evaluasi respon verifikasi
        if (res.ok) {
            resultBox.className = "status-box success";
            resultBox.innerHTML = `
                <b style="font-size: 16px;"> Berhasil Premium!</b><br>
                Masa aktif sewa: <b>3 Hari</b>.<br>
                Silakan login ke aplikasi <b>Alight Motion</b> dengan email ini: <br>
                <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${emailInput}</code>
            `;
        } else {
            resultBox.className = "status-box failed";
            resultBox.innerHTML = `
                <b>❌ Gagal Premium</b><br>
                Alasan: ${data.message || data.error || 'Link verifikasi tidak valid atau kedaluwarsa.'}
            `;
        }
    } catch (err) {
        resultBox.className = "status-box failed";
        resultBox.innerHTML = `<b>❌ Gagal Premium karena:</b> ${err.message}`;
    }
}