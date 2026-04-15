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
              text: `Analizá esta imagen de un chart de ${pair} en timeframe ${tf}. Tu única fuente de información es esta imagen. No uses conocimiento externo sobre el activo.

TAREA: Identificar OB Ocultos visibles en el chart.

DEFINICIÓN EXACTA DE OB OCULTO — EL LADRILLO:
Un OB Oculto es un rectángulo delimitado por DOS cierres de vela específicos:
- C1 = el cierre de vela más extremo ANTES del impulso (máximo cierre para SHORT, mínimo cierre para LONG)
- C2 = el cierre de la vela de retest cuando el precio vuelve a tocar el cuerpo de la vela de impulso
- El OB es el rectángulo entre C1 y C2

PARA SHORT:
- C1 = cierre máximo antes del impulso bajista
- La vela de impulso es una vela bajista grande que rompe C1 cerrando por debajo
- El precio vuelve después con mecha o cierre tocando el cuerpo de la vela de impulso
- C2 = cierre de esa vela de retest
- OB = rectángulo entre C2 (low) y C1 (high)
- Dentro del OB solo quedan mechas o el cuerpo de la vela de impulso — nunca cierres de otras velas

PARA LONG:
- C1 = cierre mínimo antes del impulso alcista
- La vela de impulso es una vela alcista grande que rompe C1 cerrando por encima
- El precio vuelve después con mecha o cierre tocando el cuerpo de la vela de impulso
- C2 = cierre de esa vela de retest
- OB = rectángulo entre C1 (low) y C2 (high)
- Dentro del OB solo quedan mechas o el cuerpo de la vela de impulso — nunca cierres de otras velas

LO QUE INVALIDA UN OB:
- Si hay 3 o más cierres de vela dentro del rango = OB mitigado = NO reportar
- Si no podés identificar claramente C1, el impulso y el retest en la imagen = NO reportar

REGLAS ESTRICTAS:
- Lee los precios EXACTAMENTE del eje derecho de la imagen
- Si no podés leer un precio con precisión del eje, NO reportes ese OB
- Solo reportá OBs donde puedas identificar claramente C1, el impulso y el retest
- Máximo 3 OBs
- NO uses memoria de precios históricos del activo

Respondé SOLO en JSON sin texto adicional:
{
  "obs": [
    {
      "tipo": "OB Oculto",
      "direccion": "SHORT" o "LONG",
      "low": número leído del eje derecho,
      "high": número leído del eje derecho,
      "descripcion": "describí exactamente cuál es C1, cuál es el impulso y cuál es el retest que ves en la imagen"
    }
  ],
  "resumen": "resumen breve de lo que ves"
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
