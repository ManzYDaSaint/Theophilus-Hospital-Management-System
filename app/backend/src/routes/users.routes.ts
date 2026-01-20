import { Router } from 'express';
import { z } from 'zod'; // Assuming zod is available as seen in auth.routes
import {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    getRoles
} from '../controllers/users.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        phoneNumber: z.string().optional(),
        roleId: z.string().min(1, 'Role is required'),
    }),
});

const updateUserSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        phoneNumber: z.string().nullable().optional(),
        roleId: z.string().min(1, 'Role is required'),
        isActive: z.boolean().optional(),
    }),
});

// All routes require Admin role
router.use(authenticate, requireRole(['Admin']));

router.get('/', getAllUsers);
router.get('/roles', getRoles);
router.post('/', validate(createUserSchema), createUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
