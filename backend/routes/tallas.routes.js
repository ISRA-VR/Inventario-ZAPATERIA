import express from 'express';
import { getTallas, updateTalla } from '../controllers/tallaController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ruta para listar las tallas registradas en los productos
router.route('/').get(protect, getTallas);

// Ruta para actualizar las tallas de un producto específico
router.route('/:id').put(protect, updateTalla);

export default router;