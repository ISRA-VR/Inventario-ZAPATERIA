import express from 'express';
import { getTallas, updateTalla } from '../controllers/tallaController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getTallas);
router.route('/:id').put(protect, updateTalla);

export default router;
