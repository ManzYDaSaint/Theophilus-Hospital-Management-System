import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/audit.utils';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Create expense
export const createExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const expenseData = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const expense = await prisma.expense.create({
            data: {
                ...expenseData,
                date: new Date(expenseData.date),
                createdBy: req.user.userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        await createAuditLog({
            userId: req.user.userId,
            action: 'CREATE_EXPENSE',
            entity: 'Expense',
            entityId: expense.id,
            details: { category: expense.category, amount: expense.amount.toString() },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        logger.info('Expense created', { expenseId: expense.id });

        res.status(201).json(expense);
    } catch (error) {
        logger.error('Create expense error', { error });
        res.status(500).json({ error: 'Failed to create expense' });
    }
};

// Get all expenses
export const getAllExpenses = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, startDate, endDate, page = '1', limit = '50' } = req.query;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const where: any = {};

        if (category) where.category = category;

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }

        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                skip,
                take: parseInt(limit as string),
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { date: 'desc' },
            }),
            prisma.expense.count({ where }),
        ]);

        // Calculate totals
        const totals = await prisma.expense.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });

        res.json({
            expenses,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                totalPages: Math.ceil(total / parseInt(limit as string)),
            },
            totals: {
                totalAmount: totals._sum.amount || 0,
            },
        });
    } catch (error) {
        logger.error('Get expenses error', { error });
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

// Get expense by ID
export const getExpenseById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const expense = await prisma.expense.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        if (!expense) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }

        res.json(expense);
    } catch (error) {
        logger.error('Get expense error', { error });
        res.status(500).json({ error: 'Failed to fetch expense' });
    }
};

// Update expense
export const updateExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }

        const expense = await prisma.expense.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'UPDATE_EXPENSE',
                entity: 'Expense',
                entityId: expense.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Expense updated', { expenseId: expense.id });

        res.json(expense);
    } catch (error) {
        logger.error('Update expense error', { error });
        res.status(500).json({ error: 'Failed to update expense' });
    }
};

// Delete expense
export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.expense.delete({
            where: { id },
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'DELETE_EXPENSE',
                entity: 'Expense',
                entityId: id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Expense deleted', { expenseId: id });

        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        logger.error('Delete expense error', { error });
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};
