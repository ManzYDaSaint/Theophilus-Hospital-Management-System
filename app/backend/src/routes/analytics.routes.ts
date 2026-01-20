import { Router } from 'express';
import {
    getDashboardAnalytics,
    getPharmacyAnalytics,
    getRevenueTrends,
    getExpenseBreakdown,
    getPatientRevenue,
} from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', requireRole('Admin'), getDashboardAnalytics);
router.get('/pharmacy', requireRole('Admin', 'Pharmacist'), getPharmacyAnalytics);
router.get('/revenue-trends', requireRole('Admin'), getRevenueTrends);
router.get('/expense-breakdown', requireRole('Admin'), getExpenseBreakdown);
router.get('/patient-revenue', requireRole('Admin'), getPatientRevenue);

export default router;
