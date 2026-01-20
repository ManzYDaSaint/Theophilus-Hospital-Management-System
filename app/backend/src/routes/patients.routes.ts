import { Router } from 'express';
import { z } from 'zod';
import {
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    getPatientStats,
} from '../controllers/patients.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

// Validation schemas
const createPatientSchema = z.object({
    body: z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        gender: z.enum(['Male', 'Female', 'Other']),
        phoneNumber: z.string().min(1, 'Phone number is required'),
        address: z.string().optional(),
    }),
});

const updatePatientSchema = z.object({
    body: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(['Male', 'Female', 'Other']).optional(),
        phoneNumber: z.string().optional(),
        address: z.string().optional(),
    }),
});

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/stats', getPatientStats);
router.get('/', getAllPatients);
router.get('/:id', getPatientById);
router.post(
    '/',
    requireRole('Admin', 'Doctor', 'Nurse', 'Receptionist'),
    validate(createPatientSchema),
    createPatient
);
router.put(
    '/:id',
    requireRole('Admin', 'Doctor', 'Nurse', 'Receptionist'),
    validate(updatePatientSchema),
    updatePatient
);
router.delete('/:id', requireRole('Admin'), deletePatient);

export default router;
