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
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // 3. Crear un nuevo producto — ahora guarda registrado_por
  async create(producto) {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, registrado_por } = producto;
    
    const valPrecio = Number(precio) || 0;
    const valTallas = tallas || 'N/A';
    const valCantidadInicial = Math.max(0, Math.round(Number(cantidad_inicial) || 0));
    const valStock = Math.max(0, Math.round(Number(stock) || 0));

    if (Number(stock) !== valStock) {
      console.warn(`Ajustando stock a entero seguro: recibido=${stock}, guardado=${valStock}`);
    }
    if (Number(cantidad_inicial) !== valCantidadInicial) {
      console.warn(`Ajustando cantidad_inicial a entero seguro: recibido=${cantidad_inicial}, guardado=${valCantidadInicial}`);
    }

    const sql = `
      INSERT INTO productos 
      (modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, registrado_por) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
    const [result] = await pool.query(sql, [
      modelo, 
      id_categoria, 
      valStock, 
      valPrecio, 
      estado || 'activo', 
      valTallas, 
      valCantidadInicial,
      registrado_por || null
    ]);
    
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
    
    const valCantidadInicial = Math.max(0, Math.round(Number(cantidad_inicial) || 0));
    const valPrecio = Number(precio) || 0;
    const valStock = Math.max(0, Math.round(Number(stock) || 0));

    if (Number(stock) !== valStock) {
      console.warn(`Ajustando stock a entero seguro (UPDATE): recibido=${stock}, guardado=${valStock}`);
    }
    if (Number(cantidad_inicial) !== valCantidadInicial) {
      console.warn(`Ajustando cantidad_inicial a entero seguro (UPDATE): recibido=${cantidad_inicial}, guardado=${valCantidadInicial}`);
    }

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