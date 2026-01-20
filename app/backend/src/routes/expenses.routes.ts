import { Router } from 'express';
import { z } from 'zod';
import {
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense,
} from '../controllers/expenses.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const createExpenseSchema = z.object({
    body: z.object({
        category: z.enum(['SALARY', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'SUPPLIES', 'RENT']),
        amount: z.number().positive('Amount must be positive'),
        description: z.string().min(1, 'Description is required'),
        vendor: z.string().optional(),
        invoiceNo: z.string().optional(),
        date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
    }),
});

const updateExpenseSchema = z.object({
    body: z.object({
        category: z.enum(['SALARY', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'SUPPLIES', 'RENT']).optional(),
        amount: z.number().positive().optional(),
        description: z.string().optional(),
        vendor: z.string().optional(),
        invoiceNo: z.string().optional(),
        date: z.string().optional(),
    }),
});

router.use(authenticate);
router.use(requireRole('Admin'));

router.get('/', getAllExpenses);
router.get('/:id', getExpenseById);
router.post('/', validate(createExpenseSchema), createExpense);
router.put('/:id', validate(updateExpenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
