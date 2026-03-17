import Producto from '../models/Producto.js';

// Obtener todos los productos
export const getProductos = async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    console.error("ERROR EN EL CONTROLADOR:", error); 
    res.status(500).json({ message: error.message });
  }
};

// Obtener un producto por ID
export const getProductoById = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(producto);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo producto
export const createProducto = async (req, res) => {
  try {
    const savedProducto = await Producto.create(req.body);
    res.status(201).json(savedProducto);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un producto
export const updateProducto = async (req, res) => {
  try {
    const updatedProducto = await Producto.findByIdAndUpdate(req.params.id, req.body);
    if (!updatedProducto) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json(updatedProducto);
  } catch (error) {
    console.error("ERROR EN UPDATE:", error); 
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un producto
export const deleteProducto = async (req, res) => {
  try {
    const deleted = await Producto.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error("ERROR EN DELETE:", error); 
    res.status(500).json({ message: error.message });
  }
};