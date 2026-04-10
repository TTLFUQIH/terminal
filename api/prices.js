export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SYMBOLS = ['BTCUSDT','ETHUSDT','XRPUSDT','SOLUSDT','BNBUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT'];

  // Try Binance.US first
  try {
    const r = await fetch('https://api.binance.us/api/v3/ticker/price', {
      headers: { 'User-Agent': 'TTL-Terminal/1.0' }
    });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) {
        const filtered = data.filter(t => SYMBOLS.includes(t.symbol));
        res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
        return res.status(200).json(filtered);
      }
    }
  } catch(e) {}

  // Fallback: Bybit
  try {
    const results = await Promise.all(SYMBOLS.map(async sym => {
      const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym}`);
      const json = await r.json();
      const item = json?.result?.list?.[0];
      return item ? { symbol: sym, price: item.lastPrice } : null;
    }));
    const filtered = results.filter(Boolean);
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
    return res.status(200).json(filtered);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
