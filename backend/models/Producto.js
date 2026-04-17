import pool from '../config/db.js';

let hasColoresColumnCache = null;

const hasColoresColumn = async () => {
  if (hasColoresColumnCache !== null) return hasColoresColumnCache;

  const sql = `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'productos'
      AND COLUMN_NAME = 'colores'
    LIMIT 1`;

  const [rows] = await pool.query(sql);
  hasColoresColumnCache = rows.length > 0;
  return hasColoresColumnCache;
};

const Producto = {
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

  async create(producto) {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, registrado_por, colores } = producto;
    
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

    const includeColores = await hasColoresColumn();
    const sql = includeColores
      ? `
      INSERT INTO productos 
      (modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, registrado_por, colores) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `
      INSERT INTO productos 
      (modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, registrado_por) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = includeColores
      ? [
          modelo,
          id_categoria,
          valStock,
          valPrecio,
          estado || 'activo',
          valTallas,
          valCantidadInicial,
          registrado_por || null,
          colores || null,
        ]
      : [
          modelo,
          id_categoria,
          valStock,
          valPrecio,
          estado || 'activo',
          valTallas,
          valCantidadInicial,
          registrado_por || null,
        ];

    const [result] = await pool.query(sql, params);
    
    return { 
      id_producto: result.insertId, 
      ...producto, 
      precio: valPrecio, 
      tallas: valTallas, 
      cantidad_inicial: valCantidadInicial 
    };
  },

  async update(id, producto) {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, colores } = producto;
    
    const valCantidadInicial = Math.max(0, Math.round(Number(cantidad_inicial) || 0));
    const valPrecio = Number(precio) || 0;
    const valStock = Math.max(0, Math.round(Number(stock) || 0));

    if (Number(stock) !== valStock) {
      console.warn(`Ajustando stock a entero seguro (UPDATE): recibido=${stock}, guardado=${valStock}`);
    }
    if (Number(cantidad_inicial) !== valCantidadInicial) {
      console.warn(`Ajustando cantidad_inicial a entero seguro (UPDATE): recibido=${cantidad_inicial}, guardado=${valCantidadInicial}`);
    }

    const includeColores = await hasColoresColumn();
    const sql = includeColores
      ? `
      UPDATE productos 
      SET modelo = ?, id_categoria = ?, stock = ?, precio = ?, estado = ?, tallas = ?, cantidad_inicial = ?, colores = ? 
      WHERE id_producto = ?`
      : `
      UPDATE productos 
      SET modelo = ?, id_categoria = ?, stock = ?, precio = ?, estado = ?, tallas = ?, cantidad_inicial = ? 
      WHERE id_producto = ?`;

    const params = includeColores
      ? [
          modelo,
          id_categoria,
          valStock,
          valPrecio,
          estado,
          tallas,
          valCantidadInicial,
          colores || null,
          id,
        ]
      : [
          modelo,
          id_categoria,
          valStock,
          valPrecio,
          estado,
          tallas,
          valCantidadInicial,
          id,
        ];

    await pool.query(sql, params);
    
    return this.findByPk(id); 
  },

  async destroy(id) {
    const sql = 'DELETE FROM productos WHERE id_producto = ?';
    const [result] = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  }
};

export default Producto;