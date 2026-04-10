import Producto from '../models/Producto.js';

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

    if (!modelo) {
      return res.status(400).json({ message: 'El campo modelo es obligatorio' });
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

    if (!modelo) {
      return res.status(400).json({ message: 'El campo modelo es obligatorio' });
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