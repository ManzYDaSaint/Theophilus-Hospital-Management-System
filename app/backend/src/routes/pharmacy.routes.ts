import { Router } from 'express';
import { z } from 'zod';
import {
    getAllMedications,
    getMedicationById,
    createMedication,
    updateMedication,
    adjustStock,
    getLowStockAlerts,
    getMedicationCategories,
    getPharmacyAnalytics,
} from '../controllers/pharmacy.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const createMedicationSchema = z.object({
    body: z.object({
        medicationName: z.string().min(1, 'Medication name is required'),
        description: z.string().optional(),
        category: z.string().optional(),
        currentStock: z.number().int().min(0, 'Stock cannot be negative'),
        minimumStock: z.number().int().min(0, 'Minimum stock cannot be negative'),
        costPrice: z.number().positive('Cost price must be positive'),
        sellingPrice: z.number().positive('Selling price must be positive'),
        expiryDate: z.string().optional(),
        supplier: z.string().optional(),
        batchNumber: z.string().optional(),
    }),
});

const updateMedicationSchema = z.object({
    body: z.object({
        description: z.string().optional(),
        category: z.string().optional(),
        minimumStock: z.number().int().min(0).optional(),
        costPrice: z.number().positive().optional(),
        sellingPrice: z.number().positive().optional(),
        expiryDate: z.string().optional(),
        supplier: z.string().optional(),
        batchNumber: z.string().optional(),
    }),
});

const adjustStockSchema = z.object({
    body: z.object({
        quantity: z.number().int().positive('Quantity must be positive'),
        type: z.enum(['add', 'subtract']),
    }),
});

router.use(authenticate);

router.get('/', getAllMedications);
router.get('/categories', getMedicationCategories);
router.get('/analytics', getPharmacyAnalytics);
router.get('/low-stock', requireRole('Admin', 'Pharmacist'), getLowStockAlerts);
router.get('/:id', getMedicationById);
router.post(
    '/',
    requireRole('Admin', 'Pharmacist'),
    validate(createMedicationSchema),
    createMedication
);
router.put(
    '/:id',
    requireRole('Admin', 'Pharmacist'),
    validate(updateMedicationSchema),
    updateMedication
);
router.post(
    '/:id/stock',
    requireRole('Admin', 'Pharmacist'),
    validate(adjustStockSchema),
    adjustStock
);

export default router;
