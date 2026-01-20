import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/audit.utils';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Create a new transaction
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
        const transactionData = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const transaction = await prisma.transaction.create({
            data: {
                ...transactionData,
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
                patient: {
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
            action: 'CREATE_TRANSACTION',
            entity: 'Transaction',
            entityId: transaction.id,
            details: { type: transaction.type, amount: transaction.amount.toString() },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        logger.info('Transaction created', { transactionId: transaction.id });

        res.status(201).json(transaction);
    } catch (error) {
        logger.error('Create transaction error', { error });
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};

// Get all transactions with filters
export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            type,
            category,
            startDate,
            endDate,
            patientId,
            page = '1',
            limit = '50',
        } = req.query;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const where: any = {};

        if (type) where.type = type;
        if (category) where.category = category;
        if (patientId) where.patientId = patientId;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) where.createdAt.lte = new Date(endDate as string);
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
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
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.transaction.count({ where }),
        ]);

        // Calculate totals
        const totals = await prisma.transaction.aggregate({
            where,
            _sum: {
                amount: true,
            },
        });

        res.json({
            transactions,
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
        logger.error('Get transactions error', { error });
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Get transaction by ID
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findUnique({
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
                patient: true,
            },
        });

        if (!transaction) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }

        res.json(transaction);
    } catch (error) {
        logger.error('Get transaction error', { error });
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
};

// Get financial summary
// Get financial summary
export const getFinancialSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = 'month' } = req.query;

        let startDate = new Date();
        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }

        // Get revenue (sales)
        const revenue = await prisma.transaction.aggregate({
            where: {
                type: 'SALE',
                createdAt: { gte: startDate },
            },
            _sum: {
                amount: true,
            },
        });

        // Get operational expenses
        const expensesTotal = await prisma.expense.aggregate({
            where: {
                date: { gte: startDate },
            },
            _sum: {
                amount: true,
            },
        });

        // Calculate Inventory Value (to include as expense)
        const allStock = await prisma.pharmacyStock.findMany({
            select: {
                costPrice: true,
                currentStock: true,
            }
        });

        const totalInventoryValue = allStock.reduce((sum, item) => {
            return sum + (Number(item.costPrice) * item.currentStock);
        }, 0);

        // Revenue by category (using groupBy instead of raw query for safety)
        const revenueGroups = await prisma.transaction.groupBy({
            by: ['category'],
            where: {
                type: 'SALE',
                createdAt: { gte: startDate },
            },
            _sum: {
                amount: true,
            },
        });

        const revenueByCategory = revenueGroups.map(group => ({
            category: group.category,
            total: Number(group._sum.amount || 0)
        }));

        // Expenses by category
        // 1. Operational expenses
        const expenseGroups = await prisma.expense.groupBy({
            by: ['category'],
            where: {
                date: { gte: startDate },
            },
            _sum: {
                amount: true,
            },
        });

        const expensesByCategory = expenseGroups.map(group => ({
            category: group.category,
            total: Number(group._sum.amount || 0)
        }));

        // 2. Add "Medication Stock" as a category to expenses chart if > 0
        if (totalInventoryValue > 0) {
            expensesByCategory.push({
                category: 'MEDICATION STOCK',
                total: totalInventoryValue
            });
        }

        const totalRevenue = Number(revenue._sum.amount || 0);
        // Total Expenses = Operational Expenses + Total Inventory Value
        const totalOperationalExpenses = Number(expensesTotal._sum.amount || 0);
        const totalExpenses = totalOperationalExpenses + totalInventoryValue;

        const profit = totalRevenue - totalExpenses;

        res.json({
            period,
            summary: {
                revenue: totalRevenue,
                expenses: totalExpenses,
                profit,
                profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0,
            },
            revenueByCategory,
            expensesByCategory,
        });
    } catch (error) {
        logger.error('Get financial summary error', { error });
        res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
};

// Create a new expense (Manual)
export const createExpense = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, amount, description, vendor, invoiceNo, date } = req.body;

        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        // 1. Create Expense Record
        const expense = await prisma.expense.create({
            data: {
                category,
                amount: Number(amount),
                description,
                vendor,
                invoiceNo,
                date: new Date(date),
                createdBy: req.user.userId,
            }
        });

        // 2. Create Transaction Record
        await prisma.transaction.create({
            data: {
                type: 'EXPENSE',
                category: 'OPERATIONAL', // General category for manual expenses
                amount: Number(amount),
                description: description,
                referenceType: 'Expense',
                referenceId: expense.id,
                createdBy: req.user.userId,
            }
        });

        await createAuditLog({
            userId: req.user.userId,
            action: 'CREATE_EXPENSE',
            entity: 'Expense',
            entityId: expense.id,
            details: { category, amount: amount.toString() },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.status(201).json(expense);
    } catch (error) {
        logger.error('Create expense error', { error });
        res.status(500).json({ error: 'Failed to create expense' });
    }
};
