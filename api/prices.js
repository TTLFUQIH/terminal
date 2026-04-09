export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const r = await fetch('https://api.binance.com/api/v3/ticker/price');
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=5');
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
