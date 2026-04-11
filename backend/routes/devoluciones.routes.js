import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
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

export default router;