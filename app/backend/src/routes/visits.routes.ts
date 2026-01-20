import { Router } from 'express';
import { z } from 'zod';
import {
    getAllVisits,
    getVisitById,
    createVisit,
    updateVisit,
    addDiagnosis,
} from '../controllers/visits.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const createVisitSchema = z.object({
    body: z.object({
        patientId: z.string().uuid('Invalid patient ID'),
        doctorId: z.string().uuid('Invalid doctor ID'),
        chiefComplaint: z.string().min(1, 'Chief complaint is required'),
        vitalSigns: z.string().optional(),
        notes: z.string().optional(),
    }),
});

const updateVisitSchema = z.object({
    body: z.object({
        chiefComplaint: z.string().optional(),
        vitalSigns: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(['In Progress', 'Completed', 'Cancelled']).optional(),
    }),
});

const diagnosisSchema = z.object({
    body: z.object({
        icdCode: z.string().optional(),
        description: z.string().min(1, 'Description is required'),
        notes: z.string().optional(),
    }),
});

router.use(authenticate);

router.get('/', getAllVisits);
router.get('/:id', getVisitById);
router.post(
    '/',
    requireRole('Admin', 'Doctor', 'Nurse'),
    validate(createVisitSchema),
    createVisit
);
router.put(
    '/:id',
    requireRole('Admin', 'Doctor', 'Nurse'),
    validate(updateVisitSchema),
    updateVisit
);
router.post(
    '/:visitId/diagnoses',
    requireRole('Admin', 'Doctor'),
    validate(diagnosisSchema),
    addDiagnosis
);

export default router;
