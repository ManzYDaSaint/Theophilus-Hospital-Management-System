import { Router } from 'express';
import { getServerInfo } from '../controllers/system.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only admins should see server info to share with others
router.get('/info', authenticate, requireRole(['Admin']), getServerInfo);

export default router;
