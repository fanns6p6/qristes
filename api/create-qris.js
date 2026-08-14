export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  // Anda bisa simpan API Key RamaShop di Environment Variables Vercel (RAMASHOP_API_KEY)
  const RAMASHOP_API_KEY = process.env.RAMASHOP_API_KEY; 

  try {
    // Sesuaikan endpoint dan parameter ini dengan dokumentasi asli di https://ramashop.my.id/docs.html
    const response = await fetch('https://ramashop.my.id/api/create-qris', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RAMASHOP_API_KEY}`
      },
      body: JSON.stringify({
        amount: 2000, // Harga tetap 2k
        note: `AlightMotion - ${email}`
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat QRIS', message: error.message });
  }
}