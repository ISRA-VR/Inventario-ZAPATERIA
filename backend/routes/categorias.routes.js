import express from 'express';
import {
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../controllers/categoriaController.js';
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.route('/')
  .get(getCategorias)
  .post(protect, createCategoria);

router.route('/:id')
  .put(protect, updateCategoria)
  .delete(protect, deleteCategoria);

export default router;
