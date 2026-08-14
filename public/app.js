let checkInterval = null;

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
        let data = contentType.includes("application/json") ? await response.json() : await response.text();
        
        outputBox.textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        return data;
    } catch (error) {
        outputBox.textContent = `Error: ${error.message}`;
    }
}

// Tombol 1: Buat QRIS
document.getElementById('btn-pay').addEventListener('click', async () => {
    const emailValue = document.getElementById('email-input').value.trim();
    if (!emailValue) {
        alert("Harap masukkan email terlebih dahulu!");
        return;
    }

    const outputBox = document.getElementById('response-output');
    outputBox.textContent = "Membuat QRIS Rp2.000...";

    // 1. Request QRIS ke backend kita
    const res = await callInternalApi('/api/create-qris', { email: emailValue });
    
    // Pastikan response sukses berdasarkan dokumentasi RamaShop (success: true)
    if (res && res.success === true && res.data) { 
        
        // Ambil URL QR dan tampilkan ke layar
        document.getElementById('qris-image').src = res.data.qrImage;
        document.getElementById('qris-container').style.display = 'block';
        
        // Tampilkan nominal yang harus dibayar (termasuk kode unik)
        document.getElementById('qris-status').innerHTML = `Menunggu Pembayaran: <br><b>Rp ${res.data.totalAmount}</b><br><small>(Harus sesuai hingga 3 digit terakhir!)</small>`;
        
        // Simpan ID Deposit untuk dicek
        const depositId = res.data.depositId; 

        if (checkInterval) clearInterval(checkInterval);

        // 2. Lakukan pengecekan status otomatis tiap 5 detik (Sesuai cache server RamaShop)
        checkInterval = setInterval(async () => {
            const checkRes = await fetch('/api/check-qris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trx_id: depositId })
            });
            const checkData = await checkRes.json();

            // Jika status sukses atau already (sesuai docs RamaShop)
            if (checkData.status === true && checkData.data && (checkData.data.status === "success" || checkData.data.status === "already")) {
                clearInterval(checkInterval);
                document.getElementById('qris-status').innerHTML = "✅ <b>Pembayaran Berhasil! Mengirim email...</b>";
                
                // 3. OTOMATIS JALANKAN /api/send
                sessionStorage.setItem('last_sent_email', emailValue);
                const sendRes = await callInternalApi('/api/send', { email: emailValue });

                // 4. Buka kunci form verifikasi
                document.getElementById('verify-section').style.opacity = '1';
                document.getElementById('verify-section').style.pointerEvents = 'auto';
                alert("Pembayaran lunas! Link verifikasi telah dikirim ke email Anda.");
            }
        }, 5000); // Polling setiap 5 detik
    } else {
        alert("Gagal membuat QRIS, pastikan saldo akun API cukup dan API Key valid.");
    }
});

// Tombol 2: Verify Link
document.getElementById('btn-verify').addEventListener('click', () => {
    const linkValue = document.getElementById('verify-input').value.trim();
    const emailValue = sessionStorage.getItem('last_sent_email') || document.getElementById('email-input').value.trim();
    
    if (!linkValue) {
        alert("Harap tempel link verifikasi terlebih dahulu!");
        return;
    }
    
    callInternalApi('/api/verify', { link: linkValue, email: emailValue });
});