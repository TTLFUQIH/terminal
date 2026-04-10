export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol, interval, limit } = req.query;
  if (!symbol || !interval) return res.status(400).json({ error: 'Missing params' });
  const lim = limit || 100;

  // Map Binance interval to Bybit interval
  const bybitIntervalMap = {
    '1m':'1','3m':'3','5m':'5','15m':'15','30m':'30',
    '1h':'60','4h':'240','1d':'D','1w':'W','1M':'M'
  };

  // Try Binance.US first
  try {
    const url = `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${lim}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'TTL-Terminal/1.0' } });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) {
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
        return res.status(200).json(data);
      }
    }
  } catch(e) {}

  // Fallback: Bybit
  try {
    const bybitInterval = bybitIntervalMap[interval] || interval;
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${lim}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Bybit ${r.status}`);
    const json = await r.json();
    // Convert Bybit format to Binance format
    // Bybit: [startTime, open, high, low, close, volume, turnover]
    // Binance: [openTime, open, high, low, close, volume, closeTime, ...]
    const list = json?.result?.list || [];
    const converted = list.reverse().map(k => [
      parseInt(k[0]), k[1], k[2], k[3], k[4], k[5],
      parseInt(k[0]) + 60000, '0', '0', '0', '0', '0'
    ]);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate');
    return res.status(200).json(converted);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
