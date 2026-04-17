import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
	registrarEntrada,
	registrarVenta,
	obtenerResumenMovimientos,
} from '../controllers/movimientosController.js';

const router = Router();

router.get('/resumen', protect, obtenerResumenMovimientos);
router.post('/entrada', protect, registrarEntrada);
router.post('/venta', protect, registrarVenta);

export default router;
