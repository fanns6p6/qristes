export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Mengambil API Key dari Environment Variable Vercel
  const RAMASHOP_API_KEY = process.env.RAMASHOP_API_KEY;

  try {
    // Sesuai dokumentasi: POST /api/public/deposit/create
    const response = await fetch('https://ramashop.my.id/api/public/deposit/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': RAMASHOP_API_KEY
      },
      body: JSON.stringify({
        amount: 2000,
        method: 'qris'
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal membuat QRIS', message: error.message });
  }
}