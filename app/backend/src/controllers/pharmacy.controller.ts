import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/audit.utils';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const getAllMedications = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, status, category } = req.query;

        const where: any = {};

        if (search) {
            where.OR = [
                { medicationName: { contains: search as string } },
                { category: { contains: search as string } },
                { description: { contains: search as string } },
            ];
        }

        if (category && category !== 'All') {
            where.category = category as string;
        }

        if (status) {
            const now = new Date();
            switch (status) {
                case 'expired':
                    where.expiryDate = { lt: now };
                    break;
                case 'out_of_stock':
                    where.currentStock = 0;
                    break;
                case 'low_stock':
                    // Handle low stock with raw query since we need to compare currentStock <= minimumStock
                    const lowStockMeds = await prisma.$queryRaw<any[]>`
                        SELECT * FROM pharmacy_stock 
                        WHERE currentStock <= minimumStock AND currentStock > 0
                        ORDER BY medicationName ASC
                    `;
                    res.json(lowStockMeds);
                    return;
                case 'available':
                    where.currentStock = { gt: 0 };
                    where.OR = [
                        { expiryDate: { gt: now } },
                        { expiryDate: null }
                    ];
                    break;
            }
        }

        const medications = await prisma.pharmacyStock.findMany({
            where,
            orderBy: { medicationName: 'asc' },
        });

        res.json(medications);
    } catch (error) {
        logger.error('Get medications error', { error });
        res.status(500).json({ error: 'Failed to fetch medications' });
    }
};

export const getMedicationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const medication = await prisma.pharmacyStock.findUnique({ where: { id } });
        if (!medication) {
            res.status(404).json({ error: 'Medication not found' });
            return;
        }
        res.json(medication);
    } catch (error) {
        logger.error('Get medication error', { error });
        res.status(500).json({ error: 'Failed to fetch medication' });
    }
};

export const createMedication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { medicationName, description, category, minimumStock, costPrice, sellingPrice, expiryDate, currentStock } = req.body;

        const medication = await prisma.pharmacyStock.create({
            data: {
                medicationName,
                description,
                category,
                minimumStock: Number(minimumStock) || 10,
                costPrice: Number(costPrice) || 0,
                sellingPrice: Number(sellingPrice) || 0,
                unitPrice: Number(sellingPrice) || 0,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                currentStock: Number(currentStock) || 0,
            },
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'CREATE_MEDICATION',
                entity: 'PharmacyStock',
                entityId: medication.id,
                details: { medicationName: medication.medicationName },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }
        res.json(medication);
    } catch (error) {
        logger.error('Create medication error', { error });
        res.status(500).json({ error: 'Failed to create medication' });
    }
};

export const updateMedication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { medicationName, description, category, minimumStock, costPrice, sellingPrice, expiryDate } = req.body;

        const medication = await prisma.pharmacyStock.update({
            where: { id },
            data: {
                medicationName,
                description,
                category,
                minimumStock: minimumStock !== undefined ? Number(minimumStock) : undefined,
                costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
                sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : undefined,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            },
        });

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'UPDATE_MEDICATION',
                entity: 'PharmacyStock',
                entityId: medication.id,
                details: { changes: req.body },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }
        res.json(medication);
    } catch (error) {
        logger.error('Update medication error', { error });
        res.status(500).json({ error: 'Failed to update medication' });
    }
};

export const adjustStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { quantity, type, newCost, newExpiry } = req.body; // type: 'add' or 'subtract'

        console.log(req.body);
        const medication = await prisma.pharmacyStock.findUnique({ where: { id } });

        if (!medication) {
            res.status(404).json({ error: 'Medication not found' });
            return;
        }

        const newStock =
            type === 'add'
                ? medication.currentStock + quantity
                : medication.currentStock - quantity;

        if (newStock < 0) {
            res.status(400).json({ error: 'Insufficient stock' });
            return;
        }

        const updateData: any = { currentStock: newStock };
        if (type === 'add') {
            if (newCost !== undefined) updateData.costPrice = newCost;
            if (newExpiry !== undefined) updateData.expiryDate = new Date(newExpiry);
        }

        const updated = await prisma.pharmacyStock.update({
            where: { id },
            data: updateData,
        });

        // If adding stock, record as an expense
        if (type === 'add' && quantity > 0) {
            const costPerUnit = newCost ? Number(newCost) : Number(medication.costPrice);
            const totalCost = costPerUnit * quantity;

            if (totalCost > 0) {
                // 1. Create Expense Record
                await prisma.expense.create({
                    data: {
                        category: 'INVENTORY',
                        amount: totalCost,
                        description: `Restock: ${medication.medicationName} (${quantity} units @ ${costPerUnit})`,
                        date: new Date(),
                        createdBy: req.user!.userId,
                    }
                });

                // 2. Create Transaction Record (for cash flow tracking)
                await prisma.transaction.create({
                    data: {
                        type: 'EXPENSE',
                        category: 'PHARMACY',
                        amount: totalCost,
                        description: `Inventory purchase: ${medication.medicationName}`,
                        referenceType: 'PharmacyStock',
                        referenceId: medication.id,
                        createdBy: req.user!.userId,
                    }
                });
            }
        }

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'ADJUST_STOCK',
                entity: 'PharmacyStock',
                entityId: medication.id,
                details: {
                    medicationName: medication.medicationName,
                    type,
                    quantity,
                    previousStock: medication.currentStock,
                    newStock,
                    newCost: newCost || 'N/A',
                    newExpiry: newExpiry || 'N/A'
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            });
        }

        logger.info('Stock adjusted', { medicationId: medication.id, type, quantity });

        res.json(updated);
    } catch (error) {
        logger.error('Adjust stock error', { error });
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
};

export const getLowStockAlerts = async (_req: Request, res: Response): Promise<void> => {
    try {
        const lowStockMedications = await prisma.$queryRaw`
      SELECT * FROM pharmacy_stock 
      WHERE currentStock <= minimumStock
      ORDER BY currentStock ASC
    `;

        res.json(lowStockMedications);
    } catch (error) {
        logger.error('Get low stock alerts error', { error });
        res.status(500).json({ error: 'Failed to fetch low stock alerts' });
    }
};

export const getMedicationCategories = async (_req: Request, res: Response): Promise<void> => {
    try {
        const categories = await prisma.pharmacyStock.findMany({
            where: {
                category: { not: null }
            },
            select: {
                category: true
            },
            distinct: ['category']
        });

        const categoryList = categories
            .map(c => c.category)
            .filter(c => c !== null && c !== '')
            .sort();

        res.json(categoryList);
    } catch (error) {
        logger.error('Get medication categories error', { error });
        res.status(500).json({ error: 'Failed to fetch medication categories' });
    }
};

export const getPharmacyAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = 'month' } = req.query;

        // Calculate date range based on period
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(now.getMonth() - 1);
        }

        // Get sales data from transactions
        const salesTransactions = await prisma.transaction.findMany({
            where: {
                category: 'PHARMACY',
                type: 'SALE',
                createdAt: { gte: startDate }
            }
        });

        const totalSales = salesTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const salesCount = salesTransactions.length;
        const averageTransaction = salesCount > 0 ? (totalSales / salesCount).toFixed(2) : '0.00';

        // Get prescription data with medication details
        const prescriptions = await prisma.prescription.findMany({
            where: {
                paymentStatus: 'Paid',
                paidAt: { gte: startDate }
            },
            select: {
                medication: true,
                quantity: true,
                totalAmount: true
            }
        });

        // Get pharmacy stock for cost calculation
        const medications = await prisma.pharmacyStock.findMany();

        // Calculate revenue and cost
        let totalRevenue = 0;
        let totalCost = 0;

        for (const prescription of prescriptions) {
            const stockItem = medications.find(m => m.medicationName === prescription.medication);
            if (stockItem) {
                const revenue = Number(prescription.totalAmount || 0);
                const cost = Number(stockItem.costPrice) * prescription.quantity;
                totalRevenue += revenue;
                totalCost += cost;
            }
        }

        const profit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) + '%' : '0%';

        // Inventory metrics
        const totalCostValue = medications.reduce((sum, m) => sum + (Number(m.costPrice) * m.currentStock), 0);
        const totalSellingValue = medications.reduce((sum, m) => sum + (Number(m.sellingPrice) * m.currentStock), 0);

        const lowStockItems = medications.filter(m => m.currentStock <= m.minimumStock);

        // Top medications by revenue
        const medicationRevenue = new Map<string, { count: number, quantity: number, revenue: number, price: number }>();

        for (const prescription of prescriptions) {
            const existing = medicationRevenue.get(prescription.medication) || { count: 0, quantity: 0, revenue: 0, price: 0 };
            const stockItem = medications.find(m => m.medicationName === prescription.medication);

            medicationRevenue.set(prescription.medication, {
                count: existing.count + 1,
                quantity: existing.quantity + prescription.quantity,
                revenue: existing.revenue + Number(prescription.totalAmount || 0),
                price: stockItem ? Number(stockItem.sellingPrice) : 0
            });
        }

        const topMedications = Array.from(medicationRevenue.entries())
            .map(([medication, data]) => ({
                medication,
                prescriptionCount: data.count,
                totalQuantity: data.quantity,
                totalRevenue: data.revenue,
                sellingPrice: data.price
            }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 10);

        const analytics = {
            sales: {
                total: totalSales,
                count: salesCount,
                averageTransaction
            },
            profitability: {
                revenue: totalRevenue,
                estimatedCost: totalCost,
                profit,
                profitMargin
            },
            inventory: {
                totalCostValue,
                totalSellingValue,
                lowStockItems: lowStockItems.length,
                lowStockDetails: lowStockItems.map(item => ({
                    medicationName: item.medicationName,
                    currentStock: item.currentStock,
                    minimumStock: item.minimumStock,
                    restockCost: Number(item.costPrice) * (item.minimumStock - item.currentStock)
                }))
            },
            topMedications
        };

        res.json(analytics);
    } catch (error) {
        logger.error('Get pharmacy analytics error', { error });
        res.status(500).json({ error: 'Failed to fetch pharmacy analytics' });
    }
};
