import express from 'express';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../controllers/categoriaController.js';
import { protect } from '../middleware/authMiddleware.js'; // Asumiendo que tienes un middleware de autenticación

const router = express.Router();

// Rutas para CRUD de Categorías
router.route('/')
  .get(getCategorias)
  .post(protect, createCategoria);

router.route('/:id')
  .put(protect, updateCategoria)
  .delete(protect, deleteCategoria);

export default router;
