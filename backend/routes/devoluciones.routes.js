import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMontoVenta } from '../controllers/devolucionesController.js';

import {
  registrarDevolucion,
  getDevolucionesHoy,
  getStatsDevolucionesHoy,
  getMotivosFrecuentes,
  getUltimoRetiro,
  getVentaPorTicket,
} from '../controllers/devolucionesController.js';

const router = Router();

router.get('/stats/hoy',           protect, getStatsDevolucionesHoy);
router.get('/motivos/frecuentes',  protect, getMotivosFrecuentes);
router.get('/ultimo-retiro',       protect, getUltimoRetiro);
router.get('/hoy',                 protect, getDevolucionesHoy);
router.get('/ticket/:numero',      protect, getVentaPorTicket);
router.post('/',                   protect, registrarDevolucion);

router.get('/monto/:numeroVenta',  protect, async (req, res) => {
  try {
    const total = await getMontoVenta(req.params.numeroVenta);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo monto de venta' });
  }
});

export default router;