import sql from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET — traer zonas de un usuario
    if (req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Falta user_id' });
      const zones = await sql`
        SELECT * FROM zones WHERE user_id = ${user_id} ORDER BY created_at DESC
      `;
      return res.status(200).json({ zones });
    }

    // POST — guardar zona nueva
    if (req.method === 'POST') {
      const { user_id, pair, type, ob_tf, low, high, direction, source } = req.body;
      if (!user_id || !pair || !low || !high) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }
      const result = await sql`
        INSERT INTO zones (user_id, pair, type, ob_tf, low, high, direction, source)
        VALUES (${user_id}, ${pair}, ${type}, ${ob_tf}, ${low}, ${high}, ${direction}, ${source || 'manual'})
        RETURNING *
      `;
      return res.status(201).json({ zone: result[0] });
    }

    // DELETE — borrar zona
    if (req.method === 'DELETE') {
      const { id, user_id } = req.body;
      if (!id || !user_id) return res.status(400).json({ error: 'Faltan datos' });
      await sql`
        DELETE FROM zones WHERE id = ${id} AND user_id = ${user_id}
      `;
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (error) {
    console.error('Error en zones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
