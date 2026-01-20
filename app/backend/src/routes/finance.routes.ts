import { Router } from 'express';
import { z } from 'zod';
import {
    getAllTransactions,
    getTransactionById,
    createTransaction,
    getFinancialSummary,
    createExpense,
} from '../controllers/finance.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();

const createTransactionSchema = z.object({
    body: z.object({
        type: z.enum(['SALE', 'EXPENSE', 'PAYMENT', 'REFUND']),
        category: z.string().min(1, 'Category is required'),
        amount: z.number().positive('Amount must be positive'),
        description: z.string().min(1, 'Description is required'),
        referenceId: z.string().optional(),
        referenceType: z.string().optional(),
        paymentMethod: z.string().optional(),
        patientId: z.string().optional(),
    }),
});

const createExpenseSchema = z.object({
    body: z.object({
        category: z.string().min(1, 'Category is required'),
        amount: z.number().positive('Amount must be positive'),
        description: z.string().min(1, 'Description is required'),
        date: z.string().or(z.date()),
        vendor: z.string().optional(),
        invoiceNo: z.string().optional(),
    }),
});

router.use(authenticate);
router.use(requireRole('Admin', 'Pharmacist'));

router.get('/', getAllTransactions);
router.get('/summary', getFinancialSummary);
router.get('/:id', getTransactionById);
router.post('/', validate(createTransactionSchema), createTransaction);
router.post('/expenses', validate(createExpenseSchema), createExpense);

export default router;
