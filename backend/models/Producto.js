import pool from '../config/db.js';

const Producto = {
  // 1. Obtener todos los productos
  async find() {
    try {
      const sql = `
        SELECT p.*, c.nombre_categoria 
        FROM productos p 
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria`;
      const [rows] = await pool.query(sql);
      return rows;
    } catch (error) {
      throw error; 
    }
  },

  // 2. Obtener un producto por ID
  async findById(id) {
    try {
      const sql = `
        SELECT p.*, c.nombre_categoria 
        FROM productos p 
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
        WHERE p.id_producto = ? LIMIT 1`;
      const [rows] = await pool.query(sql, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // 3. Crear un nuevo producto
  async create(producto) {
    const { descripcion, modelo, id_categoria, stock, precio, estado } = producto;
    const [result] = await pool.query(
      'INSERT INTO productos (descripcion, modelo, id_categoria, stock, precio, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [descripcion, modelo, id_categoria, stock, precio, estado]
    );
    return { id_producto: result.insertId, ...producto };
  },

  // 4. Actualizar producto
  async findByIdAndUpdate(id, producto) {
    const { descripcion, modelo, id_categoria, stock, precio, estado } = producto;
    await pool.query(
      'UPDATE productos SET descripcion = ?, modelo = ?, id_categoria = ?, stock = ?, precio = ?, estado = ? WHERE id_producto = ?',
      [descripcion, modelo, id_categoria, stock, precio, estado, id]
    );
    return this.findById(id); 
  },

  // 5. Eliminar producto
  async findByIdAndDelete(id) {
    const [result] = await pool.query('DELETE FROM productos WHERE id_producto = ?', [id]);
    return result.affectedRows > 0;
  },
};

export default Producto;