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
    const { imageBase64, mediaType, pair, tf, existingOBs } = req.body;

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
              text: `Sos un experto en análisis técnico con metodología TTL (Trade To Live).\n\nAnalizá este chart de ${pair} en timeframe ${tf} y detectá OB Ocultos válidos.\n\nDEFINICIÓN DE OB OCULTO:\n- C1 = cierre de vela máximo (SHORT) o mínimo (LONG) antes del impulso\n- Impulso = vela grande y fuerte que rompe C1\n- El precio vuelve después y toca el cuerpo de la vela de impulso con mecha o cierre\n- C2 = cierre de esa vela de retest\n- OB = rectángulo entre C1 y C2\n- Dentro del OB solo quedan mechas o el cuerpo de la vela de impulso, nunca cierres de otras velas\n- Si tiene 3 o más cierres dentro del rango = mitigado = NO reportar\n\nLee los precios exactos del eje derecho del chart.\nSolo reportá OBs claramente visibles en esta imagen.\nNo uses conocimiento externo sobre el activo.\nMáximo 3 OBs.\n\nIMPORTANTE: Un OB Extremo es el punto más extremo del movimiento donde el precio nunca tuvo un cierre previo en esa dirección que el impulso rompiera. Si ves un mínimo o máximo absoluto del chart sin un C1 claro del lado opuesto, NO es un OB Oculto — es un OB Extremo, NO lo reportes.\n\nLos siguientes rangos ya están detectados como OB Extremo por el sistema — NO reportar OBs en estas zonas: ${existingOBs}\n\nRespondé SOLO en JSON sin texto adicional:\n{\n  "obs": [\n    {\n      "tipo": "OB Oculto",\n      "direccion": "SHORT" o "LONG",\n      "low": número,\n      "high": número,\n      "descripcion": "describí C1, el impulso y el retest que ves"\n    }\n  ],\n  "resumen": "resumen breve"\n}`
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
