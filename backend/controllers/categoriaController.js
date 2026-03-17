import pool from '../config/db.js';

export const getCategorias = async (req, res) => {
  const sql = `
    SELECT 
      c.id_categoria, 
      c.nombre_categoria, 
      c.descripcion,
      COALESCE(SUM(p.stock), 0) as cantidad_productos
    FROM categorias c
    LEFT JOIN productos p ON c.id_categoria = p.id_categoria
    GROUP BY c.id_categoria, c.nombre_categoria, c.descripcion
    ORDER BY c.nombre_categoria ASC
  `;
  try {
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const createCategoria = async (req, res) => {
  const { nombre_categoria, descripcion } = req.body;

  if (!nombre_categoria) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO categorias (nombre_categoria, descripcion) VALUES (?, ?)',
      [nombre_categoria, descripcion]
    );
    res.status(201).json({
      message: 'Categoría creada exitosamente',
      id_categoria: result.insertId,
    });
  } catch (error) {
    console.error('Error al crear la categoría:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const updateCategoria = async (req, res) => {
  const { id } = req.params;
  const { nombre_categoria, descripcion } = req.body;

  if (!nombre_categoria) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE categorias SET nombre_categoria = ?, descripcion = ? WHERE id_categoria = ?',
      [nombre_categoria, descripcion, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar la categoría:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const deleteCategoria = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM categorias WHERE id_categoria = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar la categoría:', error);
    // Manejar error de clave foránea
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ message: 'No se puede eliminar la categoría porque tiene productos asociados.' });
    }
    res.status(500).json({ message: 'Error del servidor' });
  }
};
