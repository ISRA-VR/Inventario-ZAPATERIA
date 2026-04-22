import { Router } from 'express';
import { chatAsistente } from '../controllers/asistenteController.js';
import { authAdmin, protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/chat', protect, authAdmin, chatAsistente);

export default router;
