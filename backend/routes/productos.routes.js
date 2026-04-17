import { Router } from 'express';
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
} from '../controllers/productoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, getProductos);
router.get('/:id', protect, getProductoById);
router.post('/', protect, createProducto);
router.put('/:id', protect, updateProducto);
router.delete('/:id', protect, deleteProducto);

export default router;
