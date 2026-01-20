import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// Get overall hospital analytics dashboard
export const getDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
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

        // Get total patients
        const totalPatients = await prisma.patient.count({
            where: { isActive: true },
        });

        // Get visits count
        const visitsCount = await prisma.visit.count({
            where: { visitDate: { gte: startDate } },
        });

        // Get active prescriptions
        const activePrescriptions = await prisma.prescription.count({
            where: { status: 'Active' },
        });

        // Get revenue
        const revenue = await prisma.transaction.aggregate({
            where: {
                type: 'SALE',
                createdAt: { gte: startDate },
            },
            _sum: { amount: true },
        });

        // Get expenses
        const expenses = await prisma.expense.aggregate({
            where: { date: { gte: startDate } },
            _sum: { amount: true },
        });

        // Revenue trends (daily for last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const revenueTrends = await prisma.transaction.groupBy({
            by: ['createdAt'],
            where: {
                type: 'SALE',
                createdAt: { gte: thirtyDaysAgo },
            },
            _sum: { amount: true },
        });

        // Transform for frontend (group by date)
        const formattedRevenueTrends = revenueTrends.reduce((acc: any[], curr) => {
            const date = curr.createdAt.toISOString().split('T')[0];
            const existing = acc.find(a => a.date === date);
            if (existing) {
                existing.total += Number(curr._sum.amount || 0);
            } else {
                acc.push({ date, total: Number(curr._sum.amount || 0) });
            }
            return acc;
        }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        // Visit trends
        const visitTrendsQuery = await prisma.visit.groupBy({
            by: ['visitDate'],
            where: { visitDate: { gte: thirtyDaysAgo } },
            _count: { _all: true },
        });

        const formattedVisitTrends = visitTrendsQuery.reduce((acc: any[], curr) => {
            const date = curr.visitDate.toISOString().split('T')[0];
            const existing = acc.find(a => a.date === date);
            if (existing) {
                existing.count += curr._count._all;
            } else {
                acc.push({ date, count: curr._count._all });
            }
            return acc;
        }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


        // Patient Demographics
        const demographics = await prisma.patient.groupBy({
            by: ['gender'],
            where: { isActive: true },
            _count: { gender: true },
        });

        // Top Diagnoses
        // Uses raw query because groupBy on Text fields might be limited depending on DB, but 'description' is Text.
        // Safety: ensure description isn't huge.
        const topDiagnoses = await prisma.$queryRaw`
            SELECT description, COUNT(*) as count
            FROM diagnoses
            GROUP BY description
            ORDER BY count DESC
            LIMIT 5
        `;

        const totalRevenue = Number(revenue._sum.amount || 0);
        const totalExpenses = Number(expenses._sum.amount || 0);
        const profit = totalRevenue - totalExpenses;

        res.json({
            period,
            summary: {
                totalPatients,
                totalVisits: visitsCount,
                activePrescriptions,
                revenue: totalRevenue,
                expenses: totalExpenses,
                profit,
                profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0,
            },
            trends: {
                revenue: formattedRevenueTrends,
                visits: formattedVisitTrends,
            },
            demographics,
            topDiagnoses,
        });
    } catch (error) {
        logger.error('Get dashboard analytics error', { error });
        res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
    }
};

// Get pharmacy-specific analytics
export const getPharmacyAnalytics = async (req: Request, res: Response): Promise<void> => {
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

        // Get pharmacy sales
        const pharmacySales = await prisma.transaction.aggregate({
            where: {
                type: 'SALE',
                category: 'PHARMACY',
                createdAt: { gte: startDate },
            },
            _sum: { amount: true },
            _count: true,
        });

        // Get total stock value (cost)
        const stockValue = await prisma.$queryRaw<Array<{ totalCost: number; totalSelling: number }>>`
      SELECT 
        SUM(currentStock * costPrice) as totalCost,
        SUM(currentStock * sellingPrice) as totalSelling
      FROM pharmacy_stock
    `;

        // Get low stock items
        const lowStockItems = await prisma.$queryRaw<Array<any>>`
      SELECT 
        medicationName,
        currentStock,
        minimumStock,
        (minimumStock - currentStock) * costPrice as restockCost
      FROM pharmacy_stock
      WHERE currentStock <= minimumStock
      ORDER BY currentStock ASC
    `;

        // Top selling medications
        const topMedications = await prisma.$queryRaw`
      SELECT 
        p.medication,
        COUNT(*) as prescriptionCount,
        SUM(p.quantity) as totalQuantity,
        SUM(p.totalAmount) as totalRevenue
      FROM prescriptions p
      WHERE p.paymentStatus = 'Paid' AND p.paidAt >= ${startDate}
      GROUP BY p.medication
      ORDER BY totalRevenue DESC
      LIMIT 10
    `;

        // Profit margin calculation
        const totalSales = Number(pharmacySales._sum.amount || 0);
        const estimatedCost = totalSales * 0.6; // Approximate COGS (can be refined with actual data)
        const profit = totalSales - estimatedCost;
        const profitMargin = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) : 0;

        res.json({
            period,
            sales: {
                total: totalSales,
                count: pharmacySales._count,
                averageTransaction: pharmacySales._count > 0 ? (totalSales / pharmacySales._count).toFixed(2) : 0,
            },
            profitability: {
                revenue: totalSales,
                estimatedCost,
                profit,
                profitMargin,
            },
            inventory: {
                totalCostValue: stockValue[0]?.totalCost || 0,
                totalSellingValue: stockValue[0]?.totalSelling || 0,
                lowStockItems: lowStockItems.length,
                lowStockDetails: lowStockItems,
            },
            topMedications,
        });
    } catch (error) {
        logger.error('Get pharmacy analytics error', { error });
        res.status(500).json({ error: 'Failed to fetch pharmacy analytics' });
    }
};

// Get revenue trends
export const getRevenueTrends = async (req: Request, res: Response): Promise<void> => {
    try {
        const { period = 'daily', duration = '30' } = req.query;

        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(duration as string));

        let groupBy = 'DATE(createdAt)';
        if (period === 'weekly') {
            groupBy = 'YEARWEEK(createdAt)';
        } else if (period === 'monthly') {
            groupBy = 'DATE_FORMAT(createdAt, "%Y-%m")';
        }

        const trends = await prisma.$queryRaw`
      SELECT 
        ${groupBy} as period,
        SUM(CASE WHEN type = 'SALE' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN type = 'SALE' THEN 1 END) as transactionCount
      FROM transactions
      WHERE createdAt >= ${daysAgo}
      GROUP BY period
      ORDER BY period ASC
    `;

        res.json({ period, duration, trends });
    } catch (error) {
        logger.error('Get revenue trends error', { error });
        res.status(500).json({ error: 'Failed to fetch revenue trends' });
    }
};

// Get expense breakdown
export const getExpenseBreakdown = async (req: Request, res: Response): Promise<void> => {
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

        const breakdownQuery = await prisma.expense.groupBy({
            by: ['category'],
            where: { date: { gte: startDate } },
            _sum: { amount: true },
            _count: { _all: true },
            _avg: { amount: true },
            orderBy: {
                _sum: {
                    amount: 'desc',
                },
            },
        });

        const breakdown = breakdownQuery.map(item => ({
            category: item.category,
            total: Number(item._sum.amount || 0),
            count: Number(item._count._all || 0),
            average: Number(item._avg.amount || 0)
        }));

        const totalExpenses = await prisma.expense.aggregate({
            where: { date: { gte: startDate } },
            _sum: { amount: true },
        });

        res.json({
            period,
            total: Number(totalExpenses._sum.amount || 0),
            breakdown,
        });
    } catch (error) {
        logger.error('Get expense breakdown error', { error });
        res.status(500).json({ error: 'Failed to fetch expense breakdown' });
    }
};

// Get patient revenue analysis
export const getPatientRevenue = async (req: Request, res: Response): Promise<void> => {
    try {
        const { limit = '20' } = req.query;

        const patientRevenue = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.firstName,
        p.lastName,
        COUNT(DISTINCT t.id) as transactionCount,
        SUM(t.amount) as totalRevenue,
        MAX(t.createdAt) as lastVisit
      FROM patients p
      LEFT JOIN transactions t ON t.patientId = p.id AND t.type = 'SALE'
      WHERE p.isActive = 1
      GROUP BY p.id, p.firstName, p.lastName
      HAVING totalRevenue > 0
      ORDER BY totalRevenue DESC
      LIMIT ${parseInt(limit as string)}
    `;

        res.json({ topPatients: patientRevenue });
    } catch (error) {
        logger.error('Get patient revenue error', { error });
        res.status(500).json({ error: 'Failed to fetch patient revenue' });
    }
};
