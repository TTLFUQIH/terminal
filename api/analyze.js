import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { imageBase64, mediaType, pair, tf } = req.body;

    if (!imageBase64 || !pair || !tf) {
      return res.status(400).json({ error: 'Faltan datos: imageBase64, pair, tf' });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/png',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Sos un experto en análisis técnico con metodología TTL (Trade To Live).

Analizá este chart de ${pair} en timeframe ${tf} y detectá OB Ocultos válidos.

DEFINICIÓN DE OB OCULTO:
- C1 = cierre de vela máximo (LONG) o mínimo (SHORT) antes del impulso
- Impulso = vela agresiva de MAYOR VOLUMEN que rompe C1
- El precio vuelve después y toca la zona con mecha o cierre
- C2 = cierre de esa vela de retest
- OB = rectángulo entre C1 y C2
- Solo OBs NO mitigados (sin 3+ cierres dentro del rango)

Leé los precios exactos del eje derecho del chart.

Respondé SOLO en JSON sin texto adicional:
{
  "obs": [
    {
      "tipo": "OB Oculto",
      "direccion": "SHORT" o "LONG",
      "low": número,
      "high": número,
      "descripcion": "breve descripción"
    }
  ],
  "resumen": "texto breve del análisis"
}`
            }
          ]
        }
      ]
    });

    const text = response.content[0].text;
    return res.status(200).json({ result: text });

  } catch (error) {
    console.error('Error en analyze:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
