export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const { imageBase64, mediaType, pair, tf } = req.body;
    if (!imageBase64 || !pair || !tf) return res.status(400).json({ error: 'Faltan parámetros' });

    const systemPrompt = `Sos un experto en análisis técnico de trading con la metodología TTL (Trade To Live).

Tu tarea es identificar OB Ocultos (Order Blocks Ocultos) en el chart.

DEFINICIÓN DE OB OCULTO:
- Hay un nivel de precio previo (C1) — un cierre de vela mínimo (para SHORT) o máximo (para LONG)
- Una vela agresiva de alto volumen rompe ese nivel con fuerza (roja para SHORT, verde para LONG)
- Después de un tiempo, el precio vuelve a esa zona y toca con mecha o cierre esa misma zona
- C2 = el cierre de vela más cercano al impulso desde el lado contrario cuando el precio retorna
- El OB = rectángulo entre C1 y C2
- La vela de impulso siempre es la de mayor volumen del movimiento

REGLAS:
- Solo identificar OBs que NO estén mitigados (sin 3+ cierres de vela dentro del rango)
- Leer los precios exactos del eje derecho del chart
- El par es ${pair} en timeframe ${tf}

Respondé SOLO en JSON sin texto adicional ni backticks:
{
  "obs": [
    {
      "tipo": "OB Oculto",
      "direccion": "SHORT" o "LONG",
      "low": numero,
      "high": numero,
      "descripcion": "breve descripcion"
    }
  ],
  "resumen": "texto breve"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 }
            },
            { type: 'text', text: `Analizá este chart de ${pair} en ${tf} e identificá los OB Ocultos válidos.` }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Error de Claude API' });

    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ result: text });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
