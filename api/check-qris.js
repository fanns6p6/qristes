export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trx_id } = req.body; // trx_id ini berisi depositId
  const RAMASHOP_API_KEY = process.env.RAMASHOP_API_KEY;

  try {
    // Sesuai dokumentasi: GET /api/public/deposit/status/{depositId}
    const response = await fetch(`https://ramashop.my.id/api/public/deposit/status/${trx_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': RAMASHOP_API_KEY
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengecek status', message: error.message });
  }
}