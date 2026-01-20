import { Router } from 'express';
import { z } from 'zod';
import {
    createPrescription,
    getPrescriptionsByVisit,
    updatePrescription,
    fulfillPrescription,
    getAllPrescriptions,
    getPrescriptionStats,
} from '../controllers/prescriptions.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const createPrescriptionSchema = z.object({
    body: z.object({
        visitId: z.string().uuid('Invalid visit ID').optional(),
        patientId: z.string().uuid('Invalid patient ID').optional(),
        prescribedBy: z.string().uuid('Invalid doctor ID'),
        medications: z.array(z.object({
            medication: z.string().min(1, 'Medication name is required'),
            dosage: z.string().min(1, 'Dosage is required'),
            frequency: z.string().min(1, 'Frequency is required'),
            duration: z.string().min(1, 'Duration is required'),
            quantity: z.number().int().positive('Quantity must be positive'),
            instructions: z.string().optional(),
        })).min(1, 'At least one medication is required'),
    }).refine(data => data.visitId || data.patientId, {
        message: "Either visitId or patientId must be provided",
        path: ["visitId", "patientId"]
    }),
});

const updatePrescriptionSchema = z.object({
    body: z.object({
        status: z.enum(['Active', 'Completed', 'Cancelled']).optional(),
        instructions: z.string().optional(),
    }),
});

router.use(authenticate);

router.get('/stats', getPrescriptionStats);
router.get('/', getAllPrescriptions);

router.post(
    '/',
    requireRole('Admin', 'Doctor'),
    validate(createPrescriptionSchema),
    createPrescription
);
router.get('/visit/:visitId', getPrescriptionsByVisit);
router.put(
    '/:id',
    requireRole('Admin', 'Doctor', 'Pharmacist'),
    validate(updatePrescriptionSchema),
    updatePrescription
);
router.post(
    '/:id/fulfill',
    requireRole('Admin', 'Pharmacist'),
    fulfillPrescription
);

export default router;
