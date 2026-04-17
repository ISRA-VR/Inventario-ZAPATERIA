import { Router } from 'express';
import { chatAsistente } from '../controllers/asistenteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/chat', protect, chatAsistente);

export default router;
