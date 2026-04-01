import asyncHandler from 'express-async-handler';
import pool from '../config/db.js';

// Obtener todas las tallas registradas en los productos
export const getTallas = asyncHandler(async (req, res) => {
  // Extraemos el ID, el modelo para identificarlo, las tallas y la cantidad inicial
  const sql = 'SELECT id_producto, modelo, tallas, cantidad_inicial FROM productos';
  const [rows] = await pool.query(sql);
  
  res.status(200).json(rows);
});

// Actualizar las tallas de un producto específico
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

// Eliminar las tallas (limpiar los campos) de un producto
export const deleteTalla = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // En lugar de borrar el producto, limpiamos los campos de tallas
  const sql = 'UPDATE productos SET tallas = "", cantidad_inicial = 0 WHERE id_producto = ?';
  const [result] = await pool.query(sql, [id]);

  if (result.affectedRows === 0) {
    res.status(404);
    throw new Error('Producto no encontrado');
  }

  res.status(200).json({ message: 'Tallas eliminadas del registro' });
});