import pool from '../config/db.js';

const Producto = {
  // 1. Obtener todos los productos (Modelos)
  async findAll() {
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
  async findByPk(id) {
    try {
      const sql = `
        SELECT p.*, c.nombre_categoria 
        FROM productos p 
        LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
        WHERE p.id_producto = ? LIMIT 1`;
      const [rows] = await pool.query(sql, [id]);
      return rows[0]; // Retorna el objeto o undefined
    } catch (error) {
      throw error;
    }
  },

  // 3. Crear un nuevo producto (Modelo)
  async create(producto) {
    // Quitamos 'descripcion'
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial } = producto;
    
    // Asignamos valores por defecto si vienen vacíos (para coincidir con las reglas de tu BD)
    const valPrecio = precio || 0;
    const valTallas = tallas || 'N/A';
    const valCantidadInicial = cantidad_inicial || 0;

    const sql = `
      INSERT INTO productos 
      (modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
    const [result] = await pool.query(sql, [
      modelo, 
      id_categoria, 
      stock || 0, 
      valPrecio, 
      estado || 'activo', 
      valTallas, 
      valCantidadInicial
    ]);
    
    // Retornamos el objeto recién creado
    return { 
      id_producto: result.insertId, 
      ...producto, 
      precio: valPrecio, 
      tallas: valTallas, 
      cantidad_inicial: valCantidadInicial 
    };
  },

  // 4. Actualizar producto
  async update(id, producto) {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial } = producto;
    
    // Validación de campos vacíos dentro de la función para evitar el error de MySQL
    const valCantidadInicial = cantidad_inicial === '' ? 0 : cantidad_inicial;
    const valPrecio = precio === '' ? 0 : precio;
    const valStock = stock === '' ? 0 : stock;

    const sql = `
      UPDATE productos 
      SET modelo = ?, id_categoria = ?, stock = ?, precio = ?, estado = ?, tallas = ?, cantidad_inicial = ? 
      WHERE id_producto = ?`;
      
    await pool.query(sql, [
      modelo, 
      id_categoria, 
      valStock, 
      valPrecio, 
      estado, 
      tallas, 
      valCantidadInicial, 
      id
    ]);
    
    return this.findByPk(id); 
  },

  // 5. Eliminar producto
  async destroy(id) {
    const sql = 'DELETE FROM productos WHERE id_producto = ?';
    const [result] = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  }
};

export default Producto;