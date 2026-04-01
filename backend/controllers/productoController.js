import Producto from '../models/Producto.js';

// Obtener todos los productos (Modelos)
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

// Crear un nuevo producto (Modelo)
export const createProducto = async (req, res) => {
  try {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial } = req.body;

    // Validación básica: modelo es indispensable
    if (!modelo) {
      return res.status(400).json({ message: 'El campo modelo es obligatorio' });
    }

    const savedProducto = await Producto.create({
      modelo,
      id_categoria: id_categoria || null, // Permite null como en tu BD
      stock,
      precio,
      estado,
      tallas,
      cantidad_inicial
    });

    res.status(201).json(savedProducto);
  } catch (error) {
    console.error("ERROR EN CREATE:", error);
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un producto (Modelo)
export const updateProducto = async (req, res) => {
  try {
    const { modelo, id_categoria, stock, precio, estado, tallas, cantidad_inicial } = req.body;
    const { id } = req.params;

    if (!modelo) {
      return res.status(400).json({ message: 'El campo modelo es obligatorio' });
    }

    // 1. Verificamos si existe
    const existe = await Producto.findByPk(id);
    if (!existe) {
      return res.status(404).json({ message: 'Modelo no encontrado' });
    }

    // 2. Actualizamos
    const updatedProducto = await Producto.update(id, {
      modelo,
      id_categoria: id_categoria || null,
      stock,
      precio,
      estado,
      tallas,
      cantidad_inicial
    });

    res.json(updatedProducto);
  } catch (error) {
    console.error("ERROR EN UPDATE:", error); 
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un producto (Modelo)
export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificamos si existe
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