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
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      temperature: 0,
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
              text: `Analizá esta imagen de un chart de ${pair} en timeframe ${tf}.

Tu única fuente de información es esta imagen. No uses conocimiento externo sobre el activo.

TAREA: Identificar OB Ocultos visibles en el chart.

Un OB Oculto se forma así:
- Existe un cierre previo importante (C1) visible en el chart
- Una vela grande y fuerte visualmente rompe ese cierre (vela de impulso) — el volumen elevado es una señal de apoyo pero no es condición obligatoria
- El precio vuelve después y toca esa zona con mecha o cierre (C2)
- El OB es el rectángulo entre C1 y C2
- Si tiene 3 o más cierres dentro del rango = está mitigado = NO lo reportes

IMPORTANTE:
- Lee los precios EXACTAMENTE del eje derecho de la imagen
- Si no podés leer un precio con precisión del eje, NO reportes ese OB
- Solo reportá OBs claramente visibles en esta imagen
- Máximo 3 OBs
- NO uses memoria de precios históricos del activo

Respondé SOLO en JSON:
{
  "obs": [
    {
      "tipo": "OB Oculto",
      "direccion": "SHORT" o "LONG",
      "low": número leído del eje derecho,
      "high": número leído del eje derecho,
      "descripcion": "describí C1, el impulso y C2 que ves en la imagen"
    }
  ],
  "resumen": "resumen de lo que ves en el chart"
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
