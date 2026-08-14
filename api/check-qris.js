export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trx_id } = req.body; // ID transaksi dari RamaShop
  const RAMASHOP_API_KEY = process.env.RAMASHOP_API_KEY;

  try {
    const response = await fetch(`https://ramashop.my.id/api/check-status?trx_id=${trx_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RAMASHOP_API_KEY}`
      }
    });

    const data = await response.json();
    res.status(response.status).json(data); // Biasanya mengembalikan status: "PAID" atau "PENDING"
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengecek status', message: error.message });
  }
}