import Producto from '../models/Producto.js';
import pool from '../config/db.js';

const isValidModelo = (value = '') => {
  const modelo = String(value || '').trim();
  if (!modelo) return false;
  if (/^-+$/.test(modelo)) return false;
  return /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/.test(modelo);
};

const isValidTallaValue = (value = '') => {
  const talla = String(value || '').trim();
  if (!talla) return false;
  if (talla.includes('-')) return false;
  return /[A-Za-z0-9]/.test(talla);
};

const areValidTallas = (rawTallas = '') => {
  const lista = String(rawTallas || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.toLowerCase() !== 'sin talla');

  return lista.length > 0 && lista.every((item) => isValidTallaValue(item));
};

const isValidColorValue = (value = '') => {
  const color = String(value || '').trim();
  if (!color) return false;
  if (/^-+$/.test(color)) return false;
  return /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(color);
};

const areValidColores = (rawColores = '') => {
  const lista = String(rawColores || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const normalized = item.toLowerCase();
      return normalized !== 'sin color' && normalized !== 'sin colores';
    });

  return lista.length > 0 && lista.every((item) => isValidColorValue(item));
};

// Obtener todos los productos
export const getProductos = async (req, res) => {
  try {
    const productos = await Producto.findAll();
    res.json(productos);
  } catch (error) {
    console.error("ERROR EN GET PRODUCTOS:", error); 
    res.status(500).json({ message: error.message });
  }
};

// Obtener un producto por ID
export const getProductoById = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ message: 'Modelo no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo producto — toma el nombre del usuario logueado desde req.user
export const createProducto = async (req, res) => {
  try {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, colores } = req.body;

    if (!isValidModelo(modelo)) {
      return res.status(400).json({ message: 'El modelo es obligatorio y no puede ser solo guiones o símbolos.' });
    }

    if (!areValidTallas(tallas)) {
      return res.status(400).json({ message: 'La talla es obligatoria y no puede ser solo guiones o símbolos.' });
    }

    if (!areValidColores(colores)) {
      return res.status(400).json({ message: 'El color es obligatorio y no puede ser solo guiones o símbolos.' });
    }

    // Verificar duplicado: mismo modelo en la misma categoría
    const [duplicado] = await pool.query(
      'SELECT id_producto FROM productos WHERE LOWER(modelo) = LOWER(?) AND id_categoria = ? LIMIT 1',
      [modelo.trim(), id_categoria || null]
    );
    if (duplicado.length > 0) {
      return res.status(409).json({ message: 'Ya existe un modelo con ese nombre en esta categoría' });
    }

    // req.user lo pone el middleware protect, tiene los datos del usuario logueado
    const registrado_por = req.user?.nombre || req.user?.email || 'Desconocido';

    const savedProducto = await Producto.create({
      modelo,
      id_categoria: id_categoria || null,
      stock,
      precio,
      estado,
      tallas,
      cantidad_inicial,
      registrado_por,
      colores // Se incluye colores en el objeto
    });

    res.status(201).json(savedProducto);
  } catch (error) {
    console.error("ERROR EN CREATE:", error);
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un producto
export const updateProducto = async (req, res) => {
  try {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial, colores } = req.body;
    const { id } = req.params;

    if (!isValidModelo(modelo)) {
      return res.status(400).json({ message: 'El modelo es obligatorio y no puede ser solo guiones o símbolos.' });
    }

    if (!areValidTallas(tallas)) {
      return res.status(400).json({ message: 'La talla es obligatoria y no puede ser solo guiones o símbolos.' });
    }

    if (!areValidColores(colores)) {
      return res.status(400).json({ message: 'El color es obligatorio y no puede ser solo guiones o símbolos.' });
    }

    const existe = await Producto.findByPk(id);
    if (!existe) {
      return res.status(404).json({ message: 'Modelo no encontrado' });
    }

    const updatedProducto = await Producto.update(id, {
      modelo,
      id_categoria: id_categoria || null,
      stock,
      precio,
      estado,
      tallas,
      cantidad_inicial,
      colores
    });

    res.json(updatedProducto);
  } catch (error) {
    console.error("ERROR EN UPDATE:", error); 
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un producto
export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existe = await Producto.findByPk(id);
    if (!existe) {
      return res.status(404).json({ message: 'Modelo no encontrado' });
    }

    const eliminado = await Producto.destroy(id);
    if (eliminado) {
      res.json({ message: 'Modelo eliminado del inventario' });
    } else {
      res.status(400).json({ message: 'No se pudo eliminar el modelo' });
    }
  } catch (error) {
    console.error("ERROR EN DELETE:", error); 
    res.status(500).json({ message: error.message });
  }
};