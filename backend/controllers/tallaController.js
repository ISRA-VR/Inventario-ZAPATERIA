import asyncHandler from 'express-async-handler';
import pool from '../config/db.js';

export const getTallas = asyncHandler(async (req, res) => {
  const sql = 'SELECT id_producto, modelo, tallas, cantidad_inicial FROM productos';
  const [rows] = await pool.query(sql);
  res.status(200).json(rows);
});

export const updateTalla = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tallas, cantidad_inicial } = req.body;

  const sql = 'UPDATE productos SET tallas = ?, cantidad_inicial = ? WHERE id_producto = ?';
  const [result] = await pool.query(sql, [tallas, cantidad_inicial, id]);

  if (result.affectedRows === 0) {
    res.status(404);
    throw new Error('Producto no encontrado para actualizar tallas');
  }

  res.status(200).json({ message: 'Tallas actualizadas correctamente' });
});
