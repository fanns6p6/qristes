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

    // 1. Request QRIS ke backend
    const res = await callInternalApi('/api/create-qris', { email: emailValue });
    
    if (res && res.qris_url) { // Sesuaikan key response dari ramashop (misal: qris_url atau qr_image)
        document.getElementById('qris-image').src = res.qris_url;
        document.getElementById('qris-container').style.display = 'block';
        
        // Simpan trx_id untuk pengecekan status
        const trxId = res.trx_id; 

        // 2. Lakukan pengecekan status otomatis tiap 3 detik (Polling)
        document.getElementById('qris-status').textContent = "Menunggu Pembayaran...";
        
        if (checkInterval) clearInterval(checkInterval);

        checkInterval = setInterval(async () => {
            const checkRes = await fetch('/api/check-qris', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trx_id: trxId })
            });
            const checkData = await checkRes.json();

            // Jika status pembayaran sukses (biasanya bernilai "PAID" atau "success")
            if (checkData.status === "PAID" || checkData.status === "success") {
                clearInterval(checkInterval);
                document.getElementById('qris-status').textContent = " Pembayaran Berhasil! Mengirim email...";
                
                // 3. OTOMATIS JALANKAN /api/send SETELAH LUNAS
                sessionStorage.setItem('last_sent_email', emailValue);
                const sendRes = await callInternalApi('/api/send', { email: emailValue });

                // 4. Buka kunci bagian verifikasi
                document.getElementById('verify-section').style.opacity = '1';
                document.getElementById('verify-section').style.pointerEvents = 'auto';
                alert("Pembayaran lunas! Link verifikasi telah dikirim ke email Anda.");
            }
        }, 3000); // Cek tiap 3 detik
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